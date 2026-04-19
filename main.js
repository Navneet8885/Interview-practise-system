/**
 * main.js — Global JavaScript for HRInterviewPro
 * Author: Navneet Kaur | AI Course Project
 * Handles: Navbar scroll, mobile toggle, smooth scroll, password toggle/strength, flash messages
 */

// ===== Navbar scroll effect =====
window.addEventListener('scroll', () => {
    const nav = document.getElementById('main-navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
});

// ===== Mobile nav toggle =====
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        navToggle.classList.toggle('active');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            navToggle.classList.remove('active');
        });
    });
}

// ===== Smooth scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
});

// ===== Password toggle =====
function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = input.parentElement.querySelector('.password-toggle i');
    if (input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

// ===== Password strength meter =====
const pwInput = document.getElementById('password');
const pwStrength = document.getElementById('password-strength');
if (pwInput && pwStrength) {
    pwInput.addEventListener('input', () => {
        const val = pwInput.value;
        let strength = 0, label = '', cls = '';
        if (val.length >= 6) strength++;
        if (val.length >= 10) strength++;
        if (/[A-Z]/.test(val)) strength++;
        if (/[0-9]/.test(val)) strength++;
        if (/[^A-Za-z0-9]/.test(val)) strength++;
        if (strength <= 1) { label = 'Weak'; cls = 'weak'; }
        else if (strength <= 3) { label = 'Medium'; cls = 'medium'; }
        else { label = 'Strong'; cls = 'strong'; }
        pwStrength.innerHTML = val ? `<div class="strength-bar ${cls}"></div><span>${label}</span>` : '';
    });
}

// ===== Flash message auto-dismiss =====
document.querySelectorAll('.flash-message').forEach(msg => {
    setTimeout(() => { msg.style.opacity = '0'; setTimeout(() => msg.remove(), 400); }, 5000);
});

// ===== Animate elements on scroll =====
const observerOpts = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, observerOpts);
document.querySelectorAll('.feature-card, .about-card, .pricing-card, .step-card, .stat-card').forEach(el => {
    el.classList.add('animate-in');
    observer.observe(el);
});
