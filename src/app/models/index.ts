export interface IRecentMatches {
  teamA: ITeamInfo;

  teamB: ITeamInfo;

  teamWon: string;
}

interface ITeamInfo {
  name: string;
  runs: string;
  wickets: string;
  oversPlayed: string;
}
