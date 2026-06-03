from flask import Blueprint, request, jsonify
from db import query_all

suggestion_bp = Blueprint('suggestion', __name__)

@suggestion_bp.route('/<student_id>', methods=['GET'])
def get_suggestions(student_id):
    suggestions = query_all(
        "SELECT * FROM learning_suggestion WHERE student_id = %s ORDER BY generate_time DESC",
        (student_id,)
    )
    return jsonify(suggestions)
