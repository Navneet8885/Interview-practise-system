/**
 * dashboard.js — Dashboard Interactions
 * Author: Navneet Kaur | AI Course Project
 * Handles: Version history toggle, stat number animations
 */

// Toggle version history visibility
function toggleVersions(btn) {
    const list = btn.nextElementSibling;
    if (list) {
        const showing = list.style.display !== 'none';
        list.style.display = showing ? 'none' : 'block';
        btn.innerHTML = showing
            ? btn.innerHTML.replace('Hide', 'Show')
            : btn.innerHTML.replace('revision', 'Hide revision');
    }
}

// Animate stat numbers on load
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.stat-card-number').forEach(el => {
        const target = parseFloat(el.textContent);
        if (isNaN(target)) return;
        const suffix = el.textContent.replace(/[\d.]/g, '');
        let current = 0;
        const step = target / 40;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
        }, 30);
    });
});
