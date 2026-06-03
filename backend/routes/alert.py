from flask import Blueprint, request, jsonify
from db import query_all, query_one, execute
from services.risk_service import calculate_risk_for_all, train_risk_model

alert_bp = Blueprint('alert', __name__)


@alert_bp.route('/', methods=['GET'])
def get_alerts():
    """查询预警列表，可选参数 risk_level / student_id 筛选"""
    risk_level = request.args.get('risk_level', '')
    student_id = request.args.get('student_id', '')
    conditions = []
    params = []
    if risk_level:
        conditions.append("risk_level = %s")
        params.append(risk_level)
    if student_id:
        conditions.append("student_id = %s")
        params.append(student_id)
    sql = "SELECT * FROM risk_alert"
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY alert_time DESC"
    alerts = query_all(sql, params if params else None)
    return jsonify(alerts)


@alert_bp.route('/generate', methods=['POST'])
def generate_alerts():
    """为所有学生重新生成预警"""
    try:
        alert_list = calculate_risk_for_all()
        # 统计各等级数量
        stats = {'high': 0, 'medium': 0, 'low': 0}
        for alert in alert_list:
            stats[alert['risk_level']] += 1
        return jsonify({
            'message': '预警生成成功',
            'total': len(alert_list),
            'stats': stats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alert_bp.route('/<int:alert_id>/intervene', methods=['PUT'])
def intervene_alert(alert_id):
    """更新干预状态和措施"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请提供 JSON 数据'}), 400

    status = data.get('intervention_status')
    measure = data.get('intervention_measure', '')

    if status not in ('pending', 'in_progress', 'completed'):
        return jsonify({'error': 'intervention_status 必须为 pending/in_progress/completed'}), 400

    # 检查预警是否存在
    alert = query_one("SELECT alert_id FROM risk_alert WHERE alert_id = %s", (alert_id,))
    if not alert:
        return jsonify({'error': f'预警 ID {alert_id} 不存在'}), 404

    execute(
        "UPDATE risk_alert SET intervention_status = %s, intervention_measure = %s WHERE alert_id = %s",
        (status, measure, alert_id)
    )
    return jsonify({'message': '干预状态更新成功'})


@alert_bp.route('/stats', methods=['GET'])
def get_alert_stats():
    """预警统计（按风险等级分组计数）"""
    stats = query_all(
        "SELECT risk_level, COUNT(*) AS count FROM risk_alert GROUP BY risk_level"
    )
    result = {'high': 0, 'medium': 0, 'low': 0}
    for row in stats:
        result[row['risk_level']] = row['count']
    return jsonify(result)


@alert_bp.route('/train-model', methods=['POST'])
def train_model():
    """训练 ML 风险预警模型（可选功能）"""
    try:
        result = train_risk_model()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
