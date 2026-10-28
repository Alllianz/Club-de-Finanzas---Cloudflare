import prisma from "../prisma";
import type { LetrasCurveResponse, LetrasPoint } from "../types";

type ArgentinaDatosLetra = {
  ticker?: unknown;
  fechaEmision?: unknown;
  fechaVencimiento?: unknown;
  tem?: unknown;
  tna?: unknown;
  tea?: unknown;
  vpv?: unknown;
  precio?: unknown;
};

const argentinaDatosBaseUrl = process.env.ARGENTINA_DATOS_BASE_URL ?? "https://api.argentinadatos.com";
const argentinaDatosTimeoutMs = Number(process.env.ARGENTINA_DATOS_TIMEOUT_MS ?? 8_000);
const CURVE_POINTS = 14;

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace("%", "").replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toDateOrNull(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetweenUtc(from: Date, to: Date): number {
  const fromStart = startOfUtcDay(from).getTime();
  const toStart = startOfUtcDay(to).getTime();
  return Math.round((toStart - fromStart) / (1000 * 60 * 60 * 24));
}

function toPercentTem(temPercent: number | null): { tna: number | null; tea: number | null } {
  if (temPercent === null) return { tna: null, tea: null };
  const temRate = temPercent / 100;
  const tna = temPercent * 12;
  const tea = (Math.pow(1 + temRate, 12) - 1) * 100;
  return {
    tna: Number(tna.toFixed(4)),
    tea: Number(tea.toFixed(4)),
  };
}

function temFromTna(tnaPercent: number | null): number | null {
  if (tnaPercent === null) return null;
  return Number((tnaPercent / 12).toFixed(6));
}

function temFromTea(teaPercent: number | null): number | null {
  if (teaPercent === null) return null;
  const rate = teaPercent / 100;
  const temRate = Math.pow(1 + rate, 1 / 12) - 1;
  return Number((temRate * 100).toFixed(6));
}

function temFromPrice(vpv: number, price: number | null, dtmDays: number): number | null {
  if (price === null || price <= 0 || vpv <= 0 || dtmDays <= 0) return null;
  const months = dtmDays / 30;
  if (months <= 0) return null;
  const monthlyRate = Math.pow(vpv / price, 1 / months) - 1;
  if (!Number.isFinite(monthlyRate)) return null;
  return Number((monthlyRate * 100).toFixed(6));
}

function calculateEstimatedPrice(vpv: number, temPercent: number | null, dtmDays: number): number {
  if (temPercent === null || dtmDays <= 0) return Number(vpv.toFixed(6));
  const monthlyRate = temPercent / 100;
  const months = dtmDays / 30;
  const discounted = vpv / Math.pow(1 + monthlyRate, months);
  return Number(discounted.toFixed(6));
}

function parseAndNormalize(raw: ArgentinaDatosLetra[], now: Date): LetrasPoint[] {
  return raw
    .map((item) => {
      const ticker = typeof item.ticker === "string" ? item.ticker.trim() : "";
      const fechaVencimiento = toDateOrNull(item.fechaVencimiento);
      const fechaEmision = toDateOrNull(item.fechaEmision);
      const vpv = toNumberOrNull(item.vpv);
      const rawTem = toNumberOrNull(item.tem);
      const rawTna = toNumberOrNull(item.tna);
      const rawTea = toNumberOrNull(item.tea);
      const rawPrice = toNumberOrNull(item.precio);

      if (!ticker || !fechaVencimiento || vpv === null) return null;

      const dtmDays = daysBetweenUtc(now, fechaVencimiento);
      if (dtmDays <= 0) return null;

      const temPercent =
        rawTem ?? temFromTna(rawTna) ?? temFromTea(rawTea) ?? temFromPrice(vpv, rawPrice, dtmDays);
      const { tna, tea } = toPercentTem(temPercent);
      const price = rawPrice !== null ? Number(rawPrice.toFixed(6)) : calculateEstimatedPrice(vpv, temPercent, dtmDays);

      return {
        ticker,
        fechaEmision: fechaEmision ? fechaEmision.toISOString().slice(0, 10) : null,
        fechaVencimiento: fechaVencimiento.toISOString().slice(0, 10),
        dtmDays,
        temPercent,
        tnaPercent: tna,
        teaPercent: tea,
        vpv: Number(vpv.toFixed(6)),
        price,
      } satisfies LetrasPoint;
    })
    .filter((item): item is LetrasPoint => item !== null)
    .sort((a, b) => a.dtmDays - b.dtmDays);
}

function hasUsableCurvePoints(points: Array<{ teaPercent: number | null }>): boolean {
  return points.filter((point) => point.teaPercent !== null).length >= 3;
}

function pickCurveBasePoints(points: LetrasPoint[]): LetrasPoint[] {
  const valid = points.filter((point) => point.teaPercent !== null);
  if (valid.length <= CURVE_POINTS) return valid;
  const selected: LetrasPoint[] = [];
  const lastIndex = valid.length - 1;
  for (let i = 0; i < CURVE_POINTS; i += 1) {
    const index = Math.round((i / (CURVE_POINTS - 1)) * lastIndex);
    selected.push(valid[index]);
  }
  return selected;
}

function solveQuadraticRegression(points: { x: number; y: number }[]): { a: number; b: number; c: number } | null {
  if (points.length < 3) return null;

  let sx = 0;
  let sx2 = 0;
  let sx3 = 0;
  let sx4 = 0;
  let sy = 0;
  let sxy = 0;
  let sx2y = 0;
  const n = points.length;

  for (const point of points) {
    const x = point.x;
    const y = point.y;
    const x2 = x * x;
    sx += x;
    sx2 += x2;
    sx3 += x2 * x;
    sx4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }

  const matrix = [
    [sx4, sx3, sx2, sx2y],
    [sx3, sx2, sx, sxy],
    [sx2, sx, n, sy],
  ];

  for (let i = 0; i < 3; i += 1) {
    let pivot = matrix[i][i];
    if (Math.abs(pivot) < 1e-12) {
      for (let j = i + 1; j < 3; j += 1) {
        if (Math.abs(matrix[j][i]) > 1e-12) {
          [matrix[i], matrix[j]] = [matrix[j], matrix[i]];
          pivot = matrix[i][i];
          break;
        }
      }
    }
    if (Math.abs(pivot) < 1e-12) return null;

    for (let col = i; col < 4; col += 1) {
      matrix[i][col] /= pivot;
    }

    for (let row = 0; row < 3; row += 1) {
      if (row === i) continue;
      const factor = matrix[row][i];
      for (let col = i; col < 4; col += 1) {
        matrix[row][col] -= factor * matrix[i][col];
      }
    }
  }

  return {
    a: Number(matrix[0][3].toFixed(12)),
    b: Number(matrix[1][3].toFixed(12)),
    c: Number(matrix[2][3].toFixed(12)),
  };
}

function buildCurveSample(
  coefficients: { a: number; b: number; c: number } | null,
  points: LetrasPoint[],
): { dtmDays: number; teaPercent: number }[] {
  if (!coefficients || points.length < 2) return [];
  const min = points[0].dtmDays;
  const max = points[points.length - 1].dtmDays;
  const total = 80;
  const sample: { dtmDays: number; teaPercent: number }[] = [];
  for (let i = 0; i < total; i += 1) {
    const x = min + ((max - min) * i) / (total - 1);
    const y = coefficients.a * x * x + coefficients.b * x + coefficients.c;
    sample.push({
      dtmDays: Number(x.toFixed(2)),
      teaPercent: Number(y.toFixed(4)),
    });
  }
  return sample;
}

async function fetchLetrasFromArgentinaDatos(): Promise<ArgentinaDatosLetra[]> {
  const base = argentinaDatosBaseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), argentinaDatosTimeoutMs);
  const response = await fetch(`${base}/v1/finanzas/letras`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    throw new Error(`ArgentinaDatos HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("ArgentinaDatos schema invalido para letras");
  }
  return payload as ArgentinaDatosLetra[];
}

function toResponse(snapshot: {
  tradingDate: Date;
  source: string;
  stale: boolean;
  fetchedAt: Date;
  curveA: number | null;
  curveB: number | null;
  curveC: number | null;
  instruments: Array<{
    ticker: string;
    fechaEmision: Date | null;
    fechaVencimiento: Date;
    dtmDays: number;
    temPercent: number | null;
    tnaPercent: number | null;
    teaPercent: number | null;
    vpv: number;
    price: number;
  }>;
}): LetrasCurveResponse {
  const points: LetrasPoint[] = snapshot.instruments.map((row) => ({
    ticker: row.ticker,
    fechaEmision: row.fechaEmision ? row.fechaEmision.toISOString().slice(0, 10) : null,
    fechaVencimiento: row.fechaVencimiento.toISOString().slice(0, 10),
    dtmDays: row.dtmDays,
    temPercent: row.temPercent,
    tnaPercent: row.tnaPercent,
    teaPercent: row.teaPercent,
    vpv: row.vpv,
    price: row.price,
  }));

  const coefficients =
    snapshot.curveA !== null && snapshot.curveB !== null && snapshot.curveC !== null
      ? {
          a: snapshot.curveA,
          b: snapshot.curveB,
          c: snapshot.curveC,
          points: Math.min(CURVE_POINTS, points.filter((point) => point.teaPercent !== null).length),
        }
      : null;

  return {
    updatedAt: snapshot.fetchedAt.toISOString(),
    tradingDate: snapshot.tradingDate.toISOString().slice(0, 10),
    source: "ArgentinaDatos",
    stale: snapshot.stale,
    total: points.length,
    points,
    curve: {
      coefficients,
      sample: buildCurveSample(
        coefficients ? { a: coefficients.a, b: coefficients.b, c: coefficients.c } : null,
        points,
      ),
    },
  };
}

export async function getLetrasCurveData(params?: { refresh?: boolean }): Promise<LetrasCurveResponse> {
  const now = new Date();
  const tradingDate = startOfUtcDay(now);
  const refresh = Boolean(params?.refresh);

  if (!refresh) {
    const existing = await prisma.letrasSnapshot.findUnique({
      where: { tradingDate },
      include: { instruments: { orderBy: { dtmDays: "asc" } } },
    });
    if (existing && hasUsableCurvePoints(existing.instruments)) {
      return toResponse(existing);
    }
  }

  try {
    const raw = await fetchLetrasFromArgentinaDatos();
    const points = parseAndNormalize(raw, now);
    if (!points.length) {
      throw new Error("ArgentinaDatos no devolvio letras activas validas");
    }

    const curveBase = pickCurveBasePoints(points)
      .filter((point) => point.teaPercent !== null)
      .map((point) => ({
        x: point.dtmDays,
        y: point.teaPercent as number,
      }));
    const coefficients = solveQuadraticRegression(curveBase);

    const snapshot = await prisma.$transaction(async (tx: any) => {
      const upserted = await tx.letrasSnapshot.upsert({
        where: { tradingDate },
        create: {
          tradingDate,
          source: "ArgentinaDatos",
          stale: false,
          curveA: coefficients?.a ?? null,
          curveB: coefficients?.b ?? null,
          curveC: coefficients?.c ?? null,
        },
        update: {
          source: "ArgentinaDatos",
          stale: false,
          fetchedAt: now,
          curveA: coefficients?.a ?? null,
          curveB: coefficients?.b ?? null,
          curveC: coefficients?.c ?? null,
          instruments: {
            deleteMany: {},
          },
        },
      });

      await tx.letrasInstrumentPoint.createMany({
        data: points.map((point) => ({
          snapshotId: upserted.id,
          ticker: point.ticker,
          fechaEmision: point.fechaEmision ? new Date(point.fechaEmision) : null,
          fechaVencimiento: new Date(point.fechaVencimiento),
          dtmDays: point.dtmDays,
          temPercent: point.temPercent,
          tnaPercent: point.tnaPercent,
          teaPercent: point.teaPercent,
          vpv: point.vpv,
          price: point.price,
        })),
      });

      return tx.letrasSnapshot.findUniqueOrThrow({
        where: { id: upserted.id },
        include: { instruments: { orderBy: { dtmDays: "asc" } } },
      });
    });

    return toResponse(snapshot);
  } catch (error) {
    console.error("[market][letras] Error refrescando curva de letras", error);
    const fallback = await prisma.letrasSnapshot.findFirst({
      orderBy: { tradingDate: "desc" },
      include: { instruments: { orderBy: { dtmDays: "asc" } } },
    });
    if (!fallback) throw error;

    return toResponse({
      ...fallback,
      stale: true,
    });
  }
}
