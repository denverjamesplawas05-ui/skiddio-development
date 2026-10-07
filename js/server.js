const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DB_FILE = path.join(ROOT, "database.json");
const sessions = new Map();
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};


function readDatabase() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDatabase(data) {
  const temporaryFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temporaryFile, DB_FILE);
}

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(new Error("Invalid JSON request.")); }
    });
    request.on("error", reject);
  });
}

function currentUserId(request) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)skiddio_session=([^;]+)/);
  return match ? sessions.get(decodeURIComponent(match[1])) : undefined;
}

function passwordHash(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 310000, 32, "sha256").toString("hex");
}

function createSession(response, userId, email, status = 200) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, userId);
  sendJson(response, status, { email }, {
    "Set-Cookie": `skiddio_session=${token}; HttpOnly; SameSite=Strict; Path=/`
  });
}

async function handleApi(request, response, url) {
  if (request.method === "POST" && ["/api/login", "/api/register"].includes(url.pathname)) {
    const { email: rawEmail, password } = await readBody(request);
    const email = String(rawEmail || "").trim().toLowerCase();
    if (!email || !password) return sendJson(response, 400, { error: "Enter your email and password." });
    const data = readDatabase();
    const existing = data.users.find(user => user.email === email);

    if (url.pathname === "/api/register") {
      if (String(password).length < 6) return sendJson(response, 400, { error: "Password must be at least 6 characters." });
      if (existing) return sendJson(response, 409, { error: "An account with this email already exists." });
      const salt = crypto.randomBytes(16).toString("hex");
      const user = { id: crypto.randomUUID(), email, passwordSalt: salt, passwordHash: passwordHash(String(password), salt) };
      data.users.push(user);
      writeDatabase(data);
      return createSession(response, user.id, user.email);
    }

    if (!existing || passwordHash(String(password), existing.passwordSalt) !== existing.passwordHash) {
      return sendJson(response, 401, { error: "Incorrect email or password." });
    }
    return createSession(response, existing.id, existing.email);
  }

  if (request.method === "POST" && url.pathname === "/api/logout") {
    const cookie = request.headers.cookie || "";
    const match = cookie.match(/(?:^|;\s*)skiddio_session=([^;]+)/);
    if (match) sessions.delete(decodeURIComponent(match[1]));
    return sendJson(response, 200, { ok: true }, {
      "Set-Cookie": "skiddio_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
    });
  }

  const userId = currentUserId(request);
  if (!userId) return sendJson(response, 401, { error: "Please sign in again." });
  const data = readDatabase();

  if (request.method === "GET" && url.pathname === "/api/tasks") {
    return sendJson(response, 200, { tasks: data.tasks.filter(task => task.userId === userId) });
  }

  if (request.method === "POST" && url.pathname === "/api/tasks") {
    const input = await readBody(request);
    const task = {
      id: crypto.randomUUID(), userId, title: String(input.title || "").trim(),
      startTime: String(input.startTime || ""), endTime: String(input.endTime || ""),
      completed: false, isRescheduled: false, rescheduleReason: null
    };
    if (!task.title || !task.startTime || !task.endTime) return sendJson(response, 400, { error: "Complete all task fields." });
    data.tasks.push(task);
    writeDatabase(data);
    return sendJson(response, 201, { id: task.id });
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && request.method === "POST") {
    const input = await readBody(request);
    const task = data.tasks.find(item => item.id === taskMatch[1] && item.userId === userId);
    if (!task) return sendJson(response, 404, { error: "Task not found." });
    Object.assign(task, {
      title: String(input.title || task.title),
      startTime: String(input.startTime || task.startTime),
      endTime: String(input.endTime || task.endTime),
      completed: Boolean(input.completed),
      isRescheduled: Boolean(input.isRescheduled),
      rescheduleReason: input.rescheduleReason || null
    });
    writeDatabase(data);
    return sendJson(response, 200, { ok: true });
  }

  sendJson(response, 404, { error: "Not found." });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const origin = request.headers.origin || "";
    if (/^http:\/\/(127\.0\.0\.1|localhost):5500$/.test(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
      response.setHeader("Vary", "Origin");
      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600"
        });
        return response.end();
      }
    }
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return sendJson(response, 405, { error: "Method not allowed." });
    }
    const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.resolve(ROOT, `.${requestedPath}`);
    if (!filePath.startsWith(`${ROOT}${path.sep}`) && filePath !== path.join(ROOT, "index.html")) {
      return sendJson(response, 404, { error: "Not found." });
    }
    if (path.basename(filePath) === "database.json") return sendJson(response, 404, { error: "Not found." });
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return sendJson(response, 404, { error: "Not found." });
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    if (request.method === "HEAD") return response.end();
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
});

server.listen(8000, "127.0.0.1", () => {
  console.log("Skiddio is running at http://127.0.0.1:8000");
});
