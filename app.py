import os
import uuid
import secrets
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from sqlalchemy import func, or_, and_, desc

from config import Config
from database import setup_database, get_session, get_db_info, test_mysql_connection
from models import Base, User, Category, Venue, Event, Registration, Announcement, Feedback
from seed_data import seed_complete_demo_environment

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR)
app.config.from_object(Config)
CORS(app)

# In-memory session store (token -> user_id)
SESSION_TOKENS = {}

def get_current_user():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1].strip()
    user_id = SESSION_TOKENS.get(token)
    if not user_id:
        return None
    session = get_session()
    return session.get(User, user_id)

def login_required(role=None):
    def decorator(f):
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Authentication required. Please sign in.'}), 401
            if role and user.role != role and user.role != 'admin':
                return jsonify({'error': f'Access denied. Requires {role} privileges.'}), 403
            return f(user, *args, **kwargs)
        decorated_function.__name__ = f.__name__
        return decorated_function
    return decorator

@app.teardown_appcontext
def shutdown_session(exception=None):
    from database import db_session
    if db_session:
        db_session.remove()

# ==========================================
# Frontend SPA Route
# ==========================================
@app.route('/')
def index():
    return render_template('index.html')

# ==========================================
# Database Connection & Status
# ==========================================
@app.route('/api/db/status', methods=['GET'])
def get_db_status():
    return jsonify(get_db_info())

@app.route('/api/db/test-mysql', methods=['POST'])
def test_mysql():
    data = request.json or {}
    host = data.get('host', 'localhost')
    port = int(data.get('port', 3306))
    user = data.get('user', 'root')
    password = data.get('password', '')
    database = data.get('database', 'event_management')

    success, message = test_mysql_connection(host, port, user, password, database)
    if success:
        return jsonify({'success': True, 'message': message, 'info': get_db_info()})
    return jsonify({'success': False, 'message': message}), 400

# ==========================================
# Authentication & Role Management
# ==========================================
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    username = data.get('username', '').strip().lower()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'student').lower()
    interests = data.get('interests', 'Coding, AI, Hackathons')

    if role not in ('student', 'organizer', 'admin'):
        role = 'student'

    if not username or not email or not password or not full_name:
        return jsonify({'error': 'Full name, username, email, and password are required.'}), 400

    session = get_session()
    if session.query(User).filter_by(username=username).first():
        return jsonify({'error': f"Username '{username}' is already taken."}), 400
    if session.query(User).filter_by(email=email).first():
        return jsonify({'error': f"Email '{email}' is already registered."}), 400

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role,
        interests=interests
    )
    user.set_password(password)
    session.add(user)
    session.commit()

    token = secrets.token_hex(24)
    SESSION_TOKENS[token] = user.id

    return jsonify({
        'message': f'Welcome, {full_name}! Account created as {role.capitalize()}.',
        'token': token,
        'user': user.to_dict()
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username_or_email = data.get('username', '').strip().lower()
    password = data.get('password', '')

    if not username_or_email or not password:
        return jsonify({'error': 'Please enter username and password.'}), 400

    session = get_session()
    user = session.query(User).filter(
        or_(
            func.lower(User.username) == username_or_email,
            func.lower(User.email) == username_or_email
        )
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password.'}), 401

    token = secrets.token_hex(24)
    SESSION_TOKENS[token] = user.id

    return jsonify({
        'message': f'Signed in as {user.full_name}',
        'token': token,
        'user': user.to_dict()
    })

@app.route('/api/auth/quick-role', methods=['POST'])
def quick_role_switch():
    """1-Click switch between Student, Organizer, and Admin for easy testing."""
    data = request.json or {}
    role = data.get('role', 'student').lower()
    
    session = get_session()
    username = 'student' if role == 'student' else 'organizer' if role == 'organizer' else 'admin'
    user = session.query(User).filter_by(username=username).first()

    if not user:
        seed_complete_demo_environment()
        user = session.query(User).filter_by(username=username).first()

    token = secrets.token_hex(24)
    SESSION_TOKENS[token] = user.id

    return jsonify({
        'message': f'Switched to {user.role.upper()}: {user.full_name}',
        'token': token,
        'user': user.to_dict()
    })

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'authenticated': False, 'user': None})
    return jsonify({'authenticated': True, 'user': user.to_dict()})

# ==========================================
# Categories & Discovery API
# ==========================================
@app.route('/api/categories', methods=['GET'])
def get_categories():
    session = get_session()
    cats = session.query(Category).all()
    return jsonify([c.to_dict() for c in cats])

# ==========================================
# Events API (Public & Student)
# ==========================================
@app.route('/api/events', methods=['GET'])
def get_events():
    session = get_session()
    search = request.args.get('search', '').strip()
    category_id = request.args.get('category_id')
    status = request.args.get('status', 'approved') # Only approved events visible to public
    venue = request.args.get('venue', '').strip()
    recommended = request.args.get('recommended', 'false').lower() == 'true'

    query = session.query(Event)

    if status and status != 'all':
        query = query.filter(Event.status == status)

    if category_id and category_id.isdigit():
        query = query.filter(Event.category_id == int(category_id))

    if venue:
        query = query.filter(Event.venue_name.ilike(f"%{venue}%"))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Event.title.ilike(pattern),
                Event.description.ilike(pattern),
                Event.tags.ilike(pattern)
            )
        )

    # If recommended requested for signed-in user
    user = get_current_user()
    if recommended and user and user.interests:
        interest_filters = [Event.tags.ilike(f"%{i.strip()}%") for i in user.interests.split(',') if i.strip()]
        if interest_filters:
            query = query.filter(or_(*interest_filters))

    events = query.order_by(Event.date.asc(), Event.id.desc()).all()
    return jsonify([e.to_dict() for e in events])

