import { PageHero, SectionLabel, SiteFooter, SiteHeader } from "../components/site-shell";
import { publicPostsService } from "../services/public-posts-service";

export default async function UnitePage() {
  const contacts = await publicPostsService.getContactLinks().catch(() => ({ items: [] }));

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/unite" />
      
      <PageHero
        eyebrow="Convocatorias & Comunidad"
        title="Sumate al Club de Finanzas UBA"
        description="Participá activamente de nuestras conferencias, grupos de investigación e integrá los equipos de análisis financiero."
      />

      <main className="mx-auto w-[min(1280px,92vw)] space-y-16 py-12 md:space-y-20 md:py-16">
        {/* Tarjetas Principales de Acción */}
        <section className="grid gap-6 md:grid-cols-2">
          <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-8 shadow-sm">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#091a36] text-xl text-white shadow-sm">
                💬
              </div>
              <h2 className="mt-5 text-2xl font-bold text-[#0e2246]">
                Comunidad y Canales de Debate
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#475569]">
                Accedé a nuestros grupos oficiales de WhatsApp y LinkedIn para debatir sobre coyuntura macro, compartir bibliografía y recibir avisos de eventos exclusivos.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0062ff]">
                Debate Abierto a Estudiantes
              </span>
            </div>
          </article>

          <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-8 shadow-sm">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0062ff] text-xl text-white shadow-sm">
                📄
              </div>
              <h2 className="mt-5 text-2xl font-bold text-[#0e2246]">
                Postulaciones & CV
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#475569]">
                Buscamos periódicamente analistas para las áreas de Portfolio, Research y Relaciones Institucionales. Compartí tu perfil para sumarte al equipo.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0062ff]">
                Convocatorias Periódicas
              </span>
            </div>
          </article>
        </section>

        {/* Enlaces y Canales de Contacto */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Canales Oficiales"
            title="Redes y Formulario de Postulación"
            description="Enlaces directos para participar y conectar con los miembros del Club de Finanzas."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.items.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm transition hover:border-[#0062ff] hover:shadow-md"
              >
                <div>
                  <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#0062ff]">
                    {item.label}
                  </span>
                  <p className="mt-3 text-base font-bold text-[#0e2246] group-hover:text-[#0062ff]">
                    {item.value ?? item.label}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[#f1f5f9] pt-3 text-xs font-bold text-[#0062ff]">
                  <span>Ir al enlace</span>
                  <span>↗</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
