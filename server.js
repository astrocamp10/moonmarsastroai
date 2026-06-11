"use strict";

const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const rootDir = __dirname;
const archiveDir = path.join(rootDir, "archives");
const archiveIndexPath = path.join(archiveDir, "index.json");
const port = Number(process.env.PORT || 4173);
const maxBodyBytes = 18 * 1024 * 1024;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".md": "text/markdown; charset=utf-8",
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  res.end(text);
}

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBodyBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

async function ensureArchiveDir() {
  await fsp.mkdir(archiveDir, { recursive: true });
}

async function readArchiveIndex() {
  try {
    const raw = await fsp.readFile(archiveIndexPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}

async function writeArchiveIndex(records) {
  await ensureArchiveDir();
  const sorted = [...records].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  await fsp.writeFile(archiveIndexPath, JSON.stringify({ records: sorted }, null, 2), "utf8");
}

function safeFileName(value, fallback) {
  const base = path.basename(String(value || fallback));
  return base.replace(/[\\/:*?"<>|]/g, "").trim() || fallback;
}

function publicArchiveUrl(fileName) {
  return `archives/${encodeURIComponent(fileName)}`;
}

function stripDataUrl(base64) {
  return String(base64 || "").replace(/^data:[^,]+,/, "");
}

async function saveArchive(req, res) {
  const payload = await readRequestJson(req);
  const record = payload.record || {};
  if (!record.id) {
    sendJson(res, 400, { error: "Missing archive id." });
    return;
  }

  await ensureArchiveDir();

  const markdownName = safeFileName(record.markdownName, `${record.id}.md`);
  const imageName = safeFileName(record.imageName, `${record.id}.jpg`);
  const markdown = String(payload.markdown || record.markdown || "");
  const imageBase64 = stripDataUrl(payload.imageBase64 || record.imageBase64 || "");

  if (markdown) {
    await fsp.writeFile(path.join(archiveDir, markdownName), markdown, "utf8");
  }

  if (imageBase64) {
    await fsp.writeFile(path.join(archiveDir, imageName), Buffer.from(imageBase64, "base64"));
  }

  const storedRecord = {
    ...record,
    markdown: undefined,
    imageBase64: undefined,
    markdownName,
    imageName,
    markdownUrl: publicArchiveUrl(markdownName),
    imageUrl: publicArchiveUrl(imageName),
  };

  const records = await readArchiveIndex();
  const nextRecords = records.filter((item) => item.id !== storedRecord.id);
  nextRecords.push(storedRecord);
  await writeArchiveIndex(nextRecords);
  sendJson(res, 200, { ok: true, record: storedRecord });
}

async function getArchiveList(res) {
  const records = await readArchiveIndex();
  sendJson(res, 200, { records });
}

async function getArchiveDetail(id, res) {
  const records = await readArchiveIndex();
  const record = records.find((item) => item.id === id);
  if (!record) {
    sendJson(res, 404, { error: "Archive not found." });
    return;
  }

  let markdown = "";
  if (record.markdownName) {
    try {
      markdown = await fsp.readFile(path.join(archiveDir, safeFileName(record.markdownName, "")), "utf8");
    } catch {
      markdown = "";
    }
  }

  sendJson(res, 200, { ...record, markdown });
}

function resolveStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requestedPath = decoded === "/" ? "/index.html" : decoded;
  const filePath = path.resolve(rootDir, `.${requestedPath}`);
  const relative = path.relative(rootDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return filePath;
}

async function serveStatic(req, res, pathname) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=60",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, "Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (req.method === "POST" && pathname === "/api/archive") {
      await saveArchive(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/archive") {
      await getArchiveList(res);
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/archive/")) {
      await getArchiveDetail(decodeURIComponent(pathname.slice("/api/archive/".length)), res);
      return;
    }

    if ((req.method === "GET" || req.method === "HEAD") && !pathname.startsWith("/api/")) {
      await serveStatic(req, res, pathname);
      return;
    }

    sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error." });
  }
});

server.listen(port, () => {
  console.log(`Moon Mars Astro AI running at http://localhost:${port}`);
  console.log(`Archive files will be saved in ${archiveDir}`);
});