@app.route('/api/events/<int:event_id>', methods=['GET'])
def get_event_detail(event_id):
    session = get_session()
    event = session.get(Event, event_id)
    if not event:
        return jsonify({'error': 'Event not found.'}), 404
    
    # Check if current user is registered
    user = get_current_user()
    user_reg = None
    if user:
        reg = session.query(Registration).filter_by(event_id=event.id, user_id=user.id).first()
        if reg:
            user_reg = reg.to_dict()

    data = event.to_dict(include_details=True)
    data['user_registration'] = user_reg
    return jsonify(data)

# ==========================================
# Registration, QR Passes & Waitlisting
# ==========================================
@app.route('/api/events/<int:event_id>/register', methods=['POST'])
@login_required('student')
def register_for_event(user, event_id):
    session = get_session()
    event = session.get(Event, event_id)
    if not event:
        return jsonify({'error': 'Event not found.'}), 404

    if event.status != 'approved':
        return jsonify({'error': 'This event is not yet approved for registrations.'}), 400

    # Check if already registered
    existing_reg = session.query(Registration).filter_by(event_id=event.id, user_id=user.id).first()
    if existing_reg:
        if existing_reg.status in ('registered', 'waitlisted', 'attended'):
            return jsonify({'error': f'You are already {existing_reg.status} for this event.'}), 400
        else:
            # Re-activate cancelled registration
            reg = existing_reg
    else:
        reg = Registration(event_id=event.id, user_id=user.id)
        session.add(reg)

    # Check Capacity
    active_regs_count = session.query(Registration).filter(
        Registration.event_id == event.id,
        Registration.status.in_(['registered', 'attended'])
    ).count()

    # Generate unique ticket code
    ticket_code = f"EVT-{event.id}-{uuid.uuid4().hex[:6].upper()}"
    reg.ticket_code = ticket_code

    if active_regs_count < event.capacity:
        reg.status = 'registered'
        message = f"Registration successful! Your QR Entry Pass has been generated ({ticket_code})."
    else:
        reg.status = 'waitlisted'
        waitlist_pos = session.query(Registration).filter_by(event_id=event.id, status='waitlisted').count() + 1
        message = f"Capacity full! You have been placed on the Waitlist (Position #{waitlist_pos}). We will auto-promote you if a spot opens up."

    session.commit()
    return jsonify({
        'message': message,
        'registration': reg.to_dict(),
        'status': reg.status
    }), 201

