import Link from "next/link";

export function HomeHero() {
  return (
    <section className="relative border-b border-[#e5e7eb] bg-gradient-to-b from-[#fafaf9] to-[#ffffff] py-14 sm:py-16 md:py-24 overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          {/* Columna Izquierda: Copy & Acciones */}
          <div className="animate-fade-up">
            <div className="flex items-center gap-2.5">
              <span className="h-[2px] w-6 bg-[#b89047]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#1e3a8a]">
                Portal Institucional · Universidad de Buenos Aires
              </span>
            </div>

            <h1 className="mt-4 font-serif text-3xl font-bold leading-[1.12] tracking-tight text-[#0b1727] sm:text-4xl md:text-5xl lg:text-[3.35rem]">
              Tu puente al <span className="text-[#1e3a8a]">mundo financiero</span>
            </h1>

            <span className="mt-4 block h-[3px] w-14 rounded-full bg-gradient-to-r from-[#1e3a8a] to-[#b89047]" />

            <p className="mt-5 max-w-xl text-base font-normal leading-relaxed text-[#475569] sm:text-lg">
              Un espacio de formación e investigación financiera cuantitativa creado y gestionado por estudiantes de la Facultad de Ciencias Económicas de la Universidad de Buenos Aires.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/sobre-nosotros"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0b1727] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition-colors hover:bg-[#1e3a8a]"
              >
                <span>Conocé el Club</span>
                <span>→</span>
              </Link>
              <Link
                href="/unite"
                className="inline-flex items-center gap-2 rounded-lg border border-[#0b1727] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-[#0b1727] transition-colors hover:bg-[#0b1727] hover:text-white"
              >
                <span>Sumate</span>
              </Link>
            </div>
          </div>

          {/* Columna Derecha: Marco Artístico Institucional (Formato Hero-Art de index.html) */}
          <div className="relative animate-fade-up">
            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-2.5 shadow-md">
              <figure className="relative flex h-[320px] sm:h-[360px] w-full flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-[#0b1727] via-[#102a43] to-[#1e3a8a] p-6 text-white sm:p-8">
                {/* Órbitas concéntricas decorativas de fondo */}
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full border border-white/10"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/5"
                  aria-hidden="true"
                />

                {/* Cabecera del Marco */}
                <div className="relative z-10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b89047]">
                    Facultad de Ciencias Económicas · UBA
                  </span>
                  <h3 className="mt-1 font-serif text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Investigación & Cartera Modelo
                  </h3>
                </div>

                {/* Gráfico Vectorial Conceptual de Mercado */}
                <div className="relative z-10 my-auto py-2">
                  <div className="flex items-center justify-between text-xs font-medium text-white/80">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Rendimiento Acumulado
                    </span>
                    <span className="font-bold text-[#b89047]">+24.8% YTD</span>
                  </div>
                  <div className="mt-3 h-20 w-full overflow-hidden">
                    <svg
                      viewBox="0 0 400 80"
                      preserveAspectRatio="none"
                      className="h-full w-full"
                    >
                      <path
                        d="M 0 65 Q 50 55, 100 45 T 200 35 T 300 20 T 400 5 L 400 80 L 0 80 Z"
                        fill="rgba(30, 58, 138, 0.25)"
                      />
                      <path
                        d="M 0 65 Q 50 55, 100 45 T 200 35 T 300 20 T 400 5"
                        fill="none"
                        stroke="#b89047"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* Pie del Marco */}
                <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/70">
                  <span>Valuación Fundamental & Renta Mixta</span>
                  <span className="font-semibold text-white">Estrategia 2026</span>
                </div>
              </figure>

              {/* Barra inferior de galería fotográfica */}
              <div className="flex items-center justify-between px-3 py-2.5 text-xs">
                <div className="flex flex-col">
                  <b className="font-serif font-bold text-[#0b1727]">El equipo del Club</b>
                  <span className="text-[11px] text-[#64748b]">Comunidad, análisis y finanzas</span>
                </div>
                <span className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a]">
                  UBA Económicas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
