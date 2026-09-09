import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable } from 'rxjs';
import { ILiveMatchState } from '../models';

/**
 * FirebaseService
 * ───────────────
 * All Realtime Database interactions in one place.
 *
 * Database structure:
 *   live-match/          ← single node for the current match
 *     matchId: string
 *     status:  'idle' | 'live' | 'ended'
 *     ...
 *
 * Security rules (set in Firebase Console):
 *   {
 *     "rules": {
 *       "live-match": {
 *         ".read":  true,          ← anyone can read (spectators)
 *         ".write": "auth != null" ← only authenticated admin can write
 *       }
 *     }
 *   }
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private readonly PATH = 'live-match';

  constructor(private db: AngularFireDatabase) {}

  /**
   * Writes (overwrites) the entire match state node.
   * Called by the admin after every ball.
   */
  pushMatchState(state: ILiveMatchState): Promise<void> {
    const payload = { ...state, lastUpdated: new Date().toISOString() };
    return this.db.object(this.PATH).set(payload);
  }

  /**
   * Returns a live Observable that emits whenever the database node changes.
   * Emits null when the node is deleted (match over).
   * Used by the spectator live-view — no polling, instant push.
   */
  listenMatchState(): Observable<ILiveMatchState | null> {
    return this.db.object<ILiveMatchState>(this.PATH).valueChanges();
  }

  /**
   * Removes the match node entirely from the database.
   * Called when the match is completed — keeps the DB clean.
   */
  deleteMatch(): Promise<void> {
    return this.db.object(this.PATH).remove();
  }
}
