import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ILiveMatchState, IRecentMatches } from '../models';
import { AppState } from '../services/app-state.service';
import { LiveScoreService } from '../services/live-score.service';

@Component({
  selector: 'app-score-card',
  templateUrl: './score-card.component.html',
  styleUrls: ['./score-card.component.scss'],
})
export class ScoreCardComponent implements OnInit {
  teamA = { name: 'Team A', runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 };
  teamB = { name: 'Team B', runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 };

  currentBatting: string = 'A';
  totalOvers = 5;
  target: number | null = null;
  requiredRR: number | null = null;
  runRate = 0;
  inning = 1;
  isLive = true;
  timeLine: string[] = [];

  get liveUrl(): string {
    return window.location.href.replace(/\/scorecard.*/, '/live');
  }

  constructor(
    public router: Router,
    public appState: AppState,
    private liveScore: LiveScoreService
  ) {}

  ngOnInit(): void {
    const matchData = this.appState.getMatchData();
    if (!matchData) {
      this.router.navigateByUrl('/');
      return;
    }
    this.teamA = { name: matchData.teamA || 'Team A', runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 };
    this.teamB = { name: matchData.teamB || 'Team B', runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 };
    this.totalOvers = matchData.overs || 5;
    this.currentBatting = this.appState.currentBatting ?? 'A';
    this.inning = 1;
    this.isLive = true;
    this.target = null;
    this.requiredRR = null;
    this.runRate = 0;
    this.timeLine = [];
    this.broadcast();
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get battingTeam()       { return this.currentBatting === 'A' ? this.teamA : this.teamB; }
  get bowlingTeam()       { return this.currentBatting === 'A' ? this.teamB : this.teamA; }
  get targetDisplay()     { return this.target ?? '-'; }
  get requiredRRDisplay() { return this.requiredRR !== null ? this.requiredRR : '-'; }
  get runRateDisplay()    { return this.runRate.toFixed(2); }
  get scoreDisplay()      { return `${this.battingTeam.runs}/${this.battingTeam.wickets}`; }
  get overDisplay()       { return `${this.battingTeam.overs}.${this.battingTeam.balls}`; }
  get currentBattingName(){ return this.battingTeam.name; }
  get currentBowlingName(){ return this.bowlingTeam.name; }
  get inningStatus() {
    return this.isLive
      ? `Innings ${this.inning} · ${this.totalOvers} overs per side`
      : 'Match Ended';
  }

  // ─── Score actions ────────────────────────────────────────────────────────

  handleRun(run: number) {
    if (!this.isLive) return;

    this.battingTeam.runs += run;
    this.timeLine.unshift(run.toString());

    // Chase win condition
    if (this.inning === 2 && this.target !== null && this.battingTeam.runs >= this.target) {
      this.updateRunRate();
      this.updateRequiredRR();
      this.finishMatch();
      return;
    }

    this.nextBall();
    this.updateRunRate();
    this.updateRequiredRR();
    this.broadcast();
  }

  handleWicket() {
    if (!this.isLive) return;

    this.battingTeam.wickets += 1;
    this.timeLine.unshift('W');

    if (this.battingTeam.wickets === 10) {
      this.updateRunRate();
      this.updateRequiredRR();
      this.endInnings(); // may call finishMatch()
      return;           // ← always return so broadcast() is not called again
    }

    this.nextBall();
    this.updateRunRate();
    this.updateRequiredRR();
    this.broadcast();
  }

  handleExtra(type: 'wide' | 'noball' | 'bye') {
    if (!this.isLive) return;

    this.battingTeam.extras += 1;
    this.battingTeam.runs += 1;
    const labels: Record<string, string> = { wide: 'WD', noball: 'NB', bye: 'B' };
    this.timeLine.unshift(labels[type]);

    // Chase win condition
    if (this.inning === 2 && this.target !== null && this.battingTeam.runs >= this.target) {
      this.updateRunRate();
      this.updateRequiredRR();
      this.finishMatch();
      return;
    }

    // Extras don't count as a ball faced — no nextBall()
    this.updateRunRate();
    this.updateRequiredRR();
    this.broadcast();
  }

  undoLastBall() {
    if (this.timeLine.length === 0) return;
    const last = this.timeLine.shift()!;

    if (last === 'W') {
      this.battingTeam.wickets = Math.max(0, this.battingTeam.wickets - 1);
      this.battingTeam.balls   = Math.max(0, this.battingTeam.balls - 1);
    } else if (last === 'WD' || last === 'NB' || last === 'B') {
      this.battingTeam.runs   = Math.max(0, this.battingTeam.runs - 1);
      this.battingTeam.extras = Math.max(0, this.battingTeam.extras - 1);
    } else {
      const n = parseInt(last, 10);
      if (!isNaN(n)) {
        this.battingTeam.runs  = Math.max(0, this.battingTeam.runs - n);
        this.battingTeam.balls = Math.max(0, this.battingTeam.balls - 1);
      }
    }

    // Recalculate overs from balls
    if (this.battingTeam.balls < 0) {
      if (this.battingTeam.overs > 0) { this.battingTeam.overs -= 1; this.battingTeam.balls = 5; }
      else { this.battingTeam.balls = 0; }
    }

    this.updateRunRate();
    this.updateRequiredRR();
    this.broadcast();
  }

  startNextInning() {
    if (this.inning === 1 && this.isLive) this.endInnings();
  }

  backToHome() { this.router.navigateByUrl('/'); }

  copyLiveUrl() {
    navigator.clipboard.writeText(this.liveUrl).then(() => alert('Live link copied!'));
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private nextBall() {
    this.battingTeam.balls += 1;
    if (this.battingTeam.balls === 6) {
      this.battingTeam.overs += 1;
      this.battingTeam.balls = 0;
    }
    if (this.battingTeam.overs >= this.totalOvers) {
      this.endInnings();
    }
  }

  private endInnings() {
    if (this.inning === 1) {
      this.target = this.battingTeam.runs + 1;
      this.currentBatting = this.currentBatting === 'A' ? 'B' : 'A';
      this.inning = 2;
      // Reset the new batting team's balls (they were just switched)
      this.battingTeam.runs = 0;
      this.battingTeam.wickets = 0;
      this.battingTeam.overs = 0;
      this.battingTeam.balls = 0;
      this.battingTeam.extras = 0;
      this.updateRequiredRR();
      this.broadcast();
    } else {
      this.finishMatch();
    }
  }

  private finishMatch() {
    this.isLive = false;
    this.saveMatchResult();
    this.broadcastFinal();
  }

  private updateRunRate() {
    const balls = this.battingTeam.overs * 6 + this.battingTeam.balls;
    this.runRate = balls > 0 ? +(this.battingTeam.runs / (balls / 6)).toFixed(2) : 0;
  }

  private updateRequiredRR() {
    if (this.inning === 2 && this.target !== null) {
      const remaining = this.totalOvers * 6 - (this.battingTeam.overs * 6 + this.battingTeam.balls);
      this.requiredRR = remaining > 0
        ? +((this.target - this.battingTeam.runs) / (remaining / 6)).toFixed(2) : 0;
    } else {
      this.requiredRR = null;
    }
  }

  private saveMatchResult() {
    let winner: string;
    if (this.teamA.runs > this.teamB.runs)
      winner = `${this.teamA.name} won by ${this.teamA.runs - this.teamB.runs} runs`;
    else if (this.teamB.runs > this.teamA.runs)
      winner = `${this.teamB.name} won by ${10 - this.teamB.wickets} wickets`;
    else
      winner = 'Match Drawn';

    const match: IRecentMatches = {
      teamA: { name: this.teamA.name, runs: String(this.teamA.runs), wickets: String(this.teamA.wickets), oversPlayed: `${this.teamA.overs}.${this.teamA.balls}` },
      teamB: { name: this.teamB.name, runs: String(this.teamB.runs), wickets: String(this.teamB.wickets), oversPlayed: `${this.teamB.overs}.${this.teamB.balls}` },
      teamWon: winner,
    };
    const history: IRecentMatches[] = JSON.parse(localStorage.getItem('runmeter_history') ?? '[]');
    history.unshift(match);
    localStorage.setItem('runmeter_history', JSON.stringify(history.slice(0, 20)));
  }

  // ─── LiveScoreService bridge ───────────────────────────────────────────────

  private buildState(status = 'live'): ILiveMatchState {
    return {
      matchId: 'live-match',
      status,
      inning: this.inning,
      totalOvers: this.totalOvers,
      teamA: { ...this.teamA },
      teamB: { ...this.teamB },
      currentBatting: this.currentBatting,
      target: this.target,
      runRate: this.runRate,
      requiredRR: this.requiredRR,
      timeLine: [...this.timeLine],
      lastUpdated: new Date().toISOString(),
    };
  }

  private broadcast()      { this.liveScore.updateState(this.buildState('live')); }
  private broadcastFinal() { this.liveScore.finaliseMatch(this.buildState('ended')); }
}
