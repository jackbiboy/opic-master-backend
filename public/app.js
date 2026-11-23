// ==================== BẢO MẬT PIN, KEEP-ALIVE & TỰ ĐỘNG GỬI TOKEN ====================
const AUTH_TOKEN_KEY = 'opic_auth_token';
const bootLoading = document.getElementById('bootLoading');
const lockScreen = document.getElementById('lockScreen');
const appShell = document.getElementById('appShell');
const pinLoginForm = document.getElementById('pinLoginForm');
const pinInput = document.getElementById('pinInput');
const pinErrorText = document.getElementById('pinErrorText');
const btnLockApp = document.getElementById('btnLockApp');

let questionsLoaded = false;

const rawFetch = window.fetch.bind(window);
window.fetch = async (url, options = {}) => {
  const isApiCall = typeof url === 'string' && url.startsWith('/api/');
  if (!isApiCall) return rawFetch(url, options);

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await rawFetch(url, { ...options, headers });

  if (res.status === 401 && !url.startsWith('/api/auth/')) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    showLockScreen('Phiên đăng nhập đã hết hạn. Vui lòng nhập lại mã PIN.');
  }
  return res;
};

// Giữ Render thức trong lúc người dùng đang mở tab web ôn bài (không tốn token Gemini)
function wakeUpServerInBackground() {
  rawFetch('/api/health').catch(() => {});
}

setInterval(() => {
  if (document.visibilityState === 'visible') {
    wakeUpServerInBackground();
  }
}, 4 * 60 * 1000);

function hideBootLoading() {
  if (bootLoading) bootLoading.classList.add('hidden');
}

function showLockScreen(msg = '') {
  hideBootLoading();
  appShell.classList.add('hidden');
  lockScreen.classList.remove('hidden');
  pinErrorText.textContent = msg;
  pinInput.value = '';
  pinInput.focus();
}

function showAppShell(pinRequired) {
  hideBootLoading();
  lockScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  btnLockApp.classList.toggle('hidden', !pinRequired);
  if (!questionsLoaded) {
    questionsLoaded = true;
    loadQuestions();
  }
}

async function initAuthAndApp() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (data.authenticated) {
      showAppShell(data.pinRequired);
    } else {
      showLockScreen();
    }
  } catch {
    showLockScreen('Không kết nối được tới máy chủ. Vui lòng tải lại trang.');
  }
}

pinLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnPinSubmit');
  btn.disabled = true;
  pinErrorText.textContent = '⏳ Đang kiểm tra...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput.value })
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Mã PIN không đúng');
    }

    if (json.token) localStorage.setItem(AUTH_TOKEN_KEY, json.token);
    showAppShell(true);
  } catch (err) {
    pinErrorText.textContent = '❌ ' + err.message;
  } finally {
    btn.disabled = false;
  }
});

btnLockApp.addEventListener('click', () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  showLockScreen('Đã khóa màn hình.');
});

// ==================== TIỆN ÍCH CHUNG & GIỌNG DỰ PHÒNG ====================
const SCORE_LABELS_SPEAK = {
  taskCompletion: 'Đáp ứng câu hỏi',
  fluency: 'Độ trôi chảy',
  pronunciation: 'Phát âm',
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng'
};

const SCORE_LABELS_READ = {
  taskCompletion: 'Độ khớp văn bản',
  fluency: 'Nhịp điệu/Trôi chảy',
  pronunciation: 'Phát âm chuẩn',
  grammar: 'Đọc đủ từ/đuôi',
  vocabulary: 'Ngữ điệu tự nhiên'
};

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function getBestAudioMimeType() {
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return '';
}

function stopBrowserSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakWithBrowserFallback(text, rateStr = '0%', onEnd = null) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return false;
  }

  stopBrowserSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  const rateDelta = parseInt(rateStr, 10) || 0;
  utterance.rate = Math.max(0.6, Math.min(1.5, 1 + rateDelta / 100));

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find(v => v.lang.includes('en-US') && (v.name.includes('Ava') || v.name.includes('Natural'))) ||
    voices.find(v => v.lang.includes('en-US')) ||
    voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return true;
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    stopBrowserSpeech();
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.view;
    ['practiceView', 'mockExamView', 'historyView'].forEach(id => {
      document.getElementById(id).classList.toggle('hidden', id !== target);
    });
    if (target === 'historyView') loadHistory();
  });
});

