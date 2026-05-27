import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4174;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "data.json");
const distDir = path.join(rootDir, "dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function makeId() {
  return `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeDemoData() {
  return {
    users: [
      { username: "admin", password: "admin", displayName: "Administrator", isAdmin: true },
      { username: "agent", password: "agent", displayName: "Agent KITE", isAdmin: false },
    ],
    files: [
      {
        id: makeId(),
        title: "BRIEFING.TXT",
        owner: "all",
        classification: "GREEN",
        content:
          "OPERATION: LAST LIGHT\nLocation: rural Pennsylvania, 1998.\nThree disappearances, one impossible phone call, and a federal evidence room logged open at 03:17.",
      },
      {
        id: makeId(),
        title: "AUDIO_TAPE_041.LOG",
        owner: "admin",
        classification: "BLACK",
        content:
          "Transcript fragment:\n[00:03] Static.\n[00:08] A child says the agent's full legal name.\n[00:11] Recording ends before the tape does.",
      },
      {
        id: makeId(),
        title: "MOTEL_RECEIPT.DOC",
        owner: "agent",
        classification: "AMBER",
        content:
          "Room 12 paid cash. Guest signed as R. Wake.\nClerk insists the guest left before checking in.",
      },
    ],
    messages: [
      {
        id: makeId(),
        from: "admin",
        to: "agent",
        subject: "keep this offline",
        body: "Use this terminal only for in-session material. Anything marked BLACK goes to the handler first.",
        sentAt: new Date().toISOString(),
        attachments: [],
      },
      {
        id: makeId(),
        from: "agent",
        to: "admin",
        subject: "autopsy discrepancy",
        body: "The coroner report has been altered. Original note mentions a green triangular mark under the tongue.",
        sentAt: new Date().toISOString(),
        attachments: [],
      },
    ],
  };
}

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });

  if (!existsSync(dataFile)) {
    await writeFile(dataFile, JSON.stringify(makeDemoData(), null, 2), "utf8");
  }
}

async function readData() {
  await ensureDataFile();
  const rawData = await readFile(dataFile, "utf8");
  const data = JSON.parse(rawData);
  return { ...data, messages: data.messages || [] };
}

async function saveData(data) {
  await ensureDataFile();
  await writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(body));
}

async function handleApi(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.url === "/api/data" && request.method === "GET") {
    sendJson(response, 200, await readData());
    return;
  }

  if (request.url === "/api/data" && request.method === "PUT") {
    const body = await readRequestBody(request);
    const data = JSON.parse(body);
    await saveData(data);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function handleStatic(request, response) {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestedPath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.resolve(distDir, requestedPath);

  if (!filePath.startsWith(distDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Build the frontend first with npm run build.");
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.url.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }

    await handleStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Delta Green backend running at http://127.0.0.1:${PORT}`);
});
