import { api } from "../lib/api";
import type { ContactLink, Post, PostSection, PostType, Resource, Sponsor, TeamMember } from "../lib/types";

type ListResponse<T> = { items: T[]; total?: number; page?: number; limit?: number };

type HomeResponse = {
  novedades: Post[];
  latest: Post[];
  sponsors: Sponsor[];
  resources: Resource[];
  contactLinks: ContactLink[];
};

export const publicPostsService = {
  list(params: { section?: PostSection; type?: PostType; featured?: boolean; page?: number; limit?: number }) {
    return api.get<ListResponse<Post>>("/public/v2/posts", { params });
  },
  getBySlug(slug: string) {
    return api.get<{ post: Post }>(`/public/v2/posts/${slug}`);
  },
  getSection(section: PostSection) {
    return api.get<{ featured: Post | null; latest: Post[] }>(`/public/v2/sections/${section}`);
  },
  getHome() {
    return api.get<HomeResponse>("/public/v2/home");
  },
  getTeamMembers() {
    return api.get<{ items: TeamMember[]; grouped: Record<string, TeamMember[]> }>("/public/v2/team-members");
  },
  getSponsors() {
    return api.get<ListResponse<Sponsor>>("/public/v2/sponsors");
  },
  getResources() {
    return api.get<ListResponse<Resource>>("/public/v2/resources");
  },
  getContactLinks() {
    return api.get<ListResponse<ContactLink>>("/public/v2/contact-links");
  },
};
