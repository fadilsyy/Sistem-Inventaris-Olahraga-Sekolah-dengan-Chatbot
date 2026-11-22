document.addEventListener('DOMContentLoaded', () => {
  const currentUser = ApiClient.getUser();
  const navUserEl = document.getElementById('nav-user-name');
  const welcomeUserEl = document.getElementById('welcome-user-name');
  const dateEl = document.getElementById('dashboard-date');

  if (currentUser) {
    if (navUserEl) navUserEl.textContent = currentUser.nama_pengguna;
    if (welcomeUserEl) welcomeUserEl.textContent = currentUser.nama_pengguna;
  }

  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTanggalWIB(isoString) {
    if (!isoString) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoString));
  }

  function renderWatchlist(items) {
    const tbody = document.getElementById('watchlist-table-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-10 text-center text-slate-500">
            Semua perlengkapan dalam kondisi baik dan stok aman.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items
      .map((item) => {
        const badges = item.alasan
          .map((reason) => {
            let colorClass = 'bg-slate-100 text-slate-700';
            if (reason.includes('Habis') || reason.includes('Rusak')) {
              colorClass = 'bg-red-100 text-red-800';
            } else if (reason.includes('Menipis') || reason.includes('Dipinjam')) {
              colorClass = 'bg-amber-100 text-amber-800';
            }
            return `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}">${escapeHtml(reason)}</span>`;
          })
          .join(' ');

        const actionLink =
          item.stok_sistem <= 2
            ? `<a href="/barang-masuk" class="text-xs font-semibold text-emerald-700 hover:underline">+ Restock</a>`
            : `<a href="/inventaris" class="text-xs font-semibold text-blue-700 hover:underline">Periksa</a>`;

        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3 px-4">
              <div class="font-semibold text-slate-900">${escapeHtml(item.nama_barang)}</div>
              <div class="text-xs font-mono text-slate-500">${escapeHtml(item.kode_barang)} &bull; ${escapeHtml(item.kategori)}</div>
            </td>
            <td class="py-3 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
              ${item.stok_sistem} <span class="text-xs font-normal text-slate-500">${escapeHtml(item.satuan)}</span>
            </td>
            <td class="py-3 px-4">
              <div class="flex flex-wrap gap-1">${badges}</div>
            </td>
            <td class="py-3 px-4 text-right whitespace-nowrap">
              ${actionLink}
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function renderRecentMovements(rows) {
    const tbody = document.getElementById('dashboard-recent-body');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-slate-500">
            Belum ada catatan pergerakan stok di gudang.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const isIn = row.tipe === 'IN';
        const isOut = row.tipe === 'OUT';

        const badgeClass = isIn
          ? 'bg-emerald-100 text-emerald-800'
          : isOut
          ? 'bg-amber-100 text-amber-800'
          : 'bg-blue-100 text-blue-800';

        const qtyText = isIn
          ? `<span class="font-bold text-emerald-700">+${row.jumlah}</span>`
          : isOut
          ? `<span class="font-bold text-amber-700">-${row.jumlah}</span>`
          : `<span class="font-bold text-blue-700">${row.jumlah}</span>`;

        const namaBarang = row.barang ? row.barang.nama_barang : 'Barang Terarsip';
        const kodeBarang = row.barang ? row.barang.kode_barang : '-';
        const satuan = row.barang ? row.barang.satuan : 'unit';
        const petugas = row.petugas ? row.petugas.nama_pengguna : 'Sistem';

        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">${formatTanggalWIB(row.created_at)}</td>
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}">${escapeHtml(row.tipe)}</span>
            </td>
            <td class="py-3 px-4">
              <div class="font-semibold text-slate-900">${escapeHtml(namaBarang)}</div>
              <div class="text-xs font-mono text-slate-500">${escapeHtml(kodeBarang)}</div>
            </td>
            <td class="py-3 px-4 text-right whitespace-nowrap">
              ${qtyText} <span class="text-xs text-slate-500">${escapeHtml(satuan)}</span>
            </td>
            <td class="py-3 px-4 text-right text-xs text-slate-600 whitespace-nowrap">
              ${row.stok_sebelum} &rarr; <strong class="text-slate-900">${row.stok_sesudah}</strong>
            </td>
            <td class="py-3 px-4 text-xs text-slate-700 max-w-xs truncate">${escapeHtml(row.keterangan || '-')}</td>
            <td class="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">${escapeHtml(petugas)}</td>
          </tr>
        `;
      })
      .join('');
  }

  async function loadDashboard() {
    const errorBox = document.getElementById('dashboard-error');

    try {
      const res = await ApiClient.request('/api/dashboard/summary');
      const { kpi, kategori, kondisi, ketersediaan, watchlist, aktivitas_terbaru } = res.data;

      // 1. KPI Cards
      document.getElementById('kpi-total-jenis').textContent = kpi.total_jenis_barang;
      document.getElementById('kpi-kategori-sub').textContent =
        `${kategori.sport.jenis} Sport \u2022 ${kategori.non_sport.jenis} Non-Sport`;

      document.getElementById('kpi-total-unit').textContent = kpi.total_unit_stok;
      document.getElementById('kpi-total-dipinjam').textContent = kpi.total_dipinjam;
      document.getElementById('kpi-tersedia-sub').textContent =
        `${ketersediaan.tersedia} item berstatus Tersedia`;

      document.getElementById('kpi-total-alert').textContent = kpi.total_perlu_perhatian;
      document.getElementById('kpi-rusak-sub').textContent = `${kpi.total_rusak} item kondisi Rusak`;

      // 2. Komposisi Kategori
      document.getElementById('label-kat-sport').textContent =
        `${kategori.sport.jenis} jenis (${kategori.sport.persen}%)`;
      document.getElementById('bar-kat-sport').style.width = `${kategori.sport.persen}%`;
      document.getElementById('unit-kat-sport').textContent = `Total stok: ${kategori.sport.unit} unit`;

      document.getElementById('label-kat-nonsport').textContent =
        `${kategori.non_sport.jenis} jenis (${kategori.non_sport.persen}%)`;
      document.getElementById('bar-kat-nonsport').style.width = `${kategori.non_sport.persen}%`;
      document.getElementById('unit-kat-nonsport').textContent = `Total stok: ${kategori.non_sport.unit} unit`;

      // 3. Kondisi Fisik
      document.getElementById('label-kondisi-baik').textContent =
        `${kondisi.baik.count} item (${kondisi.baik.persen}%)`;
      document.getElementById('bar-kondisi-baik').style.width = `${kondisi.baik.persen}%`;

      document.getElementById('label-kondisi-cukup').textContent =
        `${kondisi.cukup.count} item (${kondisi.cukup.persen}%)`;
      document.getElementById('bar-kondisi-cukup').style.width = `${kondisi.cukup.persen}%`;

      document.getElementById('label-kondisi-rusak').textContent =
        `${kondisi.rusak.count} item (${kondisi.rusak.persen}%)`;
      document.getElementById('bar-kondisi-rusak').style.width = `${kondisi.rusak.persen}%`;

      // 4. Watchlist & Aktivitas Terbaru
      renderWatchlist(watchlist);
      renderRecentMovements(aktivitas_terbaru);
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      }
    }
  }

  loadDashboard();
});