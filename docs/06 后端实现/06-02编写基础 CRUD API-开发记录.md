# 6.2 编写基础 CRUD API — 开发记录

**开发日期**：2026年6月2日
**开发阶段**：阶段六 — 后端开发
**前置条件**：6.1 搭建后端项目结构已完成（`db.py`、`config.py`、`routes/`、`services/` 目录已创建）

---

## 一、开发目标

基于 Flask 框架编写基础 CRUD API，包括：
1. 创建 `app.py` 主入口文件，注册所有 Blueprint
2. 实现学生查询 API（分页列表 + 单个详情）
3. 实现成绩相关 API（成绩趋势 + 班级统计）
4. 创建预警、建议、NL2SQL 三个路由骨架

---

## 二、开发步骤

### 步骤 1：创建 `backend/app.py`（主入口文件）

**实现内容**：
- 导入 Flask 和 Flask-CORS
- 注册 5 个 Blueprint，分别对应 5 个 API 模块
- 设置 URL 前缀：`/api/students`、`/api/scores`、`/api/alerts`、`/api/suggestions`、`/api/nl2sql`
- 启用 CORS 跨域支持
- 运行端口 5000，开启 debug 模式

**关键代码**：
```python
from flask import Flask
from flask_cors import CORS
from routes.student import student_bp
from routes.score import score_bp
from routes.alert import alert_bp
from routes.suggestion import suggestion_bp
from routes.nl2sql import nl2sql_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(student_bp, url_prefix='/api/students')
app.register_blueprint(score_bp, url_prefix='/api/scores')
app.register_blueprint(alert_bp, url_prefix='/api/alerts')
app.register_blueprint(suggestion_bp, url_prefix='/api/suggestions')
app.register_blueprint(nl2sql_bp, url_prefix='/api/nl2sql')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**设计说明**：
- 使用 Blueprint 模式实现模块化路由，每个功能模块独立文件，便于维护和扩展
- CORS 中间件确保前端 Streamlit 可以跨域调用后端 API
- debug 模式在开发阶段自动重载代码变更

---

### 步骤 2：创建 `backend/routes/student.py`

**实现接口**：

| 路由 | 方法 | 功能 | 参数 |
|------|------|------|------|
| `/` | GET | 分页查询学生列表 | `page`（默认1）、`per_page`（默认20） |
| `/<student_id>` | GET | 查询单个学生详情 | 路径参数 `student_id` |

**关键实现要点**：
- 分页查询使用 `LIMIT %s OFFSET %s`，先查总数再查数据
- 返回 JSON 格式：`{ data, total, page, per_page }`
- 学生不存在时返回 404 状态码和错误信息

**关键代码**：
```python
@student_bp.route('/', methods=['GET'])
def get_students():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    offset = (page - 1) * per_page

    total_result = query_one("SELECT COUNT(*) AS total FROM student")
    total = total_result['total'] if total_result else 0

    students = query_all(
        "SELECT * FROM student LIMIT %s OFFSET %s",
        (per_page, offset)
    )

    return jsonify({
        'data': students,
        'total': total,
        'page': page,
        'per_page': per_page
    })
```

**设计说明**：
- 使用 `request.args.get()` 的 `type=int` 参数自动做类型转换，非法值回退为默认值
- 分页计算 `offset = (page - 1) * per_page`，符合 RESTful 分页规范
- 总数查询与数据查询分离，确保分页信息准确

---

### 步骤 3：创建 `backend/routes/score.py`

**实现接口**：

| 路由 | 方法 | 功能 | 参数 |
|------|------|------|------|
| `/trend/<student_id>` | GET | 查询学生成绩趋势 | 路径参数 `student_id` |
| `/class-stats` | GET | 班级成绩统计 | 可选 `class_id` |

**成绩趋势 API**：
- 按 `subject_id, exam_stage` 排序，确保 G1→G2→G3 顺序
- 先验证学生是否存在，不存在返回 404
- 返回包含学生姓名和成绩列表的 JSON

**班级统计 API**：
- JOIN `exam_score`、`student`、`class` 三张表
- 按 `class_id` 和 `subject_id` 分组
- 计算指标：学生人数、平均分、最低分、最高分、及格率
- 及格率计算：`SUM(CASE WHEN score >= 10 THEN 1 ELSE 0 END) / COUNT(*) * 100`
- 默认查询 G3 阶段成绩，支持 `class_id` 可选筛选

**关键代码**：
```python
@score_bp.route('/class-stats', methods=['GET'])
def get_class_stats():
    class_id = request.args.get('class_id', '')

    sql = (
        "SELECT c.class_id, c.class_name, es.subject_id, "
        "COUNT(es.score_id) AS student_count, "
        "ROUND(AVG(es.score), 2) AS avg_score, "
        "MIN(es.score) AS min_score, "
        "MAX(es.score) AS max_score, "
        "ROUND(SUM(CASE WHEN es.score >= 10 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS pass_rate "
        "FROM exam_score es "
        "JOIN student s ON es.student_id = s.student_id "
        "JOIN class c ON s.student_class_id = c.class_id "
        "WHERE es.exam_stage = 'G3' "
    )
    params = []

    if class_id:
        sql += "AND c.class_id = %s "
        params.append(class_id)

    sql += "GROUP BY c.class_id, c.class_name, es.subject_id ORDER BY c.class_id, es.subject_id"

    stats = query_all(sql, params if params else None)
    return jsonify(stats)
