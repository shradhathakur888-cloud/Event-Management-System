from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
from database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(20), default='student', index=True) # 'student', 'organizer', 'admin'
    avatar_url = Column(String(255), nullable=True)
    interests = Column(String(255), default='Coding, AI, Hackathons')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    events_organized = relationship('Event', back_populates='organizer', cascade='all, delete-orphan')
    registrations = relationship('Registration', back_populates='user', cascade='all, delete-orphan')
    feedbacks = relationship('Feedback', back_populates='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'avatar_url': self.avatar_url or '',
            'interests': [i.strip() for i in self.interests.split(',') if i.strip()] if self.interests else [],
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

class Category(Base):
    __tablename__ = 'categories'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(80), unique=True, nullable=False)
    icon = Column(String(50), default='fa-calendar-star')
    color = Column(String(30), default='#6366f1')
    description = Column(String(255), nullable=True)

    # Relationships
    events = relationship('Event', back_populates='category')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'icon': self.icon,
            'color': self.color,
            'description': self.description or ''
        }

class Venue(Base):
    __tablename__ = 'venues'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(80), default='Tech Campus')
    capacity = Column(Integer, default=500)

    # Relationships
    events = relationship('Event', back_populates='venue')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address or '',
            'city': self.city,
            'capacity': self.capacity
        }

class Event(Base):
    __tablename__ = 'events'

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    organizer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='RESTRICT'), nullable=False, index=True)
    venue_id = Column(Integer, ForeignKey('venues.id', ondelete='SET NULL'), nullable=True)
    venue_name = Column(String(150), default='Auditorium Hall A')
    date = Column(Date, nullable=False, index=True)
    start_time = Column(String(20), default='10:00 AM')
    end_time = Column(String(20), default='05:00 PM')
    capacity = Column(Integer, default=100)
    banner_url = Column(String(500), default='https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80')
    tags = Column(String(255), default='Tech, Coding, Innovation')
    status = Column(String(30), default='pending', index=True) # 'pending', 'approved', 'rejected', 'completed'
    rejection_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organizer = relationship('User', back_populates='events_organized')
    category = relationship('Category', back_populates='events')
    venue = relationship('Venue', back_populates='events')
    registrations = relationship('Registration', back_populates='event', cascade='all, delete-orphan')
    announcements = relationship('Announcement', back_populates='event', cascade='all, delete-orphan')
    feedbacks = relationship('Feedback', back_populates='event', cascade='all, delete-orphan')

    def to_dict(self, include_details=False):
        reg_count = len([r for r in self.registrations if r.status in ('registered', 'attended')])
        waitlist_count = len([r for r in self.registrations if r.status == 'waitlisted'])
        attended_count = len([r for r in self.registrations if r.status == 'attended'])
        
        ratings = [f.rating for f in self.feedbacks]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'organizer_id': self.organizer_id,
            'organizer_name': self.organizer.full_name if self.organizer else 'Organizer',
            'organizer_email': self.organizer.email if self.organizer else '',
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else 'General',
            'category_icon': self.category.icon if self.category else 'fa-calendar',
            'category_color': self.category.color if self.category else '#6366f1',
            'venue_name': self.venue_name,
            'date': self.date.strftime('%Y-%m-%d') if self.date else '',
            'start_time': self.start_time,
            'end_time': self.end_time,
            'capacity': self.capacity,
            'registered_count': reg_count,
            'registration_count': reg_count,
            'waitlist_count': waitlist_count,
            'attended_count': attended_count,
            'is_full': reg_count >= self.capacity,
            'banner_url': self.banner_url,
            'tags': [t.strip() for t in self.tags.split(',') if t.strip()] if self.tags else [],
            'status': self.status,
            'rejection_reason': self.rejection_reason or '',
            'average_rating': avg_rating,
            'feedback_count': len(ratings),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

        if include_details:
            data['announcements'] = [a.to_dict() for a in self.announcements]
            data['feedbacks'] = [f.to_dict() for f in self.feedbacks]

        return data

class Registration(Base):
    __tablename__ = 'registrations'

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey('events.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    status = Column(String(30), default='registered', index=True) # 'registered', 'waitlisted', 'attended', 'cancelled'
    ticket_code = Column(String(64), unique=True, nullable=False, index=True)
    registered_at = Column(DateTime, default=datetime.utcnow)
    attended_at = Column(DateTime, nullable=True)

    # Relationships
    event = relationship('Event', back_populates='registrations')
    user = relationship('User', back_populates='registrations')

    def to_dict(self):
        ev_title = self.event.title if self.event else ''
        ev_date = self.event.date.strftime('%Y-%m-%d') if self.event and self.event.date else ''
        ev_time = f"{self.event.start_time} - {self.event.end_time}" if self.event else ''
        ev_venue = self.event.venue_name if self.event else ''
        ev_banner = self.event.banner_url if self.event else ''
        u_name = self.user.full_name if self.user else ''
        u_email = self.user.email if self.user else ''

        return {
            'id': self.id,
            'event_id': self.event_id,
            'event_title': ev_title,
            'event_date': ev_date,
            'event_time': ev_time,
            'venue_name': ev_venue,
            'banner_url': ev_banner,
            'event': {
                'id': self.event_id,
                'title': ev_title,
                'date': ev_date,
                'start_time': self.event.start_time if self.event else '',
                'end_time': self.event.end_time if self.event else '',
                'venue_name': ev_venue,
                'banner_url': ev_banner
            },
            'user_id': self.user_id,
            'user_name': u_name,
            'user_email': u_email,
            'user': {
                'id': self.user_id,
                'full_name': u_name,
                'email': u_email
            },
            'status': self.status,
            'ticket_code': self.ticket_code,
            'registered_at': self.registered_at.strftime('%Y-%m-%d %H:%M:%S') if self.registered_at else None,
            'attended_at': self.attended_at.strftime('%Y-%m-%d %H:%M:%S') if self.attended_at else None,
            'can_download_certificate': self.status == 'attended'
        }

class Announcement(Base):
    __tablename__ = 'announcements'

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey('events.id', ondelete='CASCADE'), nullable=False, index=True)
    organizer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship('Event', back_populates='announcements')

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'title': self.title,
            'message': self.message,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

class Feedback(Base):
    __tablename__ = 'feedbacks'

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey('events.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    rating = Column(Integer, nullable=False) # 1 to 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship('Event', back_populates='feedbacks')
    user = relationship('User', back_populates='feedbacks')

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else 'Student',
            'rating': self.rating,
            'comment': self.comment or '',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
