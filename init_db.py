from database import setup_database, get_engine
from models import Base
from seed_data import seed_complete_demo_environment

def init():
    print("[INIT] Setting up Event Management database connection...")
    setup_database()
    engine = get_engine()
    print("[INIT] Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("[INIT] Seeding demo environment (Student, Organizer, Admin, Events)...")
    seed_complete_demo_environment()
    print("[INIT] Event Management System database initialized successfully!")

if __name__ == '__main__':
    init()
