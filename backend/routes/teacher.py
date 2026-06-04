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
    # 班主任的班级
    as_homeroom = query_all(
        "SELECT class_id, class_name FROM class WHERE class_teacher_id = %s",
        (teacher_id,)
    )
    # 授课的班级
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
