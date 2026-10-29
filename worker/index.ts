export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<{ success: boolean; meta?: unknown }>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface Env {
  DB?: D1Database;
  ASSETS: Fetcher;
}

interface RegisterBody {
  fullName?: string;
  email?: string;
  phone?: string;
}

interface MemberRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. API: Registro de Miembros en Cloudflare D1
    if (url.pathname === "/api/members/register" && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Base de datos D1 no vinculada aún. Por favor configura el database_id en wrangler.toml.",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }

        const body = (await request.json()) as RegisterBody;
        const fullName = body.fullName?.trim();
        const email = body.email?.trim().toLowerCase();
        const phone = body.phone?.trim();

        if (!fullName || !email || !phone) {
          return new Response(
            JSON.stringify({ success: false, error: "Nombre y apellido, email y teléfono son obligatorios." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Validación básica de email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(
            JSON.stringify({ success: false, error: "El formato de correo electrónico no es válido." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Consultar si ya existe en D1
        const existing = await env.DB.prepare(
          "SELECT id, full_name, email, phone, created_at FROM members WHERE email = ?"
        )
          .bind(email)
          .first<MemberRecord>();

        if (existing) {
          return new Response(
            JSON.stringify({
              success: true,
              message: "Miembro ya registrado.",
              member: {
                id: existing.id,
                fullName: existing.full_name,
                email: existing.email,
                phone: existing.phone,
                createdAt: existing.created_at,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Insertar nuevo registro en Cloudflare D1
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        await env.DB.prepare(
          "INSERT INTO members (id, full_name, email, phone, created_at) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(id, fullName, email, phone, createdAt)
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            message: "Registro completado exitosamente en Cloudflare D1.",
            member: {
              id,
              fullName,
              email,
              phone,
              createdAt,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al procesar el registro en D1.",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Servir activos estáticos de Next.js mediante Cloudflare Assets
    return env.ASSETS.fetch(request);
  },
};
