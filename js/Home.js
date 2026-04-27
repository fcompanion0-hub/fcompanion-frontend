// ── Session Guard (runs before DOM) ───────────────────────────
SESSION.initProtectedPage();

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
const savedUserName   = localStorage.getItem('userName') || 'Student';
const savedUserEmail  = localStorage.getItem('userEmail') || '';
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
        SESSION.stopSessionChecker();
        SESSION.clearSession();
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

const BASE_URL = 'https://fcompanion.onrender.com';

// ── Date Separator Helpers ────────────────────────────
function getDateLabel(timestamp) {
    const msgDate   = new Date(timestamp);
    const today     = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a, b) =>
        a.getDate()     === b.getDate()     &&
        a.getMonth()    === b.getMonth()    &&
        a.getFullYear() === b.getFullYear();

    if (sameDay(msgDate, today))     return 'Today';
    if (sameDay(msgDate, yesterday)) return 'Yesterday';

    return msgDate.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short'
    });
}

function renderDateSeparator(label) {
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    separator.innerHTML = `<span>${label}</span>`;
    chatbox.appendChild(separator);
}

// ── Load Chat History ─────────────────────────────────
async function loadChatHistory() {
    const wakeupOverlay = document.getElementById('wakeupOverlay');

    try {
        const token = SESSION.getToken();
        const res = await fetch(`${BASE_URL}/chat/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            SESSION.clearSession();
            return;
        }

        const data     = await res.json();
        const messages = data.messages || [];

        wakeupOverlay.classList.add('hidden');

        if (messages.length === 0) return;

        collapseHero();

        let lastLabel = null;
        messages.forEach(msg => {
            const label = msg.timestamp ? getDateLabel(msg.timestamp) : null;
            if (label && label !== lastLabel) {
                renderDateSeparator(label);
                lastLabel = label;
            }
            renderMessage(msg.text, msg.role, msg.timestamp);
        });

        chatbox.scrollTop = chatbox.scrollHeight;

    } catch {
        setTimeout(() => wakeupOverlay.classList.add('hidden'), 10000);
    }
}

loadChatHistory();

// ── Save Message to DB ────────────────────────────────
async function saveMessageToDB(text, role) {
    try {
        await SESSION.apiFetch(`${BASE_URL}/chat/save`, {
            method: 'POST',
            body: JSON.stringify({ text, role })
        });
    } catch {
        // silently fail
    }
}

// ── Hero Collapse ─────────────────────────────────────
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

    // Inject Today separator if this is the first message of the day
    const todayLabel = getDateLabel(new Date());
    const allSeps = chatbox.querySelectorAll('.date-separator');
    const lastSep = allSeps[allSeps.length - 1];

    if (!lastSep || lastSep.querySelector('span').textContent !== todayLabel) {
        renderDateSeparator(todayLabel);
    }

    renderMessage(message, 'user');
    saveMessageToDB(message, 'user');

    searchInput.value = '';

    isWaiting = true;
    sendBtn.disabled = true;

    showTyping();

    fetch(`${BASE_URL}/webhook`, {
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
    .catch(err => {
        console.error('Chat error:', err);
        removeTyping();
        renderMessage('⚠️ Could not reach the server. Please try again.', 'error');
    })
    .finally(() => {
        isWaiting = false;
        sendBtn.disabled = false;
        searchInput.focus();
    });
}

// ── Render Message ────────────────────────────────────
function renderMessage(text, type, timestamp) {
    const row = document.createElement('div');
    row.className = `message-row ${type === 'user' ? 'user' : 'bot'}`;

    if (type === 'bot') {
        const avatarEl = document.createElement('div');
        avatarEl.className = 'bot-avatar';
        avatarEl.textContent = 'FC';
        row.appendChild(avatarEl);
    }

    const col = document.createElement('div');
    col.className = 'msg-col';

    const bubble = document.createElement('div');
    bubble.className = `message ${type}`;
    bubble.textContent = text;

    const meta = document.createElement('div');
    meta.className = 'message-meta';

    const time = timestamp
        ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    meta.textContent = time;

    col.appendChild(bubble);
    col.appendChild(meta);
    row.appendChild(col);
    chatbox.appendChild(row);

    chatbox.scrollTop = chatbox.scrollHeight;
}

// ── Typing Indicator ──────────────────────────────────
function showTyping() {
    if (document.getElementById('typingRow')) return;

    const row = document.createElement('div');
    row.className = 'message-row bot typing-row';
    row.id = 'typingRow';

    const avatarEl = document.createElement('div');
    avatarEl.className = 'bot-avatar';
    avatarEl.textContent = 'FC';

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';

    row.appendChild(avatarEl);
    row.appendChild(indicator);
    chatbox.appendChild(row);

    chatbox.scrollTop = chatbox.scrollHeight;
}

function removeTyping() {
    const row = document.getElementById('typingRow');
    if (row) row.remove();
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

// ── Clear Chat ────────────────────────────────────────
const clearChatBtn = document.getElementById('clearChatBtn');
const clearModal   = document.getElementById('clearModal');
const cancelClear  = document.getElementById('cancelClear');
const confirmClear = document.getElementById('confirmClear');

clearChatBtn.addEventListener('click', () => {
    clearModal.style.display = 'flex';
});

cancelClear.addEventListener('click', () => {
    clearModal.style.display = 'none';
});

clearModal.addEventListener('click', (e) => {
    if (e.target === clearModal) clearModal.style.display = 'none';
});

confirmClear.addEventListener('click', async () => {
    try {
        const res = await SESSION.apiFetch(`${BASE_URL}/chat/clear`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            chatbox.innerHTML = '';
            clearModal.style.display = 'none';

            showToast('Chat history cleared.', 'success');

            heroCollapsed = false;

            if (avatar) {
                avatar.classList.remove('fade-out');
                avatar.style.display = '';
                avatar.style.animation = 'none';
                avatar.offsetHeight;
                avatar.style.animation = '';
            }

            if (welcomeText) {
                welcomeText.style.display = '';
                welcomeText.classList.remove('fade-out');
            }

        } else {
            showToast('Failed to clear history.', 'error');
        }

    } catch (err) {
        console.error(err);
        showToast('Error clearing chat.', 'error');
    }
});

// ── Splash Screen ─────────────────────────────────────
(function () {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;

    const MIN_MS = 2200;
    const start  = Date.now();

    function dismissSplash() {
        const elapsed = Date.now() - start;
        const delay   = Math.max(0, MIN_MS - elapsed);

        setTimeout(() => splash.classList.add('hidden'), delay);
    }

    if (document.readyState === 'complete') {
        dismissSplash();
    } else {
        window.addEventListener('load', dismissSplash);
    }
})();

// ── PWA Install ───────────────────────────────────────
let deferredPrompt = null;

const installBtn    = document.getElementById('pwaInstallBtn');
const pwaBanner     = document.getElementById('pwaBanner');
const bannerInstall = document.getElementById('bannerInstall');
const bannerDismiss = document.getElementById('bannerDismiss');

const isIos        = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

if (isIos && !isStandalone) {
    installBtn.style.display = 'flex';

    installBtn.addEventListener('click', () => {
        showToast("Tap Share → Add to Home Screen", 'info', 5000);
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

        const { outcome } = await deferredPrompt.userChoice;

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

// ── Scroll to Bottom Button ───────────────────────────
const scrollToBottomBtn = document.getElementById('scrollToBottom');

chatbox.addEventListener('scroll', () => {
    const distanceFromBottom = chatbox.scrollHeight - chatbox.scrollTop - chatbox.clientHeight;
    if (distanceFromBottom > 200) {
        scrollToBottomBtn.classList.add('visible');
    } else {
        scrollToBottomBtn.classList.remove('visible');
    }
});

scrollToBottomBtn.addEventListener('click', () => {
    chatbox.scrollTo({ top: chatbox.scrollHeight, behavior: 'smooth' });
});

});