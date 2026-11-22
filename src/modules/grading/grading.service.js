import fs from 'node:fs/promises';
import { GoogleGenAI, Type } from '@google/genai';

const MODEL_CANDIDATES = [...new Set([
  process.env.GEMINI_MODEL,
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite'
].filter(Boolean))];

function isRetryableModelError(err) {
  const status = err?.status;
  const msg = String(err?.message || '');
  return (
    status === 503 ||
    status === 429 ||
    status === 404 ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('429') ||
    msg.includes('404') ||
    msg.includes('NOT_FOUND')
  );
}

async function generateWithFallback(ai, params) {
  let lastError = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      // Dùng thinkingLevel LOW để chấm nhanh trong 3-5 giây, tránh timeout trên Render/Mobile
      const configWithFastThinking = {
        ...params.config,
        thinkingConfig: { thinkingLevel: 'LOW' }
      };

      return await ai.models.generateContent({
        ...params,
        model,
        config: configWithFastThinking
      });
    } catch (err) {
      lastError = err;

      // Nếu model dự phòng nào không hỗ trợ thinkingConfig (lỗi 400), thử gọi lại không kèm thinkingConfig
      if (err?.status === 400) {
        try {
          return await ai.models.generateContent({ ...params, model });
        } catch (fallbackErr) {
          lastError = fallbackErr;
          if (!isRetryableModelError(fallbackErr)) throw fallbackErr;
        }
      } else if (!isRetryableModelError(err)) {
        throw err;
      }

      console.warn(`Model ${model} tam ban/loi (${err.status || 'retryable'}), dang thu model du phong...`);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  throw lastError;
}

/**
 * Chuẩn hóa & giải cứu trường hợp model nhét nhầm phần JSON đuôi vào trong trường transcript
 */
function rescueAndNormalizeGrading(parsed) {
  let data = parsed && typeof parsed === 'object' ? { ...parsed } : {};

  if (
    typeof data.transcript === 'string' &&
    data.transcript.includes('"estimatedLevel"') &&
    !data.estimatedLevel
  ) {
    try {
      const splitMarker = /",\s*"estimatedLevel"\s*:/;
      const match = data.transcript.match(splitMarker);
      if (match) {
        const idx = match.index;
        const realTranscript = data.transcript.slice(0, idx);
        let tailJsonStr = '{"estimatedLevel":' + data.transcript.slice(idx + match[0].length);
        if (!tailJsonStr.trim().endsWith('}')) tailJsonStr += '}';
        const tailObj = JSON.parse(tailJsonStr);
        data = { transcript: realTranscript, ...tailObj };
      }
    } catch (e) {
      console.warn('Khong tach duoc JSON long trong transcript:', e.message);
    }
  }

  return {
    transcript: data.transcript || '(Không nghe rõ nội dung)',
    estimatedLevel: data.estimatedLevel || 'IM1',
    scores: {
      taskCompletion: Number(data.scores?.taskCompletion ?? 5),
      fluency: Number(data.scores?.fluency ?? 5),
      pronunciation: Number(data.scores?.pronunciation ?? 5),
      grammar: Number(data.scores?.grammar ?? 5),
      vocabulary: Number(data.scores?.vocabulary ?? 5)
    },
    grammarCorrections: Array.isArray(data.grammarCorrections) ? data.grammarCorrections : [],
    improvedSampleAnswer: data.improvedSampleAnswer || '',
    feedbackVi: data.feedbackVi || 'Hãy tiếp tục luyện tập mở rộng ý và nối câu trôi chảy hơn.'
  };
}

const CATEGORY_HINTS = {
  intro: 'This is Question 1 (Self-Introduction). Check natural warmth, clear background summary, and smooth flow.',
  description: 'This is a Description/Routine question. Check rich descriptive adjectives, present tense consistency, and logical structure.',
  memory: 'This is a Past/Memorable Experience question. STRICTLY check past tense accuracy (Past Simple / Past Continuous) and storytelling sequence.',
  roleplay: 'This is a Role-Play scenario (Questions 11-12). STRICTLY check if the candidate speaks DIRECTLY in first-person to the listener, asks 3-4 questions (Q11), or clearly gives 2 alternative solutions (Q12).',
  advanced: 'This is an Advanced-level comparison/social issue question (Questions 14-15). Check ability to compare past vs present and maintain connected paragraph structure.'
};

