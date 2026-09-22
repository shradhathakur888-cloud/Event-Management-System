import uuid
from datetime import date, datetime, timedelta
from database import get_session
from models import User, Category, Venue, Event, Registration, Announcement, Feedback

DEFAULT_CATEGORIES = [
    {"name": "Cultural Fests & Carnivals", "icon": "fa-masks-theater", "color": "#ec4899", "desc": "Mega annual multi-day cultural fests, star celebrity nights & carnivals"},
    {"name": "Music & Band Battles", "icon": "fa-guitar", "color": "#f59e0b", "desc": "Live rock bands, battle of the bands, acoustic sessions & DJ sets"},
    {"name": "Dance & Performing Arts", "icon": "fa-person-booth", "color": "#8b5cf6", "desc": "Classical, folk, hip-hop, western crew battles & choreography"},
    {"name": "Drama, Theatre & Nukkad Natak", "icon": "fa-theater-masks", "color": "#ef4444", "desc": "Street plays, stage dramas, monodrama & satirical comedy skits"},
    {"name": "Literary, Poetry & Stand-Up", "icon": "fa-microphone-lines", "color": "#06b6d4", "desc": "Urdu Ghazals, spoken word poetry, slam sessions & stand-up comedy"},
    {"name": "Fine Arts & Photography", "icon": "fa-palette", "color": "#10b981", "desc": "Canvas painting, graffiti murals, live caricature & photography expos"},
    {"name": "Hackathons & Tech Fests", "icon": "fa-code", "color": "#3b82f6", "desc": "Coding marathons, robotics combat, AI symposiums & cloud workshops"}
]

DEFAULT_VENUES = [
    {"name": "Open Air Amphitheatre", "city": "South Lawn", "capacity": 1000, "address": "Lakeview Cultural Arena"},
    {"name": "APJ Abdul Kalam Grand Auditorium", "city": "Main Campus", "capacity": 500, "address": "Block 1, Central Quad"},
    {"name": "Central Quad Cultural Circle", "city": "Main Plaza", "capacity": 300, "address": "Heritage Garden Stage"},
    {"name": "Alan Turing Innovation Lab", "city": "Tech Complex", "capacity": 80, "address": "Floor 3, CS Department"},
    {"name": "Seminar Hall B", "city": "North Campus", "capacity": 150, "address": "Library Cultural Wing"}
]

def seed_initial_taxonomy():
    """Seeds standard categories and venues."""
    session = get_session()
    
    # Categories
    for c in DEFAULT_CATEGORIES:
        exists = session.query(Category).filter_by(name=c["name"]).first()
        if not exists:
            cat = Category(name=c["name"], icon=c["icon"], color=c["color"], description=c["desc"])
            session.add(cat)
    
    # Venues
    for v in DEFAULT_VENUES:
        exists = session.query(Venue).filter_by(name=v["name"]).first()
        if not exists:
            ven = Venue(name=v["name"], city=v["city"], capacity=v["capacity"], address=v["address"])
            session.add(ven)
    
    session.commit()

