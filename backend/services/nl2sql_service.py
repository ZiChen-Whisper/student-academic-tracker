"""
NL2SQL 服务模块：将自然语言问题转换为 SQL 并执行查询
使用 DeepSeek API 实现 NL2SQL 转换
"""

import re
import time
import json
from datetime import datetime
from openai import OpenAI
from config import LLM_CONFIG
from db import query_all, execute
from services.change_history_service import record_change

# ============================================================
# 1. DDL_SCHEMA：12 张表的 CREATE TABLE 语句，供 Prompt 使用
# ============================================================
DDL_SCHEMA = """
CREATE TABLE teacher (
    teacher_id        VARCHAR(20) PRIMARY KEY,
    teacher_name      VARCHAR(50) NOT NULL,
    teacher_gender    ENUM('M','F'),
    teacher_title     VARCHAR(30)
);

CREATE TABLE subject (
    subject_id       VARCHAR(20) PRIMARY KEY,
    subject_name     VARCHAR(50) NOT NULL,
    subject_credit   INT,
    subject_type     VARCHAR(20)
);

CREATE TABLE class (
    class_id          VARCHAR(20) PRIMARY KEY,
    class_name        VARCHAR(50) NOT NULL,
    class_grade       VARCHAR(10),
    class_teacher_id  VARCHAR(20),
    FOREIGN KEY (class_teacher_id) REFERENCES teacher(teacher_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE student (
    student_id       VARCHAR(20) PRIMARY KEY,
    student_name     VARCHAR(50) NOT NULL,
    student_gender   ENUM('M','F'),
    student_age      INT,
    student_class_id VARCHAR(20),
    student_address  VARCHAR(100),
    FOREIGN KEY (student_class_id) REFERENCES class(class_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE exam_score (
    score_id        INT AUTO_INCREMENT PRIMARY KEY,
    student_id      VARCHAR(20) NOT NULL,
    subject_id      VARCHAR(20) NOT NULL,
    score           INT NOT NULL,
    score_date      DATE,
    exam_stage      VARCHAR(10),
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE learning_behavior (
    behavior_id         INT AUTO_INCREMENT PRIMARY KEY,
    student_id          VARCHAR(20) NOT NULL,
    attendance_rate     INT,
    study_hours         INT,
    sleep_hours         INT,
    motivation_level    VARCHAR(10),
    previous_scores     INT,
    tutoring_sessions   INT,
    internet_access     VARCHAR(5),
    extracurricular     VARCHAR(5),
    physical_activity   INT,
    record_date         DATE,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE family_background (
    family_id            INT AUTO_INCREMENT PRIMARY KEY,
    student_id           VARCHAR(20) NOT NULL UNIQUE,
    father_edu           VARCHAR(20),
    mother_edu           VARCHAR(20),
    father_job           VARCHAR(30),
    mother_job           VARCHAR(30),
    family_income        VARCHAR(20),
    family_support       VARCHAR(10),
    parental_involvement VARCHAR(10),
    fam_rel              INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE risk_alert (
    alert_id              INT AUTO_INCREMENT PRIMARY KEY,
    student_id            VARCHAR(20) NOT NULL,
    risk_level            ENUM('low','medium','high') NOT NULL,
    alert_time            DATETIME NOT NULL,
    risk_factors          TEXT,
    intervention_status   ENUM('pending','in_progress','completed') DEFAULT 'pending',
    intervention_measure  TEXT,
    intervention_result   TEXT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE learning_suggestion (
    suggestion_id        INT AUTO_INCREMENT PRIMARY KEY,
    student_id           VARCHAR(20) NOT NULL,
    suggestion_content   TEXT NOT NULL,
    generate_time        DATETIME NOT NULL,
    student_feedback     ENUM('satisfied','neutral','unsatisfied'),
    suggest_relate_score INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE course_schedule (
    schedule_id          INT AUTO_INCREMENT PRIMARY KEY,
    scheduled_period     VARCHAR(50),
    scheduled_classroom  VARCHAR(50),
    subject_id           VARCHAR(20) NOT NULL,
    teacher_id           VARCHAR(20) NOT NULL,
    class_id             VARCHAR(20) NOT NULL,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (class_id) REFERENCES class(class_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE student_subject (
    student_id   VARCHAR(20) NOT NULL,
    subject_id   VARCHAR(20) NOT NULL,
    enroll_time  DATETIME,
    PRIMARY KEY (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE nl2sql_log (
    query_id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id                VARCHAR(20),
    natural_language_input TEXT NOT NULL,
    generated_sql          TEXT NOT NULL,
    execution_time_ms      INT,
    is_correct             BOOLEAN,
    query_time             DATETIME NOT NULL
);
"""

