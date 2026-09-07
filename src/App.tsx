import { useCallback, useState } from "react";
import { GameProvider, useGame } from "./store/GameContext";
import { BAITS, FISH, RIGS, SPOTS, VILLAGE, findBait, findFish, findRig, findSpot } from "./data";
import type { FishDefinition } from "./types";
import { calcPrice, rollSizeCm } from "./game/fishing";
import { FieldScreen } from "./components/screens/FieldScreen";
import { SpotSelectScreen } from "./components/screens/SpotSelectScreen";
import { TackleScreen } from "./components/screens/TackleScreen";
import { FishingScreen } from "./components/screens/FishingScreen";
import { TensionGameScreen } from "./components/screens/TensionGameScreen";
import { ResultScreen } from "./components/screens/ResultScreen";
import { StockScreen } from "./components/screens/StockScreen";
import { ZukanScreen } from "./components/screens/ZukanScreen";

type Screen = "field" | "spotSelect" | "tackle" | "fishing" | "fight" | "result" | "stock" | "zukan";

interface Session {
  spotId?: string;
  baitId?: string;
  rigId?: string;
  hookedFish?: FishDefinition;
  result?: {
    status: "won" | "lost";
    fish: FishDefinition;
    sizeCm?: number;
    price?: number;
    isNewRecord?: boolean;
  };
}

function GameApp() {
  const { state, dispatch } = useGame();
  const [screen, setScreen] = useState<Screen>("field");
  const [session, setSession] = useState<Session>({});

  const enterFishing = useCallback(
    (baitId: string, rigId: string) => {
      const bait = findBait(baitId);
      if (bait) dispatch({ type: "spend", amount: bait.cost });
      dispatch({ type: "setLastTackle", baitId, rigId });
      setSession((s) => ({ ...s, baitId, rigId }));
      setScreen("fishing");
    },
    [dispatch],
  );

  if (screen === "field") {
    return (
      <FieldScreen
        map={VILLAGE}
        money={state.money}
        day={state.day}
        timeOfDay={state.timeOfDay}
        weather={state.weather}
        onNavigate={(target) => setScreen(target)}
        onRestAtInn={() => dispatch({ type: "advanceTime" })}
      />
    );
  }

  if (screen === "spotSelect") {
    return (
      <SpotSelectScreen
        spots={SPOTS}
        onSelect={(spotId) => {
          setSession((s) => ({ ...s, spotId }));
          setScreen("tackle");
        }}
        onBack={() => setScreen("field")}
      />
    );
  }

  if (screen === "tackle") {
    return (
      <TackleScreen
        baits={BAITS}
        rigs={RIGS}
        money={state.money}
        initialBaitId={session.baitId ?? state.lastBaitId}
        initialRigId={session.rigId ?? state.lastRigId}
        onConfirm={enterFishing}
        onBack={() => setScreen("spotSelect")}
      />
    );
  }

  if (screen === "fishing") {
    const spot = findSpot(session.spotId ?? "");
    const bait = findBait(session.baitId ?? "");
    const rig = findRig(session.rigId ?? "");
    if (!spot || !bait || !rig) {
      setScreen("field");
      return null;
    }
    return (
      <FishingScreen
        spot={spot}
        bait={bait}
        rig={rig}
        allFish={FISH}
        onHooked={(fish) => {
          setSession((s) => ({ ...s, hookedFish: fish }));
          setScreen("fight");
        }}
        onBack={() => setScreen("tackle")}
      />
    );
  }

  if (screen === "fight") {
    const fish = session.hookedFish;
    const rig = findRig(session.rigId ?? "");
    if (!fish || !rig) {
      setScreen("field");
      return null;
    }
    return (
      <TensionGameScreen
        fish={fish}
        rig={rig}
        onFinish={(status) => {
          if (status === "won") {
            const sizeCm = rollSizeCm(fish);
            const price = calcPrice(fish, sizeCm);
            const prevBest = state.zukan[fish.id]?.bestSizeCm ?? 0;
            dispatch({ type: "catch", fishId: fish.id, sizeCm, price });
            setSession((s) => ({
              ...s,
              result: { status, fish, sizeCm, price, isNewRecord: sizeCm > prevBest },
            }));
          } else {
            setSession((s) => ({ ...s, result: { status, fish } }));
          }
          setScreen("result");
        }}
      />
    );
  }

  if (screen === "result" && session.result) {
    const { status, fish, sizeCm, price, isNewRecord } = session.result;
    return (
      <ResultScreen
        status={status}
        fish={fish}
        sizeCm={sizeCm}
        price={price}
        isNewRecord={isNewRecord}
        onContinue={() => {
          if (session.baitId && session.rigId) enterFishing(session.baitId, session.rigId);
        }}
        onBackToVillage={() => setScreen("field")}
      />
    );
  }

  if (screen === "stock") {
    return (
      <StockScreen
        money={state.money}
        stock={state.stock}
        findFish={findFish}
        onSell={(instanceId) => dispatch({ type: "sell", instanceId })}
        onSellAll={() => dispatch({ type: "sellAll" })}
        onBack={() => setScreen("field")}
      />
    );
  }

  if (screen === "zukan") {
    return <ZukanScreen fishList={FISH} zukan={state.zukan} onBack={() => setScreen("field")} />;
  }

  return null;
}

export default function App() {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
}
