import fs from "node:fs/promises";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { convertToStandardMp3 } from "./modules/grading/audioConverter.service.js";
import { gradeOPIcAnswer } from "./modules/grading/grading.service.js";
import { synthesizeWithAva } from "./modules/tts/tts.service.js";
import {
  OPIC_QUESTIONS,
  OPIC_TOPICS,
  QUESTION_CATEGORIES,
} from "./modules/exam/questions.data.js";
import {
  createMockExamSession,
  enqueueAnswerGrading,
  adjustExamAfterQ7,
  getQuestionInSession,
  finishMockExam,
} from "./modules/exam/exam.service.js";
import {
  saveHistoryEntry,
  getHistoryGroupedByDate,
  getHistoryById,
  deleteHistoryById,
} from "./modules/history/history.service.js";

dotenv.config();
await fs.mkdir("uploads", { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    storage: process.env.MONGODB_URI ? "mongodb_atlas" : "local_json",
    timestamp: new Date().toISOString(),
  });
});

// 1. Kho câu hỏi
app.get("/api/questions", (req, res) => {
  res.json({
    categories: QUESTION_CATEGORIES,
    topics: OPIC_TOPICS,
    questions: OPIC_QUESTIONS,
  });
});

// 2. Giọng đọc Ava TTS
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice, rate } = req.body;
    const audioBuffer = await synthesizeWithAva({ text, voice, rate });
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error("Lỗi TTS:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 3. Chấm điểm 1 câu (Luyện tập) & Tự động lưu lịch sử
app.post("/api/grade", upload.single("audio"), async (req, res) => {
  let rawAudioPath = req.file?.path;
  let mp3Path = null;

  try {
    const { question, mode, category, title } = req.body;
    if (!req.file)
      return res.status(400).json({ error: "Chưa nhận được file âm thanh." });
    if (!question)
      return res.status(400).json({ error: "Thiếu nội dung câu hỏi." });
    if (req.file.size < 1000)
      return res.status(400).json({ error: "File ghi âm quá ngắn." });

    mp3Path = await convertToStandardMp3(rawAudioPath);
    const actualMode = mode === "reading" ? "reading" : "speaking";
    const result = await gradeOPIcAnswer({
      audioPath: mp3Path,
      question,
      mode: actualMode,
      category: category || "",
    });

    // Tính điểm trung bình 5 tiêu chí và lưu vào lịch sử theo ngày
    const scoreVals = Object.values(result.scores || {}).filter(
      (v) => typeof v === "number",
    );
    const avgScore =
      scoreVals.length > 0
        ? Number(
            (scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(
              1,
            ),
          )
        : 0;

    await saveHistoryEntry({
      type: actualMode === "reading" ? "single_reading" : "single_speaking",
      title:
        title || question.slice(0, 65) + (question.length > 65 ? "..." : ""),
      question,
      estimatedLevel: result.estimatedLevel,
      averageScore: avgScore,
      scores: result.scores,
      result,
    });

    res.json({ status: "success", data: result });
  } catch (error) {
    console.error("Lỗi chấm điểm:", error);
    res.status(500).json({ status: "error", message: error.message });
  } finally {
    if (rawAudioPath) await fs.unlink(rawAudioPath).catch(() => {});
    if (mp3Path) await fs.unlink(mp3Path).catch(() => {});
  }
});

// 4. API Thi thử 12-15 câu (Survey -> Thi -> Chấm ngầm -> Tổng kết)
app.post("/api/exam/start", (req, res) => {
  try {
    const data = createMockExamSession(req.body);
    res.json({ status: "success", data });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/exam/:sessionId/answer", upload.single("audio"), (req, res) => {
  try {
    const data = enqueueAnswerGrading({
      sessionId: req.params.sessionId,
      questionIndex: req.body.questionIndex,
      file: req.file,
    });
    res.json({ status: "success", data });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path).catch(() => {});
    res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/exam/:sessionId/adjust", (req, res) => {
  try {
    const data = adjustExamAfterQ7({
      sessionId: req.params.sessionId,
      adjustment: req.body.adjustment,
    });
    res.json({ status: "success", data });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

app.get("/api/exam/:sessionId/question/:index", (req, res) => {
  try {
    const data = getQuestionInSession(req.params.sessionId, req.params.index);
    res.json({ status: "success", data });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/exam/:sessionId/finish", async (req, res) => {
  try {
    const record = await finishMockExam(req.params.sessionId);
    res.json({ status: "success", data: record });
  } catch (error) {
    console.error("Lỗi tổng kết bài thi:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 5. API Lịch sử & Điểm theo ngày
app.get("/api/history", async (req, res) => {
  try {
    const data = await getHistoryGroupedByDate();
    res.json({ status: "success", data });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/history/:id", async (req, res) => {
  try {
    const item = await getHistoryById(req.params.id);
    if (!item)
      return res.status(404).json({ error: "Không tìm thấy bài thi." });
    res.json({ status: "success", data: item });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.delete("/api/history/:id", async (req, res) => {
  try {
    const deleted = await deleteHistoryById(req.params.id);
    res.json({ status: deleted ? "success" : "not_found" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server dang chay tai: http://localhost:${PORT}`);
});
