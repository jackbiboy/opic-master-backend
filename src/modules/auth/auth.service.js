import crypto from "node:crypto";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // Nhớ đăng nhập 30 ngày
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // Nhập sai 5 lần -> khóa tạm 5 phút

const failedAttempts = new Map();

export function getConfiguredPin() {
  return (process.env.APP_PIN || "").trim();
}

export function isPinEnabled() {
  return getConfiguredPin().length > 0;
}

function getSigningSecret() {
  const pin = getConfiguredPin();
  const baseSecret =
    process.env.AUTH_SECRET ||
    process.env.GEMINI_API_KEY ||
    "opic_local_secret";
  // Đưa PIN vào khóa ký -> nếu đổi APP_PIN trên Render thì mọi token cũ tự động vô hiệu
  return crypto.createHash("sha256").update(`${baseSecret}::${pin}`).digest();
}

function safeEqualStrings(a, b) {
  const hashA = crypto.createHash("sha256").update(String(a)).digest();
  const hashB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function verifyPinWithRateLimit(inputPin, clientKey = "global") {
  const configuredPin = getConfiguredPin();
  if (!configuredPin) {
    return { ok: true, token: null };
  }

  const now = Date.now();
  const record = failedAttempts.get(clientKey);
  if (record && record.lockedUntil > now) {
    const waitSec = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      ok: false,
      status: 429,
      message: `Nhập sai quá ${MAX_ATTEMPTS} lần. Vui lòng thử lại sau ${waitSec} giây.`,
    };
  }

  if (safeEqualStrings(String(inputPin || "").trim(), configuredPin)) {
    failedAttempts.delete(clientKey);
    return { ok: true, token: createAuthToken() };
  }

  const nextCount =
    (record && record.lockedUntil <= now ? 0 : record?.count || 0) + 1;
  if (nextCount >= MAX_ATTEMPTS) {
    failedAttempts.set(clientKey, {
      count: nextCount,
      lockedUntil: now + LOCK_DURATION_MS,
    });
    return {
      ok: false,
      status: 429,
      message: `Bạn đã nhập sai ${MAX_ATTEMPTS} lần. Tạm khóa 5 phút để bảo mật.`,
    };
  }

  failedAttempts.set(clientKey, { count: nextCount, lockedUntil: 0 });
  return {
    ok: false,
    status: 401,
    message: `Mật khẩu / Mã PIN không đúng (còn ${MAX_ATTEMPTS - nextCount} lần thử).`,
  };
}

export function createAuthToken() {
  const payload = {
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!isPinEnabled()) return true;
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [encodedPayload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");

  const sigBufA = Buffer.from(signature);
  const sigBufB = Buffer.from(expectedSig);
  if (
    sigBufA.length !== sigBufB.length ||
    !crypto.timingSafeEqual(sigBufA, sigBufB)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8"),
    );
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Middleware Express bảo vệ toàn bộ các API học tập & lịch sử
 */
export function requirePinAuth(req, res, next) {
  if (!isPinEnabled()) return next();

  const token = extractBearerToken(req);
  if (!verifyAuthToken(token)) {
    return res.status(401).json({
      status: "unauthorized",
      error: "Phiên đăng nhập hết hạn hoặc chưa nhập mã PIN.",
    });
  }
  next();
}
