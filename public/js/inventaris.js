document.addEventListener('DOMContentLoaded', () => {
  // Tampilkan nama petugas yang sedang login di navbar
  const currentUser = ApiClient.getUser();
  const navUserEl = document.getElementById('nav-user-name');
  if (currentUser && navUserEl) {
    navUserEl.textContent = currentUser.nama_pengguna;
  }

  // Referensi Elemen DOM
  const tableBody = document.getElementById('barang-table-body');
  const toastAlert = document.getElementById('toast-alert');

  const filterSearch = document.getElementById('filter-search');
  const filterKategori = document.getElementById('filter-kategori');
  const filterKondisi = document.getElementById('filter-kondisi');
  const filterKetersediaan = document.getElementById('filter-ketersediaan');
  const btnResetFilter = document.getElementById('btn-reset-filter');

  const modal = document.getElementById('barang-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalAlert = document.getElementById('modal-alert');
  const formBarang = document.getElementById('form-barang');
  const btnOpenAdd = document.getElementById('btn-open-add');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnSaveBarang = document.getElementById('btn-save-barang');

  const inputId = document.getElementById('barang-id');
  const inputKode = document.getElementById('kode_barang');
  const inputNama = document.getElementById('nama_barang');
  const inputKategori = document.getElementById('kategori');
  const kategoriGuide = document.getElementById('kategori-guide');
  const inputStok = document.getElementById('stok_sistem');
  const inputSatuan = document.getElementById('satuan');
  const inputKondisi = document.getElementById('kondisi');
  const inputKetersediaan = document.getElementById('ketersediaan');
  const inputDeskripsi = document.getElementById('deskripsi');

  // Teks panduan contoh kategori dinamis sesuai PRD v1.1 Bagian 3.2
  const KATEGORI_GUIDES = {
    Sport:
      'Contoh kategori Sport: Bola (basket, futsal, voli, sepak bola), raket badminton, bet tenis meja, shuttlecock, net, matras senam, dan perlengkapan latihan olahraga utama.',
    'Non-Sport':
      'Contoh kategori Non-Sport: Pompa bola, peluit, stopwatch, papan skor manual, rompi latihan, kotak P3K, keranjang penyimpanan, dan alat kebersihan/perawatan gudang.'
  };

  let cachedItems = [];
  let searchDebounceTimer = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, type = 'success') {
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
    }, 4000);
  }

  function updateKategoriGuide() {
    const selected = inputKategori.value;
    kategoriGuide.textContent = KATEGORI_GUIDES[selected] || KATEGORI_GUIDES.Sport;
  }

  function updateSummaryCards(items) {
    document.getElementById('stat-total-jenis').textContent = items.length;
    document.getElementById('stat-sport').textContent = items.filter((i) => i.kategori === 'Sport').length;
    document.getElementById('stat-nonsport').textContent = items.filter((i) => i.kategori === 'Non-Sport').length;
    document.getElementById('stat-rusak').textContent = items.filter((i) => i.kondisi === 'Rusak').length;
  }

  function getKondisiSelectStyle(kondisi) {
    if (kondisi === 'Baik') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (kondisi === 'Cukup') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-red-50 text-red-800 border-red-200';
  }

  function getKetersediaanSelectStyle(status) {
    if (status === 'Tersedia') return 'bg-blue-50 text-blue-800 border-blue-200';
    return 'bg-purple-50 text-purple-800 border-purple-200';
  }

  function renderTable(items) {
    if (!items.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-10 text-center text-slate-500">
            Belum ada data barang yang sesuai filter. Klik <strong>+ Tambah Barang Baru</strong> untuk mulai mencatat.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = items
      .map((item) => {
        const kategoriBadge =
          item.kategori === 'Sport'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-indigo-100 text-indigo-800';

        const stokWarning =
          item.stok_sistem <= 2
            ? '<span class="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">Menipis</span>'
            : '';

        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-4 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
              ${escapeHtml(item.kode_barang)}
            </td>
            <td class="py-3.5 px-4">
              <div class="font-semibold text-slate-900">${escapeHtml(item.nama_barang)}</div>
              ${
                item.deskripsi
                  ? `<div class="text-xs text-slate-500 mt-0.5 line-clamp-1">${escapeHtml(item.deskripsi)}</div>`
                  : ''
              }
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${kategoriBadge}">
                ${escapeHtml(item.kategori)}
              </span>
            </td>
            <td class="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-slate-900">
              ${item.stok_sistem} <span class="text-xs font-normal text-slate-500">${escapeHtml(item.satuan)}</span>${stokWarning}
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <select
                data-id="${item.id}"
                data-prev="${escapeHtml(item.kondisi)}"
                class="quick-kondisi text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${getKondisiSelectStyle(item.kondisi)}"
              >
                <option value="Baik" ${item.kondisi === 'Baik' ? 'selected' : ''}>Baik</option>
                <option value="Cukup" ${item.kondisi === 'Cukup' ? 'selected' : ''}>Cukup</option>
                <option value="Rusak" ${item.kondisi === 'Rusak' ? 'selected' : ''}>Rusak</option>
              </select>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <select
                data-id="${item.id}"
                data-prev="${escapeHtml(item.ketersediaan)}"
                class="quick-ketersediaan text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${getKetersediaanSelectStyle(item.ketersediaan)}"
              >
                <option value="Tersedia" ${item.ketersediaan === 'Tersedia' ? 'selected' : ''}>Tersedia</option>
                <option value="Dipinjam" ${item.ketersediaan === 'Dipinjam' ? 'selected' : ''}>Dipinjam</option>
              </select>
            </td>
            <td class="py-3.5 px-4 text-center whitespace-nowrap">
              <div class="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  data-id="${item.id}"
                  class="btn-edit px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  data-id="${item.id}"
                  data-nama="${escapeHtml(item.nama_barang)}"
                  class="btn-delete px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  async function loadBarang() {
    const params = new URLSearchParams();
    if (filterSearch.value.trim()) params.append('search', filterSearch.value.trim());
    if (filterKategori.value) params.append('kategori', filterKategori.value);
    if (filterKondisi.value) params.append('kondisi', filterKondisi.value);
    if (filterKetersediaan.value) params.append('ketersediaan', filterKetersediaan.value);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await ApiClient.request(`/api/barang${queryString}`);
      cachedItems = res.data || [];
      updateSummaryCards(cachedItems);
      renderTable(cachedItems);
    } catch (err) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-red-600 font-medium">${escapeHtml(err.message)}</td>
        </tr>
      `;
    }
  }

  function openModal(mode = 'add', item = null) {
    modalAlert.classList.add('hidden');
    formBarang.reset();

    if (mode === 'edit' && item) {
      modalTitle.textContent = 'Edit Data Barang Inventaris';
      inputId.value = item.id;
      inputKode.value = item.kode_barang;
      inputNama.value = item.nama_barang;
      inputKategori.value = item.kategori;
      inputStok.value = item.stok_sistem;
      inputSatuan.value = item.satuan;
      inputKondisi.value = item.kondisi;
      inputKetersediaan.value = item.ketersediaan;
      inputDeskripsi.value = item.deskripsi || '';
    } else {
      modalTitle.textContent = 'Tambah Barang Inventaris Baru';
      inputId.value = '';
      inputKategori.value = 'Sport';
      inputStok.value = 0;
      inputKondisi.value = 'Baik';
      inputKetersediaan.value = 'Tersedia';
    }

    updateKategoriGuide();
    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  // Event Listeners Filter & Pencarian
  filterSearch.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(loadBarang, 300);
  });

  [filterKategori, filterKondisi, filterKetersediaan].forEach((el) => {
    el.addEventListener('change', loadBarang);
  });

  btnResetFilter.addEventListener('click', () => {
    filterSearch.value = '';
    filterKategori.value = '';
    filterKondisi.value = '';
    filterKetersediaan.value = '';
    loadBarang();
  });

  // Event Listeners Modal & Panduan Kategori Dinamis
  inputKategori.addEventListener('change', updateKategoriGuide);
  btnOpenAdd.addEventListener('click', () => openModal('add'));
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  formBarang.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalAlert.classList.add('hidden');

    const id = inputId.value;
    const payload = {
      kode_barang: inputKode.value.trim().toUpperCase(),
      nama_barang: inputNama.value.trim(),
      kategori: inputKategori.value,
      stok_sistem: parseInt(inputStok.value, 10),
      satuan: inputSatuan.value.trim(),
      kondisi: inputKondisi.value,
      ketersediaan: inputKetersediaan.value,
      deskripsi: inputDeskripsi.value.trim()
    };

    btnSaveBarang.disabled = true;
    btnSaveBarang.textContent = 'Menyimpan...';

    try {
      const url = id ? `/api/barang/${id}` : '/api/barang';
      const method = id ? 'PUT' : 'POST';

      const res = await ApiClient.request(url, {
        method,
        body: JSON.stringify(payload)
      });

      closeModal();
      showToast(res.message, 'success');
      await loadBarang();
    } catch (err) {
      modalAlert.textContent = err.message;
      modalAlert.classList.remove('hidden');
    } finally {
      btnSaveBarang.disabled = false;
      btnSaveBarang.textContent = 'Simpan Barang';
    }
  });

  // Delegasi Event pada Tabel (Quick Update Status, Edit, Hapus/Arsip)
  tableBody.addEventListener('change', async (e) => {
    const target = e.target;

    if (target.classList.contains('quick-kondisi') || target.classList.contains('quick-ketersediaan')) {
      const id = target.dataset.id;
      const prevValue = target.dataset.prev;
      const field = target.classList.contains('quick-kondisi') ? 'kondisi' : 'ketersediaan';
      const newValue = target.value;

      target.disabled = true;

      try {
        const res = await ApiClient.request(`/api/barang/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ [field]: newValue })
        });
        target.dataset.prev = newValue;
        showToast(res.message, 'success');
        await loadBarang();
      } catch (err) {
        target.value = prevValue;
        showToast(err.message, 'error');
      } finally {
        target.disabled = false;
      }
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const id = editBtn.dataset.id;
      const item = cachedItems.find((b) => b.id === id);
      if (item) openModal('edit', item);
      return;
    }

    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const nama = deleteBtn.dataset.nama;
      const confirmed = window.confirm(`Yakin ingin menghapus/mengarsipkan "${nama}" dari daftar inventaris aktif?`);
      if (!confirmed) return;

      try {
        const res = await ApiClient.request(`/api/barang/${id}`, { method: 'DELETE' });
        showToast(res.message, 'success');
        await loadBarang();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });

  // Muat data awal saat halaman dibuka
  loadBarang();
});