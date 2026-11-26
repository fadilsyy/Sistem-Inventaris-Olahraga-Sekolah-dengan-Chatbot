document.addEventListener('DOMContentLoaded', () => {
  const THEME_STORAGE_KEY = 'sportify_theme';
  const themeToggleBtn = document.getElementById('btn-theme-toggle');

  function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-pressed', String(isDark));
      themeToggleBtn.setAttribute(
        'aria-label',
        isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'
      );
      themeToggleBtn.setAttribute(
        'title',
        isDark ? 'Mode Terang' : 'Mode Gelap'
      );
      const sunIcon = themeToggleBtn.querySelector('[data-theme-icon="sun"]');
      const moonIcon = themeToggleBtn.querySelector('[data-theme-icon="moon"]');
      if (sunIcon && moonIcon) {
        sunIcon.classList.toggle('hidden', !isDark);
        moonIcon.classList.toggle('hidden', isDark);
      }
    }
  }

  // Sinkronkan status tombol tema sesuai class <html> yang dipasang skrip anti-flash
  applyTheme(document.documentElement.classList.contains('dark'));

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextIsDark = !document.documentElement.classList.contains('dark');
      applyTheme(nextIsDark);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? 'dark' : 'light');
      } catch (_) {
        // Abaikan jika penyimpanan lokal tidak tersedia
      }
    });
  }

  const loginForm = document.getElementById('form-login');
  const alertBox = document.getElementById('login-alert');
  const togglePwdBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('btn-submit-login');

  function showAlert(message, type = 'error') {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.classList.remove(
      'hidden',
      'bg-red-50',
      'border-red-200',
      'text-red-700',
      'dark:bg-red-950/60',
      'dark:border-red-800/70',
      'dark:text-red-300',
      'bg-emerald-50',
      'border-emerald-200',
      'text-emerald-800',
      'dark:bg-emerald-950/60',
      'dark:border-emerald-800/70',
      'dark:text-emerald-300'
    );
    if (type === 'success') {
      alertBox.classList.add(
        'bg-emerald-50',
        'border-emerald-200',
        'text-emerald-800',
        'dark:bg-emerald-950/60',
        'dark:border-emerald-800/70',
        'dark:text-emerald-300'
      );
    } else {
      alertBox.classList.add(
        'bg-red-50',
        'border-red-200',
        'text-red-700',
        'dark:bg-red-950/60',
        'dark:border-red-800/70',
        'dark:text-red-300'
      );
    }
  }

  if (togglePwdBtn && passwordInput) {
    togglePwdBtn.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      togglePwdBtn.textContent = isHidden ? 'Sembunyikan' : 'Lihat';
      togglePwdBtn.setAttribute('aria-pressed', String(isHidden));
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = passwordInput.value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses...';

      try {
        const res = await ApiClient.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        ApiClient.setSession(res.data.token, res.data.user);
        showAlert('Login berhasil! Mengalihkan ke dashboard...', 'success');

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 400);
      } catch (err) {
        showAlert(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Masuk ke Sistem';
      }
    });
  }

  // Handler tombol logout (dapat dipakai di seluruh halaman internal)
  const logoutBtns = document.querySelectorAll('#btn-logout, #btn-logout-test');
  logoutBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await ApiClient.request('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        // Abaikan error network saat logout, tetap bersihkan sesi lokal
      } finally {
        ApiClient.clearSession();
        window.location.href = '/login';
      }
    });
  });
});
