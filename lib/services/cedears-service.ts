import { promises as fs } from "node:fs";
import path from "node:path";
import type { CedearItem, CedearsResponse } from "../types";

const CSV_PATH = path.resolve(process.cwd(), "data/byma-cedears.csv");

let cache: CedearItem[] | null = null;
let cacheUpdatedAt: string | null = null;
let cacheMtimeMs = 0;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

async function loadCedearsRows(): Promise<CedearItem[]> {
  try {
    const stats = await fs.stat(CSV_PATH);
    if (cache && stats.mtimeMs === cacheMtimeMs) {
      return cache;
    }

    const content = await fs.readFile(CSV_PATH, "utf-8");
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      cache = [];
      cacheUpdatedAt = stats.mtime.toISOString();
      cacheMtimeMs = stats.mtimeMs;
      return cache;
    }

    const rows = lines.slice(1).map((line) => {
      const [companyName = "", bymaCode = "", listedMarket = "", ratio = ""] = parseCsvLine(line);
      return {
        companyName,
        bymaCode,
        listedMarket,
        ratio,
      };
    });

    const cleanedRows = rows.filter((row) => {
      const company = row.companyName.trim();
      const ticker = row.bymaCode.trim();
      const market = row.listedMarket.trim();
      const ratio = row.ratio.trim();

      if (company.toUpperCase().startsWith("EXCHANGE")) {
        return false;
      }

      return Boolean(company && ticker && market && ratio);
    });

    cache = cleanedRows;
    cacheUpdatedAt = stats.mtime.toISOString();
    cacheMtimeMs = stats.mtimeMs;
    return cleanedRows;
  } catch (error) {
    console.error("[CEDEARs Service] Error al leer byma-cedears.csv:", error);
    return [];
  }
}

export async function getCedearsData(params?: {
  search?: string;
  market?: string;
  limit?: number;
}): Promise<CedearsResponse> {
  const rows = await loadCedearsRows();
  const search = params?.search?.trim().toLowerCase() ?? "";
  const market = params?.market?.trim().toLowerCase() ?? "";
  const limit = Math.max(1, Math.min(params?.limit ?? 1000, 2000));

  const markets = Array.from(new Set(rows.map((row) => row.listedMarket))).sort((a, b) =>
    a.localeCompare(b),
  );

  const filtered = rows.filter((row) => {
    const ticker = row.bymaCode.trim();
    if (!ticker) return false;

    const searchMatch =
      !search ||
      row.companyName.toLowerCase().includes(search) ||
      row.bymaCode.toLowerCase().includes(search);
    const marketMatch = !market || row.listedMarket.toLowerCase() === market;
    return searchMatch && marketMatch;
  });

  return {
    updatedAt: cacheUpdatedAt ?? new Date().toISOString(),
    total: filtered.length,
    markets,
    items: filtered.slice(0, limit),
  };
}
