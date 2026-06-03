from flask import Blueprint, request, jsonify
from db import query_all

alert_bp = Blueprint('alert', __name__)

@alert_bp.route('/', methods=['GET'])
def get_alerts():
    risk_level = request.args.get('risk_level', '')
    sql = "SELECT * FROM risk_alert"
    params = []
    if risk_level:
        sql += " WHERE risk_level = %s"
        params.append(risk_level)
    sql += " ORDER BY alert_time DESC"
    alerts = query_all(sql, params if params else None)
    return jsonify(alerts)
