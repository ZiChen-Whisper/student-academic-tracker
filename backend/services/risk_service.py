"""
学业风险预警服务模块：基于规则的风险评分 + 可选 ML 模型预警
"""

import json
from datetime import datetime
from db import query_all, query_one, execute
from services.change_history_service import record_change


# ============================================================
# 1. 基于规则的风险评分
# ============================================================

def predict_risk(student_data: dict) -> dict:
    """
    基于规则的学生风险评分

    输入：学生数据（avg_score, attendance_rate, motivation_level 等）
    风险评分规则：
      - 平均成绩 < 10(0-20分制) / < 60(0-100分制) → +3 分
      - 平均成绩 10-14(0-20分制) / 60-74(0-100分制) → +1 分
      - 出勤率 < 80% → +2 分
      - 动机 Low → +2 分，Medium → +1 分
    风险等级：≥5 为 high，≥3 为 medium，其他为 low

    Args:
        student_data: 包含 student_id, avg_score, attendance_rate, motivation_level, score_scale 的字典

    Returns:
        dict: { student_id, risk_level, risk_score, features }
    """
    risk_score = 0
    features = []

    avg_score = student_data.get('avg_score')
    attendance_rate = student_data.get('attendance_rate')
    motivation_level = student_data.get('motivation_level')
    score_scale = student_data.get('score_scale', 20)  # 默认 0-20 分制

    # 成绩评分
    if avg_score is not None:
        if score_scale == 100:
            # 0-100 分制
            if avg_score < 60:
                risk_score += 3
                features.append(f'平均成绩偏低({avg_score:.1f}/100)')
            elif avg_score < 75:
                risk_score += 1
                features.append(f'平均成绩中等({avg_score:.1f}/100)')
        else:
            # 0-20 分制
            if avg_score < 10:
                risk_score += 3
                features.append(f'平均成绩偏低({avg_score:.1f}/20)')
            elif avg_score < 14:
                risk_score += 1
                features.append(f'平均成绩中等({avg_score:.1f}/20)')

    # 出勤率评分
    if attendance_rate is not None:
        if attendance_rate < 80:
            risk_score += 2
            features.append(f'出勤率低({attendance_rate}%)')

    # 动机水平评分
    if motivation_level is not None:
        if motivation_level == 'Low':
            risk_score += 2
            features.append('学习动机低')
        elif motivation_level == 'Medium':
            risk_score += 1
            features.append('学习动机中等')

    # 确定风险等级
    if risk_score >= 5:
        risk_level = 'high'
    elif risk_score >= 3:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    return {
        'student_id': student_data['student_id'],
        'risk_level': risk_level,
        'risk_score': risk_score,
        'features': features
    }


def save_alert(risk_info: dict):
    """
    将预警信息插入 risk_alert 表

    Args:
        risk_info: predict_risk 的返回值
    """
    execute(
        """INSERT INTO risk_alert (student_id, risk_level, risk_score, alert_time, risk_factors)
           VALUES (%s, %s, %s, %s, %s)""",
        (
            risk_info['student_id'],
            risk_info['risk_level'],
            risk_info['risk_score'],
            datetime.now(),
            json.dumps(risk_info['features'], ensure_ascii=False)
        )
    )


