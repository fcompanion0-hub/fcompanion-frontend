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

    // ── Theme ─────────────────────────────────────────────
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

    // ── Guard ─────────────────────────────────────────────
    const email = localStorage.getItem('pendingEmail');
    if (!email) {
        showToast('No signup in progress. Redirecting...', 'error');
        setTimeout(() => window.location.href = 'Auth.html', 2000);
        return;
    }

    document.getElementById('stepDescription').textContent =
        `We sent a 6-digit code to ${email}`;

    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = 'Auth.html';
    });

    // ── OTP Inputs ────────────────────────────────────────
    const codeInputs = document.querySelectorAll('.code-input');

    codeInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < codeInputs.length - 1)
                codeInputs[index + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '' && index > 0)
                codeInputs[index - 1].focus();
        });
    });

    // ── Verify OTP ────────────────────────────────────────
    document.getElementById('codeForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const otp = Array.from(codeInputs).map(i => i.value).join('');
        if (otp.length !== 6) {
            showToast('Please enter the complete 6-digit code.', 'error');
            return;
        }

        fetch("https://fcompanion.onrender.com/verify-signup-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message === "User created successfully") {
                const user = data.user;
                localStorage.setItem("token",          data.token);
                localStorage.setItem("firstName",      user.firstName);
                localStorage.setItem("lastName",       user.lastName);
                localStorage.setItem("userName",       user.firstName);
                localStorage.setItem("userEmail",      user.email);
                localStorage.setItem("userLevel",      user.level);
                localStorage.setItem("userDepartment", user.department);
                localStorage.removeItem("pendingEmail");

                document.getElementById('codeStep').classList.remove('active');
                document.getElementById('successStep').classList.add('active');
                document.getElementById('step2').classList.add('active');
                document.getElementById('stepTitle').textContent = 'Account Created!';
                document.getElementById('stepDescription').textContent = '';
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(() => showToast('Something went wrong. Please try again.', 'error'));
    });

    // ── Resend ────────────────────────────────────────────
    document.getElementById('resendCode').addEventListener('click', () => {
        fetch("https://fcompanion.onrender.com/resend-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, purpose: "verification" })
        })
        .then(res => res.json())
        .then(data => showToast(data.message, 'success'))
        .catch(() => showToast('Failed to resend code. Please try again.', 'error'));
    });

    document.getElementById('goToHome').addEventListener('click', () => {
        window.location.href = 'Home.html';
    });

});