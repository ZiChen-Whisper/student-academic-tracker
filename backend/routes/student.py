from flask import Blueprint, request, jsonify
from db import query_all, query_one

student_bp = Blueprint('student', __name__)

@student_bp.route('/', methods=['GET'])
def get_students():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    offset = (page - 1) * per_page

    total_result = query_one("SELECT COUNT(*) AS total FROM student")
    total = total_result['total'] if total_result else 0

    students = query_all(
        "SELECT * FROM student LIMIT %s OFFSET %s",
        (per_page, offset)
    )

    return jsonify({
        'data': students,
        'total': total,
        'page': page,
        'per_page': per_page
    })

@student_bp.route('/<student_id>', methods=['GET'])
def get_student(student_id):
    student = query_one(
        "SELECT * FROM student WHERE student_id = %s",
        (student_id,)
    )
    if not student:
        return jsonify({'error': '学生不存在'}), 404
    return jsonify(student)
