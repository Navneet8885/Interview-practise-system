"""
HRInterviewPro — Main Flask Application
=========================================
Project:  AI-Powered Interview Preparation Platform
Course:   Artificial Intelligence
Author:   Navneet Kaur
Tech:     Flask, SQLAlchemy, Flask-Login, OpenAI API

Description:
    A professional web application that helps users prepare for
    job interviews using AI-powered feedback. Features include
    secure authentication, interactive chat-based interviews,
    voice input/output, scoring, and progress tracking.
"""

import os
import json
from datetime import datetime
from functools import wraps

from flask import (
    Flask, render_template, request, redirect,
    url_for, flash, jsonify, session
)
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager, UserMixin, login_user,
    logout_user, login_required, current_user
)
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------------------------------------------------------------------
# App Configuration
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24).hex()
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///interview_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'

# ---------------------------------------------------------------------------
# OpenAI Configuration  (set your key as env variable OPENAI_API_KEY)
# ---------------------------------------------------------------------------
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# ---------------------------------------------------------------------------
# Database Models
# ---------------------------------------------------------------------------

class User(UserMixin, db.Model):
    """User account model."""
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80), unique=True, nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to interview answers
    answers = db.relationship('InterviewAnswer', backref='user', lazy=True,
                              order_by='InterviewAnswer.created_at.desc()')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class InterviewAnswer(db.Model):
    """Stores each interview Q&A with AI feedback."""
    __tablename__ = 'interview_answers'

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    question    = db.Column(db.Text, nullable=False)
    answer      = db.Column(db.Text, nullable=False)
    feedback    = db.Column(db.Text, nullable=True)
    score       = db.Column(db.Integer, nullable=True)          # 1-10 rating
    category    = db.Column(db.String(50), default='General')
    version     = db.Column(db.Integer, default=1)              # version history
    parent_id   = db.Column(db.Integer, db.ForeignKey('interview_answers.id'), nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    # Self-referential relationship for version history
    versions = db.relationship('InterviewAnswer',
                               backref=db.backref('parent', remote_side=[id]),
                               lazy=True)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ---------------------------------------------------------------------------
# Interview Questions Bank
# ---------------------------------------------------------------------------
QUESTIONS = [
    {"id": 1,  "category": "Behavioral",  "text": "Tell me about yourself and your professional background."},
    {"id": 2,  "category": "Behavioral",  "text": "Describe a challenging situation at work and how you handled it."},
    {"id": 3,  "category": "Behavioral",  "text": "What is your greatest professional achievement?"},
    {"id": 4,  "category": "Technical",   "text": "Explain the difference between a stack and a queue."},
    {"id": 5,  "category": "Technical",   "text": "What is the time complexity of binary search and why?"},
    {"id": 6,  "category": "Technical",   "text": "Describe the MVC architecture pattern."},
    {"id": 7,  "category": "Situational", "text": "How would you handle a disagreement with your team lead?"},
    {"id": 8,  "category": "Situational", "text": "Describe how you would prioritize multiple urgent deadlines."},
    {"id": 9,  "category": "Leadership",  "text": "How do you motivate a team during a difficult project?"},
    {"id": 10, "category": "Leadership",  "text": "Tell me about a time you took initiative on a project."},
    {"id": 11, "category": "Technical",   "text": "What are RESTful APIs and why are they important?"},
    {"id": 12, "category": "Behavioral",  "text": "Where do you see yourself in five years?"},
]


# ---------------------------------------------------------------------------
# AI Feedback Generation
# ---------------------------------------------------------------------------
def generate_ai_feedback(question: str, answer: str) -> dict:
    """
    Generate AI-based feedback for an interview answer.
    Falls back to rule-based feedback if OpenAI key is not set.
    Returns dict with 'feedback' (str) and 'score' (int 1-10).
    """
    # Try OpenAI first
    if OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)

            prompt = f"""You are an expert interview coach. Evaluate the following interview answer.

Question: {question}
Answer: {answer}

Provide:
1. A score from 1-10
2. Detailed, constructive feedback (2-3 sentences)
3. One specific improvement suggestion

Format your response as JSON:
{{"score": <number>, "feedback": "<feedback text>", "suggestion": "<improvement>"}}
"""
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.7,
            )
            result = json.loads(response.choices[0].message.content)
            feedback_text = f"{result['feedback']}\n\n💡 Suggestion: {result.get('suggestion', 'Keep practicing!')}"
            return {"feedback": feedback_text, "score": result.get("score", 7)}

        except Exception as e:
            print(f"OpenAI error: {e}")

    # ---- Fallback: rule-based feedback ----
    word_count = len(answer.split())
    score = 5

    feedback_parts = []

    if word_count < 15:
        score = 3
        feedback_parts.append(
            "Your answer is quite brief. Try to elaborate more with specific examples "
            "and details to make your response more compelling."
        )
    elif word_count < 40:
        score = 5
        feedback_parts.append(
            "Decent response length, but consider adding more depth. Use the STAR method "
            "(Situation, Task, Action, Result) to structure your answer."
        )
    elif word_count < 80:
        score = 7
        feedback_parts.append(
            "Good answer with reasonable detail! Your response shows thought and preparation. "
            "Consider adding a specific metric or outcome to strengthen it."
        )
    else:
        score = 8
        feedback_parts.append(
            "Excellent, comprehensive response! You've provided great detail. "
            "Make sure to stay concise in real interviews — aim for 1-2 minutes per answer."
        )

    # Check for keywords that indicate structure
    structure_keywords = ['first', 'second', 'then', 'finally', 'result', 'outcome', 'learned']
    has_structure = any(kw in answer.lower() for kw in structure_keywords)
    if has_structure:
        score = min(score + 1, 10)
        feedback_parts.append("Great job structuring your answer logically!")
    else:
        feedback_parts.append(
            "\n\n💡 Suggestion: Try structuring your answer using transition words like "
            "'First...', 'Then...', 'As a result...' for better clarity."
        )

    return {"feedback": " ".join(feedback_parts), "score": score}


