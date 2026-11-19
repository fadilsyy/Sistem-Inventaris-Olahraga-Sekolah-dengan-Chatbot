document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('form-login');
  const alertBox = document.getElementById('login-alert');
  const togglePwdBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('btn-submit-login');

  function showAlert(message, type = 'error') {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.classList.remove('hidden', 'bg-red-50', 'border-red-200', 'text-red-700', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
    if (type === 'success') {
      alertBox.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
    } else {
      alertBox.classList.add('bg-red-50', 'border-red-200', 'text-red-700');
    }
  }

  if (togglePwdBtn && passwordInput) {
    togglePwdBtn.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      togglePwdBtn.textContent = isHidden ? 'Sembunyikan' : 'Lihat';
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
        submitBtn.textContent = 'Masuk (Login)';
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