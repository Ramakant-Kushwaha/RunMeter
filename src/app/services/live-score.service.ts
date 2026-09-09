import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ILiveMatchState } from '../models';

/**
 * LiveScoreService
 * ────────────────
 * Zero-dependency live score sharing — no external API, no authentication.
 *
 * How it works:
 *  • Admin updates scores in /scorecard.
 *  • Each update is written to localStorage AND broadcast via BroadcastChannel.
 *  • /live tab receives the broadcast instantly and re-renders.
 *  • On first load, reads from localStorage (if a match is in progress)
 *    or falls back to the seed JSON in assets.
 *
 * Cross-tab sharing:  BroadcastChannel = instant push within the same browser.
 * Persistence:        localStorage keeps the state if /live is refreshed.
 * Seed data:          assets/matches/live-match.json defines the initial schema.
 */
@Injectable({ providedIn: 'root' })
export class LiveScoreService implements OnDestroy {
  private readonly STORAGE_KEY = 'runmeter_live_match';
  private readonly CHANNEL_NAME = 'runmeter_live';

  private stateSubject = new BehaviorSubject<ILiveMatchState | null>(null);
  /** Emit on every state change — subscribe in live-view component. */
  matchState$ = this.stateSubject.asObservable();

  private channel = new BroadcastChannel(this.CHANNEL_NAME);

  constructor(private http: HttpClient) {
    // Listen for score updates broadcast from the admin tab
    this.channel.onmessage = (event: MessageEvent<ILiveMatchState | null>) => {
      this.stateSubject.next(event.data);
    };

    this.loadInitialState();
  }

  private loadInitialState(): void {
    // 1. Check localStorage — a match may already be in progress
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this.stateSubject.next(JSON.parse(raw) as ILiveMatchState);
        return;
      } catch { /* corrupted data — fall through */ }
    }
    // 2. Fall back to the seed JSON file
    this.http
      .get<ILiveMatchState>('assets/matches/live-match.json')
      .subscribe({ next: (s) => this.stateSubject.next(s), error: () => {} });
  }

  /**
   * Called by the admin scorecard after every ball.
   * Persists to localStorage + broadcasts to all open /live tabs.
   */
  updateState(state: ILiveMatchState): void {
    const stamped: ILiveMatchState = { ...state, lastUpdated: new Date().toISOString() };
    this.stateSubject.next(stamped);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stamped));
    this.channel.postMessage(stamped);
  }

  /**
   * Called when a match ends.
   * Broadcasts the final 'ended' state, then clears storage after 5 seconds.
   */
  finaliseMatch(state: ILiveMatchState): void {
    const ended: ILiveMatchState = { ...state, status: 'ended', lastUpdated: new Date().toISOString() };
    this.stateSubject.next(ended);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ended));
    this.channel.postMessage(ended);

    setTimeout(() => {
      localStorage.removeItem(this.STORAGE_KEY);
      this.stateSubject.next(null);
      this.channel.postMessage(null);
    }, 5000);
  }

  ngOnDestroy(): void {
    this.channel.close();
  }
}