// ==================== VIEW 1: LUYỆN TỪNG CÂU ====================
const categoryFilter = document.getElementById('categoryFilter');
const topicFilter = document.getElementById('topicFilter');
const questionSelect = document.getElementById('questionSelect');
const tipsBox = document.getElementById('tipsBox');
const tipsText = document.getElementById('tipsText');
const textInput = document.getElementById('textInput');
const voiceSelect = document.getElementById('voiceSelect');
const rateSelect = document.getElementById('rateSelect');
const btnAvaSpeak = document.getElementById('btnAvaSpeak');
const avaAudioPlayer = document.getElementById('avaAudioPlayer');
const downloadAudioLink = document.getElementById('downloadAudioLink');
const ttsStatus = document.getElementById('ttsStatus');
const btnRecord = document.getElementById('btnRecord');
const btnStop = document.getElementById('btnStop');
const timerEl = document.getElementById('timer');
const userAudioPlayback = document.getElementById('userAudioPlayback');
const recordStatus = document.getElementById('recordStatus');
const resultCard = document.getElementById('resultCard');
const btnAvaReadSample = document.getElementById('btnAvaReadSample');
const sampleAudioPlayer = document.getElementById('sampleAudioPlayer');
const sampleTtsStatus = document.getElementById('sampleTtsStatus');
const sampleExplainText = document.getElementById('sampleExplainText');

// Tạo nút gửi chấm lại nếu mạng chập chờn (không phải nói lại)
const btnRetryGrade = document.createElement('button');
btnRetryGrade.className = 'btn-warning hidden';
btnRetryGrade.textContent = '🔄 Gửi chấm lại bài vừa thu';
btnRetryGrade.style.marginTop = '10px';
recordStatus.insertAdjacentElement('afterend', btnRetryGrade);

let allQuestions = [];
let filteredQuestions = [];
let currentCategory = '';
let currentTitle = '';
let currentMode = 'speaking';
let practiceRecorder;
let practiceChunks = [];
let practiceTimer;
let currentAvaBlobUrl = null;
let currentSampleBlobUrl = null;
let lastSampleText = '';
let lastPracticeBlob = null;

async function loadQuestions() {
  try {
    const res = await fetch('/api/questions');
    const data = await res.json();
    allQuestions = data.questions || [];
    categoryFilter.innerHTML = '<option value="all">Tất cả các nhóm</option>';
    topicFilter.innerHTML = '<option value="all">Tất cả chủ đề</option>';
    data.categories.forEach(c => categoryFilter.add(new Option(c.label, c.id)));
    data.topics.forEach(t => topicFilter.add(new Option(t.label, t.id)));
    applyFilters();
  } catch (err) {
    ttsStatus.textContent = '❌ Không tải được câu hỏi: ' + err.message;
  }
}

function applyFilters() {
  const cat = categoryFilter.value;
  const top = topicFilter.value;
  filteredQuestions = allQuestions.filter(q =>
    (cat === 'all' || q.category === cat) && (top === 'all' || q.topic === top)
  );

  questionSelect.innerHTML = '';
  if (filteredQuestions.length === 0) {
    questionSelect.add(new Option('-- Không có câu hỏi khớp bộ lọc --', ''));
    tipsText.textContent = 'Hãy đổi bộ lọc hoặc tự nhập nội dung bên dưới.';
    currentCategory = '';
    currentTitle = '';
    return;
  }
  filteredQuestions.forEach((q, i) => questionSelect.add(new Option(q.title, i)));
  selectQuestionByIndex(0);
}

function selectQuestionByIndex(idx) {
  const item = filteredQuestions[idx];
  if (!item) return;
  questionSelect.value = idx;
  textInput.value = item.question;
  tipsText.textContent = item.tipsVi;
  currentCategory = item.category;
  currentTitle = item.title;
}

categoryFilter.addEventListener('change', applyFilters);
topicFilter.addEventListener('change', applyFilters);
questionSelect.addEventListener('change', () => selectQuestionByIndex(Number(questionSelect.value)));
document.getElementById('btnNextQuestion').addEventListener('click', () => {
  if (!filteredQuestions.length) return;
  selectQuestionByIndex((Number(questionSelect.value) + 1) % filteredQuestions.length);
});
document.getElementById('btnRandomQuestion').addEventListener('click', () => {
  if (!filteredQuestions.length) return;
  selectQuestionByIndex(Math.floor(Math.random() * filteredQuestions.length));
});
document.getElementById('btnBlurText').addEventListener('click', () => textInput.classList.toggle('blurred'));
document.getElementById('btnToggleTips').addEventListener('click', () => tipsBox.classList.toggle('hidden'));

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    document.getElementById('recordCardTitle').textContent = currentMode === 'reading'
      ? '🎙️ Thu âm đọc theo văn bản ở trên (Kiểm tra phát âm)'
      : '🎙️ Thu âm câu trả lời OPIc của bạn';
  });
});

