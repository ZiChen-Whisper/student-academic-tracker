from flask import Blueprint, request, jsonify

nl2sql_bp = Blueprint('nl2sql', __name__)

@nl2sql_bp.route('/query', methods=['POST'])
def query():
    return jsonify({'message': 'NL2SQL功能待实现'})
