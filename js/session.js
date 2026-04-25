/**
 * session.js — FCompanion Centralized Auth & Session Manager
 *
 * Provides:
 * - authGuard()
 * - validateWithServer()
 * - startSessionChecker()
 * - stopSessionChecker()
 * - isTokenExpiredLocally()
 * - apiFetch()
 * - clearSession()
 * - initProtectedPage()
 */

const SESSION = (() => {

    const BASE_URL = 'https://fcompanion.onrender.com';

    const SESSION_KEYS = [
        'token',
        'userName',
        'firstName',
        'lastName',
        'userEmail',
        'userLevel',
        'userDepartment',
        'profilePicture',
        'sessionId'
    ];

    // ── Helpers ────────────────────────────────────────────────
    function clearSession() {
        SESSION_KEYS.forEach(k => localStorage.removeItem(k));
        window.location.replace('Auth.html');
    }

    function getToken() {
        return localStorage.getItem('token');
    }

    // ── 1. Auth Guard ──────────────────────────────────────────
    function authGuard() {
        if (!getToken()) {
            window.location.replace('Auth.html');
            return false;
        }
        return true;
    }

    // ── 2. Client-side JWT expiry peek ─────────────────────────
    function isTokenExpiredLocally() {
        const token = getToken();
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));

            if (!payload.exp) return false;

            return Date.now() / 1000 > payload.exp;

        } catch {
            return true;
        }
    }

    // ── 3. Server validation ───────────────────────────────────
    async function validateWithServer() {
        const token = getToken();

        if (!token) {
            clearSession();
            return false;
        }

        try {
            const res = await fetch(`${BASE_URL}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401) {
                clearSession();
                return false;
            }

            return true;

        } catch {
            return false;
        }
    }

    // ── 4. Periodic session checker ────────────────────────────
    let _checkerTimer = null;

    function startSessionChecker(intervalMs = 5 * 60 * 1000) {
        if (_checkerTimer) return;

        _checkerTimer = setInterval(async () => {
            if (isTokenExpiredLocally()) {
                const stillValid = await validateWithServer();

                if (!stillValid) {
                    clearInterval(_checkerTimer);
                    _checkerTimer = null;
                }

            } else {
                await validateWithServer();
            }
        }, intervalMs);
    }

    function stopSessionChecker() {
        if (_checkerTimer) {
            clearInterval(_checkerTimer);
            _checkerTimer = null;
        }
    }

    // ── 5. Online status listener ──────────────────────────────
    function startOnlineListener() {
        window.addEventListener('online', async () => {
            await validateWithServer();
        });
    }

    // ── 6. Centralised authenticated fetch ────────────────────
    async function apiFetch(url, options = {}) {
        const token = getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            clearSession();
            throw new Error('Session expired. Please log in again.');
        }

        return response;
    }

    // ── 7. Protected page init ────────────────────────────────
    async function initProtectedPage() {
        if (!authGuard()) return;

        validateWithServer(); // non-blocking

        startSessionChecker();
        startOnlineListener();
    }

    // ── Public API ────────────────────────────────────────────
    return {
        authGuard,
        isTokenExpiredLocally,
        validateWithServer,
        startSessionChecker,
        stopSessionChecker,
        startOnlineListener,
        apiFetch,
        clearSession,
        initProtectedPage,
        getToken
    };

})();