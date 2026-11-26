document.addEventListener('DOMContentLoaded', () => {
  const currentUser = ApiClient.getUser();
  const navUserEl = document.getElementById('nav-user-name');
  if (currentUser && navUserEl) {
    navUserEl.textContent = currentUser.nama_pengguna;
  }

  const TIPE_STYLES = {
    IN: {
      label: 'IN',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70',
      qtyClass: 'text-emerald-700 dark:text-emerald-400',
      prefix: '+'
    },
    OUT: {
      label: 'OUT',
      badge: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800/70',
      qtyClass: 'text-red-700 dark:text-red-400',
      prefix: '-'
    },
    PINJAM: {
      label: 'PINJAM',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70',
      qtyClass: 'text-amber-700 dark:text-amber-400',
      prefix: ''
    },
    KEMBALI: {
      label: 'KEMBALI',
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800/70',
      qtyClass: 'text-teal-700 dark:text-teal-400',
      prefix: '+'
    },
    CREATE: {
      label: 'CREATE',
      badge: 'bg-brand-100 text-brand-800 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800/70',
      qtyClass: 'text-brand-700 dark:text-brand-400',
      prefix: ''
    },
    UPDATE: {
      label: 'UPDATE',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70',
      qtyClass: 'text-indigo-700 dark:text-indigo-400',
      prefix: 'Δ '
    },
    STATUS: {
      label: 'STATUS',
      badge: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700',
      qtyClass: 'text-slate-600 dark:text-slate-400',
      prefix: ''
    }
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

  const searchInput = document.getElementById('riwayat-search');
  const tipeSelect = document.getElementById('riwayat-tipe');
  const startInput = document.getElementById('riwayat-start');
  const endInput = document.getElementById('riwayat-end');
  const btnReset = document.getElementById('btn-reset-riwayat');
  const tableBody = document.getElementById('riwayat-table-body');

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tipe')) {
    tipeSelect.value = urlParams.get('tipe').toUpperCase();
  }

  let debounceTimer = null;

  function renderTableSkeleton() {
    const row = `
      <tr>
        <td class="py-4 px-4"><div class="h-4 w-28 sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-5 w-16 rounded-full sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-36 sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-14 ml-auto sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-20 ml-auto sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-44 sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-20 sp-skeleton"></div></td>
      </tr>
    `;
    tableBody.innerHTML = row + row + row;
  }

  async function loadRiwayatLengkap() {
    renderTableSkeleton();
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (tipeSelect.value) params.append('tipe', tipeSelect.value);
    if (startInput.value) params.append('startDate', startInput.value);
    if (endInput.value) params.append('endDate', endInput.value);

    const query = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await ApiClient.request(`/api/stok/riwayat${query}`);
      const rows = res.data || [];
      const meta = res.meta || {
        total_transaksi: 0,
        total_unit_masuk: 0,
        total_unit_keluar: 0,
        total_unit_pinjam: 0
      };

      document.getElementById('stat-total-trx').textContent = meta.total_transaksi;
      document.getElementById('stat-total-in').textContent = `+${meta.total_unit_masuk}`;
      document.getElementById('stat-total-out').textContent = `-${meta.total_unit_keluar}`;
      document.getElementById('stat-total-pinjam').textContent = meta.total_unit_pinjam || 0;

      if (!rows.length) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="py-10 px-4 text-center text-slate-600 dark:text-slate-400">
              Tidak ada log aktivitas inventaris yang sesuai filter saat ini. Coba reset filter atau lakukan mutasi di Data Inventaris.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = rows
        .map((row) => {
          const style = TIPE_STYLES[row.tipe] || {
            label: row.tipe,
            badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
            qtyClass: 'text-slate-700 dark:text-slate-300',
            prefix: ''
          };

          const kodeBarang = row.barang ? row.barang.kode_barang : '-';
          const namaBarang = row.barang ? row.barang.nama_barang : 'Barang';
          const satuan = row.barang ? row.barang.satuan : 'unit';
          const petugas = row.petugas ? row.petugas.nama_pengguna : 'Sistem';

          const qtyCell =
            row.tipe === 'STATUS' || (row.tipe === 'UPDATE' && row.jumlah === 0)
              ? `<span class="text-xs text-slate-500 dark:text-slate-400">-</span>`
              : `<span class="font-bold ${style.qtyClass}">${style.prefix}${row.jumlah}</span> <span class="text-xs text-slate-600 dark:text-slate-400">${escapeHtml(satuan)}</span>`;

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150">
              <td class="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                ${formatTanggalWIB(row.created_at)}
              </td>
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${style.badge}">
                  ${escapeHtml(style.label)}
                </span>
              </td>
              <td class="py-3.5 px-4">
                <div class="font-semibold text-slate-900 dark:text-white">${escapeHtml(namaBarang)}</div>
                <div class="text-xs font-mono text-slate-600 dark:text-slate-400">${escapeHtml(kodeBarang)}</div>
              </td>
              <td class="py-3.5 px-4 text-right whitespace-nowrap kpi-num">
                ${qtyCell}
              </td>
              <td class="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap kpi-num">
                ${row.stok_sebelum} &rarr; <strong class="text-slate-900 dark:text-white">${row.stok_sesudah}</strong>
              </td>
              <td class="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300 max-w-sm">
                ${escapeHtml(row.keterangan || '-')}
              </td>
              <td class="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                ${escapeHtml(petugas)}
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 px-4 text-center text-red-700 dark:text-red-300 font-medium">${escapeHtml(err.message)}</td>
        </tr>
      `;
    }
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadRiwayatLengkap, 300);
  });

  [tipeSelect, startInput, endInput].forEach((el) => {
    el.addEventListener('change', loadRiwayatLengkap);
  });

  btnReset.addEventListener('click', () => {
    searchInput.value = '';
    tipeSelect.value = '';
    startInput.value = '';
    endInput.value = '';
    loadRiwayatLengkap();
  });

  loadRiwayatLengkap();
});