async function fetchAvaAudioBlob(text, voice = voiceSelect.value, rate = rateSelect.value) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, rate })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return await res.blob();
}

btnAvaSpeak.addEventListener('click', async () => {
  const textToSpeak = textInput.value;
  if (!textToSpeak.trim()) {
    ttsStatus.textContent = '⚠️ Vui lòng nhập văn bản tiếng Anh trước.';
    return;
  }
  stopBrowserSpeech();
  btnAvaSpeak.disabled = true;
  ttsStatus.textContent = '⏳ Ava đang chuẩn bị giọng đọc...';

  try {
    const blob = await fetchAvaAudioBlob(textToSpeak);
    if (currentAvaBlobUrl) URL.revokeObjectURL(currentAvaBlobUrl);
    currentAvaBlobUrl = URL.createObjectURL(blob);
    avaAudioPlayer.src = currentAvaBlobUrl;
    avaAudioPlayer.classList.remove('hidden');
    downloadAudioLink.href = currentAvaBlobUrl;
    downloadAudioLink.classList.remove('hidden');
    await avaAudioPlayer.play();
    ttsStatus.textContent = '🎧 Ava đang đọc...';
  } catch (err) {
    const ok = speakWithBrowserFallback(textToSpeak, rateSelect.value, () => {
      ttsStatus.textContent = '✅ Đã đọc xong (giọng dự phòng).';
    });
    ttsStatus.textContent = ok
      ? `⚠️ Giọng Ava server tạm nghẽn (${err.message}), đang đọc bằng giọng dự phòng trên máy...`
      : `❌ Lỗi giọng đọc Ava: ${err.message}`;
  } finally {
    btnAvaSpeak.disabled = false;
  }
});

btnAvaReadSample.addEventListener('click', async () => {
  const cleanSample = lastSampleText.replace(/[*\/]/g, '').trim();
  if (!cleanSample) return;

  stopBrowserSpeech();
  btnAvaReadSample.disabled = true;
  if (sampleTtsStatus) sampleTtsStatus.textContent = '⏳ Ava đang chuẩn bị giọng đọc bài mẫu...';

  try {
    const blob = await fetchAvaAudioBlob(cleanSample);
    if (currentSampleBlobUrl) URL.revokeObjectURL(currentSampleBlobUrl);
    currentSampleBlobUrl = URL.createObjectURL(blob);

    if (sampleAudioPlayer) {
      sampleAudioPlayer.src = currentSampleBlobUrl;
      sampleAudioPlayer.classList.remove('hidden');
      await sampleAudioPlayer.play();
    }
    if (sampleTtsStatus) sampleTtsStatus.textContent = '🎧 Ava đang đọc bài mẫu...';
  } catch (err) {
    const ok = speakWithBrowserFallback(cleanSample, rateSelect.value, () => {
      if (sampleTtsStatus) sampleTtsStatus.textContent = '✅ Đã đọc xong bài mẫu (giọng dự phòng).';
    });
    if (sampleTtsStatus) {
      sampleTtsStatus.textContent = ok
        ? `⚠️ Giọng Ava server tạm nghẽn (${err.message}), đang đọc bằng giọng dự phòng...`
        : `❌ Lỗi đọc bài mẫu: ${err.message}`;
    }
  } finally {
    btnAvaReadSample.disabled = false;
  }
});

btnRecord.addEventListener('click', async () => {
  stopBrowserSpeech();
  avaAudioPlayer.pause();
  btnRetryGrade.classList.add('hidden');
  // Đánh thức server Render ngầm ngay lúc bắt đầu nói
  wakeUpServerInBackground();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = getBestAudioMimeType();
    practiceRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    practiceChunks = [];

    practiceRecorder.ondataavailable = e => { if (e.data.size > 0) practiceChunks.push(e.data); };
    practiceRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(practiceChunks, { type: mimeType || 'audio/webm' });
      userAudioPlayback.src = URL.createObjectURL(blob);
      userAudioPlayback.classList.remove('hidden');
      await submitPracticeAudio(blob);
    };

    practiceRecorder.start();
    btnRecord.disabled = true;
    btnStop.disabled = false;
    resultCard.classList.add('hidden');
    recordStatus.textContent = '🎙️ Đang ghi âm...';

    let sec = 0;
    timerEl.textContent = '00:00';
    practiceTimer = setInterval(() => {
      sec++;
      timerEl.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    }, 1000);
  } catch (err) {
    recordStatus.textContent = '❌ Không mở được Micro: ' + err.message;
  }
});

