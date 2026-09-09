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

// ─── Live Match State (synced via GitHub Contents API) ────────────────────────

export interface ITeamScore {
  name: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: number;
}

/** Mirrors the schema of src/assets/matches/live-match.json */
export interface ILiveMatchState {
  matchId: string;
  /** 'idle' | 'live' | 'ended' */
  status: string;
  inning: number;
  totalOvers: number;
  teamA: ITeamScore;
  teamB: ITeamScore;
  /** 'A' | 'B' */
  currentBatting: string;
  target: number | null;
  runRate: number;
  requiredRR: number | null;
  timeLine: string[];
  lastUpdated: string;
}
