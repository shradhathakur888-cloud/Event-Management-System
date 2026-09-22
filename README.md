# 🎫 NexEvent — Modern Multi-Role Event Management System
**Made By Shradha Thakur**

A complete, production-ready Event Management System featuring:
- 👥 **3 Distinct Roles**:
  - **Student / Participant**: Browse/search events with category filters, live capacity meters, 1-click registration with auto-waitlisting, digital QR entry passes, verified certificate downloads upon attendance, and 5-star ratings & reviews.
  - **Event Organizer**: Control Hub with top KPI cards (Events, Registrations, Attendance), registration trend analytics graph (Chart.js), upcoming event capacity progress bars (`Hackathon 2026: 120/150 filled`), live QR attendance scanner (camera + manual ticket verification), event creation, and announcement broadcasts.
  - **System Admin**: Workflow review queue (Organizer creates → Admin approves → Event becomes visible), platform statistics, and user & role management.
- 💻 **Tech Stack**:
  - **Frontend**: React 18, HTML5 Canvas certificate engine, QRCode.js, Html5-Qrcode scanner, Chart.js 4.4, FontAwesome 6, Google Fonts (*Outfit* & *Inter*), Canvas Confetti.
  - **Backend**: Python Flask REST API with CORS, JWT/token sessions, and role guards.
  - **Database**: Dual MySQL 8.0 & SQLite architecture with auto-failover and in-app hot-swap settings modal.
- 🎨 **Visuals**: Dark & Bright mode toggle, glassmorphism cards, glowing badges, micro-animations, and boarding pass ticket design.

---

## 🚀 Quick Start

### 1. Launch the System
Double-click `run.bat` or run in terminal:
```bash
cd backend
python app.py
```
Open your browser at **`http://localhost:5001`**.

### 2. Demo Accounts (1-Click Switcher Available on Navbar!)
- **Student Account**: `username: student` | `password: student123`
- **Organizer Account**: `username: organizer` | `password: organizer123`
- **Admin Account**: `username: admin` | `password: admin123`

You can also use the **Role Switcher Pills** directly on the navbar to switch between Student, Organizer, and Admin instantly!

---

## 🔄 Verified Core Workflow
1. **Organizer Creates Event**: Submit a new event via the Organizer Control Hub. Status is marked as `pending`.
2. **Admin Approves**: Log into Admin portal or switch to Admin role. Approve the pending event from the queue.
3. **Event Becomes Visible**: The approved event is now visible to all students on the Browse Events page.
4. **Student Registers**: Student registers for the event (or is auto-waitlisted if capacity is full).
5. **QR Pass Generated**: Student views their personalized digital QR entry pass.
6. **Attendance Scanned**: Organizer opens the QR Scanner and scans the student's QR pass or enters the ticket code. Attendance is verified!
7. **Certificate Unlocked**: Student's verified certificate unlocks with high-res PNG download, signed by the Organizer and Director (Shradha Thakur)!
8. **Student Gives Feedback**: Student rates the event (1-5 stars) and submits a review.
