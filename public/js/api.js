const ApiClient = {
  getToken() {
    return localStorage.getItem('inventaris_jwt_token');
  },

  setSession(token, user) {
    if (token) localStorage.setItem('inventaris_jwt_token', token);
    if (user) localStorage.setItem('inventaris_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('inventaris_jwt_token');
    localStorage.removeItem('inventaris_user');
  },

  getUser() {
    try {
      const raw = localStorage.getItem('inventaris_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  async request(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin'
    });

    const payload = await response.json().catch(() => ({
      success: false,
      message: 'Gagal membaca respons dari server.'
    }));

    if (response.status === 401 && !url.includes('/api/auth/login')) {
      this.clearSession();
      window.location.href = '/login';
      throw new Error(payload.message || 'Sesi telah berakhir.');
    }

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `Terjadi kesalahan (HTTP ${response.status})`);
    }

    return payload;
  }
};

function animateCount(el, targetValue, options) {
  if (!el) return;
  var opts = options || {};
  var prefix = typeof opts.prefix === 'string' ? opts.prefix : '';
  var suffix = typeof opts.suffix === 'string' ? opts.suffix : '';
  var finalVal = Number(targetValue) || 0;
  var prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (el._countRaf) {
    cancelAnimationFrame(el._countRaf);
    el._countRaf = null;
  }

  var startVal = Number(el.dataset.countValue) || 0;
  el.dataset.countValue = String(finalVal);

  if (prefersReduced || startVal === finalVal) {
    el.textContent = prefix + finalVal + suffix;
    return;
  }

  var duration = 420;
  var startTime = performance.now();

  function step(now) {
    var progress = Math.min((now - startTime) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    var current = Math.round(startVal + (finalVal - startVal) * eased);
    el.textContent = prefix + current + suffix;
    if (progress < 1) {
      el._countRaf = requestAnimationFrame(step);
    } else {
      el._countRaf = null;
      el.textContent = prefix + finalVal + suffix;
    }
  }

  el._countRaf = requestAnimationFrame(step);
}

