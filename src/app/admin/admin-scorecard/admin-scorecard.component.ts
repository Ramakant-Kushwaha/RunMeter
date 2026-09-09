import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ILiveMatchState, IRecentMatches } from '../../models';
import { AppState } from '../../services/app-state.service';
import { JsonBinService } from '../../services/jsonbin.service';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * AdminScorecardComponent  (/admin/scorecard)
 * ─────────────────────────────────────────────
 * Full scoring panel. Every ball action syncs state to JSONBin so spectators
 * polling /live see the update within their next poll cycle (≤10s).
 *
 * On match completion:
 *  1. Final state (status:'ended') is written → spectators see result banner.
 *  2. After 5 seconds resetMatch() is called → bin returns to idle state →
 *     /live shows "No Active Match".
 */
@Component({
  selector: 'app-admin-scorecard',
  templateUrl: './admin-scorecard.component.html',
  styleUrls: ['./admin-scorecard.component.scss'],
})
export class AdminScorecardComponent implements OnInit {
  teamA = { name: 'Team A', runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 };
  teamB = { name: 'Team B', runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 };

  currentBatting = 'A';
  totalOvers = 5;
  target: number | null = null;
  requiredRR: number | null = null;
  runRate = 0;
  inning = 1;
  isLive = true;
  timeLine: string[] = [];
  matchResult = '';
  deletingMatch = false;

  syncStatus: SyncStatus = 'idle';
  syncMessage = '';

  get liveUrl(): string {
    return `${window.location.origin}${window.location.pathname.replace(/\/admin.*/, '')}/live`;
  }

  constructor(
    public router: Router,
    public appState: AppState,
    private jsonBin: JsonBinService
  ) {}