btnStop.addEventListener('click', () => {
  clearInterval(practiceTimer);
  if (practiceRecorder && practiceRecorder.state !== 'inactive') practiceRecorder.stop();
  btnRecord.disabled = false;
  btnStop.disabled = true;
  recordStatus.textContent = '⏳ Đang chấm điểm & lưu vào lịch sử ngày...';
});

btnRetryGrade.addEventListener('click', async () => {
  if (!lastPracticeBlob) return;
  btnRetryGrade.classList.add('hidden');
  recordStatus.textContent = '⏳ Đang gửi lại bài vừa thu để chấm điểm...';
  await submitPracticeAudio(lastPracticeBlob);
});

async function submitPracticeAudio(blob) {
  lastPracticeBlob = blob;
  btnRetryGrade.classList.add('hidden');

  for (let attempt = 1; attempt <= 2; attempt++) {
    const formData = new FormData();
    formData.append('audio', blob, 'answer.webm');
    formData.append('question', textInput.value);
    formData.append('mode', currentMode);
    formData.append('category', currentCategory);
    formData.append('title', currentTitle);

    try {
      const res = await fetch('/api/grade', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || json.error || `HTTP ${res.status}`);
      }
      renderPracticeResult(json.data);
      recordStatus.textContent = '🎉 Đã chấm xong và lưu vào Lịch sử hôm nay!';
      return;
    } catch (err) {
      const isNetworkDrop = err.name === 'TypeError' || String(err.message).includes('Failed to fetch');
      if (isNetworkDrop && attempt === 1) {
        recordStatus.textContent = '⏳ Server vừa tỉnh dậy hoặc mạng hơi chập chờn, đang tự gửi lại lần 2...';
        await new Promise(r => setTimeout(r, 3500));
        continue;
      }
      recordStatus.textContent = '❌ Lỗi: ' + err.message;
      btnRetryGrade.classList.remove('hidden');
      return;
    }
  }
}

function renderPracticeResult(data) {
  resultCard.classList.remove('hidden');
  document.getElementById('levelBadge').textContent = `Level: ${data.estimatedLevel}`;
  document.getElementById('transcriptText').textContent = data.transcript;
  document.getElementById('feedbackText').textContent = data.feedbackVi;
  lastSampleText = data.improvedSampleAnswer || '';
  document.getElementById('sampleAnswerText').textContent = lastSampleText;

  if (sampleAudioPlayer) sampleAudioPlayer.classList.add('hidden');
  if (sampleTtsStatus) sampleTtsStatus.textContent = '';

  const isReading = currentMode === 'reading';
  const labels = isReading ? SCORE_LABELS_READ : SCORE_LABELS_SPEAK;
  document.getElementById('correctionsTitle').textContent = isReading
    ? '🗣️ 3. Các từ cần sửa phát âm & trọng âm' : '✏️ 3. Chi tiết lỗi ngữ pháp & diễn đạt';
  document.getElementById('sampleTitle').textContent = isReading
    ? '📖 4. Gợi ý ngắt nhịp & nhấn trọng âm' : '🌟 4. Bài mẫu nâng cấp (Band IH / AL)';
  if (sampleExplainText) {
    sampleExplainText.textContent = isReading
      ? 'Ký hiệu "/" là chỗ ngắt hơi tự nhiên, chữ IN HOA là chỗ nhấn trọng âm câu để bạn luyện đọc theo.'
      : 'Đây là đoạn trả lời mẫu viết lại từ chính ý tưởng của bạn nhưng nâng cấp từ vựng & cấu trúc câu lên trình độ cao (IH/AL) để bạn học theo.';
  }

  document.getElementById('scoresGrid').innerHTML = Object.entries(data.scores || {}).map(([k, v]) => `
    <div class="score-item"><div class="score-val">${v}/10</div><div style="font-size:13px;color:#475569;">${labels[k] || k}</div></div>
  `).join('');

  const list = document.getElementById('correctionsList');
  list.innerHTML = (!data.grammarCorrections || data.grammarCorrections.length === 0)
    ? '<p class="result-text">Rất tốt! Không phát hiện lỗi đáng kể.</p>'
    : data.grammarCorrections.map(c => `
      <div class="correction">
        <div><strong>Bạn nói:</strong> <s>${escapeHtml(c.original)}</s></div>
        <div style="color:#15803d;"><strong>Chuẩn hơn:</strong> ${escapeHtml(c.corrected)}</div>
        <div style="font-size:13px;color:#475569;margin-top:4px;">💡 ${escapeHtml(c.explanationVi)}</div>
      </div>
    `).join('');
}

