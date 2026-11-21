import fs from "node:fs/promises";
import { GoogleGenAI, Type } from "@google/genai";

const CATEGORY_HINTS = {
  intro:
    "This is Question 1 (Self-Introduction). Check natural warmth, clear background summary, and smooth flow.",
  description:
    "This is a Description/Routine question. Check rich descriptive adjectives, present tense consistency, and logical structure.",
  memory:
    "This is a Past/Memorable Experience question. STRICTLY check past tense accuracy (Past Simple / Past Continuous) and storytelling sequence (beginning, climax, ending/feeling).",
  roleplay:
    'This is a Role-Play scenario (Questions 11-12). STRICTLY check if the candidate speaks DIRECTLY in first-person to the listener (e.g., "Hi, I\'m calling to..."), asks 3-4 questions (if Q11), or clearly gives 2 alternative solutions (if Q12). Penalize if they talk ABOUT the situation in third person instead of acting it out.',
  advanced:
    "This is an Advanced-level comparison/social issue question (Questions 14-15). Check ability to compare past vs present, express opinions with supporting reasons, and maintain connected paragraph structure.",
};

/**
 * Chấm điểm 1 câu nói (hỗ trợ cả chế độ trả lời tự do & đọc theo văn bản)
 */
export async function gradeOPIcAnswer({
  audioPath,
  question,
  mode = "speaking",
  category = "",
}) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const audioBuffer = await fs.readFile(audioPath);
  const audioBase64 = audioBuffer.toString("base64");

  const isReadingMode = mode === "reading";
  const categoryContext = CATEGORY_HINTS[category] || "";

  const prompt = isReadingMode
    ? `
You are an American English Pronunciation & Shadowing Coach.
The learner is practicing READING ALOUD / SHADOWING the following reference text.
Listen carefully to the audio and compare it word-by-word with the reference text.

Reference text:
"${question}"

Evaluation Rules:
1. Transcribe exactly what you hear in the audio (including mispronounced words, skipped words, or hesitations). If no speech is heard, set transcript to "(Không nghe thấy giọng nói)" and estimatedLevel to "Unratable".
2. Rate overall pronunciation & delivery proficiency using ACTFL scale equivalent (IL, IM1, IM2, IM3, IH, AL).
3. Score 1-10 on: taskCompletion (accuracy vs reference text), fluency (rhythm, pacing, natural pauses), pronunciation (clarity of consonants/vowels/word endings), grammar (10 if read accurately, lower if words were altered/dropped), vocabulary (natural intonation & stress).
4. In "grammarCorrections", list specific words or phrases they mispronounced, dropped, or stressed wrongly:
   - original: what they sounded like / the word they struggled with
   - corrected: the exact target word/phrase with phonetic hint (e.g., "comfortable /ˈkʌmftərbəl/")
   - explanationVi: hướng dẫn chi tiết cách phát âm, nối âm hoặc nhấn trọng âm bằng tiếng Việt.
5. In "improvedSampleAnswer", rewrite the reference text marked with "/" for natural pauses and **bold** or UPPERCASE for stressed words to help them shadow better.
6. Provide encouraging, practical tips in Vietnamese in "feedbackVi".
`
    : `
You are a certified ACTFL OPIc (Oral Proficiency Interview - computer) Examiner.
Listen carefully to the candidate's spontaneous audio response to the following OPIc question.

Question asked by the examiner (Ava):
"${question}"

Question Type Context:
${categoryContext}

Evaluation Rules:
1. Transcribe accurately what the candidate actually said (including noticeable hesitations like "uhm", "ah" if any). If no speech is heard, set transcript to "(Không nghe thấy giọng nói)" and estimatedLevel to "Unratable".
2. Rate according to ACTFL OPIc levels: NL, NM, NH, IL, IM1, IM2, IM3, IH, or AL.
   - To reach IM2/IM3: candidate must produce strings of sentences and handle basic descriptions/routines.
   - To reach IH/AL: candidate must speak in connected paragraphs, handle past/present/future tenses accurately, and use rich vocabulary naturally.
3. Evaluate 5 scores on a 1-10 scale: taskCompletion, fluency, pronunciation, grammar, vocabulary.
4. Provide grammar/expression/pronunciation corrections and overall feedback in Vietnamese so a Vietnamese learner can understand easily.
5. Write an improved sample answer in English at an IH/AL level while keeping the candidate's original ideas (if Role-play, write it as direct spoken dialogue).
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "audio/mp3",
              data: audioBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: { type: Type.STRING },
          estimatedLevel: { type: Type.STRING },
          scores: {
            type: Type.OBJECT,
            properties: {
              taskCompletion: { type: Type.INTEGER },
              fluency: { type: Type.INTEGER },
              pronunciation: { type: Type.INTEGER },
              grammar: { type: Type.INTEGER },
              vocabulary: { type: Type.INTEGER },
            },
          },
          grammarCorrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                explanationVi: { type: Type.STRING },
              },
            },
          },
          improvedSampleAnswer: { type: Type.STRING },
          feedbackVi: { type: Type.STRING },
        },
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * Đánh giá tổng thể toàn bài thi OPIc (12 hoặc 15 câu) theo chuẩn ACTFL Holistic Rating
 */
export async function generateMockExamFinalReport({
  selfAssessmentLevel,
  adjustedDifficulty,
  surveyTopics,
  questionResults,
}) {
  const answeredItems = questionResults.filter((q) => !q.skipped);
  if (answeredItems.length === 0) {
    return {
      finalLevel: "Unratable",
      averageScores: {
        taskCompletion: 0,
        fluency: 0,
        pronunciation: 0,
        grammar: 0,
        vocabulary: 0,
      },
      strengthsVi: "Chưa có câu trả lời nào có giọng nói.",
      weaknessesVi: "Bạn đã bỏ qua toàn bộ câu hỏi trong bài thi.",
      overallFeedbackVi:
        "Hãy kiểm tra lại micro và thử hoàn thành đầy đủ các câu hỏi để nhận đánh giá chính xác.",
      studyPlanVi:
        "Bắt đầu với chế độ luyện từng câu để làm quen trước khi thi thử lại.",
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const compactSummary = questionResults.map((item) => ({
    questionNumber: item.questionNumber,
    category: item.category,
    topic: item.topic,
    question: item.question,
    skipped: item.skipped,
    transcript: item.grading?.transcript || "(Skipped)",
    estimatedLevel: item.grading?.estimatedLevel || "Unratable",
    scores: item.grading?.scores || null,
  }));

  const prompt = `
