import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'student_academic_tracker')
}

LLM_CONFIG = {
    'api_key': os.getenv('LLM_API_KEY', ''),
    'base_url': os.getenv('LLM_BASE_URL', 'https://api.deepseek.com'),
    'model': os.getenv('LLM_MODEL', 'deepseek-chat')
}