@app.route('/api/events/<int:event_id>/cancel', methods=['POST'])
@login_required('student')
def cancel_registration(user, event_id):
    session = get_session()
    reg = session.query(Registration).filter_by(event_id=event_id, user_id=user.id).first()
    if not reg or reg.status == 'cancelled':
        return jsonify({'error': 'Active registration not found.'}), 404

    previous_status = reg.status
    reg.status = 'cancelled'
    session.commit()

    # Auto-promote first waitlisted student if a confirmed attendee cancelled!
    promoted_msg = ""
    if previous_status == 'registered':
        first_waitlist = session.query(Registration).filter_by(event_id=event_id, status='waitlisted').order_by(Registration.registered_at.asc()).first()
        if first_waitlist:
            first_waitlist.status = 'registered'
            session.commit()
            promoted_msg = f" Waitlisted attendee {first_waitlist.user.full_name} was promoted to registered!"

    return jsonify({'message': f'Registration cancelled successfully.{promoted_msg}'})

@app.route('/api/student/my-registrations', methods=['GET'])
@login_required('student')
def get_my_registrations(user):
    session = get_session()
    regs = session.query(Registration).filter_by(user_id=user.id).order_by(Registration.registered_at.desc()).all()
    return jsonify([r.to_dict() for r in regs])

# ==========================================
# Feedback & Ratings API
# ==========================================
@app.route('/api/events/<int:event_id>/feedback', methods=['POST'])
@login_required('student')
def submit_feedback(user, event_id):
    session = get_session()
    event = session.get(Event, event_id)
    if not event:
        return jsonify({'error': 'Event not found.'}), 404

    # Verify user attended event
    reg = session.query(Registration).filter_by(event_id=event.id, user_id=user.id).first()
    if not reg or reg.status != 'attended':
        return jsonify({'error': 'Feedback can only be submitted after attending the event.'}), 400

    data = request.json or {}
    rating = int(data.get('rating', 5))
    comment = data.get('comment', '').strip()

    if rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be between 1 and 5 stars.'}), 400

    existing_fb = session.query(Feedback).filter_by(event_id=event.id, user_id=user.id).first()
    if existing_fb:
        existing_fb.rating = rating
        existing_fb.comment = comment
    else:
        fb = Feedback(event_id=event.id, user_id=user.id, rating=rating, comment=comment)
        session.add(fb)

    session.commit()
    return jsonify({'message': 'Thank you for your rating & review!'})

# ==========================================
# Event Organizer API
# ==========================================
@app.route('/api/organizer/analytics', methods=['GET'])
@login_required('organizer')
def get_organizer_analytics(user):
    session = get_session()
    # If admin, show all events; if organizer, show their events
    query = session.query(Event)
    if user.role == 'organizer':
        query = query.filter_by(organizer_id=user.id)
    
    my_events = query.all()
    event_ids = [e.id for e in my_events]

    total_events = len(my_events)
    total_registrations = session.query(Registration).filter(
        Registration.event_id.in_(event_ids),
        Registration.status.in_(['registered', 'attended'])
    ).count() if event_ids else 0

    total_attended = session.query(Registration).filter(
        Registration.event_id.in_(event_ids),
        Registration.status == 'attended'
    ).count() if event_ids else 0

    # Calculate average rating
    all_ratings = session.query(Feedback.rating).filter(Feedback.event_id.in_(event_ids)).all() if event_ids else []
    avg_rating = round(sum([r[0] for r in all_ratings]) / len(all_ratings), 1) if all_ratings else 0.0

    # Upcoming events with capacity meters
    today = date.today()
    upcoming = []
    for e in my_events:
        if e.date >= today:
            d = e.to_dict()
            d['registered'] = d.get('registered_count', 0)
            upcoming.append(d)
    upcoming.sort(key=lambda x: x['date'])

    # Registration trends over past 7 days (for Chart.js graph)
    trend_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        count = session.query(Registration).filter(
            Registration.event_id.in_(event_ids),
            Registration.registered_at >= day_start,
            Registration.registered_at <= day_end
        ).count() if event_ids else 0
        trend_data.append({
            'date': day.strftime('%b %d'),
            'registrations': count
        })

    return jsonify({
        'summary': {
            'total_events': total_events,
            'total_registrations': total_registrations,
            'total_attended': total_attended,
            'average_rating': avg_rating
        },
        'upcoming_events': upcoming[:5],
        'registration_trend': trend_data,
        'events': [e.to_dict() for e in my_events]
    })

