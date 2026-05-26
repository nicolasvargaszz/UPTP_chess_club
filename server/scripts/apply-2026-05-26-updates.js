import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = process.env.DB_PATH || join(process.cwd(), "data", "tournament.db");

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

function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findPlayer(state, query) {
  const needle = normalize(query);
  return state.players.find(player => normalize(player.name).includes(needle));
}

function ensurePlayer(state, name) {
  let player = state.players.find(item => normalize(item.name) === normalize(name));
  if (player) return player;

  const nextSeed = Math.max(0, ...state.players.map(item => Number(item.seed) || 0)) + 1;
  player = {
    id: `p-${Date.now()}-josue-hartman`,
    name,
    seed: nextSeed,
    active: true
  };
  state.players.push(player);
  console.log(`Jugador agregado: ${name}`);
  return player;
}

function ensureMatch(state, { whiteName, blackName, result, round, batch, board, source = "official" }) {
  const white = findPlayer(state, whiteName);
  const black = findPlayer(state, blackName);

  if (!white || !black) {
    throw new Error(`No encontré jugadores para: ${whiteName} vs ${blackName}`);
  }

  let match = state.matches.find(item =>
    (item.whiteId === white.id && item.blackId === black.id) ||
    (item.whiteId === black.id && item.blackId === white.id)
  );

  if (!match) {
    match = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      round,
      batch,
      board,
      whiteId: white.id,
      blackId: black.id,
      result: "",
      createdAt: new Date().toISOString(),
      source
    };
    state.matches.push(match);
    console.log(`Partida agregada: ${white.name} vs ${black.name}`);
  }

  match.whiteId = white.id;
  match.blackId = black.id;
  match.result = result;
  match.round = round || match.round;
  match.batch = batch || match.batch;
  match.board = board || match.board;
  match.source = source;

  console.log(`Resultado aplicado: ${white.name} vs ${black.name} = ${result}`);
}

const state = readState();

ensurePlayer(state, "Josue Hartman");

ensureMatch(state, {
  whiteName: "Oscar",
  blackName: "Diego Barrios",
  result: "0-1",
  round: 1,
  batch: 3,
  board: 2
});

ensureMatch(state, {
  whiteName: "Oscar",
  blackName: "Nicolás Vargas",
  result: "1-0",
  round: 2,
  batch: 1,
  board: 1
});

writeState(state);
console.log("Actualización 2026-05-26 aplicada correctamente.");
