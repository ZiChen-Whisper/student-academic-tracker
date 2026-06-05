from flask import Blueprint, request, jsonify
from db import query_all, query_one

student_bp = Blueprint('student', __name__)

@student_bp.route('/', methods=['GET'])
def get_students():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    offset = (page - 1) * per_page
    class_id = request.args.get('class_id', '')

    if class_id:
        total_result = query_one("SELECT COUNT(*) AS total FROM student WHERE student_class_id = %s", (class_id,))
        students = query_all(
            "SELECT * FROM student WHERE student_class_id = %s LIMIT %s OFFSET %s",
            (class_id, per_page, offset)
        )
    else:
        total_result = query_one("SELECT COUNT(*) AS total FROM student")
        students = query_all(
            "SELECT * FROM student LIMIT %s OFFSET %s",
            (per_page, offset)
        )

    total = total_result['total'] if total_result else 0

    return jsonify({
        'data': students,
        'total': total,
        'page': page,
        'per_page': per_page
    })

@student_bp.route('/search', methods=['GET'])
def search_students():
    """按姓名或学生ID模糊搜索学生"""
    keyword = request.args.get('keyword', '')
    if not keyword:
        return jsonify({'data': [], 'total': 0})
    students = query_all(
        "SELECT * FROM student WHERE student_name LIKE %s OR student_id LIKE %s LIMIT 20",
        (f'%{keyword}%', f'%{keyword}%')
    )
    return jsonify({'data': students, 'total': len(students)})

@student_bp.route('/<student_id>', methods=['GET'])
def get_student(student_id):
    student = query_one(
        "SELECT * FROM student WHERE student_id = %s",
        (student_id,)
    )
    if not student:
        return jsonify({'error': '学生不存在'}), 404

    # 关联查询学习行为数据
    behavior = query_one(
        "SELECT * FROM learning_behavior WHERE student_id = %s",
        (student_id,)
    )
    if behavior:
        # 移除 behavior_id 和 student_id，避免冗余
        behavior.pop('behavior_id', None)
        behavior.pop('student_id', None)
        behavior.pop('record_date', None)

    # 关联查询家庭背景数据
    family = query_one(
        "SELECT * FROM family_background WHERE student_id = %s",
        (student_id,)
    )
    if family:
        family.pop('family_id', None)
        family.pop('student_id', None)

    student['behavior'] = behavior
    student['family'] = family

    return jsonify(student)
