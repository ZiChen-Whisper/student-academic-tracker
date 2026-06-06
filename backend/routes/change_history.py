from flask import Blueprint, request, jsonify
from services.change_history_service import get_recent_changes, get_change_count

change_history_bp = Blueprint('change_history', __name__)


@change_history_bp.route('/', methods=['GET'])
def list_changes():
    """查询变更历史列表，支持分页"""
    limit = request.args.get('limit', 10, type=int)
    offset = request.args.get('offset', 0, type=int)
    limit = min(limit, 50)  # 最多50条
    changes = get_recent_changes(limit=limit, offset=offset)
    total = get_change_count()
    return jsonify({
        'data': changes,
        'total': total,
    })
