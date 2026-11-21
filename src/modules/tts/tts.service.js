import { EdgeTTS } from "@andresaya/edge-tts";

/**
 * Chuyển văn bản tiếng Anh thành giọng đọc MP3 của Ava
 * @param {object} params
 * @param {string} params.text - Văn bản cần đọc
 * @param {string} params.voice - en-US-AvaMultilingualNeural (tự nhiên nhất) hoặc en-US-AvaNeural
 * @param {string} params.rate - Tốc độ đọc: '-20%', '0%', '+15%'...
 */
export async function synthesizeWithAva({
  text,
  voice = "en-US-AvaMultilingualNeural",
  rate = "0%",
}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("Văn bản cần đọc không được để trống.");
  }
  if (cleanText.length > 3000) {
    throw new Error("Văn bản tối đa 3000 ký tự mỗi lần đọc.");
  }

  // Tạo instance mới cho mỗi request để tránh ghi đè khi nhiều người gọi cùng lúc
  const tts = new EdgeTTS();
  await tts.synthesize(cleanText, voice, {
    rate,
    outputFormat: "audio-24khz-96kbitrate-mono-mp3",
  });

  return tts.toBuffer();
}