# ============================================================
# 2. SYSTEM_PROMPT：系统提示词
# ============================================================
SYSTEM_PROMPT = f"""你是一个 SQL 专家，你的任务是将用户的自然语言问题转换为 MySQL SQL 查询语句。

## 数据库表结构

{DDL_SCHEMA}

## 数据集说明

本系统包含三个数据集的学生数据，通过 student_id 前缀区分：
- **UCI Math 数据集**：student_id 以 `STU_M_` 开头（397名学生），成绩为 0-20 分制，及格线 10 分
- **UCI Portuguese 数据集**：student_id 以 `STU_P_` 开头（651名学生），成绩为 0-20 分制，及格线 10 分
- **Performance Factors 数据集**：student_id 以 `STU_F_` 开头（6607名学生），成绩为 0-100 分制，及格线 60 分

## 关键字段说明

- `student_id` 格式：STU_M_XXXX / STU_P_XXXX / STU_F_XXXX
- `subject_id` 值：SUBJ_MATH（数学）、SUBJ_PORTUGUESE（葡萄牙语）、SUBJ_GENERAL（综合）
- `class_id` 值：CLS001、CLS002、CLS003
- `exam_stage` 值：G1（第一次考试）、G2（第二次考试）、G3（第三次/最终考试）
- `attendance_rate`：出勤率，0-100 的整数（百分比）
- `motivation_level`：动机水平，值为 Low / Medium / High
- `internet_access`：是否有网络接入，值为 Yes / No
- `extracurricular`：是否参加课外活动，值为 Yes / No
- `family_support`：家庭支持，值为 yes / no
- `parental_involvement`：家长参与度，值为 Low / Medium / High
- `family_income`：家庭收入，值为 Low / Medium / High
- `student_gender`：性别，值为 M / F
- `risk_level`：风险等级，值为 low / medium / high
- `intervention_status`：干预状态，值为 pending / in_progress / completed
- `student_feedback`：学生反馈，值为 satisfied / neutral / unsatisfied

## 重要规则

1. 只输出一条 SQL 语句，不要输出任何解释文字
2. 只允许 SELECT 查询，禁止 INSERT/UPDATE/DELETE/DROP/ALTER 等写操作
3. 注意区分不同数据集的分制：
   - STU_M_ 和 STU_P_ 学生：成绩 0-20 分，及格线 10 分
   - STU_F_ 学生：成绩 0-100 分，及格线 60 分
4. 当用户问"及格"相关问题时，需要根据数据集区分及格线
5. 当用户问"所有学生"时，注意三个数据集成绩分制不同，可能需要分开统计或仅针对某个数据集
6. 使用中文别名（AS）让查询结果更易读
7. SQL 语句末尾不要加分号

## Few-shot 示例

用户问题：查询数学成绩前10名的学生
SQL：SELECT s.student_id, s.student_name, es.score FROM student s JOIN exam_score es ON s.student_id = es.student_id WHERE es.subject_id = 'SUBJ_MATH' AND es.exam_stage = 'G3' ORDER BY es.score DESC LIMIT 10

用户问题：统计各科目的平均分
SQL：SELECT sub.subject_name AS 科目, AVG(es.score) AS 平均分 FROM exam_score es JOIN subject sub ON es.subject_id = sub.subject_id WHERE es.exam_stage = 'G3' GROUP BY es.subject_id, sub.subject_name

用户问题：查询出勤率低于80%的学生
SQL：SELECT s.student_id, s.student_name, lb.attendance_rate AS 出勤率 FROM student s JOIN learning_behavior lb ON s.student_id = lb.student_id WHERE lb.attendance_rate < 80

用户问题：查询有网络接入和没有网络接入的学生成绩对比
SQL：SELECT lb.internet_access AS 网络接入, AVG(es.score) AS 平均成绩, COUNT(*) AS 人数 FROM learning_behavior lb JOIN exam_score es ON lb.student_id = es.student_id WHERE es.exam_stage = 'G3' GROUP BY lb.internet_access
"""