export async function gradeOPIcAnswer({ audioPath, question, mode = 'speaking', category = '' }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const audioBuffer = await fs.readFile(audioPath);
  const audioBase64 = audioBuffer.toString('base64');
  const isReadingMode = mode === 'reading';
  const categoryContext = CATEGORY_HINTS[category] || '';

  const prompt = isReadingMode
    ? `
You are an American English Pronunciation & Shadowing Coach.
Listen to the learner reading aloud the reference text and compare word-by-word.

Reference text:
"${question}"

STRICT OUTPUT RULES:
- Return a valid JSON object matching the schema.
- Keep "transcript" strictly to ONLY the spoken English words you hear (no JSON syntax inside). If silent, set transcript to "(Không nghe thấy giọng nói)" and estimatedLevel to "Unratable".
- Rate ACTFL equivalent level (IL, IM1, IM2, IM3, IH, AL) in "estimatedLevel".
- Score 1-10 in "scores".
- List mispronounced/dropped/wrongly-stressed words in "grammarCorrections" with phonetic hint and Vietnamese explanation.
- In "improvedSampleAnswer", provide the reference text with "/" for pauses to practice shadowing.
- In "feedbackVi", give clear Vietnamese coaching tips.
`
    : `
You are a certified ACTFL OPIc Examiner.
Listen carefully to the candidate's audio response to the following OPIc question.

Question asked by Ava:
"${question}"

Question Context:
${categoryContext}

STRICT OUTPUT RULES:
- Return a valid JSON object matching the schema.
- Keep "transcript" strictly to ONLY the spoken words you hear (do NOT put other JSON fields inside "transcript"). If silent, set transcript to "(Không nghe thấy giọng nói)" and estimatedLevel to "Unratable".
- Rate ACTFL level in "estimatedLevel" (NL, NM, NH, IL, IM1, IM2, IM3, IH, or AL).
- Evaluate 5 integer scores (1-10) in "scores".
- List specific grammar/pronunciation mistakes in "grammarCorrections" with Vietnamese explanations.
- In "improvedSampleAnswer", rewrite a natural Band IH/AL English response keeping the candidate's own ideas.
- In "feedbackVi", write clear Vietnamese feedback (use line breaks for readability).
`;

  const response = await generateWithFallback(ai, {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'audio/mp3',
              data: audioBase64
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: [
          'estimatedLevel',
          'transcript',
          'scores',
          'feedbackVi',
          'grammarCorrections',
          'improvedSampleAnswer'
        ],
        properties: {
          estimatedLevel: {
            type: Type.STRING,
            description: 'ACTFL rating such as NL, NM, NH, IL, IM1, IM2, IM3, IH, or AL'
          },
          transcript: {
            type: Type.STRING,
            description: 'Only the verbatim transcript of what the candidate spoke in the audio'
          },
          scores: {
            type: Type.OBJECT,
            required: ['taskCompletion', 'fluency', 'pronunciation', 'grammar', 'vocabulary'],
            properties: {
              taskCompletion: { type: Type.INTEGER },
              fluency: { type: Type.INTEGER },
              pronunciation: { type: Type.INTEGER },
              grammar: { type: Type.INTEGER },
              vocabulary: { type: Type.INTEGER }
            }
          },
          feedbackVi: {
            type: Type.STRING,
            description: 'Overall feedback and advice written clearly in Vietnamese'
          },
          grammarCorrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['original', 'corrected', 'explanationVi'],
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                explanationVi: { type: Type.STRING }
              }
            }
          },
          improvedSampleAnswer: {
            type: Type.STRING,
            description: 'Upgraded English sample response (IH/AL level) based on candidate ideas'
          }
        }
      }
    }
  });

  const parsed = JSON.parse(response.text);
  return rescueAndNormalizeGrading(parsed);
}

export async function generateMockExamFinalReport({
  selfAssessmentLevel,
  adjustedDifficulty,
  surveyTopics,
  questionResults
}) {
  const answeredItems = questionResults.filter(q => !q.skipped);
  if (answeredItems.length === 0) {
    return {
      finalLevel: 'Unratable',
      averageScores: { taskCompletion: 0, fluency: 0, pronunciation: 0, grammar: 0, vocabulary: 0 },
      strengthsVi: 'Chưa có câu trả lời nào có giọng nói.',
      weaknessesVi: 'Bạn đã bỏ qua toàn bộ câu hỏi trong bài thi.',
      overallFeedbackVi: 'Hãy kiểm tra lại micro và thử hoàn thành đầy đủ các câu hỏi.',
      studyPlanVi: 'Bắt đầu với chế độ luyện từng câu để làm quen trước.'
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const compactSummary = questionResults.map(item => ({
    questionNumber: item.questionNumber,
    category: item.category,
    topic: item.topic,
    question: item.question,
    skipped: item.skipped,
    transcript: item.grading?.transcript || '(Skipped)',
    estimatedLevel: item.grading?.estimatedLevel || 'Unratable',
    scores: item.grading?.scores || null
  }));

  const prompt = `
You are a Lead ACTFL OPIc Senior Rater.
Review the candidate's complete OPIc Mock Exam performance across ${questionResults.length} questions and determine their HOLISTIC official OPIc proficiency level.

Candidate Info:
- Initial Self-Assessment Level (1-6): ${selfAssessmentLevel}
- Mid-test Difficulty Adjustment (after Q7): ${adjustedDifficulty || 'same'}
- Selected Survey Topics: ${surveyTopics.join(', ')}

Per-question transcripts and preliminary scores:
${JSON.stringify(compactSummary, null, 2)}

Return JSON matching the schema with holistic rating (NL..AL) and Vietnamese guidance.
`;

  const response = await generateWithFallback(ai, {
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ['finalLevel', 'averageScores', 'strengthsVi', 'weaknessesVi', 'overallFeedbackVi', 'studyPlanVi'],
        properties: {
          finalLevel: { type: Type.STRING },
          averageScores: {
            type: Type.OBJECT,
            required: ['taskCompletion', 'fluency', 'pronunciation', 'grammar', 'vocabulary'],
            properties: {
              taskCompletion: { type: Type.INTEGER },
              fluency: { type: Type.INTEGER },
              pronunciation: { type: Type.INTEGER },
              grammar: { type: Type.INTEGER },
              vocabulary: { type: Type.INTEGER }
            }
          },
          strengthsVi: { type: Type.STRING },
          weaknessesVi: { type: Type.STRING },
          overallFeedbackVi: { type: Type.STRING },
          studyPlanVi: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text);
}