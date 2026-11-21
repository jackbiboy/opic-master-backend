import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

/**
 * Chuyển đổi file âm thanh bất kỳ (webm, mp4, ogg...) sang MP3 chuẩn 16kHz mono
 */
export async function convertToStandardMp3(inputPath) {
  if (!ffmpegPath) {
    throw new Error("Không tìm thấy ffmpeg-static binary.");
  }

  const outputPath = `${inputPath}.mp3`;

  // -y: ghi đè nếu có, -ac 1: mono, -ar 16000: tần số 16kHz tối ưu cho giọng nói, -b:a 64k: nén nhẹ
  const args = [
    "-y",
    "-i",
    inputPath,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "64k",
    outputPath,
  ];

  await execFileAsync(ffmpegPath, args);
  return outputPath;
}
