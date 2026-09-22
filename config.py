import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'event_management_super_secret_key_2026')
    PORT = int(os.getenv('PORT', 5001))
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() in ('true', '1')

    # Database Settings
    DB_TYPE = os.getenv('DB_TYPE', 'mysql').lower()
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'event_management')

    DATABASE_URL = os.getenv('DATABASE_URL', '')
