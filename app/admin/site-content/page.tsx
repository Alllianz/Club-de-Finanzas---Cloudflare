"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type {
  ClubStatSetting,
  SponsorTrustSetting,
  ContactLink,
  FooterDisclaimerSetting,
} from "../../lib/types";

const AUTH_HEADER = { Authorization: "Bearer admin_allianz_session_token_2026" };

type TabKey = "STATS" | "SPONSORS" | "CHANNELS" | "FOOTER";

export default function AdminSiteContentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("STATS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);

  // Estados del contenido institucional
  const [clubStats, setClubStats] = useState<ClubStatSetting[]>([]);
  const [sponsorsTrust, setSponsorsTrust] = useState<SponsorTrustSetting[]>([]);
  const [officialChannels, setOfficialChannels] = useState<ContactLink[]>([]);
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
        }),
      });

      if (!response.ok) throw new Error();
      setNotice("Configuración guardada exitosamente en D1.");
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
        setNotice("Logo subido correctamente.");
      }
    } catch {
      setNotice("No se pudo subir el logo.");
    } finally {
      setUploadingLogoId(null);
    }
  }

  return (
    <BackofficeShell
      title="Contenido Institucional & Footer"
      subtitle="Editor del Club en Números, sponsors con texto descriptivo, canales oficiales y textos institucionales del footer."
    >
      {/* Selector de Pestañas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e2e8f0] pb-4">
        {[
          { key: "STATS", label: "📊 El Club en Números" },
          { key: "SPONSORS", label: "🤝 Sponsors (Gracias por confiar)" },
          { key: "CHANNELS", label: "🔗 Canales Oficiales" },
          { key: "FOOTER", label: "📄 Footer & Disclaimer" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === tab.key
                ? "bg-[#0b1727] text-white shadow-sm"
                : "bg-white text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b1727] border border-[#e2e8f0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#64748b]">Cargando configuración...</div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* =========================================================================
              1. EL CLUB EN NÚMEROS
             ========================================================================= */}
          {activeTab === "STATS" && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
                    El Club en Números
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Métricas destacadas exhibidas en la barra superior de la portada.
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

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {clubStats.map((stat, idx) => (
                  <div
                    key={stat.id || idx}
                    className="relative rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-4.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#1e3a8a]">
                        MÉTRICA #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setClubStats((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-xs text-red-600 hover:font-bold"
                      >
                        ✕ Eliminar
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#0e2246]">
                        Valor (Cifra grande)
                      </label>
                      <input
                        className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 font-serif text-lg font-bold text-[#0b1727] outline-none focus:border-[#0062ff]"
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
                      <label className="text-[11px] font-bold uppercase text-[#0e2246]">
                        Título / Etiqueta
                      </label>
                      <input
                        className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#0b1727] outline-none focus:border-[#0062ff]"
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
                      <label className="text-[11px] font-bold uppercase text-[#0e2246]">
                        Descripción
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white p-2.5 text-xs text-[#475569] outline-none focus:border-[#0062ff]"
                        rows={2}
                        value={stat.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClubStats((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, description: val } : s))
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================================================
              2. SPONSORS Y ALIADOS (GRACIAS POR CONFIAR EN NOSOTROS)
             ========================================================================= */}
          {activeTab === "SPONSORS" && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
                    Gracias por confiar en nosotros
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Cada recuadro soporta un logotipo institucional y un breve texto descriptivo abajo.
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
                        short: "ALIAS",
                        url: "https://...",
                        description: "Breve texto explicativo institucional...",
                      },
                    ])
                  }
                  className="rounded-xl border border-[#0062ff] px-4 py-2 text-xs font-bold uppercase text-[#0062ff] hover:bg-[#0062ff] hover:text-white transition"
                >
                  + Agregar Sponsor
                </button>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {sponsorsTrust.map((sponsor, idx) => (
                  <div
                    key={sponsor.id || idx}
                    className="rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#1e3a8a]">
                        RECUADRO #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSponsorsTrust((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-xs text-red-600 hover:font-bold"
                      >
                        ✕ Eliminar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase text-[#0e2246]">
                          Nombre Completo
                        </label>
                        <input
                          className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#0b1727] outline-none focus:border-[#0062ff]"
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
                        <label className="text-[11px] font-bold uppercase text-[#0e2246]">
                          Sigla / Short
                        </label>
                        <input
                          className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#0b1727] outline-none focus:border-[#0062ff]"
                          value={sponsor.short || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSponsorsTrust((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, short: val } : s))
                            );
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#0e2246]">
                        Breve texto descriptivo abajo del logo
                      </label>
                      <input
                        className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#0b1727] outline-none focus:border-[#0062ff]"
                        placeholder="Ej. Mercado líder de futuros y opciones de Argentina"
                        value={sponsor.description || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSponsorsTrust((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, description: val } : s))
                          );
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#0e2246]">
                        Enlace Web (URL)
                      </label>
                      <input
                        className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#0b1727] outline-none focus:border-[#0062ff]"
                        value={sponsor.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSponsorsTrust((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, url: val } : s))
                          );
                        }}
                      />
                    </div>

                    {/* Subida o URL de Logo */}
                    <div className="rounded-lg border border-[#d8e5f8] bg-white p-3">
                      <label className="block text-[11px] font-bold uppercase text-[#0e2246]">
                        Logo del Sponsor
                      </label>
                      <div className="mt-2 flex items-center gap-3">
                        {sponsor.logoUrl ? (
                          <div className="relative h-10 w-24 border border-gray-200 bg-white rounded p-1">
                            <Image
                              src={sponsor.logoUrl}
                              alt="Logo"
                              fill
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500">Sin logo (usa sigla)</span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs file:mr-2 file:rounded file:border-0 file:bg-[#091a36] file:px-3 file:py-1 file:text-xs file:text-white"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleLogoUpload(sponsor.id, file);
                            e.currentTarget.value = "";
                          }}
                          disabled={uploadingLogoId === sponsor.id}
                        />
                      </div>
                      {uploadingLogoId === sponsor.id && (
                        <p className="mt-1 text-[11px] text-[#0062ff]">Subiendo logo...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================================================
              3. CANALES OFICIALES
             ========================================================================= */}
          {activeTab === "CHANNELS" && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
                    Canales Oficiales
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Redes sociales y vías de contacto directo exhibidas en el pie de página.
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
                        label: "Nuevo Canal",
                        value: "@usuario",
                        href: "https://...",
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

              <div className="mt-6 space-y-4">
                {officialChannels.map((channel, idx) => (
                  <div
                    key={channel.id || idx}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-4"
                  >
                    <div className="w-32">
                      <label className="text-[10px] font-bold uppercase text-[#64748b]">
                        Etiqueta
                      </label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-bold"
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
                        Texto visible
                      </label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs"
                        value={channel.value || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOfficialChannels((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, value: val } : c))
                          );
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[10px] font-bold uppercase text-[#64748b]">
                        Enlace (URL / mailto)
                      </label>
                      <input
                        className="w-full rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs"
                        value={channel.href}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOfficialChannels((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, href: val } : c))
                          );
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setOfficialChannels((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="mt-4 text-xs text-red-600 hover:font-bold"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================================================
              4. TEXTO INSTITUCIONAL DEL FOOTER
             ========================================================================= */}
          {activeTab === "FOOTER" && (
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8 space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
                  Texto Institucional del Footer
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  Modificá el texto de misión ("Iniciativa académica y profesional creada...") y el descargo legal general.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                  Encabezado / Misión Institucional (Debajo del Logo)
                </label>
                <textarea
                  className="min-h-[80px] w-full rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm text-[#0e2246] outline-none focus:border-[#0062ff]"
                  value={footerDisclaimer.heading}
                  onChange={(e) =>
                    setFooterDisclaimer({ ...footerDisclaimer, heading: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                  Descargo Legal & Académico (Disclaimer Inferior)
                </label>
                <textarea
                  className="min-h-[110px] w-full rounded-xl border border-[#e2e8f0] bg-white p-4 text-xs leading-relaxed text-[#0e2246] outline-none focus:border-[#0062ff]"
                  value={footerDisclaimer.subtext}
                  onChange={(e) =>
                    setFooterDisclaimer({ ...footerDisclaimer, subtext: e.target.value })
                  }
                />
              </div>
            </section>
          )}

          {/* Botón flotante o fijo de guardado */}
          <div className="flex items-center gap-4 pt-4 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="inline-flex items-center rounded-full bg-[#0062ff] px-8 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36] disabled:opacity-50"
            >
              {saving ? "Guardando en D1..." : "Guardar Todos los Cambios"}
            </button>
            {notice && (
              <span className="text-xs font-bold text-[#0062ff]">{notice}</span>
            )}
          </div>
        </div>
      )}
    </BackofficeShell>
  );
}
