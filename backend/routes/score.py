from flask import Blueprint, request, jsonify
from db import query_all, query_one

score_bp = Blueprint('score', __name__)

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

    sql = (
        "SELECT c.class_id, c.class_name, es.subject_id, "
        "COUNT(es.score_id) AS student_count, "
        "ROUND(AVG(es.score), 2) AS avg_score, "
        "MIN(es.score) AS min_score, "
        "MAX(es.score) AS max_score, "
        "ROUND(SUM(CASE WHEN es.score >= 10 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS pass_rate "
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
