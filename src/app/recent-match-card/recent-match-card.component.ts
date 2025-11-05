import { Component } from '@angular/core';
import { IRecentMatches } from '../models';
import { AppState } from '../services/app-state.service';

@Component({
  selector: 'app-recent-match-card',
  templateUrl: './recent-match-card.component.html',
  styleUrls: ['./recent-match-card.component.scss'],
})
export class RecentMatchCardComponent {
  public recentMatches: IRecentMatches[] = [];
  constructor(private appState: AppState) {}
  ngOnInit() {
    this.appState.recentMatches$.subscribe((matches) => {
      this.recentMatches = [];
    });
  }
}
