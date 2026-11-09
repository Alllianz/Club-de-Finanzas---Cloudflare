// Handlers REST y CRUD para el CMS del Club de Finanzas UBA
// Conexión directa a Cloudflare D1 (team_members, area_presidents, cms_posts, cms_sponsors, contact_links, cms_assets, site_settings)

import { Env } from "./types";
import { initCmsTables } from "./cms-db";

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-group-token",
      ...extraHeaders,
    },
  });
}

function generateId(prefix = "item") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Helper para convertir base64 a Uint8Array en Worker
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function handleCmsRoutes(
  request: Request,
  env: Env,
  url: URL,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const pathname = url.pathname;
  const method = request.method;

  // Servir activos de imagen cargados en D1 (/api/assets/:id)
  if (pathname.startsWith("/api/assets/") && method === "GET") {
    if (!env.DB) return new Response("DB Not Found", { status: 500 });
    await initCmsTables(env.DB);
    const assetId = pathname.replace("/api/assets/", "");
    const row = await env.DB.prepare("SELECT * FROM cms_assets WHERE id = ?").bind(assetId).first<{
      id: string;
      mime_type: string;
      data_base64: string;
    }>();

    if (!row) {
      return new Response("Asset not found", { status: 404 });
    }

    try {
      const bytes = base64ToUint8Array(row.data_base64);
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": row.mime_type || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      return new Response("Error decoding asset", { status: 500 });
    }
  }

  // Comprobar si la ruta pertenece a las APIs CMS
  if (
    !pathname.startsWith("/api/admin/v2/") &&
    !pathname.startsWith("/api/public/v2/")
  ) {
    return null;
  }

  if (!env.DB) {
    return jsonResponse({ error: "Base de datos D1 no configurada." }, 500);
  }

  // Asegurar que las tablas existan
  await initCmsTables(env.DB);

  // =========================================================================
  // 1. SUBIDA DE ARCHIVOS Y FOTOS (/api/admin/v2/uploads)
  // =========================================================================
  if (pathname === "/api/admin/v2/uploads" && method === "POST") {
    try {
      const contentType = request.headers.get("content-type") || "";
      let mimeType = "image/jpeg";
      let filename = "upload.jpg";
      let base64Data = "";
      let kind = "image";

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file");
        kind = String(formData.get("kind") || "image");

        if (file && typeof file === "object" && "arrayBuffer" in file) {
          const fileObj = file as File;
          filename = fileObj.name || filename;
          mimeType = fileObj.type || (kind === "pdf" ? "application/pdf" : "image/jpeg");
          const buffer = await fileObj.arrayBuffer();
          // Convertir ArrayBuffer a base64
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          base64Data = btoa(binary);
        } else {
          return jsonResponse({ error: "Archivo no recibido en el formulario." }, 400);
        }
      } else {
        const body = (await request.json().catch(() => ({}))) as {
          data?: string;
          mimeType?: string;
          filename?: string;
          kind?: string;
        };
        kind = body.kind || "image";
        filename = body.filename || filename;
        mimeType = body.mimeType || (kind === "pdf" ? "application/pdf" : "image/jpeg");
        base64Data = body.data || "";
        if (base64Data.includes("base64,")) {
          base64Data = base64Data.split("base64,")[1];
        }
      }

      if (!base64Data) {
        return jsonResponse({ error: "Datos del archivo vacíos." }, 400);
      }

      const assetId = generateId("ast");
      await env.DB.prepare(
        "INSERT INTO cms_assets (id, filename, mime_type, data_base64) VALUES (?, ?, ?, ?)"
      )
        .bind(assetId, filename, mimeType, base64Data)
        .run();

      const assetUrl = `/api/assets/${assetId}`;

      return jsonResponse({
        success: true,
        asset: {
          id: assetId,
          url: assetUrl,
          filename,
          mimeType,
          kind,
        },
      });
    } catch (err) {
      console.error("[Upload] Error procesando archivo:", err);
      return jsonResponse(
        { error: err instanceof Error ? err.message : "Error al procesar subida de archivo." },
        500
      );
    }
  }

  // =========================================================================
  // 2. INTEGRANTES DEL EQUIPO (/api/admin/v2/team-members & /api/public/v2/team-members)
  // =========================================================================
  if (pathname === "/api/admin/v2/team-members") {
    if (method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM team_members ORDER BY display_order ASC, created_at ASC"
      ).all<{
        id: string;
        full_name: string;
        title: string;
        short_bio: string | null;
        image_url: string | null;
        profile_url: string | null;
        section: string;
        display_order: number;
        is_active: number;
        created_at: string;
        updated_at: string;
      }>();

      const items = (results || []).map((r) => ({
        id: r.id,
        fullName: r.full_name,
        title: r.title,
        shortBio: r.short_bio,
        imageUrl: r.image_url,
        profileUrl: r.profile_url,
        section: r.section,
        displayOrder: r.display_order,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      return jsonResponse({ items });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const fullName = String(body.fullName || "").trim();
      const title = String(body.title || "").trim();
      if (!fullName || !title) {
        return jsonResponse({ error: "Nombre completo y cargo requeridos." }, 400);
      }

      const id = generateId("tm");
      const section = body.section || "LEADERSHIP";
      const shortBio = body.shortBio || null;
      const imageUrl = body.imageUrl || null;
      const profileUrl = body.profileUrl || null;
      const displayOrder = Number(body.displayOrder || 0);
      const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1;

      await env.DB.prepare(`
        INSERT INTO team_members (id, full_name, title, short_bio, image_url, profile_url, section, display_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(id, fullName, title, shortBio, imageUrl, profileUrl, section, displayOrder, isActive)
        .run();

      return jsonResponse(
        {
          item: {
            id,
            fullName,
            title,
            shortBio,
            imageUrl,
            profileUrl,
            section,
            displayOrder,
            isActive: Boolean(isActive),
          },
        },
        201
      );
    }
  }

  if (pathname.startsWith("/api/admin/v2/team-members/") && (method === "PATCH" || method === "DELETE")) {
    const id = pathname.replace("/api/admin/v2/team-members/", "");

    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM team_members WHERE id = ?").bind(id).run();
      return jsonResponse({ success: true, message: "Integrante eliminado." });
    }

    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as any;
      const current = await env.DB.prepare("SELECT * FROM team_members WHERE id = ?").bind(id).first<any>();
      if (!current) return jsonResponse({ error: "Integrante no encontrado." }, 404);

      const fullName = body.fullName !== undefined ? String(body.fullName).trim() : current.full_name;
      const title = body.title !== undefined ? String(body.title).trim() : current.title;
      const shortBio = body.shortBio !== undefined ? body.shortBio : current.short_bio;
      const imageUrl = body.imageUrl !== undefined ? body.imageUrl : current.image_url;
      const profileUrl = body.profileUrl !== undefined ? body.profileUrl : current.profile_url;
      const section = body.section !== undefined ? body.section : current.section;
      const displayOrder = body.displayOrder !== undefined ? Number(body.displayOrder) : current.display_order;
      const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : current.is_active;

      await env.DB.prepare(`
        UPDATE team_members SET
          full_name = ?, title = ?, short_bio = ?, image_url = ?, profile_url = ?,
          section = ?, display_order = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
        .bind(fullName, title, shortBio, imageUrl, profileUrl, section, displayOrder, isActive, id)
        .run();

      return jsonResponse({
        item: {
          id,
          fullName,
          title,
          shortBio,
          imageUrl,
          profileUrl,
          section,
          displayOrder,
          isActive: Boolean(isActive),
        },
      });
    }
  }

  if (pathname === "/api/public/v2/team-members" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM team_members WHERE is_active = 1 ORDER BY display_order ASC, created_at ASC"
    ).all<any>();

    const items = (results || []).map((r) => ({
      id: r.id,
      fullName: r.full_name,
      title: r.title,
      shortBio: r.short_bio,
      imageUrl: r.image_url,
      profileUrl: r.profile_url,
      section: r.section,
      displayOrder: r.display_order,
      isActive: true,
    }));

    const grouped = {
      leadership: items.filter((i) => i.section === "LEADERSHIP"),
      portfolio: items.filter((i) => i.section === "PORTFOLIO"),
      research: items.filter((i) => i.section === "RESEARCH"),
      rrii: items.filter((i) => i.section === "RRII"),
    };

    return jsonResponse({ items, grouped });
  }

  // =========================================================================
  // 3. LÍNEA DE TIEMPO DE PRESIDENTES (/api/admin/v2/presidents & /api/public/v2/presidents)
  // =========================================================================
  if (pathname === "/api/admin/v2/presidents") {
    if (method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM area_presidents ORDER BY display_order ASC, start_year DESC"
      ).all<any>();

      const items = (results || []).map((r) => ({
        id: r.id,
        area: r.area,
        name: r.name,
        roleTitle: r.role_title,
        period: r.period,
        startYear: r.start_year,
        endYear: r.end_year,
        photoUrl: r.photo_url,
        bio: r.bio,
        achievements: JSON.parse(r.achievements_json || "[]"),
        linkedinUrl: r.linkedin_url,
        isCurrent: Boolean(r.is_current),
        displayOrder: r.display_order,
        createdAt: r.created_at,
      }));

      return jsonResponse({ items });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const name = String(body.name || "").trim();
      const area = String(body.area || "PORTFOLIO").toUpperCase();
      const roleTitle = String(body.roleTitle || "").trim();
      const period = String(body.period || "").trim();

      if (!name || !roleTitle || !period) {
        return jsonResponse({ error: "Nombre, cargo y período requeridos." }, 400);
      }

      const id = generateId("pres");
      const startYear = Number(body.startYear || new Date().getFullYear());
      const endYear = body.endYear !== undefined && body.endYear !== null ? Number(body.endYear) : null;
      const photoUrl = body.photoUrl || null;
      const bio = String(body.bio || "");
      const achievements = Array.isArray(body.achievements) ? body.achievements : [];
      const linkedinUrl = body.linkedinUrl || null;
      const isCurrent = body.isCurrent ? 1 : 0;
      const displayOrder = Number(body.displayOrder || 0);

      await env.DB.prepare(`
        INSERT INTO area_presidents (
          id, area, name, role_title, period, start_year, end_year,
          photo_url, bio, achievements_json, linkedin_url, is_current, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          id,
          area,
          name,
          roleTitle,
          period,
          startYear,
          endYear,
          photoUrl,
          bio,
          JSON.stringify(achievements),
          linkedinUrl,
          isCurrent,
          displayOrder
        )
        .run();

      return jsonResponse(
        {
          item: {
            id,
            area,
            name,
            roleTitle,
            period,
            startYear,
            endYear,
            photoUrl,
            bio,
            achievements,
            linkedinUrl,
            isCurrent: Boolean(isCurrent),
            displayOrder,
          },
        },
        201
      );
    }
  }

  if (pathname.startsWith("/api/admin/v2/presidents/") && (method === "PATCH" || method === "DELETE")) {
    const id = pathname.replace("/api/admin/v2/presidents/", "");

    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM area_presidents WHERE id = ?").bind(id).run();
      return jsonResponse({ success: true, message: "Presidente eliminado." });
    }

    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as any;
      const cur = await env.DB.prepare("SELECT * FROM area_presidents WHERE id = ?").bind(id).first<any>();
      if (!cur) return jsonResponse({ error: "Presidente no encontrado." }, 404);

      const area = body.area !== undefined ? body.area : cur.area;
      const name = body.name !== undefined ? body.name : cur.name;
      const roleTitle = body.roleTitle !== undefined ? body.roleTitle : cur.role_title;
      const period = body.period !== undefined ? body.period : cur.period;
      const startYear = body.startYear !== undefined ? Number(body.startYear) : cur.start_year;
      const endYear = body.endYear !== undefined ? body.endYear : cur.end_year;
      const photoUrl = body.photoUrl !== undefined ? body.photoUrl : cur.photo_url;
      const bio = body.bio !== undefined ? body.bio : cur.bio;
      const achievements = body.achievements !== undefined ? body.achievements : JSON.parse(cur.achievements_json || "[]");
      const linkedinUrl = body.linkedinUrl !== undefined ? body.linkedinUrl : cur.linkedin_url;
      const isCurrent = body.isCurrent !== undefined ? (body.isCurrent ? 1 : 0) : cur.is_current;
      const displayOrder = body.displayOrder !== undefined ? Number(body.displayOrder) : cur.display_order;

      await env.DB.prepare(`
        UPDATE area_presidents SET
          area = ?, name = ?, role_title = ?, period = ?, start_year = ?, end_year = ?,
          photo_url = ?, bio = ?, achievements_json = ?, linkedin_url = ?, is_current = ?, display_order = ?
        WHERE id = ?
      `)
        .bind(
          area,
          name,
          roleTitle,
          period,
          startYear,
          endYear,
          photoUrl,
          bio,
          JSON.stringify(achievements),
          linkedinUrl,
          isCurrent,
          displayOrder,
          id
        )
        .run();

      return jsonResponse({
        item: {
          id,
          area,
          name,
          roleTitle,
          period,
          startYear,
          endYear,
          photoUrl,
          bio,
          achievements,
          linkedinUrl,
          isCurrent: Boolean(isCurrent),
          displayOrder,
        },
      });
    }
  }

  if (pathname === "/api/public/v2/presidents" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM area_presidents ORDER BY display_order ASC, start_year DESC"
    ).all<any>();

    const items = (results || []).map((r) => ({
      id: r.id,
      area: r.area,
      name: r.name,
      roleTitle: r.role_title,
      period: r.period,
      startYear: r.start_year,
      endYear: r.end_year,
      photoUrl: r.photo_url,
      bio: r.bio,
      achievements: JSON.parse(r.achievements_json || "[]"),
      linkedinUrl: r.linkedin_url,
      isCurrent: Boolean(r.is_current),
      displayOrder: r.display_order,
    }));

    return jsonResponse({ items });
  }

  // =========================================================================
  // 4. CONFIGURACIÓN DEL SITIO ("El Club en números", Sponsors con texto, Canales, Footer)
  // =========================================================================
  if (pathname === "/api/admin/v2/site-content") {
    if (method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM site_settings").all<{
        key: string;
        value_json: string;
      }>();

      const data: Record<string, any> = {};
      (results || []).forEach((row) => {
        try {
          data[row.key] = JSON.parse(row.value_json);
        } catch {
          data[row.key] = null;
        }
      });

      return jsonResponse({
        clubStats: data.club_stats || null,
        sponsorsTrust: data.sponsors_trust || null,
        officialChannels: data.official_channels || null,
        footerDisclaimer: data.footer_disclaimer || null,
      });
    }

    if (method === "PUT" || method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;

      if (body.clubStats !== undefined) {
        await env.DB.prepare(
          "INSERT INTO site_settings (key, value_json, updated_at) VALUES ('club_stats', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
        )
          .bind(JSON.stringify(body.clubStats))
          .run();
      }

      if (body.sponsorsTrust !== undefined) {
        await env.DB.prepare(
          "INSERT INTO site_settings (key, value_json, updated_at) VALUES ('sponsors_trust', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
        )
          .bind(JSON.stringify(body.sponsorsTrust))
          .run();
      }

      if (body.officialChannels !== undefined) {
        await env.DB.prepare(
          "INSERT INTO site_settings (key, value_json, updated_at) VALUES ('official_channels', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
        )
          .bind(JSON.stringify(body.officialChannels))
          .run();
      }

      if (body.footerDisclaimer !== undefined) {
        await env.DB.prepare(
          "INSERT INTO site_settings (key, value_json, updated_at) VALUES ('footer_disclaimer', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
        )
          .bind(JSON.stringify(body.footerDisclaimer))
          .run();
      }

      return jsonResponse({ success: true, message: "Contenido del sitio actualizado." });
    }
  }

  if (pathname === "/api/public/v2/site-content" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM site_settings").all<{
      key: string;
      value_json: string;
    }>();

    const data: Record<string, any> = {};
    (results || []).forEach((row) => {
      try {
        data[row.key] = JSON.parse(row.value_json);
      } catch {
        data[row.key] = null;
      }
    });

    return jsonResponse({
      clubStats: data.club_stats || null,
      sponsorsTrust: data.sponsors_trust || null,
      officialChannels: data.official_channels || null,
      footerDisclaimer: data.footer_disclaimer || null,
    });
  }

  // =========================================================================
  // 5. PUBLICACIONES & REPORTES (/api/admin/v2/posts & /api/public/v2/posts)
  // =========================================================================
  if (pathname === "/api/admin/v2/posts") {
    if (method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM cms_posts ORDER BY created_at DESC"
      ).all<any>();

      const items = (results || []).map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        body: r.body,
        type: r.type,
        section: r.section,
        status: r.status,
        isFeatured: Boolean(r.is_featured),
        assets: JSON.parse(r.assets_json || "[]"),
        authorsText: r.authors_text,
        eventDate: r.event_date,
        registrationUrl: r.registration_url,
        publishedAt: r.published_at || r.created_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      return jsonResponse({ items });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const title = String(body.title || "").trim();
      if (!title) return jsonResponse({ error: "Título de publicación requerido." }, 400);

      const id = generateId("post");
      const slug = (
        body.slug ||
        title
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "") + `-${Date.now().toString(36)}`
      );
      const summary = String(body.summary || "");
      const postBody = String(body.body || "");
      const type = String(body.type || "NEWSLETTER");
      const section = String(body.section || "NEWSLETTER");
      const status = String(body.status || "PUBLISHED");
      const isFeatured = body.isFeatured ? 1 : 0;
      const assets = Array.isArray(body.assets) ? body.assets : [];
      const authorsText = String(body.authorsText || "");
      const eventDate = body.eventDate || null;
      const registrationUrl = body.registrationUrl || null;
      const publishedAt = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO cms_posts (
          id, slug, title, summary, body, type, section, status,
          is_featured, assets_json, authors_text, event_date, registration_url, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          id,
          slug,
          title,
          summary,
          postBody,
          type,
          section,
          status,
          isFeatured,
          JSON.stringify(assets),
          authorsText,
          eventDate,
          registrationUrl,
          publishedAt
        )
        .run();

      return jsonResponse(
        {
          item: {
            id,
            slug,
            title,
            summary,
            body: postBody,
            type,
            section,
            status,
            isFeatured: Boolean(isFeatured),
            assets,
            authorsText,
            eventDate,
            registrationUrl,
            publishedAt,
          },
        },
        201
      );
    }
  }

  if (pathname.startsWith("/api/admin/v2/posts/") && (method === "PATCH" || method === "DELETE")) {
    const id = pathname.replace("/api/admin/v2/posts/", "");

    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM cms_posts WHERE id = ?").bind(id).run();
      return jsonResponse({ success: true, message: "Publicación eliminada." });
    }

    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as any;
      const cur = await env.DB.prepare("SELECT * FROM cms_posts WHERE id = ?").bind(id).first<any>();
      if (!cur) return jsonResponse({ error: "Publicación no encontrada." }, 404);

      const title = body.title !== undefined ? body.title : cur.title;
      const summary = body.summary !== undefined ? body.summary : cur.summary;
      const postBody = body.body !== undefined ? body.body : cur.body;
      const type = body.type !== undefined ? body.type : cur.type;
      const section = body.section !== undefined ? body.section : cur.section;
      const status = body.status !== undefined ? body.status : cur.status;
      const isFeatured = body.isFeatured !== undefined ? (body.isFeatured ? 1 : 0) : cur.is_featured;
      const assets = body.assets !== undefined ? body.assets : JSON.parse(cur.assets_json || "[]");
      const authorsText = body.authorsText !== undefined ? body.authorsText : cur.authors_text;
      const eventDate = body.eventDate !== undefined ? body.eventDate : cur.event_date;
      const registrationUrl = body.registrationUrl !== undefined ? body.registrationUrl : cur.registration_url;

      await env.DB.prepare(`
        UPDATE cms_posts SET
          title = ?, summary = ?, body = ?, type = ?, section = ?, status = ?,
          is_featured = ?, assets_json = ?, authors_text = ?, event_date = ?,
          registration_url = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
        .bind(
          title,
          summary,
          postBody,
          type,
          section,
          status,
          isFeatured,
          JSON.stringify(assets),
          authorsText,
          eventDate,
          registrationUrl,
          id
        )
        .run();

      return jsonResponse({
        item: {
          id,
          title,
          summary,
          body: postBody,
          type,
          section,
          status,
          isFeatured: Boolean(isFeatured),
          assets,
          authorsText,
          eventDate,
          registrationUrl,
        },
      });
    }
  }

  if (pathname === "/api/public/v2/posts" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM cms_posts WHERE status = 'PUBLISHED' ORDER BY created_at DESC"
    ).all<any>();

    const items = (results || []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      body: r.body,
      type: r.type,
      section: r.section,
      status: r.status,
      isFeatured: Boolean(r.is_featured),
      assets: JSON.parse(r.assets_json || "[]"),
      authorsText: r.authors_text,
      eventDate: r.event_date,
      registrationUrl: r.registration_url,
      publishedAt: r.published_at || r.created_at,
    }));

    return jsonResponse({ items, total: items.length });
  }

  // =========================================================================
  // 6. SPONSORS Y ALIADOS (/api/admin/v2/sponsors & /api/public/v2/sponsors)
  // =========================================================================
  if (pathname === "/api/admin/v2/sponsors") {
    if (method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM cms_sponsors ORDER BY sort_order ASC, created_at ASC"
      ).all<any>();

      const items = (results || []).map((r) => ({
        id: r.id,
        name: r.name,
        logoUrl: r.logo_url,
        description: r.description,
        linkUrl: r.link_url,
        sortOrder: r.sort_order,
        isActive: Boolean(r.is_active),
      }));

      return jsonResponse({ items });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const name = String(body.name || "").trim();
      if (!name) return jsonResponse({ error: "Nombre de sponsor requerido." }, 400);

      const id = generateId("sp");
      const logoUrl = body.logoUrl || null;
      const description = body.description || null;
      const linkUrl = body.linkUrl || null;
      const sortOrder = Number(body.sortOrder || 0);
      const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1;

      await env.DB.prepare(`
        INSERT INTO cms_sponsors (id, name, logo_url, description, link_url, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(id, name, logoUrl, description, linkUrl, sortOrder, isActive)
        .run();

      return jsonResponse(
        {
          item: {
            id,
            name,
            logoUrl,
            description,
            linkUrl,
            sortOrder,
            isActive: Boolean(isActive),
          },
        },
        201
      );
    }
  }

  if (pathname.startsWith("/api/admin/v2/sponsors/") && (method === "PATCH" || method === "DELETE")) {
    const id = pathname.replace("/api/admin/v2/sponsors/", "");

    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM cms_sponsors WHERE id = ?").bind(id).run();
      return jsonResponse({ success: true, message: "Sponsor eliminado." });
    }

    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as any;
      const cur = await env.DB.prepare("SELECT * FROM cms_sponsors WHERE id = ?").bind(id).first<any>();
      if (!cur) return jsonResponse({ error: "Sponsor no encontrado." }, 404);

      const name = body.name !== undefined ? body.name : cur.name;
      const logoUrl = body.logoUrl !== undefined ? body.logoUrl : cur.logo_url;
      const description = body.description !== undefined ? body.description : cur.description;
      const linkUrl = body.linkUrl !== undefined ? body.linkUrl : cur.link_url;
      const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : cur.sort_order;
      const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : cur.is_active;

      await env.DB.prepare(`
        UPDATE cms_sponsors SET
          name = ?, logo_url = ?, description = ?, link_url = ?, sort_order = ?, is_active = ?
        WHERE id = ?
      `)
        .bind(name, logoUrl, description, linkUrl, sortOrder, isActive, id)
        .run();

      return jsonResponse({
        item: {
          id,
          name,
          logoUrl,
          description,
          linkUrl,
          sortOrder,
          isActive: Boolean(isActive),
        },
      });
    }
  }

  if (pathname === "/api/public/v2/sponsors" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM cms_sponsors WHERE is_active = 1 ORDER BY sort_order ASC"
    ).all<any>();

    const items = (results || []).map((r) => ({
      id: r.id,
      name: r.name,
      logoUrl: r.logo_url,
      description: r.description,
      linkUrl: r.link_url,
      sortOrder: r.sort_order,
      isActive: true,
    }));

    return jsonResponse({ items });
  }

  // =========================================================================
  // 7. CANALES OFICIALES & LINKS (/api/admin/v2/contact-links & /api/public/v2/contact-links)
  // =========================================================================
  if (pathname === "/api/admin/v2/contact-links") {
    if (method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM contact_links ORDER BY sort_order ASC, created_at ASC"
      ).all<any>();

      const items = (results || []).map((r) => ({
        id: r.id,
        kind: r.kind,
        label: r.label,
        value: r.value,
        href: r.href,
        sortOrder: r.sort_order,
        isActive: Boolean(r.is_active),
      }));

      return jsonResponse({ items });
    }

    if (method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const label = String(body.label || "").trim();
      const href = String(body.href || "").trim();
      if (!label || !href) return jsonResponse({ error: "Etiqueta y enlace URL requeridos." }, 400);

      const id = generateId("lnk");
      const kind = String(body.kind || "OTHER");
      const value = body.value || null;
      const sortOrder = Number(body.sortOrder || 0);
      const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1;

      await env.DB.prepare(`
        INSERT INTO contact_links (id, kind, label, value, href, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(id, kind, label, value, href, sortOrder, isActive)
        .run();

      return jsonResponse(
        {
          item: {
            id,
            kind,
            label,
            value,
            href,
            sortOrder,
            isActive: Boolean(isActive),
          },
        },
        201
      );
    }
  }

  if (pathname.startsWith("/api/admin/v2/contact-links/") && (method === "PATCH" || method === "DELETE")) {
    const id = pathname.replace("/api/admin/v2/contact-links/", "");

    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM contact_links WHERE id = ?").bind(id).run();
      return jsonResponse({ success: true, message: "Enlace eliminado." });
    }

    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as any;
      const cur = await env.DB.prepare("SELECT * FROM contact_links WHERE id = ?").bind(id).first<any>();
      if (!cur) return jsonResponse({ error: "Enlace no encontrado." }, 404);

      const kind = body.kind !== undefined ? body.kind : cur.kind;
      const label = body.label !== undefined ? body.label : cur.label;
      const value = body.value !== undefined ? body.value : cur.value;
      const href = body.href !== undefined ? body.href : cur.href;
      const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : cur.sort_order;
      const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : cur.is_active;

      await env.DB.prepare(`
        UPDATE contact_links SET
          kind = ?, label = ?, value = ?, href = ?, sort_order = ?, is_active = ?
        WHERE id = ?
      `)
        .bind(kind, label, value, href, sortOrder, isActive, id)
        .run();

      return jsonResponse({
        item: {
          id,
          kind,
          label,
          value,
          href,
          sortOrder,
          isActive: Boolean(isActive),
        },
      });
    }
  }

  if (pathname === "/api/public/v2/contact-links" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM contact_links WHERE is_active = 1 ORDER BY sort_order ASC"
    ).all<any>();

    const items = (results || []).map((r) => ({
      id: r.id,
      kind: r.kind,
      label: r.label,
      value: r.value,
      href: r.href,
      sortOrder: r.sort_order,
      isActive: true,
    }));

    return jsonResponse({ items });
  }

  // =========================================================================
  // 8. ENDPOINT PÚBLICO COMPUESTO HOME (/api/public/v2/home)
  // =========================================================================
  if (pathname === "/api/public/v2/home" && method === "GET") {
    const { results: posts } = await env.DB.prepare(
      "SELECT * FROM cms_posts WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 10"
    ).all<any>();

    const { results: sponsors } = await env.DB.prepare(
      "SELECT * FROM cms_sponsors WHERE is_active = 1 ORDER BY sort_order ASC"
    ).all<any>();

    const { results: contactLinks } = await env.DB.prepare(
      "SELECT * FROM contact_links WHERE is_active = 1 ORDER BY sort_order ASC"
    ).all<any>();

    const mappedPosts = (posts || []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      body: r.body,
      type: r.type,
      section: r.section,
      status: r.status,
      isFeatured: Boolean(r.is_featured),
      assets: JSON.parse(r.assets_json || "[]"),
      authorsText: r.authors_text,
      publishedAt: r.published_at || r.created_at,
    }));

    return jsonResponse({
      novedades: mappedPosts.filter((p) => p.isFeatured),
      latest: mappedPosts,
      sponsors: sponsors || [],
      resources: [],
      contactLinks: contactLinks || [],
    });
  }

  return null;
}
