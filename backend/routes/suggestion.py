from flask import Blueprint, request, jsonify
from db import query_all
from services.suggestion_service import generate_suggestion, update_feedback

suggestion_bp = Blueprint('suggestion', __name__)


@suggestion_bp.route('/<student_id>', methods=['GET'])
def get_suggestions(student_id):
    """查询学生的历史建议列表"""
    suggestions = query_all(
        "SELECT * FROM learning_suggestion WHERE student_id = %s ORDER BY generate_time DESC",
        (student_id,)
    )
    return jsonify(suggestions)


@suggestion_bp.route('/generate/<student_id>', methods=['POST'])
def generate(student_id):
    """为指定学生生成新的 AI 学习建议"""
    try:
        data = request.get_json(silent=True) or {}
        operator_role = data.get('operator_role', 'admin')
        operator_name = data.get('operator_name', '管理员')
        operator_id = data.get('operator_id') or None
        result = generate_suggestion(student_id, operator_role=operator_role, operator=operator_name, operator_id=operator_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@suggestion_bp.route('/<int:suggestion_id>/feedback', methods=['PUT'])
def feedback(suggestion_id):
    """提交建议反馈"""
    data = request.get_json()
    if not data or 'feedback' not in data:
        return jsonify({'error': '请提供 feedback 字段'}), 400

    try:
        operator_role = data.get('operator_role', 'student')
        operator_name = data.get('operator_name', '学生')
        operator_id = data.get('operator_id') or None
        update_feedback(suggestion_id, data['feedback'], operator_role=operator_role, operator=operator_name, operator_id=operator_id)
        return jsonify({'message': '反馈更新成功'})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
