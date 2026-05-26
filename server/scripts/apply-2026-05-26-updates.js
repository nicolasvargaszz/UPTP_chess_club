import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = process.env.DB_PATH || join(process.cwd(), "data", "tournament.db");

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

const OFFICIAL_MATCHES = [
  ["m-inicial-1", 1, 1, 1, "p8", "p14", "0-1", "initial"],
  ["m-inicial-2", 1, 1, 2, "p2", "p11", "1-0", "initial"],
  ["m-inicial-3", 1, 1, 3, "p3", "p16", "0-1", "initial"],
  ["m-oficial-4-camila-ian", 1, 2, 1, "p1", "p15", "0.5-0.5", "official"],
  ["m-oficial-5-bruno-bareiro", 1, 2, 2, "p4", "p5", "1-0", "official"],
  ["m-oficial-6-oscar-diego", 1, 2, 3, "p9", "p13", "0-1", "official"],
  ["m-oficial-7-sara-fabrizio", 1, 3, 1, "p12", "p6", "", "official"],
  ["m-oficial-8-matias-josue", 1, 3, 2, "p10", "p17", "", "official"],
  ["m-oficial-9-oscar-nicolas", 2, 1, 1, "p9", "p8", "1-0", "official"],
  ["m-oficial-10-camila-saul", 2, 1, 2, "p1", "p14", "0-1", "official"],
  ["m-oficial-11-fabrizio-jose", 2, 1, 3, "p6", "p2", "0-1", "official"],
  ["m-oficial-12-nico-bruno", 2, 2, 1, "p16", "p4", "", "official"],
  ["m-oficial-13-diego-ian", 2, 2, 2, "p13", "p15", "", "official"],
  ["m-oficial-14-santiago-josue", 2, 2, 3, "p3", "p17", "", "official"],
  ["m-oficial-15-sara-matias", 2, 3, 1, "p12", "p10", "", "official"],
  ["m-oficial-16-maximiliano-yanina", 2, 3, 2, "p7", "p11", "", "official"]
].map(([id, round, batch, board, whiteId, blackId, result, source], index) => ({
  id,
  round,
  batch,
  board,
  whiteId,
  blackId,
  result,
  createdAt: `2026-05-26T00:${String(index).padStart(2, "0")}:00.000Z`,
  source
}));

const OFFICIAL_BYES = [
  {
    id: "bye-r1-maximiliano",
    round: 1,
    batch: 3,
    board: 3,
    byeId: "p7",
    result: "bye",
    createdAt: "2026-05-26T00:30:00.000Z",
    source: "bye"
  },
  {
    id: "bye-r2-bareiro",
    round: 2,
    batch: 3,
    board: 3,
    byeId: "p5",
    result: "bye",
    createdAt: "2026-05-26T00:31:00.000Z",
    source: "bye"
  }
];

if (!existsSync(DB_PATH)) {
  console.error(`No existe la base SQLite en: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH);
const getKV = db.prepare("SELECT value FROM kv WHERE key = ?");
const setKV = db.prepare(`
  INSERT INTO kv (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

function readState() {
  const row = getKV.get("state");
  if (!row) throw new Error("No existe la clave state en SQLite.");
  return JSON.parse(row.value);
}

function writeState(state) {
  state.updatedAt = new Date().toISOString();
  setKV.run("state", JSON.stringify(state));
}

const state = readState();
state.players = OFFICIAL_PLAYERS.map((name, index) => {
  const id = `p${index + 1}`;
  const existing = state.players.find(player => player.id === id || player.name === name);
  return {
    id,
    name,
    seed: index + 1,
    active: existing?.active !== false
  };
});

const officialIds = new Set([...OFFICIAL_MATCHES, ...OFFICIAL_BYES].map(match => match.id));
state.matches = state.matches.filter(match =>
  officialIds.has(match.id) &&
  match.source !== "auto" &&
  match.source !== "advance" &&
  match.source !== "admin"
);

state.matches = [...OFFICIAL_MATCHES, ...OFFICIAL_BYES];
state.appliedPatches = Array.from(new Set([...(state.appliedPatches || []), "official-state-rounds-1-2-2026-05-26-v2"]));

writeState(state);
console.log("Estado oficial aplicado. Partidas auto/adelanto incorrectas eliminadas.");