def calculate_risk_for_all(operator_role='system', operator='系统', operator_id=None) -> list:
    """
    查询所有学生的 G3 成绩、出勤率、动机水平，
    对每个学生调用 predict_risk，
    将结果保存到 risk_alert 表，
    返回预警列表。
    """
    # 清空旧预警数据
    old_count_result = query_one("SELECT COUNT(*) AS cnt FROM risk_alert")
    old_count = old_count_result['cnt'] if old_count_result else 0
    execute("DELETE FROM risk_alert")
    if old_count > 0:
        record_change('BATCH_DELETE', 'risk_alert', description=f'清空旧预警数据（{old_count}条）',
                      operator_role=operator_role, operator=operator, operator_id=operator_id)

    # 查询所有学生的 G3 平均成绩
    score_data = query_all(
        """SELECT student_id, AVG(score) AS avg_score
           FROM exam_score
           WHERE exam_stage = 'G3'
           GROUP BY student_id"""
    )

    # 查询学习行为数据（只有 STU_F_ 学生有）
    behavior_data = query_all(
        """SELECT student_id, attendance_rate, motivation_level
           FROM learning_behavior"""
    )

    # 构建学习行为字典
    behavior_map = {}
    for row in behavior_data:
        behavior_map[row['student_id']] = row

    # 对每个学生计算风险
    alert_list = []
    for row in score_data:
        student_id = row['student_id']
        avg_score = float(row['avg_score'])

        # 判断分制
        if student_id.startswith('STU_F_'):
            score_scale = 100
        else:
            score_scale = 20

        # 获取学习行为数据
        behavior = behavior_map.get(student_id, {})
        attendance_rate = behavior.get('attendance_rate')
        motivation_level = behavior.get('motivation_level')

        student_data = {
            'student_id': student_id,
            'avg_score': avg_score,
            'attendance_rate': attendance_rate,
            'motivation_level': motivation_level,
            'score_scale': score_scale
        }

        risk_info = predict_risk(student_data)
        save_alert(risk_info)
        record_change('INSERT', 'risk_alert', record_id=student_id,
                      description=f'新增{risk_info["risk_level"]}风险预警',
                      change_detail={'risk_level': risk_info['risk_level'], 'risk_score': risk_info['risk_score'], 'features': risk_info['features']},
                      operator_role=operator_role, operator=operator, operator_id=operator_id)
        alert_list.append(risk_info)

    return alert_list


# ============================================================
# 2. 可选：ML 模型预警（RandomForestClassifier）
# ============================================================

def train_risk_model() -> dict:
    """
    使用 RandomForestClassifier 训练风险预警模型

    特征：student_age, attendance_rate, study_hours, sleep_hours,
          tutoring_sessions, motivation_num
    标签：根据 G3 成绩划分（<10/<60 high, <14/<75 medium, else low）

    Returns:
        dict: { accuracy, classification_report, feature_importance }
    """
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, classification_report

    # 查询 STU_F_ 学生的数据（有完整的学习行为数据）
    data = query_all(
        """SELECT s.student_id, s.student_age, lb.attendance_rate, lb.study_hours,
                  lb.sleep_hours, lb.tutoring_sessions, lb.motivation_level,
                  AVG(es.score) AS avg_score
           FROM student s
           JOIN learning_behavior lb ON s.student_id = lb.student_id
           JOIN exam_score es ON s.student_id = es.student_id AND es.exam_stage = 'G3'
           WHERE s.student_id LIKE 'STU_F_%'
           GROUP BY s.student_id, s.student_age, lb.attendance_rate, lb.study_hours,
                    lb.sleep_hours, lb.tutoring_sessions, lb.motivation_level"""
    )

    if not data:
        return {'error': '没有足够的数据训练模型'}

    # 特征编码
    motivation_map = {'Low': 0, 'Medium': 1, 'High': 2}
    X = []
    y = []

    for row in data:
        try:
            features = [
                float(row['student_age'] or 0),
                float(row['attendance_rate'] or 0),
                float(row['study_hours'] or 0),
                float(row['sleep_hours'] or 0),
                float(row['tutoring_sessions'] or 0),
                motivation_map.get(row['motivation_level'], 1)
            ]
            avg_score = float(row['avg_score'])

            # 0-100 分制的标签
            if avg_score < 60:
                label = 'high'
            elif avg_score < 75:
                label = 'medium'
            else:
                label = 'low'

            X.append(features)
            y.append(label)
        except (ValueError, TypeError):
            continue

    if len(X) < 10:
        return {'error': f'有效数据不足（仅 {len(X)} 条），无法训练模型'}

    X = np.array(X)
    y = np.array(y)

    # 划分训练集和测试集
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 训练模型
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    # 评估
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)

    # 特征重要性
    feature_names = ['student_age', 'attendance_rate', 'study_hours',
                     'sleep_hours', 'tutoring_sessions', 'motivation_num']
    importance = dict(zip(feature_names, clf.feature_importances_.tolist()))

    return {
        'accuracy': round(accuracy, 4),
        'classification_report': report,
        'feature_importance': importance,
        'training_samples': len(X_train),
        'test_samples': len(X_test)
    }
