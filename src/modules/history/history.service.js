import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.resolve("data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

async function ensureHistoryFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, "[]", "utf-8");
  }
}

async function readAllHistory() {
  await ensureHistoryFile();
  const raw = await fs.readFile(HISTORY_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAllHistory(items) {
  await ensureHistoryFile();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(items, null, 2), "utf-8");
}

function getLocalDateKey(date = new Date()) {
  // Lấy ngày YYYY-MM-DD theo múi giờ Việt Nam (+07:00)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Lưu một bản ghi mới (luyện từng câu hoặc thi thử 12-15 câu)
 */
export async function saveHistoryEntry(entry) {
  const list = await readAllHistory();
  const now = new Date();

  const newRecord = {
    id: crypto.randomUUID(),
    date: getLocalDateKey(now),
    createdAt: now.toISOString(),
    ...entry,
  };

  list.unshift(newRecord);
  await writeAllHistory(list);
  return newRecord;
}

/**
 * Lấy danh sách lịch sử gom theo từng ngày + thống kê tổng quan
 */
export async function getHistoryGroupedByDate() {
  const list = await readAllHistory();

  const groupedMap = new Map();
  let totalScoreSum = 0;
  let totalScoredItems = 0;

  for (const item of list) {
    const dateKey = item.date || getLocalDateKey(new Date(item.createdAt));
    if (!groupedMap.has(dateKey)) {
      groupedMap.set(dateKey, {
        date: dateKey,
        count: 0,
        items: [],
      });
    }
    const group = groupedMap.get(dateKey);
    group.items.push(item);
    group.count += 1;

    if (item.averageScore && item.averageScore > 0) {
      totalScoreSum += item.averageScore;
      totalScoredItems += 1;
    }
  }

  const latestMockExam = list.find((i) => i.type === "mock_exam");
  const latestAny = list[0] || null;

  return {
    summary: {
      totalRecords: list.length,
      totalStudyDays: groupedMap.size,
      mockExamsCount: list.filter((i) => i.type === "mock_exam").length,
      overallAverageScore:
        totalScoredItems > 0
          ? Number((totalScoreSum / totalScoredItems).toFixed(1))
          : 0,
      latestLevel:
        latestMockExam?.estimatedLevel || latestAny?.estimatedLevel || "--",
    },
    days: Array.from(groupedMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  };
}

export async function getHistoryById(id) {
  const list = await readAllHistory();
  return list.find((item) => item.id === id) || null;
}

export async function deleteHistoryById(id) {
  const list = await readAllHistory();
  const nextList = list.filter((item) => item.id !== id);
  if (nextList.length === list.length) return false;
  await writeAllHistory(nextList);
  return true;
}
