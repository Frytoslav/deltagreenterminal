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
const liveClients = new Map();

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

function makeImageAttachment(name, title, lines) {
  const textLines = lines
    .map((line, index) => `<text x="28" y="${92 + index * 24}" fill="#8df09a" font-size="14">${line}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#050706"/><rect x="18" y="18" width="604" height="364" fill="none" stroke="#5bc266" stroke-width="3"/><text x="28" y="54" fill="#5bc266" font-family="monospace" font-size="24" font-weight="bold">${title}</text><line x1="28" y1="68" x2="590" y2="68" stroke="#5bc266" stroke-width="2"/><g font-family="monospace">${textLines}</g><path d="M110 272 C210 238 356 238 512 270 L532 290 L94 290 Z" fill="none" stroke="#5bc266" stroke-width="4"/><circle cx="468" cy="258" r="6" fill="#5bc266"/><text x="28" y="354" fill="#2f7a39" font-family="monospace" font-size="18">DELTA GREEN // ATLANTIC STORM</text></svg>`;

  return {
    id: makeId(),
    name,
    type: "image/svg+xml",
    size: svg.length,
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  };
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
      {
        id: makeId(),
        from: "admin",
        to: "agent",
        subject: "ATLANTIC STORM // initial tasking",
        body:
          "You are being attached to a naval interdiction package under a temporary cover assignment. Public story: communications failure aboard a Soviet submarine in the North Atlantic. Actual concern: the boat has gone silent after transmitting impossible telemetry. Read nothing into the operation name. Travel light.",
        sentAt: new Date().toISOString(),
        attachments: [
          makeImageAttachment("atlantic-storm-tasking.svg", "TASKING SUMMARY", [
            "PACKAGE: SEAL boarding element",
            "TARGET: Soviet nuclear submarine",
            "STATUS: adrift / intermittent acoustic contact",
            "NOTE: science team references are to be ignored",
          ]),
        ],
      },
      {
        id: makeId(),
        from: "admin",
        to: "agent",
        subject: "NAVINT fragment // do not forward",
        body:
          "NAVINT recovered a partial hydrophone trace. The contact changes depth faster than the hull should tolerate. One analyst logged the acoustic profile as 'biological machinery' and was removed from the watch floor. Treat the attached contact sheet as compartmented.",
        sentAt: new Date().toISOString(),
        attachments: [
          makeImageAttachment("hydrophone-contact-sheet.svg", "HYDROPHONE CONTACT", [
            "0217Z: cavitation begins below crush estimates",
            "0221Z: reactor noise drops to zero",
            "0222Z: hull returns six overlapping echoes",
            "0224Z: operator reports voices in carrier wave",
          ]),
        ],
      },
      {
        id: makeId(),
        from: "agent",
        to: "admin",
        subject: "Embarkation question",
        body:
          "Confirming: the SEAL team believes this is a recovery or denial job, not a rescue. The briefing packet mentions a Soviet research module welded aft of the sail. That modification does not appear in any Jane's profile I can access. If this is another Program science cleanup, say so now.",
        sentAt: new Date().toISOString(),
        attachments: [
          makeImageAttachment("submarine-profile-note.svg", "PROFILE NOTE", [
            "Sail shape: Akula-adjacent, not exact",
            "Aft module: undocumented external pressure section",
            "Markings: painted over, still visible under salt",
            "Recommendation: photograph before breach",
          ]),
        ],
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
  const demoMessages = makeDemoData().messages;
  const messages = addMissingDemoMessages(data.messages || [], demoMessages);
  const nextData = { ...data, messages };

  if (messages.length !== (data.messages || []).length) {
    await saveData(nextData);
  }

  return nextData;
}

function addMissingDemoMessages(messages, demoMessages) {
  const existingKeys = new Set(messages.map((message) => `${message.subject}:${message.to}`));
  const missingMessages = demoMessages.filter((message) => !existingKeys.has(`${message.subject}:${message.to}`));
  return [...messages, ...missingMessages];
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

function addLiveClient(username, response) {
  if (!liveClients.has(username)) {
    liveClients.set(username, new Set());
  }

  liveClients.get(username).add(response);
}

function removeLiveClient(username, response) {
  liveClients.get(username)?.delete(response);

  if (!liveClients.get(username)?.size) {
    liveClients.delete(username);
  }
}

function sendLiveEvent(username, eventName, payload) {
  const clients = liveClients.get(username);
  if (!clients) return;

  const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((client) => client.write(message));
}

function broadcastNewMessages(oldData, newData) {
  const existingIds = new Set((oldData.messages || []).map((message) => message.id));
  const adminUsers = newData.users.filter((user) => user.isAdmin).map((user) => user.username);
  const newMessages = (newData.messages || []).filter((message) => !existingIds.has(message.id));

  newMessages.forEach((message) => {
    const recipients = new Set([message.to, ...adminUsers]);
    recipients.forEach((recipient) => sendLiveEvent(recipient, "message", message));
  });
}

function handleLiveEvents(request, response) {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const username = url.searchParams.get("user");

  if (!username) {
    sendJson(response, 400, { error: "Missing user" });
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  response.write("event: ready\ndata: {}\n\n");

  addLiveClient(username, response);
  request.on("close", () => removeLiveClient(username, response));
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
    const oldData = await readData();
    const body = await readRequestBody(request);
    const data = JSON.parse(body);
    await saveData(data);
    broadcastNewMessages(oldData, data);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.url.startsWith("/api/events") && request.method === "GET") {
    handleLiveEvents(request, response);
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
