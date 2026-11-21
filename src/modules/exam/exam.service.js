import fs from "node:fs/promises";
import crypto from "node:crypto";
import { OPIC_QUESTIONS } from "./questions.data.js";
import { convertToStandardMp3 } from "../grading/audioConverter.service.js";
import {
  gradeOPIcAnswer,
  generateMockExamFinalReport,
} from "../grading/grading.service.js";
import { saveHistoryEntry } from "../history/history.service.js";

const activeSessions = new Map();

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getComboForTopic(topicId) {
  const items = OPIC_QUESTIONS.filter(
    (q) =>
      q.topic === topicId &&
      (q.category === "description" || q.category === "memory") &&
      !q.rpGroup,
  );
  return items.sort((a, b) => (a.comboStep || 0) - (b.comboStep || 0));
}

function pickRolePlayGroup(selectedTopics) {
  const groups = ["rp_park", "rp_travel", "rp_shopping"];
  const matching = groups.filter((g) =>
    selectedTopics.some((t) => g.includes(t.split("_")[0])),
  );
  const chosenGroup =
    matching.length > 0 ? shuffle(matching)[0] : shuffle(groups)[0];
  return OPIC_QUESTIONS.filter((q) => q.rpGroup === chosenGroup).sort(
    (a, b) => (a.comboStep || 0) - (b.comboStep || 0),
  );
}

/**
 * Tạo phiên thi thử mới theo Background Survey & Self-Assessment (Level 1-6)
 */
export function createMockExamSession({
  backgroundSurvey,
  selfAssessmentLevel,
}) {
  const level = Math.min(6, Math.max(1, Number(selfAssessmentLevel) || 3));
  const totalQuestions = level <= 2 ? 12 : 15;

  const surveyTopics =
    Array.isArray(backgroundSurvey?.topics) &&
    backgroundSurvey.topics.length > 0
      ? backgroundSurvey.topics
      : ["park", "cafe", "travel", "shopping"];

  // Đưa work_school và home vào pool nếu user có chọn nghề nghiệp/nhà ở
  const topicPool = shuffle([
    ...new Set([
      ...surveyTopics,
      "park",
      "cafe",
      "travel",
      "home",
      "shopping",
      "music_movie",
      "work_school",
      "sports",
    ]),
  ]);

  const introQ = OPIC_QUESTIONS.find((q) => q.id === "intro_1");

  // Lấy 3 combo từ các chủ đề ưu tiên trong Survey
  const prioritizedTopics = shuffle(surveyTopics);
  const remainingTopics = topicPool.filter(
    (t) => !prioritizedTopics.includes(t),
  );
  const orderedTopics = [...prioritizedTopics, ...remainingTopics];

  const comboA = getComboForTopic(orderedTopics[0]).slice(0, 3);
  const comboB = getComboForTopic(orderedTopics[1]).slice(0, 3);
  const comboC = getComboForTopic(orderedTopics[2]).slice(0, 3);
  const comboD = getComboForTopic(orderedTopics[3]).slice(0, 2);

  // 7 câu đầu: Câu 1 (Intro) + Combo A (2-4) + Combo B (5-7)
  const firstHalf = [introQ, ...comboA, ...comboB].slice(0, 7);

  const sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    backgroundSurvey,
    selfAssessmentLevel: level,
    adjustedDifficulty: null,
    totalQuestions,
    surveyTopics,
    questions: firstHalf,
    reservePool: { comboC, comboD, rolePlay: pickRolePlayGroup(surveyTopics) },
    answers: new Map(),
    gradingQueue: Promise.resolve(),
    createdAt: new Date().toISOString(),
  };

  activeSessions.set(sessionId, session);

  return {
    sessionId,
    totalQuestions,
    currentIndex: 0,
    question: firstHalf[0],
  };
}

/**
 * Xếp hàng đợi chấm ngầm 1 câu trả lời (chạy tuần tự để tránh quá tải API)
 */
export function enqueueAnswerGrading({ sessionId, questionIndex, file }) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error("Phiên thi không tồn tại hoặc đã hết hạn.");
  }

  const idx = Number(questionIndex);
  const qObj = session.questions[idx];
  if (!qObj) {
    throw new Error(`Không tìm thấy câu hỏi số ${idx + 1}.`);
  }

  // Nếu thí sinh bấm Next mà không nói hoặc file quá nhỏ -> bỏ qua không tốn API
  if (!file || file.size < 1000) {
    if (file?.path) fs.unlink(file.path).catch(() => {});
    session.answers.set(idx, {
      questionNumber: idx + 1,
      category: qObj.category,
      topic: qObj.topic,
      title: qObj.title,
      question: qObj.question,
      skipped: true,
      grading: null,
    });
    return { status: "skipped", questionIndex: idx };
  }

  // Đẩy vào chuỗi Promise tuần tự để chấm ngầm từng câu
  session.gradingQueue = session.gradingQueue.then(async () => {
    let mp3Path = null;
    try {
      mp3Path = await convertToStandardMp3(file.path);
      const grading = await gradeOPIcAnswer({
        audioPath: mp3Path,
        question: qObj.question,
        mode: "speaking",
        category: qObj.category,
      });

      session.answers.set(idx, {
        questionNumber: idx + 1,
        category: qObj.category,
        topic: qObj.topic,
        title: qObj.title,
        question: qObj.question,
        skipped: false,
        grading,
      });
    } catch (err) {
      console.error(`Lỗi chấm ngầm câu ${idx + 1}:`, err.message);
      session.answers.set(idx, {
        questionNumber: idx + 1,
        category: qObj.category,
        topic: qObj.topic,
        title: qObj.title,
        question: qObj.question,
        skipped: true,
        error: err.message,
        grading: null,
      });
    } finally {
      await fs.unlink(file.path).catch(() => {});
      if (mp3Path) await fs.unlink(mp3Path).catch(() => {});
    }
  });

  return { status: "queued", questionIndex: idx };
}

