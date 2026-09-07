import type { SaveData } from "../types";

const STORAGE_KEY = "umi-no-nushi:save";

export function createInitialSave(): SaveData {
  return {
    version: 2,
    money: 500,
    stock: [],
    zukan: {},
    day: 1,
    timeOfDay: "day",
    weather: "sunny",
    rumors: [],
  };
}

/** version:1 (フィールド/時間導入前)のセーブに、時間・天候・噂のデフォルト値を補って引き継ぐ */
function migrateFromV1(parsed: Record<string, unknown>): SaveData {
  return {
    version: 2,
    money: typeof parsed.money === "number" ? parsed.money : 500,
    stock: Array.isArray(parsed.stock) ? (parsed.stock as SaveData["stock"]) : [],
    zukan:
      parsed.zukan && typeof parsed.zukan === "object"
        ? (parsed.zukan as SaveData["zukan"])
        : {},
    lastBaitId: typeof parsed.lastBaitId === "string" ? parsed.lastBaitId : undefined,
    lastRigId: typeof parsed.lastRigId === "string" ? parsed.lastRigId : undefined,
    day: 1,
    timeOfDay: "day",
    weather: "sunny",
    rumors: [],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSave();
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.version === 1) {
      return migrateFromV1(parsed);
    }
    if (parsed.version !== 2 || typeof parsed.money !== "number") {
      return createInitialSave();
    }
    const p = parsed as Partial<SaveData> & Record<string, unknown>;
    return {
      version: 2,
      money: p.money as number,
      stock: Array.isArray(p.stock) ? p.stock : [],
      zukan: p.zukan && typeof p.zukan === "object" ? p.zukan : {},
      lastBaitId: p.lastBaitId,
      lastRigId: p.lastRigId,
      day: typeof p.day === "number" ? p.day : 1,
      timeOfDay: p.timeOfDay ?? "day",
      weather: p.weather ?? "sunny",
      rumors: Array.isArray(p.rumors) ? p.rumors : [],
    };
  } catch {
    return createInitialSave();
  }
}

export function saveSave(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存できなくてもゲーム進行は継続する(プライベートモード等の考慮)
  }
}