# ---------------------------------------------------------------------------
# Routes — Pages
# ---------------------------------------------------------------------------

@app.route('/')
def home():
    """Landing page."""
    return render_template('home.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login."""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        email    = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            login_user(user, remember=True)
            flash('Welcome back! 🎉', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Invalid email or password.', 'error')

    return render_template('login.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    """User registration."""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email    = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm  = request.form.get('confirm_password', '')

        # Validation
        errors = []
        if len(username) < 3:
            errors.append('Username must be at least 3 characters.')
        if '@' not in email:
            errors.append('Please enter a valid email address.')
        if len(password) < 6:
            errors.append('Password must be at least 6 characters.')
        if password != confirm:
            errors.append('Passwords do not match.')
        if User.query.filter_by(email=email).first():
            errors.append('Email already registered.')
        if User.query.filter_by(username=username).first():
            errors.append('Username already taken.')

        if errors:
            for err in errors:
                flash(err, 'error')
        else:
            user = User(username=username, email=email)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            login_user(user)
            flash('Account created successfully! 🚀', 'success')
            return redirect(url_for('dashboard'))

    return render_template('signup.html')


@app.route('/logout')
@login_required
def logout():
    """Log the user out."""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('home'))


@app.route('/dashboard')
@login_required
def dashboard():
    """User dashboard with history & analytics."""
    answers = InterviewAnswer.query.filter_by(
        user_id=current_user.id, parent_id=None
    ).order_by(InterviewAnswer.created_at.desc()).all()

    # Analytics
    total_answers = len(answers)
    avg_score = 0
    if total_answers:
        scores = [a.score for a in answers if a.score]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    # Category breakdown
    categories = {}
    for a in answers:
        cat = a.category or 'General'
        if cat not in categories:
            categories[cat] = {'count': 0, 'total_score': 0}
        categories[cat]['count'] += 1
        if a.score:
            categories[cat]['total_score'] += a.score

    return render_template('dashboard.html',
                           answers=answers,
                           total_answers=total_answers,
                           avg_score=avg_score,
                           categories=categories)


@app.route('/interview')
@login_required
def interview():
    """AI Interview chat page."""
    return render_template('interview.html', questions=QUESTIONS)


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.route('/api/submit-answer', methods=['POST'])
@login_required
def submit_answer():
    """Submit an answer and get AI feedback."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    question_text = data.get('question', '').strip()
    answer_text   = data.get('answer', '').strip()
    category      = data.get('category', 'General')

    if not question_text or not answer_text:
        return jsonify({'error': 'Question and answer are required'}), 400

    # Generate AI feedback
    result = generate_ai_feedback(question_text, answer_text)

    # Save to database
    interview_answer = InterviewAnswer(
        user_id  = current_user.id,
        question = question_text,
        answer   = answer_text,
        feedback = result['feedback'],
        score    = result['score'],
        category = category,
    )
    db.session.add(interview_answer)
    db.session.commit()

    return jsonify({
        'id':        interview_answer.id,
        'feedback':  result['feedback'],
        'score':     result['score'],
        'timestamp': interview_answer.created_at.strftime('%Y-%m-%d %H:%M'),
    })


@app.route('/api/retry-answer', methods=['POST'])
@login_required
def retry_answer():
    """Submit a revised answer (version history)."""
    data = request.get_json()
    parent_id     = data.get('parent_id')
    answer_text   = data.get('answer', '').strip()

    parent = InterviewAnswer.query.get(parent_id)
    if not parent or parent.user_id != current_user.id:
        return jsonify({'error': 'Invalid parent answer'}), 404

    result = generate_ai_feedback(parent.question, answer_text)

    new_version = InterviewAnswer(
        user_id   = current_user.id,
        question  = parent.question,
        answer    = answer_text,
        feedback  = result['feedback'],
        score     = result['score'],
        category  = parent.category,
        version   = parent.version + 1,
        parent_id = parent.id,
    )
    db.session.add(new_version)
    db.session.commit()

    return jsonify({
        'id':        new_version.id,
        'feedback':  result['feedback'],
        'score':     result['score'],
        'version':   new_version.version,
        'timestamp': new_version.created_at.strftime('%Y-%m-%d %H:%M'),
    })


@app.route('/api/history')
@login_required
def get_history():
    """Get user's interview history."""
    answers = InterviewAnswer.query.filter_by(
        user_id=current_user.id, parent_id=None
    ).order_by(InterviewAnswer.created_at.desc()).limit(50).all()

    history = []
    for a in answers:
        entry = {
            'id':        a.id,
            'question':  a.question,
            'answer':    a.answer,
            'feedback':  a.feedback,
            'score':     a.score,
            'category':  a.category,
            'timestamp': a.created_at.strftime('%Y-%m-%d %H:%M'),
            'versions':  []
        }
        for v in a.versions:
            entry['versions'].append({
                'id':        v.id,
                'answer':    v.answer,
                'feedback':  v.feedback,
                'score':     v.score,
                'version':   v.version,
                'timestamp': v.created_at.strftime('%Y-%m-%d %H:%M'),
            })
        history.append(entry)

    return jsonify(history)


@app.route('/api/analytics')
@login_required
def get_analytics():
    """Get user performance analytics."""
    answers = InterviewAnswer.query.filter_by(
        user_id=current_user.id, parent_id=None
    ).order_by(InterviewAnswer.created_at.asc()).all()

    scores_over_time = []
    category_scores = {}

    for a in answers:
        if a.score:
            scores_over_time.append({
                'date':  a.created_at.strftime('%Y-%m-%d'),
                'score': a.score,
            })
            cat = a.category or 'General'
            if cat not in category_scores:
                category_scores[cat] = []
            category_scores[cat].append(a.score)

    # Average per category
    cat_avg = {}
    for cat, scores in category_scores.items():
        cat_avg[cat] = round(sum(scores) / len(scores), 1)

    return jsonify({
        'total_answers':    len(answers),
        'scores_over_time': scores_over_time,
        'category_averages': cat_avg,
    })


# ---------------------------------------------------------------------------
# Create tables & run
# ---------------------------------------------------------------------------
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
