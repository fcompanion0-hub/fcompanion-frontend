document.addEventListener("DOMContentLoaded", () => {

    // ── Toast ─────────────────────────────────────────────
    function showToast(message, type = 'info', duration = 3500) {
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

    // ── Loading Button Helpers ─────────────────────────────
    function setLoading(btn, text) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> ${text}`;
    }

    function resetBtn(btn, text) {
        btn.disabled = false;
        btn.textContent = text;
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

    // ── Tab Switching ─────────────────────────────────────
    const loginTab   = document.getElementById('loginTab');
    const signupTab  = document.getElementById('signupTab');
    const loginForm  = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    // ── Password Toggles ──────────────────────────────────
    function setupPasswordToggle(toggleId, inputId) {
        document.getElementById(toggleId).addEventListener('click', () => {
            const input = document.getElementById(inputId);
            const btn   = document.getElementById(toggleId);
            if (input.type === 'password') {
                input.type    = 'text';
                btn.innerHTML = '<ion-icon name="eye-off"></ion-icon>';
            } else {
                input.type    = 'password';
                btn.innerHTML = '<ion-icon name="eye"></ion-icon>';
            }
        });
    }

    setupPasswordToggle('toggleLoginPassword',   'loginPassword');
    setupPasswordToggle('toggleSignupPassword',  'signupPassword');
    setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');

    // ── Password Validator ────────────────────────────────
    function validatePassword(password) {
        if (password.length < 8)        return 'Password must be at least 8 characters.';
        if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter.';
        if (!/[0-9]/.test(password))    return 'Password must contain at least one number.';
        return null;
    }

    // ── Login ─────────────────────────────────────────────
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const btn = e.submitter;

        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email.endsWith('@nileuniversity.edu.ng')) {
            showToast('Use a valid Nile University email.', 'error');
            return;
        }

        setLoading(btn, "Please wait...");

        fetch("https://fcompanion.onrender.com/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message === "Login successful") {
                const user = data.user;
                localStorage.setItem("token", data.token);
                localStorage.setItem("firstName", user.firstName);
                localStorage.setItem("lastName", user.lastName);
                localStorage.setItem("userName", user.firstName);
                localStorage.setItem("userEmail", user.email);
                localStorage.setItem("userLevel", user.level);
                localStorage.setItem("userDepartment", user.department);
                window.location.href = "Home.html";
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(() => showToast('Something went wrong. Please try again.', 'error'))
        .finally(() => resetBtn(btn, "Log In"));
    });

    // ── Signup ────────────────────────────────────────────
    document.getElementById('signupForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const btn = e.submitter;

        const firstName       = document.getElementById('firstName').value.trim();
        const lastName        = document.getElementById('lastName').value.trim();
        const email           = document.getElementById('signupEmail').value.trim();
        const level           = document.getElementById('level').value;
        const department      = document.getElementById('department').value;
        const password        = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!email.endsWith('@nileuniversity.edu.ng')) {
            showToast('Use a valid Nile University email.', 'error');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            showToast(passwordError, 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        setLoading(btn, "Creating account...");

        fetch("https://fcompanion.onrender.com/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstName, lastName, email, level, department, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message === "OTP sent") {
                localStorage.setItem("pendingEmail", email);
                window.location.href = "VerifyEmail.html";
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(() => showToast('Something went wrong. Please try again.', 'error'))
        .finally(() => resetBtn(btn, "Create Account"));
    });

    // ── Links ─────────────────────────────────────────────
    document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'forgot-password.html';
    });

    document.getElementById('termsLink').addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Terms of Service — Coming soon!', 'info');
    });

    document.getElementById('privacyLink').addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Privacy Policy — Coming soon!', 'info');
    });

});