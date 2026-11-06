// Módulo Cuantitativo de Validación de Fechas de Torneo (Zero Look-Ahead Bias)
// Club de Finanzas UBA - Motor Institucional

import { TournamentRecord } from "./types";

export interface TournamentDateStatus {
  allowed: boolean;
  status: "ACTIVE" | "SCHEDULED" | "CONCLUDED" | "NO_RESTRICTION";
  reason?: string;
  startDateFormatted?: string;
  endDateFormatted?: string;
}

/**
 * Parsea un string de fecha (ISO, YYYY-MM-DD o YYYY-MM-DDTHH:mm) al timestamp en milisegundos correspondiente.
 * Si isEnd es true y solo se pasa la fecha (YYYY-MM-DD), fija el límite al final del día (23:59:59.999).
 * Considera la zona horaria de Buenos Aires (UTC-3) para evitar desfases de mercado.
 */
export function parseTournamentDateBoundary(dateStr: string | undefined | null, isEnd: boolean): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Si es un número timestamp directo (segundos o ms)
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = Number(trimmed);
    return trimmed.length === 10 ? num * 1000 : num;
  }

  // Si es formato simple YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const timeSuffix = isEnd ? "T23:59:59.999-03:00" : "T00:00:00.000-03:00";
    const parsed = Date.parse(`${trimmed}${timeSuffix}`);
    if (!isNaN(parsed)) return parsed;
  }

  // Si es formato datetime-local: YYYY-MM-DDTHH:mm o YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    // Si no tiene zona horaria explícita, se asume Buenos Aires UTC-3
    const parsed = Date.parse(`${trimmed}${trimmed.length === 16 ? ":00" : ""}-03:00`);
    if (!isNaN(parsed)) return parsed;
  }

  // Fallback general a Date.parse estándar
  const parsed = Date.parse(trimmed);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Formatea un timestamp numérico a formato legible en Buenos Aires
 */
export function formatTournamentDate(ms: number | null): string | undefined {
  if (!ms || isNaN(ms)) return undefined;
  try {
    const formatter = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return formatter.format(new Date(ms)) + " hs";
  } catch {
    return new Date(ms).toISOString();
  }
}

/**
 * Valida de forma estricta e inmutable si una operación en el instante `nowMs`
 * se encuentra dentro de la vigencia del torneo [T_start, T_end].
 * Zero Look-Ahead Bias: rechaza cualquier operación fuera del período oficial.
 */
export function checkTournamentDateRange(
  tournament: Pick<TournamentRecord, "start_date" | "end_date"> | null | undefined,
  nowMs: number = Date.now()
): TournamentDateStatus {
  if (!tournament) {
    return { allowed: true, status: "NO_RESTRICTION" };
  }

  const rawStart = (tournament.start_date || "").trim();
  const rawEnd = (tournament.end_date || "").trim();

  if (!rawStart && !rawEnd) {
    return { allowed: true, status: "NO_RESTRICTION" };
  }

  const startMs = parseTournamentDateBoundary(rawStart, false);
  const endMs = parseTournamentDateBoundary(rawEnd, true);

  const startFormatted = formatTournamentDate(startMs);
  const endFormatted = formatTournamentDate(endMs);

  // 1. Verificación previa al inicio
  if (startMs !== null && nowMs < startMs) {
    return {
      allowed: false,
      status: "SCHEDULED",
      reason: `Torneo no iniciado: La fecha de inicio programada es el ${startFormatted || rawStart}. Las operaciones se habilitarán a partir de ese momento.`,
      startDateFormatted: startFormatted,
      endDateFormatted: endFormatted,
    };
  }

  // 2. Verificación posterior a la finalización
  if (endMs !== null && nowMs > endMs) {
    return {
      allowed: false,
      status: "CONCLUDED",
      reason: `Torneo finalizado: La fecha de finalización fue el ${endFormatted || rawEnd}. La competencia ha concluido y no se permiten más operaciones.`,
      startDateFormatted: startFormatted,
      endDateFormatted: endFormatted,
    };
  }

  return {
    allowed: true,
    status: "ACTIVE",
    startDateFormatted: startFormatted,
    endDateFormatted: endFormatted,
  };
}
