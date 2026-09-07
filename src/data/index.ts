// data/*.json を読み込み、型を付けてエクスポートする。
// 新しい魚・餌・仕掛け・釣り場・道具を追加する場合はこのファイルではなく各jsonを編集すればよい。
import fishJson from "./fish.json";
import baitsJson from "./baits.json";
import rigsJson from "./rigs.json";
import spotsJson from "./spots.json";
import villageJson from "./village.json";
import villagersJson from "./villagers.json";
import rodsJson from "./rods.json";
import reelsJson from "./reels.json";
import linesJson from "./lines.json";
import type {
  BaitDefinition,
  FishDefinition,
  LineDefinition,
  ReelDefinition,
  RigDefinition,
  RodDefinition,
  SpotDefinition,
  VillageMapDefinition,
  VillagerDefinition,
} from "../types";

export const FISH: FishDefinition[] = fishJson as FishDefinition[];
export const BAITS: BaitDefinition[] = baitsJson as BaitDefinition[];
export const RIGS: RigDefinition[] = rigsJson as RigDefinition[];
export const SPOTS: SpotDefinition[] = spotsJson as SpotDefinition[];
export const VILLAGE: VillageMapDefinition = villageJson as VillageMapDefinition;
export const VILLAGERS: VillagerDefinition[] = villagersJson as VillagerDefinition[];
export const RODS: RodDefinition[] = rodsJson as RodDefinition[];
export const REELS: ReelDefinition[] = reelsJson as ReelDefinition[];
export const LINES: LineDefinition[] = linesJson as LineDefinition[];

export function findFish(id: string): FishDefinition | undefined {
  return FISH.find((f) => f.id === id);
}
export function findBait(id: string): BaitDefinition | undefined {
  return BAITS.find((b) => b.id === id);
}
export function findRig(id: string): RigDefinition | undefined {
  return RIGS.find((r) => r.id === id);
}
export function findSpot(id: string): SpotDefinition | undefined {
  return SPOTS.find((s) => s.id === id);
}
export function findVillager(id: string): VillagerDefinition | undefined {
  return VILLAGERS.find((v) => v.id === id);
}
