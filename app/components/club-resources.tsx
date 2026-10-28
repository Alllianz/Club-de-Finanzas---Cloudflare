import Link from "next/link";

type ResourceItem = {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
};

const defaultResources: ResourceItem[] = [
  {
    icon: "▤",
    title: "Club de lectura & Newsletter",
    subtitle: "Ideas, tesis y columnas para pensar mejor las finanzas y la macroeconomía.",
    href: "/newsletter",
  },
  {
    icon: "↗",
    title: "Monitor de mercado & Futuros",
    subtitle: "Curvas de tasas implícitas, derivados, riesgo país y paridades BYMA.",
    href: "/futuros",
  },
  {
    icon: "▧",
    title: "Biblioteca de informes & Research",
    subtitle: "Research fundamental, modelos de valuación DCF y seguimiento de carteras.",
    href: "/research",
  },
];

export function ClubResources() {
  return (
    <section className="border-b border-[#e5e7eb] bg-[#f8fafc] py-14">
      <div className="mx-auto w-[min(1320px,92vw)]">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-5 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Aprendé a tu ritmo
            </span>
          </div>
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#0b1727] sm:text-3xl">
            Recursos del Club
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {defaultResources.map((res) => (
            <Link
              key={res.title}
              href={res.href}
              className="group flex items-center gap-4.5 rounded-xl border border-[#e2ebe7] bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cbd5e1] hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f0f6ff] text-xl font-bold text-[#1e3a8a] transition-colors group-hover:bg-[#0b1727] group-hover:text-white">
                {res.icon}
              </div>
              <div className="flex flex-col">
                <b className="font-serif text-sm font-bold text-[#0b1727] transition-colors group-hover:text-[#1e3a8a]">
                  {res.title}
                </b>
                <span className="mt-1 text-xs leading-relaxed text-[#64748b]">
                  {res.subtitle}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
