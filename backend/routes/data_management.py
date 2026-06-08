"""
数据管理 CRUD API 蓝图
管理员专用，支持所有数据库表的增删改查操作
"""

from datetime import date, datetime
from functools import wraps

from flask import Blueprint, jsonify, request

from db import execute, query_all, query_one
from services.change_history_service import record_change

data_management_bp = Blueprint('data_management', __name__)

# ─── 表元数据配置 ───────────────────────────────────────────────

TABLE_CONFIG = {
    'teacher': {
        'label': '教师',
        'primary_key': 'teacher_id',
        'columns': [
            {'name': 'teacher_id', 'label': '教师编号', 'type': 'varchar', 'editable': False, 'nullable': False},
            {'name': 'teacher_name', 'label': '教师姓名', 'type': 'varchar', 'editable': True, 'nullable': False},
            {'name': 'teacher_gender', 'label': '性别', 'type': 'enum', 'editable': True, 'nullable': False, 'enum_values': ['M', 'F']},
            {'name': 'teacher_title', 'label': '职称', 'type': 'varchar', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': False,
    },
    'subject': {
        'label': '科目',
        'primary_key': 'subject_id',
        'columns': [
            {'name': 'subject_id', 'label': '科目编号', 'type': 'varchar', 'editable': False, 'nullable': False},
            {'name': 'subject_name', 'label': '科目名称', 'type': 'varchar', 'editable': True, 'nullable': False},
            {'name': 'subject_credit', 'label': '学分', 'type': 'int', 'editable': True, 'nullable': False},
            {'name': 'subject_type', 'label': '科目类型', 'type': 'varchar', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': False,
    },
    'class': {
        'label': '班级',
        'primary_key': 'class_id',
        'columns': [
            {'name': 'class_id', 'label': '班级编号', 'type': 'varchar', 'editable': False, 'nullable': False},
            {'name': 'class_name', 'label': '班级名称', 'type': 'varchar', 'editable': True, 'nullable': False},
            {'name': 'class_grade', 'label': '年级', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'class_teacher_id', 'label': '班主任', 'type': 'varchar', 'editable': True, 'nullable': True, 'fk_table': 'teacher', 'fk_column': 'teacher_id'},
        ],
        'readonly': False,
        'auto_increment_pk': False,
    },
    'student': {
        'label': '学生',
        'primary_key': 'student_id',
        'columns': [
            {'name': 'student_id', 'label': '学号', 'type': 'varchar', 'editable': False, 'nullable': False},
            {'name': 'student_name', 'label': '姓名', 'type': 'varchar', 'editable': True, 'nullable': False},
            {'name': 'student_gender', 'label': '性别', 'type': 'enum', 'editable': True, 'nullable': False, 'enum_values': ['M', 'F']},
            {'name': 'student_age', 'label': '年龄', 'type': 'int', 'editable': True, 'nullable': True},
            {'name': 'student_class_id', 'label': '班级', 'type': 'varchar', 'editable': True, 'nullable': True, 'fk_table': 'class', 'fk_column': 'class_id'},
            {'name': 'student_address', 'label': '地址', 'type': 'varchar', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': False,
    },
    'exam_score': {
        'label': '考试成绩',
        'primary_key': 'score_id',
        'columns': [
            {'name': 'score_id', 'label': '成绩编号', 'type': 'int', 'editable': False, 'nullable': False},
            {'name': 'student_id', 'label': '学号', 'type': 'varchar', 'editable': True, 'nullable': False, 'fk_table': 'student', 'fk_column': 'student_id'},
            {'name': 'subject_id', 'label': '科目编号', 'type': 'varchar', 'editable': True, 'nullable': False, 'fk_table': 'subject', 'fk_column': 'subject_id'},
            {'name': 'score', 'label': '成绩', 'type': 'int', 'editable': True, 'nullable': False},
            {'name': 'score_date', 'label': '考试日期', 'type': 'date', 'editable': True, 'nullable': True},
            {'name': 'exam_stage', 'label': '考试阶段', 'type': 'varchar', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': True,
    },
    'learning_behavior': {
        'label': '学习行为',
        'primary_key': 'behavior_id',
        'columns': [
            {'name': 'behavior_id', 'label': '行为编号', 'type': 'int', 'editable': False, 'nullable': False},
            {'name': 'student_id', 'label': '学号', 'type': 'varchar', 'editable': True, 'nullable': False, 'fk_table': 'student', 'fk_column': 'student_id'},
            {'name': 'attendance_rate', 'label': '出勤率', 'type': 'int', 'editable': True, 'nullable': True},
            {'name': 'study_hours', 'label': '学习时长', 'type': 'int', 'editable': True, 'nullable': True},
            {'name': 'sleep_hours', 'label': '睡眠时长', 'type': 'int', 'editable': True, 'nullable': True},
            {'name': 'motivation_level', 'label': '学习动力', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'previous_scores', 'label': '过往成绩', 'type': 'int', 'editable': True, 'nullable': True},
            {'name': 'tutoring_sessions', 'label': '辅导次数', 'type': 'int', 'editable': True, 'nullable': True},
            {'name': 'internet_access', 'label': '网络接入', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'extracurricular', 'label': '课外活动', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'physical_activity', 'label': '体育活动', 'type': 'int', 'editable': True, 'nullable': True},
            {'name': 'record_date', 'label': '记录日期', 'type': 'date', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': True,
    },
    'family_background': {
        'label': '家庭背景',
        'primary_key': 'family_id',
        'columns': [
            {'name': 'family_id', 'label': '家庭编号', 'type': 'int', 'editable': False, 'nullable': False},
            {'name': 'student_id', 'label': '学号', 'type': 'varchar', 'editable': True, 'nullable': False, 'fk_table': 'student', 'fk_column': 'student_id'},
            {'name': 'father_edu', 'label': '父亲学历', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'mother_edu', 'label': '母亲学历', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'father_job', 'label': '父亲职业', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'mother_job', 'label': '母亲职业', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'family_income', 'label': '家庭收入', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'family_support', 'label': '家庭支持', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'parental_involvement', 'label': '家长参与度', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'fam_rel', 'label': '家庭关系', 'type': 'int', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': True,
    },
    'risk_alert': {
        'label': '风险预警',
        'primary_key': 'alert_id',
        'columns': [
            {'name': 'alert_id', 'label': '预警编号', 'type': 'int', 'editable': False, 'nullable': False},
            {'name': 'student_id', 'label': '学号', 'type': 'varchar', 'editable': True, 'nullable': False, 'fk_table': 'student', 'fk_column': 'student_id'},
            {'name': 'risk_level', 'label': '风险等级', 'type': 'enum', 'editable': True, 'nullable': False, 'enum_values': ['low', 'medium', 'high']},
            {'name': 'alert_time', 'label': '预警时间', 'type': 'datetime', 'editable': True, 'nullable': True},
            {'name': 'risk_factors', 'label': '风险因素', 'type': 'text', 'editable': True, 'nullable': True},
            {'name': 'intervention_status', 'label': '干预状态', 'type': 'enum', 'editable': True, 'nullable': True, 'enum_values': ['pending', 'in_progress', 'completed']},
            {'name': 'intervention_measure', 'label': '干预措施', 'type': 'text', 'editable': True, 'nullable': True},
            {'name': 'intervention_result', 'label': '干预结果', 'type': 'text', 'editable': True, 'nullable': True},
            {'name': 'risk_score', 'label': '风险分数', 'type': 'int', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': True,
    },
    'learning_suggestion': {
        'label': '学习建议',
        'primary_key': 'suggestion_id',
        'columns': [
            {'name': 'suggestion_id', 'label': '建议编号', 'type': 'int', 'editable': False, 'nullable': False},
            {'name': 'student_id', 'label': '学号', 'type': 'varchar', 'editable': True, 'nullable': False, 'fk_table': 'student', 'fk_column': 'student_id'},
            {'name': 'suggestion_content', 'label': '建议内容', 'type': 'text', 'editable': True, 'nullable': True},
            {'name': 'generate_time', 'label': '生成时间', 'type': 'datetime', 'editable': True, 'nullable': True},
            {'name': 'student_feedback', 'label': '学生反馈', 'type': 'enum', 'editable': True, 'nullable': True, 'enum_values': ['satisfied', 'neutral', 'unsatisfied']},
            {'name': 'suggest_relate_score', 'label': '关联成绩', 'type': 'int', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': True,
    },
    'course_schedule': {
        'label': '课程安排',
        'primary_key': 'schedule_id',
        'columns': [
            {'name': 'schedule_id', 'label': '排课编号', 'type': 'int', 'editable': False, 'nullable': False},
            {'name': 'scheduled_period', 'label': '上课时段', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'scheduled_classroom', 'label': '教室', 'type': 'varchar', 'editable': True, 'nullable': True},
            {'name': 'subject_id', 'label': '科目编号', 'type': 'varchar', 'editable': True, 'nullable': True, 'fk_table': 'subject', 'fk_column': 'subject_id'},
            {'name': 'teacher_id', 'label': '教师编号', 'type': 'varchar', 'editable': True, 'nullable': True, 'fk_table': 'teacher', 'fk_column': 'teacher_id'},
            {'name': 'class_id', 'label': '班级编号', 'type': 'varchar', 'editable': True, 'nullable': True, 'fk_table': 'class', 'fk_column': 'class_id'},
        ],
        'readonly': False,
        'auto_increment_pk': True,
    },
    'student_subject': {
        'label': '学生选课',
        'primary_key': ['student_id', 'subject_id'],
        'columns': [
            {'name': 'student_id', 'label': '学号', 'type': 'varchar', 'editable': False, 'nullable': False, 'fk_table': 'student', 'fk_column': 'student_id'},
            {'name': 'subject_id', 'label': '科目编号', 'type': 'varchar', 'editable': False, 'nullable': False, 'fk_table': 'subject', 'fk_column': 'subject_id'},
            {'name': 'enroll_time', 'label': '选课时间', 'type': 'datetime', 'editable': True, 'nullable': True},
        ],
        'readonly': False,
        'auto_increment_pk': False,
    },
    'nl2sql_log': {
        'label': '自然语言查询日志',
        'primary_key': 'query_id',
        'columns': [
            {'name': 'query_id', 'label': '查询编号', 'type': 'int', 'editable': False, 'nullable': False},
            {'name': 'user_id', 'label': '用户ID', 'type': 'varchar', 'editable': False, 'nullable': True},
            {'name': 'natural_language_input', 'label': '自然语言输入', 'type': 'text', 'editable': False, 'nullable': True},
            {'name': 'generated_sql', 'label': '生成SQL', 'type': 'text', 'editable': False, 'nullable': True},
            {'name': 'execution_time_ms', 'label': '执行耗时(ms)', 'type': 'int', 'editable': False, 'nullable': True},
            {'name': 'is_correct', 'label': '是否正确', 'type': 'boolean', 'editable': False, 'nullable': True},
            {'name': 'query_time', 'label': '查询时间', 'type': 'datetime', 'editable': False, 'nullable': True},
        ],
        'readonly': True,
        'auto_increment_pk': True,
    },
}

# ─── 外键引用关系（用于删除前引用完整性检查） ──────────────────────

TABLE_REFERENCES = {
    'teacher': [('course_schedule', 'teacher_id'), ('class', 'class_teacher_id')],
    'subject': [('exam_score', 'subject_id'), ('course_schedule', 'subject_id'), ('student_subject', 'subject_id')],
    'class': [('student', 'student_class_id'), ('course_schedule', 'class_id')],
    'student': [('exam_score', 'student_id'), ('learning_behavior', 'student_id'), ('family_background', 'student_id'), ('risk_alert', 'student_id'), ('learning_suggestion', 'student_id'), ('student_subject', 'student_id')],
}

# ─── 管理员权限装饰器 ────────────────────────────────────────────

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.headers.get('X-Admin-Role') != 'admin':
            return jsonify({'error': '需要管理员权限'}), 403
        return f(*args, **kwargs)
    return decorated

# ─── 工具函数 ────────────────────────────────────────────────────

def _convert_row(row):
    """将行中的 datetime/date 对象转换为 ISO 格式字符串"""
    if not row:
        return row
    converted = {}
    for k, v in row.items():
        if hasattr(v, 'isoformat'):
            converted[k] = v.isoformat()
        elif isinstance(v, (bytes, bytearray)):
            converted[k] = str(v)
        else:
            converted[k] = v
    return converted


def _parse_record_id(table_name, record_id_str):
    """解析 record_id，支持复合主键（逗号分隔）"""
    config = TABLE_CONFIG.get(table_name)
    if not config:
        return None
    pk = config['primary_key']
    if isinstance(pk, list):
        values = record_id_str.split(',')
        if len(values) != len(pk):
            return None
        return dict(zip(pk, values))
    return {pk: record_id_str}


def _build_pk_where(table_name, pk_dict):
    """构建主键 WHERE 子句和参数"""
    conditions = []
    params = []
    for col, val in pk_dict.items():
        conditions.append(f"{col} = %s")
        params.append(val)
    where_clause = ' AND '.join(conditions)
    return where_clause, params


def _validate_fk(data, columns_config):
    """验证外键引用是否存在，返回错误信息或 None"""
    for col in columns_config:
        col_name = col['name']
        if col_name not in data:
            continue
        value = data[col_name]
        if value is None or value == '':
            continue
        fk_table = col.get('fk_table')
        fk_column = col.get('fk_column')
        if fk_table and fk_column:
            ref = query_one(f"SELECT 1 FROM {fk_table} WHERE {fk_column} = %s", (value,))
            if not ref:
                return f'引用的{fk_table}记录不存在（{col["label"]}: {value}）'
    return None


def _validate_required(data, columns_config, is_insert=True):
    """验证必填字段，返回错误信息或 None"""
    for col in columns_config:
        if not is_insert and not col.get('editable', True):
            continue
        if not col.get('nullable', True) and col['name'] not in data:
            # 自增主键在插入时不需要提供
            if is_insert and col['name'] in _get_auto_increment_cols(
                [c for c in columns_config if c['name'] == col['name']]
            ):
                continue
            return f'缺少必填字段: {col["label"]}({col["name"]})'
        if not col.get('nullable', True) and col['name'] in data:
            val = data[col['name']]
            if val is None or (isinstance(val, str) and val.strip() == ''):
                return f'必填字段不能为空: {col["label"]}({col["name"]})'
    return None


def _get_auto_increment_cols(columns):
    """获取自增列名集合（简化版，仅用于插入时跳过验证）"""
    return set()


# ─── API 端点 ────────────────────────────────────────────────────

@data_management_bp.route('/tables', methods=['GET'])
@admin_required
def get_tables():
    """返回所有表的元数据配置"""
    tables = []
    for name, config in TABLE_CONFIG.items():
        pk = config['primary_key']
        pk_set = set(pk) if isinstance(pk, list) else {pk}
        auto_inc = config.get('auto_increment_pk', False)
        # 为每个列添加 primary_key 和 auto_increment 标记
        enriched_columns = []
        for col in config['columns']:
            c = dict(col)
            c['primary_key'] = col['name'] in pk_set
            c['auto_increment'] = auto_inc and col['name'] in pk_set
            # 为 FK 列添加引用信息
            if col.get('fk_table'):
                fk_config = TABLE_CONFIG.get(col['fk_table'])
                fk_label = fk_config['label'] if fk_config else col['fk_table']
                c['fk_reference'] = f"{fk_label}"
            enriched_columns.append(c)
        tables.append({
            'name': name,
            'label': config['label'],
            'readonly': config['readonly'],
            'columns': enriched_columns,
        })
    return jsonify({'data': tables})


@data_management_bp.route('/<table_name>', methods=['GET'])
@admin_required
def get_rows(table_name):
    """获取表数据（分页、搜索、排序）"""
    config = TABLE_CONFIG.get(table_name)
    if not config:
        return jsonify({'error': f'未知的表: {table_name}'}), 404

    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 50, type=int)
    search = request.args.get('search', '').strip()
    sort_by = request.args.get('sort_by', '').strip()
    sort_order = request.args.get('sort_order', 'asc').strip().lower()

    # 基础查询
    base_sql = f"SELECT * FROM {table_name}"
    count_sql = f"SELECT COUNT(*) AS total FROM {table_name}"
    params = []
    count_params = []

    # 搜索条件：在所有字符串列中模糊匹配
    if search:
        searchable_cols = [
            col['name'] for col in config['columns']
            if col['type'] in ('varchar', 'text')
        ]
        if searchable_cols:
            like_parts = [f"{col} LIKE %s" for col in searchable_cols]
            search_pattern = f"%{search}%"
            where_clause = ' OR '.join(like_parts)
            base_sql += f" WHERE {where_clause}"
            count_sql += f" WHERE {where_clause}"
            params.extend([search_pattern] * len(searchable_cols))
            count_params.extend([search_pattern] * len(searchable_cols))

    # 排序
    allowed_sort_cols = {col['name'] for col in config['columns']}
    if sort_by and sort_by in allowed_sort_cols:
        order = 'DESC' if sort_order == 'desc' else 'ASC'
        base_sql += f" ORDER BY {sort_by} {order}"
    else:
        # 默认按主键排序
        pk = config['primary_key']
        if isinstance(pk, list):
            base_sql += f" ORDER BY {', '.join(pk)}"
        else:
            base_sql += f" ORDER BY {pk}"

    # 分页
    offset = (page - 1) * page_size
    base_sql += " LIMIT %s OFFSET %s"
    params.extend([page_size, offset])

    # 查询
    total_result = query_one(count_sql, count_params or None)
    total = total_result['total'] if total_result else 0
    rows = query_all(base_sql, params or None)

    # 转换日期时间
    converted_rows = [_convert_row(row) for row in rows]

    return jsonify({
        'data': {
            'rows': converted_rows,
            'total': total,
            'page': page,
            'page_size': page_size,
        }
    })


@data_management_bp.route('/<table_name>', methods=['POST'])
@admin_required
def insert_row(table_name):
    """插入新记录"""
    config = TABLE_CONFIG.get(table_name)
    if not config:
        return jsonify({'error': f'未知的表: {table_name}'}), 404

    if config['readonly']:
        return jsonify({'error': '该表为只读表，不允许新增'}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': '请求体不能为空'}), 400

    columns = config['columns']

    # 验证必填字段（自增主键不需要提供）
    auto_inc_pk = config.get('auto_increment_pk', False)
    pk_name = config['primary_key']
    if isinstance(pk_name, list):
        pk_names = set(pk_name)
    else:
        pk_names = {pk_name}

    for col in columns:
        if not col.get('nullable', True) and col['name'] not in data:
            # 自增主键跳过
            if auto_inc_pk and col['name'] in pk_names:
                continue
            return jsonify({'error': f'缺少必填字段: {col["label"]}({col["name"]})'}), 400
        if not col.get('nullable', True) and col['name'] in data:
            val = data[col['name']]
            if val is None or (isinstance(val, str) and val.strip() == ''):
                return jsonify({'error': f'必填字段不能为空: {col["label"]}({col["name"]})'}), 400

    # 验证外键
    fk_error = _validate_fk(data, columns)
    if fk_error:
        return jsonify({'error': fk_error}), 400

    # 构建插入语句
    insert_cols = []
    insert_vals = []
    insert_params = []

    for col in columns:
        col_name = col['name']
        if col_name not in data:
            continue
        # 自增主键跳过
        if auto_inc_pk and col_name in pk_names:
            continue
        insert_cols.append(col_name)
        insert_vals.append('%s')
        insert_params.append(data[col_name])

    if not insert_cols:
        return jsonify({'error': '没有可插入的字段'}), 400

    sql = f"INSERT INTO {table_name} ({', '.join(insert_cols)}) VALUES ({', '.join(insert_vals)})"
    try:
        execute(sql, insert_params)
    except Exception as e:
        error_msg = str(e)
        if 'Duplicate entry' in error_msg:
            return jsonify({'error': '记录已存在，主键重复'}), 400
        if 'Cannot add or update a child row' in error_msg:
            return jsonify({'error': '外键约束失败，引用的记录不存在'}), 400
        return jsonify({'error': f'插入失败: {error_msg}'}), 400

    # 获取插入的 ID
    inserted_id = None
    if auto_inc_pk:
        result = query_one("SELECT LAST_INSERT_ID() AS id")
        inserted_id = str(result['id']) if result else None
    else:
        if isinstance(pk_name, list):
            inserted_id = ','.join(str(data.get(k, '')) for k in pk_name)
        else:
            inserted_id = str(data.get(pk_name, ''))

    # 记录变更历史
    record_change(
        'INSERT', table_name, inserted_id,
        operator='系统管理员',
        description=f'新增{config["label"]}记录',
        change_detail=data,
        operator_role='admin'
    )

    return jsonify({'data': {'inserted_id': inserted_id}})


@data_management_bp.route('/<table_name>/<record_id>', methods=['PUT'])
@admin_required
def update_row(table_name, record_id):
    """更新记录"""
    config = TABLE_CONFIG.get(table_name)
    if not config:
        return jsonify({'error': f'未知的表: {table_name}'}), 404

    if config['readonly']:
        return jsonify({'error': '该表为只读表，不允许修改'}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': '请求体不能为空'}), 400

    # 解析主键
    pk_dict = _parse_record_id(table_name, record_id)
    if pk_dict is None:
        return jsonify({'error': '无效的记录ID格式'}), 400

    columns = config['columns']

    # 只更新可编辑字段
    editable_cols = {col['name']: col for col in columns if col.get('editable', True)}
    update_parts = []
    update_params = []

    for col_name, value in data.items():
        if col_name not in editable_cols:
            continue
        col_config = editable_cols[col_name]
        # 验证必填
        if not col_config.get('nullable', True) and (value is None or (isinstance(value, str) and value.strip() == '')):
            return jsonify({'error': f'必填字段不能为空: {col_config["label"]}({col_name})'}), 400
        update_parts.append(f"{col_name} = %s")
        update_params.append(value)

    if not update_parts:
        return jsonify({'error': '没有可更新的字段'}), 400

    # 验证外键
    fk_error = _validate_fk(data, list(editable_cols.values()))
    if fk_error:
        return jsonify({'error': fk_error}), 400

    # 构建 WHERE 子句
    where_clause, where_params = _build_pk_where(table_name, pk_dict)

    sql = f"UPDATE {table_name} SET {', '.join(update_parts)} WHERE {where_clause}"
    params = update_params + where_params

    try:
        affected = execute(sql, params)
    except Exception as e:
        error_msg = str(e)
        if 'Cannot add or update a child row' in error_msg:
            return jsonify({'error': '外键约束失败，引用的记录不存在'}), 400
        return jsonify({'error': f'更新失败: {error_msg}'}), 400

    # 记录变更历史
    record_change(
        'UPDATE', table_name, record_id,
        operator='系统管理员',
        description=f'修改{config["label"]}记录',
        change_detail=data,
        operator_role='admin'
    )

    return jsonify({'data': {'affected': affected}})


@data_management_bp.route('/<table_name>/<record_id>', methods=['DELETE'])
@admin_required
def delete_row(table_name, record_id):
    """删除记录"""
    config = TABLE_CONFIG.get(table_name)
    if not config:
        return jsonify({'error': f'未知的表: {table_name}'}), 404

    if config['readonly']:
        return jsonify({'error': '该表为只读表，不允许删除'}), 403

    # 解析主键
    pk_dict = _parse_record_id(table_name, record_id)
    if pk_dict is None:
        return jsonify({'error': '无效的记录ID格式'}), 400

    # 引用完整性检查
    if table_name in TABLE_REFERENCES:
        ref_tables = TABLE_REFERENCES[table_name]
        # 获取主键值用于检查
        pk_value = list(pk_dict.values())[0]
        referencing = []
        for ref_table, ref_column in ref_tables:
            ref_row = query_one(f"SELECT 1 FROM {ref_table} WHERE {ref_column} = %s LIMIT 1", (pk_value,))
            if ref_row:
                ref_config = TABLE_CONFIG.get(ref_table)
                ref_label = ref_config['label'] if ref_config else ref_table
                referencing.append(ref_label)
        if referencing:
            return jsonify({'error': f'该记录被以下表引用，无法删除: {", ".join(referencing)}'}), 400

    # 获取被删除的记录数据（用于变更日志）
    where_clause, where_params = _build_pk_where(table_name, pk_dict)
    deleted_row = query_one(f"SELECT * FROM {table_name} WHERE {where_clause}", where_params)
    deleted_data = _convert_row(deleted_row) if deleted_row else None

    # 执行删除
    sql = f"DELETE FROM {table_name} WHERE {where_clause}"
    try:
        affected = execute(sql, where_params)
    except Exception as e:
        return jsonify({'error': f'删除失败: {str(e)}'}), 400

    # 记录变更历史
    record_change(
        'DELETE', table_name, record_id,
        operator='系统管理员',
        description=f'删除{config["label"]}记录',
        change_detail=deleted_data,
        operator_role='admin'
    )

    return jsonify({'data': {'affected': affected}})