/**
 * Điều chỉnh độ khó nửa sau (sau Câu 7) và sinh câu 8 -> 12/15
 */
export function adjustExamAfterQ7({ sessionId, adjustment }) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error("Phiên thi không tồn tại.");
  }

  // Tránh sinh lặp nếu đã adjust rồi
  if (session.questions.length > 7) {
    return {
      totalQuestions: session.totalQuestions,
      nextIndex: 7,
      question: session.questions[7],
    };
  }

  session.adjustedDifficulty = adjustment; // 'easier' | 'same' | 'harder'
  let effectiveLevel = session.selfAssessmentLevel;
  if (adjustment === "easier") effectiveLevel = Math.max(1, effectiveLevel - 1);
  if (adjustment === "harder") effectiveLevel = Math.min(6, effectiveLevel + 1);

  const { comboC, comboD, rolePlay } = session.reservePool;
  const advQuestions = shuffle(
    OPIC_QUESTIONS.filter((q) => q.category === "advanced"),
  ).slice(0, 2);

  let secondHalf = [];
  if (session.totalQuestions === 12) {
    // Đề 12 câu: 2 câu Combo C + 3 câu Role-play
    secondHalf = [...comboC.slice(0, 2), ...rolePlay.slice(0, 3)];
  } else {
    // Đề 15 câu: 3 câu Combo C + 3 câu Role-play + 2 câu cuối (Advanced nếu level >= 3, ngược lại Combo D nhẹ nhàng hơn)
    const finalTwo = effectiveLevel >= 3 ? advQuestions : comboD.slice(0, 2);
    secondHalf = [...comboC.slice(0, 3), ...rolePlay.slice(0, 3), ...finalTwo];
  }

  session.questions = [...session.questions, ...secondHalf].slice(
    0,
    session.totalQuestions,
  );
  session.totalQuestions = session.questions.length;

  return {
    totalQuestions: session.totalQuestions,
    nextIndex: 7,
    question: session.questions[7],
  };
}

export function getQuestionInSession(sessionId, index) {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error("Phiên thi không tồn tại.");
  const idx = Number(index);
  return {
    totalQuestions: session.totalQuestions,
    currentIndex: idx,
    question: session.questions[idx] || null,
  };
}

/**
 * Hoàn tất bài thi: chờ chấm xong các câu cuối, tổng hợp kết quả & lưu vào Lịch sử theo ngày
 */
export async function finishMockExam(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error("Phiên thi không tồn tại hoặc đã kết thúc.");
  }

  // Đợi hàng đợi chấm ngầm hoàn tất toàn bộ câu hỏi
  await session.gradingQueue;

  const questionResults = session.questions.map((qObj, idx) => {
    return (
      session.answers.get(idx) || {
        questionNumber: idx + 1,
        category: qObj.category,
        topic: qObj.topic,
        title: qObj.title,
        question: qObj.question,
        skipped: true,
        grading: null,
      }
    );
  });

  const finalReport = await generateMockExamFinalReport({
    selfAssessmentLevel: session.selfAssessmentLevel,
    adjustedDifficulty: session.adjustedDifficulty,
    surveyTopics: session.surveyTopics,
    questionResults,
  });

  const avgScores = finalReport.averageScores || {};
  const scoreValues = Object.values(avgScores).filter(
    (v) => typeof v === "number",
  );
  const overallAvg =
    scoreValues.length > 0
      ? Number(
          (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(
            1,
          ),
        )
      : 0;

  // Lưu bài thi vào data/history.json
  const savedRecord = await saveHistoryEntry({
    type: "mock_exam",
    title: `Thi thử OPIc (${session.totalQuestions} câu) - Level tự chọn ${session.selfAssessmentLevel}`,
    estimatedLevel: finalReport.finalLevel,
    averageScore: overallAvg,
    scores: avgScores,
    questionCount: session.totalQuestions,
    answeredCount: questionResults.filter((q) => !q.skipped).length,
    surveyTopics: session.surveyTopics,
    report: finalReport,
    questionResults,
  });

  activeSessions.delete(sessionId);
  return savedRecord;
}