def seed_complete_demo_environment():
    """Seeds the 3 roles (Student, Organizer, Admin) and realistic cultural & tech events."""
    session = get_session()
    seed_initial_taxonomy()

    # 1. Admin User
    admin = session.query(User).filter_by(username="admin").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@campus.edu",
            full_name="Dean of Student Affairs (Admin)",
            role="admin",
            interests="Cultural Fests, Governance, Campus Events"
        )
        admin.set_password("admin123")
        session.add(admin)

    # 2. Organizer User
    organizer = session.query(User).filter_by(username="organizer").first()
    if not organizer:
        organizer = User(
            username="organizer",
            email="organizer@campus.edu",
            full_name="Priya Sharma (Fest Convenor)",
            role="organizer",
            interests="Cultural Fests, Music, Dance, Dramatics"
        )
        organizer.set_password("organizer123")
        session.add(organizer)

    # 3. Student User
    student = session.query(User).filter_by(username="student").first()
    if not student:
        student = User(
            username="student",
            email="student@campus.edu",
            full_name="Shradha Thakur (Student)",
            role="student",
            interests="Cultural Fests, Music, Coding, Performing Arts"
        )
        student.set_password("student123")
        session.add(student)

    session.commit()

    # Categories map
    cats = {c.name: c for c in session.query(Category).all()}
    fallback_cat = list(cats.values())[0]

    # Clear previous events to re-seed with rich cultural content
    session.query(Feedback).delete()
    session.query(Announcement).delete()
    session.query(Registration).delete()
    session.query(Event).delete()
    session.commit()

    today = date.today()

    # 1. Mega Cultural Fest: Tarang 2026
    evt_tarang = Event(
        title="Tarang 2026: Grand Annual Inter-College Cultural Fest",
        description="The crown jewel of college festivals! 3 Days of non-stop energy featuring Celebrity Star Night, Battle of the Bands, Pan-India Dance Showdown, Street Play Championship, and 40+ Food and Craft Stalls. Cash prizes worth ₹1,50,000 + Trophies!",
        organizer_id=organizer.id,
        category_id=cats.get("Cultural Fests & Carnivals", fallback_cat).id,
        venue_name="Open Air Amphitheatre",
        date=today + timedelta(days=18),
        start_time="10:00 AM",
        end_time="11:00 PM (3-Day Pass)",
        capacity=600,
        banner_url="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80",
        tags="CulturalFest, StarNight, Celebrity, Carnival, ₹1.5L Prize",
        status="approved"
    )
    session.add(evt_tarang)

    # 2. Rock Music & Band Battle: Dhwani
    evt_dhwani = Event(
        title="Dhwani: Battle of the Bands & Rock Music Fiesta",
        description="High-voltage musical extravaganza! Top college bands clash in rock, fusion, metal, and acoustic melodies. Features guest headliner indie band performance and ₹50,000 champion purse.",
        organizer_id=organizer.id,
        category_id=cats.get("Music & Band Battles", fallback_cat).id,
        venue_name="APJ Abdul Kalam Grand Auditorium",
        date=today + timedelta(days=10),
        start_time="05:30 PM",
        end_time="10:30 PM",
        capacity=350,
        banner_url="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80",
        tags="Music, RockBands, LiveConcert, BattleOfTheBands, ₹50k Prize",
        status="approved"
    )
    session.add(evt_dhwani)

    # 3. Dance Showcase: Nritya-Kala
    evt_nritya = Event(
        title="Nritya-Kala: Classical & Folk Dance Championship",
        description="A breathtaking celebration of Indian classical heritage (Kathak, Bharatanatyam, Odissi) alongside energetic folk dances (Bhangra, Garba) and modern western crew choreographies. ₹40,000 in cash awards.",
        organizer_id=organizer.id,
        category_id=cats.get("Dance & Performing Arts", fallback_cat).id,
        venue_name="APJ Abdul Kalam Grand Auditorium",
        date=today + timedelta(days=14),
        start_time="03:00 PM",
        end_time="08:00 PM",
        capacity=300,
        banner_url="https://images.unsplash.com/photo-1547153760-18fc86324498?w=1200&q=80",
        tags="Dance, Classical, Kathak, Bhangra, PerformingArts, ₹40k Prize",
        status="approved"
    )
    session.add(evt_nritya)

    # 4. Street Play & Drama: Rangmanch
    evt_rangmanch = Event(
        title="Rangmanch: National Street Play (Nukkad Natak) & Theatre Fest",
        description="Powerful social drama and satirical comedy taking over the campus! Renowned NSD judges, stage plays, monodrama, and 12 top college street play teams competing for the Natak Ratna Trophy.",
        organizer_id=organizer.id,
        category_id=cats.get("Drama, Theatre & Nukkad Natak", fallback_cat).id,
        venue_name="Central Quad Cultural Circle",
        date=today + timedelta(days=22),
        start_time="11:00 AM",
        end_time="05:00 PM",
        capacity=250,
        banner_url="https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=1200&q=80",
        tags="Theatre, NukkadNatak, StreetPlay, Acting, Drama, ₹35k Prize",
        status="approved"
    )
    session.add(evt_rangmanch)

    # 5. Food, Pottery & Ethnic Carnival: Sanskriti
    evt_sanskriti = Event(
        title="Sanskriti: Heritage, Regional Food & Pottery Carnival",
        description="Experience the vibrant colors of cultural heritage! Featuring 30+ regional food pop-ups, traditional pottery wheels, ethnic wear fashion ramp walk, mehendi lounge, and folk acoustic melodies.",
        organizer_id=organizer.id,
        category_id=cats.get("Cultural Fests & Carnivals", fallback_cat).id,
        venue_name="Open Air Amphitheatre",
        date=today + timedelta(days=28),
        start_time="12:00 PM",
        end_time="08:00 PM",
        capacity=450,
        banner_url="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80",
        tags="FoodFest, Pottery, EthnicWear, Heritage, Carnival",
        status="approved"
    )
    session.add(evt_sanskriti)

    # 6. Spoken Word & Stand-Up: Kavya-Sandhya
    evt_kavya = Event(
        title="Kavya-Sandhya: Spoken Word, Ghazals & Stand-Up Night",
        description="An evening of soulful Urdu Ghazals, Hindi Kavita, English Slam Poetry, and unfiltered college stand-up comedy. Open mic slots available for student performers!",
        organizer_id=organizer.id,
        category_id=cats.get("Literary, Poetry & Stand-Up", fallback_cat).id,
        venue_name="Seminar Hall B",
        date=today + timedelta(days=8),
        start_time="06:00 PM",
        end_time="09:30 PM",
        capacity=150,
        banner_url="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
        tags="Poetry, Ghazal, StandUp, Comedy, OpenMic",
        status="approved"
    )
    session.add(evt_kavya)

    # 7. Fine Arts & Graffiti: Chitrakala
    evt_chitrakala = Event(
        title="Chitrakala: Canvas Painting, Graffiti & Digital Art Expo",
        description="Express your imagination on massive canvas murals, spray graffiti walls, and live caricature stalls. Includes an on-spot digital illustration showdown with ₹20,000 prize pool.",
        organizer_id=organizer.id,
        category_id=cats.get("Fine Arts & Photography", fallback_cat).id,
        venue_name="Central Quad Cultural Circle",
        date=today + timedelta(days=12),
        start_time="10:00 AM",
        end_time="04:00 PM",
        capacity=80,
        banner_url="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80",
        tags="Painting, Graffiti, FineArts, DigitalArt, ₹20k Prize",
        status="approved"
    )
    session.add(evt_chitrakala)

    # 8. Tech Hackathon: National AI & Cloud Hackathon 2026
    evt_hack = Event(
        title="National AI & Cloud Hackathon 2026",
        description="A 36-hour non-stop hackathon challenging student engineers to build agentic AI, full-stack systems, and distributed cloud applications with ₹1,50,000 in cash prizes.",
        organizer_id=organizer.id,
        category_id=cats.get("Hackathons & Tech Fests", fallback_cat).id,
        venue_name="APJ Abdul Kalam Grand Auditorium",
        date=today + timedelta(days=16),
        start_time="09:00 AM",
        end_time="06:00 PM (Next Day)",
        capacity=150,
        banner_url="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80",
        tags="AI, Cloud, Python, Hackathon, ₹1.5L Prize",
        status="approved"
    )
    session.add(evt_hack)

    # 9. PENDING ADMIN APPROVAL: Euphoria EDM Star Night
    evt_pending = Event(
        title="Euphoria: Star DJ Night & Laser Light Festival",
        description="The ultimate cultural fest finale! Multi-genre electronic dance music with visual laser projection mapping, neon glow giveaways, and top national DJ performance.",
        organizer_id=organizer.id,
        category_id=cats.get("Cultural Fests & Carnivals", fallback_cat).id,
        venue_name="Open Air Amphitheatre",
        date=today + timedelta(days=35),
        start_time="07:00 PM",
        end_time="11:30 PM",
        capacity=800,
        banner_url="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
        tags="EDM, DJNight, LaserFest, Party, Concert",
        status="pending"
    )
    session.add(evt_pending)

    # 10. COMPLETED EVENT: Virasat Classical Sangeet & Sitar Mehfil (Attended with Certificate!)
    evt_completed = Event(
        title="Virasat: Classical Sangeet & Sitar Jugalbandi Mehfil",
        description="An unforgettable sunrise classical concert featuring sitar masters and student accompaniment in Raag Bhairav, followed by masterclass interactions.",
        organizer_id=organizer.id,
        category_id=cats.get("Music & Band Battles", fallback_cat).id,
        venue_name="APJ Abdul Kalam Grand Auditorium",
        date=today - timedelta(days=4),
        start_time="08:00 AM",
        end_time="12:00 PM",
        capacity=120,
        banner_url="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80",
        tags="Classical, Sitar, IndianMusic, Heritage",
        status="approved"
    )
    session.add(evt_completed)

    session.commit()

    # Seed registrations for capacity meters
    # Tarang 2026: 480 registered
    for i in range(48):
        dummy_u = User(username=f"attendee_t_{i}", email=f"t_{i}@college.edu", full_name=f"Fest Attendee {i+1}", role="student")
        session.add(dummy_u)
        session.flush()
        reg = Registration(event_id=evt_tarang.id, user_id=dummy_u.id, status="registered", ticket_code=f"TKT-TRG-{uuid.uuid4().hex[:6].upper()}")
        session.add(reg)

    # Dhwani: 240 registered
    for i in range(24):
        dummy_u = User(username=f"attendee_d_{i}", email=f"d_{i}@college.edu", full_name=f"Music Fan {i+1}", role="student")
        session.add(dummy_u)
        session.flush()
        reg = Registration(event_id=evt_dhwani.id, user_id=dummy_u.id, status="registered", ticket_code=f"TKT-DHW-{uuid.uuid4().hex[:6].upper()}")
        session.add(reg)

    # Student Registrations for Shradha Thakur:
    # 1. Registered for Tarang 2026 (Active Pass)
    reg_shradha_tarang = Registration(
        event_id=evt_tarang.id,
        user_id=student.id,
        status="registered",
        ticket_code="TKT-TARANG-7718A"
    )
    session.add(reg_shradha_tarang)

    # 2. Registered for Dhwani Music Fest (Active Pass)
    reg_shradha_dhwani = Registration(
        event_id=evt_dhwani.id,
        user_id=student.id,
        status="registered",
        ticket_code="TKT-DHWANI-8829B"
    )
    session.add(reg_shradha_dhwani)

    # 3. Attended Virasat Mehfil (Verified Certificate Unlocked!)
    reg_shradha_completed = Registration(
        event_id=evt_completed.id,
        user_id=student.id,
        status="attended",
        ticket_code="TKT-VIRASAT-9930C",
        attended_at=datetime.utcnow() - timedelta(days=4)
    )
    session.add(reg_shradha_completed)

    # Feedback for completed event
    fb = Feedback(
        event_id=evt_completed.id,
        user_id=student.id,
        rating=5,
        comment="Absolutely divine sitar performance! The acoustics in the auditorium were magical. Can't wait for Tarang!"
    )
    session.add(fb)

    # Announcements
    ann = Announcement(
        event_id=evt_tarang.id,
        organizer_id=organizer.id,
        title="Celebrity Star Night Announcement",
        message="Gates open at 04:30 PM for the Star Night concert. Please carry your digital QR Pass for seamless wristband collection!"
    )
    session.add(ann)

    session.commit()
    print("[SEED] Cultural Fests, taxonomy, and realistic demo events seeded successfully!")
