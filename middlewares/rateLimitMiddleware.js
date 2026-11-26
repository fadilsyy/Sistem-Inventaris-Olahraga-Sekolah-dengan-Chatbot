// Konstanta pembatas laju permintaan LLM (jendela 60 detik)
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_IP = 10;
const MAX_REQUESTS_GLOBAL = 60;
const CLEANUP_INTERVAL_MS = 60 * 1000;

const ipBuckets = new Map();
let globalTimestamps = [];

// Pembersihan berkala entri yang sudah kedaluwarsa agar memori tidak membengkak
const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  globalTimestamps = globalTimestamps.filter((ts) => ts > cutoff);

  for (const [ip, timestamps] of ipBuckets.entries()) {
    const fresh = timestamps.filter((ts) => ts > cutoff);
    if (fresh.length === 0) {
      ipBuckets.delete(ip);
    } else {
      ipBuckets.set(ip, fresh);
    }
  }
}, CLEANUP_INTERVAL_MS);

if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

function checkLlmRateLimit(ipAddress) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const clientIp = ipAddress || 'unknown';

  globalTimestamps = globalTimestamps.filter((ts) => ts > cutoff);
  if (globalTimestamps.length >= MAX_REQUESTS_GLOBAL) {
    return false;
  }

  const currentIpTimestamps = (ipBuckets.get(clientIp) || []).filter((ts) => ts > cutoff);
  if (currentIpTimestamps.length >= MAX_REQUESTS_PER_IP) {
    ipBuckets.set(clientIp, currentIpTimestamps);
    return false;
  }

  currentIpTimestamps.push(now);
  ipBuckets.set(clientIp, currentIpTimestamps);
  globalTimestamps.push(now);
  return true;
}

module.exports = {
  WINDOW_MS,
  MAX_REQUESTS_PER_IP,
  MAX_REQUESTS_GLOBAL,
  checkLlmRateLimit
};