You are a Lead ACTFL OPIc Senior Rater.
Review the candidate's complete OPIc Mock Exam performance across ${questionResults.length} questions and determine their HOLISTIC official OPIc proficiency level.

Candidate Info:
- Initial Self-Assessment Level (1-6): ${selfAssessmentLevel}
- Mid-test Difficulty Adjustment (after Q7): ${adjustedDifficulty || "same"}
- Selected Survey Topics: ${surveyTopics.join(", ")}

Per-question transcripts and preliminary scores:
${JSON.stringify(compactSummary, null, 2)}

ACTFL Holistic Rating Principles:
- Do NOT just take a blind mathematical average. Look at SUSTAINED performance across the whole interview.
- To achieve IM2 or IM3: candidate must consistently form strings of sentences, describe routines, and handle basic past events/role-plays without breaking down.
- To achieve IH (Intermediate High): candidate must produce connected paragraphs most of the time, narrate past events with good tense control, handle Role-Play complications well, and attempt Advanced questions meaningfully.
- To achieve AL (Advanced Low): candidate must sustain paragraph-level discourse across past/present/future, handle unexpected Role-Play problems smoothly, and discuss abstract/comparison topics (Q14-15) clearly with rich vocabulary.
- Penalize heavily if multiple questions were skipped or very short (<10 words).

Return JSON with:
- finalLevel: one of NL, NM, NH, IL, IM1, IM2, IM3, IH, AL
- averageScores: integer 1-10 for taskCompletion, fluency, pronunciation, grammar, vocabulary
- strengthsVi: điểm mạnh nổi bật xuyên suốt bài thi (tiếng Việt)
- weaknessesVi: điểm yếu lớn nhất cản trở lên band cao hơn (tiếng Việt)
- overallFeedbackVi: nhận xét tổng thể chi tiết theo 5 tiêu chí OPIc (tiếng Việt)
- studyPlanVi: 3 việc cụ thể bạn nên ôn trong tuần tới để tăng band (tiếng Việt)
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          finalLevel: { type: Type.STRING },
          averageScores: {
            type: Type.OBJECT,
            properties: {
              taskCompletion: { type: Type.INTEGER },
              fluency: { type: Type.INTEGER },
              pronunciation: { type: Type.INTEGER },
              grammar: { type: Type.INTEGER },
              vocabulary: { type: Type.INTEGER },
            },
          },
          strengthsVi: { type: Type.STRING },
          weaknessesVi: { type: Type.STRING },
          overallFeedbackVi: { type: Type.STRING },
          studyPlanVi: { type: Type.STRING },
        },
      },
    },
  });

  return JSON.parse(response.text);
}
