document.addEventListener('DOMContentLoaded', () => {
  // Jangan tampilkan widget di halaman login
  if (window.location.pathname === '/login') return;

  const STORAGE_KEY = 'inv_or_chat_history_v1';
  const DEFAULT_CHIPS = [
    'Ringkasan stok gudang',
    'Barang stok menipis',
    'Cek barang rusak',
    'Aktivitas stok terakhir'
  ];

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
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
    // Konversi _teks miring_ menjadi <em>
    safe = safe.replace(/_(.+?)_/g, '<em class="text-slate-500">$1</em>');
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

  let messages = loadHistory();
  let isOpen = false;
  let isSending = false;

  // Render Root Container Floating Widget
  const root = document.createElement('div');
  root.id = 'floating-chatbot-root';
  root.className = 'fixed bottom-5 right-5 z-50 flex flex-col items-end';

  root.innerHTML = `
    <!-- Panel Jendela Chat -->
    <div id="chatbot-panel" class="hidden mb-3 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col" style="max-height: 520px;">
      <!-- Header -->
      <div class="bg-blue-900 text-white px-4 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-700 flex items-center justify-center font-extrabold text-xs">
            AI
          </div>
          <div>
            <h3 class="text-sm font-bold leading-tight">Asisten Gudang Olahraga</h3>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span class="text-[11px] text-blue-200">Mode Mock &bull; Data Live</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" id="chatbot-clear-btn" title="Bersihkan Riwayat Chat" class="px-2 py-1 rounded-lg text-xs text-blue-200 hover:bg-blue-800 hover:text-white cursor-pointer transition">
            Reset
          </button>
          <button type="button" id="chatbot-close-btn" title="Tutup" class="p-1.5 rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white cursor-pointer transition">
            &#10005;
          </button>
        </div>
      </div>

      <!-- Area Pesan -->
      <div id="chatbot-messages" class="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs sm:text-sm" style="min-height: 280px; max-height: 340px;">
      </div>

      <!-- Quick Suggestions -->
      <div id="chatbot-suggestions" class="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
      </div>

      <!-- Form Input -->
      <form id="chatbot-form" class="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          id="chatbot-input"
          maxlength="500"
          autocomplete="off"
          placeholder="Tanya stok, barang rusak, ringkasan..."
          class="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
        <button
          type="submit"
          id="chatbot-send-btn"
          class="px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold cursor-pointer transition shrink-0"
        >
          Kirim
        </button>
      </form>
    </div>

    <!-- Floating Action Button (FAB) -->
    <button
      type="button"
      id="chatbot-toggle-btn"
      class="flex items-center gap-2.5 px-4 py-3 rounded-full bg-blue-900 hover:bg-blue-800 text-white shadow-lg hover:shadow-xl cursor-pointer transition"
    >
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
      <span class="text-xs sm:text-sm font-bold tracking-tight">Asisten AI</span>
      <span class="px-1.5 py-0.5 rounded-md bg-blue-700 text-[10px] font-semibold uppercase">Mock</span>
    </button>
  `;

  document.body.appendChild(root);

  const panel = document.getElementById('chatbot-panel');
  const toggleBtn = document.getElementById('chatbot-toggle-btn');
  const closeBtn = document.getElementById('chatbot-close-btn');
  const clearBtn = document.getElementById('chatbot-clear-btn');
  const messagesBox = document.getElementById('chatbot-messages');
  const suggestionsBox = document.getElementById('chatbot-suggestions');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send-btn');

  function renderSuggestions(chips) {
    const activeChips = Array.isArray(chips) && chips.length > 0 ? chips : DEFAULT_CHIPS;
    suggestionsBox.innerHTML = activeChips
      .map(
        (text) => `
          <button
            type="button"
            data-chip="${escapeHtml(text)}"
            class="chatbot-chip shrink-0 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-medium cursor-pointer transition"
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
              <div class="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-blue-800 text-white shadow-xs leading-relaxed">
                ${escapeHtml(msg.text)}
              </div>
            </div>
          `;
        }

        return `
          <div class="flex justify-start">
            <div class="max-w-[88%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-slate-200 text-slate-700 shadow-xs leading-relaxed">
              ${formatBotMarkdownSafe(msg.text)}
            </div>
          </div>
        `;
      })
      .join('');

    if (isSending) {
      messagesBox.innerHTML += `
        <div class="flex justify-start">
          <div class="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs italic">
            Memeriksa data inventaris...
          </div>
        </div>
      `;
    }

    const lastBot = [...messages].reverse().find((m) => m.sender === 'bot');
    renderSuggestions(lastBot?.suggestions);

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  async function sendMessage(text) {
    const cleanText = text.trim();
    if (!cleanText || isSending) return;

    messages.push({ sender: 'user', text: cleanText });
    saveHistory(messages);
    input.value = '';
    isSending = true;
    sendBtn.disabled = true;
    renderMessages();

    try {
      const res = await ApiClient.request('/api/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({ message: cleanText })
      });

      messages.push({
        sender: 'bot',
        text: res.data.reply,
        suggestions: res.data.suggestions || DEFAULT_CHIPS
      });
    } catch (err) {
      messages.push({
        sender: 'bot',
        text: `Terjadi kendala saat memproses permintaan: ${err.message}`,
        suggestions: DEFAULT_CHIPS
      });
    } finally {
      isSending = false;
      sendBtn.disabled = false;
      saveHistory(messages);
      renderMessages();
      input.focus();
    }
  }

  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('hidden', !isOpen);
    if (isOpen) {
      renderMessages();
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.add('hidden');
  });

  clearBtn.addEventListener('click', () => {
    sessionStorage.removeItem(STORAGE_KEY);
    messages = loadHistory();
    renderMessages();
  });

  suggestionsBox.addEventListener('click', (e) => {
    const chipBtn = e.target.closest('.chatbot-chip');
    if (!chipBtn) return;
    const promptText = chipBtn.getAttribute('data-chip');
    if (promptText) sendMessage(promptText);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });

  // Hapus riwayat chat jika tombol logout ditekan
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(STORAGE_KEY);
    });
  }

  renderMessages();
});