@app.route('/api/organizer/events', methods=['POST'])
@login_required('organizer')
def create_event(user):
    session = get_session()
    data = request.json or {}
    
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category_id = data.get('category_id')
    venue_name = data.get('venue_name', 'Campus Auditorium').strip()
    event_date_str = data.get('date')
    start_time = data.get('start_time', '10:00 AM')
    end_time = data.get('end_time', '05:00 PM')
    capacity = int(data.get('capacity', 100))
    banner_url = data.get('banner_url', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80')
    tags = data.get('tags', 'Tech, Innovation')

    if not title or not description or not category_id or not event_date_str:
        return jsonify({'error': 'Title, description, category, and date are required.'}), 400

    event_date = datetime.strptime(event_date_str, '%Y-%m-%d').date()

    # Workflow requirement: Organizer creates event -> Status is PENDING for Admin approval!
    status = 'approved' if user.role == 'admin' else 'pending'

    event = Event(
        title=title,
        description=description,
        organizer_id=user.id,
        category_id=int(category_id),
        venue_name=venue_name,
        date=event_date,
        start_time=start_time,
        end_time=end_time,
        capacity=capacity,
        banner_url=banner_url,
        tags=tags,
        status=status
    )
    session.add(event)
    session.commit()

    msg = "Event created and live!" if status == 'approved' else "Event submitted successfully! It will become visible once approved by Admin."
    return jsonify({'message': msg, 'event': event.to_dict()}), 201

@app.route('/api/organizer/events/<int:event_id>/participants', methods=['GET'])
@login_required('organizer')
def get_event_participants(user, event_id):
    session = get_session()
    event = session.get(Event, event_id)
    if not event:
        return jsonify({'error': 'Event not found.'}), 404

    regs = session.query(Registration).filter_by(event_id=event_id).all()
    return jsonify([r.to_dict() for r in regs])

@app.route('/api/organizer/check-in', methods=['POST'])
@login_required('organizer')
def scan_qr_checkin(user):
    """Scan and verify participant QR entry pass."""
    session = get_session()
    data = request.json or {}
    ticket_code = data.get('ticket_code', '').strip().upper()

    if not ticket_code:
        return jsonify({'error': 'Please provide a valid ticket code or scan QR pass.'}), 400

    reg = session.query(Registration).filter_by(ticket_code=ticket_code).first()
    if not reg:
        return jsonify({'error': f"Ticket '{ticket_code}' not found in system."}), 404

    if reg.status == 'attended':
        return jsonify({
            'already_attended': True,
            'message': f"Attendee {reg.user.full_name} has ALREADY been checked in at {reg.attended_at.strftime('%I:%M %p')}.",
            'registration': reg.to_dict()
        }), 200

    if reg.status != 'registered':
        return jsonify({'error': f"Cannot check in: ticket status is '{reg.status}'."}), 400

    # Mark attendance!
    reg.status = 'attended'
    reg.attended_at = datetime.utcnow()
    session.commit()

    return jsonify({
        'success': True,
        'message': f"✓ Check-in verified! Attendance recorded for {reg.user.full_name}. Certificate has been unlocked!",
        'registration': reg.to_dict()
    })

@app.route('/api/organizer/events/<int:event_id>/announcements', methods=['POST'])
@login_required('organizer')
def post_announcement(user, event_id):
    session = get_session()
    data = request.json or {}
    title = data.get('title', '').strip()
    message = data.get('message', '').strip()

    if not title or not message:
        return jsonify({'error': 'Title and message are required.'}), 400

    ann = Announcement(event_id=event_id, organizer_id=user.id, title=title, message=message)
    session.add(ann)
    session.commit()
    return jsonify({'message': 'Announcement broadcasted to attendees!', 'announcement': ann.to_dict()}), 201

# ==========================================
# Admin API (Approval Workflow & System Stats)
# ==========================================
@app.route('/api/admin/events/pending', methods=['GET'])
@login_required('admin')
def get_pending_events(user):
    session = get_session()
    pending = session.query(Event).filter_by(status='pending').order_by(Event.created_at.desc()).all()
    return jsonify([e.to_dict() for e in pending])

@app.route('/api/admin/events/<int:event_id>/approve', methods=['POST'])
@login_required('admin')
def approve_event(user, event_id):
    session = get_session()
    event = session.get(Event, event_id)
    if not event:
        return jsonify({'error': 'Event not found.'}), 404

    event.status = 'approved'
    session.commit()
    return jsonify({'message': f"Event '{event.title}' approved and is now visible to participants!"})

@app.route('/api/admin/events/<int:event_id>/reject', methods=['POST'])
@login_required('admin')
def reject_event(user, event_id):
    session = get_session()
    data = request.json or {}
    reason = data.get('reason', 'Does not meet campus policy guidelines.')
    
    event = session.get(Event, event_id)
    if not event:
        return jsonify({'error': 'Event not found.'}), 404

    event.status = 'rejected'
    event.rejection_reason = reason
    session.commit()
    return jsonify({'message': f"Event '{event.title}' has been rejected."})

@app.route('/api/admin/stats', methods=['GET'])
@login_required('admin')
def get_admin_stats(user):
    session = get_session()
    total_users = session.query(User).count()
    students_count = session.query(User).filter_by(role='student').count()
    organizers_count = session.query(User).filter_by(role='organizer').count()
    
    total_events = session.query(Event).count()
    approved_events = session.query(Event).filter_by(status='approved').count()
    pending_events = session.query(Event).filter_by(status='pending').count()

    total_tickets = session.query(Registration).filter(Registration.status.in_(['registered', 'attended'])).count()
    total_attended = session.query(Registration).filter_by(status='attended').count()
    overall_attendance_rate = round((total_attended / total_tickets * 100), 1) if total_tickets > 0 else 0.0

    return jsonify({
        'total_users': total_users,
        'students_count': students_count,
        'organizers_count': organizers_count,
        'total_events': total_events,
        'approved_events': approved_events,
        'pending_events': pending_events,
        'total_tickets': total_tickets,
        'total_attended': total_attended,
        'overall_attendance_rate': overall_attendance_rate
    })

@app.route('/api/admin/users', methods=['GET'])
@login_required('admin')
def get_all_users(user):
    session = get_session()
    users = session.query(User).order_by(User.id.desc()).all()
    return jsonify([u.to_dict() for u in users])

@app.route('/api/admin/users/<int:user_id>/toggle-role', methods=['POST'])
@login_required('admin')
def toggle_user_role(admin_user, user_id):
    session = get_session()
    u = session.get(User, user_id)
    if not u:
        return jsonify({'error': 'User not found.'}), 404
    
    if u.role == 'student':
        u.role = 'organizer'
    elif u.role == 'organizer':
        u.role = 'student'
    session.commit()
    return jsonify({'message': f"Updated {u.full_name}'s role to {u.role}.", 'user': u.to_dict()})

if __name__ == '__main__':
    setup_database()
    app.run(host='0.0.0.0', port=Config.PORT, debug=True)