// ==================== VIEW 2: THI THỬ 12-15 CÂU ====================
const surveyStep = document.getElementById('surveyStep');
const examRoomStep = document.getElementById('examRoomStep');
const midTestStep = document.getElementById('midTestStep');
const examResultStep = document.getElementById('examResultStep');
const examAvaAudio = document.getElementById('examAvaAudio');
const avaExamAvatar = document.getElementById('avaExamAvatar');
const btnExamReplay = document.getElementById('btnExamReplay');
const btnExamShowText = document.getElementById('btnExamShowText');
const examQuestionTextBox = document.getElementById('examQuestionTextBox');
const btnExamRecord = document.getElementById('btnExamRecord');
const btnExamNext = document.getElementById('btnExamNext');
const examRecordStatus = document.getElementById('examRecordStatus');
const examTimerBadge = document.getElementById('examTimerBadge');

let examState = {
  sessionId: null,
  totalQuestions: 15,
  currentIndex: 0,
  currentQuestion: null,
  replayLeft: 1,
  audioBlobUrl: null,
  usingBrowserFallback: false,
  recorder: null,
  chunks: [],
  timer: null,
  activeStream: null
};

function showExamStep(stepEl) {
  [surveyStep, examRoomStep, midTestStep, examResultStep].forEach(el => el.classList.add('hidden'));
  stepEl.classList.remove('hidden');
}

function finishExamAvaSpeaking() {
  avaExamAvatar.classList.remove('speaking');
  document.getElementById('examAvaStatus').textContent = 'Ava đã hỏi xong. Mời bạn trả lời!';
  btnExamReplay.disabled = examState.replayLeft <= 0;
  btnExamRecord.disabled = false;
  examRecordStatus.textContent = '👉 Bấm "Bắt đầu trả lời" để thu âm.';
}

