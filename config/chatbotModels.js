// Konstanta konfigurasi opsi model dan preset penalaran (mudah diubah tanpa menyentuh logika)
const LOCAL_MODEL_ID = 'local';
// Label opsi lokal sementara "Mock", dapat diganti satu kata yang mudah dipahami pengguna
const LOCAL_MODEL_LABEL = 'Mock';
const LOCAL_MODEL_SHORT_LABEL = 'Mock';

// ID model penyedia (sesuaikan string ID Gemini di bawah jika nama preview di AI Studio berbeda)
const GEMINI_FLASH_LITE_MODEL_ID = 'gemini-3.5-flash-lite';
const GEMINI_FLASH_MODEL_ID = 'gemini-3.8-flash';
const GROQ_SMALL_MODEL_ID = 'openai/gpt-oss-20b';
const GROQ_LARGE_MODEL_ID = 'openai/gpt-oss-120b';

const DEFAULT_MODEL_ID = LOCAL_MODEL_ID;
const DEFAULT_PRESET = 'seimbang';

// Daftar preset tingkat penalaran (id internal tetap, label dapat diubah)
const REASONING_PRESETS = [
  { id: 'hemat', label: 'Hemat' },
  { id: 'seimbang', label: 'Seimbang' },
  { id: 'mendalam', label: 'Mendalam' }
];

// Daftar opsi model yang tersedia di sistem
const CHATBOT_MODELS = [
  {
    id: LOCAL_MODEL_ID,
    label: LOCAL_MODEL_LABEL,
    shortLabel: LOCAL_MODEL_SHORT_LABEL,
    provider: 'local',
    providerModelId: null,
    reasoning: {
      type: 'none',
      levels: null
    }
  },
  {
    id: 'gemini-flash-lite',
    label: 'Gemini Flash-Lite',
    shortLabel: 'Gemini Lite',
    provider: 'gemini',
    providerModelId: GEMINI_FLASH_LITE_MODEL_ID,
    reasoning: {
      type: 'geminiThinkingLevel',
      levels: {
        hemat: 'low',
        seimbang: 'medium',
        mendalam: 'high'
      }
    }
  },
  {
    id: 'gemini-flash',
    label: 'Gemini Flash',
    shortLabel: 'Gemini Flash',
    provider: 'gemini',
    providerModelId: GEMINI_FLASH_MODEL_ID,
    reasoning: {
      type: 'geminiThinkingLevel',
      levels: {
        hemat: 'low',
        seimbang: 'medium',
        mendalam: 'high'
      }
    }
  },
  {
    id: 'groq-gpt-oss-20b',
    label: 'Groq GPT-OSS 20B',
    shortLabel: 'Groq 20B',
    provider: 'groq',
    providerModelId: GROQ_SMALL_MODEL_ID,
    reasoning: {
      type: 'groqReasoningEffort',
      levels: {
        hemat: 'low',
        seimbang: 'medium',
        mendalam: 'high'
      }
    }
  },
  {
    id: 'groq-gpt-oss-120b',
    label: 'Groq GPT-OSS 120B',
    shortLabel: 'Groq 120B',
    provider: 'groq',
    providerModelId: GROQ_LARGE_MODEL_ID,
    reasoning: {
      type: 'groqReasoningEffort',
      levels: {
        hemat: 'low',
        seimbang: 'medium',
        mendalam: 'high'
      }
    }
  }
];

module.exports = {
  LOCAL_MODEL_ID,
  LOCAL_MODEL_LABEL,
  DEFAULT_MODEL_ID,
  DEFAULT_PRESET,
  REASONING_PRESETS,
  CHATBOT_MODELS
};