// Módulo de Autenticación de Grupos Oficiales - Club de Finanzas UBA
// Credenciales hardcodeadas requeridas por Allianz

export interface GroupConfig {
  id: string;
  name: string;
  password: string;
  assignedAsset: string;
}

export const OFFICIAL_GROUPS: Record<string, GroupConfig> = {
  grupo_1: {
    id: "grupo_1",
    name: "Grupo 1",
    password: "Bitcoin",
    assignedAsset: "BTC-USD",
  },
  grupo_2: {
    id: "grupo_2",
    name: "Grupo 2",
    password: "Ethereum",
    assignedAsset: "ETH-USD",
  },
  grupo_3: {
    id: "grupo_3",
    name: "Grupo 3",
    password: "GGAL",
    assignedAsset: "GGAL",
  },
  grupo_4: {
    id: "grupo_4",
    name: "Grupo 4",
    password: "YPF",
    assignedAsset: "YPF",
  },
  grupo_5: {
    id: "grupo_5",
    name: "Grupo 5",
    password: "AAPL",
    assignedAsset: "AAPL",
  },
  grupo_6: {
    id: "grupo_6",
    name: "Grupo 6",
    password: "GOOG",
    assignedAsset: "GOOG",
  },
  allianz: {
    id: "allianz",
    name: "Allianz",
    password: "LuciaSape",
    assignedAsset: "SPY",
  },
};

/**
 * Normaliza el identificador de grupo para admitir:
 * "Grupo1", "Grupo 1", "grupo1", "GRUPO 1", "Allianz", etc.
 */
export function normalizeGroupId(input: string): string | null {
  if (!input) return null;
  const clean = input.toLowerCase().replace(/[\s\-_]/g, "");
  
  if (clean === "grupo1" || clean === "1" || clean === "g1") return "grupo_1";
  if (clean === "grupo2" || clean === "2" || clean === "g2") return "grupo_2";
  if (clean === "grupo3" || clean === "3" || clean === "g3") return "grupo_3";
  if (clean === "grupo4" || clean === "4" || clean === "g4") return "grupo_4";
  if (clean === "grupo5" || clean === "5" || clean === "g5") return "grupo_5";
  if (clean === "grupo6" || clean === "6" || clean === "g6") return "grupo_6";
  if (clean === "allianz") return "allianz";
  
  return null;
}

/**
 * Verifica usuario y contraseña hardcodeados de los grupos y Allianz
 */
export function authenticateGroupCredentials(
  userInput: string,
  passInput: string
): { success: boolean; group?: GroupConfig; error?: string } {
  const normId = normalizeGroupId(userInput);
  if (!normId || !OFFICIAL_GROUPS[normId]) {
    return {
      success: false,
      error: "Usuario o grupo no reconocido.",
    };
  }

  const group = OFFICIAL_GROUPS[normId];
  const trimmedPass = (passInput || "").trim();

  if (trimmedPass !== group.password) {
    return {
      success: false,
      error: "Contraseña incorrecta para " + group.name + ".",
    };
  }

  return {
    success: true,
    group,
  };
}

/**
 * Genera un token de sesión para el grupo
 */
export async function createGroupSessionToken(groupId: string): Promise<string> {
  const payload = `${groupId}:${Date.now()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(payload + ":allianz_uba_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${groupId}.${btoa(payload)}.${hashHex.slice(0, 16)}`;
}

/**
 * Valida un token de sesión
 */
export function verifyGroupToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const groupId = parts[0];
  if (OFFICIAL_GROUPS[groupId]) {
    return groupId;
  }
  return null;
}
