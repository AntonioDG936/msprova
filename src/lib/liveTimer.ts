import { useEffect, useState } from "react";

/**
 * Calcola il tempo live di una partita basandosi sul timestamp di inizio dal DB.
 * Aggiorna ogni secondo nel client, senza richiedere update DB ogni secondo.
 */
export interface LiveTimeState {
  minute: number;
  second: number;
  isStoppage: boolean;
  stoppageMinute: number;
  stoppageSecond: number;
}

export function calcLiveTime(match: {
  match_start_time?: string | null;
  current_minute?: number | null;
  current_second?: number | null;
  period_duration?: number | null;
  status?: string;
  is_interval?: boolean | null;
}): LiveTimeState {
  const periodDuration = match.period_duration ?? 25;
  let minute = match.current_minute ?? 0;
  let second = match.current_second ?? 0;

  if (
    match.status === "in_progress" &&
    !match.is_interval &&
    match.match_start_time
  ) {
    const start = new Date(match.match_start_time).getTime();
    const now = Date.now();
    const totalSec = Math.max(0, Math.floor((now - start) / 1000));
    minute = Math.floor(totalSec / 60);
    second = totalSec % 60;
  }

  const isStoppage = minute >= periodDuration;
  const stoppageMinute = isStoppage ? minute - periodDuration : 0;
  const stoppageSecond = isStoppage ? second : 0;

  return { minute, second, isStoppage, stoppageMinute, stoppageSecond };
}

/**
 * Hook che ritorna il tempo live calcolato OGNI SECONDO.
 * Usalo nelle card e nei dettagli per /, /mister, /staff.
 */
export function useLiveTime(match: {
  match_start_time?: string | null;
  current_minute?: number | null;
  current_second?: number | null;
  period_duration?: number | null;
  status?: string;
  is_interval?: boolean | null;
}): LiveTimeState {
  const [state, setState] = useState<LiveTimeState>(() => calcLiveTime(match));

  useEffect(() => {
    setState(calcLiveTime(match));
    if (match.status !== "in_progress" || match.is_interval || !match.match_start_time) {
      return;
    }
    const id = setInterval(() => {
      setState(calcLiveTime(match));
    }, 1000);
    return () => clearInterval(id);
  }, [
    match.match_start_time,
    match.status,
    match.is_interval,
    match.period_duration,
    match.current_minute,
    match.current_second,
  ]);

  return state;
}

/**
 * Estrae un URL di embed Google Maps SOLO dal link inserito (mai dal nome).
 * Supporta:
 * - URL già di embed (maps/embed)
 * - URL con coordinate @lat,lng
 * - URL con !3d{lat}!4d{lng}
 * - URL place/...
 * - Link condivisi goo.gl/maps o maps.app.goo.gl → fallback embed che usa l'URL come query
 */
export function getMapsEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Already embed
  if (trimmed.includes("/maps/embed")) return trimmed;

  // Try @lat,lng format
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const [, lat, lng] = atMatch;
    return `https://www.google.com/maps?q=${lat},${lng}&hl=it&z=16&output=embed`;
  }

  // Try !3d{lat}!4d{lng}
  const dataMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    const [, lat, lng] = dataMatch;
    return `https://www.google.com/maps?q=${lat},${lng}&hl=it&z=16&output=embed`;
  }

  // Generic: use the URL itself as query (works for short links too via redirect)
  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&hl=it&z=16&output=embed`;
}
