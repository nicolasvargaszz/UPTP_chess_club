import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFile(join(__dirname, ".env"));

const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data");
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "tournament.db");
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-change-this-secret";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "uptp-admin-change-me";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const OFFICIAL_PLAYERS = [
  "Camila Rivas",
  "José Alejandro Costa Garrigoza",
  "Santiago Gamarra",
  "Bruno Tobias Gonzalez Mora",
  "David Nicolás Bareiro Pereira",
  "Fabrizio Matias Castro Gamarra",
  "Maximiliano Ferloni",
  "Nicolás Vargas",
  "Oscar Martín Barrios Brizuela",
  "Matias Canela",
  "Yanina Del Carmen Vera Benitez",
  "Sara Ltaif Fischer",
  "Diego Barrios",
  "Saúl Rojas",
  "Ian Gibbons",
  "Nico Segovia"
];

const INITIAL_MATCHES = [
  {
    id: "m-inicial-1",
    round: 1,
    batch: 1,
    board: 1,
    whiteId: "p8",
    blackId: "p14",
    result: "0-1",
    createdAt: "2026-05-25T00:00:01.000Z",
    source: "initial"
  },
  {
    id: "m-inicial-2",
    round: 1,
    batch: 1,
    board: 2,
    whiteId: "p2",
    blackId: "p11",
    result: "1-0",
    createdAt: "2026-05-25T00:00:02.000Z",
    source: "initial"
  },
  {
    id: "m-inicial-3",
    round: 1,
    batch: 1,
    board: 3,
    whiteId: "p3",
    blackId: "p16",
    result: "0-1",
    createdAt: "2026-05-25T00:00:03.000Z",
    source: "initial"
  },
  {
    id: "m-oficial-4-camila-ian",
    round: 1,
    batch: 2,
    board: 1,
    whiteId: "p1",
    blackId: "p15",
    result: "0.5-0.5",
    createdAt: "2026-05-25T00:00:04.000Z",
    source: "official"
  },
  {
    id: "m-oficial-5-bruno-bareiro",
    round: 1,
    batch: 2,
    board: 2,
    whiteId: "p4",
    blackId: "p5",
    result: "",
    createdAt: "2026-05-25T00:00:05.000Z",
    source: "official"
  }
];

const DEFAULT_SETTINGS = {
  tournamentName: "Recreos UPTP 5+0",
  totalRounds: 5,
  boardsPerBatch: 3,
  autoPairing: true,
  logoSource: "Logos institucionales locales"
};

function createInitialState() {
  return {
    version: 2,
    players: OFFICIAL_PLAYERS.map((name, index) => ({
      id: `p${index + 1}`,
      name,
      seed: index + 1,
      active: true
    })),
    matches: INITIAL_MATCHES,
    appliedPatches: ["server-seed-2026-05-25"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const getKV = db.prepare("SELECT value FROM kv WHERE key = ?");
const setKV = db.prepare(`
  INSERT INTO kv (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

function readJSON(key, fallback) {
  const row = getKV.get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  setKV.run(key, JSON.stringify(value));
}

function initDatabase() {
  if (!getKV.get("state")) writeJSON("state", createInitialState());
  if (!getKV.get("settings")) writeJSON("settings", DEFAULT_SETTINGS);

  const currentAdmin = getKV.get("adminHash");
  if (process.env.ADMIN_PASSWORD || !currentAdmin) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
    setKV.run("adminHash", hash);
  }
}

function publicSnapshot() {
  return {
    state: readJSON("state", createInitialState()),
    settings: readJSON("settings", DEFAULT_SETTINGS),
    remote: true,
    updatedAt: new Date().toISOString()
  };
}

function requireAdmin(request, response, next) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  try {
    request.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    response.status(401).json({ error: "admin_required" });
  }
}

initDatabase();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map(item => item.trim()),
  credentials: false
}));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, db: DB_PATH, time: new Date().toISOString() });
});

app.get("/api/state", (_request, response) => {
  response.json(publicSnapshot());
});

app.post("/api/login", (request, response) => {
  const key = String(request.body?.key || request.body?.password || "");
  const adminHash = getKV.get("adminHash")?.value || "";

  if (!bcrypt.compareSync(key, adminHash)) {
    response.status(401).json({ error: "invalid_key" });
    return;
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
  response.json({ token });
});

app.put("/api/state", requireAdmin, (request, response) => {
  const incomingState = request.body?.state;
  const incomingSettings = request.body?.settings;

  if (!incomingState || !Array.isArray(incomingState.players) || !Array.isArray(incomingState.matches)) {
    response.status(400).json({ error: "invalid_state" });
    return;
  }

  const cleanSettings = {
    ...DEFAULT_SETTINGS,
    ...(incomingSettings || {})
  };
  delete cleanSettings.adminHash;

  writeJSON("state", {
    ...incomingState,
    updatedAt: new Date().toISOString()
  });
  writeJSON("settings", cleanSettings);

  response.json(publicSnapshot());
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`UPTP Chess Club API listening on http://0.0.0.0:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log("ADMIN_PASSWORD is not set. Temporary default: uptp-admin-change-me");
  }
});
