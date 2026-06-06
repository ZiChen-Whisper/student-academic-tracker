"""
AI 个性化学习建议服务模块：基于学生数据调用 DeepSeek API 生成学习建议
"""

from datetime import datetime
from openai import OpenAI
from config import LLM_CONFIG
from db import query_all, query_one, execute
from services.change_history_service import record_change

# 初始化 DeepSeek 客户端
_client = OpenAI(api_key=LLM_CONFIG['api_key'], base_url=LLM_CONFIG['base_url'])

# ============================================================
# 1. 系统提示词
# ============================================================

SYSTEM_PROMPT = """你是一位经验丰富的学业顾问，你的任务是根据学生的详细数据，生成3条具体、可操作、个性化的学习建议。

## 要求

1. 必须生成恰好3条建议，每条建议以"建议一："、"建议二："、"建议三："开头
2. 建议必须基于学生的实际数据，不能泛泛而谈
3. 每条建议应包含：问题诊断 + 具体行动方案
4. 语言简洁明了，每条建议100-200字
5. 不要重复学生已知的信息，而是给出针对性的改进方向
6. 如果学生成绩优秀，建议应侧重于进一步提升和保持
7. 如果学生成绩较差，建议应侧重于基础巩固和方法改进
"""


def generate_suggestion(student_id: str, operator_role='system', operator='系统', operator_id=None) -> dict:
    """
    为指定学生生成个性化学习建议

    步骤：
    1. 查询学生的基本信息、成绩趋势、学习行为、家庭背景、风险预警
    2. 将成绩数据格式化为趋势字符串
    3. 构造 Prompt，调用 DeepSeek API（temperature=0.7）
    4. 将建议保存到 learning_suggestion 表
    5. 返回 { student_id, suggestion }

    Args:
        student_id: 学生ID

    Returns:
        dict: { student_id, suggestion }
    """
    # ---- 1. 查询学生基本信息 ----
    student = query_one(
        "SELECT student_id, student_name, student_gender, student_age, student_class_id FROM student WHERE student_id = %s",
        (student_id,)
    )
    if not student:
        raise ValueError(f'学生 {student_id} 不存在')

    # ---- 2. 查询成绩趋势 ----
    scores = query_all(
        """SELECT subject_id, exam_stage, score
           FROM exam_score
           WHERE student_id = %s
           ORDER BY subject_id, exam_stage""",
        (student_id,)
    )

    # 格式化成绩趋势字符串，如 SUBJ_MATH: G1=8, G2=10, G3=12
    trend_lines = []
    subject_scores = {}
    for row in scores:
        sid = row['subject_id']
        if sid not in subject_scores:
            subject_scores[sid] = []
        subject_scores[sid].append(f"{row['exam_stage']}={row['score']}")

    for sid, stages in subject_scores.items():
        trend_lines.append(f"{sid}: {', '.join(stages)}")

    trend_str = '\n'.join(trend_lines) if trend_lines else '暂无成绩数据'

    # ---- 3. 查询学习行为 ----
    behavior = query_one(
        """SELECT attendance_rate, study_hours, sleep_hours, motivation_level,
                  tutoring_sessions, internet_access, extracurricular, physical_activity
           FROM learning_behavior
           WHERE student_id = %s""",
        (student_id,)
    )

    behavior_str = ''
    if behavior:
        behavior_str = f"""- 出勤率：{behavior['attendance_rate']}%
- 每周学习时长：{behavior['study_hours']}小时
- 每周睡眠时长：{behavior['sleep_hours']}小时
- 学习动机：{behavior['motivation_level']}
- 辅导次数：{behavior['tutoring_sessions']}
- 网络接入：{behavior['internet_access']}
- 课外活动：{behavior['extracurricular']}
- 体育活动：{behavior['physical_activity']}"""
    else:
        behavior_str = '暂无学习行为数据'

    # ---- 4. 查询家庭背景 ----
    family = query_one(
        """SELECT father_edu, mother_edu, father_job, mother_job,
                  family_income, family_support, parental_involvement, fam_rel
           FROM family_background
           WHERE student_id = %s""",
        (student_id,)
    )

    family_str = ''
    if family:
        family_str = f"""- 父亲学历：{family['father_edu']}
- 母亲学历：{family['mother_edu']}
- 父亲职业：{family['father_job']}
- 母亲职业：{family['mother_job']}
- 家庭收入：{family['family_income']}
- 家庭支持：{family['family_support']}
- 家长参与度：{family['parental_involvement']}
- 家庭关系评分：{family['fam_rel']}"""
    else:
        family_str = '暂无家庭背景数据'

    # ---- 5. 查询风险预警 ----
    alert = query_one(
        "SELECT risk_level, risk_factors FROM risk_alert WHERE student_id = %s ORDER BY alert_time DESC LIMIT 1",
        (student_id,)
    )

    alert_str = ''
    if alert:
        alert_str = f"- 风险等级：{alert['risk_level']}\n- 风险因素：{alert['risk_factors']}"
    else:
        alert_str = '暂无风险预警'

    # ---- 6. 判断分制 ----
    if student_id.startswith('STU_F_'):
        score_scale = '0-100分制，及格线60分'
    else:
        score_scale = '0-20分制，及格线10分'

    # ---- 7. 构造用户 Prompt ----
    user_prompt = f"""请为以下学生生成3条个性化学习建议：

## 学生基本信息
- 姓名：{student['student_name']}
- 性别：{'男' if student['student_gender'] == 'M' else '女'}
- 年龄：{student['student_age']}
- 学号：{student['student_id']}

## 成绩趋势（{score_scale}）
{trend_str}

## 学习行为
{behavior_str}

## 家庭背景
{family_str}

## 风险预警
{alert_str}

请根据以上数据，生成3条具体、可操作的学习建议。"""

    # ---- 8. 调用 DeepSeek API ----
    response = _client.chat.completions.create(
        model=LLM_CONFIG['model'],
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7,
        max_tokens=1024
    )

    suggestion_content = response.choices[0].message.content.strip()

    # ---- 9. 保存到 learning_suggestion 表 ----
    execute(
        """INSERT INTO learning_suggestion (student_id, suggestion_content, generate_time)
           VALUES (%s, %s, %s)""",
        (student_id, suggestion_content, datetime.now())
    )

    record_change('GENERATE', 'learning_suggestion', record_id=student_id,
                  description=f'为{student["student_name"]}生成AI学习建议',
                  change_detail={'student_id': student_id, 'student_name': student['student_name']},
                  operator_role=operator_role, operator=operator, operator_id=operator_id)

    return {
        'student_id': student_id,
        'suggestion': suggestion_content
    }


