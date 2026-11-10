"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type {
  ClubStatSetting,
  SponsorTrustSetting,
  ContactLink,
  FooterDisclaimerSetting,
  FooterQuickLink,
} from "../../lib/types";

const AUTH_HEADER = { Authorization: "Bearer admin_allianz_session_token_2026" };

type TabKey = "STATS" | "SPONSORS" | "FOOTER" | "CHANNELS";

const defaultQuickLinks: FooterQuickLink[] = [
  { label: "Inicio", href: "/" },
  { label: "Portafolio", href: "/portfolio" },
  { label: "Futuros", href: "/futuros" },
  { label: "Research", href: "/research" },
  { label: "Nosotros", href: "/quienes-somos" },
  { label: "Sumate", href: "/unite" },
];

export default function AdminSiteContentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("FOOTER");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);

  // Estados del contenido institucional
  const [clubStats, setClubStats] = useState<ClubStatSetting[]>([]);
  const [sponsorsTrust, setSponsorsTrust] = useState<SponsorTrustSetting[]>([]);
  const [officialChannels, setOfficialChannels] = useState<ContactLink[]>([]);
  const [quickLinks, setQuickLinks] = useState<FooterQuickLink[]>(defaultQuickLinks);
  const [footerDisclaimer, setFooterDisclaimer] = useState<FooterDisclaimerSetting>({
    heading: "",
    subtext: "",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/v2/site-content`, {
        credentials: "include",
        headers: AUTH_HEADER,
      });
      const data = await res.json();

      setClubStats(
        data.clubStats || [
          {
            id: "stat_1",
            value: "25+",
            label: "Colaboradores activos",
            description: "Estudiantes en Portfolio, Research y Relaciones Institucionales.",
          },
          {
            id: "stat_2",
            value: "+9.000",
            label: "Son parte de esto",
            description: "Seguidores aproximados en LinkedIn e Instagram.",
          },
          {
            id: "stat_3",
            value: "200+",
            label: "Miembros registrados",
            description: "En la comunidad oficial de WhatsApp del Club.",
          },
          {
            id: "stat_4",
            value: "8",
            label: "Años de trayectoria",
            description: "Formando e impulsando talento universitario desde 2018.",
          },
        ]
      );

      setSponsorsTrust(
        data.sponsorsTrust || [
          {
            id: "sp_1",
            name: "Universidad de Buenos Aires",
            short: "UBA",
            url: "https://www.uba.ar",
            description: "Facultad de Ciencias Económicas",
          },
          {
            id: "sp_2",
            name: "Facultad de Ciencias Económicas",
            short: "FCE",
            url: "https://www.economicas.uba.ar",
            description: "Casa de estudios y formación académica",
          },
          {
            id: "sp_3",
            name: "Bolsas y Mercados Argentinos",
            short: "BYMA",
            url: "https://www.byma.com.ar",
            description: "Infraestructura de mercado de capitales",
          },
          {
            id: "sp_4",
            name: "Instituto Argentino de Mercado de Capitales",
            short: "IAMC",
            url: "https://www.iamc.com.ar",
            description: "Investigación y desarrollo de mercado",
          },
        ]
      );

      setOfficialChannels(
        data.officialChannels || [
          {
            id: "ch_1",
            kind: "LINKEDIN",
            label: "LinkedIn",
            value: "Club de Finanzas UBA",
            href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
            sortOrder: 1,
            isActive: true,
          },
          {
            id: "ch_2",
            kind: "INSTAGRAM",
            label: "Instagram",
            value: "@clubdefinanzasuba",
            href: "https://www.instagram.com/clubdefinanzasuba",
            sortOrder: 2,
            isActive: true,
          },
          {
            id: "ch_3",
            kind: "EMAIL",
            label: "Email",
            value: "contacto@clubdefinanzasuba.com",
            href: "mailto:contacto@clubdefinanzasuba.com",
            sortOrder: 3,
            isActive: true,
          },
        ]
      );

      setQuickLinks(
        data.quickLinks && Array.isArray(data.quickLinks) && data.quickLinks.length > 0
          ? data.quickLinks
          : defaultQuickLinks
      );

      setFooterDisclaimer(
        data.footerDisclaimer || {
          heading:
            "Iniciativa académica y profesional creada y gestionada por estudiantes de la Facultad de Ciencias Económicas de la Universidad de Buenos Aires.",
          subtext:
            "El Club de Finanzas UBA es una iniciativa independiente y sin fines de lucro, integrada por miembros autoconvocados pertenecientes a la Universidad de Buenos Aires. No constituye una unidad oficial ni representa institucionalmente a la UBA. El contenido publicado en este portal es de carácter estrictamente educativo, analítico y formativo; no constituye asesoramiento financiero ni recomendación de inversión.",
        }
      );
    } catch {
      setNotice("No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveAll() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/site-content`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...AUTH_HEADER,
        },
        body: JSON.stringify({
          clubStats,
          sponsorsTrust,
          officialChannels,
          footerDisclaimer,
          quickLinks,
        }),
      });

      if (!response.ok) throw new Error();
      setNotice("✓ Configuración del sitio y Footer guardada exitosamente en D1.");
    } catch {
      setNotice("Error al guardar cambios.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(sponsorId: string, file: File) {
    setUploadingLogoId(sponsorId);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", "image");
      const res = await fetch(`${API_BASE_URL}/admin/v2/uploads`, {
        method: "POST",
        credentials: "include",
        headers: AUTH_HEADER,
        body: data,
      });
      if (!res.ok) throw new Error();
      const payload = await res.json();
      if (payload.asset?.url) {
        setSponsorsTrust((prev) =>
          prev.map((s) => (s.id === sponsorId ? { ...s, logoUrl: payload.asset.url } : s))
        );
        setNotice("Logo del sponsor subido exitosamente.");
      }
    } catch {
      setNotice("Error al subir el logo.");
    } finally {
      setUploadingLogoId(null);
    }
  }

  const isFooterActive = activeTab === "FOOTER" || activeTab === "CHANNELS";

  return (
    <BackofficeShell
      title="Gestión de Contenido y Footer"
      subtitle="Panel centralizado para administrar las métricas institucionales, sponsors y la totalidad del pie de página."
    >
      {/* Botones de Pestañas / Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#e2e8f0] pb-4">
        {[
          { key: "FOOTER", label: "🦶 Pie de Página (Footer Completo)" },
          { key: "STATS", label: "📊 El Club en Números" },
          { key: "SPONSORS", label: "🤝 Sponsors (Gracias por confiar)" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
              (tab.key === "FOOTER" && isFooterActive) || activeTab === tab.key
                ? "bg-[#0b1727] text-white shadow-sm"
                : "bg-white text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b1727] border border-[#e2e8f0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-[#64748b]">Cargando configuración...</div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* =========================================================================
              1. PESTAÑA: FOOTER COMPLETO (CANALES, ENLACES, INICIATIVA, DISCLAIMER, PREVIEW)
             ========================================================================= */}
          {isFooterActive && (
            <div className="space-y-8">
              {/* Encabezado de la Sección de Footer */}
              <div className="rounded-2xl border border-[#d8e5f8] bg-[#f0f6ff] p-6 md:p-8">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
                      Configuración Integral del Pie de Página (Site Footer)
                    </h2>
                    <p className="mt-1 text-xs text-[#475569] max-w-2xl leading-relaxed">
                      Administrá de forma intuitiva los canales y redes oficiales, los enlaces rápidos del menú inferior, la iniciativa académica bajo el logo y el descargo legal. Los cambios se sincronizan en vivo en todo el sitio institucional.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={saveAll}
                    disabled={saving}
                    className="inline-flex items-center rounded-xl bg-[#0062ff] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36] disabled:opacity-50 flex-shrink-0"
                  >
                    {saving ? "Guardando en D1..." : "Guardar Cambios del Footer"}
                  </button>
                </div>
              </div>

              {/* 1.1 Canales Oficiales y Redes */}
              <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-[2px] w-5 bg-[#b89047]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                        Columna Derecha
                      </span>
                    </div>
                    <h3 className="mt-1 font-serif text-xl font-bold text-[#0e2246]">
                      Canales Oficiales y Vías de Contacto
                    </h3>
                    <p className="mt-0.5 text-xs text-[#64748b]">
                      Redes sociales, emails y canales comunitarios que se muestran en el pie de página.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOfficialChannels((prev) => [
                        ...prev,
                        {
                          id: `ch_${Date.now()}`,
                          kind: "OTHER",
                          label: "YouTube",
                          value: "@clubdefinanzasuba",
                          href: "https://youtube.com/@clubdefinanzasuba",
                          sortOrder: prev.length + 1,
                          isActive: true,
                        },
                      ])
                    }
                    className="rounded-xl border border-[#0062ff] px-4 py-2 text-xs font-bold uppercase text-[#0062ff] hover:bg-[#0062ff] hover:text-white transition"
                  >
                    + Agregar Canal
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {officialChannels.map((channel, idx) => (
                    <div
                      key={channel.id || idx}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-4 transition hover:border-[#cbd5e1]"
                    >
                      <div className="w-36">
                        <label className="text-[10px] font-bold uppercase text-[#64748b]">
                          Canal / Red
                        </label>
                        <input
                          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#0e2246] outline-none focus:border-[#0062ff]"
                          placeholder="Ej. LinkedIn, Instagram, YouTube"
                          value={channel.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOfficialChannels((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, label: val } : c))
                            );
                          }}
                        />
                      </div>

                      <div className="w-48">
                        <label className="text-[10px] font-bold uppercase text-[#64748b]">
                          Texto Visible
                        </label>
                        <input
                          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#0e2246] outline-none focus:border-[#0062ff]"
                          placeholder="Ej. @clubdefinanzasuba"
                          value={channel.value || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOfficialChannels((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, value: val } : c))
                            );
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-[220px]">
                        <label className="text-[10px] font-bold uppercase text-[#64748b]">
                          Enlace Destino (URL o mailto)
                        </label>
                        <input
                          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#0e2246] outline-none focus:border-[#0062ff]"
                          placeholder="https://... o mailto:..."
                          value={channel.href}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOfficialChannels((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, href: val } : c))
                            );
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[#475569]">
                          <input
                            type="checkbox"
                            checked={channel.isActive !== false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setOfficialChannels((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, isActive: checked } : c))
                              );
                            }}
                            className="h-4 w-4 rounded border-[#cbd5e1] text-[#0062ff]"
                          />
                          <span>Activo</span>
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            setOfficialChannels((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="rounded-lg px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 hover:font-bold transition"
                          title="Eliminar canal"
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 1.2 Enlaces Rápidos del Menú del Pie */}
              <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-[2px] w-5 bg-[#b89047]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                        Columna Central
                      </span>
                    </div>
                    <h3 className="mt-1 font-serif text-xl font-bold text-[#0e2246]">
                      Enlaces Rápidos del Footer (Navegación Inferior)
                    </h3>
                    <p className="mt-0.5 text-xs text-[#64748b]">
                      Menú horizontal de secciones institucionales disponibles en el pie.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickLinks(defaultQuickLinks)}
                      className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      ↺ Restablecer por Defecto
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickLinks((prev) => [
                          ...prev,
                          {
                            label: "Nueva Sección",
                            href: "/nueva-seccion",
                          },
                        ])
                      }
                      className="rounded-xl border border-[#0062ff] px-4 py-2 text-xs font-bold uppercase text-[#0062ff] hover:bg-[#0062ff] hover:text-white transition"
                    >
                      + Agregar Enlace
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {quickLinks.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-3 transition hover:border-[#cbd5e1]"
                    >
                      <div className="flex-1 space-y-1">
                        <input
                          className="w-full rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-bold uppercase text-[#0e2246] outline-none focus:border-[#0062ff]"
                          placeholder="Etiqueta (ej. Inicio)"
                          value={item.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuickLinks((prev) =>
                              prev.map((ql, i) => (i === idx ? { ...ql, label: val } : ql))
                            );
                          }}
                        />
                        <input
                          className="w-full rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs text-[#64748b] font-mono outline-none focus:border-[#0062ff]"
                          placeholder="Ruta (ej. /portfolio)"
                          value={item.href}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuickLinks((prev) =>
                              prev.map((ql, i) => (i === idx ? { ...ql, href: val } : ql))
                            );
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuickLinks((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded-lg p-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                        title="Eliminar enlace"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* 1.3 Textos Institucionales: Misión bajo Logo & Descargo Legal */}
              <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-[2px] w-5 bg-[#b89047]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                      Textos Institucionales
                    </span>
                  </div>
                  <h3 className="mt-1 font-serif text-xl font-bold text-[#0e2246]">
                    Misión Institucional y Descargo Legal
                  </h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                      Texto de la Iniciativa Académica (Bajo el Logo del Footer)
                    </label>
                    <span className="text-[11px] text-[#64748b]">
                      {footerDisclaimer.heading?.length || 0} caracteres
                    </span>
                  </div>
                  <textarea
                    className="min-h-[85px] w-full rounded-xl border border-[#e2e8f0] bg-white p-4 text-xs sm:text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
                    placeholder="Iniciativa académica y profesional creada y gestionada por estudiantes..."
                    value={footerDisclaimer.heading}
                    onChange={(e) =>
                      setFooterDisclaimer({ ...footerDisclaimer, heading: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                      Descargo Legal & Disclaimer Institucional (Base del Footer)
                    </label>
                    <span className="text-[11px] text-[#64748b]">
                      {footerDisclaimer.subtext?.length || 0} caracteres
                    </span>
                  </div>
                  <textarea
                    className="min-h-[110px] w-full rounded-xl border border-[#e2e8f0] bg-white p-4 text-xs leading-relaxed text-[#0e2246] outline-none transition focus:border-[#0062ff]"
                    placeholder="El Club de Finanzas UBA es una iniciativa independiente y sin fines de lucro..."
                    value={footerDisclaimer.subtext}
                    onChange={(e) =>
                      setFooterDisclaimer({ ...footerDisclaimer, subtext: e.target.value })
                    }
                  />
                </div>
              </section>

              {/* 1.4 Previsualización en Vivo del Footer */}
              <section className="rounded-2xl border border-[#d8e5f8] bg-white p-6 shadow-sm md:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0e2246]">
                      Vista Previa en Vivo del Footer
                    </h3>
                    <p className="text-xs text-[#64748b]">
                      Así se renderizará el pie de página institucional en el portal:
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                    ● En vivo
                  </span>
                </div>

                <div className="rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-6 text-[#475569] shadow-inner">
                  <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1.2fr_1.4fr_1fr]">
                    <div>
                      <div className="h-10 w-44 relative">
                        <Image
                          src="/clubdefinanzasubalogohorizontal.png"
                          alt="Club de Finanzas UBA"
                          width={200}
                          height={40}
                          className="h-full w-auto object-contain object-left"
                        />
                      </div>
                      <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]">
                        {footerDisclaimer.heading || "Iniciativa académica y profesional..."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold tracking-wider uppercase text-[#0b1727]">
                      {quickLinks.map((ql) => (
                        <span key={ql.label} className={ql.href === "/unite" ? "text-[#1e3a8a]" : ""}>
                          {ql.label} {ql.href === "/unite" ? "↗" : ""}
                        </span>
                      ))}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0b1727]">
                        Canales Oficiales
                      </span>
                      <div className="mt-2 space-y-1">
                        {officialChannels
                          .filter((c) => c.isActive !== false)
                          .map((c) => (
                            <div key={c.label} className="text-[11px]">
                              <span className="font-bold text-[#0b1727]">{c.label}: </span>
                              <span className="text-[#64748b]">{c.value || c.href} ↗</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#e5e7eb] pt-4 text-[10px] text-[#64748b]">
                    <p className="font-semibold">© {new Date().getFullYear()} Club de Finanzas UBA</p>
                    <p className="mt-1 leading-relaxed">{footerDisclaimer.subtext}</p>
                  </div>
                </div>
              </section>

              {/* Botón Guardar Cambios */}
              <div className="flex items-center gap-4 pt-4 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={saveAll}
                  disabled={saving}
                  className="inline-flex items-center rounded-full bg-[#0062ff] px-8 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36] disabled:opacity-50"
                >
                  {saving ? "Guardando en D1..." : "Guardar Todos los Cambios del Footer"}
                </button>
                {notice && <span className="text-xs font-bold text-[#0062ff]">{notice}</span>}
              </div>
            </div>
          )}

          {/* =========================================================================
              2. PESTAÑA: EL CLUB EN NÚMEROS
             ========================================================================= */}
          {activeTab === "STATS" && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
                    El Club en Números (Métricas)
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Métricas de comunidad, trayectoria y producción exhibidas en la portada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setClubStats((prev) => [
                      ...prev,
                      {
                        id: `stat_${Date.now()}`,
                        value: "100%",
                        label: "Nueva Métrica",
                        description: "Descripción de la métrica...",
                      },
                    ])
                  }
                  className="rounded-xl border border-[#0062ff] px-4 py-2 text-xs font-bold uppercase text-[#0062ff] hover:bg-[#0062ff] hover:text-white transition"
                >
                  + Agregar Métrica
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {clubStats.map((stat, idx) => (
                  <div
                    key={stat.id || idx}
                    className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-4 space-y-3"
                  >
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#64748b]">Valor</label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-3 py-1.5 font-mono text-sm font-bold text-[#0e2246]"
                        value={stat.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClubStats((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, value: val } : s))
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#64748b]">Etiqueta</label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#0e2246]"
                        value={stat.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClubStats((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, label: val } : s))
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#64748b]">Descripción</label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#64748b]"
                        value={stat.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClubStats((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, description: val } : s))
                          );
                        }}
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setClubStats((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-red-600 hover:font-bold"
                      >
                        ✕ Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={saveAll}
                  disabled={saving}
                  className="inline-flex items-center rounded-full bg-[#0062ff] px-8 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36] disabled:opacity-50"
                >
                  {saving ? "Guardando en D1..." : "Guardar Métricas"}
                </button>
                {notice && <span className="text-xs font-bold text-[#0062ff]">{notice}</span>}
              </div>
            </section>
          )}

          {/* =========================================================================
              3. PESTAÑA: SPONSORS Y ALIADOS
             ========================================================================= */}
          {activeTab === "SPONSORS" && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
                    Sponsors y Aliados Institucionales
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Empresas e instituciones aliadas que aparecen en la tira "Gracias por confiar".
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSponsorsTrust((prev) => [
                      ...prev,
                      {
                        id: `sp_${Date.now()}`,
                        name: "Nueva Institución",
                        short: "NEW",
                        url: "https://...",
                        description: "Descripción breve...",
                      },
                    ])
                  }
                  className="rounded-xl border border-[#0062ff] px-4 py-2 text-xs font-bold uppercase text-[#0062ff] hover:bg-[#0062ff] hover:text-white transition"
                >
                  + Agregar Sponsor
                </button>
              </div>

              <div className="space-y-4">
                {sponsorsTrust.map((sponsor, idx) => (
                  <div
                    key={sponsor.id || idx}
                    className="grid gap-4 rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-4 sm:grid-cols-4 items-center"
                  >
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#64748b]">Nombre</label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-bold"
                        value={sponsor.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSponsorsTrust((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, name: val } : s))
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#64748b]">Sigla / Corto</label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs"
                        value={sponsor.short || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSponsorsTrust((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, short: val } : s))
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#64748b]">URL Sitio Web</label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs"
                        value={sponsor.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSponsorsTrust((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, url: val } : s))
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 sm:pt-0">
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          className="text-[10px] max-w-[120px] file:text-[10px] file:rounded file:border-0 file:bg-[#0e2246] file:text-white"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleLogoUpload(sponsor.id, file);
                            e.currentTarget.value = "";
                          }}
                        />
                        {uploadingLogoId === sponsor.id && (
                          <span className="text-[10px] text-[#0062ff] block">Subiendo...</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSponsorsTrust((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-red-600 hover:font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={saveAll}
                  disabled={saving}
                  className="inline-flex items-center rounded-full bg-[#0062ff] px-8 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36] disabled:opacity-50"
                >
                  {saving ? "Guardando en D1..." : "Guardar Sponsors"}
                </button>
                {notice && <span className="text-xs font-bold text-[#0062ff]">{notice}</span>}
              </div>
            </section>
          )}
        </div>
      )}
    </BackofficeShell>
  );
}
