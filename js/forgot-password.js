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

    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = 'Auth.html';
    });

    // ── Password Validator ────────────────────────────────
    function validatePassword(password) {
        if (password.length < 8)        return 'Password must be at least 8 characters.';
        if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter.';
        if (!/[0-9]/.test(password))    return 'Password must contain at least one number.';
        return null;
    }

    // ── Step Management ───────────────────────────────────
    let userEmail   = '';
    let verifiedOtp = '';

    const steps = [
        { title: 'Forgot Password?',  description: "No worries, we'll send you reset instructions." },
        { title: 'Verify Your Email', description: 'We sent a code to your email address.' },
        { title: 'Set New Password',  description: 'Your new password must be different from previous passwords.' },
        { title: 'Success!',          description: '' }
    ];

    function updateStep(step) {
        document.getElementById('step1').classList.toggle('active', step >= 1);
        document.getElementById('step2').classList.toggle('active', step >= 2);
        document.getElementById('step3').classList.toggle('active', step >= 3);
        document.getElementById('stepTitle').textContent       = steps[step - 1].title;
        document.getElementById('stepDescription').textContent = steps[step - 1].description;
        document.getElementById('emailStep').classList.toggle('active',    step === 1);
        document.getElementById('codeStep').classList.toggle('active',     step === 2);
        document.getElementById('passwordStep').classList.toggle('active', step === 3);
        document.getElementById('successStep').classList.toggle('active',  step === 4);
    }

    // ── Step 1: Send OTP ──────────────────────────────────
    document.getElementById('emailForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('resetEmail').value.trim();
        if (!email.toLowerCase().endsWith('@nileuniversity.edu.ng')) {
            showToast('Please use your Nile University email address.', 'error');
            return;
        }

        fetch("https://fcompanion.onrender.com/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message === "Reset OTP sent") {
                userEmail = email;
                document.getElementById('stepDescription').textContent =
                    `We sent a code to ${email}`;
                updateStep(2);
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(() => showToast('Something went wrong. Please try again.', 'error'));
    });

    // ── OTP Inputs ────────────────────────────────────────
    const codeInputs = document.querySelectorAll('.code-input');

    codeInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            // Enforce single digit since maxlength is ignored on type="number"
            if (input.value.length > 1) input.value = input.value.slice(0, 1);

            if (input.value.length === 1 && index < codeInputs.length - 1)
                codeInputs[index + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '' && index > 0)
                codeInputs[index - 1].focus();
        });
    });

    // ── Step 2: Verify OTP ────────────────────────────────
    document.getElementById('codeForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const otp = Array.from(codeInputs).map(i => i.value).join('');
        if (otp.length !== 6) {
            showToast('Please enter the complete 6-digit code.', 'error');
            return;
        }

        fetch("https://fcompanion.onrender.com/verify-reset-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail, otp })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message === "OTP verified") {
                verifiedOtp = otp;
                updateStep(3);
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(() => showToast('Something went wrong. Please try again.', 'error'));
    });

    // ── Resend OTP ────────────────────────────────────────
    document.getElementById('resendCode').addEventListener('click', () => {
        fetch("https://fcompanion.onrender.com/resend-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail, purpose: "reset" })
        })
        .then(res => res.json())
        .then(data => showToast(data.message, 'success'))
        .catch(() => showToast('Failed to resend code. Please try again.', 'error'));
    });

    // ── Password Toggles ──────────────────────────────────
    function setupToggle(btnId, inputId) {
        document.getElementById(btnId).addEventListener('click', () => {
            const input = document.getElementById(inputId);
            const btn   = document.getElementById(btnId);
            if (input.type === 'password') {
                input.type    = 'text';
                btn.innerHTML = '<ion-icon name="eye-off"></ion-icon>';
            } else {
                input.type    = 'password';
                btn.innerHTML = '<ion-icon name="eye"></ion-icon>';
            }
        });
    }

    setupToggle('toggleNewPassword',     'newPassword');
    setupToggle('toggleConfirmPassword', 'confirmNewPassword');

    // ── Step 3: Reset Password ────────────────────────────
    document.getElementById('passwordForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const newPassword     = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            showToast(passwordError, 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        fetch("https://fcompanion.onrender.com/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail, otp: verifiedOtp, newPassword })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message === "Password reset successful") {
                updateStep(4);
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(() => showToast('Something went wrong. Please try again.', 'error'));
    });

    // ── Step 4: Back to Login ─────────────────────────────
    document.getElementById('backToLogin').addEventListener('click', () => {
        window.location.href = 'Auth.html';
    });

});