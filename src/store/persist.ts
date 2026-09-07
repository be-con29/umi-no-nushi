import type { SaveData } from "../types";

const STORAGE_KEY = "umi-no-nushi:save";

/** 新規セーブ・マイグレーション後のセーブ双方で使う、初期所持道具(すべてtier1の無料品) */
const STARTER_GEAR = {
  ownedRodIds: ["rod_bamboo"],
  ownedReelIds: ["reel_wood"],
  ownedLineIds: ["line_cotton"],
};

export function createInitialSave(): SaveData {
  return {
    version: 3,
    money: 500,
    stock: [],
    zukan: {},
    day: 1,
    timeOfDay: "day",
    weather: "sunny",
    rumors: [],
    ...STARTER_GEAR,
  };
}

/** version:1 (フィールド/時間/道具導入前)のセーブに、以降のデフォルト値を補って引き継ぐ */
function migrateFromV1(parsed: Record<string, unknown>): SaveData {
  return {
    version: 3,
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
    ...STARTER_GEAR,
  };
}

/** version:2 (道具導入前)のセーブに、所持道具のデフォルト値を補って引き継ぐ */
function migrateFromV2(parsed: Record<string, unknown>): SaveData {
  return {
    version: 3,
    money: typeof parsed.money === "number" ? parsed.money : 500,
    stock: Array.isArray(parsed.stock) ? (parsed.stock as SaveData["stock"]) : [],
    zukan:
      parsed.zukan && typeof parsed.zukan === "object"
        ? (parsed.zukan as SaveData["zukan"])
        : {},
    lastBaitId: typeof parsed.lastBaitId === "string" ? parsed.lastBaitId : undefined,
    lastRigId: typeof parsed.lastRigId === "string" ? parsed.lastRigId : undefined,
    day: typeof parsed.day === "number" ? parsed.day : 1,
    timeOfDay: (parsed.timeOfDay as SaveData["timeOfDay"]) ?? "day",
    weather: (parsed.weather as SaveData["weather"]) ?? "sunny",
    rumors: Array.isArray(parsed.rumors) ? (parsed.rumors as string[]) : [],
    ...STARTER_GEAR,
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
    if (parsed.version === 2) {
      return migrateFromV2(parsed);
    }
    if (parsed.version !== 3 || typeof parsed.money !== "number") {
      return createInitialSave();
    }
    const p = parsed as Partial<SaveData> & Record<string, unknown>;
    return {
      version: 3,
      money: p.money as number,
      stock: Array.isArray(p.stock) ? p.stock : [],
      zukan: p.zukan && typeof p.zukan === "object" ? p.zukan : {},
      lastBaitId: p.lastBaitId,
      lastRigId: p.lastRigId,
      day: typeof p.day === "number" ? p.day : 1,
      timeOfDay: p.timeOfDay ?? "day",
      weather: p.weather ?? "sunny",
      rumors: Array.isArray(p.rumors) ? p.rumors : [],
      ownedRodIds: Array.isArray(p.ownedRodIds) && p.ownedRodIds.length > 0 ? p.ownedRodIds : STARTER_GEAR.ownedRodIds,
      ownedReelIds:
        Array.isArray(p.ownedReelIds) && p.ownedReelIds.length > 0 ? p.ownedReelIds : STARTER_GEAR.ownedReelIds,
      ownedLineIds:
        Array.isArray(p.ownedLineIds) && p.ownedLineIds.length > 0 ? p.ownedLineIds : STARTER_GEAR.ownedLineIds,
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
