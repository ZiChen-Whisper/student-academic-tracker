# AI 开发步骤详细指南（PLAN.md）

**项目名称**：中小学学生学业发展动态跟踪与预警系统
**编写日期**：2026年6月2日
**适用范围**：阶段六 ~ 阶段九（阶段一~五已完成）
**目的**：指导 AI 助手逐步完成项目的后端、AI功能、前端和集成测试开发

---

## 目录

- [阶段六：后端开发](#阶段六后端开发)
  - [6.1 搭建后端项目结构](#61-搭建后端项目结构)
  - [6.2 编写基础 CRUD API](#62-编写基础-crud-api)
  - [6.3 编写数据分析查询 API](#63-编写数据分析查询-api)
  - [6.4 后端启动与接口验证](#64-后端启动与接口验证)
- [阶段七：AI 功能开发](#阶段七ai-功能开发)
  - [7.1 申请 LLM API Key](#71-申请-llm-api-key)
  - [7.2 实现 NL2SQL 功能](#72-实现-nl2sql-功能)
  - [7.3 实现 AI 学业风险预警](#73-实现-ai-学业风险预警)
  - [7.4 实现 AI 个性化学习建议](#74-实现-ai-个性化学习建议)
  - [7.5 AI 辅助开发过程记录](#75-ai-辅助开发过程记录)
- [阶段八：前端与可视化](#阶段八前端与可视化)
  - [8.1 安装 Streamlit 并搭建项目结构](#81-安装-streamlit-并搭建项目结构)
  - [8.2 实现学情概览页面](#82-实现学情概览页面)
  - [8.3 实现学生详情页面](#83-实现学生详情页面)
  - [8.4 实现 AI 查询页面](#84-实现-ai-查询页面)
  - [8.5 实现风险预警页面](#85-实现风险预警页面)
  - [8.6 AI 辅助可视化设计记录](#86-ai-辅助可视化设计记录)
- [阶段九：集成测试与文档](#阶段九集成测试与文档)
  - [9.1 集成测试](#91-集成测试)
  - [9.2 编写项目文档](#92-编写项目文档)
  - [9.3 准备演示 PPT](#93-准备演示-ppt)

---

## 阶段六：后端开发

**前置条件**：阶段五已完成（MySQL 数据库 `student_academic_tracker` 已创建，12 张表已有数据）
**目标**：搭建 Flask 后端，提供 RESTful API 供前端和 AI 功能调用

---

### 6.1 搭建后端项目结构

#### AI 执行步骤

**步骤 1：确认已有文件**

检查以下文件是否已存在：
- `backend/config.py` — 已存在，包含 `DB_CONFIG` 和 `LLM_CONFIG`
- `backend/requirements.txt` — 已存在
- `backend/.env.example` — 已存在

如果以上文件缺失，按照项目详细执行计划中的内容创建。

**步骤 2：创建 `backend/db.py`**

在 `backend/` 目录下创建数据库连接工具文件 `db.py`，提供三个核心函数：

```python
import mysql.connector
from config import DB_CONFIG

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def query_one(sql, params=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params)
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result

def query_all(sql, params=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results

def execute(sql, params=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    conn.close()
    return affected
```

**步骤 3：创建路由目录和服务目录**

```
backend/
├── app.py
├── config.py          ← 已存在
├── db.py              ← 步骤2创建
├── requirements.txt   ← 已存在
├── routes/
│   ├── __init__.py
│   ├── student.py
│   ├── score.py
│   ├── alert.py
│   ├── suggestion.py
│   └── nl2sql.py
└── services/
    ├── __init__.py
    ├── risk_service.py
    ├── suggestion_service.py
    └── nl2sql_service.py
```

创建所有 `__init__.py` 为空文件，其余文件在后续步骤中填充内容。

**步骤 4：验证数据库连接**

运行以下命令确认 `db.py` 能正常连接数据库：

```bash
cd d:\大二下资料\数据库原理\大作业\student-academic-tracker
.\venv\Scripts\Activate.ps1
python -c "import sys; sys.path.insert(0,'backend'); from db import query_one; print(query_one('SELECT COUNT(*) AS cnt FROM student'))"
```

预期输出：`{'cnt': 7653}`（或类似数字）

#### 验证标准

- `backend/db.py` 创建成功
- `backend/routes/` 和 `backend/services/` 目录及 `__init__.py` 创建成功
- 数据库连接测试通过，能查询到 student 表的记录数

---

### 6.2 编写基础 CRUD API

#### AI 执行步骤

**步骤 1：创建 `backend/app.py`（主入口文件）**

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

**步骤 2：创建 `backend/routes/student.py`**

实现学生相关的查询 API：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/` | GET | 分页查询学生列表，参数 `page`、`per_page` |
| `/<student_id>` | GET | 查询单个学生详情 |

关键实现要点：
- 使用 `query_all` 和 `query_one` 函数
- 分页使用 `LIMIT %s OFFSET %s`
- 返回 JSON 格式：`{ data, total, page, per_page }`
- 学生不存在时返回 404

**步骤 3：创建 `backend/routes/score.py`**

实现成绩相关 API：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/trend/<student_id>` | GET | 查询学生成绩趋势 |
| `/class-stats` | GET | 班级成绩统计（可选参数 `class_id`） |

关键实现要点：
- 成绩趋势按 `subject_id, exam_stage` 排序
- 班级统计需 JOIN student、class、exam_score 三张表
- 计算平均分、最低分、最高分、及格率
- UCI 数据集及格线 10 分，Performance Factors 及格线 60 分

**步骤 4：创建 `backend/routes/alert.py`（骨架）**

先创建基础骨架，后续 7.3 步骤补充完整逻辑：

```python
from flask import Blueprint, request, jsonify
from db import query_all

alert_bp = Blueprint('alert', __name__)

@alert_bp.route('/', methods=['GET'])
def get_alerts():
    risk_level = request.args.get('risk_level', '')
    sql = "SELECT * FROM risk_alert"
    params = []
    if risk_level:
        sql += " WHERE risk_level = %s"
        params.append(risk_level)
    sql += " ORDER BY alert_time DESC"
    alerts = query_all(sql, params if params else None)
    return jsonify(alerts)
```

**步骤 5：创建 `backend/routes/suggestion.py`（骨架）**

先创建基础骨架，后续 7.4 步骤补充完整逻辑：

```python
from flask import Blueprint, request, jsonify
from db import query_all

suggestion_bp = Blueprint('suggestion', __name__)

@suggestion_bp.route('/<student_id>', methods=['GET'])
def get_suggestions(student_id):
    suggestions = query_all(
        "SELECT * FROM learning_suggestion WHERE student_id = %s ORDER BY generate_time DESC",
        (student_id,)
    )
    return jsonify(suggestions)
```

**步骤 6：创建 `backend/routes/nl2sql.py`（骨架）**

先创建基础骨架，后续 7.2 步骤补充完整逻辑：

```python
from flask import Blueprint, request, jsonify

nl2sql_bp = Blueprint('nl2sql', __name__)

@nl2sql_bp.route('/query', methods=['POST'])
def query():
    return jsonify({'message': 'NL2SQL功能待实现'})
```

#### 验证标准

- `app.py` 能正常启动，无 import 错误
- 访问 `http://localhost:5000/api/students/` 返回学生列表 JSON
- 访问 `http://localhost:5000/api/students/STU_M_0001` 返回单个学生信息
- 访问 `http://localhost:5000/api/scores/trend/STU_M_0001` 返回成绩趋势

---

### 6.3 编写数据分析查询 API

#### AI 执行步骤

**步骤 1：在 `backend/routes/score.py` 中添加学情概览接口**

添加 `/overview` 路由，返回：
- `total_students`：学生总数
- `average_score`：G3 阶段平均成绩
- `high_risk_count`：高风险预警人数

**步骤 2：在 `backend/routes/score.py` 中添加成绩分布接口**

添加 `/distribution` 路由，参数：
- `subject_id`（可选）：筛选科目
- `exam_stage`（默认 G3）：考试阶段

将成绩按区间分组（0-4, 5-9, 10-14, 15-20），统计每个区间的人数。

**步骤 3：在 `backend/routes/student.py` 中添加搜索接口**

添加 `/search` 路由，支持按姓名模糊搜索：

```python
@student_bp.route('/search', methods=['GET'])
def search_students():
    keyword = request.args.get('keyword', '')
    if not keyword:
        return jsonify({'data': [], 'total': 0})
    students = query_all(
        "SELECT * FROM student WHERE student_name LIKE %s LIMIT 20",
        (f'%{keyword}%',)
    )
    return jsonify({'data': students, 'total': len(students)})
```

#### 验证标准

- `GET /api/scores/overview` 返回包含 total_students、average_score、high_risk_count 的 JSON
- `GET /api/scores/distribution` 返回成绩分布数据
- `GET /api/students/search?keyword=张` 返回匹配的学生列表

---

### 6.4 后端启动与接口验证

#### AI 执行步骤

**步骤 1：启动后端服务**

```bash
cd d:\大二下资料\数据库原理\大作业\student-academic-tracker
.\venv\Scripts\Activate.ps1
cd backend
python app.py
```

确认输出：`* Running on http://127.0.0.1:5000`

**步骤 2：逐个验证所有 API 接口**

使用 curl 或浏览器测试：

```bash
curl http://localhost:5000/api/students/
curl http://localhost:5000/api/students/STU_M_0001
curl http://localhost:5000/api/students/search?keyword=张
curl http://localhost:5000/api/scores/trend/STU_M_0001
curl http://localhost:5000/api/scores/class-stats
curl http://localhost:5000/api/scores/overview
curl http://localhost:5000/api/scores/distribution
curl http://localhost:5000/api/alerts/
curl http://localhost:5000/api/suggestions/STU_M_0001
```

**步骤 3：修复发现的问题**

如果任何接口返回错误，检查：
1. SQL 语法是否正确
2. 表名/字段名是否与建表脚本一致
3. 数据库连接是否正常
4. import 路径是否正确

#### 验证标准

- 所有 9 个基础 API 接口均返回 200 状态码
- 返回的 JSON 数据格式正确，无 null 异常

---

## 阶段七：AI 功能开发

**前置条件**：阶段五已完成（数据库有数据），阶段六后端框架已搭建
**目标**：实现 3 个 AI 融入点（NL2SQL、风险预警、学习建议）

---

### 7.1 申请 LLM API Key

#### AI 执行步骤

**步骤 1：确认 `.env` 配置**

检查 `backend/.env` 文件是否存在且包含 `LLM_API_KEY`。如果 API Key 尚未填写，需要人工完成以下操作：

1. 访问 https://platform.deepseek.com/
2. 注册账号并创建 API Key
3. 将 Key 填入 `backend/.env` 的 `LLM_API_KEY` 字段

**步骤 2：验证 API 连通性**

```python
import sys
sys.path.insert(0, 'backend')
from config import LLM_CONFIG
from openai import OpenAI

client = OpenAI(api_key=LLM_CONFIG['api_key'], base_url=LLM_CONFIG['base_url'])
response = client.chat.completions.create(
    model=LLM_CONFIG['model'],
    messages=[{"role": "user", "content": "你好"}],
    temperature=0
)
print(response.choices[0].message.content)
```

如果返回正常的中文回复，说明 API 连通。

#### 验证标准

- `backend/.env` 中 `LLM_API_KEY` 已填写
- API 连通性测试通过

---

### 7.2 实现 NL2SQL 功能

#### AI 执行步骤

**步骤 1：创建 `backend/services/nl2sql_service.py`**

这是 NL2SQL 的核心服务文件，需要包含：

1. **DDL_SCHEMA 常量**：将 `前期准备/04 ER图转关系模式/建表脚本.sql` 中的 12 张表的 CREATE TABLE 语句作为字符串常量，供 Prompt 使用

2. **SYSTEM_PROMPT 常量**：系统提示词，包含：
   - 角色定义（SQL 专家）
   - 数据库表结构
   - 重要规则：
     - 只输出一条 SQL 语句
     - 只允许 SELECT 查询
     - UCI 数据集成绩 0-20 分制，Performance Factors 0-100 分制
     - student_id 格式：STU_M_XXXX / STU_P_XXXX / STU_F_XXXX
     - subject_id 格式：SUBJ_MATH / SUBJ_PORTUGUESE / SUBJ_GENERAL
     - class_id 格式：CLS001 / CLS002 / CLS003
     - UCI 及格线 10 分，Performance Factors 及格线 60 分
     - exam_stage: G1/G2/G3

3. **`nl2sql(question: str) -> dict` 函数**：
   - 调用 DeepSeek API，将自然语言问题转为 SQL
   - 清理返回的 SQL（去除 markdown 代码块标记）
   - 执行生成的 SQL，返回结果
   - 记录查询日志到 `nl2sql_log` 表
   - 返回格式：`{ sql, result, error, execution_time_ms }`

4. **`log_nl2sql(question, sql, execution_time_ms, is_correct)` 函数**：
   - 将查询记录插入 `nl2sql_log` 表

**步骤 2：更新 `backend/routes/nl2sql.py`**

将骨架替换为完整实现：

```python
from flask import Blueprint, request, jsonify
from services.nl2sql_service import nl2sql

nl2sql_bp = Blueprint('nl2sql', __name__)

@nl2sql_bp.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    question = data.get('question', '')
    if not question:
        return jsonify({'error': '请输入问题'}), 400
    result = nl2sql(question)
    return jsonify(result)
```

**步骤 3：创建 NL2SQL 测试脚本**

创建 `tests/test_nl2sql.py`，包含 20 个测试查询：

```
1.  查询所有学生的平均成绩
2.  查询数学成绩前10名的学生
3.  查询出勤率低于80%的学生
4.  统计各科目的平均分
5.  查询G1到G3成绩持续下滑的学生
6.  查询高风险预警学生名单
7.  统计男女学生的平均成绩差异
8.  查询学习时长与成绩的关系
9.  查询家庭支持对学生成绩的影响
10. 查询缺勤次数最多的10个学生
11. 查询有额外辅导的学生成绩是否更好
12. 查询有网络接入和没有网络接入的学生成绩对比
13. 查询动机水平高的学生平均成绩
14. 查询年龄和成绩的关系
15. 查询学校支持对学生成绩的影响
16. 查询各班级的平均成绩排名
17. 查询成绩进步最大的10个学生
18. 查询家庭收入水平与学生成绩的关系
19. 查询睡眠时间与成绩的关系
20. 查询参加课外活动和不参加的学生成绩对比
```

**步骤 4：运行 NL2SQL 测试**

```bash
cd d:\大二下资料\数据库原理\大作业\student-academic-tracker
.\venv\Scripts\Activate.ps1
cd backend
python -m tests.test_nl2sql
```

统计准确率（SQL 能正确执行且返回合理结果），目标 ≥ 85%。

**步骤 5：优化 Prompt（如果准确率不足 85%）**

优化策略：
1. 在 SYSTEM_PROMPT 中添加 3-5 个 few-shot 示例（自然语言 → SQL 的配对）
2. 添加更详细的字段含义说明（如 `attendance_rate` 是百分比 0-100）
3. 对常见查询模式预设模板，匹配后直接使用
4. 添加数据集说明（哪些 student_id 属于哪个数据集）

#### 验证标准

- NL2SQL 服务代码创建完成
- `/api/nl2sql/query` 接口可用
- 20 个测试查询准确率 ≥ 85%
- `nl2sql_log` 表中有查询日志记录

---

### 7.3 实现 AI 学业风险预警

#### AI 执行步骤

**步骤 1：创建 `backend/services/risk_service.py`（基于规则的预警）**

实现以下函数：

1. **`predict_risk(student_data: dict) -> dict`**：
   - 输入：学生数据（avg_score, attendance_rate, motivation_level 等）
   - 风险评分规则：
     - 平均成绩 < 10 → +3 分，10-14 → +1 分
     - 出勤率 < 80% → +2 分
     - 动机 Low → +2 分，Medium → +1 分
   - 风险等级：≥5 为 high，≥3 为 medium，其他为 low
   - 返回：`{ student_id, risk_level, risk_score, features }`

2. **`calculate_risk_for_all() -> list`**：
   - 查询所有学生的 G3 成绩、出勤率、动机水平
   - 对每个学生调用 `predict_risk`
   - 将结果保存到 `risk_alert` 表
   - 返回预警列表

3. **`save_alert(risk_info: dict)`**：
   - 将预警信息插入 `risk_alert` 表
   - `risk_factors` 字段用 JSON 格式存储

**步骤 2：更新 `backend/routes/alert.py`**

完整实现以下接口：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/` | GET | 查询预警列表，可选参数 `risk_level` 筛选 |
| `/generate` | POST | 为所有学生重新生成预警 |
| `/<alert_id>/intervene` | PUT | 更新干预状态和措施 |
| `/stats` | GET | 预警统计（按风险等级分组计数） |

**步骤 3：测试预警功能**

```bash
curl -X POST http://localhost:5000/api/alerts/generate
curl http://localhost:5000/api/alerts/
curl http://localhost:5000/api/alerts/stats
curl http://localhost:5000/api/alerts/?risk_level=high
```

**步骤 4（可选）：实现 ML 模型预警**

如果时间允许，在 `risk_service.py` 中添加 `train_risk_model()` 函数：
- 使用 RandomForestClassifier
- 特征：student_age, attendance_rate, study_hours, sleep_hours, tutoring_sessions, motivation_num
- 标签：根据 G3 成绩划分（<10 high, <14 medium, else low）
- 输出模型准确率

#### 验证标准

- `risk_service.py` 创建完成
- `/api/alerts/generate` 能成功生成预警
- `risk_alert` 表中有预警数据
- `/api/alerts/stats` 返回各等级的统计数量
- 高风险学生数量合理（与成绩数据一致）

---

### 7.4 实现 AI 个性化学习建议

#### AI 执行步骤

**步骤 1：创建 `backend/services/suggestion_service.py`**

实现以下函数：

1. **`generate_suggestion(student_id: str) -> dict`**：
   - 查询学生的基本信息、成绩趋势、学习行为、家庭背景、风险预警
   - 将成绩数据格式化为趋势字符串（如 `SUBJ_MATH: G1=8, G2=10, G3=12`）
   - 构造 Prompt，要求生成 3 条具体、可操作的学习建议
   - 调用 DeepSeek API，temperature=0.7（允许一定创造性）
   - 将生成的建议保存到 `learning_suggestion` 表
   - 返回：`{ student_id, suggestion }`

2. **`update_feedback(suggestion_id: int, feedback: str)`**：
   - 更新 `learning_suggestion` 表的 `student_feedback` 字段
   - feedback 只允许：satisfied / neutral / unsatisfied

**步骤 2：更新 `backend/routes/suggestion.py`**

完整实现以下接口：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/<student_id>` | GET | 查询学生的历史建议列表 |
| `/generate/<student_id>` | POST | 为指定学生生成新建议 |
| `/<suggestion_id>/feedback` | PUT | 提交建议反馈 |

**步骤 3：测试学习建议功能**

```bash
curl -X POST http://localhost:5000/api/suggestions/generate/STU_M_0001
curl http://localhost:5000/api/suggestions/STU_M_0001
curl -X PUT -H "Content-Type: application/json" -d '{"feedback":"satisfied"}' http://localhost:5000/api/suggestions/1/feedback
```

#### 验证标准

- `suggestion_service.py` 创建完成
- `/api/suggestions/generate/STU_M_0001` 返回包含 3 条建议的 JSON
- `learning_suggestion` 表中有建议数据
- 建议内容与学生的实际数据相关（不是泛泛而谈）
- 反馈接口能正常更新

---


## 阶段八：前端与可视化

**前置条件**：阶段六后端 API 基本可用（可以先搭骨架，边开发边对接）
**目标**：搭建 Streamlit 前端，实现 4 个核心页面

---

### 8.1 安装 Streamlit 并搭建项目结构

#### AI 执行步骤

**步骤 1：安装前端依赖**

```bash
pip install streamlit plotly matplotlib requests
```

同时更新 `backend/requirements.txt`，添加：

```
streamlit>=1.30.0
plotly>=5.18.0
matplotlib>=3.8.0
requests>=2.31.0
```

**步骤 2：创建前端目录结构**

```
frontend/
├── app.py
├── pages/
│   ├── __init__.py
│   ├── overview.py
│   ├── student.py
│   ├── nl2sql.py
│   └── alert.py
└── utils/
    ├── __init__.py
    ├── db.py
    └── api.py
```

**步骤 3：创建 `frontend/utils/db.py`**

前端直接连接数据库的工具文件（用于简单查询）：

```python
import mysql.connector
import pandas as pd
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', '.env'))

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'student_academic_tracker')
}

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def run_query(sql):
    conn = get_connection()
    df = pd.read_sql(sql, conn)
    conn.close()
    return df
```

**步骤 4：创建 `frontend/utils/api.py`**

调用后端 API 的工具文件：

```python
import requests

BASE_URL = "http://localhost:5000/api"

def get_students(page=1, per_page=20):
    return requests.get(f"{BASE_URL}/students/", params={"page": page, "per_page": per_page}).json()

def get_student(student_id):
    return requests.get(f"{BASE_URL}/students/{student_id}").json()

def get_score_trend(student_id):
    return requests.get(f"{BASE_URL}/scores/trend/{student_id}").json()

def get_overview():
    return requests.get(f"{BASE_URL}/scores/overview").json()

def nl2sql_query(question):
    return requests.post(f"{BASE_URL}/nl2sql/query", json={"question": question}).json()

def generate_alerts():
    return requests.post(f"{BASE_URL}/alerts/generate").json()

def generate_suggestion(student_id):
    return requests.post(f"{BASE_URL}/suggestions/generate/{student_id}").json()
```

**步骤 5：创建 `frontend/app.py`（主入口）**

```python
import streamlit as st

st.set_page_config(
    page_title="学业跟踪预警系统",
    page_icon="📊",
    layout="wide"
)

st.sidebar.title("导航")
page = st.sidebar.radio(
    "选择页面",
    ["学情概览", "学生详情", "AI查询", "风险预警"]
)

if page == "学情概览":
    from pages.overview import render
    render()
elif page == "学生详情":
    from pages.student import render
    render()
elif page == "AI查询":
    from pages.nl2sql import render
    render()
elif page == "风险预警":
    from pages.alert import render
    render()
```

**步骤 6：创建各页面的空骨架**

为 4 个页面创建 `render()` 函数骨架，内容在后续步骤填充：

```python
import streamlit as st

def render():
    st.title("页面标题")
    st.info("页面内容待实现")
```

**步骤 7：启动前端验证**

```bash
cd d:\大二下资料\数据库原理\大作业\student-academic-tracker\frontend
streamlit run app.py
```

浏览器应自动打开 `http://localhost:8501`，能看到侧边栏导航和 4 个页面选项。

#### 验证标准

- Streamlit 安装成功
- 前端目录结构创建完成
- `streamlit run app.py` 能正常启动
- 4 个页面都能切换显示

---

### 8.2 实现学情概览页面

#### AI 执行步骤

**步骤 1：实现 `frontend/pages/overview.py`**

页面布局：

```
┌─────────────────────────────────────────────┐
│  📊 学情概览                                 │
├──────┬──────┬──────┬──────┤
│ 学生  │ 平均  │ 高风险 │ 及格率 │
│ 总数  │ 成绩  │ 人数  │       │
├──────┴──────┴──────┴──────┤
│  各科目平均成绩（柱状图）  │  风险等级分布（饼图）  │
├─────────────────────────────────────────────┤
│  成绩分布（直方图）                           │
└─────────────────────────────────────────────┘
```

关键实现要点：
- 顶部 4 个指标卡片使用 `st.columns(4)` + `st.metric()`
- 左右两栏使用 `st.columns(2)`
- 柱状图用 `px.bar()`
- 饼图用 `px.pie()`，颜色映射：low=green, medium=orange, high=red
- 直方图用 `px.histogram()`
- 所有图表使用 `st.plotly_chart(fig, use_container_width=True)`

数据来源：
- 学生总数：`SELECT COUNT(*) FROM student`
- 平均成绩：`SELECT AVG(score) FROM exam_score WHERE exam_stage='G3'`
- 高风险人数：`SELECT COUNT(*) FROM risk_alert WHERE risk_level='high'`
- 及格率：`SELECT SUM(CASE WHEN score>=10 THEN 1 ELSE 0 END)/COUNT(*) FROM exam_score WHERE exam_stage='G3'`
- 科目平均：`SELECT subject_id, AVG(score) FROM exam_score WHERE exam_stage='G3' GROUP BY subject_id`
- 风险分布：`SELECT risk_level, COUNT(*) FROM risk_alert GROUP BY risk_level`
- 成绩分布：`SELECT score, COUNT(*) FROM exam_score WHERE exam_stage='G3' GROUP BY score ORDER BY score`

**步骤 2：验证页面**

切换到"学情概览"页面，确认：
- 4 个指标卡片显示正确数字
- 3 个图表正常渲染
- 无报错

#### 验证标准

- 学情概览页面完整实现
- 所有指标和图表数据正确
- 页面布局美观，响应式

---

### 8.3 实现学生详情页面

#### AI 执行步骤

**步骤 1：实现 `frontend/pages/student.py`**

页面布局：

```
┌─────────────────────────────────────────────┐
│  👤 学生详情                                 │
│  [选择学生 ▼]                                │
├─────────────────────────────────────────────┤
│  [成绩趋势] [学习行为] [家庭背景] [预警与建议] │
├─────────────────────────────────────────────┤
│  （Tab 内容区域）                             │
└─────────────────────────────────────────────┘
```

关键实现要点：
- 学生选择使用 `st.selectbox()`，显示格式 `STU_M_0001 - 学生姓名`
- 使用 `st.tabs()` 创建 4 个标签页

**Tab 1 - 成绩趋势**：
- 折线图 `px.line()`，x=exam_stage, y=score, color=subject_id
- 添加 `markers=True` 显示数据点
- 无数据时显示 `st.info()`

**Tab 2 - 学习行为**：
- 3 列布局展示：出勤率、学习时长、睡眠时长、动机水平、辅导次数、网络接入
- 使用 `st.metric()` 展示每个指标

**Tab 3 - 家庭背景**：
- 使用 `st.dataframe()` 展示家庭背景数据表

**Tab 4 - 预警与建议**：
- 上半部分：预警记录表 `st.dataframe()`
- 下半部分：学习建议列表，每条显示生成时间和内容
- "生成学习建议"按钮，调用后端 API

**步骤 2：验证页面**

选择一个学生（如 STU_M_0001），确认：
- 成绩趋势折线图正确显示 G1→G2→G3
- 学习行为指标正确
- 家庭背景数据表显示
- 预警和建议显示正常
- "生成学习建议"按钮能触发 API 调用

#### 验证标准

- 学生详情页面完整实现
- 4 个 Tab 都能正常切换和显示
- 成绩趋势折线图正确
- 生成建议按钮功能正常

---

### 8.4 实现 AI 查询页面

#### AI 执行步骤

**步骤 1：实现 `frontend/pages/nl2sql.py`**

页面布局：

```
┌─────────────────────────────────────────────┐
│  🤖 AI 自然语言查询                          │
│  示例问题：...                               │
│  [请输入您的问题：          ] [查询]          │
├─────────────────────────────────────────────┤
│  生成的 SQL：                                │
│  SELECT ... FROM ...                        │
├─────────────────────────────────────────────┤
│  查询结果：                                  │
│  ┌────┬────┬────┐                           │
│  │    │    │    │                           │
│  └────┴────┴────┘                           │
│  共返回 X 条记录，耗时 Xms                    │
├─────────────────────────────────────────────┤
│  查询历史                                    │
│  ┌────┬────┬────┬────┬────┐                 │
│  │问题│SQL │耗时│正确│时间 │                 │
│  └────┴────┴────┴────┴────┘                 │
└─────────────────────────────────────────────┘
```

关键实现要点：
- 输入框使用 `st.text_input()`
- 查询按钮使用 `st.button()`
- 查询中显示 `st.spinner("AI正在思考...")`
- SQL 使用 `st.code(language="sql")` 高亮显示
- 结果使用 `st.dataframe()` 展示
- 错误使用 `st.error()` 显示
- 查询历史从 `nl2sql_log` 表读取，显示最近 20 条

**步骤 2：验证页面**

输入"查询所有学生的平均成绩"，确认：
- 生成的 SQL 正确显示
- 查询结果正确展示
- 查询历史更新

#### 验证标准

- AI 查询页面完整实现
- 输入自然语言能返回 SQL 和结果
- 查询历史正常显示

---

### 8.5 实现风险预警页面

#### AI 执行步骤

**步骤 1：实现 `frontend/pages/alert.py`**

页面布局：

```
┌────────────┬────────────────────────────────┐
│ 🔄 重新生成 │  ⚠️ 风险预警管理               │
│  预警按钮   │                                │
│             │  [筛选风险等级 ▼]               │
│  风险分布   │  预警列表表格                   │
│  （饼图）   │  ┌────┬────┬────┬────┐         │
│             │  │ID  │学生│等级│状态│         │
│             │  └────┴────┴────┴────┘         │
│             │                                │
│             │  干预操作：                      │
│             │  [预警ID] [状态▼] [措施] [更新]  │
└────────────┴────────────────────────────────┘
```

关键实现要点：
- 左右布局使用 `st.columns([1, 3])`
- 左侧：重新生成按钮 + 风险分布饼图
- 右侧：筛选下拉框 + 预警列表 + 干预操作
- 重新生成调用 `POST /api/alerts/generate`
- 干预操作调用 `PUT /api/alerts/<id>/intervene`
- 操作成功后使用 `st.rerun()` 刷新页面

**步骤 2：验证页面**

确认：
- 点击"重新生成预警"能更新预警列表
- 风险分布饼图正确显示
- 筛选功能正常
- 干预操作能更新状态

#### 验证标准

- 风险预警页面完整实现
- 重新生成、筛选、干预功能正常
- 饼图和表格数据一致

---

### 8.6 AI 辅助可视化设计记录

#### AI 执行步骤

**步骤 1：记录 AI 辅助可视化设计过程**

在 `docs/ai_assisted_development.md` 中添加可视化部分：

1. 将数据特点描述给 AI，让它推荐可视化方案
2. 记录 AI 推荐的图表类型和布局
3. 对比 AI 建议和最终实现，记录调整
4. 截图保存 AI 对话记录

#### 验证标准

- AI 辅助可视化设计过程已记录
- 有对话截图

---

## 阶段九：集成测试与文档

**前置条件**：阶段六、七、八基本完成
**目标**：全系统集成测试，编写项目文档

---

### 9.1 集成测试

#### AI 执行步骤

**步骤 1：数据库完整性测试**

在 DataGrip 或命令行中执行：

```sql
SELECT 'teacher' AS t, COUNT(*) AS c FROM teacher
UNION ALL SELECT 'subject', COUNT(*) FROM subject
UNION ALL SELECT 'class', COUNT(*) FROM class
UNION ALL SELECT 'student', COUNT(*) FROM student
UNION ALL SELECT 'exam_score', COUNT(*) FROM exam_score
UNION ALL SELECT 'learning_behavior', COUNT(*) FROM learning_behavior
UNION ALL SELECT 'family_background', COUNT(*) FROM family_background
UNION ALL SELECT 'risk_alert', COUNT(*) FROM risk_alert
UNION ALL SELECT 'learning_suggestion', COUNT(*) FROM learning_suggestion
UNION ALL SELECT 'student_subject', COUNT(*) FROM student_subject
UNION ALL SELECT 'nl2sql_log', COUNT(*) FROM nl2sql_log;
```

预期：所有表都有数据（learning_suggestion 和 nl2sql_log 在使用后才有数据）。

**步骤 2：外键完整性测试**

```sql
SELECT 'exam_score orphan' AS check_name, COUNT(*) AS cnt
FROM exam_score e LEFT JOIN student s ON e.student_id = s.student_id
WHERE s.student_id IS NULL
UNION ALL
SELECT 'learning_behavior orphan', COUNT(*)
FROM learning_behavior lb LEFT JOIN student s ON lb.student_id = s.student_id
WHERE s.student_id IS NULL;
```

预期：cnt 应为 0。

**步骤 3：API 接口全面测试**

逐个测试所有后端 API：

| API | 测试命令 | 预期结果 |
|-----|---------|---------|
| GET /api/students/ | `curl http://localhost:5000/api/students/` | 返回学生列表 |
| GET /api/students/STU_M_0001 | `curl http://localhost:5000/api/students/STU_M_0001` | 返回单个学生 |
| GET /api/students/search?keyword=张 | `curl "http://localhost:5000/api/students/search?keyword=张"` | 返回搜索结果 |
| GET /api/scores/overview | `curl http://localhost:5000/api/scores/overview` | 返回概览数据 |
| GET /api/scores/distribution | `curl http://localhost:5000/api/scores/distribution` | 返回分布数据 |
| GET /api/scores/trend/STU_M_0001 | `curl http://localhost:5000/api/scores/trend/STU_M_0001` | 返回成绩趋势 |
| GET /api/scores/class-stats | `curl http://localhost:5000/api/scores/class-stats` | 返回班级统计 |
| POST /api/nl2sql/query | `curl -X POST -H "Content-Type: application/json" -d "{\"question\":\"查询所有学生的平均成绩\"}" http://localhost:5000/api/nl2sql/query` | 返回 SQL 和结果 |
| POST /api/alerts/generate | `curl -X POST http://localhost:5000/api/alerts/generate` | 生成预警 |
| GET /api/alerts/ | `curl http://localhost:5000/api/alerts/` | 返回预警列表 |
| GET /api/alerts/stats | `curl http://localhost:5000/api/alerts/stats` | 返回预警统计 |
| POST /api/suggestions/generate/STU_M_0001 | `curl -X POST http://localhost:5000/api/suggestions/generate/STU_M_0001` | 生成建议 |
| GET /api/suggestions/STU_M_0001 | `curl http://localhost:5000/api/suggestions/STU_M_0001` | 返回建议列表 |

**步骤 4：NL2SQL 准确率测试**

运行 20 个测试查询，统计准确率，目标 ≥ 85%。

**步骤 5：风险预警准确率测试**

```sql
SELECT ra.student_id, ra.risk_level,
       es.score AS g3_score,
       CASE WHEN es.score < 10 THEN 'high'
            WHEN es.score < 14 THEN 'medium'
            ELSE 'low' END AS actual_risk
FROM risk_alert ra
JOIN exam_score es ON ra.student_id = es.student_id AND es.exam_stage = 'G3'
WHERE ra.risk_level != CASE WHEN es.score < 10 THEN 'high'
                            WHEN es.score < 14 THEN 'medium'
                            ELSE 'low' END;
```

**步骤 6：前端功能测试**

| 页面 | 测试项 | 通过标准 |
|------|--------|---------|
| 学情概览 | 指标卡片显示 | 数字正确 |
| 学情概览 | 图表渲染 | 无报错，数据正确 |
| 学生详情 | 学生选择 | 下拉框正常 |
| 学生详情 | 成绩趋势图 | 折线图正确显示 G1→G2→G3 |
| 学生详情 | 生成建议 | 点击按钮能生成建议 |
| AI 查询 | 输入查询 | 返回 SQL 和结果 |
| AI 查询 | 查询历史 | 历史记录正常显示 |
| 风险预警 | 生成预警 | 预警列表更新 |
| 风险预警 | 干预更新 | 状态更新成功 |

**步骤 7：修复发现的问题**

对测试中发现的所有问题进行修复，然后重新测试。

#### 验证标准

- 所有数据库测试通过
- 所有 API 接口返回正确结果
- NL2SQL 准确率 ≥ 85%
- 前端所有页面功能正常
- 测试报告已记录

---

### 9.2 编写项目文档

#### AI 执行步骤

**步骤 1：创建 `docs/` 目录**

**步骤 2：编写各模块文档**

| 文档 | 内容 | 文件名 |
|------|------|--------|
| 需求规格说明书 | 功能需求、数据需求、用户需求、业务规则 | `docs/requirements.md` |
| 数据库设计文档 | ER 图 + DDL + 数据字典 + 规范化说明 | `docs/database_design.md` |
| 数据清洗文档 | 清洗过程、质量校验、AI 辅助记录 | `docs/data_cleaning.md` |
| AI 功能实现文档 | 3 个融入点的方案、代码说明、测试结果 | `docs/ai_features.md` |
| 前端设计文档 | 页面设计、可视化方案、AI 辅助记录 | `docs/frontend_design.md` |
| AI 辅助开发总记录 | 所有 AI 辅助过程的汇总 | `docs/ai_assisted_development.md` |

**步骤 3：确保文档内容完整**

每份文档应包含：
- 概述/背景
- 详细内容
- 截图/示例
- 结论/总结

#### 验证标准

- 所有文档已创建
- 文档内容完整、格式规范

---

### 9.3 准备演示 PPT

#### AI 执行步骤

**步骤 1：确定 PPT 结构**

```
1. 项目概述（1-2 页）：项目背景、目标、团队分工
2. 数据集介绍（1 页）：选用的数据集、样本量、核心字段
3. 数据库设计（2-3 页）：ER 图、关系模式、DDL 要点、规范化说明
4. 数据导入（1 页）：清洗过程、数据量、质量校验
5. AI 功能演示（3-4 页）：
   - NL2SQL：演示 3-5 个查询，展示准确率
   - 风险预警：展示预警结果和准确率
   - 学习建议：展示生成的建议
6. 前端展示（2-3 页）：4 个页面截图
7. AI 辅助过程（1-2 页）：展示 AI 辅助的截图和记录
8. 总结与展望（1 页）：收获、不足、改进方向
```

**步骤 2：准备演示数据**

- 提前生成预警和建议
- 准备 3-5 个 NL2SQL 演示问题（选效果好的）
- 确保系统能在演示时正常运行

**步骤 3：截图准备**

- 4 个前端页面的完整截图
- AI 功能的运行截图
- 数据库查询结果截图

#### 验证标准

- PPT 结构完整
- 演示数据准备就绪
- 系统能正常运行

---

## 附录：开发顺序建议

```
阶段六（后端）                    阶段七（AI功能）              阶段八（前端）
─────────────────                ────────────────              ────────────────
6.1 搭建项目结构                  7.1 申请 API Key             8.1 搭建 Streamlit
    │                                │                              │
6.2 编写 CRUD API                 7.2 实现 NL2SQL              8.2 学情概览页
    │                                │                              │
6.3 编写分析 API                  7.3 实现风险预警             8.3 学生详情页
    │                                │                              │
6.4 后端验证 ──────────────────→  7.4 实现学习建议 ──────────→ 8.4 AI查询页
                                     │                              │
                                  7.5 AI过程记录                8.5 风险预警页
                                                                  │
                                                               8.6 AI可视化记录
                                     │                              │
                                     └──────────┬───────────────────┘
                                                │
                                          阶段九（集成测试与文档）
                                          9.1 集成测试
                                          9.2 编写文档
                                          9.3 准备PPT
```

**关键依赖关系**：
1. 阶段六 6.1 必须先完成，6.2/6.3 可并行
2. 阶段七 7.2/7.3/7.4 可并行开发，但最终需要通过后端 API 暴露
3. 阶段八 8.1 必须先完成，8.2-8.5 可并行
4. 前端对接 API 需要等后端完成
5. 阶段九需要等所有功能基本完成

---

## 附录：常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| `ModuleNotFoundError: No module named 'config'` | Python 路径问题 | 确保在 `backend/` 目录下运行，或添加 `sys.path` |
| `mysql.connector.errors.DatabaseError` | 数据库连接失败 | 检查 `.env` 中的密码，确认 MySQL 服务已启动 |
| `openai.APIError` | DeepSeek API 调用失败 | 检查 API Key 是否正确，余额是否充足 |
| `CORS error` | 跨域问题 | 确认 `flask-cors` 已安装，`CORS(app)` 已配置 |
| Streamlit 页面空白 | import 错误 | 检查 `utils/db.py` 的路径配置 |
| NL2SQL 准确率低 | Prompt 不够详细 | 添加 few-shot 示例，补充字段说明 |
| 预警数据为空 | 未执行生成 | 先调用 `POST /api/alerts/generate` |
| 学习建议内容泛泛 | Prompt 不够具体 | 在 Prompt 中加入更多学生数据细节 |
