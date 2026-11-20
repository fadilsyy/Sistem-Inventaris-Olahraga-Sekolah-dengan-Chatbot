document.addEventListener('DOMContentLoaded', () => {
  const currentUser = ApiClient.getUser();
  const navUserEl = document.getElementById('nav-user-name');
  if (currentUser && navUserEl) {
    navUserEl.textContent = currentUser.nama_pengguna;
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
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function showToast(message, type = 'success') {
    const toastAlert = document.getElementById('toast-alert');
    if (!toastAlert) return;

    toastAlert.textContent = message;
    toastAlert.classList.remove(
      'hidden',
      'bg-emerald-50',
      'border-emerald-200',
      'text-emerald-800',
      'bg-red-50',
      'border-red-200',
      'text-red-700'
    );

    if (type === 'error') {
      toastAlert.classList.add('bg-red-50', 'border-red-200', 'text-red-700');
    } else {
      toastAlert.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
    }

    setTimeout(() => {
      toastAlert.classList.add('hidden');
    }, 4500);
  }

  // =========================================================================
  // LOGIKA HALAMAN BARANG MASUK (IN) & BARANG KELUAR (OUT)
  // =========================================================================
  const isMasukPage = Boolean(document.getElementById('page-barang-masuk'));
  const isKeluarPage = Boolean(document.getElementById('page-barang-keluar'));

  if (isMasukPage || isKeluarPage) {
    const tipeTransaksi = isMasukPage ? 'IN' : 'OUT';
    const endpointApi = isMasukPage ? '/api/stok/masuk' : '/api/stok/keluar';

    const selectBarang = document.getElementById('select-barang');
    const infoBox = document.getElementById('selected-barang-info');
    const infoKategori = document.getElementById('info-kategori');
    const infoStok = document.getElementById('info-stok');
    const inputJumlah = document.getElementById('jumlah');
    const inputKeterangan = document.getElementById('keterangan');
    const formStok = document.getElementById(isMasukPage ? 'form-stok-masuk' : 'form-stok-keluar');
    const btnSubmit = document.getElementById('btn-submit-stok');
    const recentBody = document.getElementById('recent-movements-body');

    let barangMap = new Map();

    async function loadDropdownBarang() {
      try {
        const res = await ApiClient.request('/api/barang');
        const items = res.data || [];
        barangMap.clear();

        if (!items.length) {
          selectBarang.innerHTML = '<option value="">Belum ada data barang aktif</option>';
          return;
        }

        const optionsHtml = ['<option value="">-- Pilih Barang Inventaris --</option>'];
        items.forEach((b) => {
          barangMap.set(b.id, b);
          const disabledAttr = isKeluarPage && b.stok_sistem <= 0 ? 'disabled' : '';
          const stokLabel =
            isKeluarPage && b.stok_sistem <= 0
              ? `(Stok Habis: 0 ${b.satuan})`
              : `(Stok: ${b.stok_sistem} ${b.satuan})`;

          optionsHtml.push(
            `<option value="${b.id}" ${disabledAttr}>[${escapeHtml(b.kode_barang)}] ${escapeHtml(b.nama_barang)} ${escapeHtml(stokLabel)}</option>`
          );
        });

        selectBarang.innerHTML = optionsHtml.join('');
      } catch (err) {
        selectBarang.innerHTML = `<option value="">Gagal memuat barang: ${escapeHtml(err.message)}</option>`;
      }
    }

    function updateSelectedInfo() {
      const selectedId = selectBarang.value;
      const item = barangMap.get(selectedId);

      if (!item) {
        infoBox.classList.add('hidden');
        inputJumlah.removeAttribute('max');
        return;
      }

      infoKategori.textContent = item.kategori;
      infoStok.textContent = `${item.stok_sistem} ${item.satuan}`;
      infoBox.classList.remove('hidden');

      if (isKeluarPage) {
        inputJumlah.max = item.stok_sistem;
      }
    }

    async function loadRecentMovements() {
      try {
        const res = await ApiClient.request(`/api/stok/riwayat?tipe=${tipeTransaksi}`);
        const rows = (res.data || []).slice(0, 10);

        if (!rows.length) {
          recentBody.innerHTML = `
            <tr>
              <td colspan="5" class="py-8 text-center text-slate-500">
                Belum ada riwayat transaksi ${tipeTransaksi === 'IN' ? 'barang masuk' : 'barang keluar'}.
              </td>
            </tr>
          `;
          return;
        }

        const qtyColor = tipeTransaksi === 'IN' ? 'text-emerald-700' : 'text-amber-700';
        const qtyPrefix = tipeTransaksi === 'IN' ? '+' : '-';

        recentBody.innerHTML = rows
          .map((row) => {
            const namaBarang = row.barang ? row.barang.nama_barang : 'Barang Terarsip';
            const kodeBarang = row.barang ? row.barang.kode_barang : '-';
            const satuan = row.barang ? row.barang.satuan : 'unit';

            return `
              <tr class="hover:bg-slate-50/80">
                <td class="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">${formatTanggalWIB(row.created_at)}</td>
                <td class="py-3 px-4">
                  <div class="font-semibold text-slate-900">${escapeHtml(namaBarang)}</div>
                  <div class="text-xs font-mono text-slate-500">${escapeHtml(kodeBarang)}</div>
                </td>
                <td class="py-3 px-4 text-right font-bold ${qtyColor} whitespace-nowrap">
                  ${qtyPrefix}${row.jumlah} ${escapeHtml(satuan)}
                </td>
                <td class="py-3 px-4 text-right text-xs text-slate-600 whitespace-nowrap">
                  ${row.stok_sebelum} &rarr; <strong class="text-slate-900">${row.stok_sesudah}</strong>
                </td>
                <td class="py-3 px-4 text-xs text-slate-600">${escapeHtml(row.keterangan || '-')}</td>
              </tr>
            `;
          })
          .join('');
      } catch (err) {
        recentBody.innerHTML = `
          <tr>
            <td colspan="5" class="py-6 text-center text-red-600 text-xs">${escapeHtml(err.message)}</td>
          </tr>
        `;
      }
    }

    selectBarang.addEventListener('change', updateSelectedInfo);

    formStok.addEventListener('submit', async (e) => {
      e.preventDefault();

      const barang_id = selectBarang.value;
      const jumlah = parseInt(inputJumlah.value, 10);
      const keterangan = inputKeterangan.value.trim();

      const originalBtnText = btnSubmit.textContent;
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Memproses...';

      try {
        const res = await ApiClient.request(endpointApi, {
          method: 'POST',
          body: JSON.stringify({ barang_id, jumlah, keterangan })
        });

        showToast(res.message, 'success');
        formStok.reset();
        infoBox.classList.add('hidden');
        await Promise.all([loadDropdownBarang(), loadRecentMovements()]);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalBtnText;
      }
    });

    loadDropdownBarang();
    loadRecentMovements();
  }

  // =========================================================================
  // LOGIKA HALAMAN RIWAYAT PERGERAKAN STOK (AUDIT LOG)
  // =========================================================================
  if (document.getElementById('page-riwayat')) {
    const searchInput = document.getElementById('riwayat-search');
    const tipeSelect = document.getElementById('riwayat-tipe');
    const startInput = document.getElementById('riwayat-start');
    const endInput = document.getElementById('riwayat-end');
    const btnReset = document.getElementById('btn-reset-riwayat');
    const tableBody = document.getElementById('riwayat-table-body');

    // Baca parameter URL jika pengguna datang dari tautan "Lihat Semua" (misal ?tipe=IN)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tipe')) {
      tipeSelect.value = urlParams.get('tipe').toUpperCase();
    }

    let debounceTimer = null;

    async function loadRiwayatLengkap() {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
      if (tipeSelect.value) params.append('tipe', tipeSelect.value);
      if (startInput.value) params.append('startDate', startInput.value);
      if (endInput.value) params.append('endDate', endInput.value);

      const query = params.toString() ? `?${params.toString()}` : '';

      try {
        const res = await ApiClient.request(`/api/stok/riwayat${query}`);
        const rows = res.data || [];
        const meta = res.meta || { total_transaksi: 0, total_unit_masuk: 0, total_unit_keluar: 0 };

        document.getElementById('stat-total-trx').textContent = meta.total_transaksi;
        document.getElementById('stat-total-in').textContent = `+${meta.total_unit_masuk}`;
        document.getElementById('stat-total-out').textContent = `-${meta.total_unit_keluar}`;

        if (!rows.length) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="7" class="py-10 text-center text-slate-500">
                Tidak ada log pergerakan stok yang sesuai filter saat ini.
              </td>
            </tr>
          `;
          return;
        }

        tableBody.innerHTML = rows
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

            const kodeBarang = row.barang ? row.barang.kode_barang : '-';
            const namaBarang = row.barang ? row.barang.nama_barang : 'Barang Terarsip';
            const satuan = row.barang ? row.barang.satuan : 'unit';
            const petugas = row.petugas ? row.petugas.nama_pengguna : 'Sistem';

            return `
              <tr class="hover:bg-slate-50/80 transition">
                <td class="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                  ${formatTanggalWIB(row.created_at)}
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass}">
                    ${escapeHtml(row.tipe)}
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <div class="font-semibold text-slate-900">${escapeHtml(namaBarang)}</div>
                  <div class="text-xs font-mono text-slate-500">${escapeHtml(kodeBarang)}</div>
                </td>
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                  ${qtyText} <span class="text-xs text-slate-500">${escapeHtml(satuan)}</span>
                </td>
                <td class="py-3.5 px-4 text-right text-xs text-slate-600 whitespace-nowrap">
                  ${row.stok_sebelum} &rarr; <strong class="text-slate-900">${row.stok_sesudah}</strong> ${escapeHtml(satuan)}
                </td>
                <td class="py-3.5 px-4 text-xs text-slate-700 max-w-xs">
                  ${escapeHtml(row.keterangan || '-')}
                </td>
                <td class="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                  ${escapeHtml(petugas)}
                </td>
              </tr>
            `;
          })
          .join('');
      } catch (err) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center text-red-600 font-medium">${escapeHtml(err.message)}</td>
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
  }
});