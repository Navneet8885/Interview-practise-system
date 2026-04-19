/**
 * interview.js — AI Interview Chat System
 * Author: Navneet Kaur | AI Course Project
 * Handles: Question selection, answer submission (Fetch API), voice input (Web Speech API),
 *          text-to-speech output, typing indicators, retry/version support
 */

let currentQuestion = null;
let isRecording = false;
let recognition = null;
let ttsEnabled = true;

// ===== DOM References =====
const chatMessages = document.getElementById('chat-messages');
const answerInput = document.getElementById('answer-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const charCount = document.getElementById('char-count');
const voiceStatus = document.getElementById('voice-status');

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Auto-resize textarea
    if (answerInput) {
        answerInput.addEventListener('input', () => {
            answerInput.style.height = 'auto';
            answerInput.style.height = Math.min(answerInput.scrollHeight, 150) + 'px';
            charCount.textContent = answerInput.value.length + ' characters';
        });
        answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); }
        });
    }

    // Sidebar toggle (mobile)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('interview-sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    if (sidebarClose) sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));

    // Init speech recognition
    initSpeechRecognition();
});

// ===== Select a Question =====
function selectQuestion(id, category, text) {
    currentQuestion = { id, category, text };

    // Highlight active question in sidebar
    document.querySelectorAll('.question-item').forEach(q => q.classList.remove('active'));
    const activeBtn = document.querySelector(`.question-item[data-id="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Enable input
    answerInput.disabled = false;
    sendBtn.disabled = false;
    micBtn.disabled = false;
    answerInput.value = '';
    answerInput.focus();

    // Add AI message with the question
    addMessage('ai', `<strong>Question ${id}:</strong> <span class="q-category-tag">${category}</span><br><br>${text}`);

    // TTS: read the question aloud
    if (ttsEnabled) speak(text);

    // Close sidebar on mobile
    document.getElementById('interview-sidebar').classList.remove('open');
}

// ===== Filter Questions by Category =====
function filterQuestions() {
    const filter = document.getElementById('category-filter').value;
    document.querySelectorAll('.question-item').forEach(q => {
        q.style.display = (filter === 'all' || q.dataset.category === filter) ? '' : 'none';
    });
}

// ===== Submit Answer =====
async function submitAnswer() {
    if (!currentQuestion || !answerInput.value.trim()) return;

    const answer = answerInput.value.trim();

    // Show user message
    addMessage('user', answer);
    answerInput.value = '';
    answerInput.style.height = 'auto';
    charCount.textContent = '0 characters';

    // Show typing indicator
    const typingId = showTyping();

    // Disable input while processing
    sendBtn.disabled = true;

    try {
        let data = null;
        let fetchFailed = false;

        // Only attempt fetch if not running directly from file://
        if (window.location.protocol !== 'file:') {
            try {
                const res = await fetch('/api/submit-answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: currentQuestion.text,
                        answer: answer,
                        category: currentQuestion.category
                    })
                });
                
                if (res.ok) {
                    data = await res.json();
                } else {
                    fetchFailed = true;
                }
            } catch (err) {
                fetchFailed = true;
            }
        } else {
            fetchFailed = true;
        }

        // Static mode / offline simulation fallback
        if (fetchFailed || !data) {
            await new Promise(r => setTimeout(r, 1000)); // fake delay for thinking
            
            let wordCount = answer.split(/\s+/).length;
            let mockScore = 5;
            let mockFeedback = "";
            
            if (wordCount < 15) {
                mockScore = 3;
                mockFeedback = "Your answer is quite brief. Try to elaborate more with specific examples and details to make your response more compelling.";
            } else if (wordCount < 40) {
                mockScore = 5;
                mockFeedback = "Decent response length, but consider adding more depth. Use the STAR method (Situation, Task, Action, Result) to structure your answer.";
            } else if (wordCount < 80) {
                mockScore = 7;
                mockFeedback = "Good answer with reasonable detail! Your response shows thought and preparation. Consider adding a specific metric or outcome to strengthen it.";
            } else {
                mockScore = 8;
                mockFeedback = "Excellent, comprehensive response! You've provided great detail. Make sure to stay concise in real interviews — aim for 1-2 minutes per answer.";
            }
            
            const structureKeywords = ['first', 'second', 'then', 'finally', 'result', 'outcome', 'learned'];
            const hasStructure = structureKeywords.some(kw => answer.toLowerCase().includes(kw));
            if (hasStructure) {
                mockScore = Math.min(mockScore + 1, 10);
                mockFeedback += " Great job structuring your answer logically!";
            } else {
                mockFeedback += "\n\n💡 Suggestion: Try structuring your answer using transition words like 'First...', 'Then...', 'As a result...' for better clarity.";
            }

            data = {
                id: Date.now(),
                score: mockScore,
                feedback: mockFeedback
            };
        }

        // Remove typing indicator
        removeTyping(typingId);

        // Build feedback message
        const scoreClass = data.score >= 7 ? 'high' : (data.score >= 4 ? 'mid' : 'low');
        const feedbackHTML = `
            <div class="feedback-result">
                <div class="feedback-score">
                    <span class="score-badge score-${scoreClass}">${data.score}/10</span>
                </div>
                <div class="feedback-text">${data.feedback.replace(/\n/g, '<br>')}</div>
                <div class="feedback-actions">
                    <button class="btn btn-sm btn-outline" onclick="retryQuestion(${data.id})">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="nextQuestion()">
                        <i class="fas fa-arrow-right"></i> Next Question
                    </button>
                </div>
            </div>`;
        addMessage('ai', feedbackHTML);

        // TTS: read feedback
        if (ttsEnabled) speak(`Score: ${data.score} out of 10. ${data.feedback.replace(/<[^>]*>/g, '')}`);

        // Mark question as answered in sidebar
        const statusEl = document.getElementById(`q-status-${currentQuestion.id}`);
        if (statusEl) statusEl.innerHTML = `<i class="fas fa-check-circle" style="color: var(--green)"></i>`;

    } catch (err) {
        removeTyping(typingId);
        addMessage('ai', `<span style="color:var(--red)">Unexpected error. Please try again.</span>`);
    }

    sendBtn.disabled = false;
}

// ===== Retry a Question =====
async function retryQuestion(parentId) {
    if (!currentQuestion) return;
    addMessage('ai', `Let's try again! Here's the question:<br><br><strong>${currentQuestion.text}</strong>`);
    answerInput.focus();

    // Override submit to use retry endpoint
    const originalSubmit = window.submitAnswer;
    window.submitAnswer = async function () {
        if (!answerInput.value.trim()) return;
        const answer = answerInput.value.trim();
        addMessage('user', answer);
        answerInput.value = '';
        const typingId = showTyping();

        try {
            let data = null;
            let fetchFailed = false;

            if (window.location.protocol !== 'file:') {
                try {
                    const res = await fetch('/api/retry-answer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parent_id: parentId, answer })
                    });
                    
                    if (res.ok) {
                        data = await res.json();
                    } else {
                        fetchFailed = true;
                    }
                } catch (err) {
                    fetchFailed = true;
                }
            } else {
                fetchFailed = true;
            }

            if (fetchFailed || !data) {
                await new Promise(r => setTimeout(r, 1000));
                let wordCount = answer.split(/\s+/).length;
                let mockScore = 5;
                let mockFeedback = "";
                
                if (wordCount < 15) { mockScore = 4; mockFeedback = "Still a bit brief. Detail is key!"; }
                else if (wordCount < 40) { mockScore = 6; mockFeedback = "Getting better, but more context would help."; }
                else { mockScore = 9; mockFeedback = "Excellent retry! You hit the main points clearly."; }
                
                data = {
                    id: Date.now(),
                    score: mockScore,
                    feedback: mockFeedback,
                    version: 2
                };
            }

            removeTyping(typingId);

            const scoreClass = data.score >= 7 ? 'high' : (data.score >= 4 ? 'mid' : 'low');
            addMessage('ai', `
                <div class="feedback-result">
                    <div class="feedback-score">
                        <span class="score-badge score-${scoreClass}">${data.score}/10</span>
                        <span class="version-label">Version ${data.version || 2}</span>
                    </div>
                    <div class="feedback-text">${data.feedback.replace(/\n/g, '<br>')}</div>
                    <div class="feedback-actions">
                        <button class="btn btn-sm btn-outline" onclick="retryQuestion(${data.id})">
                            <i class="fas fa-redo"></i> Retry Again
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="nextQuestion()">
                            <i class="fas fa-arrow-right"></i> Next Question
                        </button>
                    </div>
                </div>`);
            if (ttsEnabled) speak(`Version ${data.version || 2}. Score: ${data.score} out of 10.`);
        } catch (e) {
            removeTyping(typingId);
            addMessage('ai', `<span style="color:var(--red)">Unexpected error. Please try again.</span>`);
        }

        // Restore original submit
        window.submitAnswer = originalSubmit;
    };
}

// ===== Next Question =====
function nextQuestion() {
    if (!currentQuestion) return;
    const nextId = currentQuestion.id < QUESTIONS_DATA.length ? currentQuestion.id + 1 : 1;
    const next = QUESTIONS_DATA.find(q => q.id === nextId);
    if (next) selectQuestion(next.id, next.category, next.text);
}

// ===== Chat Message Helpers =====
function addMessage(type, html) {
    const div = document.createElement('div');
    div.className = `message ${type}-message`;
    const icon = type === 'ai' ? 'fa-robot' : 'fa-user';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
        <div class="message-avatar"><i class="fas ${icon}"></i></div>
        <div class="message-bubble">${html}</div>
        <span class="message-time">${time}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message ai-message typing-indicator';
    div.id = id;
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ===== Speech Recognition (Voice Input) =====
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { if (micBtn) micBtn.style.display = 'none'; return; }
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) transcript += e.results[i][0].transcript;
        answerInput.value = transcript;
        charCount.textContent = transcript.length + ' characters';
    };
    recognition.onend = () => { if (isRecording) recognition.start(); };
    recognition.onerror = () => { stopRecording(); };
}

function toggleVoiceInput() {
    if (isRecording) stopRecording(); else startRecording();
}

function startRecording() {
    if (!recognition || !currentQuestion) return;
    isRecording = true;
    recognition.start();
    micBtn.classList.add('recording');
    voiceStatus.classList.remove('hidden');
}

function stopRecording() {
    isRecording = false;
    if (recognition) try { recognition.stop(); } catch (e) {}
    micBtn.classList.remove('recording');
    voiceStatus.classList.add('hidden');
}

// ===== Text-to-Speech =====
function speak(text) {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    const btn = document.getElementById('tts-btn');
    btn.innerHTML = ttsEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    btn.title = ttsEnabled ? 'Mute TTS' : 'Enable TTS';
    if (!ttsEnabled) window.speechSynthesis.cancel();
}
