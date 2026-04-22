// ── Auth Guard ────────────────────────────────────────────
const token = localStorage.getItem('token');
if (!token) {
    window.location.replace('Auth.html');
}

document.addEventListener("DOMContentLoaded", () => {

// ── Toast ─────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);

    const dismiss = () => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
}

// ── Theme Toggle ──────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');
const html        = document.documentElement;

const currentTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', currentTheme);

themeIcon.innerHTML = currentTheme === 'light'
    ? '<ion-icon name="moon"></ion-icon>'
    : '<ion-icon name="sunny"></ion-icon>';

themeToggle.addEventListener('click', () => {
    const newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    themeIcon.innerHTML = newTheme === 'light'
        ? '<ion-icon name="moon"></ion-icon>'
        : '<ion-icon name="sunny"></ion-icon>';
});

// ── Load User Data ────────────────────────────────────
const savedUserName  = localStorage.getItem('userName')  || 'Student';
const savedUserEmail = localStorage.getItem('userEmail') || '';
const savedProfilePic = localStorage.getItem('profilePicture');

document.getElementById('welcomeName').textContent = savedUserName;
document.getElementById('userName').textContent    = savedUserName;
document.getElementById('userEmail').textContent   = savedUserEmail;

const profilePicture = document.getElementById('profilePicture');

if (savedProfilePic) {
    profilePicture.innerHTML = `<img src="${savedProfilePic}" alt="Profile">`;
} else {
    profilePicture.textContent = savedUserName.charAt(0).toUpperCase();
}

// ── Profile Dropdown ──────────────────────────────────
const profileDropdown = document.getElementById('profileDropdown');

profilePicture.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!profilePicture.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('active');
    }
});

document.getElementById('profileBtn').addEventListener('click', () => {
    window.location.href = 'Profile.html';
    profileDropdown.classList.remove('active');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to log out?')) {
        ['userName','firstName','lastName','userEmail','profilePicture','sessionId','token','cachedMessages']
            .forEach(k => localStorage.removeItem(k));
        window.location.replace('Auth.html');
    }
    profileDropdown.classList.remove('active');
});

// ── Chat Elements ─────────────────────────────────────
const searchInput = document.getElementById('searchInput');
const sendBtn     = document.getElementById('sendBtn');
const chatbox     = document.getElementById('chatbox');
const avatar      = document.querySelector('.avatar');
const welcomeText = document.getElementById('welcomeText');

let sessionId     = localStorage.getItem('sessionId') || null;
let heroCollapsed = false;
let isWaiting     = false;

// ── Local Cache ───────────────────────────────────────
function saveMessagesLocally(messages) {
    localStorage.setItem('cachedMessages', JSON.stringify(messages));
}

function loadCachedMessages() {
    const cached = localStorage.getItem('cachedMessages');
    return cached ? JSON.parse(cached) : [];
}

// ── Load History ──────────────────────────────────────
function loadChatHistory() {
    fetch('https://fcompanion.onrender.com/chat/history', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const messages = data.messages || [];
        if (!messages.length) return;

        saveMessagesLocally(messages);
        collapseHero();

        messages.forEach(msg => renderMessage(msg.text, msg.role, msg.timestamp));
        chatbox.scrollTop = chatbox.scrollHeight;
    })
    .catch(() => {
        const cached = loadCachedMessages();
        if (!cached.length) return;

        collapseHero();
        cached.forEach(msg => renderMessage(msg.text, msg.role, msg.timestamp));
        chatbox.scrollTop = chatbox.scrollHeight;

        showToast('You are offline. Showing cached messages.', 'info');
    });
}

loadChatHistory();

// ── Save Message ──────────────────────────────────────
function saveMessageToDB(text, role) {
    const cached = loadCachedMessages();
    cached.push({ text, role, timestamp: new Date().toISOString() });
    saveMessagesLocally(cached);

    fetch('https://fcompanion.onrender.com/chat/save', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, role })
    }).catch(() => {});
}

// ── Collapse Hero ─────────────────────────────────────
function collapseHero() {
    if (heroCollapsed) return;

    if (avatar) avatar.classList.add('fade-out');
    if (welcomeText) welcomeText.classList.add('fade-out');

    setTimeout(() => {
        if (avatar) avatar.style.display = 'none';
        if (welcomeText) welcomeText.style.display = 'none';
    }, 400);

    heroCollapsed = true;
}

// ── Send Message ──────────────────────────────────────
function sendMessage() {
    const message = searchInput.value.trim();
    if (!message || isWaiting) return;

    collapseHero();
    renderMessage(message, 'user');
    saveMessageToDB(message, 'user');

    searchInput.value = '';

    isWaiting = true;
    sendBtn.disabled = true;

    showTyping();

    fetch('https://fcompanion.onrender.com/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
    })
    .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
    })
    .then(data => {
        removeTyping();

        const reply = data.reply || 'No response received.';
        renderMessage(reply, 'bot');
        saveMessageToDB(reply, 'bot');

        if (data.sessionId) {
            sessionId = data.sessionId;
            localStorage.setItem('sessionId', sessionId);
        }
    })
    .catch(() => {
        removeTyping();
        renderMessage('⚠️ Could not reach the server. Please try again.', 'error');
    })
    .finally(() => {
        isWaiting = false;
        sendBtn.disabled = false;
        searchInput.focus();
    });
}

// ── Events ────────────────────────────────────────────
sendBtn.addEventListener('click', sendMessage);

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

searchInput.focus();

// ── PWA Install Fix (kept intact) ─────────────────────
let deferredPrompt = null;

const installBtn     = document.getElementById('pwaInstallBtn');
const pwaBanner      = document.getElementById('pwaBanner');
const bannerInstall  = document.getElementById('bannerInstall');
const bannerDismiss  = document.getElementById('bannerDismiss');

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                  || window.navigator.standalone === true;

if (isIos && !isStandalone) {
    installBtn.style.display = 'flex';
    installBtn.addEventListener('click', () => {
        showToast("Tap Share then 'Add to Home Screen'", 'info', 5000);
    });
} else {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'flex';

        if (!sessionStorage.getItem('pwaBannerDismissed')) {
            setTimeout(() => pwaBanner.classList.add('visible'), 3000);
        }
    });

    async function triggerInstall() {
        if (!deferredPrompt) return;
        pwaBanner.classList.remove('visible');
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.style.display = 'none';
    }

    installBtn.addEventListener('click', triggerInstall);
    bannerInstall.addEventListener('click', triggerInstall);

    window.addEventListener('appinstalled', () => {
        installBtn.style.display = 'none';
        pwaBanner.classList.remove('visible');
        deferredPrompt = null;
    });
}

bannerDismiss.addEventListener('click', () => {
    pwaBanner.classList.remove('visible');
    sessionStorage.setItem('pwaBannerDismissed', '1');
});

});