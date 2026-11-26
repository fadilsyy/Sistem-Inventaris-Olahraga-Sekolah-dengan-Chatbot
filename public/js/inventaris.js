document.addEventListener('DOMContentLoaded', () => {
  const currentUser = ApiClient.getUser();
  const navUserEl = document.getElementById('nav-user-name');
  if (currentUser && navUserEl) {
    navUserEl.textContent = currentUser.nama_pengguna;
  }

  const CATEGORY_HINTS = {
    Sport:
      'Contoh: Bola (basket, futsal, voli, sepak bola), raket badminton, bet tenis meja, shuttlecock, net, matras senam, dan perlengkapan latihan olahraga utama.',
    'Non-Sport':
      'Contoh: Peluit, stopwatch, papan skor, pompa bola, rompi latihan, cone, dan sarana pendukung.'
  };

  // Elemen Tabel & Filter
  const tableBody = document.getElementById('barang-table-body');
  const toastAlert = document.getElementById('toast-alert');
  const searchInput = document.getElementById('filter-search');
  const kategoriFilter = document.getElementById('filter-kategori');
  const kondisiCheckboxes = document.querySelectorAll('.chk-filter-kondisi');
  const statusStokFilter = document.getElementById('filter-status-stok');
  const btnResetFilter = document.getElementById('btn-reset-filter');

  // Elemen Modal 1: Tambah / Edit Barang
  const modalBarang = document.getElementById('modal-barang');
  const modalTitle = document.getElementById('modal-title');
  const modalError = document.getElementById('modal-error');
  const formBarang = document.getElementById('form-barang');
  const kategoriSelect = document.getElementById('kategori');
  const kategoriHint = document.getElementById('kategori-hint');
  const createStokWrapper = document.getElementById('create-stok-wrapper');
  const editKondisiWrapper = document.getElementById('edit-kondisi-wrapper');
  const editTotalBadge = document.getElementById('edit-total-badge');
  const editStokNote = document.getElementById('edit-stok-note');

  // Elemen Modal 2: Barang Masuk (IN)
  const modalMasuk = document.getElementById('modal-masuk');
  const formMasuk = document.getElementById('form-masuk');
  const masukError = document.getElementById('masuk-error');

  // Elemen Modal 3: Barang Keluar (OUT) dengan Checkbox Kondisi
  const modalKeluar = document.getElementById('modal-keluar');
  const formKeluar = document.getElementById('form-keluar');
  const keluarError = document.getElementById('keluar-error');
  const keluarTotalPill = document.getElementById('keluar-total-pill');
  const wrapperAlasanLainnya = document.getElementById('wrapper-alasan-lainnya');
  const inputAlasanLainnya = document.getElementById('keluar-alasan-lainnya');

  // Elemen Modal 4: Peminjaman & Pengembalian
  const modalPinjam = document.getElementById('modal-pinjam');
  const formPinjam = document.getElementById('form-pinjam');
  const pinjamError = document.getElementById('pinjam-error');
  const activePinjamList = document.getElementById('active-pinjam-list');

  // Elemen Modal 5: Atur Kondisi Fisik Batch
  const modalKondisi = document.getElementById('modal-kondisi');
  const formKondisi = document.getElementById('form-kondisi');
  const kondisiError = document.getElementById('kondisi-error');
  const selectKondisiDari = document.getElementById('kondisi-dari');
  const selectKondisiKe = document.getElementById('kondisi-ke');
  const inputKondisiJumlah = document.getElementById('kondisi-jumlah');
  const kondisiMaxHint = document.getElementById('kondisi-max-hint');
  const wrapperKondisiKet = document.getElementById('wrapper-kondisi-keterangan');
  const inputKondisiKet = document.getElementById('kondisi-keterangan');

  const ALL_MODALS = [modalBarang, modalMasuk, modalKeluar, modalPinjam, modalKondisi];

  let cachedItems = [];
  let activeKeluarItem = null;
  let activeKondisiItem = null;
  let debounceTimer = null;
  let lastTriggerEl = null;

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

  function showToast(message, type = 'success') {
    toastAlert.textContent = message;
    toastAlert.classList.remove(
      'hidden',
      'bg-emerald-50',
      'border-emerald-200',
      'text-emerald-800',
      'dark:bg-emerald-950/60',
      'dark:border-emerald-800/70',
      'dark:text-emerald-300',
      'bg-red-50',
      'border-red-200',
      'text-red-700',
      'dark:bg-red-950/60',
      'dark:border-red-800/70',
      'dark:text-red-300'
    );

    if (type === 'error') {
      toastAlert.classList.add(
        'bg-red-50',
        'border-red-200',
        'text-red-700',
        'dark:bg-red-950/60',
        'dark:border-red-800/70',
        'dark:text-red-300'
      );
    } else {
      toastAlert.classList.add(
        'bg-emerald-50',
        'border-emerald-200',
        'text-emerald-800',
        'dark:bg-emerald-950/60',
        'dark:border-emerald-800/70',
        'dark:text-emerald-300'
      );
    }

    setTimeout(() => {
      toastAlert.classList.add('hidden');
    }, 4500);
  }

  function showBoxError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideBoxError(el) {
    el.classList.add('hidden');
    el.textContent = '';
  }

  function openModal(modalEl) {
    lastTriggerEl = document.activeElement;
    modalEl.classList.remove('hidden');
    const closeBtn = modalEl.querySelector('[data-close-modal]');
    const firstInput = modalEl.querySelector('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 20);
    } else if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 20);
    }
  }

  function closeModal(modalEl) {
    modalEl.classList.add('hidden');
    if (lastTriggerEl && typeof lastTriggerEl.focus === 'function' && document.body.contains(lastTriggerEl)) {
      lastTriggerEl.focus();
      lastTriggerEl = null;
    }
  }

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close-modal');
      const targetEl = document.getElementById(targetId);
      if (targetEl) closeModal(targetEl);
    });
  });

  // Tutup modal dengan klik backdrop atau tombol Escape
  ALL_MODALS.forEach((modalEl) => {
    if (!modalEl) return;
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        closeModal(modalEl);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModalEl = ALL_MODALS.find((m) => m && !m.classList.contains('hidden'));
    if (openModalEl) {
      closeModal(openModalEl);
    }
  });

  function updateCategoryHint() {
    kategoriHint.textContent = CATEGORY_HINTS[kategoriSelect.value] || CATEGORY_HINTS.Sport;
  }

  function renderTableSkeleton() {
    const row = `
      <tr>
        <td class="py-4 px-4"><div class="h-4 w-16 sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-40 sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-5 w-16 rounded-full sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-4 w-28 sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-5 w-24 rounded-full sp-skeleton"></div></td>
        <td class="py-4 px-4"><div class="h-7 w-48 ml-auto sp-skeleton"></div></td>
      </tr>
    `;
    tableBody.innerHTML = row + row + row;
  }

  // =========================================================================
  // MUAT & RENDER TABEL INVENTARIS
  // =========================================================================
  async function loadInventaris() {
    renderTableSkeleton();
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (kategoriFilter.value) params.append('kategori', kategoriFilter.value);

    const selectedKondisi = Array.from(kondisiCheckboxes)
      .filter((chk) => chk.checked)
      .map((chk) => chk.value);
    if (selectedKondisi.length > 0 && selectedKondisi.length < kondisiCheckboxes.length) {
      params.append('kondisi', selectedKondisi.join(','));
    }

    if (statusStokFilter.value) params.append('statusStok', statusStokFilter.value);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    try {
      const response = await ApiClient.request(`/api/barang${queryString}`);
      cachedItems = response.data || [];
      const meta = response.meta || {
        total_jenis: 0,
        total_unit_aset: 0,
        total_unit_tersedia: 0,
        total_unit_dipinjam: 0,
        total_unit_rusak: 0,
        total_unit_cukup: 0
      };

      document.getElementById('stat-total-jenis').textContent = meta.total_jenis;
      document.getElementById('stat-total-aset').textContent = meta.total_unit_aset;
      document.getElementById('stat-total-tersedia').textContent = meta.total_unit_tersedia;
      document.getElementById('stat-total-dipinjam').textContent = meta.total_unit_dipinjam;
      document.getElementById('stat-total-rusak').textContent = meta.total_unit_rusak;
      document.getElementById('stat-total-cukup').textContent = meta.total_unit_cukup;

      renderTable(cachedItems);
    } catch (err) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 px-4 text-center text-red-700 dark:text-red-300 font-medium">${escapeHtml(err.message)}</td>
        </tr>
      `;
    }
  }

  function renderTable(items) {
    if (!items.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-10 px-4 text-center text-slate-600 dark:text-slate-400">
            Belum ada data barang yang sesuai kriteria pencarian atau filter saat ini. Coba reset filter atau tambahkan barang baru.
          </td>
        </tr>
      `;
      return;
    }

    const activeKondisiFilter = Array.from(kondisiCheckboxes)
      .filter((chk) => chk.checked)
      .map((chk) => chk.value);
    const isKondisiFiltered =
      activeKondisiFilter.length > 0 && activeKondisiFilter.length < kondisiCheckboxes.length;

    tableBody.innerHTML = items
      .map((item) => {
        const kategoriBadge =
          item.kategori === 'Sport'
            ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800/70'
            : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700';

        const tersediaBadgeClass =
          item.stok_tersedia === 0
            ? 'text-red-700 dark:text-red-400'
            : item.stok_tersedia <= 2
            ? 'text-amber-700 dark:text-amber-400'
            : 'text-emerald-700 dark:text-emerald-400';

        const dipinjamTag =
          item.stok_dipinjam > 0
            ? `<span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70">${item.stok_dipinjam} Dipinjam</span>`
            : `<span class="text-[11px] text-slate-600 dark:text-slate-400">0 Dipinjam</span>`;

        const kondisiBadges = [];
        if (item.stok_baik > 0 && (!isKondisiFiltered || activeKondisiFilter.includes('Baik'))) {
          kondisiBadges.push(
            `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70">${item.stok_baik} Baik</span>`
          );
        }
        if (item.stok_cukup > 0 && (!isKondisiFiltered || activeKondisiFilter.includes('Cukup'))) {
          kondisiBadges.push(
            `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70">${item.stok_cukup} Cukup</span>`
          );
        }
        if (item.stok_rusak > 0 && (!isKondisiFiltered || activeKondisiFilter.includes('Rusak'))) {
          kondisiBadges.push(
            `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800/70">${item.stok_rusak} Rusak</span>`
          );
        }
        if (!kondisiBadges.length) {
          kondisiBadges.push(`<span class="text-xs text-slate-500 dark:text-slate-400">0 unit</span>`);
        }

        return `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150">
            <td class="py-3.5 px-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              ${escapeHtml(item.kode_barang)}
            </td>
            <td class="py-3.5 px-4">
              <div class="font-semibold text-slate-900 dark:text-white">${escapeHtml(item.nama_barang)}</div>
              ${
                item.deskripsi
                  ? `<div class="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">${escapeHtml(item.deskripsi)}</div>`
                  : ''
              }
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${kategoriBadge}">
                ${escapeHtml(item.kategori)}
              </span>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap kpi-num">
              <div class="font-bold ${tersediaBadgeClass}">
                ${item.stok_tersedia} <span class="text-xs font-medium">${escapeHtml(item.satuan)} Tersedia</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                ${dipinjamTag}
                <span class="text-[11px] text-slate-600 dark:text-slate-400">&bull; Total: ${item.stok_sistem}</span>
              </div>
            </td>
            <td class="py-3.5 px-4 kpi-num">
              <div class="flex flex-wrap items-center gap-1">
                ${kondisiBadges.join('')}
              </div>
            </td>
            <td class="py-3.5 px-4 text-right whitespace-nowrap">
              <div class="inline-flex flex-wrap justify-end items-center gap-1.5">
                <button
                  type="button"
                  data-action="masuk"
                  data-id="${item.id}"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14"></path>
                  </svg>
                  <span>Masuk</span>
                </button>
                <button
                  type="button"
                  data-action="keluar"
                  data-id="${item.id}"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/70 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/70 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M5 12h14"></path>
                  </svg>
                  <span>Keluar</span>
                </button>
                <button
                  type="button"
                  data-action="pinjam"
                  data-id="${item.id}"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M16 3h5v5M4 20 21 3"></path>
                  </svg>
                  <span>Status</span>
                </button>
                <button
                  type="button"
                  data-action="kondisi"
                  data-id="${item.id}"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/70 dark:hover:bg-brand-900/70 text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-brand-800/70 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path>
                  </svg>
                  <span>Kondisi</span>
                </button>
                <button
                  type="button"
                  data-action="edit"
                  data-id="${item.id}"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"></path>
                  </svg>
                  <span>Edit</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // =========================================================================
  // MODAL 1: TAMBAH & EDIT BARANG
  // =========================================================================
  function recalcEditTotal() {
    const b = parseInt(document.getElementById('edit_stok_baik').value, 10) || 0;
    const c = parseInt(document.getElementById('edit_stok_cukup').value, 10) || 0;
    const r = parseInt(document.getElementById('edit_stok_rusak').value, 10) || 0;
    const satuan = document.getElementById('satuan').value.trim() || 'unit';
    editTotalBadge.textContent = `Total: ${b + c + r} ${satuan}`;
  }

  document.querySelectorAll('.edit-kondisi-input').forEach((inp) => {
    inp.addEventListener('input', recalcEditTotal);
  });

  function openCreateModal() {
    hideBoxError(modalError);
    formBarang.reset();
    document.getElementById('barang-id').value = '';
    document.getElementById('kategori').value = 'Sport';
    document.getElementById('satuan').value = 'unit';
    document.getElementById('stok_sistem').value = 0;

    createStokWrapper.classList.remove('hidden');
    editKondisiWrapper.classList.add('hidden');
    editStokNote.classList.add('hidden');

    modalTitle.textContent = 'Tambah Barang Inventaris Baru';
    updateCategoryHint();
    openModal(modalBarang);
  }

  function openEditModal(item) {
    hideBoxError(modalError);
    document.getElementById('barang-id').value = item.id;
    document.getElementById('kode_barang').value = item.kode_barang;
    document.getElementById('nama_barang').value = item.nama_barang;
    document.getElementById('kategori').value = item.kategori;
    document.getElementById('satuan').value = item.satuan;
    document.getElementById('deskripsi').value = item.deskripsi || '';

    createStokWrapper.classList.add('hidden');
    editKondisiWrapper.classList.remove('hidden');

    document.getElementById('edit_stok_baik').value = item.stok_baik;
    document.getElementById('edit_stok_cukup').value = item.stok_cukup;
    document.getElementById('edit_stok_rusak').value = item.stok_rusak;
    recalcEditTotal();

    if (item.stok_dipinjam > 0) {
      editStokNote.textContent = `Catatan: Total gabungan (Baik + Cukup + Rusak) minimal ${item.stok_dipinjam} ${item.satuan} karena sedang dipinjam.`;
      editStokNote.classList.remove('hidden');
    } else {
      editStokNote.classList.add('hidden');
    }

    modalTitle.textContent = `Edit Barang: ${item.kode_barang}`;
    updateCategoryHint();
    openModal(modalBarang);
  }

  formBarang.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBoxError(modalError);

    const id = document.getElementById('barang-id').value;
    const basePayload = {
      kode_barang: document.getElementById('kode_barang').value.trim(),
      nama_barang: document.getElementById('nama_barang').value.trim(),
      kategori: document.getElementById('kategori').value,
      satuan: document.getElementById('satuan').value.trim(),
      deskripsi: document.getElementById('deskripsi').value.trim()
    };

    const payload = id
      ? {
          ...basePayload,
          stok_baik: parseInt(document.getElementById('edit_stok_baik').value, 10) || 0,
          stok_cukup: parseInt(document.getElementById('edit_stok_cukup').value, 10) || 0,
          stok_rusak: parseInt(document.getElementById('edit_stok_rusak').value, 10) || 0
        }
      : {
          ...basePayload,
          stok_sistem: parseInt(document.getElementById('stok_sistem').value, 10) || 0
        };

    const btnSave = document.getElementById('btn-save-barang');
    btnSave.disabled = true;
    btnSave.textContent = 'Menyimpan...';

    try {
      const url = id ? `/api/barang/${id}` : '/api/barang';
      const method = id ? 'PUT' : 'POST';
      const res = await ApiClient.request(url, {
        method,
        body: JSON.stringify(payload)
      });

      closeModal(modalBarang);
      showToast(res.message, 'success');
      await loadInventaris();
    } catch (err) {
      showBoxError(modalError, err.message);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Simpan Barang';
    }
  });

  // =========================================================================
  // MODAL 2: BARANG MASUK (IN — DEFAULT KONDISI BAIK)
  // =========================================================================
  function openMasukModal(item) {
    hideBoxError(masukError);
    formMasuk.reset();
    document.getElementById('masuk-barang-id').value = item.id;
    document.getElementById('masuk-barang-nama').textContent = `[${item.kode_barang}] ${item.nama_barang}`;
    document.getElementById('masuk-barang-info').textContent =
      `Total: ${item.stok_sistem} ${item.satuan} | Tersedia di Rak: ${item.stok_tersedia} ${item.satuan}`;
    openModal(modalMasuk);
  }

  formMasuk.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBoxError(masukError);

    const barang_id = document.getElementById('masuk-barang-id').value;
    const jumlah = parseInt(document.getElementById('masuk-jumlah').value, 10);
    const keterangan = document.getElementById('masuk-keterangan').value.trim();

    if (!keterangan) {
      showBoxError(masukError, 'Sumber atau keterangan barang masuk wajib diisi.');
      return;
    }

    const btn = document.getElementById('btn-submit-masuk');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const res = await ApiClient.request('/api/stok/masuk', {
        method: 'POST',
        body: JSON.stringify({ barang_id, jumlah, keterangan })
      });

      closeModal(modalMasuk);
      showToast(res.message, 'success');
      await loadInventaris();
    } catch (err) {
      showBoxError(masukError, err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  });

  // =========================================================================
  // MODAL 3: BARANG KELUAR (OUT) DENGAN CHECKBOX PER KONDISI
  // =========================================================================
  function recalcKeluarTotal() {
    if (!activeKeluarItem) return;
    const qRusak = document.getElementById('chk-keluar-rusak').checked
      ? parseInt(document.getElementById('qty-keluar-rusak').value, 10) || 0
      : 0;
    const qCukup = document.getElementById('chk-keluar-cukup').checked
      ? parseInt(document.getElementById('qty-keluar-cukup').value, 10) || 0
      : 0;
    const qBaik = document.getElementById('chk-keluar-baik').checked
      ? parseInt(document.getElementById('qty-keluar-baik').value, 10) || 0
      : 0;

    const total = qRusak + qCukup + qBaik;
    keluarTotalPill.textContent = `Total Keluar: ${total} / Maks ${activeKeluarItem.stok_tersedia} ${activeKeluarItem.satuan}`;
    keluarTotalPill.className =
      total > activeKeluarItem.stok_tersedia
        ? 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800/70 kpi-num'
        : 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 kpi-num';
  }

  document.querySelectorAll('.chk-keluar-kondisi').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const targetInput = document.getElementById(e.target.getAttribute('data-target'));
      if (!targetInput) return;

      if (e.target.checked) {
        targetInput.disabled = false;
        targetInput.classList.remove('bg-slate-100', 'dark:bg-slate-800');
        targetInput.classList.add('bg-white', 'dark:bg-slate-950');
        targetInput.value = 1;
        targetInput.focus();
      } else {
        targetInput.disabled = true;
        targetInput.classList.add('bg-slate-100', 'dark:bg-slate-800');
        targetInput.classList.remove('bg-white', 'dark:bg-slate-950');
        targetInput.value = 0;
      }
      recalcKeluarTotal();
    });
  });

  document.querySelectorAll('.qty-keluar-input').forEach((inp) => {
    inp.addEventListener('input', recalcKeluarTotal);
  });

  function openKeluarModal(item) {
    activeKeluarItem = item;
    hideBoxError(keluarError);
    formKeluar.reset();
    wrapperAlasanLainnya.classList.add('hidden');
    inputAlasanLainnya.required = false;
    inputAlasanLainnya.value = '';

    document.getElementById('keluar-barang-id').value = item.id;
    document.getElementById('keluar-barang-nama').textContent = `[${item.kode_barang}] ${item.nama_barang}`;
    document.getElementById('keluar-barang-info').textContent =
      `Tersedia di Rak: ${item.stok_tersedia} ${item.satuan} (Dipinjam: ${item.stok_dipinjam}, Total: ${item.stok_sistem})`;

    const configs = [
      { chkId: 'chk-keluar-rusak', qtyId: 'qty-keluar-rusak', availId: 'avail-keluar-rusak', count: item.stok_rusak },
      { chkId: 'chk-keluar-cukup', qtyId: 'qty-keluar-cukup', availId: 'avail-keluar-cukup', count: item.stok_cukup },
      { chkId: 'chk-keluar-baik', qtyId: 'qty-keluar-baik', availId: 'avail-keluar-baik', count: item.stok_baik }
    ];

    configs.forEach(({ chkId, qtyId, availId, count }) => {
      const chk = document.getElementById(chkId);
      const qty = document.getElementById(qtyId);
      const avail = document.getElementById(availId);

      avail.textContent = `(${count} ${item.satuan})`;
      chk.checked = false;
      chk.disabled = count <= 0;
      qty.disabled = true;
      qty.value = 0;
      qty.max = count;
      qty.classList.add('bg-slate-100', 'dark:bg-slate-800');
      qty.classList.remove('bg-white', 'dark:bg-slate-950');
    });

    recalcKeluarTotal();
    openModal(modalKeluar);
  }

  document.querySelectorAll('input[name="alasan_template"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'Lainnya') {
        wrapperAlasanLainnya.classList.remove('hidden');
        inputAlasanLainnya.required = true;
        inputAlasanLainnya.focus();
      } else {
        wrapperAlasanLainnya.classList.add('hidden');
        inputAlasanLainnya.required = false;
        inputAlasanLainnya.value = '';
      }
    });
  });

  formKeluar.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBoxError(keluarError);

    const barang_id = document.getElementById('keluar-barang-id').value;
    const jumlah_rusak = document.getElementById('chk-keluar-rusak').checked
      ? parseInt(document.getElementById('qty-keluar-rusak').value, 10) || 0
      : 0;
    const jumlah_cukup = document.getElementById('chk-keluar-cukup').checked
      ? parseInt(document.getElementById('qty-keluar-cukup').value, 10) || 0
      : 0;
    const jumlah_baik = document.getElementById('chk-keluar-baik').checked
      ? parseInt(document.getElementById('qty-keluar-baik').value, 10) || 0
      : 0;

    const selectedRadio = document.querySelector('input[name="alasan_template"]:checked');
    const alasan_template = selectedRadio ? selectedRadio.value : '';
    const keterangan_lainnya = inputAlasanLainnya.value.trim();

    const btn = document.getElementById('btn-submit-keluar');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
      const res = await ApiClient.request('/api/stok/keluar', {
        method: 'POST',
        body: JSON.stringify({
          barang_id,
          jumlah_baik,
          jumlah_cukup,
          jumlah_rusak,
          alasan_template,
          keterangan_lainnya
        })
      });

      closeModal(modalKeluar);
      showToast(res.message, 'success');
      await loadInventaris();
    } catch (err) {
      showBoxError(keluarError, err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  });

  // =========================================================================
  // MODAL 4: PEMINJAMAN & PENGEMBALIAN INDEPENDEN PER TIKET
  // =========================================================================
  async function loadActiveTicketsForBarang(barangId, satuan) {
    activePinjamList.innerHTML =
      '<p class="text-xs text-slate-600 dark:text-slate-400 py-4 text-center">Memuat daftar peminjaman aktif...</p>';

    try {
      const res = await ApiClient.request(`/api/peminjaman?barang_id=${encodeURIComponent(barangId)}`);
      const tickets = res.data || [];

      if (!tickets.length) {
        activePinjamList.innerHTML =
          '<p class="text-xs text-slate-600 dark:text-slate-400 py-4 text-center">Tidak ada unit yang sedang dipinjam saat ini.</p>';
        return;
      }

      activePinjamList.innerHTML = tickets
        .map(
          (t) => `
            <div class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">${escapeHtml(t.peminjam)}</span>
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 kpi-num">
                    ${t.jumlah} ${escapeHtml(satuan)}
                  </span>
                </div>
                <p class="text-[11px] text-slate-600 dark:text-slate-400">
                  Dipinjam: ${formatWaktuWIB(t.borrowed_at)} ${t.keterangan ? `&bull; ${escapeHtml(t.keterangan)}` : ''}
                </p>
              </div>
              <button
                type="button"
                data-return-ticket-id="${t.id}"
                data-barang-id="${barangId}"
                data-satuan="${escapeHtml(satuan)}"
                class="btn-kembalikan-ticket self-start sm:self-center px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Kembalikan
              </button>
            </div>
          `
        )
        .join('');
    } catch (err) {
      activePinjamList.innerHTML = `<p class="text-xs text-red-700 dark:text-red-300 py-3 text-center">${escapeHtml(err.message)}</p>`;
    }
  }

  function syncPinjamModalHeader(item) {
    document.getElementById('pinjam-barang-id').value = item.id;
    document.getElementById('pinjam-barang-nama').textContent = `[${item.kode_barang}] ${item.nama_barang}`;
    document.getElementById('pinjam-barang-info').textContent =
      `Total: ${item.stok_sistem} ${item.satuan} | Sedang Dipinjam: ${item.stok_dipinjam} ${item.satuan}`;

    const badge = document.getElementById('pinjam-stok-badge');
    badge.textContent = `${item.stok_tersedia} ${item.satuan} Tersedia`;
    badge.className =
      item.stok_tersedia > 0
        ? 'self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 kpi-num'
        : 'self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800/70 kpi-num';

    const qtyInput = document.getElementById('pinjam-jumlah');
    qtyInput.max = item.stok_tersedia;
  }

  async function openPinjamModal(item) {
    hideBoxError(pinjamError);
    formPinjam.reset();
    syncPinjamModalHeader(item);
    openModal(modalPinjam);
    await loadActiveTicketsForBarang(item.id, item.satuan);
  }

  formPinjam.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBoxError(pinjamError);

    const barang_id = document.getElementById('pinjam-barang-id').value;
    const peminjam = document.getElementById('pinjam-peminjam').value.trim();
    const jumlah = parseInt(document.getElementById('pinjam-jumlah').value, 10);
    const keterangan = document.getElementById('pinjam-keterangan').value.trim();

    const btn = document.getElementById('btn-submit-pinjam');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
      const res = await ApiClient.request('/api/peminjaman', {
        method: 'POST',
        body: JSON.stringify({ barang_id, peminjam, jumlah, keterangan })
      });

      formPinjam.reset();
      showToast(res.message, 'success');
      await loadInventaris();

      const updatedItem = cachedItems.find((b) => b.id === barang_id);
      if (updatedItem) {
        syncPinjamModalHeader(updatedItem);
        await loadActiveTicketsForBarang(updatedItem.id, updatedItem.satuan);
      }
    } catch (err) {
      showBoxError(pinjamError, err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Catat';
    }
  });

  activePinjamList.addEventListener('click', async (e) => {
    const returnBtn = e.target.closest('.btn-kembalikan-ticket');
    if (!returnBtn) return;

    const ticketId = returnBtn.getAttribute('data-return-ticket-id');
    const barangId = returnBtn.getAttribute('data-barang-id');
    const satuan = returnBtn.getAttribute('data-satuan');

    returnBtn.disabled = true;
    returnBtn.textContent = 'Memproses...';

    try {
      const res = await ApiClient.request(`/api/peminjaman/${ticketId}/kembali`, {
        method: 'PATCH',
        body: JSON.stringify({})
      });

      showToast(res.message, 'success');
      await loadInventaris();

      const updatedItem = cachedItems.find((b) => b.id === barangId);
      if (updatedItem) {
        syncPinjamModalHeader(updatedItem);
      }
      await loadActiveTicketsForBarang(barangId, satuan);
    } catch (err) {
      showBoxError(pinjamError, err.message);
      returnBtn.disabled = false;
      returnBtn.textContent = 'Kembalikan';
    }
  });

  // =========================================================================
  // MODAL 5: ATUR KONDISI FISIK PER UNIT (BATCH)
  // =========================================================================
  function syncKondisiModalConstraints() {
    if (!activeKondisiItem) return;

    const dari = selectKondisiDari.value;

    // Nonaktifkan opsi pada Kondisi Baru yang sama dengan Kondisi Awal
    Array.from(selectKondisiKe.options).forEach((opt) => {
      opt.disabled = opt.value === dari;
    });

    // Jika Kondisi Baru sedang bernilai sama dengan Kondisi Awal, pindahkan otomatis
    if (selectKondisiKe.value === dari) {
      const alternatif = ['Baik', 'Cukup', 'Rusak'].find((k) => k !== dari);
      if (alternatif) selectKondisiKe.value = alternatif;
    }

    const ke = selectKondisiKe.value;
    const stokMap = {
      Baik: activeKondisiItem.stok_baik,
      Cukup: activeKondisiItem.stok_cukup,
      Rusak: activeKondisiItem.stok_rusak
    };

    const maxAvail = stokMap[dari] || 0;
    inputKondisiJumlah.max = maxAvail;
    kondisiMaxHint.textContent = `Tersedia pada kondisi ${dari}: ${maxAvail} ${activeKondisiItem.satuan}.`;

    // Sembunyikan kolom keterangan jika tujuan = Baik; tampilkan & wajib jika Cukup atau Rusak
    if (ke === 'Baik') {
      wrapperKondisiKet.classList.add('hidden');
      inputKondisiKet.required = false;
      inputKondisiKet.value = '';
    } else {
      wrapperKondisiKet.classList.remove('hidden');
      inputKondisiKet.required = true;
    }
  }

  selectKondisiDari.addEventListener('change', syncKondisiModalConstraints);
  selectKondisiKe.addEventListener('change', syncKondisiModalConstraints);

  function openKondisiModal(item) {
    activeKondisiItem = item;
    hideBoxError(kondisiError);
    formKondisi.reset();

    document.getElementById('kondisi-barang-id').value = item.id;
    document.getElementById('kondisi-barang-nama').textContent = `[${item.kode_barang}] ${item.nama_barang}`;
    document.getElementById('kondisi-barang-badges').innerHTML = `
      <span class="px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 kpi-num">${item.stok_baik} Baik</span>
      <span class="px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 kpi-num">${item.stok_cukup} Cukup</span>
      <span class="px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800/70 kpi-num">${item.stok_rusak} Rusak</span>
    `;

    // Pilih default kondisi asal yang stoknya > 0
    if (item.stok_baik > 0) {
      selectKondisiDari.value = 'Baik';
      selectKondisiKe.value = 'Cukup';
    } else if (item.stok_cukup > 0) {
      selectKondisiDari.value = 'Cukup';
      selectKondisiKe.value = 'Rusak';
    } else {
      selectKondisiDari.value = 'Rusak';
      selectKondisiKe.value = 'Baik';
    }

    inputKondisiJumlah.value = 1;
    syncKondisiModalConstraints();
    openModal(modalKondisi);
  }

  formKondisi.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBoxError(kondisiError);

    const id = document.getElementById('kondisi-barang-id').value;
    const dari_kondisi = selectKondisiDari.value;
    const ke_kondisi = selectKondisiKe.value;
    const jumlah = parseInt(inputKondisiJumlah.value, 10);
    const keterangan = ke_kondisi === 'Baik' ? '' : inputKondisiKet.value.trim();

    if (dari_kondisi === ke_kondisi) {
      showBoxError(kondisiError, 'Kondisi awal tidak boleh sama dengan kondisi baru.');
      return;
    }

    if ((ke_kondisi === 'Cukup' || ke_kondisi === 'Rusak') && !keterangan) {
      showBoxError(kondisiError, `Keterangan wajib diisi untuk perubahan ke kondisi ${ke_kondisi}.`);
      return;
    }

    const btn = document.getElementById('btn-submit-kondisi');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const res = await ApiClient.request(`/api/barang/${id}/kondisi`, {
        method: 'PATCH',
        body: JSON.stringify({ dari_kondisi, ke_kondisi, jumlah, keterangan })
      });

      closeModal(modalKondisi);
      showToast(res.message, 'success');
      await loadInventaris();
    } catch (err) {
      showBoxError(kondisiError, err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  });

  // =========================================================================
  // EVENT LISTENERS UTAMA
  // =========================================================================
  document.getElementById('btn-open-create').addEventListener('click', openCreateModal);
  kategoriSelect.addEventListener('change', updateCategoryHint);

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadInventaris, 300);
  });

  [kategoriFilter, statusStokFilter].forEach((el) => {
    el.addEventListener('change', loadInventaris);
  });

  kondisiCheckboxes.forEach((chk) => {
    chk.addEventListener('change', loadInventaris);
  });

  btnResetFilter.addEventListener('click', () => {
    searchInput.value = '';
    kategoriFilter.value = '';
    kondisiCheckboxes.forEach((chk) => {
      chk.checked = false;
    });
    statusStokFilter.value = '';
    loadInventaris();
  });

  tableBody.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('button[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const id = actionBtn.getAttribute('data-id');
    const item = cachedItems.find((b) => b.id === id);
    if (!item) return;

    if (action === 'masuk') openMasukModal(item);
    if (action === 'keluar') openKeluarModal(item);
    if (action === 'pinjam') openPinjamModal(item);
    if (action === 'kondisi') openKondisiModal(item);
    if (action === 'edit') openEditModal(item);
  });

  loadInventaris();
});
