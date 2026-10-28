export type Role = "ADMIN" | "EDITOR";
export type TeamSection = "LEADERSHIP" | "PORTFOLIO" | "RESEARCH" | "RRII";
export type PostType = "REPORT" | "NEWSLETTER" | "EVENT";
export type PostSection = "HOME" | "PORTFOLIO" | "RESEARCH" | "NEWSLETTER" | "INSTITUTIONAL";
export type PostStatus = "DRAFT" | "PUBLISHED";
export type AssetKind = "PDF" | "IMAGE" | "FLYER";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
};

export type AuthResponse = {
  user: AuthUser;
};

export type ArticleSection = "HOME" | "PORTFOLIO" | "RESEARCH" | "NEWS";
export type ArticleStatus = "DRAFT" | "PUBLISHED";

export type Article = {
  id: string;
  section: ArticleSection;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  ctaLabel: string;
  ctaUrl: string;
  status: ArticleStatus;
  publishedAt: string | null;
  isFeatured: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};
export type ArticleAuthor = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

export type AdminArticle = Article & {
  author?: ArticleAuthor;
};

export type MarketDirection = "up" | "down" | "flat";
export type MarketStatus = "positive" | "negative" | "neutral";

export type GlobalMarketItem = {
  symbol: string;
  label: string;
  value: number | null;
  changePercent: number | null;
  direction: MarketDirection;
  status: MarketStatus;
  updatedAt: string | null;
  source: "Alpha Vantage";
};

export type GlobalMarketSection = {
  key: "indices" | "rates" | "energy";
  title: string;
  items: GlobalMarketItem[];
};

export type GlobalMarketResponse = {
  updatedAt: string;
  sections: GlobalMarketSection[];
  stale?: boolean;
};

export type CedearItem = {
  companyName: string;
  bymaCode: string;
  listedMarket: string;
  ratio: string;
};

export type CedearsResponse = {
  updatedAt: string;
  total: number;
  markets: string[];
  items: CedearItem[];
};

export type CountryRiskPoint = {
  date: string;
  value: number;
};

export type CountryRiskResponse = {
  updatedAt: string;
  source: "ArgentinaDatos";
  total: number;
  items: CountryRiskPoint[];
  stale?: boolean;
};

export type CountryRiskLatestResponse = {
  updatedAt: string;
  source: "ArgentinaDatos";
  item: CountryRiskPoint;
  stale?: boolean;
};

export type LetrasPoint = {
  ticker: string;
  fechaEmision: string | null;
  fechaVencimiento: string;
  dtmDays: number;
  temPercent: number | null;
  tnaPercent: number | null;
  teaPercent: number | null;
  vpv: number;
  price: number;
};

export type LetrasCurveResponse = {
  updatedAt: string;
  tradingDate: string;
  source: "ArgentinaDatos";
  stale: boolean;
  total: number;
  points: LetrasPoint[];
  curve: {
    coefficients: {
      a: number;
      b: number;
      c: number;
      points: number;
    } | null;
    sample: {
      dtmDays: number;
      teaPercent: number;
    }[];
  };
};

export type TeamMember = {
  id: string;
  fullName: string;
  title: string;
  shortBio: string | null;
  imageUrl: string | null;
  profileUrl: string | null;
  section: TeamSection;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PostAsset = {
  id: string;
  postId: string;
  kind: AssetKind;
  url: string;
  sortOrder: number;
  createdAt: string;
};

export type PostAuthor = {
  id: string;
  postId: string;
  teamMemberId: string;
  sortOrder: number;
  teamMember: TeamMember;
};

export type EventMeta = {
  id: string;
  postId: string;
  eventDate: string;
  registrationUrl: string | null;
  pinUntil: string;
};

export type Post = {
  id: string;
  slug: string;
  type: PostType;
  section: PostSection;
  status: PostStatus;
  title: string;
  summary: string;
  body: string | null;
  isFeatured: boolean;
  featuredOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assets: PostAsset[];
  authors: PostAuthor[];
  eventMeta: EventMeta | null;
};

export type Sponsor = {
  id: string;
  name: string;
  logoUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Resource = {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type ContactLink = {
  id: string;
  kind: string;
  label: string;
  value: string | null;
  href: string;
  sortOrder: number;
  isActive: boolean;
};
