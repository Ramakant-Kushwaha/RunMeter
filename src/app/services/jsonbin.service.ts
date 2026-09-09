import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, interval, throwError } from 'rxjs';
import { catchError, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ILiveMatchState } from '../models';

/**
 * JsonBinService
 * ──────────────
 * All JSONBin.io interactions in one place. Uses plain HttpClient — no extra SDK.
 *
 * Bin setup (one-time):
 *  1. jsonbin.io → New Bin → paste the initial JSON → Save
 *  2. Bin Settings → enable "Make Bin Public" (viewers can read without auth)
 *  3. API Keys → Create Access Key → Bin Write → copy key to environment.ts
 *
 * READS  — public GET, no auth header (safe for spectators)
 * WRITES — PUT with X-Access-Key header (admin only, key in env file)
 * RESET  — PUT with idle state (effectively "clears" the match)
 */
@Injectable({ providedIn: 'root' })
export class JsonBinService {
  private readonly base =
    `https://api.jsonbin.io/v3/b/${environment.jsonbin.binId}`;

  /** Headers used for write operations (admin) */
  private get writeHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Access-Key': environment.jsonbin.accessKey,
    });
  }

  constructor(private http: HttpClient) {}

  // ─── Read (public, no auth) ───────────────────────────────────────────────

  /**
   * Fetches the latest bin record once.
   * JSONBin wraps the payload in { record: { ... }, metadata: { ... } }.
   */
  getMatchState(): Observable<ILiveMatchState> {
    return this.http
      .get<{ record: ILiveMatchState }>(`${this.base}/latest`)
      .pipe(map((res) => res.record));
  }

  /**
   * Returns a hot Observable that emits a fresh ILiveMatchState every N ms.
   * Used by the spectator live-view — simple polling, no WebSocket needed.
   */
  pollMatchState(intervalMs = environment.pollIntervalMs): Observable<ILiveMatchState> {
    return interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.getMatchState()),
      shareReplay(1)
    );
  }

  // ─── Write (admin, requires access key) ───────────────────────────────────

  /**
   * Overwrites the entire bin with the current match state.
   * Called after every ball action by the admin scorecard.
   */
  pushMatchState(state: ILiveMatchState): Observable<any> {
    const payload: ILiveMatchState = {
      ...state,
      lastUpdated: new Date().toISOString(),
    };
    return this.http
      .put(this.base, payload, { headers: this.writeHeaders })
      .pipe(
        catchError((err) => {
          console.error('JSONBin write error:', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Resets the bin to an idle/empty state — effectively "deletes" the match.
   * Called 5 seconds after match completion so spectators see the result first.
   */
  resetMatch(teamAName = 'Team A', teamBName = 'Team B'): Observable<any> {
    const idleState: ILiveMatchState = {
      matchId: 'live-match',
      status: 'idle',
      inning: 1,
      totalOvers: 5,
      teamA: { name: teamAName, runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 },
      teamB: { name: teamBName, runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 },
      currentBatting: 'A',
      target: null,
      runRate: 0,
      requiredRR: null,
      timeLine: [],
      lastUpdated: new Date().toISOString(),
    };
    return this.http.put(this.base, idleState, { headers: this.writeHeaders });
  }
}