def update_feedback(suggestion_id: int, feedback: str, operator_role='student', operator='学生', operator_id=None):
    """
    更新学习建议的学生反馈

    Args:
        suggestion_id: 建议ID
        feedback: 反馈值，只允许 satisfied / neutral / unsatisfied

    Raises:
        ValueError: feedback 值不合法或建议不存在
    """
    valid_feedbacks = ('satisfied', 'neutral', 'unsatisfied')
    if feedback not in valid_feedbacks:
        raise ValueError(f'feedback 只允许：{" / ".join(valid_feedbacks)}，收到：{feedback}')

    # 检查建议是否存在
    suggestion = query_one(
        "SELECT suggestion_id FROM learning_suggestion WHERE suggestion_id = %s",
        (suggestion_id,)
    )
    if not suggestion:
        raise ValueError(f'建议 ID {suggestion_id} 不存在')

    execute(
        "UPDATE learning_suggestion SET student_feedback = %s WHERE suggestion_id = %s",
        (feedback, suggestion_id)
    )

    feedback_labels = {'satisfied': '满意', 'neutral': '一般', 'unsatisfied': '不满意'}
    record_change('UPDATE', 'learning_suggestion', record_id=str(suggestion_id),
                  description=f'更新建议反馈为{feedback_labels.get(feedback, feedback)}',
                  change_detail={'suggestion_id': suggestion_id, 'student_feedback': feedback},
                  operator=operator, operator_role=operator_role, operator_id=operator_id)