```

**设计说明**：
- 及格线设为 10 分（UCI 数据集 0-20 分制），后续 Performance Factors 数据集（0-100 分制）的及格线为 60 分
- 动态 SQL 拼接：当 `class_id` 参数存在时添加 WHERE 条件，使用参数化查询防止 SQL 注入
- `params if params else None`：空列表传给 `query_all` 会导致参数不匹配，需传 None

---

### 步骤 4：创建 `backend/routes/alert.py`（骨架）

**实现接口**：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/` | GET | 查询预警列表，可选 `risk_level` 筛选 |

**设计说明**：
- 当前为骨架实现，仅支持查询已有预警记录
- 后续 7.3 步骤将补充 `/generate`（POST 生成预警）、`/<alert_id>/intervene`（PUT 干预）、`/stats`（GET 统计）等接口
- 支持按 `risk_level`（low/medium/high）筛选，按 `alert_time` 降序排列

---

### 步骤 5：创建 `backend/routes/suggestion.py`（骨架）

**实现接口**：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/<student_id>` | GET | 查询学生的历史建议列表 |

**设计说明**：
- 当前为骨架实现，仅支持查询已有建议
- 后续 7.4 步骤将补充 `/generate/<student_id>`（POST 生成建议）、`/<suggestion_id>/feedback`（PUT 反馈）等接口
- 按生成时间降序排列

---

### 步骤 6：创建 `backend/routes/nl2sql.py`（骨架）

**实现接口**：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/query` | POST | NL2SQL 查询（待实现） |

**设计说明**：
- 当前仅返回占位消息 `{'message': 'NL2SQL功能待实现'}`
- 后续 7.2 步骤将实现完整的自然语言转 SQL 功能

---

## 三、验证结果

### 启动验证

```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### 接口测试结果

| API | 方法 | 状态 | 返回数据说明 |
|-----|------|------|-------------|
| `/api/students/` | GET | ✅ 200 | 返回分页学生列表，total=7655，默认每页20条 |
| `/api/students/STU_M_0001` | GET | ✅ 200 | 返回学生详情：姓名 Student_STU_M_1，班级 CLS001 |
| `/api/students/NONEXISTENT` | GET | ✅ 404 | 返回 `{"error": "学生不存在"}` |
| `/api/scores/trend/STU_M_0001` | GET | ✅ 200 | 返回成绩趋势：SUBJ_MATH G1=5, G2=6, G3=6 |
| `/api/scores/class-stats` | GET | ✅ 200 | 返回3个班级×科目的统计数据 |
| `/api/alerts/` | GET | ✅ 200 | 返回空列表（预警尚未生成） |
| `/api/suggestions/STU_M_0001` | GET | ✅ 200 | 返回空列表（建议尚未生成） |
| `/api/nl2sql/query` | POST | ✅ 200 | 返回 `{"message": "NL2SQL功能待实现"}` |

### 班级统计数据示例

| 班级 | 科目 | 学生数 | 平均分 | 最低分 | 最高分 | 及格率 |
|------|------|--------|--------|--------|--------|--------|
| 高一(1)班 | SUBJ_MATH | 397 | 10.38 | 0 | 20 | 66.75% |
| 高一(2)班 | SUBJ_PORTUGUESE | 651 | 11.90 | 0 | 19 | 84.64% |
| 高二(1)班 | SUBJ_GENERAL | 6607 | 67.24 | 55 | 100 | 100.00% |

---

## 四、文件清单

本次开发创建/修改的文件：

| 文件 | 类型 | 说明 |
|------|------|------|
| `backend/app.py` | 新建 | Flask 主入口，注册 Blueprint |
| `backend/routes/student.py` | 新建 | 学生查询 API（分页+详情） |
| `backend/routes/score.py` | 新建 | 成绩趋势+班级统计 API |
| `backend/routes/alert.py` | 新建 | 预警查询骨架 |
| `backend/routes/suggestion.py` | 新建 | 学习建议查询骨架 |
| `backend/routes/nl2sql.py` | 新建 | NL2SQL 骨架 |

---

## 五、技术要点总结

1. **Blueprint 模式**：使用 Flask Blueprint 实现模块化路由，每个功能模块独立文件，URL 前缀统一管理
2. **参数化查询**：所有 SQL 均使用 `%s` 占位符 + 参数元组，防止 SQL 注入
3. **分页规范**：采用 `page + per_page + offset` 标准分页方案，返回总数便于前端分页控件
4. **错误处理**：资源不存在返回 404，附带错误信息 JSON
5. **动态 SQL**：班级统计接口支持可选参数，根据参数动态拼接 WHERE 条件
6. **CORS 支持**：全局启用 CORS，为后续 Streamlit 前端调用做准备

---

## 六、后续计划

- **6.3 编写数据分析查询 API**：在 score.py 中添加 `/overview` 和 `/distribution` 接口，在 student.py 中添加 `/search` 接口
- **7.2 实现 NL2SQL**：完善 nl2sql.py 路由和 nl2sql_service.py 服务
- **7.3 实现风险预警**：完善 alert.py 路由和 risk_service.py 服务
- **7.4 实现学习建议**：完善 suggestion.py 路由和 suggestion_service.py 服务
