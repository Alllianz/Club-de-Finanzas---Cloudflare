import { api } from "../lib/api";
import type { Article } from "../lib/types";

type PublicArticlesResponse = {
  items: Article[];
};

export const publicArticlesService = {
  async list(params: {
    section: "HOME" | "PORTFOLIO" | "RESEARCH" | "NEWS";
    featured?: boolean;
    limit?: number;
  }): Promise<PublicArticlesResponse> {
    return api.get<PublicArticlesResponse>("/public/articles", { params });
  },
};
