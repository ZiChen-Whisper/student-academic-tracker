# AI 开发步骤详细指南（PLAN.md）

**项目名称**：中小学学生学业发展动态跟踪与预警系统
**编写日期**：2026年6月2日
**适用范围**：阶段六 ~ 阶段九（阶段一~五已完成）
**目的**：指导 AI 助手逐步完成项目的后端、AI功能、前端和集成测试开发

> **重要原则**：本文档仅提供任务目标和实现要点，不提供具体代码。AI 应根据描述自行实现，确保代码质量和规范一致性。

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
  - [8.1 安装 Node.js 并搭建 React + Vite 项目结构](#81-安装-nodejs-并搭建-react--vite-项目结构)
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

在 `backend/` 目录下创建数据库连接工具文件，提供以下核心函数：
- `get_connection()`：获取 MySQL 连接
- `query_one(sql, params)`：查询单条记录，返回字典
- `query_all(sql, params)`：查询多条记录，返回字典列表
- `execute(sql, params)`：执行写操作，返回影响行数

实现要点：
- 使用 `mysql.connector` 连接数据库
- 从 `config.py` 导入 `DB_CONFIG`
- 每次查询后关闭 cursor 和 connection
- 使用 `dictionary=True` 让结果以字典形式返回

**步骤 3：创建路由目录和服务目录**

创建以下目录结构：

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

运行 Python 命令确认 `db.py` 能正常连接数据库，查询 student 表的记录数。

预期输出：`{'cnt': 7653}`（或类似数字）

#### 验证标准

- `backend/db.py` 创建成功
- `backend/routes/` 和 `backend/services/` 目录及 `__init__.py` 创建成功
- 数据库连接测试通过，能查询到 student 表的记录数

---

### 6.2 编写基础 CRUD API

#### AI 执行步骤

**步骤 1：创建 `backend/app.py`（主入口文件）**

实现要点：
- 创建 Flask 应用实例
- 启用 CORS 跨域支持
- 注册 5 个 Blueprint：student、score、alert、suggestion、nl2sql
- URL 前缀分别为 `/api/students`、`/api/scores`、`/api/alerts`、`/api/suggestions`、`/api/nl2sql`
- 运行在 5000 端口，开启 debug 模式

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
- 注册 Blueprint `alert_bp`
- 实现 `GET /` 路由：查询 risk_alert 表，支持 `risk_level` 筛选，按 alert_time 降序

**步骤 5：创建 `backend/routes/suggestion.py`（骨架）**

先创建基础骨架，后续 7.4 步骤补充完整逻辑：
- 注册 Blueprint `suggestion_bp`
- 实现 `GET /<student_id>` 路由：查询 learning_suggestion 表，按 generate_time 降序

**步骤 6：创建 `backend/routes/nl2sql.py`（骨架）**

先创建基础骨架，后续 7.2 步骤补充完整逻辑：
- 注册 Blueprint `nl2sql_bp`
- 实现 `POST /query` 路由：返回占位消息

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
- 参数 `keyword`：搜索关键词
- 使用 `LIKE` 模糊匹配
- 限制返回 20 条
- 返回格式：`{ data, total }`

#### 验证标准

- `GET /api/scores/overview` 返回包含 total_students、average_score、high_risk_count 的 JSON
- `GET /api/scores/distribution` 返回成绩分布数据
- `GET /api/students/search?keyword=张` 返回匹配的学生列表

---

### 6.4 后端启动与接口验证

#### AI 执行步骤

**步骤 1：启动后端服务**

在 `backend/` 目录下运行 `python app.py`，确认输出 `* Running on http://127.0.0.1:5000`

**步骤 2：逐个验证所有 API 接口**

使用 curl 或浏览器测试以下接口：
- `GET /api/students/`
- `GET /api/students/STU_M_0001`
- `GET /api/students/search?keyword=张`
- `GET /api/scores/trend/STU_M_0001`
- `GET /api/scores/class-stats`
- `GET /api/scores/overview`
- `GET /api/scores/distribution`
- `GET /api/alerts/`
- `GET /api/suggestions/STU_M_0001`

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

使用 `config.py` 中的 `LLM_CONFIG` 配置，调用 DeepSeek API 发送一条测试消息，确认能正常返回中文回复。

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
- 从 request 获取 `question` 参数
- 调用 `nl2sql_service.nl2sql()` 处理查询
- 返回结果 JSON，question 为空时返回 400

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

使用 curl 测试所有预警接口，确认数据正确。

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

使用 curl 测试所有建议接口，确认数据正确。

#### 验证标准

- `suggestion_service.py` 创建完成
- `/api/suggestions/generate/STU_M_0001` 返回包含 3 条建议的 JSON
- `learning_suggestion` 表中有建议数据
- 建议内容与学生的实际数据相关（不是泛泛而谈）
- 反馈接口能正常更新

---

### 7.5 AI 辅助开发过程记录

#### AI 执行步骤

在 `docs/ai_assisted_development.md` 中记录 AI 功能开发过程：
1. 记录 NL2SQL 的 Prompt 设计和优化过程
2. 记录风险预警算法的设计思路
3. 记录学习建议 Prompt 的调优过程
4. 截图保存 AI 对话记录

#### 验证标准

- AI 辅助开发过程已记录
- 有对话截图

---

## 阶段八：前端与可视化

**前置条件**：阶段六后端 API 基本可用（可以先搭骨架，边开发边对接）
**目标**：搭建 React + Vite 前端，采用 iOS 26 液态玻璃（Liquid Glass）设计风格，实现 4 个核心页面

> **设计规范文档**：所有前端样式**必须严格遵循** [iOS 26 液态玻璃设计系统规范](docs/08%20前端实现/iOS26-Liquid-Glass-设计系统规范.md)，包括色彩、组件、间距、动效等。样式预览文件见 `frontend/style-preview.html`。
>
> **核心设计特征**（与规范文档一致，AI 实现时务必遵守）：
> - **页面背景**：纯白 `#ffffff` + 弥散光晕（主色径向渐变），**不是**紫色/渐变背景
> - **主色**：`#0b6565`（深青色），**不是**紫色或蓝色
> - **玻璃卡片**：`rgba(255,255,255,0.6)` 半透明白底 + `backdrop-filter: blur(20px)`，**不是** `rgba(255,255,255,0.15)` 低透明度
> - **边框**：`0.5px solid rgba(11,101,101,0.1)` 极细边框，**不是** `1px solid rgba(255,255,255,0.25)`
> - **文字颜色**：正文 `#1a2b2b` 深色，**不是**白色文字
> - **顶部高光线**：卡片 `::before` 伪元素，`0.5px` 高，`linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)`
> - **图表配色**：主色 `#0b6565`，辅色 `#c9933a`，语义色用设计规范定义的 danger/warning/success
>
> **为什么不用 Streamlit？** Streamlit 虽然快速搭建数据看板，但无法实现 iOS 26 液态玻璃设计风格——它缺乏细粒度 CSS 控制（backdrop-filter、SVG 位移滤镜、内阴影高光等），也无法自定义组件样式。React + Vite + Tailwind CSS 是当前最主流的前端架构，能完美实现 Liquid Glass 效果，且与 Flask REST API 天然兼容。

---

### 8.1 安装 Node.js 并搭建 React + Vite 项目结构

#### AI 执行步骤

**步骤 1：安装 Node.js**

确保已安装 Node.js 18+。如未安装，访问 https://nodejs.org/ 下载 LTS 版本安装。

**步骤 2：使用 Vite 创建 React 项目**

在项目根目录下使用 `npm create vite@latest frontend -- --template react` 创建项目，然后进入 `frontend` 目录执行 `npm install`。

**步骤 3：安装项目依赖**

| 包 | 用途 |
|---|------|
| react-router-dom | 页面路由导航 |
| recharts | React 图表库（替代 Plotly） |
| axios | HTTP 请求（调用后端 API） |
| lucide-react | 图标库（Lucide 风格，符合设计规范 §9） |
| tailwindcss | CSS 工具类框架（实现 Liquid Glass 效果的核心） |
| @tailwindcss/vite | Tailwind 的 Vite 插件 |

**步骤 4：配置 Tailwind CSS 和 Vite**

编辑 `frontend/vite.config.js`：
- 引入 `@vitejs/plugin-react` 和 `@tailwindcss/vite` 插件
- 配置开发服务器代理：`/api` 请求转发到 `http://localhost:5000`

**步骤 5：编写 `frontend/src/index.css`（全局样式 + Liquid Glass 设计系统）**

> **关键**：必须严格按照 [iOS 26 液态玻璃设计系统规范](docs/08%20前端实现/iOS26-Liquid-Glass-设计系统规范.md) 实现，以下是必须包含的内容清单：

1. **CSS 变量**（规范 §11）：在 `:root` 中定义所有设计变量（--primary, --primary-light, --danger, --warning, --success 等）

2. **弥散光晕背景**（规范 §3）：
   - `body` 背景为纯白 `#ffffff`
   - `body::before` 右上光晕：`radial-gradient(circle, rgba(11,101,101,0.08) 0%, rgba(11,101,101,0.03) 40%, transparent 70%)`，600x600px
   - `body::after` 左下光晕：`radial-gradient(circle, rgba(11,101,101,0.06) 0%, rgba(11,101,101,0.02) 40%, transparent 70%)`，500x500px

3. **导航栏 `.liquid-nav`**（规范 §5.1）：sticky 定位，`rgba(255,255,255,0.72)` 背景，`backdrop-filter: blur(24px) saturate(180%)`，`0.5px` 底边框，高度 52px

4. **液态玻璃卡片 `.liquid-card`**（规范 §5.2）：`rgba(255,255,255,0.6)` 背景，`backdrop-filter: blur(20px) saturate(160%)`，`0.5px` 边框，圆角 1rem，含 `::before` 顶部高光线

5. **指标卡片 `.metric-card`**（规范 §5.3）：`rgba(255,255,255,0.65)` 背景，`backdrop-filter: blur(16px) saturate(160%)`，圆角 0.875rem，含图标容器 `.metric-icon`

6. **按钮 `.liquid-btn`** 及变体（规范 §5.4）：默认/主要/危险/小号/胶囊

7. **输入框 `.liquid-input`**（规范 §5.5）：`rgba(11,101,101,0.03)` 背景，`0.5px` 边框，focus 态含外光环

8. **下拉框 `.liquid-select`**（规范 §5.6）：与输入框同风格，含内联 SVG 箭头

9. **Tab 切换 `.liquid-tabs` / `.liquid-tab`**（规范 §5.7）：容器含浅背景，active 态白底浮起 + 阴影

10. **表格 `.liquid-table`**（规范 §5.8）：表头浅背景，`0.5px` 分割线，行 hover 效果

11. **代码块 `.liquid-code`**（规范 §5.9）：浅背景，主色深色文字

12. **风险等级标签 `.risk-badge`**（规范 §5.10）：高/中/低三色，圆角 9999px

13. **提示信息 `.liquid-alert`**（规范 §5.11）：信息/成功/警告/错误四类型

14. **进度条 `.liquid-progress`**（规范 §5.12）

15. **头像 `.liquid-avatar`**（规范 §5.13）

16. **分割线 `.liquid-divider`**（规范 §5.14）

17. **排版**（规范 §4）：字体栈、字号、字重、行高

18. **动效**（规范 §7）：卡片 hover translateY(-1px)、按钮 hover translateY(-0.5px)、按钮 active scale(0.98) 等

**步骤 6：创建前端目录结构**

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

**步骤 7：创建 `frontend/src/api/index.js`（API 调用封装）**

使用 axios 封装所有后端 API 调用，baseURL 为 `/api`，超时 30 秒。需封装以下接口：

| 函数名 | HTTP 方法 | 路径 |
|--------|----------|------|
| getStudents | GET | /students/ |
| getStudent | GET | /students/{id} |
| searchStudents | GET | /students/search |
| getScoreTrend | GET | /scores/trend/{id} |
| getOverview | GET | /scores/overview |
| getScoreDistribution | GET | /scores/distribution |
| getClassStats | GET | /scores/class-stats |
| nl2sqlQuery | POST | /nl2sql/query |
| getAlerts | GET | /alerts/ |
| generateAlerts | POST | /alerts/generate |
| updateIntervention | PUT | /alerts/{id}/intervene |
| getAlertStats | GET | /alerts/stats |
| getSuggestions | GET | /suggestions/{id} |
| generateSuggestion | POST | /suggestions/generate/{id} |
| updateSuggestionFeedback | PUT | /suggestions/{id}/feedback |

**步骤 8：创建 `frontend/src/App.jsx`（根组件 + 路由）**

实现要点：
- 使用 `BrowserRouter` + `Routes` + `Route` 配置 4 个页面路由
- 导航栏使用 `.liquid-nav` 样式（规范 §5.1），sticky 定位
- 导航项使用 `NavLink`，active 态应用 `.liquid-nav-item.active` 样式
- 内容区最大宽度 1200px（规范 §8），左右内边距 1.5rem
- 导航项：学情概览(`/`)、学生详情(`/student`)、AI 查询(`/nl2sql`)、风险预警(`/alert`)

**步骤 9：创建 `frontend/src/main.jsx`（入口文件）**

标准 React 入口文件，引入 `index.css` 和 `App` 组件。

**步骤 10：启动前端验证**

运行 `npm run dev`，浏览器打开 `http://localhost:5173`，确认：
- 页面背景为白色 + 弥散光晕（不是紫色渐变）
- 导航栏为半透明白底 + 模糊效果
- 文字为深色（不是白色）

#### 验证标准

- Node.js 和 npm 安装成功
- React + Vite 项目创建成功
- Tailwind CSS 配置正确
- `index.css` 严格遵循 iOS 26 Liquid Glass 设计规范（白底、主色 #0b6565、半透明玻璃效果）
- `npm run dev` 能正常启动前端
- 导航栏可点击切换，页面路由正常

---

### 8.2 实现学情概览页面

#### AI 执行步骤

**步骤 1：创建 `frontend/src/components/MetricCard.jsx`（指标卡片组件）**

实现要点：
- 使用 `.metric-card` 样式（规范 §5.3）
- 图标容器使用 `.metric-icon`：32x32px，圆角 8px，背景 `rgba(11,101,101,0.08)`
- 图标使用 lucide-react 的 SVG 图标（16x16px），不使用 emoji
- 标题为辅助文字色 `rgba(11,101,101,0.45)`，字号 0.6875rem
- 数值为主色深 `#095050`，字号 1.375rem，字重 700

**步骤 2：实现 `frontend/src/pages/Overview.jsx`**

页面布局：

```
┌─────────────────────────────────────────────────┐
│  学情概览                                        │
├──────────┬──────────┬──────────┬──────────┤
│ 学生总数  │ 平均成绩  │ 高风险人数 │ 及格率    │
├──────────┴──────────┴──────────┴──────────┤
│  各科目平均成绩（柱状图）  │  风险等级分布（饼图）  │
├─────────────────────────────────────────────────┤
│  成绩分布（直方图）                                │
└─────────────────────────────────────────────────┘
```

关键实现要点：
- 页面标题使用规范 §4 的页面标题样式（1.375rem, 700, #1a2b2b）
- 顶部 4 个指标卡片使用 `MetricCard` 组件，间距 0.875rem（规范 §8）
  - 学生总数：Users 图标
  - 平均成绩：TrendingUp 图标
  - 高风险人数：AlertTriangle 图标，danger 色
  - 及格率：CheckCircle 图标，success 色
- 图表容器使用 `.liquid-card`，内边距 1.25rem
- 左右两栏使用 CSS Grid，间距 1.25rem
- 图表配色严格使用规范 §6：
  - 柱状图填充：`linear-gradient(180deg, var(--primary) 0%, rgba(11,101,101,0.3) 100%)`
  - 饼图：low=`var(--success)` #1a8a5a, medium=`var(--warning)` #d4880f, high=`var(--danger)` #c0392b
  - 网格线：`rgba(11,101,101,0.05)`，0.5px
  - 坐标轴文字：`rgba(11,101,101,0.3~0.4)`
  - Tooltip：`rgba(0,0,0,0.7)` 背景，圆角 0.5rem，白色文字
- 饼图中心镂空：70px 白色圆，`rgba(255,255,255,0.85)` + `backdrop-filter: blur(4px)`
- 数据通过 `api/index.js` 调用后端 API 获取

**步骤 3：验证页面**

确认：
- 4 个指标卡片显示正确数字，使用 SVG 图标（非 emoji）
- 3 个图表在液态玻璃卡片中正常渲染
- 图表配色为主色 #0b6565（不是紫色/蓝色）
- 悬浮卡片时有微妙的提升动画（translateY(-1px)）
- 无报错

#### 验证标准

- 学情概览页面完整实现
- 所有指标和图表数据正确
- 液态玻璃视觉效果正常（白底、半透明、模糊、顶部高光线）
- 图表配色符合设计规范 §6
- 页面布局美观，响应式

---

### 8.3 实现学生详情页面

#### AI 执行步骤

**步骤 1：实现 `frontend/src/pages/Student.jsx`**

页面布局：

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
- 搜索栏：`liquid-input` + `liquid-btn`，输入框占位符色 `rgba(11,101,101,0.35)`
- 搜索结果列表：使用 `.liquid-card` 包裹，每项可点击，hover 时 `rgba(11,101,101,0.06)` 背景
- 学生信息卡片：使用 `.liquid-card`，显示姓名（字重 600）、学号、性别（次要文字色）
- Tab 切换：使用 `.liquid-tabs` 容器 + `.liquid-tab` 项（规范 §5.7）
  - 默认态：`rgba(11,101,101,0.5)` 文字
  - active 态：白底浮起 + 阴影，主色文字
- 成绩趋势 Tab：
  - 使用 Recharts `LineChart`，x=exam_stage, y=score
  - 主折线色 `var(--primary)` #0b6565，次折线色 `var(--accent)` #c9933a（虚线）
  - 网格线和坐标轴颜色遵循规范 §6
- 学习行为 Tab：
  - 使用 `MetricCard` 网格展示出勤率、学习时长、睡眠时长、动机水平、辅导次数、网络接入
- 家庭背景 Tab：
  - 使用 `.liquid-table` 表格展示家庭信息键值对
- 预警与建议 Tab：
  - 建议列表：每条建议用 `.liquid-card` 包裹，时间用辅助文字色
  - "生成学习建议"按钮使用 `.liquid-btn-primary`（主色背景白色文字）

**步骤 2：验证页面**

搜索一个学生（如输入"张"），确认：
- 搜索结果在液态玻璃卡片中显示
- 点击学生后加载详情
- 成绩趋势折线图正确显示 G1→G2→G3，颜色为主色 #0b6565
- Tab 切换有液态玻璃高亮效果（白底浮起）
- "生成学习建议"按钮能触发 API 调用

#### 验证标准

- 学生详情页面完整实现
- 4 个 Tab 都能正常切换和显示
- 成绩趋势折线图正确，配色符合设计规范
- 液态玻璃 Tab 切换效果正常
- 生成建议按钮功能正常

---

### 8.4 实现 AI 查询页面

#### AI 执行步骤

**步骤 1：实现 `frontend/src/pages/NL2SQL.jsx`**

页面布局：

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
- 输入框使用 `.liquid-input`，查询按钮使用 `.liquid-btn-primary`
- 示例问题使用 `.liquid-btn-sm`（小号按钮），可点击直接查询
- 查询中显示加载状态
- SQL 使用 `.liquid-code` 代码块样式（规范 §5.9）：
  - 背景 `rgba(11,101,101,0.04)`，文字色 `var(--primary-dark)` #095050
  - 语法高亮：keyword=#7c3aed, string=var(--success), number=var(--accent), function=#2563eb
- 结果使用 `.liquid-table` 表格
- 错误使用 `.liquid-alert-error`（规范 §5.11）
- 查询统计文字使用辅助文字色 `rgba(11,101,101,0.45)`

**步骤 2：验证页面**

输入"查询所有学生的平均成绩"，确认：
- 生成的 SQL 在液态玻璃代码块中正确显示，文字为深色（不是白色）
- 查询结果在液态玻璃表格中正确展示
- 示例问题标签可点击直接查询
- 查询中有加载状态

#### 验证标准

- AI 查询页面完整实现
- 输入自然语言能返回 SQL 和结果
- 液态玻璃代码块和表格样式符合设计规范
- 示例问题标签功能正常

---

### 8.5 实现风险预警页面

#### AI 执行步骤

**步骤 1：实现 `frontend/src/pages/Alert.jsx`**

页面布局：

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
- 左右布局使用 CSS Grid `grid-cols-[1fr_3fr]`，间距 1.25rem
- 左侧：
  - "重新生成预警"按钮使用 `.liquid-btn-primary`，宽度 100%
  - 风险分布饼图在 `.liquid-card` 中，配色遵循规范 §6：
    - low=`var(--success)` #1a8a5a, medium=`var(--warning)` #d4880f, high=`var(--danger)` #c0392b
    - 中心镂空效果
- 右侧：
  - 筛选下拉框使用 `.liquid-select`（规范 §5.6），含 SVG 箭头图标
  - 预警列表使用 `.liquid-table`，在 `.liquid-card` 中
  - 风险等级使用 `.risk-badge` 标签（规范 §5.10）：
    - `.risk-high`：红色系背景+边框+文字
    - `.risk-medium`：橙色系背景+边框+文字
    - `.risk-low`：绿色系背景+边框+文字
  - 干预操作区域在 `.liquid-card` 中：
    - 预警 ID 输入框：`.liquid-input`
    - 状态下拉框：`.liquid-select`
    - 干预措施输入框：`.liquid-input`
    - 更新按钮：`.liquid-btn`

**步骤 2：验证页面**

确认：
- 点击"重新生成预警"能更新预警列表
- 风险分布饼图配色正确（绿/橙/红）
- 筛选功能正常
- 风险等级标签有对应颜色（使用设计规范的 risk-badge 样式）
- 干预操作能更新状态

#### 验证标准

- 风险预警页面完整实现
- 重新生成、筛选、干预功能正常
- 液态玻璃视觉效果符合设计规范
- 饼图和表格数据一致

---

### 8.6 AI 辅助可视化设计记录

#### AI 执行步骤

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

查询所有 12 张表的记录数，确认数据完整。

**步骤 2：外键完整性测试**

检查 exam_score 和 learning_behavior 表是否存在孤儿记录（student_id 在 student 表中不存在）。

**步骤 3：API 接口全面测试**

逐个测试所有后端 API：

| API | 方法 | 预期结果 |
|-----|------|---------|
| /api/students/ | GET | 返回学生列表 |
| /api/students/STU_M_0001 | GET | 返回单个学生 |
| /api/students/search?keyword=张 | GET | 返回搜索结果 |
| /api/scores/overview | GET | 返回概览数据 |
| /api/scores/distribution | GET | 返回分布数据 |
| /api/scores/trend/STU_M_0001 | GET | 返回成绩趋势 |
| /api/scores/class-stats | GET | 返回班级统计 |
| /api/nl2sql/query | POST | 返回 SQL 和结果 |
| /api/alerts/generate | POST | 生成预警 |
| /api/alerts/ | GET | 返回预警列表 |
| /api/alerts/stats | GET | 返回预警统计 |
| /api/suggestions/generate/STU_M_0001 | POST | 生成建议 |
| /api/suggestions/STU_M_0001 | GET | 返回建议列表 |

**步骤 4：NL2SQL 准确率测试**

运行 20 个测试查询，统计准确率，目标 ≥ 85%。

**步骤 5：风险预警准确率测试**

对比 risk_alert 表的预警等级与实际 G3 成绩，检查一致性。

**步骤 6：前端功能测试**

| 页面 | 测试项 | 通过标准 |
|------|--------|---------|
| 学情概览 | 指标卡片显示 | 数字正确，液态玻璃效果符合设计规范 |
| 学情概览 | 图表渲染 | 无报错，数据正确，配色为主色 #0b6565 |
| 学生详情 | 学生搜索 | 搜索框和结果列表正常 |
| 学生详情 | 成绩趋势图 | 折线图正确显示 G1→G2→G3 |
| 学生详情 | 生成建议 | 点击按钮能生成建议 |
| AI 查询 | 输入查询 | 返回 SQL 和结果，代码块样式正常 |
| AI 查询 | 示例标签 | 点击示例问题可直接查询 |
| 风险预警 | 生成预警 | 预警列表更新，risk-badge 颜色正确 |
| 风险预警 | 干预更新 | 状态更新成功 |

**步骤 7：修复发现的问题**

对测试中发现的所有问题进行修复，然后重新测试。

#### 验证标准

- 所有数据库测试通过
- 所有 API 接口返回正确结果
- NL2SQL 准确率 ≥ 85%
- 前端所有页面功能正常，样式符合 iOS 26 Liquid Glass 设计规范
- 测试报告已记录

---

### 9.2 编写项目文档

#### AI 执行步骤

**步骤 1：编写各模块文档**

| 文档 | 内容 | 文件名 |
|------|------|--------|
| 需求规格说明书 | 功能需求、数据需求、用户需求、业务规则 | `docs/requirements.md` |
| 数据库设计文档 | ER 图 + DDL + 数据字典 + 规范化说明 | `docs/database_design.md` |
| 数据清洗文档 | 清洗过程、质量校验、AI 辅助记录 | `docs/data_cleaning.md` |
| AI 功能实现文档 | 3 个融入点的方案、代码说明、测试结果 | `docs/ai_features.md` |
| 前端设计文档 | 页面设计、可视化方案、AI 辅助记录 | `docs/frontend_design.md` |
| AI 辅助开发总记录 | 所有 AI 辅助过程的汇总 | `docs/ai_assisted_development.md` |

**步骤 2：确保文档内容完整**

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
| 前端样式与设计规范不符 | 未遵循 iOS 26 Liquid Glass 规范 | 对照 `docs/08 前端实现/iOS26-Liquid-Glass-设计系统规范.md` 逐项检查 |
| NL2SQL 准确率低 | Prompt 不够详细 | 添加 few-shot 示例，补充字段说明 |
| 预警数据为空 | 未执行生成 | 先调用 `POST /api/alerts/generate` |
| 学习建议内容泛泛 | Prompt 不够具体 | 在 Prompt 中加入更多学生数据细节 |
