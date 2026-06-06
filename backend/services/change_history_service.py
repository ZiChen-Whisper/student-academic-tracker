"""
变更历史服务模块：记录和查询数据库变更操作
"""

import json
from datetime import datetime
from db import query_all, query_one, execute


# 表名中文映射
TABLE_LABELS = {
    'risk_alert': '风险预警',
    'learning_suggestion': '学习建议',
    'nl2sql_log': '自然语言查询',
    'student': '学生',
    'exam_score': '考试成绩',
    'learning_behavior': '学习行为',
    'family_background': '家庭背景',
    'course_schedule': '课程安排',
    'teacher': '教师',
}

# 表名对应的主键列名
TABLE_PRIMARY_KEYS = {
    'risk_alert': 'alert_id',
    'learning_suggestion': 'suggestion_id',
    'nl2sql_log': 'log_id',
    'student': 'student_id',
    'exam_score': 'score_id',
    'learning_behavior': 'student_id',
    'family_background': 'student_id',
    'course_schedule': 'course_id',
    'teacher': 'teacher_id',
}

# 表名对应的备选查找列（主键查不到时尝试）
TABLE_ALT_KEYS = {
    'risk_alert': ['student_id'],
    'learning_suggestion': ['student_id'],
}

# 操作类型中文映射
OP_LABELS = {
    'INSERT': '新增',
    'UPDATE': '修改',
    'DELETE': '删除',
    'GENERATE': '生成',
    'BATCH_DELETE': '批量删除',
}

# 操作类型对应颜色
OP_COLORS = {
    'INSERT': '#1a8a5a',
    'UPDATE': '#0b6565',
    'DELETE': '#c0392b',
    'GENERATE': '#2563eb',
    'BATCH_DELETE': '#c0392b',
}

# 操作人角色中文映射
OPERATOR_ROLE_LABELS = {
    'system': '系统',
    'admin': '管理员',
    'teacher': '教师',
    'student': '学生',
    'parent': '家长',
}


def _format_operator(operator_role, operator_name, operator_id=None):
    """将角色和名称格式化为 operator 字段存储格式: 'role:id:name' 或 'role:name'"""
    if operator_id:
        return f"{operator_role}:{operator_id}:{operator_name}"
    return f"{operator_role}:{operator_name}"


def _parse_operator(operator_str):
    """解析 operator 字段，返回 (role, name, operator_id)"""
    if not operator_str:
        return ('system', '系统', None)
    parts = operator_str.split(':', 2)
    if len(parts) >= 3:
        return (parts[0], parts[2], parts[1])
    if len(parts) == 2:
        return (parts[0], parts[1], None)
    # 兼容旧数据：无冒号时视为 system
    return ('system', operator_str, None)


def _fetch_record_data(table_name, record_id):
    """根据表名和记录ID查询实际表数据"""
    if not table_name or not record_id:
        return None
    pk = TABLE_PRIMARY_KEYS.get(table_name)
    if not pk:
        return None
    try:
        # 先用主键查
        row = query_one(f"SELECT * FROM {table_name} WHERE {pk} = %s", (record_id,))
        # 主键查不到，尝试备选列
        if not row and table_name in TABLE_ALT_KEYS:
            for alt_col in TABLE_ALT_KEYS[table_name]:
                rows = query_all(f"SELECT * FROM {table_name} WHERE {alt_col} = %s", (record_id,))
                if rows:
                    row = rows[0] if len(rows) == 1 else rows
                    break
        if row:
            if isinstance(row, list):
                # 多条记录时只取第一条
                row = row[0] if row else None
            if row:
                for k, v in row.items():
                    if hasattr(v, 'isoformat'):
                        row[k] = v.isoformat()
                    elif isinstance(v, (bytes, bytearray)):
                        row[k] = str(v)
                return row
    except Exception:
        pass
    return None


# record_id 实际对应的列名（与主键不同时需要映射）
RECORD_ID_COL_MAP = {
    'risk_alert': 'student_id',
    'learning_suggestion': 'student_id',
}


