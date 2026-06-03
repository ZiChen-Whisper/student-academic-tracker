from flask import Blueprint, request, jsonify
from db import query_all, query_one

score_bp = Blueprint('score', __name__)

@score_bp.route('/overview', methods=['GET'])
def get_overview():
    """学情概览：学生总数、G3平均成绩、高风险预警人数"""
    total_result = query_one("SELECT COUNT(*) AS total_students FROM student")
    # 按得分率计算平均：20分制科目除以20，100分制科目(SUBJ_GENERAL)除以100
    avg_result = query_one(
        "SELECT ROUND(AVG(CASE WHEN subject_id = 'SUBJ_GENERAL' THEN score / 100.0 ELSE score / 20.0 END) * 100, 2) AS average_score_rate "
        "FROM exam_score WHERE exam_stage = 'G3'"
    )
    risk_result = query_one(
        "SELECT COUNT(*) AS high_risk_count FROM risk_alert WHERE risk_level = 'high'"
    )

    return jsonify({
        'total_students': total_result['total_students'] if total_result else 0,
        'average_score_rate': avg_result['average_score_rate'] if avg_result else 0,
        'high_risk_count': risk_result['high_risk_count'] if risk_result else 0
    })

@score_bp.route('/distribution', methods=['GET'])
def get_distribution():
    """成绩分布：按区间统计人数，支持按科目和考试阶段筛选，支持逐分统计"""
    subject_id = request.args.get('subject_id', '')
    exam_stage = request.args.get('exam_stage', 'G3')
    granularity = request.args.get('granularity', '0')

    # 逐分统计模式：每个分数对应一个计数
    if granularity == '1':
        max_score = 100 if subject_id == 'SUBJ_GENERAL' else 20
        sql = "SELECT score, COUNT(*) AS count FROM exam_score WHERE exam_stage = %s "
        params = [exam_stage]
        if subject_id:
            sql += "AND subject_id = %s "
            params.append(subject_id)
        sql += "GROUP BY score ORDER BY score"
        raw = query_all(sql, params)
        # 补零：确保每个分数都有数据
        result_map = {item['score']: item['count'] for item in raw}
        result = [{'score': s, 'count': result_map.get(s, 0)} for s in range(0, max_score + 1)]
        return jsonify(result)

    # 根据科目判断分制：SUBJ_GENERAL 为百分制，其余为二十分制
    if subject_id == 'SUBJ_GENERAL':
        bins_sql = """
            CASE
                WHEN score BETWEEN 0 AND 19 THEN '0-19'
                WHEN score BETWEEN 20 AND 39 THEN '20-39'
                WHEN score BETWEEN 40 AND 59 THEN '40-59'
                WHEN score BETWEEN 60 AND 79 THEN '60-79'
                WHEN score BETWEEN 80 AND 100 THEN '80-100'
            END
        """
    else:
        bins_sql = """
            CASE
                WHEN score BETWEEN 0 AND 4 THEN '0-4'
                WHEN score BETWEEN 5 AND 9 THEN '5-9'
                WHEN score BETWEEN 10 AND 14 THEN '10-14'
                WHEN score BETWEEN 15 AND 20 THEN '15-20'
            END
        """

    sql = (
        f"SELECT {bins_sql} AS score_range, COUNT(*) AS count "
        f"FROM exam_score WHERE exam_stage = %s "
    )
    params = [exam_stage]

    if subject_id:
        sql += "AND subject_id = %s "
        params.append(subject_id)

    sql += f"GROUP BY score_range ORDER BY score_range"

    distribution = query_all(sql, params)

    # 确保所有区间都有数据（补零）
    if subject_id == 'SUBJ_GENERAL':
        default_ranges = ['0-19', '20-39', '40-59', '60-79', '80-100']
    else:
        default_ranges = ['0-4', '5-9', '10-14', '15-20']

    result_map = {item['score_range']: item['count'] for item in distribution if item['score_range']}
    result = [{'score_range': r, 'count': result_map.get(r, 0)} for r in default_ranges]

    return jsonify(result)

@score_bp.route('/trend/<student_id>', methods=['GET'])
def get_score_trend(student_id):
    student = query_one(
        "SELECT * FROM student WHERE student_id = %s",
        (student_id,)
    )
    if not student:
        return jsonify({'error': '学生不存在'}), 404

    scores = query_all(
        "SELECT subject_id, exam_stage, score, score_date "
        "FROM exam_score "
        "WHERE student_id = %s "
        "ORDER BY subject_id, exam_stage",
        (student_id,)
    )
    return jsonify({
        'student_id': student_id,
        'student_name': student['student_name'],
        'scores': scores
    })

@score_bp.route('/class-stats', methods=['GET'])
def get_class_stats():
    class_id = request.args.get('class_id', '')

    # 及格线：20分制科目(数学/葡萄牙语)为10分，100分制科目(综合)为60分
    pass_line_sql = (
        "CASE WHEN es.subject_id = 'SUBJ_GENERAL' THEN 60 ELSE 10 END"
    )
    sql = (
        "SELECT c.class_id, c.class_name, es.subject_id, "
        "COUNT(es.score_id) AS student_count, "
        "ROUND(AVG(es.score), 2) AS avg_score, "
        "MIN(es.score) AS min_score, "
        "MAX(es.score) AS max_score, "
        f"ROUND(SUM(CASE WHEN es.score >= {pass_line_sql} THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS pass_rate "
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
