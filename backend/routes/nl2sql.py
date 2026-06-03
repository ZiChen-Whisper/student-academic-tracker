from flask import Blueprint, request, jsonify
from services.nl2sql_service import nl2sql

nl2sql_bp = Blueprint('nl2sql', __name__)

@nl2sql_bp.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    question = data.get('question', '')
    if not question:
        return jsonify({'error': '请输入问题'}), 400
    result = nl2sql(question)
    return jsonify(result)