document.getElementById('btnStartMockExam').addEventListener('click', async () => {
  const checkedTopics = Array.from(document.querySelectorAll('#surveyTopicsGrid input:checked')).map(i => i.value);
  const surveyError = document.getElementById('surveyError');
  if (checkedTopics.length < 3) {
    surveyError.textContent = '⚠️ Vui lòng chọn tối thiểu 3 chủ đề để đề thi chuẩn OPIc!';
    return;
  }
  surveyError.textContent = '';

  const selfLevel = document.querySelector('input[name="selfLevel"]:checked')?.value || '4';
  const btn = document.getElementById('btnStartMockExam');
  btn.disabled = true;
  btn.textContent = '⏳ Đang khởi tạo phòng thi...';

  try {
    const res = await fetch('/api/exam/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selfAssessmentLevel: Number(selfLevel),
        backgroundSurvey: {
          job: document.getElementById('surveyJob').value,
          home: document.getElementById('surveyHome').value,
          topics: checkedTopics
        }
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    examState.sessionId = json.data.sessionId;
    examState.totalQuestions = json.data.totalQuestions;
    showExamStep(examRoomStep);
    await loadExamQuestion(json.data.currentIndex, json.data.question);
  } catch (err) {
    surveyError.textContent = '❌ Lỗi: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Bắt đầu thi thử cùng Ava';
  }
});

async function loadExamQuestion(index, questionObj) {
  stopBrowserSpeech();
  examState.currentIndex = index;
  examState.currentQuestion = questionObj;
  examState.replayLeft = 1;
  examState.usingBrowserFallback = false;

  document.getElementById('examProgressLabel').textContent = `Câu ${index + 1} / ${examState.totalQuestions}`;
  document.getElementById('examProgressBar').style.width = `${((index + 1) / examState.totalQuestions) * 100}%`;

  examQuestionTextBox.textContent = questionObj.question;
  examQuestionTextBox.classList.add('hidden');
  btnExamReplay.disabled = true;
  btnExamReplay.textContent = '🔁 Nghe lại (Còn 1 lần)';
  btnExamRecord.disabled = true;
  btnExamNext.disabled = true;
  examTimerBadge.textContent = '00:00';
  examRecordStatus.textContent = '🎧 Hãy nghe kỹ câu hỏi từ giám khảo Ava...';
  document.getElementById('examAvaStatus').textContent = 'Đang tải giọng Ava...';

  try {
    const blob = await fetchAvaAudioBlob(questionObj.question, 'en-US-AvaMultilingualNeural', '0%');
    if (examState.audioBlobUrl) URL.revokeObjectURL(examState.audioBlobUrl);
    examState.audioBlobUrl = URL.createObjectURL(blob);
    examAvaAudio.src = examState.audioBlobUrl;

    avaExamAvatar.classList.add('speaking');
    document.getElementById('examAvaStatus').textContent = 'Ava đang đặt câu hỏi...';
    await examAvaAudio.play();
  } catch {
    examState.usingBrowserFallback = true;
    avaExamAvatar.classList.add('speaking');
    document.getElementById('examAvaStatus').textContent = '⚠️ Dùng giọng dự phòng trên máy để đọc câu hỏi...';
    const ok = speakWithBrowserFallback(questionObj.question, '0%', finishExamAvaSpeaking);
    if (!ok) finishExamAvaSpeaking();
  }
}

examAvaAudio.onended = finishExamAvaSpeaking;

btnExamReplay.addEventListener('click', async () => {
  if (examState.replayLeft <= 0) return;
  examState.replayLeft -= 1;
  btnExamReplay.disabled = true;
  btnExamReplay.textContent = '🔁 Đã hết lượt nghe lại';
  avaExamAvatar.classList.add('speaking');

  if (examState.usingBrowserFallback || !examState.audioBlobUrl) {
    speakWithBrowserFallback(examState.currentQuestion.question, '0%', finishExamAvaSpeaking);
  } else {
    examAvaAudio.currentTime = 0;
    await examAvaAudio.play();
  }
});

btnExamShowText.addEventListener('click', () => examQuestionTextBox.classList.toggle('hidden'));

btnExamRecord.addEventListener('click', async () => {
  stopBrowserSpeech();
  examAvaAudio.pause();
  wakeUpServerInBackground();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    examState.activeStream = stream;
    const mimeType = getBestAudioMimeType();
    examState.recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    examState.chunks = [];

    examState.recorder.ondataavailable = e => { if (e.data.size > 0) examState.chunks.push(e.data); };
    examState.recorder.start();

    btnExamRecord.disabled = true;
    btnExamNext.disabled = false;
    btnExamNext.textContent = (examState.currentIndex + 1 === examState.totalQuestions)
      ? '🏁 Nộp bài & Xem điểm tổng kết'
      : '⏭️ Nộp & Sang câu tiếp';
    examRecordStatus.textContent = '🔴 Đang ghi âm câu trả lời... (Nên nói 45 - 90 giây)';

    let sec = 0;
    examTimerBadge.textContent = '00:00';
    examState.timer = setInterval(() => {
      sec++;
      examTimerBadge.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    }, 1000);
  } catch (err) {
    examRecordStatus.textContent = '❌ Lỗi Micro: ' + err.message;
  }
});

function stopExamRecordingAndGetBlob() {
  return new Promise(resolve => {
    clearInterval(examState.timer);
    if (!examState.recorder || examState.recorder.state === 'inactive') {
      resolve(null);
      return;
    }
    examState.recorder.onstop = () => {
      if (examState.activeStream) examState.activeStream.getTracks().forEach(t => t.stop());
      const blob = new Blob(examState.chunks, { type: getBestAudioMimeType() || 'audio/webm' });
      resolve(blob);
    };
    examState.recorder.stop();
  });
}

btnExamNext.addEventListener('click', async () => {
  btnExamNext.disabled = true;
  btnExamRecord.disabled = true;
  examAvaAudio.pause();
  stopBrowserSpeech();

  const audioBlob = await stopExamRecordingAndGetBlob();
  const formData = new FormData();
  formData.append('questionIndex', examState.currentIndex);
  if (audioBlob) formData.append('audio', audioBlob, `q${examState.currentIndex + 1}.webm`);

  await fetch(`/api/exam/${examState.sessionId}/answer`, { method: 'POST', body: formData });

  const nextIdx = examState.currentIndex + 1;

  if (nextIdx === 7) {
    showExamStep(midTestStep);
    return;
  }

  if (nextIdx >= examState.totalQuestions) {
    await finalizeMockExam();
    return;
  }

  const res = await fetch(`/api/exam/${examState.sessionId}/question/${nextIdx}`);
  const json = await res.json();
  await loadExamQuestion(nextIdx, json.data.question);
});

