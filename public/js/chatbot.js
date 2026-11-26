document.addEventListener('DOMContentLoaded', async () => {
  // Jangan tampilkan widget di halaman login
  if (window.location.pathname === '/login') return;

  const STORAGE_KEY = 'inv_or_chat_history_v1';
  const MODEL_STORAGE_KEY = 'inv_or_chat_model_v1';
  const REASONING_STORAGE_KEY = 'inv_or_chat_reasoning_v1';
  const MAX_MESSAGE_LENGTH = 500;
  const FRIENDLY_ERROR_MESSAGE =
    'Maaf, asisten sedang tidak dapat memproses permintaan Anda. Silakan coba lagi sebentar lagi.';
  const DEFAULT_CHIPS = [
    'Ringkasan stok gudang',
    'Barang stok menipis',
    'Cek barang rusak',
    'Aktivitas stok terakhir'
  ];

  // Konfigurasi bawaan jika gagal memuat GET /api/chatbot/options
  let availableOptions = [
    {
      id: 'local',
      label: 'Mock',
      shortLabel: 'Mock',
      supportsReasoning: false
    }
  ];
  let availablePresets = [
    { id: 'hemat', label: 'Hemat' },
    { id: 'seimbang', label: 'Seimbang' },
    { id: 'mendalam', label: 'Mendalam' }
  ];
  let defaultModelId = 'local';
  let defaultPresetId = 'seimbang';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBotMarkdownSafe(rawText) {
    let safe = escapeHtml(rawText);
    // Konversi **teks tebal** menjadi <strong>
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>');
    // Konversi _teks miring_ menjadi <em>
    safe = safe.replace(/_(.+?)_/g, '<em class="text-slate-600 dark:text-slate-400">$1</em>');
    // Konversi baris baru menjadi <br>
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  function loadHistory() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {
      // Abaikan jika storage corrupt
    }

    const user = typeof ApiClient !== 'undefined' ? ApiClient.getUser() : null;
    const nama = user?.nama_pengguna || 'Petugas';
    return [
      {
        sender: 'bot',
        text: `Halo **${nama}**! Ada yang bisa saya bantu cek terkait stok perlengkapan olahraga hari ini?`,
        suggestions: DEFAULT_CHIPS
      }
    ];
  }

  function saveHistory(messages) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch (_) {
      // Abaikan quota error
    }
  }

  function loadStoredSelection(key, fallback) {
    try {
      const val = sessionStorage.getItem(key);
      return val || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveStoredSelection(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (_) {
      // Abaikan storage error
    }
  }

  let messages = loadHistory();
  let isOpen = false;
  let isSending = false;
  let selectedModelId = loadStoredSelection(MODEL_STORAGE_KEY, defaultModelId);
  let selectedPresetId = loadStoredSelection(REASONING_STORAGE_KEY, defaultPresetId);

  // Render Root Container Floating Widget
  const root = document.createElement('div');
  root.id = 'floating-chatbot-root';
  root.className = 'fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end';

  root.innerHTML = `
    <!-- Panel Jendela Chat -->
    <div id="chatbot-panel" role="dialog" aria-label="Asisten Sportify" class="hidden sp-chat-panel-open mb-3 w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col" style="max-height: 540px;">
      <!-- Header -->
      <div class="bg-brand-950 dark:bg-slate-800 text-white px-4 py-3.5 border-b border-brand-900 dark:border-slate-700 border-t-2 border-t-accent-500 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-400/30 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-brand-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <path d="M8 9h8M8 13h5"></path>
            </svg>
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold leading-tight truncate">Asisten Sportify</h3>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true"></span>
              <span id="chatbot-header-status" class="text-[11px] text-brand-200 truncate">Mock &bull; Data Live</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" id="chatbot-clear-btn" title="Bersihkan Riwayat Chat" aria-label="Reset riwayat chat" class="px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-medium text-brand-200 hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
            Reset
          </button>
          <button type="button" id="chatbot-close-btn" title="Tutup" aria-label="Tutup panel Asisten Sportify" class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-brand-200 hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Area Pesan -->
      <div id="chatbot-messages" class="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm" style="min-height: 260px; max-height: 330px;">
      </div>

      <!-- Quick Suggestions -->
      <div id="chatbot-suggestions" class="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto">
      </div>

      <!-- Kontrol Pilihan Model & Penalaran -->
      <div id="chatbot-model-controls" class="px-3 py-2 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <select
          id="chatbot-model-select"
          aria-label="Pilihan Model"
          class="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        ></select>
        <select
          id="chatbot-reasoning-select"
          aria-label="Tingkat Penalaran"
          class="w-28 shrink-0 px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        ></select>
      </div>

      <!-- Form Input -->
      <form id="chatbot-form" class="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <input
          type="text"
          id="chatbot-input"
          maxlength="500"
          autocomplete="off"
          aria-label="Pertanyaan untuk Asisten Sportify"
          placeholder="Tanya stok, barang rusak, ringkasan..."
          class="flex-1 min-w-0 px-3 py-2 min-h-[40px] text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
        <button
          type="submit"
          id="chatbot-send-btn"
          class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-semibold transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <span>Kirim</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z"></path>
            <path d="M22 2 11 13"></path>
          </svg>
        </button>
      </form>
    </div>

    <!-- Floating Action Button (FAB) -->
    <button
      type="button"
      id="chatbot-toggle-btn"
      aria-expanded="false"
      aria-controls="chatbot-panel"
      class="flex items-center gap-2.5 min-h-[44px] px-4 py-2.5 rounded-full bg-brand-950 hover:bg-brand-900 dark:bg-brand-600 dark:hover:bg-brand-500 text-white shadow-lg hover:shadow-xl ring-1 ring-white/15 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 dark:focus-visible:ring-offset-slate-950"
    >
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true"></span>
      <svg class="w-4 h-4 text-brand-200 dark:text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="text-xs sm:text-sm font-bold tracking-tight">Asisten Sportify</span>
      <span id="chatbot-fab-badge" class="px-2 py-0.5 rounded-md bg-brand-700 dark:bg-brand-800 text-[10px] font-semibold uppercase tracking-wide">Mock</span>
    </button>
  `;

  document.body.appendChild(root);

  const panel = document.getElementById('chatbot-panel');
  const toggleBtn = document.getElementById('chatbot-toggle-btn');
  const closeBtn = document.getElementById('chatbot-close-btn');
  const clearBtn = document.getElementById('chatbot-clear-btn');
  const headerStatus = document.getElementById('chatbot-header-status');
  const fabBadge = document.getElementById('chatbot-fab-badge');
  const messagesBox = document.getElementById('chatbot-messages');
  const suggestionsBox = document.getElementById('chatbot-suggestions');
  const modelSelect = document.getElementById('chatbot-model-select');
  const reasoningSelect = document.getElementById('chatbot-reasoning-select');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send-btn');

  function getSelectedModelObject() {
    return (
      availableOptions.find((opt) => opt.id === selectedModelId) ||
      availableOptions[0]
    );
  }

  function syncModelAndReasoningControls() {
    // Pastikan pilihan tersimpan masih valid
    if (!availableOptions.some((opt) => opt.id === selectedModelId)) {
      selectedModelId = defaultModelId;
      saveStoredSelection(MODEL_STORAGE_KEY, selectedModelId);
    }

    if (!availablePresets.some((p) => p.id === selectedPresetId)) {
      selectedPresetId = defaultPresetId;
      saveStoredSelection(REASONING_STORAGE_KEY, selectedPresetId);
    }

    modelSelect.innerHTML = availableOptions
      .map(
        (opt) =>
          `<option value="${escapeHtml(opt.id)}" ${opt.id === selectedModelId ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
      )
      .join('');

    reasoningSelect.innerHTML = availablePresets
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id)}" ${p.id === selectedPresetId ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
      )
      .join('');

    const currentModel = getSelectedModelObject();
    headerStatus.innerHTML = `${escapeHtml(currentModel.label)} &bull; Data Live`;
    fabBadge.textContent = currentModel.shortLabel;

    const reasoningDisabled = isSending || !currentModel.supportsReasoning;
    reasoningSelect.disabled = reasoningDisabled;
    reasoningSelect.classList.toggle('opacity-50', reasoningDisabled);
    reasoningSelect.classList.toggle('cursor-not-allowed', reasoningDisabled);
  }

  // Mengunci atau membuka input, tombol kirim, dropdown model/penalaran, chip saran, dan tombol Reset
  function setSendingState(status) {
    isSending = Boolean(status);
    input.disabled = isSending;
    sendBtn.disabled = isSending;
    clearBtn.disabled = isSending;
    modelSelect.disabled = isSending;

    input.classList.toggle('opacity-60', isSending);
    input.classList.toggle('cursor-not-allowed', isSending);
    sendBtn.classList.toggle('opacity-60', isSending);
    sendBtn.classList.toggle('cursor-not-allowed', isSending);
    clearBtn.classList.toggle('opacity-50', isSending);
    clearBtn.classList.toggle('cursor-not-allowed', isSending);
    modelSelect.classList.toggle('opacity-50', isSending);
    modelSelect.classList.toggle('cursor-not-allowed', isSending);

    const currentModel = getSelectedModelObject();
    const reasoningDisabled = isSending || !currentModel.supportsReasoning;
    reasoningSelect.disabled = reasoningDisabled;
    reasoningSelect.classList.toggle('opacity-50', reasoningDisabled);
    reasoningSelect.classList.toggle('cursor-not-allowed', reasoningDisabled);

    suggestionsBox.querySelectorAll('.chatbot-chip').forEach((chip) => {
      chip.disabled = isSending;
      chip.classList.toggle('opacity-50', isSending);
      chip.classList.toggle('cursor-not-allowed', isSending);
    });
  }

  function renderSuggestions(chips) {
    const activeChips = Array.isArray(chips) && chips.length > 0 ? chips : DEFAULT_CHIPS;
    const disabledAttr = isSending ? 'disabled' : '';
    const stateClass = isSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

    suggestionsBox.innerHTML = activeChips
      .map(
        (text) => `
          <button
            type="button"
            data-chip="${escapeHtml(text)}"
            ${disabledAttr}
            class="chatbot-chip shrink-0 px-2.5 py-1 rounded-full bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/70 dark:hover:bg-brand-900/70 text-brand-800 dark:text-brand-200 border border-brand-200 dark:border-brand-800/70 text-[11px] font-medium ${stateClass} transition-colors"
          >
            ${escapeHtml(text)}
          </button>
        `
      )
      .join('');
  }

  function renderMessages() {
    messagesBox.innerHTML = messages
      .map((msg) => {
        if (msg.sender === 'user') {
          return `
            <div class="flex justify-end">
              <div class="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-brand-600 text-white shadow-xs leading-relaxed">
                ${escapeHtml(msg.text)}
              </div>
            </div>
          `;
        }

        return `
          <div class="flex justify-start">
            <div class="max-w-[88%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs leading-relaxed">
              ${formatBotMarkdownSafe(msg.text)}
            </div>
          </div>
        `;
      })
      .join('');

    if (isSending) {
      messagesBox.innerHTML += `
        <div class="flex justify-start">
          <div class="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs italic">
            Memeriksa data inventaris...
          </div>
        </div>
      `;
    }

    const lastBot = [...messages].reverse().find((m) => m.sender === 'bot');
    renderSuggestions(lastBot?.suggestions);

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  async function loadChatOptions() {
    try {
      const res = await ApiClient.request('/api/chatbot/options', {
        method: 'GET'
      });

      if (res && res.data) {
        if (Array.isArray(res.data.options) && res.data.options.length > 0) {
          availableOptions = res.data.options;
        }
        if (Array.isArray(res.data.presets) && res.data.presets.length > 0) {
          availablePresets = res.data.presets;
        }
        if (res.data.defaultModel) {
          defaultModelId = res.data.defaultModel;
        }
        if (res.data.defaultPreset) {
          defaultPresetId = res.data.defaultPreset;
        }
      }
    } catch (_) {
      // Tetap gunakan opsi lokal bawaan tanpa menampilkan error
    } finally {
      syncModelAndReasoningControls();
    }
  }

  async function sendMessage(text) {
    if (isSending) return;

    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText) return;

    if (cleanText.length > MAX_MESSAGE_LENGTH) {
      messages.push({
        sender: 'bot',
        text: 'Pesan terlalu panjang. Maksimal 500 karakter.',
        suggestions: DEFAULT_CHIPS
      });
      saveHistory(messages);
      renderMessages();
      return;
    }

    messages.push({ sender: 'user', text: cleanText });
    saveHistory(messages);
    input.value = '';
    setSendingState(true);
    renderMessages();

    try {
      const res = await ApiClient.request('/api/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({
          message: cleanText,
          model: selectedModelId,
          reasoning: selectedPresetId
        })
      });

      messages.push({
        sender: 'bot',
        text: res.data.reply,
        suggestions: res.data.suggestions || DEFAULT_CHIPS
      });
    } catch (_) {
      messages.push({
        sender: 'bot',
        text: FRIENDLY_ERROR_MESSAGE,
        suggestions: DEFAULT_CHIPS
      });
    } finally {
      setSendingState(false);
      saveHistory(messages);
      renderMessages();
      if (isOpen) {
        input.focus();
      }
    }
  }

  function setPanelOpen(nextOpen) {
    isOpen = Boolean(nextOpen);
    panel.classList.toggle('hidden', !isOpen);
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      renderMessages();
      if (!isSending) {
        input.focus();
      }
    }
  }

  modelSelect.addEventListener('change', () => {
    if (isSending) return;
    selectedModelId = modelSelect.value;
    saveStoredSelection(MODEL_STORAGE_KEY, selectedModelId);
    syncModelAndReasoningControls();
  });

  reasoningSelect.addEventListener('change', () => {
    if (isSending) return;
    selectedPresetId = reasoningSelect.value;
    saveStoredSelection(REASONING_STORAGE_KEY, selectedPresetId);
  });

  toggleBtn.addEventListener('click', () => {
    setPanelOpen(!isOpen);
  });

  closeBtn.addEventListener('click', () => {
    setPanelOpen(false);
    toggleBtn.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      setPanelOpen(false);
      toggleBtn.focus();
    }
  });

  clearBtn.addEventListener('click', () => {
    if (isSending) return;
    sessionStorage.removeItem(STORAGE_KEY);
    messages = loadHistory();
    renderMessages();
  });

  suggestionsBox.addEventListener('click', (e) => {
    if (isSending) return;
    const chipBtn = e.target.closest('.chatbot-chip');
    if (!chipBtn) return;
    const promptText = chipBtn.getAttribute('data-chip');
    if (promptText) sendMessage(promptText);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSending) return;
    sendMessage(input.value);
  });

  // Hapus riwayat chat jika tombol logout ditekan
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(STORAGE_KEY);
    });
  }

  syncModelAndReasoningControls();
  renderMessages();
  await loadChatOptions();
});
