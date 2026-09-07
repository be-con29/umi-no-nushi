// 時間帯・天候の進行ロジック。副作用のない純粋関数として実装する。
// 現時点では宿屋で休んだ時にのみ呼ばれる。将来、魚の出現条件から参照する想定(CLAUDE.md 9章)。
import type { TimeOfDay, Weather } from "../types";

const TIME_ORDER: TimeOfDay[] = ["dawn", "day", "dusk", "night"];

export const TIME_LABEL: Record<TimeOfDay, string> = {
  dawn: "朝マヅメ",
  day: "日中",
  dusk: "夕マヅメ",
  night: "夜",
};

export const WEATHER_LABEL: Record<Weather, string> = {
  sunny: "晴れ",
  cloudy: "曇り",
  rainy: "雨",
};

const WEATHER_ORDER: Weather[] = ["sunny", "sunny", "cloudy", "rainy"];

function rollWeather(random: () => number = Math.random): Weather {
  return WEATHER_ORDER[Math.floor(random() * WEATHER_ORDER.length)];
}

export interface TimeState {
  day: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
}

/**
 * 時間を1コマ進める。night から dawn に戻るタイミングで日付が進み、天候を振り直す。
 */
export function advanceTime(state: TimeState, random: () => number = Math.random): TimeState {
  const currentIndex = TIME_ORDER.indexOf(state.timeOfDay);
  const nextIndex = (currentIndex + 1) % TIME_ORDER.length;
  const wrapped = nextIndex === 0;
  return {
    day: wrapped ? state.day + 1 : state.day,
    timeOfDay: TIME_ORDER[nextIndex],
    weather: wrapped ? rollWeather(random) : state.weather,
  };
}
