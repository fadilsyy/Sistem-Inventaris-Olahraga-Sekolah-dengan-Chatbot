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