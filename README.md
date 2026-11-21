# ExamFlow – Examination Management Platform

ExamFlow is a web-based examination platform engineered for **PMP** (Project Management Professional) and **MPA** (Master of Public Administration) exam preparation and certification testing.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, React Router v6, Lucide Icons, Axios.
- **Backend**: Node.js, Express.js REST API, JWT Authentication, Bcrypt password hashing.
- **Database**: MongoDB & Mongoose ORM.
- **File Parser**: `xlsx` (Excel) & `mammoth` (Word .docx).

---

## Quick Start

### 1. Backend Setup
```bash
cd server
npm install
npm run seed     # Seeds default instructor and student accounts
npm run dev      # Starts Express API at http://localhost:5000
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev      # Starts Vite React dev server at http://localhost:5173
```

---

## Seed Accounts

| Role | Email | Password |
|---|---|---|
| **Instructor / Admin** | `instructor@examflow.com` | `Password123!` |
| **Student (PMP Track)** | `student@examflow.com` | `Password123!` |

---

## Project Roadmap

- [x] **Phase 1**: Project Setup, Database Connection, JWT Auth & RBAC Middleware, Base Layouts.
- [ ] **Phase 2**: Student Management & Profile Association (PMP/MPA).
- [ ] **Phase 3**: Bilingual Question Bank & Word/Excel Question Importer.
- [ ] **Phase 4**: Exam Builder (Manual/Random) & Examination Engine (Timer/Autosave).
- [ ] **Phase 5**: Grading Engine, Manual Essay Reviews & Result Publishing.
- [ ] **Phase 6**: Notifications & Cohort Analytics.
- [ ] **Phase 7**: Security Hardening & Deployment.
