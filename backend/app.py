from flask import Flask
from flask_cors import CORS
from routes.student import student_bp
from routes.score import score_bp
from routes.alert import alert_bp
from routes.suggestion import suggestion_bp
from routes.nl2sql import nl2sql_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(student_bp, url_prefix='/api/students')
app.register_blueprint(score_bp, url_prefix='/api/scores')
app.register_blueprint(alert_bp, url_prefix='/api/alerts')
app.register_blueprint(suggestion_bp, url_prefix='/api/suggestions')
app.register_blueprint(nl2sql_bp, url_prefix='/api/nl2sql')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
