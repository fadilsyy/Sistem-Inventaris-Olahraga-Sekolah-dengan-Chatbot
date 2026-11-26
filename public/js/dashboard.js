document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = ApiClient.getUser();
  const navUserEl = document.getElementById('nav-user-name');
  if (currentUser && navUserEl) {
    navUserEl.textContent = currentUser.nama_pengguna;
  }

  const TIPE_BADGES = {
    IN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70',
    OUT: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800/70',
    PINJAM: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70',
    KEMBALI: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800/70',
    CREATE: 'bg-brand-100 text-brand-800 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800/70',
    UPDATE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70',
    STATUS: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatWaktuWIB(isoString) {
    if (!isoString) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoString));
  }

  function animateCount(el, targetValue) {
    if (!el) return;
    const finalVal = Number(targetValue) || 0;
    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || finalVal <= 0) {
      el.textContent = String(finalVal);
      return;
    }

    const duration = 420;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(finalVal * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = String(finalVal);
      }
    }

    requestAnimationFrame(step);
  }

  function renderErrorFallback(message) {
    const safeMsg = escapeHtml(message || 'Gagal memuat data dashboard.');
    const errorCardHtml = `<p class="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/70 rounded-xl p-3 text-center">${safeMsg}</p>`;

    ['kpi-total-jenis', 'kpi-total-aset', 'kpi-total-tersedia', 'kpi-total-dipinjam', 'kpi-unit-baik'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '-';
    });
    const subEl = document.getElementById('kpi-kategori-sub');
    if (subEl) subEl.textContent = 'Data tidak tersedia';
    const sesiEl = document.getElementById('kpi-sesi-pinjam');
    if (sesiEl) sesiEl.textContent = 'Data tidak tersedia';

    ['list-peminjaman-aktif', 'list-stok-menipis', 'list-kondisi-perhatian'].forEach((id) => {
      const container = document.getElementById(id);
      if (container) container.innerHTML = errorCardHtml;
    });

    const logsTbody = document.getElementById('dashboard-recent-logs');
    if (logsTbody) {
      logsTbody.innerHTML = `<tr><td colspan="5" class="py-6 px-4 text-center text-red-700 dark:text-red-300 font-medium">${safeMsg} Muat ulang halaman untuk mencoba kembali.</td></tr>`;
    }
  }

  try {
    const res = await ApiClient.request('/api/dashboard/summary');
    const { kpi, watchlist, recent_movements } = res.data;

    // Render KPI dengan animasi count-up (nilai akhir tetap akurat)
    animateCount(document.getElementById('kpi-total-jenis'), kpi.total_jenis);
    document.getElementById('kpi-kategori-sub').textContent = `${kpi.jenis_sport} Sport • ${kpi.jenis_nonsport} Non-Sport`;
    animateCount(document.getElementById('kpi-total-aset'), kpi.total_unit_aset);
    animateCount(document.getElementById('kpi-total-tersedia'), kpi.total_unit_tersedia);
    animateCount(document.getElementById('kpi-total-dipinjam'), kpi.total_unit_dipinjam);
    document.getElementById('kpi-sesi-pinjam').textContent = `${kpi.total_sesi_pinjam_aktif} sesi peminjaman aktif`;
    animateCount(document.getElementById('kpi-unit-baik'), kpi.total_unit_baik);
    document.getElementById('kpi-unit-cukup').textContent = kpi.total_unit_cukup;
    document.getElementById('kpi-unit-rusak').textContent = kpi.total_unit_rusak;

    // Watchlist 1: Peminjaman Aktif
    const pinjamContainer = document.getElementById('list-peminjaman-aktif');
    if (!watchlist.peminjaman_aktif.length) {
      pinjamContainer.innerHTML =
        '<p class="text-slate-600 dark:text-slate-400 py-5 px-2 text-center">Tidak ada unit yang sedang dipinjam. Peminjaman baru dapat dicatat di halaman Data Inventaris.</p>';
    } else {
      pinjamContainer.innerHTML = watchlist.peminjaman_aktif
        .slice(0, 5)
        .map(
          (t) => `
            <div class="py-2.5 flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(t.peminjam)}</p>
                <p class="text-slate-600 dark:text-slate-400 truncate">${escapeHtml(t.barang?.nama_barang || 'Barang')} &bull; ${formatWaktuWIB(t.borrowed_at)}</p>
              </div>
              <span class="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 shrink-0 kpi-num">
                ${t.jumlah} ${escapeHtml(t.barang?.satuan || 'unit')}
              </span>
            </div>
          `
        )
        .join('');
    }

    // Watchlist 2: Stok Menipis
    const menipisContainer = document.getElementById('list-stok-menipis');
    if (!watchlist.stok_menipis.length) {
      menipisContainer.innerHTML =
        '<p class="text-slate-600 dark:text-slate-400 py-5 px-2 text-center">Semua stok tersedia di rak aman (&gt; 2 unit).</p>';
    } else {
      menipisContainer.innerHTML = watchlist.stok_menipis
        .slice(0, 5)
        .map(
          (b) => `
            <div class="py-2.5 flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(b.nama_barang)}</p>
                <p class="text-slate-600 dark:text-slate-400 font-mono truncate">${escapeHtml(b.kode_barang)} &bull; Dipinjam: ${b.stok_dipinjam}</p>
              </div>
              <span class="px-2.5 py-0.5 rounded-full font-bold shrink-0 kpi-num ${
                b.stok_tersedia === 0
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800/70'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70'
              }">
                Sisa ${b.stok_tersedia} ${escapeHtml(b.satuan)}
              </span>
            </div>
          `
        )
        .join('');
    }

    // Watchlist 3: Kondisi Rusak / Cukup
    const kondisiContainer = document.getElementById('list-kondisi-perhatian');
    if (!watchlist.kondisi_perlu_perhatian.length) {
      kondisiContainer.innerHTML =
        '<p class="text-slate-600 dark:text-slate-400 py-5 px-2 text-center">Seluruh unit aset dalam kondisi Baik.</p>';
    } else {
      kondisiContainer.innerHTML = watchlist.kondisi_perlu_perhatian
        .slice(0, 5)
        .map(
          (b) => `
            <div class="py-2.5 flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(b.nama_barang)}</p>
                <p class="text-slate-600 dark:text-slate-400 font-mono truncate">${escapeHtml(b.kode_barang)}</p>
              </div>
              <div class="flex gap-1 shrink-0 kpi-num">
                ${b.stok_rusak > 0 ? `<span class="px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800/70">${b.stok_rusak} Rusak</span>` : ''}
                ${b.stok_cukup > 0 ? `<span class="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70">${b.stok_cukup} Cukup</span>` : ''}
              </div>
            </div>
          `
        )
        .join('');
    }

    // Recent Audit Logs
    const logsTbody = document.getElementById('dashboard-recent-logs');
    if (!recent_movements.length) {
      logsTbody.innerHTML =
        '<tr><td colspan="5" class="py-8 px-4 text-center text-slate-600 dark:text-slate-400">Belum ada aktivitas tercatat. Catat barang masuk atau peminjaman melalui Data Inventaris.</td></tr>';
    } else {
      logsTbody.innerHTML = recent_movements
        .map((row) => {
          const badge =
            TIPE_BADGES[row.tipe] ||
            'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700';
          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150">
              <td class="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">${formatWaktuWIB(row.created_at)}</td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span class="px-2.5 py-0.5 rounded-full font-bold text-[11px] ${badge}">${escapeHtml(row.tipe)}</span>
              </td>
              <td class="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                ${escapeHtml(row.barang?.nama_barang || '-')}
              </td>
              <td class="py-3 px-4 text-slate-700 dark:text-slate-300">${escapeHtml(row.keterangan || '-')}</td>
              <td class="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">${escapeHtml(row.petugas?.nama_pengguna || 'Sistem')}</td>
            </tr>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Gagal memuat dashboard:', err);
    renderErrorFallback(err.message || 'Gagal memuat data dashboard.');
  }
});
