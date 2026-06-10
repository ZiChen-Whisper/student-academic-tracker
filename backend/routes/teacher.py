from flask import Blueprint, request, jsonify
from db import query_all, query_one

teacher_bp = Blueprint('teacher', __name__)

@teacher_bp.route('/', methods=['GET'])
def get_teachers():
    """获取所有教师列表"""
    teachers = query_all("SELECT * FROM teacher ORDER BY teacher_id")
    return jsonify({'data': teachers})

@teacher_bp.route('/search', methods=['GET'])
def search_teachers():
    """按姓名或教师ID搜索教师"""
    keyword = request.args.get('keyword', '')
    if not keyword:
        return jsonify({'data': []})
    teachers = query_all(
        "SELECT * FROM teacher WHERE teacher_name LIKE %s OR teacher_id LIKE %s LIMIT 20",
        (f'%{keyword}%', f'%{keyword}%')
    )
    return jsonify({'data': teachers})

@teacher_bp.route('/<teacher_id>/classes', methods=['GET'])
def get_teacher_classes(teacher_id):
    """获取教师管理的班级"""
    as_homeroom = query_all(
        "SELECT class_id, class_name FROM class WHERE class_teacher_id = %s",
        (teacher_id,)
    )
    as_instructor = query_all(
        "SELECT DISTINCT c.class_id, c.class_name FROM course_schedule cs JOIN class c ON cs.class_id = c.class_id WHERE cs.teacher_id = %s",
        (teacher_id,)
    )
    return jsonify({
        'data': {
            'homeroom_classes': as_homeroom,
            'instructor_classes': as_instructor,
        }
    })

