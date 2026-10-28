import {
  PageHero,
  PeopleGrid,
  SectionLabel,
  SiteFooter,
  SiteHeader,
} from "../components/site-shell";
import { leadership, objectives, storyBlocks } from "../site-data";
import { getTeamMembersContent } from "../lib/public-content";

export default async function QuienesSomosPage() {
  const { leaders, membersBySection } = await getTeamMembersContent(leadership);

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/sobre-nosotros" />
      
      <PageHero
        eyebrow="Institucional"
        title="Sobre Nosotros · Club de Finanzas UBA"
        description="Organización estudiantil y académica de la Facultad de Ciencias Económicas de la Universidad de Buenos Aires. Desarrollamos investigación cuantitativa, análisis de inversiones y formación técnica de primer nivel."
      />

      <main className="mx-auto w-[min(1280px,92vw)] space-y-16 py-12 md:space-y-20 md:py-16">
        {/* Pilares Institucionales */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Pilares del Club"
            title="Nuestra Filosofía y Enfoque Metodológico"
            description="Cuatro principios analíticos que guían la producción de informes y la toma de decisiones."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm transition hover:border-[#0062ff]">
              <div>
                <div className="kpi-circ mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M12 3v18M3 6l9-3 9 3M3 18l9 3 9-3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/></svg>
                </div>
                <h4 className="text-base font-bold text-[#0e2246]">1. Valuación Fundamental</h4>
                <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                  Modelos de flujos de fondos descontados (DCF), múltiplos comparables y múltiplos libres de estructura de capital.
                </p>
              </div>
              <div className="mt-4">
                <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-1 text-[10px] font-bold uppercase text-[#0062ff]">
                  DCF & Múltiplos
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm transition hover:border-[#0062ff]">
              <div>
                <div className="kpi-circ blue mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <h4 className="text-base font-bold text-[#0e2246]">2. Calidad de Flujos</h4>
                <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                  Foco en solvencia de balance, generación de caja libre recurrente y sostenibilidad de retorno sobre capital.
                </p>
              </div>
              <div className="mt-4">
                <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-1 text-[10px] font-bold uppercase text-[#0062ff]">
                  FCF & Solvencia
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm transition hover:border-[#0062ff]">
              <div>
                <div className="kpi-circ cyan mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                </div>
                <h4 className="text-base font-bold text-[#0e2246]">3. Crecimiento Táctico</h4>
                <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                  Identificación de macrotendencias globales, sectores de infraestructura crítica y avances tecnológicos.
                </p>
              </div>
              <div className="mt-4">
                <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-1 text-[10px] font-bold uppercase text-[#0062ff]">
                  Macrotendencias
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm transition hover:border-[#0062ff]">
              <div>
                <div className="kpi-circ teal mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h4 className="text-base font-bold text-[#0e2246]">4. Control de Riesgo</h4>
                <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                  Optimización media-varianza de Markowitz, maximización de ratio Sharpe y mitigación de drawdowns.
                </p>
              </div>
              <div className="mt-4">
                <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-1 text-[10px] font-bold uppercase text-[#0062ff]">
                  Markowitz & Sharpe
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Historia y Visión */}
        <section className="grid gap-6 md:grid-cols-3">
          {storyBlocks.map((block) => (
            <article
              key={block.title}
              className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-7 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0062ff]">
                {block.title}
              </p>
              <p className="mt-3 text-lg font-bold leading-snug text-[#0e2246]">{block.text}</p>
            </article>
          ))}
        </section>

        {/* Objetivos */}
        <section className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <SectionLabel
            eyebrow="Propósito Institucional"
            title="Objetivos Estratégicos"
            description="Nuestras metas principales para conectar a los estudiantes con el ecosistema financiero profesional."
          />
          <div className="grid gap-4">
            {objectives.map((objective, index) => (
              <article
                key={objective}
                className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#0062ff]">OBJETIVO 0{index + 1}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#475569]">{objective}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Líderes */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Consejo Directivo"
            title="Liderazgo del Club"
            description="Comisión directiva y fundadores encargados de la coordinación general del Club de Finanzas."
          />
          <PeopleGrid people={leaders} />
        </section>

        {/* Miembros por Área */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Estructura Operativa"
            title="Integrantes por Área"
            description="Equipos técnicos de Portfolio, Research y Relaciones Institucionales."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { key: "PORTFOLIO", label: "Área de Portfolio", desc: "Gestión cuantitativa y análisis de activos" },
              { key: "RESEARCH", label: "Área de Research", desc: "Estudios macro y valuación fundamental" },
              { key: "RRII", label: "Relaciones Institucionales", desc: "Alianzas corporativas y difusión" },
            ].map((section) => (
              <section
                key={section.key}
                className="space-y-4 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm"
              >
                <div>
                  <h3 className="text-lg font-bold text-[#0e2246]">{section.label}</h3>
                  <p className="text-xs text-[#64748b]">{section.desc}</p>
                </div>
                {membersBySection[section.key as "PORTFOLIO" | "RESEARCH" | "RRII"]?.length ? (
                  <div className="space-y-2.5 divide-y divide-[#f1f5f9]">
                    {membersBySection[section.key as "PORTFOLIO" | "RESEARCH" | "RRII"].map((person) => (
                      <article key={`${section.key}-${person.name}`} className="pt-2.5 first:pt-0">
                        <p className="text-sm font-bold text-[#0e2246]">{person.name}</p>
                        <p className="text-xs font-semibold text-[#0062ff]">{person.role}</p>
                        {person.profileUrl ? (
                          <a
                            href={person.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex text-xs text-[#64748b] hover:text-[#0062ff]"
                          >
                            LinkedIn ↗
                          </a>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748b]">Sin integrantes cargados actualmente.</p>
                )}
              </section>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
