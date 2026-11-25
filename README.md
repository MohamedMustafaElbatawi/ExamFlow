# ExamFlow — Examination Management Platform

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwindcss&logoColor=white)
![i18n](https://img.shields.io/badge/i18n-Arabic%20%2F%20English-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Main Features](#2-main-features)
3. [Instructor Features](#3-instructor-features)
4. [Student Features](#4-student-features)
5. [Question Bank & Import System](#5-question-bank--import-system)
6. [Exam Creation & Examination Engine](#6-exam-creation--examination-engine)
7. [Automatic & Manual Grading](#7-automatic--manual-grading)
8. [Results & Analytics](#8-results--analytics)
9. [Arabic & English Localization](#9-arabic--english-localization)
10. [Technology Stack](#10-technology-stack)
11. [Project Architecture](#11-project-architecture)
12. [Folder Structure](#12-folder-structure)
13. [Installation & Setup](#13-installation--setup)
14. [Environment Variables](#14-environment-variables)
15. [Running the Application](#15-running-the-application)
16. [Testing](#16-testing)
17. [API Reference](#17-api-reference)
18. [Demo Accounts](#18-demo-accounts)
19. [Security Considerations](#19-security-considerations)
20. [Mobile Support](#20-mobile-support)
21. [Future Improvements](#21-future-improvements)
22. [Author](#22-author)

---

## 1. Project Overview

**ExamFlow** is a full-stack, bilingual (Arabic / English) web-based examination management platform built for **PMP** (Project Management Professional) and **MPA** (Master of Public Administration) exam preparation and certification testing.

The platform provides a complete end-to-end workflow:

- Instructors create and manage a bilingual question bank, build exams with flexible question selection, assign exams to students, and grade essay responses manually.
- Students take timed exams in a secure full-screen room, with automatic answer saving and automatic submission on timeout.
- Objective questions are graded automatically; essay questions route through a manual review workflow.
- Results are published only after instructor approval, and students may review permitted answers post-publication.
- The entire UI — including all dashboards, modals, tables, filters, and navigation — is available in both Arabic (RTL) and English (LTR).

---

## 2. Main Features

| Area | Highlights |
|------|------------|
| **Authentication** | JWT-based login, role-based access control (instructor / student), bcrypt password hashing |
| **Question Bank** | Bilingual CRUD, four question types, difficulty levels, topic tagging, import from Excel and Word |
| **Exam Builder** | Manual, random, and hybrid question selection; 15+ configurable exam settings; immutable question snapshots |
| **Examination Engine** | Real-time countdown timer, per-answer autosave, resume after refresh, automatic submission on timeout |
| **Grading** | Auto-grading for objective questions; manual essay grading with partial marks and feedback; four-stage approval workflow |
| **Results** | Instructor-controlled result visibility; student answer review gated by exam configuration |
| **Analytics** | Instructor dashboard KPIs, per-exam analytics report, grading status tracking |
| **Notifications** | Instructor-to-student announcements; real-time notification badge in student layout |
| **Localization** | Full Arabic / English UI; RTL / LTR layout switching; language persisted in `localStorage` |
| **Mobile** | Responsive layouts; slide-over drawer navigation for all screen sizes |

---

## 3. Instructor Features

### Dashboard
- Summary cards: total students, total questions, active exams, pending gradings.
- Quick-access links to every major module.

### Student Management
- Add individual students (name, email, password, course track: PMP / MPA, phone, national ID).
- Edit student details and reset passwords.
- View student profiles with attempt history.
- Filter by course, search by name or email.

### Question Bank
- Create, edit, and delete questions with bilingual text (Arabic + English).
- Four question types: **single-choice**, **multiple-choice**, **true/false**, **essay**.
- Assign difficulty (easy / medium / hard), category (PMP / MPA / Both), and topic.
- Bilingual answer options and bilingual explanations.
- Preview any question before saving.
- Filter by type, category, topic, difficulty, and free-text search.
- Pagination.

### Question Import
- **Excel import**: Upload an `.xlsx` file; the parser reads a defined column layout and queues all detected questions for review before batch-confirming.
- **Word import**: Upload a `.docx` file; `mammoth` extracts structured question blocks and queues them the same way.
- Review each imported question, edit inline if needed, then confirm or discard individually or in bulk.

### Exam Builder
Full multi-step exam creation wizard with:

**Exam Settings**
- Title and description.
- Course category (PMP / MPA).
- Student or student-group assignment.
- Start date/time and end date/time.
- Exam duration (minutes).
- Maximum attempts per student.
- Passing score threshold.
- Total marks.

**Exam Behaviour**
- Randomize question order.
- Randomize answer options.
- Allow or prevent backward navigation.
- Enable or disable automatic submission on timer expiry.
- Configure result visibility (immediate vs. instructor-published).
- Configure answer-review visibility.

**Question Selection** (three modes)
1. **Manual** — browse the question bank and hand-pick questions.
2. **Random** — specify count and filter pool by category, topic, and difficulty.
3. **Hybrid** — combine manually selected questions with a random pool.

Per-question mark override in all modes.

### Exam Management
- View all exams with status badges (draft / published / archived).
- Publish or un-publish exams.
- Edit draft exams.
- **Archive** published exams or exams with attempts (preserves all history).
- **Delete** draft exams with zero attempts (requires confirmation).
- Active / Archived tab toggle.

### Grading Dashboard
- View all submitted attempts across all exams.
- Filter by course, exam, student, date, and grading status.
- Status columns: auto-graded, pending essay grading, ready for approval, approved, published.
- Open any attempt for detailed review.

### Attempt Review
- See every question, the student's submitted answer, the correct answer, marks awarded vs. maximum, and the bilingual explanation.
- Manually grade essay questions: assign partial or full marks and add written feedback.
- Score recalculates automatically after essay grading.
- Approve and publish individual results.

### Analytics & Reports
- Instructor analytics dashboard with pass rates, score distributions, and attempt counts.
- Per-exam report modal: question-level statistics, difficulty breakdown, topic coverage.

### Notifications
- Compose and send announcements to all students or selected course groups.
- View sent notification history.

---

## 4. Student Features

### Dashboard
- Welcome card with course track (PMP / MPA).
- Summary cards: available exams, completed exams, pending results.

### Exam List
- Tabs: **Available**, **In Progress**, **Completed**, **All**, **Archived**.
- Search by exam title; filter by course.
- Personal hide/archive — removes an exam from view without affecting other students or deleting data.
- Restore hidden exams from the Archived tab.
- Cannot hide an exam with an unfinished in-progress attempt.

### Exam Instructions Page
- Displays all exam settings before the student commits to starting.
- Shows remaining attempts.

### Active Exam Room (Full Screen)
- Real-time countdown timer.
- Per-question answer autosave (single-choice, multiple-choice, true/false, essay text).
- Resume exactly where the student left off after a page refresh or accidental close.
- Configurable forward / backward navigation.
- Manual submit button with confirmation.
- Automatic submission when the timer reaches zero.
- Duplicate start protection — a second concurrent start request returns the existing active attempt.

### Results
- View all graded and published results.
- Score summary: total marks, objective score, essay score, pass/fail badge.
- Correct / incorrect question counts.
- Essay grading status indicator.
- Official result badge when results are formally published.

### Answer Review
- Available only when the exam is configured to allow it and results are published.
- Shows each question with the student's answer, the correct answer, and the explanation.

### Notifications
- Bell icon in the header with unread count badge.
- Dropdown list of instructor announcements.

---

## 5. Question Bank & Import System

### Question Model
Each question stores:

| Field | Description |
|-------|-------------|
| `code` | Optional unique question code |
| `category` | `PMP` / `MPA` / `Both` |
| `topic` | Free-text topic label |
| `difficulty` | `easy` / `medium` / `hard` |
| `type` | `single_choice` / `multiple_choice` / `true_false` / `essay` |
| `text` | Bilingual object `{ en, ar }` |
| `options` | Array of `{ id, text: { en, ar } }` |
| `correctAnswers` | Array of option IDs |
| `explanation` | Bilingual object `{ en, ar }` |
| `marks` | Default mark weight |

### Excel Import Format
The parser reads `.xlsx` files with a defined column layout. After upload, every detected question is placed in a **review queue** — the instructor edits, confirms, or discards each question before the batch is committed to the question bank.

### Word Import Format
The parser reads `.docx` files using `mammoth` to extract structured text blocks and applies the same review-queue workflow.

---

## 6. Exam Creation & Examination Engine

### Question Snapshots
When an exam is **published**, the system takes an immutable snapshot of every selected question — capturing the full text, options, correct answers, marks, and explanation in both languages. Subsequent edits to the original question do not affect any published exam or any submitted attempt. This guarantees historical integrity.

### Attempt Lifecycle

```
Student starts exam
        │
        ▼
Active attempt created (status: in_progress)
        │
        ├── Student submits manually    ──► status: submitted
        │
        └── Timer expires               ──► status: auto_submitted
                        │
                        ▼
            Auto-grading runs (objective questions)
                        │
                        ▼
            gradingStatus: pending_grading  (if essay questions exist)
            gradingStatus: ready_for_approval (if fully auto-graded)
                        │
                        ▼
            Instructor grades essays and approves
                        │
                        ▼
            gradingStatus: approved → published
```

### Concurrency Protection
A unique compound index on `{ exam, student, attemptNumber }` prevents duplicate attempts. The start endpoint performs an atomic active-attempt lookup before creating any new record — a second concurrent request returns the existing in-progress attempt rather than creating a duplicate.

### Autosave
Every answer change triggers a `PATCH /api/engine/attempts/:id/answer` request that persists the response immediately. The student's progress survives browser refresh, tab close, and network interruption.

---

## 7. Automatic & Manual Grading

### Automatic Grading Rules

| Question Type | Scoring Rule |
|---------------|-------------|
| `single_choice` | Full marks if the selected option matches the single correct answer. |
| `true_false` | Full marks if the selected option matches the correct answer. |
| `multiple_choice` | Full marks only if the student's selected set exactly matches the correct answer set. |
| `essay` | Zero marks assigned automatically; routes to manual grading queue. |

### Manual Essay Grading
- Instructor opens the attempt review modal.
- Each essay question displays the student's text response.
- Instructor assigns marks (0 to the question maximum) and optional written feedback.
- After saving all essay marks, total score recalculates automatically.
- Instructor changes grading status to **ready for approval**.

### Grading Workflow States

| State | Meaning |
|-------|---------|
| `pending_grading` | Essay questions require manual review |
| `ready_for_approval` | All questions graded; awaiting instructor approval |
| `approved` | Instructor has approved the final score |
| `published` | Result is visible to the student |

---

## 8. Results & Analytics

### Result Visibility
Results are **not visible** to students until the instructor explicitly publishes them (or the exam is configured for immediate visibility). Students see a "pending" state until publication.

### Student Results Page
- Displays all published results.
- Shows: exam title, submission date, total score, objective sub-score, essay sub-score, pass/fail badge, attempt number.
- Shows correct answer count, incorrect answer count, and essay grading status.

### Answer Review
Controlled by two exam-level flags:
- `showResultsImmediately` — whether results appear before instructor publication.
- `allowAnswerReview` — whether students can see correct answers after results are published.

### Instructor Analytics
- Dashboard KPIs updated in real time.
- Per-exam report: total submissions, pass rate, average score, score range, question-level breakdown.

---

## 9. Arabic & English Localization

ExamFlow is fully bilingual using **react-i18next**.

### Language Switching
- A language switcher component (`LanguageSwitcher.jsx`) is present in both instructor and student headers and inside the mobile drawer.
- Switching language updates the entire UI instantly without a page reload.
- The selected language is persisted in `localStorage` and restored on refresh and after login.
- Different users on the same browser each have their own language preference stored independently.

### RTL / LTR Support
- Arabic activates RTL layout (`dir="rtl"`) on the `<html>` element.
- Sidebar and drawer slide directions, table alignment, button icon positions, and form layouts all adapt to the active direction.

### Translation Coverage
All UI strings are translated:
- Login and authentication pages
- Instructor and student dashboards
- Student management, question bank, question editor
- Excel and Word import screens
- Exam builder, exam settings, exam instructions
- Active exam room (timer, navigation, submission dialogs)
- Grading dashboard, attempt review, essay grading
- Results page, answer review modal
- Analytics reports
- Notifications
- All modals, dropdowns, tooltips, tables, filters, and pagination controls
- Error messages and loading states

---

## 10. Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x | Runtime |
| Express | 4.x | REST API framework |
| Mongoose | 8.x | MongoDB ODM |
| jsonwebtoken | 9.x | JWT authentication |
| bcryptjs | 3.x | Password hashing |
| multer | 1.x | File upload middleware |
| xlsx | 0.18.x | Excel file parsing |
| mammoth | 1.x | Word (.docx) file parsing |
| dotenv | 17.x | Environment variable management |
| nodemon | 3.x | Development auto-restart |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| Vite | 8.x | Build tool and dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| react-router-dom | 7.x | Client-side routing |
| axios | 1.x | HTTP client |
| react-i18next | 18.x | Internationalization |
| i18next | 27.x | i18n core |
| lucide-react | 1.x | Icon library |

### Database

| Technology | Purpose |
|------------|---------|
| MongoDB | Primary data store |

---

## 11. Project Architecture

ExamFlow is organized as a **monorepo** with separate `client/` and `server/` directories.

```
ExamFlow/
├── client/        # React + Vite frontend (SPA)
└── server/        # Node.js + Express REST API
```

### Backend Architecture

```
server/
├── server.js                 # Entry point — Express app, middleware, route mounting
└── src/
    ├── config/db.js           # MongoDB connection
    ├── middlewares/           # Auth, role guard, error handler, file upload
    ├── models/                # Mongoose schemas
    ├── controllers/           # Route handler logic
    ├── routes/                # Express routers
    └── services/              # Business logic (import parser)
```

### Frontend Architecture

```
client/src/
├── App.jsx                   # Route definitions (BrowserRouter + ProtectedRoute)
├── main.jsx                  # App entry point with i18n initialization
├── i18n.js                   # i18next configuration
├── context/AuthContext.jsx   # Global auth state (JWT + user info)
├── layouts/                  # InstructorLayout, StudentLayout (sidebar + header)
├── components/               # Shared UI components
├── pages/
│   ├── auth/                 # Login page
│   ├── instructor/           # All instructor pages
│   └── student/              # All student pages
├── services/                 # Axios API service modules
├── locales/                  # en.json, ar.json translation files
└── utils/formatters.js       # Date, number, score formatters
```

### Authentication Flow

```
Client                     Server
  │                           │
  ├── POST /api/auth/login ──► Validate credentials
  │                           ├── Hash comparison (bcrypt)
  │                           └── Sign JWT (role + userId)
  ◄── { token, user } ────────┤
  │                           │
  ├── Subsequent requests      │
  │   Authorization: Bearer   │
  │   <token>              ──► authMiddleware verifies JWT
  │                           └── roleMiddleware checks role
```

---

## 12. Folder Structure

```
ExamFlow/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── LanguageSwitcher.jsx
│   │   │   ├── NotificationDropdown.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── questions/
│   │   │   │   ├── QuestionEditorModal.jsx
│   │   │   │   └── QuestionPreviewModal.jsx
│   │   │   └── students/
│   │   │       ├── AddStudentModal.jsx
│   │   │       ├── EditStudentModal.jsx
│   │   │       ├── ResetPasswordModal.jsx
│   │   │       └── StudentDetailsModal.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── layouts/
│   │   │   ├── InstructorLayout.jsx
│   │   │   └── StudentLayout.jsx
│   │   ├── locales/
│   │   │   ├── ar.json
│   │   │   └── en.json
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.jsx
│   │   │   ├── instructor/
│   │   │   │   ├── AttemptReviewModal.jsx
│   │   │   │   ├── ExamBuilder.jsx
│   │   │   │   ├── ExamList.jsx
│   │   │   │   ├── ExamReportModal.jsx
│   │   │   │   ├── ExamResults.jsx
│   │   │   │   ├── ImportQuestions.jsx
│   │   │   │   ├── InstructorAnalytics.jsx
│   │   │   │   ├── InstructorDashboard.jsx
│   │   │   │   ├── InstructorNotifications.jsx
│   │   │   │   ├── QuestionBank.jsx
│   │   │   │   └── StudentManagement.jsx
│   │   │   └── student/
│   │   │       ├── ActiveExam.jsx
│   │   │       ├── AvailableExams.jsx
│   │   │       ├── ExamInstructions.jsx
│   │   │       ├── ExamReviewModal.jsx
│   │   │       ├── StudentDashboard.jsx
│   │   │       └── StudentResults.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── engineService.js
│   │   │   ├── examService.js
│   │   │   ├── gradingService.js
│   │   │   ├── importService.js
│   │   │   ├── notificationService.js
│   │   │   ├── questionService.js
│   │   │   └── studentService.js
│   │   ├── utils/
│   │   │   └── formatters.js
│   │   ├── App.jsx
│   │   ├── i18n.js
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── examController.js
│   │   │   ├── examEngineController.js
│   │   │   ├── gradingController.js
│   │   │   ├── importController.js
│   │   │   ├── notificationController.js
│   │   │   ├── questionController.js
│   │   │   └── studentController.js
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js
│   │   │   ├── errorHandler.js
│   │   │   ├── roleMiddleware.js
│   │   │   └── uploadMiddleware.js
│   │   ├── models/
│   │   │   ├── ActivityLog.js
│   │   │   ├── Exam.js
│   │   │   ├── ExamAttempt.js
│   │   │   ├── Notification.js
│   │   │   ├── Question.js
│   │   │   ├── StudentExamVisibility.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── examEngineRoutes.js
│   │   │   ├── examRoutes.js
│   │   │   ├── gradingRoutes.js
│   │   │   ├── importRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── questionRoutes.js
│   │   │   └── studentRoutes.js
│   │   ├── services/
│   │   │   └── importParserService.js
│   │   └── seed.js
│   ├── test/
│   │   ├── auth.test.js
│   │   ├── student.test.js
│   │   ├── question.test.js
│   │   ├── exam.test.js
│   │   ├── grading.test.js
│   │   ├── audit.test.js
│   │   └── attempt_concurrency.test.js
│   ├── uploads/
│   ├── .env               # (not committed — see .env.example)
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── README.md
```

---

## 13. Installation & Setup

### Prerequisites

- **Node.js** 18 or later ([nodejs.org](https://nodejs.org))
- **MongoDB** 6 or later running locally or via MongoDB Atlas ([mongodb.com](https://www.mongodb.com))
- **Git**

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ExamFlow
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment Variables

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `server/.env` and set your values (see [Environment Variables](#14-environment-variables)).

### 4. Seed Default Accounts

```bash
# From the server/ directory
npm run seed
```

This creates the default instructor and student accounts in the database.

### 5. Install Frontend Dependencies

```bash
cd ../client
npm install
```

---

## 14. Environment Variables

All variables are set in `server/.env`. A template is provided at `server/.env.example`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | `mongodb://127.0.0.1:27017/examflow` | MongoDB connection string |
| `JWT_SECRET` | ✅ | — | Secret key for signing JWT tokens. Use a long random string in production. |
| `JWT_EXPIRES_IN` | ✅ | `7d` | Token expiry duration (e.g. `7d`, `24h`, `60m`) |
| `PORT` | ✅ | `5000` | Express server port |
| `NODE_ENV` | ✅ | `development` | Node environment (`development` / `production`) |
| `CLIENT_URL` | ✅ | `http://localhost:5173` | Allowed CORS origin (frontend URL) |

> **Never commit your `.env` file.** It is listed in `.gitignore`.

---

## 15. Running the Application

Open **two terminal windows** (or tabs).

### Terminal 1 — Backend

```bash
cd server
npm run dev
# Server starts at http://localhost:5000
# Health check: GET http://localhost:5000/api/health
```

### Terminal 2 — Frontend

```bash
cd client
npm run dev
# Vite dev server starts at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
# Build the frontend
cd client
npm run build
# Output is placed in client/dist/
```

---

## 16. Testing

The backend ships with seven integration test files. Each test file runs sequentially using plain Node.js (no external test runner required).

```bash
cd server
npm test
```

The command runs:

| Test File | Coverage |
|-----------|----------|
| `auth.test.js` | Registration, login, JWT validation, role guard |
| `student.test.js` | Student CRUD, password reset, course assignment |
| `question.test.js` | Question CRUD, bilingual fields, type validation |
| `exam.test.js` | Exam creation, publishing, question snapshots, attempt flow |
| `grading.test.js` | Auto-grading rules, essay grading, score calculation, result publishing |
| `audit.test.js` | Activity log creation and retrieval |
| `attempt_concurrency.test.js` | Duplicate attempt prevention, concurrent start protection, resume behavior |

> Tests connect to the same MongoDB instance. Ensure MongoDB is running before executing the test suite.

---

## 17. API Reference

### Base URL

```
http://localhost:5000/api
```

### Health Check

```
GET /api/health
```

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/auth/login` | Public | Login and receive JWT |
| `GET` | `/auth/me` | Authenticated | Get current user profile |

### Students (Instructor only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/students` | List all students (paginated, filterable) |
| `POST` | `/students` | Create a new student account |
| `GET` | `/students/:id` | Get student details |
| `PUT` | `/students/:id` | Update student details |
| `DELETE` | `/students/:id` | Delete a student account |
| `PATCH` | `/students/:id/reset-password` | Reset student password |

### Questions (Instructor only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/questions` | List questions (paginated, filterable) |
| `POST` | `/questions` | Create a question |
| `GET` | `/questions/:id` | Get question details |
| `PUT` | `/questions/:id` | Update a question |
| `DELETE` | `/questions/:id` | Delete a question |

### Question Import (Instructor only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/import/excel` | Upload and parse an Excel file |
| `POST` | `/import/word` | Upload and parse a Word file |
| `POST` | `/import/confirm` | Confirm and save parsed questions |

### Exams (Instructor only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/exams` | List exams (supports `?archived=true`) |
| `POST` | `/exams` | Create a new exam |
| `GET` | `/exams/:id` | Get exam details |
| `PUT` | `/exams/:id` | Update a draft exam |
| `DELETE` | `/exams/:id` | Delete a draft exam (zero attempts only) |
| `PATCH` | `/exams/:id/publish` | Publish an exam |
| `PATCH` | `/exams/:id/archive` | Archive an exam |
| `PATCH` | `/exams/:id/restore` | Restore an archived exam |

### Exam Engine (Student only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/engine/exams` | Get available exams for the logged-in student |
| `POST` | `/engine/exams/:id/start` | Start or resume an exam attempt |
| `GET` | `/engine/attempts/:id` | Get attempt details and questions |
| `PATCH` | `/engine/attempts/:id/answer` | Autosave a single answer |
| `POST` | `/engine/attempts/:id/submit` | Manually submit an attempt |
| `GET` | `/engine/results` | Get all results for the student |
| `POST` | `/engine/exams/:id/hide` | Hide an exam from the student's list |
| `POST` | `/engine/exams/:id/restore` | Restore a hidden exam |

### Grading (Instructor only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/grading/attempts` | List all submitted attempts (filterable) |
| `GET` | `/grading/attempts/:id` | Get full attempt details |
| `PATCH` | `/grading/attempts/:id/essay` | Save essay marks and feedback |
| `PATCH` | `/grading/attempts/:id/approve` | Mark attempt as approved |
| `PATCH` | `/grading/attempts/:id/publish` | Publish the result to the student |

### Notifications

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/notifications` | Student | Get notifications for logged-in student |
| `POST` | `/notifications` | Instructor | Send a notification |
| `GET` | `/notifications/sent` | Instructor | View sent notifications |

---

## 18. Demo Accounts

> These accounts are created by the seed script and are intended for **local development only**. Change all credentials before any public deployment.

| Role | Email | Password |
|------|-------|----------|
| **Instructor** | `instructor@examflow.com` | `Password123!` |
| **Student** | `student@examflow.com` | `Password123!` |

---

## 19. Security Considerations

| Area | Implementation |
|------|---------------|
| **Authentication** | JWT tokens signed with a configurable secret; expiry enforced server-side |
| **Password storage** | bcrypt hashing (never stored in plaintext) |
| **Role-based access** | `authMiddleware` + `roleMiddleware` protect every non-public route |
| **Attempt integrity** | Unique compound index `{ exam, student, attemptNumber }` prevents duplicate records |
| **Question immutability** | Published question snapshots are stored independently; editing source questions does not affect live or historical exams |
| **Result visibility** | Results are withheld until the instructor explicitly publishes them (unless configured for immediate release) |
| **CORS** | Restricted to the configured `CLIENT_URL` origin |
| **File uploads** | `multer` restricts accepted MIME types; files stored server-side under `/uploads/` |
| **Environment secrets** | All secrets stored in `.env`, which is git-ignored |

> **For production deployment**, replace the default `JWT_SECRET`, use HTTPS, enforce rate limiting, and configure MongoDB authentication.

---

## 20. Mobile Support

Both instructor and student layouts include a fully functional mobile navigation drawer:

- **Hamburger button** (☰) visible below 768 px.
- **Slide-over drawer** containing all navigation links, the language switcher, and the logout button.
- **RTL / LTR awareness**: the drawer slides in from the right in Arabic and from the left in English.
- **Backdrop overlay** with click-outside-to-close.
- **Keyboard**: `Escape` closes the drawer.
- Background scrolling is locked while the drawer is open.
- Desktop sidebar remains unchanged.

---

## 21. Future Improvements

The following enhancements are not yet implemented but represent natural next steps for the platform:

- **Email notifications** — send exam invitations and result alerts via SMTP.
- **Student self-registration** — allow students to register and request course enrollment.
- **Question media attachments** — support images in question body fields.
- **Timed section support** — divide an exam into sections with independent timers.
- **Detailed audit trail** — log every instructor action for compliance.
- **Export results to Excel / PDF** — batch-export student results and analytics reports.
- **Multiple instructor accounts** — role hierarchy with admin oversight.
- **External LMS integration** — xAPI / SCORM compatibility.
- **Progressive Web App (PWA)** — offline-capable exam taking for low-connectivity environments.
- **Docker Compose deployment** — containerize the full stack for one-command setup.

---

## 22. Author

ExamFlow is a full-stack portfolio project demonstrating end-to-end web application development with:

- Secure JWT authentication and role-based access control
- Complex relational data modeling in MongoDB / Mongoose
- Bilingual (Arabic / English) UI with RTL layout support
- Real-time examination engine with autosave and concurrency protection
- Multi-stage grading and result-publishing workflow
- Integration test suite covering critical business flows

---

*Built with Node.js, Express, React, Vite, Tailwind CSS, and MongoDB.*
