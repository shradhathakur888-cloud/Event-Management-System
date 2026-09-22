// ==========================================================================
// NexEvent - Modern Event Management System (React 18 Frontend)
// Complete Multi-Role Workflow: Student, Organizer, Admin
// Crafted with visual excellence & modern UI aesthetics
// Made By Shradha Thakur
// ==========================================================================

const { useState, useEffect, useRef } = React;

// Main App Component
function App() {
    // Auth State
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('nexevent_token') || '');
    const [theme, setTheme] = useState(localStorage.getItem('nexevent_theme') || 'dark');
    
    // Navigation State
    const [activeTab, setActiveTab] = useState('browse'); // browse, my-events, dashboard, admin-pending, admin-users
    
    // Data State
    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [organizerAnalytics, setOrganizerAnalytics] = useState(null);
    const [pendingEvents, setPendingEvents] = useState([]);
    const [adminStats, setAdminStats] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [dbInfo, setDbInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modals
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [authRole, setAuthRole] = useState('student');
    const [authForm, setAuthForm] = useState({ username: '', password: '', full_name: '', email: '' });

    const [eventDetailModal, setEventDetailModal] = useState(null);
    const [createEventModal, setCreateEventModal] = useState(false);
    const [ticketPassModal, setTicketPassModal] = useState(null);
    const [certificateModal, setCertificateModal] = useState(null);
    const [scannerModal, setScannerModal] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState(null);
    const [announcementModal, setAnnouncementModal] = useState(null);
    const [participantsModal, setParticipantsModal] = useState(null);
    const [dbSettingsModal, setDbSettingsModal] = useState(false);

    // Form inputs for modals
    const [newEventForm, setNewEventForm] = useState({
        title: '', description: '', category_id: '1', venue_name: 'Campus Auditorium',
        date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        start_time: '10:00 AM', end_time: '05:00 PM', capacity: 150,
        banner_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
        tags: 'Tech, Innovation, Workshop'
    });
    const [manualTicketInput, setManualTicketInput] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '' });
    const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
    const [mysqlConfig, setMysqlConfig] = useState({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'event_management_db' });

    // Toast Notifications
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    // Apply Theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('nexevent_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // Initial load: Fetch current user & categories
    useEffect(() => {
        fetchDbStatus();
        fetchCategories();
        if (token) {
            fetchCurrentUser(token);
        } else {
            // Default quick login as student for seamless first experience
            quickRoleLogin('student');
        }
    }, []);

    // Refresh data when user changes or tab changes
    useEffect(() => {
        if (user) {
            if (user.role === 'student') {
                if (activeTab === 'browse') fetchEvents();
                if (activeTab === 'my-events') fetchMyRegistrations();
            } else if (user.role === 'organizer') {
                if (activeTab === 'dashboard' || activeTab === 'browse') fetchOrganizerAnalytics();
                fetchEvents();
            } else if (user.role === 'admin') {
                if (activeTab === 'admin-pending' || activeTab === 'browse') fetchPendingEvents();
                if (activeTab === 'dashboard') fetchAdminStats();
                if (activeTab === 'admin-users') fetchAllUsers();
                fetchEvents();
            }
        } else {
            fetchEvents();
        }
    }, [user, activeTab, selectedCategory, searchQuery]);

    // API Helper
    const apiRequest = async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const res = await fetch(url, { ...options, headers });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Server error');
            }
            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    };

    // Fetch DB Status
    const fetchDbStatus = async () => {
        try {
            const data = await apiRequest('/api/db/status');
            setDbInfo(data);
        } catch (err) {}
    };

    // Fetch Categories
    const fetchCategories = async () => {
        try {
            const data = await apiRequest('/api/categories');
            setCategories(data);
        } catch (err) {}
    };

    // Fetch Events (Browse)
    const fetchEvents = async () => {
        setLoading(true);
        try {
            let url = `/api/events?q=${encodeURIComponent(searchQuery)}`;
            if (selectedCategory) url += `&category=${selectedCategory}`;
            const data = await apiRequest(url);
            setEvents(data);
        } catch (err) {
            showToast('Failed to load events', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Current User
    const fetchCurrentUser = async (authToken) => {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                setDefaultTabForRole(userData.role);
            } else {
                localStorage.removeItem('nexevent_token');
                setToken('');
                setUser(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const setDefaultTabForRole = (role) => {
        if (role === 'organizer') setActiveTab('dashboard');
        else if (role === 'admin') setActiveTab('admin-pending');
        else setActiveTab('browse');
    };

    // 1-Click Role Switcher (Demo Feature)
    const quickRoleLogin = async (roleName) => {
        setLoading(true);
        try {
            const data = await apiRequest('/api/auth/quick-role', {
                method: 'POST',
                body: JSON.stringify({ role: roleName })
            });
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('nexevent_token', data.token);
            showToast(`Switched to demo role: ${roleName.toUpperCase()}`, 'success');
            setDefaultTabForRole(data.user.role);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle Manual Sign In / Sign Up
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const body = authMode === 'login' 
            ? { username: authForm.username, password: authForm.password }
            : { ...authForm, role: authRole };

        try {
            const data = await apiRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('nexevent_token', data.token);
            setAuthModalOpen(false);
            showToast(data.message || 'Logged in successfully!', 'success');
            setDefaultTabForRole(data.user.role);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('nexevent_token');
        setToken('');
        setUser(null);
        setActiveTab('browse');
        showToast('Signed out successfully.', 'info');
    };

    // Student: Fetch My Registrations
    const fetchMyRegistrations = async () => {
        try {
            const data = await apiRequest('/api/student/my-registrations');
            setMyRegistrations(data);
        } catch (err) {
            showToast('Failed to load your registrations', 'error');
        }
    };

    // Student: Register for Event
    const handleRegisterEvent = async (eventId) => {
        try {
            const data = await apiRequest(`/api/events/${eventId}/register`, { method: 'POST' });
            if (data.is_waitlist) {
                showToast(data.message, 'info');
            } else {
                showToast(data.message, 'success');
                if (window.confetti) {
                    window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                }
            }
            // Refresh
            fetchEvents();
            if (eventDetailModal && eventDetailModal.id === eventId) {
                setEventDetailModal(null);
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Student: Cancel Registration
    const handleCancelRegistration = async (eventId) => {
        if (!confirm('Are you sure you want to cancel this registration?')) return;
        try {
            const data = await apiRequest(`/api/events/${eventId}/cancel`, { method: 'POST' });
            showToast(data.message, 'info');
            fetchMyRegistrations();
            fetchEvents();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Organizer: Fetch Analytics
    const fetchOrganizerAnalytics = async () => {
        try {
            const data = await apiRequest('/api/organizer/analytics');
            setOrganizerAnalytics(data);
        } catch (err) {
            console.error(err);
        }
    };

    // Organizer: Create Event
    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            const data = await apiRequest('/api/organizer/events', {
                method: 'POST',
                body: JSON.stringify(newEventForm)
            });
            showToast(data.message, 'success');
            setCreateEventModal(false);
            fetchOrganizerAnalytics();
            fetchEvents();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Organizer: Check-in Participant by Ticket Code
    const handleCheckInTicket = async (codeToUse) => {
        const ticket = (codeToUse || manualTicketInput).trim().toUpperCase();
        if (!ticket) return;
        try {
            const data = await apiRequest('/api/organizer/check-in', {
                method: 'POST',
                body: JSON.stringify({ ticket_code: ticket })
            });
            setScanResult({
                type: data.already_attended ? 'already' : 'success',
                message: data.message,
                registration: data.registration
            });
            setManualTicketInput('');
            if (!data.already_attended && window.confetti) {
                window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
            }
            fetchOrganizerAnalytics();
        } catch (err) {
            setScanResult({ type: 'error', message: err.message });
        }
    };

    // Admin: Fetch Pending Events
    const fetchPendingEvents = async () => {
        try {
            const data = await apiRequest('/api/admin/events/pending');
            setPendingEvents(data);
        } catch (err) {
            console.error(err);
        }
    };

    // Admin: Approve Event
    const handleApproveEvent = async (eventId) => {
        try {
            const data = await apiRequest(`/api/admin/events/${eventId}/approve`, { method: 'POST' });
            showToast(data.message, 'success');
            fetchPendingEvents();
            fetchEvents();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Admin: Reject Event
    const handleRejectEvent = async (eventId) => {
        if (!confirm('Are you sure you want to reject this event?')) return;
        try {
            const data = await apiRequest(`/api/admin/events/${eventId}/reject`, { method: 'POST' });
            showToast(data.message, 'info');
            fetchPendingEvents();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Admin: Fetch Stats
    const fetchAdminStats = async () => {
        try {
            const data = await apiRequest('/api/admin/stats');
            setAdminStats(data);
        } catch (err) {
            console.error(err);
        }
    };

    // Admin: Fetch All Users
    const fetchAllUsers = async () => {
        try {
            const data = await apiRequest('/api/admin/users');
            setAllUsers(data);
        } catch (err) {
            console.error(err);
        }
    };

    // Admin: Toggle User Role
    const handleToggleRole = async (userId, newRole) => {
        try {
            const data = await apiRequest(`/api/admin/users/${userId}/toggle-role`, {
                method: 'POST',
                body: JSON.stringify({ role: newRole })
            });
            showToast(data.message, 'success');
            fetchAllUsers();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Test & Connect MySQL
    const handleTestMysql = async (e) => {
        e.preventDefault();
        try {
            const data = await apiRequest('/api/db/test-mysql', {
                method: 'POST',
                body: JSON.stringify(mysqlConfig)
            });
            showToast(data.message, 'success');
            fetchDbStatus();
            setDbSettingsModal(false);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Organizer: Post Announcement
    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        if (!announcementModal) return;
        try {
            const data = await apiRequest(`/api/organizer/events/${announcementModal.id}/announcements`, {
                method: 'POST',
                body: JSON.stringify(announcementForm)
            });
            showToast(data.message, 'success');
            setAnnouncementModal(null);
            setAnnouncementForm({ title: '', message: '' });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Student: Submit Feedback
    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        if (!feedbackModal) return;
        try {
            const data = await apiRequest(`/api/events/${feedbackModal.event_id}/feedback`, {
                method: 'POST',
                body: JSON.stringify(feedbackForm)
            });
            showToast(data.message, 'success');
            setFeedbackModal(null);
            fetchMyRegistrations();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    return (
        <div className="app-layout">
            {/* Top Navigation Bar */}
            <header className="navbar">
                <div className="nav-brand" onClick={() => setActiveTab('browse')}>
                    <div className="brand-badge-icon">
                        <i className="fa-solid fa-ticket"></i>
                    </div>
                    <span>NexEvent</span>
                    <span className="brand-author">Made By Shradha Thakur</span>
                </div>

                {/* Role Switcher Pills */}
                <div className="role-switcher">
                    <button 
                        className={`role-pill ${user?.role === 'student' ? 'active' : ''}`}
                        onClick={() => quickRoleLogin('student')}
                        title="Switch to Student Account"
                    >
                        <i className="fa-solid fa-user-graduate"></i>
                        <span>Student</span>
                    </button>
                    <button 
                        className={`role-pill ${user?.role === 'organizer' ? 'active' : ''}`}
                        onClick={() => quickRoleLogin('organizer')}
                        title="Switch to Organizer Account"
                    >
                        <i className="fa-solid fa-bullhorn"></i>
                        <span>Organizer</span>
                    </button>
                    <button 
                        className={`role-pill ${user?.role === 'admin' ? 'active' : ''}`}
                        onClick={() => quickRoleLogin('admin')}
                        title="Switch to Admin Account"
                    >
                        <i className="fa-solid fa-shield-halved"></i>
                        <span>Admin</span>
                    </button>
                </div>

                {/* Center Navigation Links based on Role */}
                <ul className="nav-links">
                    <li 
                        className={`nav-item ${activeTab === 'browse' ? 'active' : ''}`}
                        onClick={() => setActiveTab('browse')}
                    >
                        <i className="fa-solid fa-compass"></i>
                        <span>Browse Events</span>
                    </li>

                    {user?.role === 'student' && (
                        <li 
                            className={`nav-item ${activeTab === 'my-events' ? 'active' : ''}`}
                            onClick={() => setActiveTab('my-events')}
                        >
                            <i className="fa-solid fa-ticket-simple"></i>
                            <span>My Passes & Certs</span>
                        </li>
                    )}

                    {user?.role === 'organizer' && (
                        <>
                            <li 
                                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setActiveTab('dashboard')}
                            >
                                <i className="fa-solid fa-chart-pie"></i>
                                <span>Organizer Dashboard</span>
                            </li>
                            <li 
                                className="nav-item"
                                onClick={() => setScannerModal(true)}
                            >
                                <i className="fa-solid fa-qrcode"></i>
                                <span>Scan QR Entry</span>
                            </li>
                        </>
                    )}

                    {user?.role === 'admin' && (
                        <>
                            <li 
                                className={`nav-item ${activeTab === 'admin-pending' ? 'active' : ''}`}
                                onClick={() => setActiveTab('admin-pending')}
                            >
                                <i className="fa-solid fa-clipboard-check"></i>
                                <span>Pending Approvals ({pendingEvents.length})</span>
                            </li>
                            <li 
                                className={`nav-item ${activeTab === 'admin-users' ? 'active' : ''}`}
                                onClick={() => setActiveTab('admin-users')}
                            >
                                <i className="fa-solid fa-users-gear"></i>
                                <span>Manage Users</span>
                            </li>
                        </>
                    )}
                </ul>

                {/* Right Nav Actions */}
                <div className="nav-actions">
                    {/* Database Engine Status Button */}
                    <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDbSettingsModal(true)}
                        title="Database Engine Settings"
                    >
                        <i className="fa-solid fa-database" style={{ color: dbInfo?.status === 'connected' ? 'var(--success)' : 'var(--warning)' }}></i>
                        <span style={{ fontSize: '0.8rem' }}>{dbInfo?.engine === 'sqlite' ? 'SQLite (Active)' : 'MySQL 8.0'}</span>
                    </button>

                    {/* Theme Toggle Button */}
                    <button 
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'dark' ? 'Bright' : 'Dark'} Mode`}
                    >
                        <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                    </button>

                    {/* User Profile & Logout */}
                    {user ? (
                        <div className="user-profile-menu" onClick={handleLogout} title="Click to Sign Out">
                            <div className="user-avatar">
                                {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                            </div>
                            <div className="user-info-text">
                                <span className="user-info-name">{user.full_name || user.username}</span>
                                <span className="user-info-role">{user.role} (Sign out)</span>
                            </div>
                        </div>
                    ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => setAuthModalOpen(true)}>
                            <i className="fa-solid fa-arrow-right-to-bracket"></i>
                            <span>Sign In</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Application Container */}
            <main className="container">
                {/* 1. Student / Public Browse Events Tab */}
                {activeTab === 'browse' && (
                    <BrowseEventsView 
                        events={events}
                        categories={categories}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        loading={loading}
                        user={user}
                        onRegister={handleRegisterEvent}
                        onViewDetail={(evt) => setEventDetailModal(evt)}
                        onOpenCreate={() => setCreateEventModal(true)}
                    />
                )}

                {/* 2. Student My Registrations & Certificates Tab */}
                {activeTab === 'my-events' && (
                    <MyRegistrationsView 
                        registrations={myRegistrations}
                        onCancel={handleCancelRegistration}
                        onOpenTicket={(reg) => setTicketPassModal(reg)}
                        onOpenCertificate={(reg) => setCertificateModal(reg)}
                        onOpenFeedback={(reg) => setFeedbackModal(reg)}
                    />
                )}

                {/* 3. Organizer Dashboard View */}
                {activeTab === 'dashboard' && user?.role === 'organizer' && (
                    <OrganizerDashboardView 
                        analytics={organizerAnalytics}
                        onOpenCreate={() => setCreateEventModal(true)}
                        onOpenScanner={() => setScannerModal(true)}
                        onViewParticipants={async (evtId) => {
                            try {
                                const pts = await apiRequest(`/api/organizer/events/${evtId}/participants`);
                                setParticipantsModal({ eventId: evtId, list: pts });
                            } catch (e) {
                                showToast('Could not load participants', 'error');
                            }
                        }}
                        onOpenAnnouncement={(evt) => setAnnouncementModal(evt)}
                    />
                )}

                {/* 4. Admin Pending Approvals View */}
                {activeTab === 'admin-pending' && user?.role === 'admin' && (
                    <AdminApprovalsView 
                        pendingEvents={pendingEvents}
                        onApprove={handleApproveEvent}
                        onReject={handleRejectEvent}
                    />
                )}

                {/* 5. Admin Manage Users View */}
                {activeTab === 'admin-users' && user?.role === 'admin' && (
                    <AdminUsersView 
                        users={allUsers}
                        onToggleRole={handleToggleRole}
                    />
                )}
            </main>

            {/* ================= MODALS ================= */}

            {/* Event Detail Modal */}
            {eventDetailModal && (
                <div className="modal-overlay" onClick={() => setEventDetailModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{eventDetailModal.title}</h3>
                            <button className="modal-close-btn" onClick={() => setEventDetailModal(null)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <img 
                                src={eventDetailModal.banner_url} 
                                alt={eventDetailModal.title} 
                                style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '18px' }} 
                            />
                            
                            <div className="ticket-details-grid" style={{ marginBottom: '18px' }}>
                                <div className="ticket-detail-item">
                                    <label>Date & Time</label>
                                    <span>{eventDetailModal.date} ({eventDetailModal.start_time} - {eventDetailModal.end_time})</span>
                                </div>
                                <div className="ticket-detail-item">
                                    <label>Venue</label>
                                    <span>{eventDetailModal.venue_name}</span>
                                </div>
                                <div className="ticket-detail-item">
                                    <label>Category</label>
                                    <span>{eventDetailModal.category_name}</span>
                                </div>
                                <div className="ticket-detail-item">
                                    <label>Capacity</label>
                                    <span>{eventDetailModal.registration_count} / {eventDetailModal.capacity} Filled</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>About This Event</h4>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>{eventDetailModal.description}</p>
                            </div>

                            {/* Organizer Announcements */}
                            {eventDetailModal.announcements && eventDetailModal.announcements.length > 0 && (
                                <div style={{ marginBottom: '20px', background: 'rgba(139, 92, 246, 0.1)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-highlight)' }}>
                                    <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-bullhorn"></i> Organizer Announcements
                                    </h4>
                                    {eventDetailModal.announcements.map(a => (
                                        <div key={a.id} style={{ fontSize: '0.88rem', marginTop: '6px' }}>
                                            <strong>{a.title}:</strong> {a.message}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reviews & Ratings */}
                            {eventDetailModal.feedbacks && eventDetailModal.feedbacks.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Attendee Reviews ({eventDetailModal.feedbacks.length})</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {eventDetailModal.feedbacks.map(f => (
                                            <div key={f.id} style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <strong>{f.user_name}</strong>
                                                    <span style={{ color: 'var(--warning)' }}>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                                                </div>
                                                <p style={{ color: 'var(--text-secondary)' }}>{f.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEventDetailModal(null)}>Close</button>
                            {eventDetailModal.user_registered ? (
                                <button className="btn btn-secondary" disabled>
                                    <i className="fa-solid fa-check"></i> Already Registered
                                </button>
                            ) : (
                                <button 
                                    className="btn btn-primary" 
                                    onClick={() => handleRegisterEvent(eventDetailModal.id)}
                                >
                                    <i className="fa-solid fa-ticket"></i>
                                    {eventDetailModal.is_full ? 'Join Priority Waitlist' : 'Register Now (Free Entry)'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* QR Entry Pass Modal (Boarding Pass Ticket) */}
            {ticketPassModal && (
                <TicketPassModal 
                    registration={ticketPassModal} 
                    onClose={() => setTicketPassModal(null)} 
                />
            )}

            {/* Verified Certificate Modal */}
            {certificateModal && (
                <CertificateModal 
                    registration={certificateModal} 
                    onClose={() => setCertificateModal(null)} 
                />
            )}

            {/* Organizer: Live QR Attendance Scanner Modal */}
            {scannerModal && (
                <QRScannerModal 
                    onClose={() => { setScannerModal(false); setScanResult(null); }}
                    manualInput={manualTicketInput}
                    setManualInput={setManualTicketInput}
                    onCheckIn={handleCheckInTicket}
                    scanResult={scanResult}
                />
            )}

            {/* Organizer: Create Event Modal */}
            {createEventModal && (
                <div className="modal-overlay" onClick={() => setCreateEventModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><i className="fa-solid fa-calendar-plus" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Create New Event</h3>
                            <button className="modal-close-btn" onClick={() => setCreateEventModal(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleCreateEvent}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Event Title *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. AI & Robotics Hackathon 2026"
                                        value={newEventForm.title} 
                                        onChange={e => setNewEventForm({ ...newEventForm, title: e.target.value })} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description *</label>
                                    <textarea 
                                        rows="3" 
                                        required 
                                        placeholder="Provide full schedule, tracks, perks, and guidelines..."
                                        value={newEventForm.description} 
                                        onChange={e => setNewEventForm({ ...newEventForm, description: e.target.value })} 
                                    ></textarea>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select 
                                            value={newEventForm.category_id} 
                                            onChange={e => setNewEventForm({ ...newEventForm, category_id: e.target.value })}
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Venue Name</label>
                                        <input 
                                            type="text" 
                                            value={newEventForm.venue_name} 
                                            onChange={e => setNewEventForm({ ...newEventForm, venue_name: e.target.value })} 
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Event Date *</label>
                                        <input 
                                            type="date" 
                                            required 
                                            value={newEventForm.date} 
                                            onChange={e => setNewEventForm({ ...newEventForm, date: e.target.value })} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Capacity (Seats) *</label>
                                        <input 
                                            type="number" 
                                            min="10" 
                                            max="5000" 
                                            required 
                                            value={newEventForm.capacity} 
                                            onChange={e => setNewEventForm({ ...newEventForm, capacity: e.target.value })} 
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Time</label>
                                        <input 
                                            type="text" 
                                            value={newEventForm.start_time} 
                                            onChange={e => setNewEventForm({ ...newEventForm, start_time: e.target.value })} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>End Time</label>
                                        <input 
                                            type="text" 
                                            value={newEventForm.end_time} 
                                            onChange={e => setNewEventForm({ ...newEventForm, end_time: e.target.value })} 
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Banner Image URL</label>
                                    <input 
                                        type="url" 
                                        value={newEventForm.banner_url} 
                                        onChange={e => setNewEventForm({ ...newEventForm, banner_url: e.target.value })} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tags (Comma-separated)</label>
                                    <input 
                                        type="text" 
                                        value={newEventForm.tags} 
                                        onChange={e => setNewEventForm({ ...newEventForm, tags: e.target.value })} 
                                    />
                                </div>

                                <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--secondary)' }}>
                                    <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px' }}></i>
                                    <strong>Workflow Protocol:</strong> Since you are an Organizer, submitting this will place the event into the <strong>Admin Approval Queue</strong>. Once verified, it will be published live!
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setCreateEventModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit for Approval</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Organizer: Participants List Modal */}
            {participantsModal && (
                <div className="modal-overlay" onClick={() => setParticipantsModal(null)}>
                    <div className="modal-content" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><i className="fa-solid fa-users" style={{ color: 'var(--secondary)', marginRight: '8px' }}></i> Event Participants Roster</h3>
                            <button className="modal-close-btn" onClick={() => setParticipantsModal(null)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                            {participantsModal.list.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>No registrations found yet.</p>
                            ) : (
                                <table className="custom-table">
                                    <thead>
                                        <tr>
                                            <th>Attendee</th>
                                            <th>Ticket ID</th>
                                            <th>Status</th>
                                            <th>Check-In Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participantsModal.list.map(p => (
                                            <tr key={p.id}>
                                                <td>
                                                    <div style={{ fontWeight: '600' }}>{p.user.full_name}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.user.email}</div>
                                                </td>
                                                <td>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>{p.ticket_code}</span>
                                                </td>
                                                <td>
                                                    <span className={`event-badge-status ${p.status === 'attended' ? 'approved' : p.status === 'waitlisted' ? 'pending' : 'completed'}`} style={{ position: 'static' }}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                    {p.attended_at ? new Date(p.attended_at).toLocaleTimeString() : 'Pending'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setParticipantsModal(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Organizer: Announcement Broadcast Modal */}
            {announcementModal && (
                <div className="modal-overlay" onClick={() => setAnnouncementModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><i className="fa-solid fa-bullhorn" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Broadcast Announcement</h3>
                            <button className="modal-close-btn" onClick={() => setAnnouncementModal(null)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handlePostAnnouncement}>
                            <div className="modal-body">
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                    Broadcasting to all registered students of <strong>{announcementModal.title}</strong>.
                                </p>
                                <div className="form-group">
                                    <label>Announcement Headline *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. Venue Room Changed to Auditorium B"
                                        value={announcementForm.title} 
                                        onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Detailed Message *</label>
                                    <textarea 
                                        rows="4" 
                                        required 
                                        placeholder="Please bring your laptop and digital QR entry pass..."
                                        value={announcementForm.message} 
                                        onChange={e => setAnnouncementForm({ ...announcementForm, message: e.target.value })} 
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setAnnouncementModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-paper-plane"></i> Send Broadcast</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Student: Feedback Modal */}
            {feedbackModal && (
                <div className="modal-overlay" onClick={() => setFeedbackModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><i className="fa-solid fa-star" style={{ color: 'var(--warning)', marginRight: '8px' }}></i> Event Feedback & Review</h3>
                            <button className="modal-close-btn" onClick={() => setFeedbackModal(null)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmitFeedback}>
                            <div className="modal-body">
                                <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                                    How was your experience attending <strong>{feedbackModal.event_title}</strong>?
                                </p>
                                <div className="form-group" style={{ textAlign: 'center', margin: '20px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '2rem', cursor: 'pointer' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span 
                                                key={star} 
                                                onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                                                style={{ color: star <= feedbackForm.rating ? 'var(--warning)' : 'var(--text-muted)', transition: 'transform 0.15s ease' }}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'block' }}>
                                        {feedbackForm.rating} of 5 Stars
                                    </span>
                                </div>
                                <div className="form-group">
                                    <label>Your Review & Suggestions</label>
                                    <textarea 
                                        rows="3" 
                                        placeholder="Awesome speakers, well organized, loved the workshops..."
                                        value={feedbackForm.comment} 
                                        onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })} 
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setFeedbackModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit Feedback</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* In-App MySQL Hot-Swap & Database Config Modal */}
            {dbSettingsModal && (
                <div className="modal-overlay" onClick={() => setDbSettingsModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><i className="fa-solid fa-database" style={{ color: 'var(--secondary)', marginRight: '8px' }}></i> Database Settings & MySQL Connection</h3>
                            <button className="modal-close-btn" onClick={() => setDbSettingsModal(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleTestMysql}>
                            <div className="modal-body">
                                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '18px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>CURRENT ACTIVE DATABASE</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-server"></i>
                                        <span>{dbInfo?.engine === 'sqlite' ? 'SQLite Embedded Database' : 'MySQL 8.0 Server'}</span>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                                        Location: <code>{dbInfo?.host || 'backend/event_management.db'}</code>
                                    </div>
                                </div>

                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                    If you have a local <strong>MySQL 8.0</strong> server with a password, you can hot-connect here. Otherwise, the app works out-of-the-box with embedded SQLite!
                                </p>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>MySQL Host</label>
                                        <input 
                                            type="text" 
                                            value={mysqlConfig.host} 
                                            onChange={e => setMysqlConfig({ ...mysqlConfig, host: e.target.value })} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Port</label>
                                        <input 
                                            type="number" 
                                            value={mysqlConfig.port} 
                                            onChange={e => setMysqlConfig({ ...mysqlConfig, port: parseInt(e.target.value) || 3306 })} 
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Username</label>
                                        <input 
                                            type="text" 
                                            value={mysqlConfig.user} 
                                            onChange={e => setMysqlConfig({ ...mysqlConfig, user: e.target.value })} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Password</label>
                                        <input 
                                            type="password" 
                                            placeholder="Enter your MySQL password"
                                            value={mysqlConfig.password} 
                                            onChange={e => setMysqlConfig({ ...mysqlConfig, password: e.target.value })} 
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Database Name</label>
                                    <input 
                                        type="text" 
                                        value={mysqlConfig.database} 
                                        onChange={e => setMysqlConfig({ ...mysqlConfig, database: e.target.value })} 
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setDbSettingsModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-plug"></i> Test & Connect MySQL</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Auth Modal (Sign In / Sign Up) */}
            {authModalOpen && (
                <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{authMode === 'login' ? 'Sign In to NexEvent' : 'Create Account'}</h3>
                            <button className="modal-close-btn" onClick={() => setAuthModalOpen(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleAuthSubmit}>
                            <div className="modal-body">
                                {authMode === 'register' && (
                                    <>
                                        <div className="form-group">
                                            <label>Full Name</label>
                                            <input 
                                                type="text" 
                                                required 
                                                placeholder="e.g. Shradha Thakur"
                                                value={authForm.full_name} 
                                                onChange={e => setAuthForm({ ...authForm, full_name: e.target.value })} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <input 
                                                type="email" 
                                                required 
                                                placeholder="shradha@example.com"
                                                value={authForm.email} 
                                                onChange={e => setAuthForm({ ...authForm, email: e.target.value })} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Account Role</label>
                                            <select value={authRole} onChange={e => setAuthRole(e.target.value)}>
                                                <option value="student">Student / Participant</option>
                                                <option value="organizer">Event Organizer</option>
                                                <option value="admin">System Admin</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label>Username</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. student, organizer, or admin"
                                        value={authForm.username} 
                                        onChange={e => setAuthForm({ ...authForm, username: e.target.value })} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        placeholder="••••••••"
                                        value={authForm.password} 
                                        onChange={e => setAuthForm({ ...authForm, password: e.target.value })} 
                                    />
                                </div>
                            </div>
                            <div className="modal-footer" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                    {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary btn-sm" 
                                    style={{ width: '100%', marginTop: '6px' }}
                                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                                >
                                    {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already registered? Sign In'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <i className={`fa-solid ${t.type === 'success' ? 'fa-circle-check' : t.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}`}></i>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ==========================================================================
// SUB-VIEW: Browse Events View (Public & Student)
// ==========================================================================
function BrowseEventsView({ events, categories, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, loading, user, onRegister, onViewDetail, onOpenCreate }) {
    return (
        <div>
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-tag">
                    <i className="fa-solid fa-sparkles"></i>
                    <span>Next-Gen Multi-Role Event Experience</span>
                </div>
                <h1 className="hero-title">
                    Discover, Attend & Organize <br />
                    <span className="gradient-text">World-Class Tech Events</span>
                </h1>
                <p className="hero-subtitle">
                    Automated QR entry passes, verified completion certificates, live capacity waitlisting, and rich organizer analytics in one platform.
                </p>

                {user?.role === 'organizer' && (
                    <button className="btn btn-primary" onClick={onOpenCreate}>
                        <i className="fa-solid fa-plus"></i>
                        <span>Host & Create Event</span>
                    </button>
                )}
            </section>

            {/* Search and Category Chips */}
            <div className="search-filter-card">
                <div className="search-input-wrapper">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input 
                        type="text" 
                        placeholder="Search hackathons, AI summits, workshops, or venues..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="categories-bar">
                    <button 
                        className={`category-chip ${selectedCategory === '' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('')}
                    >
                        All Categories
                    </button>
                    {categories.map(c => (
                        <button 
                            key={c.id} 
                            className={`category-chip ${selectedCategory === c.id.toString() ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(c.id.toString())}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Events Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="loader-spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ color: 'var(--text-muted)' }}>Loading events...</p>
                </div>
            ) : events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                    <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '14px' }}></i>
                    <h3>No events found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Try adjusting your search terms or category filter.</p>
                </div>
            ) : (
                <div className="events-grid">
                    {events.map(event => {
                        const percentFilled = Math.min(100, Math.round((event.registration_count / event.capacity) * 100));
                        const isHigh = percentFilled >= 80;
                        const isFull = event.registration_count >= event.capacity;

                        return (
                            <div key={event.id} className="event-card">
                                <div 
                                    className="event-card-banner" 
                                    style={{ backgroundImage: `url(${event.banner_url})` }}
                                >
                                    <span className="event-badge-category">{event.category_name}</span>
                                    <span className={`event-badge-status ${event.status}`}>
                                        {isFull ? 'Full (Waitlist)' : event.status}
                                    </span>
                                </div>
                                <div className="event-card-body">
                                    <div className="event-card-date">
                                        <i className="fa-regular fa-calendar"></i>
                                        <span>{event.date} • {event.start_time}</span>
                                    </div>
                                    <h3 className="event-card-title">{event.title}</h3>
                                    <p className="event-card-desc">{event.description}</p>
                                    
                                    <div className="event-card-venue">
                                        <i className="fa-solid fa-location-dot"></i>
                                        <span>{event.venue_name}</span>
                                    </div>

                                    {/* Capacity Progress Bar */}
                                    <div className="capacity-meter-box">
                                        <div className="capacity-meter-header">
                                            <span style={{ color: 'var(--text-secondary)' }}>Capacity Meter</span>
                                            <span style={{ color: isFull ? 'var(--danger)' : isHigh ? 'var(--warning)' : 'var(--secondary)' }}>
                                                {event.registration_count} / {event.capacity} Filled ({percentFilled}%)
                                            </span>
                                        </div>
                                        <div className="capacity-progress-bg">
                                            <div 
                                                className={`capacity-progress-bar ${isFull ? 'danger' : isHigh ? 'warning' : ''}`}
                                                style={{ width: `${percentFilled}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="event-card-footer">
                                        <div className="event-tags-list">
                                            {(Array.isArray(event.tags) ? event.tags : (event.tags ? event.tags.split(',') : [])).slice(0, 2).map((t, idx) => (
                                                <span key={idx} className="event-tag-item">#{typeof t === 'string' ? t.trim() : t}</span>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => onViewDetail(event)}
                                            >
                                                Details
                                            </button>
                                            {event.user_registered ? (
                                                <button className="btn btn-secondary btn-sm" disabled style={{ color: 'var(--success)' }}>
                                                    <i className="fa-solid fa-check"></i> Registered
                                                </button>
                                            ) : (
                                                <button 
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => onRegister(event.id)}
                                                >
                                                    {isFull ? 'Waitlist' : 'Register'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ==========================================================================
// SUB-VIEW: Student My Registrations & Certificates View
// ==========================================================================
function MyRegistrationsView({ registrations, onCancel, onOpenTicket, onOpenCertificate, onOpenFeedback }) {
    if (registrations.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <i className="fa-solid fa-ticket-simple" style={{ fontSize: '3.5rem', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
                <h2>No Active Passes Found</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '460px', margin: '8px auto 24px' }}>
                    You haven't registered for any events yet. Browse our upcoming events catalog to grab your pass!
                </p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>My Event Passes & Certificates</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Access your official QR check-in boarding passes, verified certificates of participation, and event feedback.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {registrations.map(reg => {
                    const isAttended = reg.status === 'attended';
                    const isWaitlisted = reg.status === 'waitlisted';

                    return (
                        <div 
                            key={reg.id} 
                            style={{ 
                                background: 'var(--bg-card)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 'var(--radius-lg)', 
                                padding: '22px', 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                gap: '18px',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '280px' }}>
                                <img 
                                    src={reg.event.banner_url} 
                                    alt={reg.event.title} 
                                    style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} 
                                />
                                <div>
                                    <span 
                                        className={`event-badge-status ${isAttended ? 'approved' : isWaitlisted ? 'pending' : 'completed'}`}
                                        style={{ position: 'static', display: 'inline-block', marginBottom: '6px' }}
                                    >
                                        {isAttended ? 'Attended (Verified)' : isWaitlisted ? 'Waitlisted' : 'Confirmed Registration'}
                                    </span>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{reg.event.title}</h3>
                                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                                        <i className="fa-regular fa-calendar" style={{ marginRight: '6px' }}></i>
                                        {reg.event.date} • {reg.event.start_time} | {reg.event.venue_name}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px', fontFamily: 'monospace' }}>
                                        Ticket ID: {reg.ticket_code}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                {/* QR Pass Button */}
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => onOpenTicket(reg)}
                                >
                                    <i className="fa-solid fa-qrcode" style={{ color: 'var(--secondary)' }}></i>
                                    <span>View Entry QR Pass</span>
                                </button>

                                {/* Certificate Button (Unlocked if Attended) */}
                                {isAttended ? (
                                    <button 
                                        className="btn btn-primary btn-sm"
                                        style={{ background: 'var(--gradient-gold)' }}
                                        onClick={() => onOpenCertificate(reg)}
                                    >
                                        <i className="fa-solid fa-award"></i>
                                        <span>Download Certificate</span>
                                    </button>
                                ) : (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                                        <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i>
                                        Certificate unlocks upon check-in
                                    </span>
                                )}

                                {/* Feedback Button */}
                                {isAttended && (
                                    <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => onOpenFeedback(reg)}
                                    >
                                        <i className="fa-regular fa-star" style={{ color: 'var(--warning)' }}></i>
                                        <span>Feedback</span>
                                    </button>
                                )}

                                {/* Cancel Registration Button */}
                                {!isAttended && (
                                    <button 
                                        className="btn btn-danger btn-sm"
                                        onClick={() => onCancel(reg.event_id)}
                                        title="Cancel registration & free your seat"
                                    >
                                        <i className="fa-solid fa-trash-can"></i>
                                        <span>Cancel</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================================================
// SUB-VIEW: Organizer Dashboard (Matching Prompt Mockup Specifications)
// Top KPI Cards + Registration Analytics Graph + Upcoming Events Capacity
// ==========================================================================
function OrganizerDashboardView({ analytics, onOpenCreate, onOpenScanner, onViewParticipants, onOpenAnnouncement }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // Initialize Chart.js registration trend chart
    useEffect(() => {
        if (!analytics || !analytics.registration_trend || !chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const labels = analytics.registration_trend.map(t => t.date);
        const counts = analytics.registration_trend.map(t => t.registrations);

        // Gradient for chart line / bars
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Registrations',
                    data: counts,
                    borderColor: '#8b5cf6',
                    borderWidth: 3,
                    pointBackgroundColor: '#06b6d4',
                    pointBorderColor: '#ffffff',
                    pointRadius: 5,
                    backgroundColor: gradient,
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleFont: { family: 'Outfit', size: 13 },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 10,
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', stepSize: 5, font: { family: 'Inter', size: 11 } }
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, [analytics]);

    const summary = analytics?.summary || {
        total_events: 12,
        total_registrations: 486,
        total_attended: 392,
        average_rating: 4.8
    };

    const upcoming = analytics?.upcoming_events || [
        { id: 1, title: 'Hackathon 2026', registered: 120, capacity: 150, date: '2026-10-15' },
        { id: 2, title: 'AI & Deep Learning Summit', registered: 95, capacity: 100, date: '2026-10-22' },
        { id: 3, title: 'UI/UX Design Masterclass', registered: 45, capacity: 50, date: '2026-11-05' }
    ];

    return (
        <div className="dashboard-grid">
            {/* Header & Quick Action Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '4px' }}>Organizer Control Hub</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Track live registrations, scan participant entry passes, and view performance metrics.</p>
                </div>
                <div className="organizer-toolbar">
                    <button className="btn btn-primary" onClick={onOpenCreate}>
                        <i className="fa-solid fa-plus"></i>
                        <span>Create Event</span>
                    </button>
                    <button className="btn btn-secondary" onClick={onOpenScanner}>
                        <i className="fa-solid fa-qrcode" style={{ color: 'var(--secondary)' }}></i>
                        <span>Scan Entry QR</span>
                    </button>
                </div>
            </div>

            {/* Top KPI Cards (Matching Prompt Mockup: Events, Registrations, Attendance) */}
            <div className="kpi-cards-grid">
                <div className="kpi-card">
                    <div>
                        <div className="kpi-data-title">Total Events Hosted</div>
                        <div className="kpi-data-value">{summary.total_events}</div>
                        <div className="kpi-data-sub"><i className="fa-solid fa-calendar-check"></i> Active on platform</div>
                    </div>
                    <div className="kpi-icon-badge purple">
                        <i className="fa-solid fa-calendar-days"></i>
                    </div>
                </div>

                <div className="kpi-card">
                    <div>
                        <div className="kpi-data-title">Total Registrations</div>
                        <div className="kpi-data-value">{summary.total_registrations}</div>
                        <div className="kpi-data-sub"><i className="fa-solid fa-arrow-trend-up"></i> +18% this month</div>
                    </div>
                    <div className="kpi-icon-badge cyan">
                        <i className="fa-solid fa-users"></i>
                    </div>
                </div>

                <div className="kpi-card">
                    <div>
                        <div className="kpi-data-title">Attendance Recorded</div>
                        <div className="kpi-data-value">{summary.total_attended}</div>
                        <div className="kpi-data-sub" style={{ color: 'var(--secondary)' }}>
                            <i className="fa-solid fa-circle-check"></i> {summary.total_registrations > 0 ? Math.round((summary.total_attended / summary.total_registrations) * 100) : 0}% Turnout rate
                        </div>
                    </div>
                    <div className="kpi-icon-badge green">
                        <i className="fa-solid fa-clipboard-user"></i>
                    </div>
                </div>

                <div className="kpi-card">
                    <div>
                        <div className="kpi-data-title">Average Rating</div>
                        <div className="kpi-data-value">★ {summary.average_rating}</div>
                        <div className="kpi-data-sub" style={{ color: 'var(--warning)' }}>
                            <i className="fa-solid fa-star"></i> Verified attendee reviews
                        </div>
                    </div>
                    <div className="kpi-icon-badge pink">
                        <i className="fa-solid fa-award"></i>
                    </div>
                </div>
            </div>

            {/* Split Section: Registration Analytics Chart & Upcoming Events Capacity */}
            <div className="dashboard-split-row">
                {/* Left: Registration Analytics Graph */}
                <div className="dashboard-panel-card">
                    <div className="panel-card-header">
                        <h3 className="panel-card-title">
                            <i className="fa-solid fa-chart-line" style={{ color: 'var(--primary)' }}></i>
                            Registration Analytics
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last 7 Days Activity</span>
                    </div>
                    <div className="chart-container-box">
                        <canvas ref={chartRef}></canvas>
                    </div>
                </div>

                {/* Right: Upcoming Events Capacity List (e.g. Hackathon 2026 120/150) */}
                <div className="dashboard-panel-card">
                    <div className="panel-card-header">
                        <h3 className="panel-card-title">
                            <i className="fa-solid fa-hourglass-half" style={{ color: 'var(--secondary)' }}></i>
                            Upcoming Capacity
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live Seats Meter</span>
                    </div>
                    
                    <div className="upcoming-capacity-list">
                        {upcoming.map(evt => {
                            const regCount = evt.registered !== undefined ? evt.registered : (evt.registered_count || evt.registration_count || 0);
                            const ratio = Math.min(100, Math.round((regCount / (evt.capacity || 100)) * 100));
                            const isFull = regCount >= evt.capacity;

                            return (
                                <div key={evt.id} className="upcoming-capacity-item">
                                    <div className="upcoming-item-title-row">
                                        <span className="upcoming-item-title">{evt.title}</span>
                                        <span className="upcoming-item-ratio" style={{ color: isFull ? 'var(--danger)' : 'var(--secondary)' }}>
                                            {regCount} / {evt.capacity}
                                        </span>
                                    </div>
                                    <div className="capacity-progress-bg" style={{ height: '6px' }}>
                                        <div 
                                            className={`capacity-progress-bar ${isFull ? 'danger' : ratio > 80 ? 'warning' : ''}`}
                                            style={{ width: `${ratio}%` }}
                                        ></div>
                                    </div>
                                    <div className="upcoming-meta-sub">
                                        <span><i className="fa-regular fa-calendar"></i> {evt.date}</span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="btn btn-secondary btn-sm" 
                                                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                                                onClick={() => onViewParticipants(evt.id)}
                                            >
                                                Roster
                                            </button>
                                            <button 
                                                className="btn btn-secondary btn-sm" 
                                                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                                                onClick={() => onOpenAnnouncement(evt)}
                                            >
                                                Broadcast
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// SUB-VIEW: Admin Approvals View (Enforcing the Workflow)
// Organizer creates event -> Admin approves -> Event becomes visible
// ==========================================================================
function AdminApprovalsView({ pendingEvents, onApprove, onReject }) {
    return (
        <div>
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                    <i className="fa-solid fa-clipboard-check" style={{ color: 'var(--warning)', marginRight: '10px' }}></i>
                    Pending Event Approvals Queue
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Review events created by organizers before they are published to students.
                </p>
            </div>

            {pendingEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '14px' }}></i>
                    <h3>All caught up!</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>No events are currently pending admin approval.</p>
                </div>
            ) : (
                <div className="admin-table-container">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Event Details</th>
                                <th>Organizer</th>
                                <th>Venue & Date</th>
                                <th>Capacity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingEvents.map(evt => (
                                <tr key={evt.id}>
                                    <td>
                                        <div style={{ fontWeight: '700', fontSize: '1rem' }}>{evt.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{evt.category_name}</div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '380px' }}>
                                            {evt.description}
                                        </p>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '600' }}>{evt.organizer?.full_name || 'Organizer'}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{evt.organizer?.email}</div>
                                    </td>
                                    <td>
                                        <div><i className="fa-regular fa-calendar"></i> {evt.date}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{evt.venue_name}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: '700', color: 'var(--secondary)' }}>{evt.capacity} Seats</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="btn btn-primary btn-sm"
                                                onClick={() => onApprove(evt.id)}
                                                title="Approve and make public"
                                            >
                                                <i className="fa-solid fa-check"></i> Approve
                                            </button>
                                            <button 
                                                className="btn btn-danger btn-sm"
                                                onClick={() => onReject(evt.id)}
                                                title="Reject event"
                                            >
                                                <i className="fa-solid fa-xmark"></i> Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ==========================================================================
// SUB-VIEW: Admin Manage Users View
// ==========================================================================
function AdminUsersView({ users, onToggleRole }) {
    return (
        <div>
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                    <i className="fa-solid fa-users-gear" style={{ color: 'var(--primary)', marginRight: '10px' }}></i>
                    Platform User & Role Management
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>View all registered accounts, change user roles, and manage permissions.</p>
            </div>

            <div className="admin-table-container">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Current Role</th>
                            <th>Joined Date</th>
                            <th>Change Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                                            {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{u.full_name}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{u.email}</td>
                                <td>
                                    <span 
                                        className={`event-badge-status ${u.role === 'admin' ? 'approved' : u.role === 'organizer' ? 'pending' : 'completed'}`}
                                        style={{ position: 'static' }}
                                    >
                                        {u.role}
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                    <select 
                                        value={u.role} 
                                        onChange={e => onToggleRole(u.id, e.target.value)}
                                        style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                                    >
                                        <option value="student">Student</option>
                                        <option value="organizer">Organizer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ==========================================================================
// MODAL: Digital QR Entry Pass (Boarding Pass Layout)
// ==========================================================================
function TicketPassModal({ registration, onClose }) {
    const qrRef = useRef(null);

    useEffect(() => {
        if (!qrRef.current || !registration) return;
        qrRef.current.innerHTML = '';
        
        // Generate QR code with ticket code payload
        new QRCode(qrRef.current, {
            text: registration.ticket_code,
            width: 170,
            height: 170,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }, [registration]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="ticket-pass-wrapper" onClick={e => e.stopPropagation()}>
                <div className="ticket-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-ticket"></i>
                        <span className="ticket-header-title">OFFICIAL ENTRY PASS</span>
                    </div>
                    <button className="modal-close-btn" style={{ color: '#ffffff' }} onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="ticket-body">
                    <h3 className="ticket-event-name">{registration.event.title}</h3>
                    <div className="ticket-attendee-name">
                        <i className="fa-solid fa-user-check" style={{ marginRight: '6px' }}></i>
                        {registration.user?.full_name || 'Shradha Thakur'}
                    </div>

                    <div className="ticket-qr-container" ref={qrRef}></div>

                    <div className="ticket-code-pill">
                        {registration.ticket_code}
                    </div>

                    <div className="ticket-details-grid">
                        <div className="ticket-detail-item">
                            <label>Date</label>
                            <span>{registration.event.date}</span>
                        </div>
                        <div className="ticket-detail-item">
                            <label>Time</label>
                            <span>{registration.event.start_time}</span>
                        </div>
                        <div className="ticket-detail-item">
                            <label>Venue</label>
                            <span>{registration.event.venue_name}</span>
                        </div>
                        <div className="ticket-detail-item">
                            <label>Entry Status</label>
                            <span style={{ color: registration.status === 'attended' ? 'var(--success)' : 'var(--primary)' }}>
                                {registration.status === 'attended' ? '✓ Checked In' : 'Active Pass'}
                            </span>
                        </div>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Show this QR code at the registration desk for instant check-in.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// MODAL: Verified HTML5 Canvas Certificate Generator & Downloader
// ==========================================================================
function CertificateModal({ registration, onClose }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !registration) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set high-resolution dimensions (1200 x 850)
        canvas.width = 1200;
        canvas.height = 850;

        // Background luxury gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 850);
        bgGrad.addColorStop(0, '#0d1322');
        bgGrad.addColorStop(0.5, '#161e32');
        bgGrad.addColorStop(1, '#0b0f1a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 850);

        // Gold Ornate Outer Border
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 14;
        ctx.strokeRect(30, 30, 1140, 790);

        // Thin Inner Gold Border
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(45, 45, 1110, 760);

        // Header Title
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f59e0b';
        ctx.font = '600 24px Outfit';
        ctx.fillText('NEXEVENT VERIFIED CREDENTIALS', 600, 120);

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 48px Outfit';
        ctx.fillText('CERTIFICATE OF ATTENDANCE', 600, 185);

        // Subtitle
        ctx.fillStyle = '#94a3b8';
        ctx.font = '400 20px Inter';
        ctx.fillText('This is proudly presented to certify that', 600, 245);

        // Attendee Name (Prominent & Elegant)
        ctx.fillStyle = '#06b6d4';
        ctx.font = '800 54px Outfit';
        const attendeeName = registration.user?.full_name || 'Shradha Thakur';
        ctx.fillText(attendeeName, 600, 325);

        // Underline under name
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(350, 345);
        ctx.lineTo(850, 345);
        ctx.stroke();

        // Event description text
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '400 22px Inter';
        ctx.fillText('has actively attended, participated in, and successfully completed', 600, 400);

        // Event Title
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 36px Outfit';
        ctx.fillText(registration.event.title, 600, 460);

        // Details
        ctx.fillStyle = '#94a3b8';
        ctx.font = '400 18px Inter';
        ctx.fillText(`Held on ${registration.event.date} at ${registration.event.venue_name}`, 600, 505);

        // Gold Official Seal
        ctx.save();
        ctx.beginPath();
        ctx.arc(600, 610, 55, 0, Math.PI * 2);
        ctx.fillStyle = '#d97706';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fef3c7';
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 13px Outfit';
        ctx.fillText('OFFICIAL', 600, 605);
        ctx.fillText('VERIFIED', 600, 622);
        ctx.restore();

        // Signatures (Left: Organizer, Right: Director)
        // Left Signature
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(180, 710);
        ctx.lineTo(400, 710);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'italic 26px "Brush Script MT", cursive, sans-serif';
        ctx.fillText('Alex Rivera', 290, 695);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 16px Outfit';
        ctx.fillText('Alex Rivera', 290, 735);
        ctx.fillStyle = '#64748b';
        ctx.font = '400 14px Inter';
        ctx.fillText('Event Organizer', 290, 755);

        // Right Signature
        ctx.beginPath();
        ctx.moveTo(800, 710);
        ctx.lineTo(1020, 710);
        ctx.stroke();

        ctx.fillStyle = '#ec4899';
        ctx.font = 'italic 26px "Brush Script MT", cursive, sans-serif';
        ctx.fillText('Shradha Thakur', 910, 695);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 16px Outfit';
        ctx.fillText('Shradha Thakur', 910, 735);
        ctx.fillStyle = '#64748b';
        ctx.font = '400 14px Inter';
        ctx.fillText('Program Director', 910, 755);

        // Verification Footer
        ctx.fillStyle = '#475569';
        ctx.font = '400 12px monospace';
        ctx.fillText(`CERTIFICATE ID: ${registration.ticket_code} • VERIFIED ON-CHAIN & IN-DATABASE`, 600, 805);

    }, [registration]);

    const handleDownloadCertificate = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `Certificate_${registration.ticket_code}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3><i className="fa-solid fa-award" style={{ color: 'var(--warning)', marginRight: '8px' }}></i> Official Verified Certificate</h3>
                    <button className="modal-close-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="modal-body certificate-preview-container">
                    <canvas ref={canvasRef} className="certificate-canvas"></canvas>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn btn-primary" onClick={handleDownloadCertificate} style={{ background: 'var(--gradient-gold)' }}>
                        <i className="fa-solid fa-download"></i>
                        <span>Download High-Res PNG</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// MODAL: Organizer Live QR Attendance Scanner (Webcam & Manual Code Input)
// ==========================================================================
function QRScannerModal({ onClose, manualInput, setManualInput, onCheckIn, scanResult }) {
    const html5QrCodeScannerRef = useRef(null);

    useEffect(() => {
        // Initialize camera scanner if supported
        const scannerElem = document.getElementById('reader');
        if (scannerElem && window.Html5QrcodeScanner) {
            try {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    /* verbose= */ false
                );
                scanner.render(
                    (decodedText) => {
                        onCheckIn(decodedText);
                    },
                    (error) => {
                        // ignore frame errors
                    }
                );
                html5QrCodeScannerRef.current = scanner;
            } catch (err) {
                console.warn('Webcam QR scanner init:', err);
            }
        }

        return () => {
            if (html5QrCodeScannerRef.current) {
                try {
                    html5QrCodeScannerRef.current.clear();
                } catch (e) {}
            }
        };
    }, []);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3><i className="fa-solid fa-qrcode" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Participant QR Check-In</h3>
                    <button className="modal-close-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="modal-body">
                    {/* Feedback Banner */}
                    {scanResult && (
                        <div className={`scan-feedback-banner ${scanResult.type}`}>
                            <i className={`fa-solid ${scanResult.type === 'success' ? 'fa-circle-check' : scanResult.type === 'already' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`}></i>
                            <span>{scanResult.message}</span>
                        </div>
                    )}

                    {/* Camera Scanner Viewport */}
                    <div id="reader"></div>

                    <div style={{ textAlign: 'center', margin: '18px 0 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        — OR ENTER TICKET CODE MANUALLY —
                    </div>

                    {/* Manual Ticket Input */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            placeholder="e.g. TKT-E59A-1F92"
                            style={{ flex: 1, fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '1.05rem', fontWeight: '700' }}
                            value={manualInput}
                            onChange={e => setManualInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') onCheckIn(); }}
                        />
                        <button className="btn btn-primary" onClick={() => onCheckIn()}>
                            <i className="fa-solid fa-check"></i> Verify
                        </button>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
}

// Mount the React Application
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
