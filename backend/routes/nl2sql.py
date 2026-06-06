from flask import Blueprint, request, jsonify
from services.nl2sql_service import nl2sql

nl2sql_bp = Blueprint('nl2sql', __name__)

@nl2sql_bp.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    question = data.get('question', '')
    if not question:
        return jsonify({'error': '请输入问题'}), 400
    operator_role = data.get('operator_role', 'admin')
    operator_name = data.get('operator_name', '管理员')
    operator_id = data.get('operator_id') or None
    result = nl2sql(question, operator_role=operator_role, operator=operator_name, operator_id=operator_id)
    return jsonify(result)
