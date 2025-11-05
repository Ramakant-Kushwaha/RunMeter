import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppState } from '../services/app-state.service';

@Component({
  selector: 'app-toss',
  templateUrl: './toss.component.html',
  styleUrls: ['./toss.component.scss'],
})
export class TossComponent {
  public isFlipping = false;
  public result: string | null = null;
  coinImage = 'assets/head.png';
  private flipDuration = 3000;
  public selectedTeam: string = '';
  public selectedCall: string = 'Heads';

  public matchData: any;

  constructor(public appState: AppState, public router: Router) {}

  ngOnInit(): void {
    this.matchData = this.appState.getMatchData();
  }

  public flipCoin() {
    if (this.isFlipping) return;

    this.changeCoinImage();

    this.isFlipping = true;
    this.result = null;
    this.coinImage = 'assets/head.png';

    setTimeout(() => {
      const isHeads = Math.random() < 0.5;
      this.coinImage = isHeads ? 'assets/head.png' : 'assets/tail.png';
      this.result = isHeads ? 'Head' : 'Tail';
      this.isFlipping = false;
    }, this.flipDuration);
  }

  public changeCoinImage() {
    let isHead = true;
    const intervalTime = 200;

    const interval = setInterval(() => {
      this.coinImage = isHead ? 'assets/head.png' : 'assets/tail.png';
      isHead = !isHead;
    }, intervalTime);

    // Optional: stop after some time (e.g. 2 seconds)
    setTimeout(() => clearInterval(interval), 3000);
  }

  public onChoose(choice: string) {
    const teamWon =
      this.selectedCall == this.result
        ? this.selectedTeam == 'A'
          ? 'A'
          : 'B'
        : this.selectedTeam == 'A'
        ? 'B'
        : 'A';

    if (choice === 'Bat') {
      this.appState.currentBatting = teamWon;
    } else {
      this.appState.currentBatting = teamWon == 'A' ? 'B' : 'A';
    }

    this.router.navigateByUrl('/scorecard');
  }
}
