// ── Session Guard (runs before DOM) ───────────────────────────
SESSION.initProtectedPage();

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

    // ── Elements ──────────────────────────────────────────
    const firstNameInput      = document.getElementById('firstName');
    const lastNameInput       = document.getElementById('lastName');
    const emailInput          = document.getElementById('emailAddress');
    const levelSelect         = document.getElementById('level');
    const departmentSelect    = document.getElementById('department');
    const profilePictureLarge = document.getElementById('profilePictureLarge');

    const BASE_URL = 'https://fcompanion.onrender.com';

    // ── Fetch Profile ─────────────────────────────────────
    SESSION.apiFetch(`${BASE_URL}/profile`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                showToast(data.error, 'error');
                setTimeout(() => window.location.replace('Auth.html'), 2000);
                return;
            }

            firstNameInput.value   = data.firstName   || '';
            lastNameInput.value    = data.lastName    || '';
            emailInput.value       = data.email       || '';
            levelSelect.value      = data.level       || '';
            departmentSelect.value = data.department  || '';

            if (data.profilePicture) {
                profilePictureLarge.innerHTML = `<img src="${data.profilePicture}" alt="Profile">`;
            } else {
                profilePictureLarge.textContent = data.firstName.charAt(0).toUpperCase();
            }
        })
        .catch(() => {
            showToast('Failed to load profile. Please try again.', 'error');
        });

    // ── Form Submit ───────────────────────────────────────
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const updatedProfile = {
            firstName:  firstNameInput.value.trim(),
            lastName:   lastNameInput.value.trim(),
            level:      levelSelect.value,
            department: departmentSelect.value
        };

        if (!updatedProfile.firstName || !updatedProfile.lastName) {
            showToast('Please enter both first and last name.', 'error');
            return;
        }

        if (!updatedProfile.level || !updatedProfile.department) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        try {
            const res  = await SESSION.apiFetch(`${BASE_URL}/profile`, {
                method: 'PUT',
                body: JSON.stringify(updatedProfile)
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('firstName',      updatedProfile.firstName);
                localStorage.setItem('lastName',       updatedProfile.lastName);
                localStorage.setItem('userName',       updatedProfile.firstName);
                localStorage.setItem('userLevel',      updatedProfile.level);
                localStorage.setItem('userDepartment', updatedProfile.department);

                showToast('Profile updated successfully!', 'success');
                setTimeout(() => window.location.href = 'Home.html', 1500);

            } else {
                showToast(data.error || 'Failed to update profile.', 'error');
            }

        } catch {
            showToast('Something went wrong. Please try again.', 'error');
        }
    });

    // ── Cancel / Back ─────────────────────────────────────
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.location.href = 'Home.html';
    });

    document.getElementById('backToDashboard').addEventListener('click', () => {
        window.location.href = 'Home.html';
    });

});