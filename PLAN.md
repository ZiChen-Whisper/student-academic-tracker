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
**目标**：搭建 React + Vite 前端，采用 iOS 26 液态玻璃（Liquid Glass）设计风格，实现 4 个核心页面

> **设计规范文档**：所有前端样式必须遵循 [iOS 26 液态玻璃设计系统规范](docs/08%20前端实现/iOS26-Liquid-Glass-设计系统规范.md)，包括色彩、组件、间距、动效等。样式预览文件见 `frontend/style-preview.html`。

> **为什么不用 Streamlit？** Streamlit 虽然快速搭建数据看板，但无法实现 iOS 26 液态玻璃设计风格——它缺乏细粒度 CSS 控制（backdrop-filter、SVG 位移滤镜、内阴影高光等），也无法自定义组件样式。React + Vite + Tailwind CSS 是当前最主流的前端架构，能完美实现 Liquid Glass 效果，且与 Flask REST API 天然兼容。

---

### 8.1 安装 Node.js 并搭建 React + Vite 项目结构

#### AI 执行步骤

**步骤 1：安装 Node.js**

确保已安装 Node.js 18+：

```bash
node --version
# 应输出 v18.x.x 或更高
```

如未安装，访问 https://nodejs.org/ 下载 LTS 版本安装。

**步骤 2：使用 Vite 创建 React 项目**

```bash
cd d:\大二下资料\数据库原理\大作业\student-academic-tracker
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

**步骤 3：安装项目依赖**

```bash
cd d:\大二下资料\数据库原理\大作业\student-academic-tracker\frontend
npm install react-router-dom recharts axios lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

依赖说明：

| 包 | 用途 |
|---|------|
| react-router-dom | 页面路由导航 |
| recharts | React 图表库（替代 Plotly） |
| axios | HTTP 请求（调用后端 API） |
| lucide-react | 图标库 |
| tailwindcss | CSS 工具类框架（实现 Liquid Glass 效果的核心） |

**步骤 4：配置 Tailwind CSS**

编辑 `frontend/vite.config.js`：

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
```

编辑 `frontend/src/index.css`（完整样式代码需遵循 [设计系统规范](docs/08%20前端实现/iOS26-Liquid-Glass-设计系统规范.md)）：

```css
@import "tailwindcss";

/* ===== iOS 26 Liquid Glass 设计系统 ===== */

/* 全局背景 - 渐变底色，让玻璃效果更明显 */
body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  background-attachment: fixed;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  color: white;
}

/* 液态玻璃卡片 - 核心组件 */
.liquid-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 1.25rem;
  box-shadow:
    0 8px 32px rgba(31, 38, 135, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

.liquid-card:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow:
    0 12px 40px rgba(31, 38, 135, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

/* 液态玻璃按钮 */
.liquid-btn {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.75rem;
  color: white;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 2px rgba(255, 255, 255, 0.5);
}

.liquid-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.6);
}

.liquid-btn:active {
  transform: scale(0.97);
}

/* 液态玻璃导航栏 */
.liquid-nav {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.liquid-nav-item {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.7);
}

.liquid-nav-item:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.liquid-nav-item.active {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4);
}

/* 液态玻璃输入框 */
.liquid-input {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  color: white;
  padding: 0.625rem 1rem;
  outline: none;
  transition: all 0.3s ease;
}

.liquid-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.liquid-input:focus {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

/* 指标卡片 */
.metric-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
}

.metric-card:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
}

/* Tab 组件 */
.liquid-tab {
  padding: 0.5rem 1.25rem;
  border-radius: 0.625rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  background: transparent;
}

.liquid-tab:hover {
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.1);
}

.liquid-tab.active {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4);
}