@teacher_bp.route('/stats', methods=['GET'])
def get_teacher_stats():
    """获取教师仪表盘统计数据，支持 class_id 筛选"""
    class_id = request.args.get('class_id', '')

    # 班级学生过滤条件
    if class_id:
        student_filter = "WHERE s.student_class_id = %s"
        student_filter_no_alias = "WHERE student_class_id = %s"
        score_filter = "WHERE es.exam_stage = 'G3' AND s.student_class_id = %s"
        behavior_filter = "WHERE s.student_class_id = %s"
        alert_filter = "WHERE s.student_class_id = %s"
        params_1 = [class_id]
    else:
        student_filter = ""
        student_filter_no_alias = ""
        score_filter = "WHERE es.exam_stage = 'G3'"
        behavior_filter = ""
        alert_filter = ""
        params_1 = []

    # 男女比例
    gender = query_one(
        f"SELECT "
        f"SUM(CASE WHEN s.student_gender = 'M' THEN 1 ELSE 0 END) as male_count, "
        f"SUM(CASE WHEN s.student_gender = 'F' THEN 1 ELSE 0 END) as female_count "
        f"FROM student s {student_filter}",
        params_1 if params_1 else None
    )

    # 学习行为均值
    behavior = query_one(
        f"SELECT "
        f"ROUND(AVG(lb.attendance_rate), 1) as avg_attendance, "
        f"ROUND(AVG(lb.study_hours), 1) as avg_study_hours, "
        f"ROUND(AVG(lb.sleep_hours), 1) as avg_sleep_hours, "
        f"ROUND(AVG(lb.tutoring_sessions), 1) as avg_tutoring, "
        f"ROUND(AVG(lb.physical_activity), 1) as avg_physical "
        f"FROM learning_behavior lb JOIN student s ON lb.student_id = s.student_id {behavior_filter}",
        params_1 if params_1 else None
    )

    # 干预状态分布
    intervention = query_all(
        f"SELECT ra.intervention_status, COUNT(*) as cnt "
        f"FROM risk_alert ra JOIN student s ON ra.student_id = s.student_id {alert_filter} "
        f"GROUP BY ra.intervention_status",
        params_1 if params_1 else None
    )
    intervention_map = {item['intervention_status']: item['cnt'] for item in intervention}

    # 成绩极值（G3阶段）
    score_range = query_all(
        f"SELECT es.subject_id, "
        f"ROUND(AVG(es.score), 1) as avg_score, "
        f"MIN(es.score) as min_score, "
        f"MAX(es.score) as max_score "
        f"FROM exam_score es JOIN student s ON es.student_id = s.student_id {score_filter} "
        f"GROUP BY es.subject_id",
        params_1 if params_1 else None
    )

    # 学习动力分布
    motivation = query_all(
        f"SELECT lb.motivation_level, COUNT(*) as cnt "
        f"FROM learning_behavior lb JOIN student s ON lb.student_id = s.student_id {behavior_filter} "
        f"GROUP BY lb.motivation_level",
        params_1 if params_1 else None
    )
    motivation_map = {item['motivation_level']: item['cnt'] for item in motivation}

    # 各阶段成绩趋势
    if class_id:
        score_trend = query_all(
            "SELECT es.exam_stage, es.subject_id, ROUND(AVG(es.score), 1) as avg_score "
            "FROM exam_score es JOIN student s ON es.student_id = s.student_id "
            "WHERE es.exam_stage IN ('G1','G2','G3') AND s.student_class_id = %s "
            "GROUP BY es.exam_stage, es.subject_id ORDER BY es.subject_id, es.exam_stage",
            (class_id,)
        )
    else:
        score_trend = query_all(
            "SELECT exam_stage, subject_id, ROUND(AVG(score), 1) as avg_score "
            "FROM exam_score WHERE exam_stage IN ('G1','G2','G3') "
            "GROUP BY exam_stage, subject_id ORDER BY subject_id, exam_stage"
        )

    # 综合成绩Top10
    if class_id:
        top5_general = query_all(
            "SELECT s.student_name, c.class_name, es.score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN exam_score es ON es.student_id = s.student_id "
            "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_GENERAL' "
            "WHERE s.student_class_id = %s ORDER BY es.score DESC LIMIT 10",
            (class_id,)
        )
        top5_math = query_all(
            "SELECT s.student_name, c.class_name, es.score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN exam_score es ON es.student_id = s.student_id "
            "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_MATH' "
            "WHERE s.student_class_id = %s ORDER BY es.score DESC LIMIT 10",
            (class_id,)
        )
        top5_portuguese = query_all(
            "SELECT s.student_name, c.class_name, es.score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN exam_score es ON es.student_id = s.student_id "
            "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_PORTUGUESE' "
            "WHERE s.student_class_id = %s ORDER BY es.score DESC LIMIT 10",
            (class_id,)
        )
        top5_attendance = query_all(
            "SELECT s.student_name, c.class_name, lb.attendance_rate as score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN learning_behavior lb ON lb.student_id = s.student_id "
            "WHERE s.student_class_id = %s ORDER BY lb.attendance_rate DESC LIMIT 10",
            (class_id,)
        )
        top5_study_hours = query_all(
            "SELECT s.student_name, c.class_name, lb.study_hours as score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN learning_behavior lb ON lb.student_id = s.student_id "
            "WHERE s.student_class_id = %s ORDER BY lb.study_hours DESC LIMIT 10",
            (class_id,)
        )
        top5_improvement = query_all(
            "SELECT s.student_name, c.class_name, ROUND(g3.score - g1.score, 1) as score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN exam_score g3 ON g3.student_id = s.student_id AND g3.exam_stage = 'G3' AND g3.subject_id = 'SUBJ_GENERAL' "
            "JOIN exam_score g1 ON g1.student_id = s.student_id AND g1.exam_stage = 'G1' AND g1.subject_id = 'SUBJ_GENERAL' "
            "WHERE s.student_class_id = %s ORDER BY score DESC LIMIT 10",
            (class_id,)
        )
    else:
        top5_general = query_all(
            "SELECT s.student_name, c.class_name, es.score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN exam_score es ON es.student_id = s.student_id "
            "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_GENERAL' "
            "ORDER BY es.score DESC LIMIT 10"
        )
        top5_math = query_all(
            "SELECT s.student_name, c.class_name, es.score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN exam_score es ON es.student_id = s.student_id "
            "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_MATH' "
            "ORDER BY es.score DESC LIMIT 10"
        )
        top5_portuguese = query_all(
            "SELECT s.student_name, c.class_name, es.score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN exam_score es ON es.student_id = s.student_id "
            "AND es.exam_stage = 'G3' AND es.subject_id = 'SUBJ_PORTUGUESE' "
            "ORDER BY es.score DESC LIMIT 10"
        )
        top5_attendance = query_all(
            "SELECT s.student_name, c.class_name, lb.attendance_rate as score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN learning_behavior lb ON lb.student_id = s.student_id "
            "ORDER BY lb.attendance_rate DESC LIMIT 10"
        )
        top5_study_hours = query_all(
            "SELECT s.student_name, c.class_name, lb.study_hours as score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN learning_behavior lb ON lb.student_id = s.student_id "
            "ORDER BY lb.study_hours DESC LIMIT 10"
        )
        top5_improvement = query_all(
            "SELECT s.student_name, c.class_name, ROUND(g3.score - g1.score, 1) as score "
            "FROM student s JOIN class c ON s.student_class_id = c.class_id "
            "JOIN exam_score g3 ON g3.student_id = s.student_id AND g3.exam_stage = 'G3' AND g3.subject_id = 'SUBJ_GENERAL' "
            "JOIN exam_score g1 ON g1.student_id = s.student_id AND g1.exam_stage = 'G1' AND g1.subject_id = 'SUBJ_GENERAL' "
            "ORDER BY score DESC LIMIT 10"
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
            'avg_tutoring': behavior['avg_tutoring'] or 0,
            'avg_physical': behavior['avg_physical'] or 0,
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
        'score_trend': score_trend,
        'top5_general': top5_general,
        'top5_math': top5_math,
        'top5_portuguese': top5_portuguese,
        'top5_attendance': top5_attendance,
        'top5_study_hours': top5_study_hours,
        'top5_improvement': top5_improvement,
    })
