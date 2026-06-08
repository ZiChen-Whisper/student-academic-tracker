from flask import Blueprint, jsonify
from db import query_one, query_all

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
def get_admin_stats():
    """获取管理员仪表盘扩展统计数据"""

    # 男女比例
    gender = query_one(
        "SELECT "
        "SUM(CASE WHEN student_gender = 'M' THEN 1 ELSE 0 END) as male_count, "
        "SUM(CASE WHEN student_gender = 'F' THEN 1 ELSE 0 END) as female_count "
        "FROM student"
    )

    # 学习行为均值
    behavior = query_one(
        "SELECT "
        "ROUND(AVG(attendance_rate), 1) as avg_attendance, "
        "ROUND(AVG(study_hours), 1) as avg_study_hours, "
        "ROUND(AVG(sleep_hours), 1) as avg_sleep_hours "
        "FROM learning_behavior"
    )

    # 干预状态分布
    intervention = query_all(
        "SELECT intervention_status, COUNT(*) as cnt "
        "FROM risk_alert GROUP BY intervention_status"
    )
    intervention_map = {item['intervention_status']: item['cnt'] for item in intervention}

    # 成绩极值（G3阶段）
    score_range = query_all(
        "SELECT subject_id, "
        "ROUND(AVG(score), 1) as avg_score, "
        "MIN(score) as min_score, "
        "MAX(score) as max_score "
        "FROM exam_score WHERE exam_stage = 'G3' GROUP BY subject_id"
    )

    # 学习动力分布
    motivation = query_all(
        "SELECT motivation_level, COUNT(*) as cnt "
        "FROM learning_behavior GROUP BY motivation_level"
    )
    motivation_map = {item['motivation_level']: item['cnt'] for item in motivation}

    # 班级排名（按G3综合平均分）
    class_ranking = query_all(
        "SELECT c.class_name, COUNT(s.student_id) as student_count, "
        "ROUND(AVG(es.score), 1) as avg_score "
        "FROM class c "
        "JOIN student s ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_GENERAL' "
        "GROUP BY c.class_id, c.class_name "
        "ORDER BY avg_score DESC"
    )

    # 综合成绩Top5
    top5_general = query_all(
        "SELECT s.student_name, s.student_gender, c.class_name, es.score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_GENERAL' "
        "ORDER BY es.score DESC LIMIT 5"
    )

    # 各阶段成绩趋势
    score_trend = query_all(
        "SELECT exam_stage, subject_id, ROUND(AVG(score), 1) as avg_score "
        "FROM exam_score "
        "GROUP BY exam_stage, subject_id "
        "ORDER BY subject_id, exam_stage"
    )

    return jsonify({
        'gender': {
            'male': gender['male_count'] or 0,
            'female': gender['female_count'] or 0,
        },
        'behavior': {
            'avg_attendance': behavior['avg_attendance'] or 0,
            'avg_study_hours': behavior['avg_study_hours'] or 0,
            'avg_sleep_hours': behavior['avg_sleep_hours'] or 0,
        },
        'intervention': {
            'pending': intervention_map.get('pending', 0),
            'in_progress': intervention_map.get('in_progress', 0),
            'completed': intervention_map.get('completed', 0),
        },
        'score_range': score_range,
        'motivation': {
            'low': motivation_map.get('Low', 0),
            'medium': motivation_map.get('Medium', 0),
            'high': motivation_map.get('High', 0),
        },
        'class_ranking': class_ranking,
        'top5_general': top5_general,
        'score_trend': score_trend,
    })
