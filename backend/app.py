from flask import Flask
from flask_cors import CORS
from db import execute
from routes.student import student_bp
from routes.score import score_bp
from routes.alert import alert_bp
from routes.suggestion import suggestion_bp
from routes.nl2sql import nl2sql_bp
from routes.teacher import teacher_bp
from routes.change_history import change_history_bp
from routes.admin import admin_bp
from routes.data_management import data_management_bp

app = Flask(__name__)
CORS(app)

# 数据库迁移：为 risk_alert 表添加 risk_score 列
try:
    execute("ALTER TABLE risk_alert ADD COLUMN risk_score INT DEFAULT 0")
except Exception:
    pass  # 列已存在，忽略

app.register_blueprint(student_bp, url_prefix='/api/students')
app.register_blueprint(score_bp, url_prefix='/api/scores')
app.register_blueprint(alert_bp, url_prefix='/api/alerts')
app.register_blueprint(suggestion_bp, url_prefix='/api/suggestions')
app.register_blueprint(nl2sql_bp, url_prefix='/api/nl2sql')
app.register_blueprint(teacher_bp, url_prefix='/api/teachers')
app.register_blueprint(change_history_bp, url_prefix='/api/change-history')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(data_management_bp, url_prefix='/api/admin/data')

if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)
