import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = process.env.DB_PATH || join(process.cwd(), "data", "tournament.db");
const PATCH_ID = "official-state-rounds-1-4-2026-06-01-v1";

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

const OFFICIAL_MATCHES = [
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

const row = getKV.get("state");
if (!row) throw new Error("No existe la clave state en SQLite.");

const state = JSON.parse(row.value);
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

state.matches = OFFICIAL_MATCHES;
state.appliedPatches = Array.from(new Set([...(state.appliedPatches || []), PATCH_ID]));
state.updatedAt = new Date().toISOString();

setKV.run("state", JSON.stringify(state));
console.log("Estado oficial 2026-06-01 aplicado: rondas 1-4 actualizadas.");
