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
  DB: D1Database;
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al procesar registro en D1";
        return new Response(
          JSON.stringify({ success: false, error: message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 2. API: Consulta de Miembro Actual
    if (url.pathname === "/api/members/me" && request.method === "GET") {
      const email = url.searchParams.get("email")?.trim().toLowerCase();
      if (!email) {
        return new Response(JSON.stringify({ member: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const member = await env.DB.prepare(
        "SELECT id, full_name, email, phone, created_at FROM members WHERE email = ?"
      )
        .bind(email)
        .first<MemberRecord>();

      if (!member) {
        return new Response(JSON.stringify({ member: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          member: {
            id: member.id,
            fullName: member.full_name,
            email: member.email,
            phone: member.phone,
            createdAt: member.created_at,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. API: Health Check
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          ok: true,
          platform: "cloudflare-workers-d1",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Servir los archivos estáticos de Next.js desde ASSETS
    return env.ASSETS.fetch(request);
  },
};