def _generate_sql(operation, table_name, record_id, change_detail):
    """根据变更数据生成对应的 SQL 语句"""
    detail = change_detail or {}
    pk = TABLE_PRIMARY_KEYS.get(table_name, 'id')
    # INSERT/GENERATE 时 record_id 可能不是主键，用实际列名
    rid_col = RECORD_ID_COL_MAP.get(table_name, pk)

    if operation == 'INSERT' or operation == 'GENERATE':
        cols = list(detail.keys())
        vals = list(detail.values())
        if record_id:
            cols = [rid_col] + cols
            vals = [record_id] + vals
        if not cols:
            return f"-- {operation} {table_name} (无详情数据)"
        cols_str = ', '.join(cols)
        vals_str = ', '.join(_sql_val(v) for v in vals)
        return f"INSERT INTO {table_name} ({cols_str}) VALUES ({vals_str});"
    elif operation == 'UPDATE':
        if not detail:
            return f"-- UPDATE {table_name} (无变更字段)"
        sets = ', '.join(f"{k} = {_sql_val(v)}" for k, v in detail.items())
        where = f"WHERE {pk} = {_sql_val(record_id)}" if record_id else ""
        return f"UPDATE {table_name} SET {sets} {where};".strip()
    elif operation == 'DELETE':
        where = f"WHERE {pk} = {_sql_val(record_id)}" if record_id else ""
        return f"DELETE FROM {table_name} {where};".strip()
    elif operation == 'BATCH_DELETE':
        return f"DELETE FROM {table_name};"
    return f"-- {operation} on {table_name}"


def _sql_val(v):
    """将 Python 值转为 SQL 字面量"""
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return '1' if v else '0'
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v)
    s = s.replace("'", "''")
    return f"'{s}'"


def record_change(operation: str, table_name: str, record_id: str = None,
                  operator: str = 'system', description: str = None,
                  change_detail: dict = None, operator_role: str = 'system',
                  operator_id: str = None):
    """
    记录一条变更历史

    Args:
        operation: 操作类型 INSERT/UPDATE/DELETE/GENERATE/BATCH_DELETE
        table_name: 被操作的表名
        record_id: 被操作记录的主键值
        operator: 操作人名称
        description: 变更描述（人类可读）
        change_detail: 变更详情（字典，会序列化为 JSON）
        operator_role: 操作人角色 (system/admin/teacher/student/parent)
        operator_id: 操作人ID
    """
    operator_str = _format_operator(operator_role, operator, operator_id)
    detail_json = json.dumps(change_detail, ensure_ascii=False) if change_detail else None
    execute(
        """INSERT INTO change_history (operation, table_name, record_id, operator, description, change_detail, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (operation, table_name, record_id, operator_str, description, detail_json, datetime.now())
    )


def get_recent_changes(limit: int = 10, offset: int = 0):
    """
    查询最近的变更历史

    Args:
        limit: 返回条数
        offset: 偏移量

    Returns:
        list: 变更记录列表
    """
    rows = query_all(
        """SELECT * FROM change_history
           ORDER BY created_at DESC
           LIMIT %s OFFSET %s""",
        (limit, offset)
    )
    # 附加中文标签
    for row in rows:
        row['table_label'] = TABLE_LABELS.get(row['table_name'], row['table_name'])
        row['op_label'] = OP_LABELS.get(row['operation'], row['operation'])
        row['op_color'] = OP_COLORS.get(row['operation'], '#0b6565')
        # 解析 change_detail JSON
        if row.get('change_detail'):
            try:
                row['change_detail'] = json.loads(row['change_detail'])
            except (json.JSONDecodeError, TypeError):
                pass
        # 解析操作人信息
        role, name, op_id = _parse_operator(row.get('operator'))
        row['operator_role'] = role
        row['operator_name'] = name
        row['operator_id'] = op_id
        row['operator_role_label'] = OPERATOR_ROLE_LABELS.get(role, role)
        # 生成 SQL 语句
        row['sql_statement'] = _generate_sql(
            row['operation'], row['table_name'],
            row.get('record_id'), row.get('change_detail')
        )
        # 查询实际表数据
        row['record_data'] = _fetch_record_data(row['table_name'], row.get('record_id'))
    return rows


def get_change_count():
    """获取变更历史总数"""
    result = query_one("SELECT COUNT(*) AS total FROM change_history")
    return result['total'] if result else 0
