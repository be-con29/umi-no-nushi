import { useCallback, useEffect, useState } from "react";
import type { Direction, FieldEntity, TimeOfDay, VillageMapDefinition, Weather } from "../../types";
import { attemptMove, type FieldPosition } from "../../game/field";
import { findVillager } from "../../data";
import { TIME_LABEL, WEATHER_LABEL } from "../../game/time";
import { DPad } from "../ui/DPad";
import { DialogueBox } from "../ui/DialogueBox";
import { MoneyBadge } from "../ui/MoneyBadge";
import { ScreenShell, SecondaryButton } from "../ui/ScreenShell";

const TILE = 32;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

interface ActiveDialogue {
  speakerName: string;
  lines: string[];
  lineIndex: number;
}

interface FieldScreenProps {
  map: VillageMapDefinition;
  money: number;
  day: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
  onNavigate: (target: "stock" | "zukan" | "spotSelect") => void;
  onRestAtInn: () => void;
}

const ENTITY_STYLE: Record<FieldEntity["type"], string> = {
  npc: "bg-amber-500/70 border-amber-200",
  building: "bg-slate-500/80 border-slate-200",
  exit: "bg-sky-500/60 border-sky-200",
};

export function FieldScreen({ map, money, day, timeOfDay, weather, onNavigate, onRestAtInn }: FieldScreenProps) {
  const [position, setPosition] = useState<FieldPosition>({ x: map.startX, y: map.startY, facing: "down" });
  const [dialogue, setDialogue] = useState<ActiveDialogue | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const triggerAction = useCallback(
    (entity: FieldEntity) => {
      const action = entity.action;
      switch (action.kind) {
        case "talk": {
          const villager = findVillager(action.villagerId);
          if (villager) setDialogue({ speakerName: villager.name, lines: villager.lines, lineIndex: 0 });
          break;
        }
        case "dialogue":
          setDialogue({ speakerName: action.speakerName, lines: action.lines, lineIndex: 0 });
          break;
        case "screen":
          onNavigate(action.target);
          break;
        case "restAtInn":
          onRestAtInn();
          setDialogue({ speakerName: "宿屋", lines: ["ぐっすり眠った……。"], lineIndex: 0 });
          break;
      }
    },
    [onNavigate, onRestAtInn],
  );

  const handleMove = useCallback(
    (direction: Direction) => {
      if (dialogue || menuOpen) return;
      const result = attemptMove(map, position, direction);
      setPosition(result.position);
      if (result.kind === "interact") {
        triggerAction(result.entity);
      } else if (result.kind === "moved" && result.steppedOn) {
        triggerAction(result.steppedOn);
      }
    },
    [map, position, dialogue, menuOpen, triggerAction],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const dir = KEY_TO_DIRECTION[e.key];
      if (dir) handleMove(dir);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleMove]);

  function advanceDialogue() {
    if (!dialogue) return;
    if (dialogue.lineIndex + 1 >= dialogue.lines.length) {
      setDialogue(null);
    } else {
      setDialogue({ ...dialogue, lineIndex: dialogue.lineIndex + 1 });
    }
  }

  return (
    <ScreenShell
      title={map.name}
      subtitle={`${day}日目 ${TIME_LABEL[timeOfDay]} / ${WEATHER_LABEL[weather]}`}
    >
      <div className="flex justify-between items-center">
        <MoneyBadge money={money} />
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-lg bg-white/10 border border-white/30 px-3 py-1.5 text-sm font-bold"
        >
          ☰ メニュー
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto py-2">
        <div
          className="relative bg-emerald-800 border-2 border-emerald-950/50 rounded-md"
          style={{ width: map.width * TILE, height: map.height * TILE }}
        >
          {map.entities.map((entity) => (
            <div
              key={entity.id}
              title={entity.name}
              className={`absolute flex items-center justify-center border rounded-sm text-base ${ENTITY_STYLE[entity.type]}`}
              style={{
                left: entity.x * TILE,
                top: entity.y * TILE,
                width: TILE,
                height: TILE,
              }}
            >
              {entity.emoji}
            </div>
          ))}
          <div
            data-testid="player"
            className="absolute flex items-center justify-center text-lg transition-[left,top] duration-150 ease-linear"
            style={{ left: position.x * TILE, top: position.y * TILE, width: TILE, height: TILE }}
          >
            🧑
          </div>
        </div>
      </div>

      {dialogue ? (
        <DialogueBox
          speakerName={dialogue.speakerName}
          text={dialogue.lines[dialogue.lineIndex]}
          isLast={dialogue.lineIndex + 1 >= dialogue.lines.length}
          onAdvance={advanceDialogue}
        />
      ) : (
        <DPad onMove={handleMove} disabled={menuOpen} />
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50" onClick={() => setMenuOpen(false)}>
          <div
            className="w-full max-w-md bg-blue-900 border-t border-white/20 rounded-t-2xl p-4 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white font-bold mb-1">メニュー</h2>
            <SecondaryButton
              onClick={() => {
                setMenuOpen(false);
                onNavigate("zukan");
              }}
            >
              📖 魚図鑑
            </SecondaryButton>
            <SecondaryButton onClick={() => setMenuOpen(false)}>閉じる</SecondaryButton>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