/* 表格 */
.liquid-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.liquid-table th {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.liquid-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.liquid-table tr:hover td {
  background: rgba(255, 255, 255, 0.05);
}

/* 代码块 */
.liquid-code {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
  color: #e0e0ff;
  overflow-x: auto;
}

/* 风险等级标签 */
.risk-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.risk-high {
  background: rgba(239, 68, 68, 0.3);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

.risk-medium {
  background: rgba(245, 158, 11, 0.3);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fcd34d;
}

.risk-low {
  background: rgba(34, 197, 94, 0.3);
  border: 1px solid rgba(34, 197, 94, 0.5);
  color: #86efac;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
```

**步骤 5：创建前端目录结构**

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── public/
└── src/
    ├── main.jsx          # 入口文件
    ├── App.jsx           # 根组件（路由配置）
    ├── index.css         # 全局样式 + Liquid Glass 设计系统
    ├── api/
    │   └── index.js      # 后端 API 调用封装
    ├── components/
    │   ├── Layout.jsx    # 页面布局（导航栏 + 内容区）
    │   ├── MetricCard.jsx    # 指标卡片组件
    │   └── LiquidCard.jsx    # 液态玻璃卡片组件
    └── pages/
        ├── Overview.jsx  # 学情概览页
        ├── Student.jsx   # 学生详情页
        ├── NL2SQL.jsx    # AI 查询页
        └── Alert.jsx     # 风险预警页
```

**步骤 6：创建 `frontend/src/api/index.js`（API 调用封装）**

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const getStudents = (page = 1, perPage = 20) =>
  api.get('/students/', { params: { page, per_page: perPage } })

export const getStudent = (studentId) =>
  api.get(`/students/${studentId}`)

export const searchStudents = (keyword) =>
  api.get('/students/search', { params: { keyword } })

export const getScoreTrend = (studentId) =>
  api.get(`/scores/trend/${studentId}`)

export const getOverview = () =>
  api.get('/scores/overview')

export const getScoreDistribution = (params = {}) =>
  api.get('/scores/distribution', { params })

export const getClassStats = (classId) =>
  api.get('/scores/class-stats', { params: { class_id: classId } })

export const nl2sqlQuery = (question) =>
  api.post('/nl2sql/query', { question })

export const getAlerts = (riskLevel) =>
  api.get('/alerts/', { params: { risk_level: riskLevel } })

export const generateAlerts = () =>
  api.post('/alerts/generate')

export const updateIntervention = (alertId, data) =>
  api.put(`/alerts/${alertId}/intervene`, data)

export const getAlertStats = () =>
  api.get('/alerts/stats')

export const getSuggestions = (studentId) =>
  api.get(`/suggestions/${studentId}`)

export const generateSuggestion = (studentId) =>
  api.post(`/suggestions/generate/${studentId}`)

export const updateSuggestionFeedback = (suggestionId, feedback) =>
  api.put(`/suggestions/${suggestionId}/feedback`, { feedback })
```

**步骤 7：创建 `frontend/src/App.jsx`（根组件 + 路由）**

```jsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Overview from './pages/Overview'
import Student from './pages/Student'
import NL2SQL from './pages/NL2SQL'
import Alert from './pages/Alert'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        {/* 液态玻璃导航栏 */}
        <nav className="liquid-nav sticky top-0 z-50 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <h1 className="text-lg font-bold tracking-wide">学业跟踪预警系统</h1>
            <div className="flex gap-2 ml-8">
              {[
                { to: '/', label: '学情概览' },
                { to: '/student', label: '学生详情' },
                { to: '/nl2sql', label: 'AI 查询' },
                { to: '/alert', label: '风险预警' },
              ].map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `liquid-nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* 内容区 */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/student" element={<Student />} />
            <Route path="/nl2sql" element={<NL2SQL />} />
            <Route path="/alert" element={<Alert />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
```

**步骤 8：创建 `frontend/src/main.jsx`（入口文件）**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

**步骤 9：启动前端验证**

```bash
cd d:\大二下资料\数据库原理\大作业\student-academic-tracker\frontend
npm run dev
```

浏览器打开 `http://localhost:5173`，应能看到液态玻璃风格的导航栏和页面。

#### 验证标准

- Node.js 和 npm 安装成功
- React + Vite 项目创建成功
- Tailwind CSS 配置正确，液态玻璃样式生效
- `npm run dev` 能正常启动前端
- 导航栏可点击切换，页面路由正常

---

### 8.2 实现学情概览页面

#### AI 执行步骤

**步骤 1：创建 `frontend/src/components/MetricCard.jsx`（指标卡片组件）**

```jsx
export default function MetricCard({ title, value, icon, color = 'white' }) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <div>
          <p className="text-xs uppercase tracking-wider text-white/60">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
        </div>
      </div>
    </div>
  )
}
```

**步骤 2：实现 `frontend/src/pages/Overview.jsx`**

页面布局（液态玻璃风格）：

```
┌─────────────────────────────────────────────────┐
│  学情概览                                        │
├──────────┬──────────┬──────────┬──────────┤
│ 📊 学生   │ 📈 平均   │ ⚠️ 高风险  │ ✅ 及格率  │
│ 总数      │ 成绩      │ 人数      │          │
├──────────┴──────────┴──────────┴──────────┤
│  各科目平均成绩（柱状图）  │  风险等级分布（饼图）  │
├─────────────────────────────────────────────────┤
│  成绩分布（直方图）                                │
└─────────────────────────────────────────────────┘
```

关键实现要点：
- 顶部 4 个指标卡片使用 `MetricCard` 组件，液态玻璃卡片效果
- 左右两栏使用 CSS Grid 或 Flexbox
- 图表使用 Recharts（`BarChart`、`PieChart`、`BarChart` 直方图模式）
- 饼图颜色映射：low=绿色, medium=橙色, high=红色
- 所有图表容器使用 `liquid-card` 样式
- 数据通过 `api/index.js` 调用后端 API 获取

```jsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getOverview, getScoreDistribution, getAlertStats } from '../api'
import MetricCard from '../components/MetricCard'

const RISK_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' }

export default function Overview() {
  const [overview, setOverview] = useState(null)
  const [distribution, setDistribution] = useState([])
  const [riskStats, setRiskStats] = useState([])
  const [subjectAvg, setSubjectAvg] = useState([])

  useEffect(() => {
    // 加载概览数据
    getOverview().then(res => setOverview(res.data))
    // 加载成绩分布
    getScoreDistribution().then(res => setDistribution(res.data))
    // 加载风险统计
    getAlertStats().then(res => setRiskStats(res.data))
    // 加载科目平均（可从 class-stats 获取）
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">学情概览</h2>

      {/* 指标卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="学生总数" value={overview?.total_students ?? '-'} icon="📊" />
        <MetricCard title="平均成绩" value={overview?.average_score ?? '-'} icon="📈" />
        <MetricCard title="高风险人数" value={overview?.high_risk_count ?? '-'} icon="⚠️" color="#fca5a5" />
        <MetricCard title="及格率" value={overview?.pass_rate != null ? `${overview.pass_rate}%` : '-'} icon="✅" />
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="liquid-card p-5">
          <h3 className="text-lg font-semibold mb-4">各科目平均成绩</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectAvg}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="subject_id" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '0.5rem', color: 'white' }} />
              <Bar dataKey="avg_score" fill="rgba(255,255,255,0.4)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="liquid-card p-5">
          <h3 className="text-lg font-semibold mb-4">风险等级分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={riskStats} dataKey="count" nameKey="risk_level" cx="50%" cy="50%" outerRadius={100} label>
                {riskStats.map((entry) => (
                  <Cell key={entry.risk_level} fill={RISK_COLORS[entry.risk_level] || '#888'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '0.5rem', color: 'white' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 成绩分布直方图 */}
      <div className="liquid-card p-5">
        <h3 className="text-lg font-semibold mb-4">成绩分布</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="score_range" stroke="rgba(255,255,255,0.6)" />
            <YAxis stroke="rgba(255,255,255,0.6)" />
            <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '0.5rem', color: 'white' }} />
            <Bar dataKey="count" fill="rgba(255,255,255,0.35)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

**步骤 2：验证页面**

切换到"学情概览"页面，确认：
- 4 个液态玻璃指标卡片显示正确数字
- 3 个图表在液态玻璃卡片中正常渲染
- 悬浮卡片时有微妙的提升动画
- 无报错

#### 验证标准

- 学情概览页面完整实现
- 所有指标和图表数据正确
- 液态玻璃视觉效果正常（半透明、模糊、内高光）
- 页面布局美观，响应式

---

### 8.3 实现学生详情页面

#### AI 执行步骤

**步骤 1：实现 `frontend/src/pages/Student.jsx`**

页面布局（液态玻璃风格）：

```
┌─────────────────────────────────────────────────┐
│  学生详情                                        │
│  [搜索学生...                    ] [搜索]         │
├─────────────────────────────────────────────────┤
│  [成绩趋势] [学习行为] [家庭背景] [预警与建议]    │
├─────────────────────────────────────────────────┤
│  （Tab 内容区域 - 液态玻璃卡片）                  │
└─────────────────────────────────────────────────┘
```

关键实现要点：
- 学生搜索使用 `liquid-input` + 搜索按钮，支持按姓名/学号模糊搜索
- 使用自定义 Tab 组件（`liquid-tab` 样式）
- 成绩趋势使用 Recharts `LineChart`，x=exam_stage, y=score，按科目分色
- 学习行为使用 `MetricCard` 网格展示
- 家庭背景使用 `liquid-table` 表格
- 预警与建议：预警记录表 + 建议列表 + "生成学习建议"按钮

```jsx
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { searchStudents, getStudent, getScoreTrend, getSuggestions, generateSuggestion } from '../api'
import MetricCard from '../components/MetricCard'

export default function Student() {
  const [keyword, setKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [student, setStudent] = useState(null)
  const [scores, setScores] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [activeTab, setActiveTab] = useState('trend')

  // 搜索学生
  const handleSearch = async () => {
    if (!keyword) return
    const res = await searchStudents(keyword)
    setSearchResults(res.data.data || [])
  }

  // 选择学生后加载数据
  useEffect(() => {
    if (!selectedId) return
    getStudent(selectedId).then(res => setStudent(res.data))
    getScoreTrend(selectedId).then(res => setScores(res.data))
    getSuggestions(selectedId).then(res => setSuggestions(res.data))
  }, [selectedId])

  // 生成学习建议
  const handleGenerateSuggestion = async () => {
    await generateSuggestion(selectedId)
    const res = await getSuggestions(selectedId)
    setSuggestions(res.data)
  }

  const tabs = [
    { key: 'trend', label: '成绩趋势' },
    { key: 'behavior', label: '学习行为' },
    { key: 'family', label: '家庭背景' },
    { key: 'alert', label: '预警与建议' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">学生详情</h2>

      {/* 搜索栏 */}
      <div className="flex gap-3">
        <input
          className="liquid-input flex-1"
          placeholder="输入学生姓名或学号搜索..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="liquid-btn" onClick={handleSearch}>搜索</button>
      </div>

      {/* 搜索结果列表 */}
      {searchResults.length > 0 && !selectedId && (
        <div className="liquid-card p-4">
          {searchResults.map(s => (
            <div
              key={s.student_id}
              className="p-3 rounded-lg cursor-pointer hover:bg-white/10 transition"
              onClick={() => setSelectedId(s.student_id)}
            >
              {s.student_id} - {s.student_name}
            </div>
          ))}
        </div>
      )}

      {selectedId && student && (
        <>
          {/* 学生信息卡片 */}
          <div className="liquid-card p-4">
            <div className="flex gap-6">
              <span className="text-lg font-semibold">{student.student_name}</span>
              <span className="text-white/60">{student.student_id}</span>
              <span className="text-white/60">{student.student_gender === 'M' ? '男' : '女'}</span>
            </div>
          </div>

          {/* Tab 切换 */}
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`liquid-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 内容 */}
          <div className="liquid-card p-5">
            {activeTab === 'trend' && (
              scores.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={scores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="exam_stage" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '0.5rem', color: 'white' }} />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-white/60">该学生暂无成绩数据</p>
            )}

            {activeTab === 'behavior' && (
              <div className="grid grid-cols-3 gap-4">
                <MetricCard title="出勤率" value={student.behavior?.attendance_rate ? `${student.behavior.attendance_rate}%` : '暂无'} />
                <MetricCard title="学习时长" value={student.behavior?.study_hours ? `${student.behavior.study_hours}h/周` : '暂无'} />
                <MetricCard title="睡眠时长" value={student.behavior?.sleep_hours ? `${student.behavior.sleep_hours}h/天` : '暂无'} />
                <MetricCard title="动机水平" value={student.behavior?.motivation_level || '暂无'} />
                <MetricCard title="辅导次数" value={student.behavior?.tutoring_sessions ?? '暂无'} />
                <MetricCard title="网络接入" value={student.behavior?.internet_access || '暂无'} />
              </div>
            )}

            {activeTab === 'family' && (
              student.family ? (
                <table className="liquid-table">
                  <tbody>
                    {Object.entries(student.family).map(([key, val]) => (
                      <tr key={key}><td className="font-medium">{key}</td><td>{val ?? '暂无'}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-white/60">该学生暂无家庭背景数据</p>
            )}

            {activeTab === 'alert' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">学习建议</h4>
                  {suggestions.length > 0 ? suggestions.map((s, i) => (
                    <div key={i} className="p-3 mb-2 rounded-lg bg-white/5">
                      <p className="text-xs text-white/50">{s.generate_time}</p>
                      <p className="mt-1">{s.suggestion_content}</p>
                    </div>
                  )) : <p className="text-white/60">暂无学习建议</p>}
                </div>
                <button className="liquid-btn" onClick={handleGenerateSuggestion}>
                  生成学习建议
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
```

**步骤 2：验证页面**

搜索一个学生（如输入"张"），确认：
- 搜索结果在液态玻璃卡片中显示
- 点击学生后加载详情
- 成绩趋势折线图正确显示 G1→G2→G3
- Tab 切换有液态玻璃高亮效果
- "生成学习建议"按钮能触发 API 调用

#### 验证标准

- 学生详情页面完整实现
- 4 个 Tab 都能正常切换和显示
- 成绩趋势折线图正确
- 液态玻璃 Tab 切换效果正常
- 生成建议按钮功能正常

---

### 8.4 实现 AI 查询页面

#### AI 执行步骤

**步骤 1：实现 `frontend/src/pages/NL2SQL.jsx`**

页面布局（液态玻璃风格）：

```
┌─────────────────────────────────────────────────┐
│  AI 自然语言查询                                 │
│  示例问题：[查询平均成绩] [高风险学生] [...]       │
│  [请输入您的问题...              ] [查询]         │
├─────────────────────────────────────────────────┤
│  生成的 SQL：（液态玻璃代码块）                    │
│  SELECT ... FROM ...                             │
├─────────────────────────────────────────────────┤
│  查询结果：（液态玻璃表格）                        │
│  ┌────┬────┬────┐                               │
│  │    │    │    │                               │
│  └────┴────┴────┘                               │
│  共返回 X 条记录，耗时 Xms                        │
├─────────────────────────────────────────────────┤
│  查询历史（液态玻璃表格）                          │
└─────────────────────────────────────────────────┘
```

关键实现要点：
- 输入框使用 `liquid-input`，查询按钮使用 `liquid-btn`
- 示例问题使用可点击的标签（`liquid-btn` 小号）
- 查询中显示加载动画
- SQL 使用 `liquid-code` 代码块样式
- 结果使用 `liquid-table` 表格
- 错误使用红色提示
- 查询历史从后端 API 获取

```jsx
import { useState } from 'react'
import { nl2sqlQuery } from '../api'

const EXAMPLE_QUERIES = [
  '查询所有学生的平均成绩',
  '查询数学成绩前10名的学生',
  '查询出勤率低于80%的学生',
  '统计各科目的平均分',
  '查询高风险预警学生名单',
]

export default function NL2SQL() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleQuery = async (q) => {
    const query = q || question
    if (!query) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await nl2sqlQuery(query)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">AI 自然语言查询</h2>

      {/* 示例问题标签 */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map(q => (
          <button
            key={q}
            className="liquid-btn text-xs py-1 px-3"
            onClick={() => { setQuestion(q); handleQuery(q) }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div className="flex gap-3">
        <input
          className="liquid-input flex-1"
          placeholder="请输入您的问题..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleQuery()}
        />
        <button className="liquid-btn" onClick={() => handleQuery()} disabled={loading}>
          {loading ? '查询中...' : '查询'}
        </button>
      </div>

      {/* 生成的 SQL */}
      {result?.sql && (
        <div>
          <h3 className="text-lg font-semibold mb-2">生成的 SQL</h3>
          <pre className="liquid-code">{result.sql}</pre>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200">
          {error}
        </div>
      )}

      {/* 查询结果 */}
      {result?.result && result.result.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">查询结果</h3>
          <div className="overflow-x-auto">
            <table className="liquid-table">
              <thead>
                <tr>{Object.keys(result.result[0]).map(k => <th key={k}>{k}</th>)}</tr>
              </thead>
              <tbody>
                {result.result.map((row, i) => (
                  <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{v ?? '-'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white/50 mt-2">
            共返回 {result.result.length} 条记录，耗时 {result.execution_time_ms}ms
          </p>
        </div>
      )}

      {result?.result && result.result.length === 0 && (
        <p className="text-white/60">查询结果为空</p>
      )}
    </div>
  )
}
```

**步骤 2：验证页面**

输入"查询所有学生的平均成绩"，确认：
- 生成的 SQL 在液态玻璃代码块中正确显示
- 查询结果在液态玻璃表格中正确展示
- 示例问题标签可点击直接查询
- 查询中有加载状态

#### 验证标准

- AI 查询页面完整实现
- 输入自然语言能返回 SQL 和结果
- 液态玻璃代码块和表格样式正常
- 示例问题标签功能正常

---

### 8.5 实现风险预警页面

#### AI 执行步骤

**步骤 1：实现 `frontend/src/pages/Alert.jsx`**

页面布局（液态玻璃风格）：

```
┌────────────┬────────────────────────────────────┐
│ 重新生成    │  风险预警管理                       │
│ 预警按钮    │                                    │
│            │  [筛选风险等级 ▼]                    │
│ 风险分布   │  预警列表表格（液态玻璃表格）          │
│ （饼图）   │  ┌────┬────┬────┬────┐              │
│            │  │ID  │学生│等级│状态│              │
│            │  └────┴────┴────┴────┘              │
│            │                                    │
│            │  干预操作：                          │
│            │  [预警ID] [状态▼] [措施] [更新]      │
└────────────┴────────────────────────────────────┘
```

关键实现要点：
- 左右布局使用 CSS Grid `grid-cols-[1fr_3fr]`
- 左侧：重新生成按钮 + 风险分布饼图，都在液态玻璃卡片中
- 右侧：筛选下拉框 + 预警列表 + 干预操作
- 风险等级使用 `risk-badge` 标签样式
- 重新生成调用 `POST /api/alerts/generate`
- 干预操作调用 `PUT /api/alerts/<id>/intervene`

```jsx
import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { getAlerts, generateAlerts, getAlertStats, updateIntervention } from '../api'

const RISK_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' }

export default function Alert() {
  const [alerts, setAlerts] = useState([])
  const [riskStats, setRiskStats] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [interveneId, setInterveneId] = useState('')
  const [interveneStatus, setInterveneStatus] = useState('in_progress')
  const [interveneMeasure, setInterveneMeasure] = useState('')

  const loadData = async () => {
    const [alertRes, statsRes] = await Promise.all([
      getAlerts(filter),
      getAlertStats(),
    ])
    setAlerts(alertRes.data)
    setRiskStats(statsRes.data)
  }

  useEffect(() => { loadData() }, [filter])

  const handleGenerate = async () => {
    setLoading(true)
    await generateAlerts()
    await loadData()
    setLoading(false)
  }

  const handleIntervene = async () => {
    if (!interveneId) return
    await updateIntervention(interveneId, {
      status: interveneStatus,
      measure: interveneMeasure,
    })
    await loadData()
    setInterveneId('')
    setInterveneMeasure('')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">风险预警管理</h2>

      <div className="grid grid-cols-[1fr_3fr] gap-6">
        {/* 左侧 */}
        <div className="space-y-4">
          <button className="liquid-btn w-full" onClick={handleGenerate} disabled={loading}>
            {loading ? '生成中...' : '重新生成预警'}
          </button>

          <div className="liquid-card p-4">
            <h3 className="font-semibold mb-3">风险分布</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={riskStats} dataKey="count" nameKey="risk_level" cx="50%" cy="50%" outerRadius={70} label>
                  {riskStats.map(entry => (
                    <Cell key={entry.risk_level} fill={RISK_COLORS[entry.risk_level] || '#888'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '0.5rem', color: 'white' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 右侧 */}
        <div className="space-y-4">
          <select
            className="liquid-input"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="">全部</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">低风险</option>
          </select>

          {alerts.length > 0 ? (
            <div className="liquid-card overflow-hidden">
              <table className="liquid-table">
                <thead>
                  <tr>
                    <th>ID</th><th>学生</th><th>风险等级</th><th>预警时间</th><th>干预状态</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.alert_id}>
                      <td>{a.alert_id}</td>
                      <td>{a.student_id}</td>
                      <td><span className={`risk-badge risk-${a.risk_level}`}>{a.risk_level}</span></td>
                      <td>{a.alert_time}</td>
                      <td>{a.intervention_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-white/60">暂无预警数据，请先点击"重新生成预警"</p>
          )}

          {/* 干预操作 */}
          <div className="liquid-card p-4">
            <h4 className="font-semibold mb-3">干预操作</h4>
            <div className="flex gap-3 items-end">
              <input className="liquid-input w-24" placeholder="预警ID" value={interveneId} onChange={e => setInterveneId(e.target.value)} />
              <select className="liquid-input" value={interveneStatus} onChange={e => setInterveneStatus(e.target.value)}>
                <option value="pending">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
              <input className="liquid-input flex-1" placeholder="干预措施" value={interveneMeasure} onChange={e => setInterveneMeasure(e.target.value)} />
              <button className="liquid-btn" onClick={handleIntervene}>更新</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**步骤 2：验证页面**

确认：
- 点击"重新生成预警"能更新预警列表
- 风险分布饼图在液态玻璃卡片中正确显示
- 筛选功能正常
- 风险等级标签有对应颜色（红/橙/绿）
- 干预操作能更新状态

#### 验证标准

- 风险预警页面完整实现
- 重新生成、筛选、干预功能正常
- 液态玻璃视觉效果正常
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
| 学情概览 | 指标卡片显示 | 数字正确，液态玻璃效果正常 |
| 学情概览 | 图表渲染 | 无报错，数据正确，图表在玻璃卡片中 |
| 学生详情 | 学生搜索 | 搜索框和结果列表正常 |
| 学生详情 | 成绩趋势图 | 折线图正确显示 G1→G2→G3 |
| 学生详情 | 生成建议 | 点击按钮能生成建议 |
| AI 查询 | 输入查询 | 返回 SQL 和结果，代码块样式正常 |
| AI 查询 | 示例标签 | 点击示例问题可直接查询 |
| 风险预警 | 生成预警 | 预警列表更新，风险标签颜色正确 |
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
6.1 搭建项目结构                  7.1 申请 API Key             8.1 搭建 React+Vite
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
| `CORS error` | 跨域问题 | 确认 `flask-cors` 已安装，`CORS(app)` 已配置；前端使用 Vite proxy 已自动处理 |
| `npm ERR!` | Node.js 版本或依赖问题 | 确保 Node.js 18+，删除 `node_modules` 后重新 `npm install` |
| 前端页面空白 | 路由或 import 错误 | 检查浏览器控制台错误，确认 React Router 配置正确 |
| 前端 API 请求 404 | Vite proxy 未配置 | 检查 `vite.config.js` 中的 proxy 配置，确保后端在 5000 端口运行 |
| 液态玻璃效果不显示 | 浏览器不支持 backdrop-filter | 使用 Chrome 76+ / Firefox 103+ / Safari 14+ / Edge 79+ |
| NL2SQL 准确率低 | Prompt 不够详细 | 添加 few-shot 示例，补充字段说明 |
| 预警数据为空 | 未执行生成 | 先调用 `POST /api/alerts/generate` |
| 学习建议内容泛泛 | Prompt 不够具体 | 在 Prompt 中加入更多学生数据细节 |
