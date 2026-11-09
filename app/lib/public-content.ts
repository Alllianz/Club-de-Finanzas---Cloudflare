import type { FeedEntry, Person } from "../site-data";
import {
  homeFeed,
  homeFeatured,
  leadership,
  defaultTeamBySection,
  newsFeed,
  newsIntro,
  portfolioFeed,
  researchFeed,
} from "../site-data";
import { publicPostsService } from "../services/public-posts-service";
import { API_BASE_URL } from "./config";
import type { Post, TeamMember, TeamSection } from "./types";

const formatDate = (value: string | null): string => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const normalizeHref = (item: Post): string => {
  if (item.type === "REPORT") {
    const pdf = item.assets.find((asset) => asset.kind === "PDF");
    return pdf?.url ?? `/posts/${item.slug}`;
  }
  return `/posts/${item.slug}`;
};

const toFeedEntry = (item: Post): FeedEntry => ({
  category: item.type === "EVENT" ? "Evento" : item.type === "NEWSLETTER" ? "Newsletter" : "Informe",
  date: formatDate(item.publishedAt),
  title: item.title,
  excerpt: item.summary,
  href: normalizeHref(item),
  cta: item.type === "REPORT" ? "Abrir informe" : "Ver más",
  imageUrl:
    item.assets.find((asset) => asset.kind === "IMAGE" || asset.kind === "FLYER")?.url ??
    undefined,
});

async function getSectionContent(params: {
  section: "HOME" | "PORTFOLIO" | "RESEARCH" | "NEWSLETTER";
  fallbackFeatured: FeedEntry;
  fallbackFeed: FeedEntry[];
}) {
  const { section, fallbackFeatured, fallbackFeed } = params;

  try {
    const response = await publicPostsService.getSection(section);

    return {
      featured: response.featured ? toFeedEntry(response.featured) : fallbackFeatured,
      feed: response.latest.length ? response.latest.filter((item) => !item.isFeatured).map(toFeedEntry) : fallbackFeed,
    };
  } catch {
    return {
      featured: fallbackFeatured,
      feed: fallbackFeed,
    };
  }
}

export async function getHomeContent() {
  try {
    const response = await publicPostsService.getHome();
    const featuredRaw = response.novedades[0] ?? response.latest[0];
    return {
      featured: featuredRaw ? toFeedEntry(featuredRaw) : homeFeatured,
      feed: response.latest.length ? response.latest.map(toFeedEntry) : homeFeed,
      novedades: response.novedades.map(toFeedEntry),
      resources: response.resources,
      sponsors: response.sponsors,
      contactLinks: response.contactLinks,
    };
  } catch {
    return {
      featured: homeFeatured,
      feed: homeFeed,
      novedades: homeFeed.slice(0, 5),
      resources: [],
      sponsors: [],
      contactLinks: [],
    };
  }
}

export async function getPortfolioContent() {
  return getSectionContent({
    section: "PORTFOLIO",
    fallbackFeatured: portfolioFeed[0] ?? homeFeatured,
    fallbackFeed: portfolioFeed,
  });
}

export async function getResearchContent() {
  return getSectionContent({
    section: "RESEARCH",
    fallbackFeatured: researchFeed[0] ?? homeFeatured,
    fallbackFeed: researchFeed,
  });
}

export async function getNewsContent() {
  return getSectionContent({
    section: "NEWSLETTER",
    fallbackFeatured: newsFeed[0] ?? homeFeatured,
    fallbackFeed: newsFeed,
  });
}

export { newsIntro };

const toPerson = (item: TeamMember): Person => ({
  name: item.fullName,
  role: item.title,
  bio: item.shortBio ?? "",
  initials: item.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join(""),
  imageUrl: item.imageUrl,
  profileUrl: item.profileUrl,
  section: item.section,
});

export async function getTeamMembersContent(fallback: Person[] = leadership) {
  try {
    const response = await publicPostsService.getTeamMembers();
    const people = response.items.map(toPerson);

    const leaders = response.grouped?.leadership?.length
      ? response.grouped.leadership.map(toPerson)
      : people.filter((person) => person.section === "LEADERSHIP");

    const bySection: Record<TeamSection, Person[]> = {
      LEADERSHIP: leaders,
      PORTFOLIO: response.grouped?.portfolio?.map(toPerson) ?? people.filter((person) => person.section === "PORTFOLIO"),
      RESEARCH: response.grouped?.research?.map(toPerson) ?? people.filter((person) => person.section === "RESEARCH"),
      RRII: response.grouped?.rrii?.map(toPerson) ?? people.filter((person) => person.section === "RRII"),
    };

    return {
      leaders: leaders.length ? leaders : fallback,
      membersBySection: bySection,
    };
  } catch {
    return {
      leaders: fallback,
      membersBySection: (defaultTeamBySection as Record<TeamSection, Person[]>) || {
        LEADERSHIP: fallback,
        PORTFOLIO: [],
        RESEARCH: [],
        RRII: [],
      },
    };
  }
}


import { defaultPresidentsHistory } from "../data/presidents-history";
import type { AreaPresident, SiteContentPayload } from "./types";

export async function getPresidentsContent(): Promise<AreaPresident[]> {
  try {
    const res = await fetch(`${API_BASE_URL || "/api"}/public/v2/presidents`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("presidents fetch failed");
    const data = (await res.json()) as { items?: AreaPresident[] };
    return data.items && data.items.length > 0 ? data.items : defaultPresidentsHistory;
  } catch {
    return defaultPresidentsHistory;
  }
}

export async function getSiteContent(): Promise<SiteContentPayload> {
  const fallback: SiteContentPayload = {
    clubStats: [
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
    ],
    sponsorsTrust: [
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
    ],
    officialChannels: [
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
    ],
    footerDisclaimer: {
      heading:
        "Iniciativa académica y profesional creada y gestionada por estudiantes de la Facultad de Ciencias Económicas de la Universidad de Buenos Aires.",
      subtext:
        "El Club de Finanzas UBA es una iniciativa independiente y sin fines de lucro, integrada por miembros autoconvocados pertenecientes a la Universidad de Buenos Aires. No constituye una unidad oficial ni representa institucionalmente a la UBA. El contenido publicado en este portal es de carácter estrictamente educativo, analítico y formativo; no constituye asesoramiento financiero ni recomendación de inversión.",
    },
  };

  try {
    const res = await fetch(`${API_BASE_URL || "/api"}/public/v2/site-content`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("site content failed");
    const data = (await res.json()) as Partial<SiteContentPayload>;
    return {
      clubStats: data.clubStats?.length ? data.clubStats : fallback.clubStats,
      sponsorsTrust: data.sponsorsTrust?.length ? data.sponsorsTrust : fallback.sponsorsTrust,
      officialChannels: data.officialChannels?.length ? data.officialChannels : fallback.officialChannels,
      footerDisclaimer: data.footerDisclaimer?.heading ? data.footerDisclaimer : fallback.footerDisclaimer,
    };
  } catch {
    return fallback;
  }
}
