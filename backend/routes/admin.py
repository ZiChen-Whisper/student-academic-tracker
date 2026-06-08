from flask import Blueprint, jsonify, request
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

    # 班级排名（按G3综合平均分，前5名）
    class_ranking = query_all(
        "SELECT c.class_name, COUNT(s.student_id) as student_count, "
        "ROUND(AVG(es.score), 1) as avg_score "
        "FROM class c "
        "JOIN student s ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_GENERAL' "
        "GROUP BY c.class_id, c.class_name "
        "ORDER BY avg_score DESC LIMIT 10"
    )

    # 综合成绩Top10
    top5_general = query_all(
        "SELECT s.student_name, s.student_gender, c.class_name, es.score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_GENERAL' "
        "ORDER BY es.score DESC LIMIT 10"
    )

    # 数学成绩Top10
    top5_math = query_all(
        "SELECT s.student_name, s.student_gender, c.class_name, es.score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_MATH' "
        "ORDER BY es.score DESC LIMIT 10"
    )

    # 葡萄牙语成绩Top10
    top5_portuguese = query_all(
        "SELECT s.student_name, s.student_gender, c.class_name, es.score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_PORTUGUESE' "
        "ORDER BY es.score DESC LIMIT 10"
    )

    # 出勤率Top10
    top5_attendance = query_all(
        "SELECT s.student_name, s.student_gender, c.class_name, lb.attendance_rate as score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN learning_behavior lb ON lb.student_id = s.student_id "
        "ORDER BY lb.attendance_rate DESC LIMIT 10"
    )

    # 学习时长Top10
    top5_study_hours = query_all(
        "SELECT s.student_name, s.student_gender, c.class_name, lb.study_hours as score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN learning_behavior lb ON lb.student_id = s.student_id "
        "ORDER BY lb.study_hours DESC LIMIT 10"
    )

    # 成绩进步Top10（G3-G1综合成绩提升最大）
    top5_improvement = query_all(
        "SELECT s.student_name, s.student_gender, c.class_name, "
        "ROUND(g3.score - g1.score, 1) as score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score g3 ON g3.student_id = s.student_id AND g3.exam_stage = 'G3' AND g3.subject_id = 'SUBJ_GENERAL' "
        "JOIN exam_score g1 ON g1.student_id = s.student_id AND g1.exam_stage = 'G1' AND g1.subject_id = 'SUBJ_GENERAL' "
        "ORDER BY score DESC LIMIT 10"
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
        'top5_math': top5_math,
        'top5_portuguese': top5_portuguese,
        'top5_attendance': top5_attendance,
        'top5_study_hours': top5_study_hours,
        'top5_improvement': top5_improvement,
        'score_trend': score_trend,
    })


# 全量排名查询（不限条数，用于浮窗展示）
RANKING_QUERIES = {
    'class_ranking': (
        "SELECT c.class_name, COUNT(s.student_id) as student_count, "
        "ROUND(AVG(es.score), 1) as avg_score "
        "FROM class c "
        "JOIN student s ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_GENERAL' "
        "GROUP BY c.class_id, c.class_name "
        "ORDER BY avg_score DESC"
    ),
    'top5_general': (
        "SELECT s.student_name, s.student_gender, c.class_name, es.score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_GENERAL' "
        "ORDER BY es.score DESC"
    ),
    'top5_math': (
        "SELECT s.student_name, s.student_gender, c.class_name, es.score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_MATH' "
        "ORDER BY es.score DESC"
    ),
    'top5_portuguese': (
        "SELECT s.student_name, s.student_gender, c.class_name, es.score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score es ON es.student_id = s.student_id "
        "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_PORTUGUESE' "
        "ORDER BY es.score DESC"
    ),
    'top5_attendance': (
        "SELECT s.student_name, s.student_gender, c.class_name, lb.attendance_rate as score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN learning_behavior lb ON lb.student_id = s.student_id "
        "ORDER BY lb.attendance_rate DESC"
    ),
    'top5_study_hours': (
        "SELECT s.student_name, s.student_gender, c.class_name, lb.study_hours as score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN learning_behavior lb ON lb.student_id = s.student_id "
        "ORDER BY lb.study_hours DESC"
    ),
    'top5_improvement': (
        "SELECT s.student_name, s.student_gender, c.class_name, "
        "ROUND(g3.score - g1.score, 1) as score "
        "FROM student s "
        "JOIN class c ON s.student_class_id = c.class_id "
        "JOIN exam_score g3 ON g3.student_id = s.student_id AND g3.exam_stage = 'G3' AND g3.subject_id = 'SUBJ_GENERAL' "
        "JOIN exam_score g1 ON g1.student_id = s.student_id AND g1.exam_stage = 'G1' AND g1.subject_id = 'SUBJ_GENERAL' "
        "ORDER BY score DESC"
    ),
}


@admin_bp.route('/rankings/<ranking_type>', methods=['GET'])
def get_admin_rankings(ranking_type):
    """获取全量排名数据（不限条数）"""
    sql = RANKING_QUERIES.get(ranking_type)
    if not sql:
        return jsonify({'error': f'未知的排名类型: {ranking_type}'}), 400
    data = query_all(sql)
    return jsonify({'data': data})
