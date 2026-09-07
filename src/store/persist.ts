import type { SaveData } from "../types";

const STORAGE_KEY = "umi-no-nushi:save";

export function createInitialSave(): SaveData {
  return {
    version: 1,
    money: 500,
    stock: [],
    zukan: {},
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1 || typeof parsed.money !== "number") {
      return createInitialSave();
    }
    return {
      version: 1,
      money: parsed.money,
      stock: Array.isArray(parsed.stock) ? parsed.stock : [],
      zukan: parsed.zukan && typeof parsed.zukan === "object" ? parsed.zukan : {},
      lastBaitId: parsed.lastBaitId,
      lastRigId: parsed.lastRigId,
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
