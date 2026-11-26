const env = require('../config/env');

// Konstanta parameter pemanggilan LLM (mudah disesuaikan)
const LLM_TIMEOUT_MS = 20000;
const LLM_TEMPERATURE = 0.2;
const LLM_MAX_OUTPUT_TOKENS = 600;

// Host tetap untuk mencegah SSRF
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

function createProviderError(category, statusCode = 0) {
  const err = new Error(`LLM_PROVIDER_${category.toUpperCase()}`);
  err.category = category; // 'limit' | 'unavailable' | 'invalid_key' | 'other'
  err.statusCode = statusCode;
  return err;
}

function classifyHttpError(status, rawBodyText) {
  const lowerBody = (rawBodyText || '').toLowerCase();

  if (
    status === 429 ||
    lowerBody.includes('quota') ||
    lowerBody.includes('rate limit') ||
    lowerBody.includes('resource_exhausted')
  ) {
    return createProviderError('limit', status);
  }

  if (status === 401 || status === 403 || lowerBody.includes('api key not valid')) {
    return createProviderError('invalid_key', status);
  }

  if (status >= 500) {
    return createProviderError('unavailable', status);
  }

  return createProviderError('other', status);
}

function buildGeminiPayload({ option, preset, systemPrompt, userContent }) {
  const generationConfig = {
    temperature: LLM_TEMPERATURE,
    maxOutputTokens: LLM_MAX_OUTPUT_TOKENS
  };

  if (option.reasoning && option.reasoning.levels) {
    const mappedLevel = option.reasoning.levels[preset];
    if (option.reasoning.type === 'geminiThinkingLevel' && mappedLevel) {
      generationConfig.thinkingConfig = {
        thinkingLevel: mappedLevel
      };
    } else if (option.reasoning.type === 'geminiThinkingBudget' && mappedLevel !== undefined) {
      generationConfig.thinkingConfig = {
        thinkingBudget: mappedLevel
      };
    }
  }

  return {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userContent }]
      }
    ],
    generationConfig
  };
}

function buildGroqPayload({ option, preset, systemPrompt, userContent }) {
  const payload = {
    model: option.providerModelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: LLM_TEMPERATURE,
    max_completion_tokens: LLM_MAX_OUTPUT_TOKENS
  };

  if (
    option.reasoning &&
    option.reasoning.type === 'groqReasoningEffort' &&
    option.reasoning.levels &&
    option.reasoning.levels[preset]
  ) {
    payload.reasoning_effort = option.reasoning.levels[preset];
  }

  return payload;
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();
}

function extractGroqText(data) {
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

async function generateText({ option, preset, systemPrompt, userContent }) {
  const startTime = Date.now();
  const provider = option.provider;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let url = '';
  let headers = { 'Content-Type': 'application/json' };
  let body = null;

  if (provider === 'gemini') {
    if (!env.geminiApiKey) {
      clearTimeout(timer);
      throw createProviderError('invalid_key', 0);
    }
    url = `${GEMINI_API_BASE_URL}/${encodeURIComponent(option.providerModelId)}:generateContent`;
    headers['x-goog-api-key'] = env.geminiApiKey;
    body = JSON.stringify(buildGeminiPayload({ option, preset, systemPrompt, userContent }));
  } else if (provider === 'groq') {
    if (!env.groqApiKey) {
      clearTimeout(timer);
      throw createProviderError('invalid_key', 0);
    }
    url = GROQ_CHAT_COMPLETIONS_URL;
    headers['Authorization'] = `Bearer ${env.groqApiKey}`;
    body = JSON.stringify(buildGroqPayload({ option, preset, systemPrompt, userContent }));
  } else {
    clearTimeout(timer);
    throw createProviderError('other', 0);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal
    });

    const durationMs = Date.now() - startTime;
    const rawText = await response.text();

    if (!response.ok) {
      console.warn('[LLM PROVIDER]', {
        provider,
        modelId: option.id,
        status: response.status,
        durationMs
      });
      throw classifyHttpError(response.status, rawText);
    }

    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (_) {
      console.warn('[LLM PROVIDER]', {
        provider,
        modelId: option.id,
        status: 'INVALID_JSON',
        durationMs
      });
      throw createProviderError('other', response.status);
    }

    const generated =
      provider === 'gemini' ? extractGeminiText(parsed) : extractGroqText(parsed);

    console.info('[LLM PROVIDER]', {
      provider,
      modelId: option.id,
      status: response.status,
      durationMs
    });

    if (!generated) {
      throw createProviderError('other', response.status);
    }

    return generated;
  } catch (err) {
    const durationMs = Date.now() - startTime;

    if (err.category) {
      throw err;
    }

    if (err.name === 'AbortError') {
      console.warn('[LLM PROVIDER]', {
        provider,
        modelId: option.id,
        status: 'TIMEOUT',
        durationMs
      });
      throw createProviderError('unavailable', 0);
    }

    console.warn('[LLM PROVIDER]', {
      provider,
      modelId: option.id,
      status: 'NETWORK_ERROR',
      durationMs
    });
    throw createProviderError('unavailable', 0);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  LLM_TIMEOUT_MS,
  generateText
};