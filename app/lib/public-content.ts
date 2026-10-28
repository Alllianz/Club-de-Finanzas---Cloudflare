import type { FeedEntry, Person } from "../site-data";
import {
  homeFeed,
  homeFeatured,
  leadership,
  newsFeed,
  newsIntro,
  portfolioFeed,
  researchFeed,
} from "../site-data";
import { publicPostsService } from "../services/public-posts-service";
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
      membersBySection: {
        LEADERSHIP: fallback,
        PORTFOLIO: [],
        RESEARCH: [],
        RRII: [],
      } as Record<TeamSection, Person[]>,
    };
  }
}
