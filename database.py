import os
import pymysql
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from config import Config

Base = declarative_base()

engine = None
db_session = None
CURRENT_DB_INFO = {
    "type": "none",
    "connected": False,
    "database": "",
    "host": "",
    "message": ""
}

def create_mysql_database_if_not_exists(host, port, user, password, database):
    """Attempt to create database on MySQL server before connecting with SQLAlchemy."""
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        charset='utf8mb4',
        connect_timeout=3
    )
    with conn.cursor() as cursor:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    conn.commit()
    conn.close()

def setup_database():
    global engine, db_session, CURRENT_DB_INFO

    # 1. PostgreSQL check
    if Config.DATABASE_URL and Config.DATABASE_URL.startswith(('postgresql://', 'postgres://')):
        try:
            url = Config.DATABASE_URL.replace('postgres://', 'postgresql+psycopg2://')
            if not url.startswith('postgresql+psycopg2://'):
                url = url.replace('postgresql://', 'postgresql+psycopg2://')
            eng = create_engine(url, pool_pre_ping=True, pool_recycle=1800)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = eng
            db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
            CURRENT_DB_INFO.update({
                "type": "PostgreSQL",
                "connected": True,
                "database": Config.DATABASE_URL.split('/')[-1].split('?')[0],
                "host": "PostgreSQL Server",
                "message": "Connected successfully to PostgreSQL database."
            })
            print("[DB] Connected to PostgreSQL successfully!")
            return
        except Exception as e:
            print(f"[DB] PostgreSQL connection notice: {e}")

    # 2. MySQL check
    if Config.DB_TYPE in ('mysql', 'auto'):
        try:
            create_mysql_database_if_not_exists(
                Config.MYSQL_HOST,
                Config.MYSQL_PORT,
                Config.MYSQL_USER,
                Config.MYSQL_PASSWORD,
                Config.MYSQL_DATABASE
            )
            mysql_url = f"mysql+pymysql://{Config.MYSQL_USER}:{Config.MYSQL_PASSWORD}@{Config.MYSQL_HOST}:{Config.MYSQL_PORT}/{Config.MYSQL_DATABASE}?charset=utf8mb4"
            eng = create_engine(mysql_url, pool_pre_ping=True, pool_recycle=1800)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = eng
            db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
            CURRENT_DB_INFO.update({
                "type": "MySQL 8.0",
                "connected": True,
                "database": Config.MYSQL_DATABASE,
                "host": f"{Config.MYSQL_HOST}:{Config.MYSQL_PORT}",
                "message": f"Connected to MySQL database '{Config.MYSQL_DATABASE}' as '{Config.MYSQL_USER}'."
            })
            print(f"[DB] Connected to MySQL successfully on {Config.MYSQL_HOST}:{Config.MYSQL_PORT}")
            return
        except Exception as e:
            print(f"[DB] Notice: MySQL connection could not be established ({e}).")
            CURRENT_DB_INFO.update({
                "type": "SQLite (Fallback)",
                "connected": True,
                "database": "event_management.db",
                "host": "Local File",
                "message": f"Operating in SQLite mode. To link your active MySQL80 service, set your password in backend/.env or the Settings dialog. (MySQL reason: {str(e)})"
            })

    # 3. SQLite Fallback (Runs immediately without dependencies)
    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'event_management.db'))
    sqlite_url = f"sqlite:///{sqlite_path}"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    if CURRENT_DB_INFO["type"] == "none":
        CURRENT_DB_INFO.update({
            "type": "SQLite",
            "connected": True,
            "database": "event_management.db",
            "host": "Local File",
            "message": "Connected to SQLite database."
        })
    print(f"[DB] Using database: {CURRENT_DB_INFO['type']}")

def get_engine():
    global engine
    if engine is None:
        setup_database()
    return engine

def get_session():
    global db_session
    if db_session is None:
        setup_database()
    return db_session

def get_db_info():
    global CURRENT_DB_INFO, engine
    if engine is None:
        setup_database()
    info = dict(CURRENT_DB_INFO)
    info['engine'] = 'sqlite' if 'SQLite' in info.get('type', '') else 'mysql'
    info['status'] = 'connected' if info.get('connected') else 'disconnected'
    return info

def test_mysql_connection(host, port, user, password, database):
    """Test and switch connection to MySQL dynamically from UI settings."""
    global engine, db_session, CURRENT_DB_INFO
    try:
        create_mysql_database_if_not_exists(host, port, user, password, database)
        mysql_url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset=utf8mb4"
        eng = create_engine(mysql_url, pool_pre_ping=True, pool_recycle=1800)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))

        engine = eng
        db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

        from models import Base
        Base.metadata.create_all(bind=engine)
        from seed_data import seed_initial_taxonomy
        seed_initial_taxonomy()

        CURRENT_DB_INFO.update({
            "type": "MySQL 8.0",
            "connected": True,
            "database": database,
            "host": f"{host}:{port}",
            "message": f"Successfully linked to MySQL database '{database}' on {host}!"
        })
        return True, CURRENT_DB_INFO["message"]
    except Exception as e:
        return False, str(e)
