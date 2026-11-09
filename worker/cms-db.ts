// Inicialización de tablas y esquemas CMS en Cloudflare D1
// Soporta: team_members, area_presidents, cms_posts, cms_sponsors, contact_links, cms_assets, site_settings

import { D1Database } from "./types";

let tablesInitialized = false;

export async function initCmsTables(db: D1Database): Promise<void> {
  if (tablesInitialized) return;

  try {
    // 1. Integrantes del equipo
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        title TEXT NOT NULL,
        short_bio TEXT,
        image_url TEXT,
        profile_url TEXT,
        section TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).run();

    // 2. Línea de tiempo de Presidentes
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS area_presidents (
        id TEXT PRIMARY KEY,
        area TEXT NOT NULL,
        name TEXT NOT NULL,
        role_title TEXT NOT NULL,
        period TEXT NOT NULL,
        start_year INTEGER NOT NULL,
        end_year INTEGER,
        photo_url TEXT,
        bio TEXT NOT NULL,
        achievements_json TEXT NOT NULL DEFAULT '[]',
        linkedin_url TEXT,
        is_current INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).run();

    // 3. Publicaciones y Reportes
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS cms_posts (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        title TEXT NOT NULL,
        summary TEXT,
        body TEXT,
        type TEXT NOT NULL DEFAULT 'NEWSLETTER',
        section TEXT NOT NULL DEFAULT 'NEWSLETTER',
        status TEXT NOT NULL DEFAULT 'PUBLISHED',
        is_featured INTEGER NOT NULL DEFAULT 0,
        assets_json TEXT NOT NULL DEFAULT '[]',
        authors_text TEXT,
        event_date TEXT,
        registration_url TEXT,
        published_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).run();

    // 4. Sponsors y Aliados
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS cms_sponsors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo_url TEXT,
        description TEXT,
        link_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).run();

    // 5. Enlaces de Contacto y Canales Oficiales
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS contact_links (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        value TEXT,
        href TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).run();

    // 6. Almacenamiento de Assets/Fotos (Base64 Binary)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS cms_assets (
        id TEXT PRIMARY KEY,
        filename TEXT,
        mime_type TEXT NOT NULL,
        data_base64 TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).run();

    // 7. Configuración general del sitio ("El club en números", "Gracias por confiar", "Footer")
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).run();

    tablesInitialized = true;
  } catch (err) {
    console.error("[CMS DB] Error inicializando tablas:", err);
  }
}
