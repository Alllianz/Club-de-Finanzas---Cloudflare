// Utilidades de Vigencia Temporal del Torneo (Zero Look-Ahead Bias)
// Club de Finanzas UBA - Portal Institucional

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
 */
export function parseTournamentDateBoundary(dateStr: string | undefined | null, isEnd: boolean): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  if (/^\d{10,13}$/.test(trimmed)) {
    const num = Number(trimmed);
    return trimmed.length === 10 ? num * 1000 : num;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const timeSuffix = isEnd ? "T23:59:59.999-03:00" : "T00:00:00.000-03:00";
    const parsed = Date.parse(`${trimmed}${timeSuffix}`);
    if (!isNaN(parsed)) return parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parsed = Date.parse(`${trimmed}${trimmed.length === 16 ? ":00" : ""}-03:00`);
    if (!isNaN(parsed)) return parsed;
  }

  const parsed = Date.parse(trimmed);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Formatea un timestamp numérico o string ISO a formato legible institucional en Buenos Aires
 */
export function formatTournamentDate(msOrStr: number | string | null | undefined): string | undefined {
  if (!msOrStr) return undefined;
  const ms = typeof msOrStr === "string" ? parseTournamentDateBoundary(msOrStr, false) : msOrStr;
  if (!ms || isNaN(ms)) return undefined;

  try {
    const formatter = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return formatter.format(new Date(ms)) + " hs";
  } catch {
    return new Date(ms).toLocaleDateString("es-AR");
  }
}

/**
 * Convierte un string de fecha arbitrario a formato compatible con <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
 */
export function toDateTimeLocalString(dateStr: string | undefined | null): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const trimmed = dateStr.trim();
  if (!trimmed) return "";

  // Si ya viene en formato YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Si viene como YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00`;
  }

  const ms = parseTournamentDateBoundary(trimmed, false);
  if (!ms) return "";

  const d = new Date(ms);
  // Convertir a hora local o de Buenos Aires
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Valida si el torneo está en período hábil para operar según startDate y endDate
 */
export function checkTournamentDateRange(
  tournament: { startDate?: string; endDate?: string; start_date?: string; end_date?: string } | null | undefined,
  nowMs: number = Date.now()
): TournamentDateStatus {
  if (!tournament) {
    return { allowed: true, status: "NO_RESTRICTION" };
  }

  const rawStart = (tournament.startDate || tournament.start_date || "").trim();
  const rawEnd = (tournament.endDate || tournament.end_date || "").trim();

  if (!rawStart && !rawEnd) {
    return { allowed: true, status: "NO_RESTRICTION" };
  }

  const startMs = parseTournamentDateBoundary(rawStart, false);
  const endMs = parseTournamentDateBoundary(rawEnd, true);

  const startFormatted = formatTournamentDate(startMs);
  const endFormatted = formatTournamentDate(endMs);

  if (startMs !== null && nowMs < startMs) {
    return {
      allowed: false,
      status: "SCHEDULED",
      reason: `Torneo no iniciado: La fecha de inicio programada es el ${startFormatted || rawStart}. Las operaciones se habilitarán a partir de ese momento.`,
      startDateFormatted: startFormatted,
      endDateFormatted: endFormatted,
    };
  }

  if (endMs !== null && nowMs > endMs) {
    return {
      allowed: false,
      status: "CONCLUDED",
      reason: `Torneo finalizado: La competencia concluyó el ${endFormatted || rawEnd}. No se admiten nuevas operaciones ni cierres de posición.`,
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