  ngOnInit(): void {
    const matchData = this.appState.getMatchData();
    if (matchData) {
      this.teamA.name = matchData.teamA || 'Team A';
      this.teamB.name = matchData.teamB || 'Team B';
      this.totalOvers = matchData.overs || this.totalOvers;
      this.currentBatting = this.appState.currentBatting ?? 'A';
    }
    this.resetTeam(this.teamA);
    this.resetTeam(this.teamB);
    this.syncToJsonBin(); // push initial 'live' state
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get battingTeam() { return this.currentBatting === 'A' ? this.teamA : this.teamB; }
  get bowlingTeam()  { return this.currentBatting === 'A' ? this.teamB : this.teamA; }
  get targetDisplay()     { return this.target ?? '—'; }
  get requiredRRDisplay() { return this.requiredRR !== null ? this.requiredRR : '—'; }
  get runRateDisplay()    { return this.runRate.toFixed(2); }
  get inningStatus() {
    return this.isLive
      ? `Innings ${this.inning} · ${this.totalOvers} overs per side`
      : 'Match Ended';
  }

  // ─── Score actions ────────────────────────────────────────────────────────

  handleRun(run: number) {
    if (!this.isLive) return;
    this.timeLine.unshift(run.toString());
    this.battingTeam.runs += run;
    if (this.inning === 2 && this.target && this.battingTeam.runs >= this.target) {
      this.endMatch(); return;
    }
    this.nextBall();
    this.updateRunRate();
    this.updateRequiredRR();
    this.syncToJsonBin();
  }

  handleWicket() {
    if (!this.isLive) return;
    this.timeLine.unshift('W');
    this.battingTeam.wickets += 1;
    if (this.battingTeam.wickets === 10) { this.endInnings(); }
    else { this.nextBall(); }
    this.updateRunRate();
    this.updateRequiredRR();
    this.syncToJsonBin();
  }

  handleExtra(type: 'wide' | 'noball' | 'bye') {
    if (!this.isLive) return;
    this.battingTeam.extras += 1;
    this.battingTeam.runs += 1;
    const labels: Record<string, string> = { wide: 'WD', noball: 'NB', bye: 'B' };
    this.timeLine.unshift(labels[type]);
    if (this.inning === 2 && this.target && this.battingTeam.runs >= this.target) {
      this.endMatch(); return;
    }
    this.updateRunRate();
    this.updateRequiredRR();
    this.syncToJsonBin();
  }

  undoLastBall() {
    if (this.timeLine.length === 0) return;
    const last = this.timeLine.shift()!;
    if (/^[1-3]$/.test(last)) { this.battingTeam.runs -= +last; this.battingTeam.balls -= 1; }
    else if (last === '4') { this.battingTeam.runs -= 4; this.battingTeam.balls -= 1; }
    else if (last === '6') { this.battingTeam.runs -= 6; this.battingTeam.balls -= 1; }
    else if (last === 'W') { this.battingTeam.wickets -= 1; this.battingTeam.balls -= 1; }
    else if (last === '0') { this.battingTeam.balls -= 1; }
    else if (['WD', 'NB', 'B'].includes(last)) { this.battingTeam.runs -= 1; this.battingTeam.extras -= 1; }
    this.updateRunRate();
    this.updateRequiredRR();
    this.syncToJsonBin();
  }

  startNextInning() { if (this.inning === 1 && this.isLive) this.endInnings(); }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private resetTeam(team: typeof this.teamA) {
    team.runs = 0; team.wickets = 0; team.overs = 0; team.balls = 0; team.extras = 0;
  }

  private nextBall() {
    this.battingTeam.balls += 1;
    if (this.battingTeam.balls === 6) { this.battingTeam.overs += 1; this.battingTeam.balls = 0; }
    if (this.battingTeam.overs === this.totalOvers) this.endInnings();
  }

  private endInnings() {
    if (this.inning === 1) {
      this.target = this.battingTeam.runs + 1;
      this.currentBatting = this.currentBatting === 'A' ? 'B' : 'A';
      this.inning = 2;
      this.resetTeam(this.battingTeam);
      this.updateRequiredRR();
    } else {
      this.endMatch();
    }
  }

  private endMatch() {
    this.isLive = false;
    this.updateRunRate();
    this.updateRequiredRR();

    if (this.teamA.runs > this.teamB.runs)
      this.matchResult = `${this.teamA.name} won by ${this.teamA.runs - this.teamB.runs} runs`;
    else if (this.teamB.runs > this.teamA.runs)
      this.matchResult = `${this.teamB.name} won by ${10 - this.teamB.wickets} wickets`;
    else
      this.matchResult = 'Match Drawn';

    // Step 1 — push final 'ended' state so spectators see the result banner
    this.syncStatus = 'syncing';
    this.jsonBin.pushMatchState(this.buildState('ended')).subscribe({
      next: () => {
        this.syncStatus = 'synced';
        this.deletingMatch = true;
        // Step 2 — reset to idle after 5 s so /live shows "No Active Match"
        setTimeout(() => {
          this.jsonBin.resetMatch(this.teamA.name, this.teamB.name).subscribe({
            next: () => { this.deletingMatch = false; },
            error: console.error,
          });
        }, 5000);
      },
      error: (err) => {
        this.syncStatus = 'error';
        this.syncMessage = err?.message ?? 'JSONBin write failed.';
      },
    });
  }

  private updateRunRate() {
    const balls = this.battingTeam.overs * 6 + this.battingTeam.balls;
    this.runRate = balls > 0 ? +(this.battingTeam.runs / (balls / 6)).toFixed(2) : 0;
  }

  private updateRequiredRR() {
    if (this.inning === 2 && this.target) {
      const balls = this.totalOvers * 6 - (this.battingTeam.overs * 6 + this.battingTeam.balls);
      this.requiredRR = balls > 0
        ? +((this.target - this.battingTeam.runs) / (balls / 6)).toFixed(2) : 0;
    } else { this.requiredRR = null; }
  }

  // ─── JSONBin sync ─────────────────────────────────────────────────────────

  private buildState(status = 'live'): ILiveMatchState {
    return {
      matchId: 'live-match', status,
      inning: this.inning, totalOvers: this.totalOvers,
      teamA: { ...this.teamA }, teamB: { ...this.teamB },
      currentBatting: this.currentBatting,
      target: this.target, runRate: this.runRate, requiredRR: this.requiredRR,
      timeLine: [...this.timeLine],
      lastUpdated: new Date().toISOString(),
    };
  }

  syncToJsonBin() {
    this.syncStatus = 'syncing';
    this.syncMessage = '';
    this.jsonBin.pushMatchState(this.buildState()).subscribe({
      next: () => {
        this.syncStatus = 'synced';
        this.appState.setLiveMatch(this.buildState());
      },
      error: (err) => {
        this.syncStatus = 'error';
        this.syncMessage = err?.error?.message ?? 'JSONBin sync failed. Check your access key.';
      },
    });
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  copyLiveUrl() {
    navigator.clipboard.writeText(this.liveUrl).then(() => alert('Live URL copied!'));
  }

  logout() {
    sessionStorage.removeItem('admin_logged_in');
    this.router.navigateByUrl('/admin');
  }

  backToHome() { this.router.navigateByUrl('/'); }
}