# ============================================================
# 3. nl2sql 函数：核心 NL2SQL 转换与执行
# ============================================================

# 初始化 DeepSeek 客户端
_client = OpenAI(api_key=LLM_CONFIG['api_key'], base_url=LLM_CONFIG['base_url'])


def _clean_sql(raw: str) -> str:
    """清理 LLM 返回的 SQL，去除 markdown 代码块标记和多余空白"""
    sql = raw.strip()
    # 去除 markdown 代码块标记 ```sql ... ```
    sql = re.sub(r'^```sql\s*', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'^```\s*', '', sql)
    sql = re.sub(r'\s*```$', '', sql)
    # 去除末尾分号
    sql = sql.rstrip(';').strip()
    return sql


def _is_safe_sql(sql: str) -> bool:
    """检查 SQL 是否为安全的 SELECT 查询"""
    sql_upper = sql.strip().upper()
    # 必须以 SELECT 开头
    if not sql_upper.startswith('SELECT'):
        return False
    # 禁止包含写操作关键字
    forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'REPLACE', 'GRANT', 'REVOKE']
    for keyword in forbidden:
        if keyword in sql_upper:
            return False
    return True


def nl2sql(question: str, operator_role='system', operator='系统', operator_id=None) -> dict:
    """
    将自然语言问题转换为 SQL 并执行查询

    Args:
        question: 用户的自然语言问题

    Returns:
        dict: { sql, result, error, execution_time_ms }
    """
    start_time = time.time()
    result = {
        'sql': '',
        'result': [],
        'error': None,
        'execution_time_ms': 0
    }

    try:
        # 调用 DeepSeek API 生成 SQL
        response = _client.chat.completions.create(
            model=LLM_CONFIG['model'],
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question}
            ],
            temperature=0,
            max_tokens=1024
        )

        raw_sql = response.choices[0].message.content
        sql = _clean_sql(raw_sql)
        result['sql'] = sql

        # 安全检查
        if not _is_safe_sql(sql):
            result['error'] = '生成的 SQL 不是安全的 SELECT 查询，已拒绝执行'
            log_nl2sql(question, sql, 0, False)
            return result

        # 执行 SQL
        query_start = time.time()
        rows = query_all(sql)
        query_time_ms = int((time.time() - query_start) * 1000)
        result['result'] = rows
        result['execution_time_ms'] = query_time_ms

        total_time_ms = int((time.time() - start_time) * 1000)

        # 记录日志
        log_nl2sql(question, sql, total_time_ms, True)

    except Exception as e:
        result['error'] = str(e)
        total_time_ms = int((time.time() - start_time) * 1000)
        if result['sql']:
            log_nl2sql(question, result['sql'], total_time_ms, False)

    return result


def log_nl2sql(question: str, sql: str, execution_time_ms: int, is_correct: bool):
    """
    将 NL2SQL 查询记录插入 nl2sql_log 表

    Args:
        question: 自然语言输入
        sql: 生成的 SQL 语句
        execution_time_ms: 执行耗时（毫秒）
        is_correct: 是否正确执行
    """
    try:
        execute(
            """INSERT INTO nl2sql_log
               (natural_language_input, generated_sql, execution_time_ms, is_correct, query_time)
               VALUES (%s, %s, %s, %s, %s)""",
            (question, sql, execution_time_ms, 1 if is_correct else 0, datetime.now())
        )
        record_change('INSERT', 'nl2sql_log',
                      description=f'自然语言查询：{question[:50]}',
                      change_detail={'question': question, 'is_correct': is_correct, 'execution_time_ms': execution_time_ms},
                      operator_role=operator_role, operator=operator, operator_id=operator_id)
    except Exception:
        pass  # 日志写入失败不影响主流程
