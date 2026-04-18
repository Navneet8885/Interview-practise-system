# 🎯 HRInterviewPro — AI-Powered Interview Preparation Platform

### 📌 College Project | Artificial Intelligence

A professional, modern AI-powered web application for interview preparation, built with **Python (Flask)**, **HTML**, **CSS**, and **JavaScript**.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)
![SQLite](https://img.shields.io/badge/Database-SQLite-orange.svg)
![Status](https://img.shields.io/badge/Status-Complete-brightgreen.svg)

---

## 📖 About The Project

**HRInterviewPro** is an AI-powered interview preparation platform that helps users practice for job interviews. It features an interactive AI interviewer that asks questions, accepts answers via text or voice, and provides intelligent feedback with scoring.

This project was developed as part of the **Artificial Intelligence** course to demonstrate the use of AI/NLP in real-world applications.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🏠 **Landing Page** | Modern dark-themed SaaS landing page with hero section |
| 🔐 **Authentication** | Secure signup/login with password hashing & sessions |
| 🤖 **AI Interview** | Chat-based interview system with intelligent feedback |
| 🎤 **Voice Input** | Speech recognition for answering questions by voice |
| 🔊 **Voice Output** | Text-to-speech to hear questions read aloud |
| 📊 **Dashboard** | Progress tracking, scores, and answer history |
| 📝 **Version History** | Retry questions and compare improvements |
| 📈 **Analytics** | Category-wise performance tracking |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| Python 3.9+ | Backend language |
| Flask | Web framework |
| SQLAlchemy | ORM / Database |
| SQLite | Database storage |
| Flask-Login | Session management |
| Werkzeug | Password hashing |
| HTML5 / CSS3 | Frontend structure & styling |
| JavaScript | Frontend interactivity |
| Web Speech API | Voice input/output |
| OpenAI API | AI-powered feedback (optional) |

---

## 📁 Project Structure

```
ai_interview_app/
│
├── app.py                          # Main Flask application (routes, models, AI logic)
├── requirements.txt                # Python dependencies
├── Procfile                        # Deployment configuration
├── README.md                       # Project documentation
├── .gitignore                      # Git ignore rules
│
├── static/                         # Static assets
│   ├── css/
│   │   └── style.css               # Complete stylesheet (dark navy theme)
│   └── js/
│       ├── main.js                 # Global JS (navbar, animations, password toggle)
│       ├── interview.js            # Interview chat logic (voice I/O, API calls)
│       └── dashboard.js            # Dashboard interactions (stats animation)
│
└── templates/                      # HTML Templates (Jinja2)
    ├── base.html                   # Base layout (navbar, footer, flash messages)
    ├── home.html                   # Landing page (hero, features, pricing)
    ├── login.html                  # User login page
    ├── signup.html                 # User registration page
    ├── dashboard.html              # User dashboard (analytics, history)
    └── interview.html              # AI Interview chat system
```

---

## 🚀 How to Run

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)

### Steps

```bash
# Step 1: Clone the repository
git clone https://github.com/YOUR_USERNAME/ai-interview-app.git
cd ai-interview-app

# Step 2: (Optional) Create a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Step 3: Install dependencies
pip install -r requirements.txt

# Step 4: Run the application
python app.py

# Step 5: Open in browser
# Visit: http://127.0.0.1:5000
```

> **💡 Note:** The app works without an OpenAI API key — it uses a built-in rule-based feedback system. To enable advanced AI feedback, set the `OPENAI_API_KEY` environment variable.

---

## 📸 Pages Overview

### 1. Home Page (`/`)
- Modern SaaS landing page with dark navy theme
- Hero section with centered heading + large image
- Features, About, and Pricing sections

### 2. Signup Page (`/signup`)
- User registration with form validation
- Password strength indicator
- Password hashing for security

### 3. Login Page (`/login`)
- Email + password authentication
- Session management with Flask-Login

### 4. Dashboard (`/dashboard`)
- Total answers, average score, category breakdown
- Interview history with AI feedback
- Version history for retried questions

### 5. AI Interview (`/interview`)
- Question sidebar with category filter
- Chat-style UI with AI avatar
- Voice input (microphone) and voice output (speaker)
- Real-time AI scoring and feedback
- Retry questions to improve

---

## 🗄️ Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| username | String | Unique username |
| email | String | Unique email |
| password_hash | String | Hashed password |
| created_at | DateTime | Account creation time |

### Interview Answers Table
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key → Users |
| question | Text | Interview question |
| answer | Text | User's answer |
| feedback | Text | AI-generated feedback |
| score | Integer | Score (1-10) |
| category | String | Question category |
| version | Integer | Answer version number |
| parent_id | Integer | Self-referencing FK for versioning |
| created_at | DateTime | Submission timestamp |

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submit-answer` | Submit answer, get AI feedback |
| POST | `/api/retry-answer` | Submit revised answer (version) |
| GET | `/api/history` | Get user's interview history |
| GET | `/api/analytics` | Get performance analytics |

---

## 👩‍💻 Developed By

**Navneet Kaur**  
Artificial Intelligence Course — College Project

---

## 📄 License

This project is for educational purposes.
