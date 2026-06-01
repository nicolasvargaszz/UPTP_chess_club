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
  "Nico Segovia",
  "Josue Hartman"
];

function officialMatch(id, round, batch, board, whiteId, blackId, result = "", source = "official") {
  return {
    id,
    round,
    batch,
    board,
    whiteId,
    blackId,
    result,
    createdAt: `2026-06-01T${String(round).padStart(2, "0")}:${String(batch).padStart(2, "0")}:${String(board).padStart(2, "0")}.000Z`,
    source
  };
}

function officialBye(id, round, batch, board, byeId) {
  return {
    id,
    round,
    batch,
    board,
    byeId,
    result: "bye",
    createdAt: `2026-06-01T${String(round).padStart(2, "0")}:${String(batch).padStart(2, "0")}:${String(board).padStart(2, "0")}.000Z`,
    source: "bye"
  };
}

const INITIAL_MATCHES = [
  officialMatch("m-r1-1-nicolas-saul", 1, 1, 1, "p8", "p14", "0-1", "initial"),
  officialMatch("m-r1-2-jose-yanina", 1, 1, 2, "p2", "p11", "1-0", "initial"),
  officialMatch("m-r1-3-santiago-nico", 1, 1, 3, "p3", "p16", "0-1", "initial"),
  officialMatch("m-r1-4-camila-ian", 1, 2, 1, "p1", "p15", "0.5-0.5"),
  officialMatch("m-r1-5-bruno-bareiro", 1, 2, 2, "p4", "p5", "1-0"),
  officialMatch("m-r1-6-oscar-diego", 1, 2, 3, "p9", "p13", "0-1"),
  officialMatch("m-r1-7-sara-fabrizio", 1, 3, 1, "p12", "p6", "0-1"),
  officialMatch("m-r1-8-matias-josue", 1, 3, 2, "p10", "p17", "0-1"),
  officialBye("bye-r1-maximiliano", 1, 3, 3, "p7"),

  officialMatch("m-r2-1-oscar-nicolas", 2, 1, 1, "p9", "p8", "1-0"),
  officialMatch("m-r2-2-camila-saul", 2, 1, 2, "p1", "p14", "0-1"),
  officialMatch("m-r2-3-fabrizio-jose", 2, 1, 3, "p6", "p2", "0-1"),
  officialMatch("m-r2-4-nico-bruno", 2, 2, 1, "p16", "p4", "1-0"),
  officialMatch("m-r2-5-diego-ian", 2, 2, 2, "p13", "p15", "0-1"),
  officialMatch("m-r2-6-santiago-josue", 2, 2, 3, "p3", "p17", "0-1"),
  officialMatch("m-r2-7-sara-matias", 2, 3, 1, "p12", "p10", "0-1"),
  officialMatch("m-r2-8-maximiliano-yanina", 2, 3, 2, "p7", "p11", "0-1"),
  officialBye("bye-r2-bareiro", 2, 3, 3, "p5"),

  officialMatch("m-r3-1-nicolas-santiago", 3, 1, 1, "p8", "p3"),
  officialMatch("m-r3-2-yanina-fabrizio", 3, 1, 2, "p11", "p6", "1-0"),
  officialMatch("m-r3-3-bareiro-oscar", 3, 1, 3, "p5", "p9", "0-1"),
  officialMatch("m-r3-4-bruno-camila", 3, 2, 1, "p4", "p1", "0-1"),
  officialMatch("m-r3-5-saul-nico", 3, 2, 2, "p14", "p16", "0-1"),
  officialMatch("m-r3-6-jose-maximiliano", 3, 2, 3, "p2", "p7", "1-0"),
  officialMatch("m-r3-7-diego-josue", 3, 3, 1, "p13", "p17"),
  officialMatch("m-r3-8-matias-ian", 3, 3, 2, "p10", "p15", "0-1"),
  officialBye("bye-r3-sara", 3, 3, 3, "p12"),

  officialMatch("m-r4-1-jose-nico", 4, 1, 1, "p2", "p16"),
  officialMatch("m-r4-2-ian-oscar", 4, 1, 2, "p15", "p9"),
  officialMatch("m-r4-3-saul-josue", 4, 1, 3, "p14", "p17"),
  officialMatch("m-r4-4-yanina-camila", 4, 2, 1, "p11", "p1"),
  officialMatch("m-r4-5-bruno-bareiro", 4, 2, 2, "p4", "p5"),
  officialMatch("m-r4-6-diego-fabrizio", 4, 2, 3, "p13", "p6"),
  officialMatch("m-r4-7-matias-maximiliano", 4, 3, 1, "p10", "p7"),
  officialMatch("m-r4-8-sara-nicolas", 4, 3, 2, "p12", "p8"),
  officialBye("bye-r4-santiago", 4, 3, 3, "p3")
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
    appliedPatches: ["server-seed-2026-06-01-rounds-1-4"],
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
