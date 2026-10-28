type SponsorItem = {
  name: string;
  short: string;
  url: string;
};

const defaultSponsors: SponsorItem[] = [
  {
    name: "Universidad de Buenos Aires",
    short: "UBA",
    url: "https://www.uba.ar",
  },
  {
    name: "Facultad de Ciencias Económicas",
    short: "FCE",
    url: "https://www.economicas.uba.ar",
  },
  {
    name: "Bolsas y Mercados Argentinos",
    short: "BYMA",
    url: "https://www.byma.com.ar",
  },
  {
    name: "Instituto Argentino de Mercado de Capitales",
    short: "IAMC",
    url: "https://www.iamc.com.ar",
  },
];

export function SponsorsStrip() {
  return (
    <section className="border-t border-[#e5e7eb] bg-white py-14 text-center">
      <div className="mx-auto w-[min(1320px,92vw)]">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748b]">
          Gracias por confiar en nosotros
        </h3>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {defaultSponsors.map((sponsor) => (
            <a
              key={sponsor.short}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-[200px] flex-col items-center justify-center rounded-xl border border-[#e5e7eb] bg-[#fafaf9] px-6 py-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1e3a8a] hover:bg-white hover:shadow-sm"
            >
              <span className="font-serif text-lg font-bold tracking-tight text-[#0b1727] transition-colors group-hover:text-[#1e3a8a]">
                {sponsor.short}
              </span>
              <span className="mt-1 text-[11px] text-[#64748b]">
                {sponsor.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
