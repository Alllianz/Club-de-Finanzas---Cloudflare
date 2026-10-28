import { api } from "../lib/api";
import type { TeamMember } from "../lib/types";

type PublicTeamResponse = {
  items: TeamMember[];
};

export const publicTeamService = {
  async list(): Promise<PublicTeamResponse> {
    return api.get<PublicTeamResponse>("/public/team-members");
  },
};

