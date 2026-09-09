import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ILiveMatchState, IRecentMatches } from '../models';

@Injectable({ providedIn: 'root' })
export class AppState {
  private matchDataSubject = new BehaviorSubject<any>(null);
  matchData$ = this.matchDataSubject.asObservable();

  public currentBatting: string | null = null;

  private recentMatchesSubject = new BehaviorSubject<IRecentMatches[]>([]);
  recentMatches$ = this.recentMatchesSubject.asObservable();

  // ─── Live match state shared between admin and live-view ─────────────────

  private liveMatchSubject = new BehaviorSubject<ILiveMatchState | null>(null);
  /** Emits every time the admin pushes an update or a poll returns new data. */
  liveMatch$ = this.liveMatchSubject.asObservable();

  setLiveMatch(state: ILiveMatchState) {
    this.liveMatchSubject.next(state);
  }

  getLiveMatch(): ILiveMatchState | null {
    return this.liveMatchSubject.value;
  }

  // ─── Match setup data ─────────────────────────────────────────────────────

  setMatchData(data: any) {
    this.matchDataSubject.next(data);
  }

  getMatchData() {
    return this.matchDataSubject.value;
  }
}

