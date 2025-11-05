import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IRecentMatches } from '../models';
import { AppState } from '../services/app-state.service';

@Component({
  selector: 'app-score-card',
  templateUrl: './score-card.component.html',
  styleUrls: ['./score-card.component.scss'],
})
export class ScoreCardComponent implements OnInit {
  teamA = {
    name: 'a',
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: 0,
  };

  teamB = {
    name: 'b',
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: 0,
  };

  currentBatting: string | null = 'A';
  totalOvers = 5;
  target: number | null = null;
  requiredRR: number | null = null;
  runRate: number = 0;
  inning = 1;
  isLive = true;

  constructor(public router: Router, public appState: AppState) {}

  ngOnInit(): void {
    const matchData = this.appState.getMatchData();
    if (!matchData) {
      // No match data — navigate home
      this.router.navigateByUrl('/');
      return;
    }
    // Initialize teams and overs
    this.teamA.name = matchData.teamA || 'Team A';
    this.teamB.name = matchData.teamB || 'Team B';
    this.totalOvers = matchData.overs || this.totalOvers;
    // Reset any running state
    this.resetTeam(this.teamA);
    this.resetTeam(this.teamB);
    this.currentBatting = this.appState.currentBatting;
    this.inning = 1;
    this.isLive = true;
    this.target = null;
    this.requiredRR = null;
    this.runRate = 0;
  }

  get targetDisplay() {
    return this.target ? this.target : '-';
  }
  get requiredRRDisplay() {
    return this.requiredRR !== null ? this.requiredRR : '-';
  }
  get runRateDisplay() {
    return this.runRate.toFixed(2);
  }

  get battingTeam() {
    return this.currentBatting === 'A' ? this.teamA : this.teamB;
  }
  get bowlingTeam() {
    return this.currentBatting === 'A' ? this.teamB : this.teamA;
  }

  get scoreDisplay() {
    return `${this.battingTeam.runs}/${this.battingTeam.wickets}`;
  }
  get overDisplay() {
    return `${this.battingTeam.overs}.${this.battingTeam.balls}`;
  }

  // Utility: Reset team for new inning
  resetTeam(team: any) {
    team.runs = 0;
    team.wickets = 0;
    team.overs = 0;
    team.balls = 0;
    team.extras = 0;
  }

  // Correct inning logic and connect everything
  endInnings() {
    if (this.inning === 1) {
      this.target = this.battingTeam.runs + 1;
      this.currentBatting = this.currentBatting === 'A' ? 'B' : 'A';
      this.inning = 2;
      this.resetTeam(this.battingTeam); // Reset for next inning
      this.updateRequiredRR();
    } else {
      this.isLive = false;
      // Save result when match completes
      this.saveMatchResult();
    }
  }

  // Show which team is batting
  get currentBattingName() {
    return this.battingTeam.name;
  }

  // Show which team is bowling
  get currentBowlingName() {
    return this.bowlingTeam.name;
  }

  // Show inning status
  get inningStatus() {
    return this.isLive
      ? `Innings ${this.inning} · ${this.totalOvers} overs per side`
      : 'Match Ended';
  }

  handleRun(run: number) {
    if (!this.isLive) {
      alert('This match is ended, start a new match');
      this.startNewMatch();
      return;
    }

    this.battingTeam.runs += run;
    // If chasing in second inning, check for win immediately
    if (
      this.inning === 2 &&
      this.target &&
      this.battingTeam.runs >= this.target
    ) {
      this.isLive = false;
      this.updateRunRate();
      this.updateRequiredRR();
      this.saveMatchResult();
      return;
    }
    this.nextBall();
    this.updateRunRate();
    this.updateRequiredRR();
  }

  handleWicket() {
    this.battingTeam.wickets += 1;
    if (this.battingTeam.wickets === 10) {
      this.endInnings();
    } else {
      this.nextBall();
    }
    this.updateRunRate();
    this.updateRequiredRR();
  }

  handleExtra(type: 'wide' | 'noball' | 'bye') {
    this.battingTeam.extras += 1;
    this.battingTeam.runs += 1;
    // Extras do not count as balls
    // If chasing, check for immediate win
    if (
      this.inning === 2 &&
      this.target &&
      this.battingTeam.runs >= this.target
    ) {
      this.isLive = false;
      this.updateRunRate();
      this.updateRequiredRR();
      this.saveMatchResult();
      return;
    }
    this.updateRunRate();
    this.updateRequiredRR();
  }

  nextBall() {
    this.battingTeam.balls += 1;
    if (this.battingTeam.balls === 6) {
      this.battingTeam.overs += 1;
      this.battingTeam.balls = 0;
    }
    // End of innings by overs
    if (this.battingTeam.overs === this.totalOvers) {
      this.endInnings();
    }
  }

  startNextInning() {
    if (this.inning === 1) {
      this.endInnings();
    }
  }

  updateRunRate() {
    const balls = this.battingTeam.overs * 6 + this.battingTeam.balls;
    this.runRate =
      balls > 0 ? +(this.battingTeam.runs / (balls / 6)).toFixed(2) : 0;
  }

  updateRequiredRR() {
    if (this.inning === 2 && this.target) {
      const balls =
        this.totalOvers * 6 -
        (this.battingTeam.overs * 6 + this.battingTeam.balls);
      this.requiredRR =
        balls > 0
          ? +((this.target - this.battingTeam.runs) / (balls / 6)).toFixed(2)
          : 0;
    } else {
      this.requiredRR = null;
    }
  }

  backToHome() {
    this.router.navigateByUrl('/');
  }

  saveMatchResult() {
    let winner = '';
    if (this.teamA.runs > this.teamB.runs) {
      winner = `${this.teamA.name} won by ${
        this.teamA.runs - this.teamB.runs
      } runs`;
    } else if (this.teamB.runs > this.teamA.runs) {
      winner = `${this.teamB.name} won by ${10 - this.teamB.wickets} wickets`;
    } else {
      winner = 'Match Drawn';
    }
    const match: IRecentMatches = {
      teamA: {
        name: this.teamA.name,
        runs: this.teamA.runs.toString(),
        wickets: this.teamA.wickets.toString(),
        oversPlayed: `${this.teamA.overs}.${this.teamA.balls}`,
      },
      teamB: {
        name: this.teamB.name,
        runs: this.teamB.runs.toString(),
        wickets: this.teamB.wickets.toString(),
        oversPlayed: `${this.teamB.overs}.${this.teamB.balls}`,
      },
      teamWon: winner,
    };
  }

  public startNewMatch() {
    const matchData: any = this.appState.getMatchData();
    this.currentBatting = this.teamA.runs > this.teamB.runs ? 'A' : 'B';

    this.teamA = {
      name: matchData.teamA,
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: 0,
    };
    this.teamB = {
      name: matchData.teamB,
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: 0,
    };
    this.inning = 1;
    this.isLive = true;
    this.target = null;
    this.requiredRR = null;
    this.runRate = 0;
    this.totalOvers = matchData.overs;
  }
}
