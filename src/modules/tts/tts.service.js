import { EdgeTTS } from '@andresaya/edge-tts';

const ttsCache = new Map();
const MAX_CACHE_ITEMS = 80;

function setCache(key, buffer) {
  if (ttsCache.size >= MAX_CACHE_ITEMS) {
    const oldestKey = ttsCache.keys().next().value;
    ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, buffer);
}

/**
 * Chuyển văn bản tiếng Anh thành giọng đọc MP3 của Ava (có cache + retry)
 */
export async function synthesizeWithAva({
  text,
  voice = 'en-US-AvaMultilingualNeural',
  rate = '0%'
}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Văn bản cần đọc không được để trống.');
  }
  if (cleanText.length > 3000) {
    throw new Error('Văn bản tối đa 3000 ký tự mỗi lần đọc.');
  }

  const cacheKey = `${voice}|${rate}|${cleanText}`;
  if (ttsCache.has(cacheKey)) {
    return ttsCache.get(cacheKey);
  }

  // Nếu giọng chính bị nghẽn/từ chối, tự động thử sang các giọng nữ Mỹ dự phòng
  const voiceCandidates = [...new Set([
    voice,
    'en-US-AvaNeural',
    'en-US-AriaNeural',
    'en-US-JennyNeural'
  ])];

  let lastError = null;

  for (const candidateVoice of voiceCandidates) {
    try {
      const tts = new EdgeTTS({ timeout: 12000 });
      await tts.synthesize(cleanText, candidateVoice, {
        rate,
        outputFormat: 'audio-24khz-96kbitrate-mono-mp3'
      });
      const buffer = tts.toBuffer();
      if (buffer && buffer.length > 0) {
        setCache(cacheKey, buffer);
        return buffer;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Edge TTS lỗi với giọng ${candidateVoice}:`, err.message);
      await new Promise(r => setTimeout(r, 350));
    }
  }

  throw lastError || new Error('Không thể kết nối dịch vụ giọng đọc Ava.');
}