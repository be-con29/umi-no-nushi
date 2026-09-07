// data/*.json を読み込み、型を付けてエクスポートする。
// 新しい魚・餌・仕掛け・釣り場を追加する場合はこのファイルではなく各jsonを編集すればよい。
import fishJson from "./fish.json";
import baitsJson from "./baits.json";
import rigsJson from "./rigs.json";
import spotsJson from "./spots.json";
import type { BaitDefinition, FishDefinition, RigDefinition, SpotDefinition } from "../types";

export const FISH: FishDefinition[] = fishJson as FishDefinition[];
export const BAITS: BaitDefinition[] = baitsJson as BaitDefinition[];
export const RIGS: RigDefinition[] = rigsJson as RigDefinition[];
export const SPOTS: SpotDefinition[] = spotsJson as SpotDefinition[];

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
