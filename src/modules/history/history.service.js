import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const DATA_DIR = path.resolve("data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

let historyCollection = null;
let connectPromise = null;

async function getMongoCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (historyCollection) return historyCollection;

  if (!connectPromise) {
    connectPromise = (async () => {
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db(process.env.MONGODB_DB_NAME || "opic_master");
      const col = db.collection("history");
      await col.createIndex({ createdAt: -1 });
      await col.createIndex({ id: 1 }, { unique: true });
      historyCollection = col;
      console.log("Da ket noi MongoDB Atlas thanh cong!");
      return col;
    })().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }

  return connectPromise;
}

async function ensureHistoryFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, "[]", "utf-8");
  }
}

async function readLocalHistory() {
  await ensureHistoryFile();
  const raw = await fs.readFile(HISTORY_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalHistory(items) {
  await ensureHistoryFile();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(items, null, 2), "utf-8");
}

function getLocalDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Lưu một bản ghi mới (ưu tiên MongoDB Atlas, fallback về file JSON nếu chưa cấu hình URI)
 */
export async function saveHistoryEntry(entry) {
  const now = new Date();
  const newRecord = {
    id: crypto.randomUUID(),
    date: getLocalDateKey(now),
    createdAt: now.toISOString(),
    ...entry,
  };

  const col = await getMongoCollection();
  if (col) {
    await col.insertOne({ ...newRecord });
    return newRecord;
  }

  const list = await readLocalHistory();
  list.unshift(newRecord);
  await writeLocalHistory(list);
  return newRecord;
}

/**
 * Lấy danh sách lịch sử gom theo từng ngày + thống kê tổng quan
 */
export async function getHistoryGroupedByDate() {
  const col = await getMongoCollection();
  const list = col
    ? await col
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray()
    : await readLocalHistory();

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
  const col = await getMongoCollection();
  if (col) {
    return await col.findOne({ id }, { projection: { _id: 0 } });
  }
  const list = await readLocalHistory();
  return list.find((item) => item.id === id) || null;
}

export async function deleteHistoryById(id) {
  const col = await getMongoCollection();
  if (col) {
    const res = await col.deleteOne({ id });
    return res.deletedCount > 0;
  }
  const list = await readLocalHistory();
  const nextList = list.filter((item) => item.id !== id);
  if (nextList.length === list.length) return false;
  await writeLocalHistory(nextList);
  return true;
}
