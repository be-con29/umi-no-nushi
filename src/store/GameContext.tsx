import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import type { CaughtFish, SaveData } from "../types";
import { createInitialSave, loadSave, saveSave } from "./persist";

type Action =
  | { type: "spend"; amount: number }
  | { type: "catch"; fishId: string; sizeCm: number; price: number }
  | { type: "sell"; instanceId: string }
  | { type: "sellAll" }
  | { type: "setLastTackle"; baitId: string; rigId: string }
  | { type: "reset" };

function reducer(state: SaveData, action: Action): SaveData {
  switch (action.type) {
    case "spend":
      return { ...state, money: Math.max(0, state.money - action.amount) };
    case "catch": {
      const caught: CaughtFish = {
        instanceId: `${action.fishId}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        fishId: action.fishId,
        sizeCm: action.sizeCm,
        price: action.price,
        caughtAt: Date.now(),
      };
      const prevEntry = state.zukan[action.fishId];
      return {
        ...state,
        stock: [...state.stock, caught],
        zukan: {
          ...state.zukan,
          [action.fishId]: {
            caught: true,
            count: (prevEntry?.count ?? 0) + 1,
            bestSizeCm: Math.max(prevEntry?.bestSizeCm ?? 0, action.sizeCm),
          },
        },
      };
    }
    case "sell": {
      const target = state.stock.find((f) => f.instanceId === action.instanceId);
      if (!target) return state;
      return {
        ...state,
        money: state.money + target.price,
        stock: state.stock.filter((f) => f.instanceId !== action.instanceId),
      };
    }
    case "sellAll": {
      const total = state.stock.reduce((sum, f) => sum + f.price, 0);
      return { ...state, money: state.money + total, stock: [] };
    }
    case "setLastTackle":
      return { ...state, lastBaitId: action.baitId, lastRigId: action.rigId };
    case "reset":
      return createInitialSave();
    default:
      return state;
  }
}

interface GameContextValue {
  state: SaveData;
  dispatch: React.Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadSave);

  useEffect(() => {
    saveSave(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
