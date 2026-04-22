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
    const token          = localStorage.getItem('token');
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
            ['userName','firstName','lastName','userEmail','profilePicture','sessionId','token']
                .forEach(k => localStorage.removeItem(k));
            window.location.href = 'Auth.html';
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


    // ── Load Chat History ─────────────────────────────────
    function loadChatHistory() {
        if (!token) return;

        fetch('https://fcompanion.onrender.com/chat/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const messages = data.messages || [];
            if (messages.length === 0) return;

            // Has history — collapse hero and render messages
            collapseHero();
            messages.forEach(msg => renderMessage(msg.text, msg.role, msg.timestamp));
            chatbox.scrollTop = chatbox.scrollHeight;
        })
        .catch(() => {}); // silently fail — not critical
    }

    loadChatHistory();


    // ── Save Message to DB ────────────────────────────────
    function saveMessageToDB(text, role) {
        if (!token) return;
        fetch('https://fcompanion.onrender.com/chat/save', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type':  'application/json'
            },
            body: JSON.stringify({ text, role })
        }).catch(() => {}); // silently fail
    }

    // ── Hero Collapse ─────────────────────────────────────
    function collapseHero() {
        if (heroCollapsed) return;
        if (avatar)      { avatar.classList.add('fade-out'); }
        if (welcomeText) { welcomeText.classList.add('fade-out'); }
        setTimeout(() => {
            if (avatar)      avatar.style.display = 'none';
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

        const col    = document.createElement('div');
        col.className = 'msg-col';

        const bubble = document.createElement('div');
        bubble.className = `message ${type}`;
        bubble.textContent = text;

        const meta = document.createElement('div');
        meta.className = 'message-meta';

        // Use stored timestamp if available, else now
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

     // ── Elements ─────────────────────────────
const clearChatBtn = document.getElementById('clearChatBtn');
const clearModal   = document.getElementById('clearModal');
const cancelClear  = document.getElementById('cancelClear');
const confirmClear = document.getElementById('confirmClear');

// ── Show Modal ────────────────────────────
clearChatBtn.addEventListener('click', () => {
    clearModal.style.display = 'flex';  // use display instead of class toggle for simplicity
});

// ── Hide Modal ────────────────────────────
cancelClear.addEventListener('click', () => {
    clearModal.style.display = 'none';
});
clearModal.addEventListener('click', (e) => {
    if (e.target === clearModal) clearModal.style.display = 'none';
});

// ── Confirm Clear ─────────────────────────
confirmClear.addEventListener('click', () => {
    if (!token) {
        alert("You are not logged in.");
        return;
    }

    fetch('https://fcompanion.onrender.com/chat/clear', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            chatbox.innerHTML = '';
            clearModal.style.display = 'none';
            showToast('Chat history cleared.', 'success');

            // restore hero section
            heroCollapsed = false;
            if (avatar) avatar.style.display = '';
            if (welcomeText) welcomeText.style.display = '';
        } else {
            showToast('Failed to clear history.', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Error clearing chat.', 'error');
    });
});

(function() {
    const splash = document.getElementById('splashScreen');
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('[SW] Registered, scope:', reg.scope))
            .catch(err => console.warn('[SW] Registration failed:', err));
    });
}

let deferredPrompt = null;
const installBtn   = document.getElementById('pwaInstallBtn');
const pwaBanner    = document.getElementById('pwaBanner');
const bannerInstall  = document.getElementById('bannerInstall');
const bannerDismiss  = document.getElementById('bannerDismiss');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    installBtn.style.display = 'flex';

    const dismissed = sessionStorage.getItem('pwaBannerDismissed');
    if (!dismissed) {
        setTimeout(() => pwaBanner.classList.add('visible'), 3000);
    }
});

installBtn.addEventListener('click', triggerInstall);

bannerInstall.addEventListener('click', triggerInstall);

bannerDismiss.addEventListener('click', () => {
    pwaBanner.classList.remove('visible');
    sessionStorage.setItem('pwaBannerDismissed', '1');
});

async function triggerInstall() {
    if (!deferredPrompt) return;
    pwaBanner.classList.remove('visible');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    deferredPrompt = null;
    installBtn.style.display = 'none';
}

window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    pwaBanner.classList.remove('visible');
    deferredPrompt = null;
    console.log('[PWA] App installed successfully');
});

const isIos        = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                  || window.navigator.standalone === true;

if (isIos && !isStandalone) {
    installBtn.style.display = 'flex';
    installBtn.addEventListener('click', () => {
        showToast("Tap the Share button ⎋ then 'Add to Home Screen'", 'info', 5000);
    }, { once: true });
}

});