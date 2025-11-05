import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IRecentMatches } from '../models';

@Injectable({ providedIn: 'root' })
export class AppState {
  private matchDataSubject = new BehaviorSubject<any>(null);
  matchData$ = this.matchDataSubject.asObservable();

  public currentBatting: string | null = null;

  private recentMatchesSubject = new BehaviorSubject<IRecentMatches[]>([]);
  recentMatches$ = this.recentMatchesSubject.asObservable();

  setMatchData(data: any) {
    this.matchDataSubject.next(data);
  }

  getMatchData() {
    return this.matchDataSubject.value;
  }
}
