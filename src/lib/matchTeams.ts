export interface MatchTeamsInput {
  opponent?: string | null;
  home_team?: string | null;
  is_other_teams?: boolean | null;
  napoli_is_home?: boolean | null;
  category?: { name?: string | null } | null;
}

export interface ResolvedMatchTeams {
  homeName: string;
  awayName: string;
  isNapoliMatch: boolean;
  napoliDisplayName: string;
}

export const NAPOLI_TEAM_NAME = "Napoli Campania";

export const resolveMatchTeams = (match: MatchTeamsInput): ResolvedMatchTeams => {
  const categoryName = match.category?.name?.trim();
  const napoliDisplayName = categoryName ? `${NAPOLI_TEAM_NAME} ${categoryName}` : NAPOLI_TEAM_NAME;
  const isNapoliMatch = !match.is_other_teams;

  if (!isNapoliMatch) {
    return {
      homeName: match.home_team?.trim() || "Casa",
      awayName: match.opponent?.trim() || "Ospite",
      isNapoliMatch: false,
      napoliDisplayName,
    };
  }

  const napoliIsHome = match.napoli_is_home !== false;
  const opponentName = match.opponent?.trim() || "Avversario";

  return {
    homeName: napoliIsHome ? NAPOLI_TEAM_NAME : opponentName,
    awayName: napoliIsHome ? opponentName : NAPOLI_TEAM_NAME,
    isNapoliMatch: true,
    napoliDisplayName,
  };
};