document.querySelectorAll('#midTestStep button[data-adjust]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const adjustment = btn.dataset.adjust;
    const res = await fetch(`/api/exam/${examState.sessionId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment })
    });
    const json = await res.json();
    examState.totalQuestions = json.data.totalQuestions;
    showExamStep(examRoomStep);
    await loadExamQuestion(json.data.nextIndex, json.data.question);
  });
});

async function finalizeMockExam() {
  examRecordStatus.textContent = '⏳ Đang hoàn tất chấm những câu cuối & tổng hợp báo cáo chuẩn ACTFL (chờ 10-15 giây)...';
  try {
    const res = await fetch(`/api/exam/${examState.sessionId}/finish`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    renderFinalExamReport(json.data);
    showExamStep(examResultStep);
  } catch (err) {
    examRecordStatus.textContent = '❌ Lỗi tổng kết: ' + err.message;
  }
}

function renderFinalExamReport(record) {
  const report = record.report || {};
  document.getElementById('finalExamLevelBadge').textContent = `Band chính thức dự kiến: ${report.finalLevel}`;
  document.getElementById('finalOverallFeedback').textContent = report.overallFeedbackVi || '';
  document.getElementById('finalStrengths').textContent = report.strengthsVi || '';
  document.getElementById('finalWeaknesses').textContent = report.weaknessesVi || '';
  document.getElementById('finalStudyPlan').textContent = report.studyPlanVi || '';

  document.getElementById('finalExamScoresGrid').innerHTML = Object.entries(report.averageScores || {}).map(([k, v]) => `
    <div class="score-item"><div class="score-val">${v}/10</div><div style="font-size:13px;color:#475569;">${SCORE_LABELS_SPEAK[k] || k}</div></div>
  `).join('');

  document.getElementById('finalExamBreakdown').innerHTML = (record.questionResults || []).map(item => `
    <details class="q-detail">
      <summary>Câu ${item.questionNumber}: ${escapeHtml(item.title)} — ${item.skipped ? '⚪ Bỏ qua' : `🏷️ ${escapeHtml(item.grading?.estimatedLevel)}`}</summary>
      <p style="font-size:13px;color:#475569;"><strong>Câu hỏi:</strong> ${escapeHtml(item.question)}</p>
      ${item.skipped ? '<p>Không có dữ liệu giọng nói.</p>' : `
        <p><strong>Transcript:</strong> ${escapeHtml(item.grading?.transcript)}</p>
        <p><strong>Nhận xét:</strong> ${escapeHtml(item.grading?.feedbackVi)}</p>
        <p style="color:#15803d;"><strong>Gợi ý nâng cấp:</strong> ${escapeHtml(item.grading?.improvedSampleAnswer)}</p>
      `}
    </details>
  `).join('');
}

document.getElementById('btnExamAbort').addEventListener('click', () => {
  stopExamRecordingAndGetBlob();
  examAvaAudio.pause();
  stopBrowserSpeech();
  showExamStep(surveyStep);
});
document.getElementById('btnNewMockExam').addEventListener('click', () => showExamStep(surveyStep));

// ==================== VIEW 3: LỊCH SỬ & ĐIỂM THEO NGÀY ====================
document.getElementById('btnRefreshHistory').addEventListener('click', loadHistory);
document.getElementById('btnCloseHistoryDetail').addEventListener('click', () => {
  document.getElementById('historyDetailCard').classList.add('hidden');
});

async function loadHistory() {
  const container = document.getElementById('historyDaysContainer');
  const summaryGrid = document.getElementById('historySummaryGrid');
  container.innerHTML = '<p>⏳ Đang tải lịch sử...</p>';

  try {
    const res = await fetch('/api/history');
    const json = await res.json();
    const { summary, days } = json.data;

    summaryGrid.innerHTML = `
      <div class="score-item"><div class="score-val">${summary.totalRecords}</div><div style="font-size:13px;color:#475569;">Tổng bài đã luyện</div></div>
      <div class="score-item"><div class="score-val">${summary.mockExamsCount}</div><div style="font-size:13px;color:#475569;">Bài thi 12-15 câu</div></div>
      <div class="score-item"><div class="score-val">${summary.totalStudyDays}</div><div style="font-size:13px;color:#475569;">Số ngày chăm chỉ</div></div>
      <div class="score-item"><div class="score-val">${summary.overallAverageScore}/10</div><div style="font-size:13px;color:#475569;">Điểm TB tích lũy</div></div>
      <div class="score-item"><div class="score-val">${escapeHtml(summary.latestLevel)}</div><div style="font-size:13px;color:#475569;">Band gần nhất</div></div>
    `;

    if (!days || days.length === 0) {
      container.innerHTML = '<p style="color:#64748b;">Chưa có bài nào được lưu. Hãy luyện nói hoặc thi thử 1 bài nhé!</p>';
      return;
    }

    container.innerHTML = days.map(day => `
      <div class="day-header">
        <span>📆 Ngày ${escapeHtml(day.date)}</span>
        <span>${day.count} bài đã hoàn thành</span>
      </div>
      ${day.items.map(item => {
        const tagClass = item.type === 'mock_exam' ? 'tag-mock' : item.type === 'single_reading' ? 'tag-read' : 'tag-speak';
        const tagText = item.type === 'mock_exam' ? 'Thi thử OPIc' : item.type === 'single_reading' ? 'Đọc mẫu' : 'Luyện nói';
        const timeStr = new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="history-item">
            <div style="flex:1;min-width:220px;">
              <span class="tag-type ${tagClass}">${tagText}</span>
              <strong style="margin-left:6px;">${escapeHtml(item.title)}</strong>
              <div style="font-size:12px;color:#64748b;margin-top:4px;">🕒 ${timeStr} • Điểm TB: <strong>${item.averageScore}/10</strong></div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="badge" style="font-size:13px;padding:4px 10px;">${escapeHtml(item.estimatedLevel)}</span>
              <button class="btn-secondary" onclick="viewHistoryDetail('${item.id}')" style="padding:6px 12px;font-size:13px;">Xem</button>
              <button class="btn-danger-outline" onclick="deleteHistory('${item.id}')">Xóa</button>
            </div>
          </div>
        `;
      }).join('')}
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:#dc2626;">❌ Lỗi tải lịch sử: ${escapeHtml(err.message)}</p>`;
  }
}

window.viewHistoryDetail = async function (id) {
  const card = document.getElementById('historyDetailCard');
  const body = document.getElementById('historyDetailBody');
  const res = await fetch(`/api/history/${id}`);
  const json = await res.json();
  const item = json.data;

  document.getElementById('historyDetailTitle').textContent = `${item.title} (${item.date})`;
  if (item.type === 'mock_exam') {
    body.innerHTML = `
      <p><strong>Band tổng kết:</strong> <span class="badge">${escapeHtml(item.estimatedLevel)}</span></p>
      <p><strong>Nhận xét tổng thể:</strong> ${escapeHtml(item.report?.overallFeedbackVi)}</p>
      <p><strong>Lộ trình đề xuất:</strong> ${escapeHtml(item.report?.studyPlanVi)}</p>
      ${(item.questionResults || []).map(q => `
        <details class="q-detail">
          <summary>Câu ${q.questionNumber}: ${escapeHtml(q.title)} — ${q.skipped ? 'Bỏ qua' : escapeHtml(q.grading?.estimatedLevel)}</summary>
          <p><strong>Transcript:</strong> ${escapeHtml(q.grading?.transcript || '(Không có)')}</p>
          <p><strong>Nhận xét:</strong> ${escapeHtml(q.grading?.feedbackVi || '')}</p>
        </details>
      `).join('')}
    `;
  } else {
    const r = item.result || {};
    body.innerHTML = `
      <p><strong>Band:</strong> <span class="badge">${escapeHtml(item.estimatedLevel)}</span> • <strong>Điểm TB:</strong> ${item.averageScore}/10</p>
      <p><strong>Câu hỏi / Văn bản:</strong> ${escapeHtml(item.question)}</p>
      <p><strong>Transcript:</strong> ${escapeHtml(r.transcript)}</p>
      <p><strong>Nhận xét:</strong> ${escapeHtml(r.feedbackVi)}</p>
      <div class="sample-box"><strong>Bài mẫu:</strong><br>${escapeHtml(r.improvedSampleAnswer)}</div>
    `;
  }
  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth' });
};

window.deleteHistory = async function (id) {
  if (!confirm('Bạn có chắc muốn xóa bài này khỏi lịch sử?')) return;
  await fetch(`/api/history/${id}`, { method: 'DELETE' });
  document.getElementById('historyDetailCard').classList.add('hidden');
  await loadHistory();
};

initAuthAndApp();