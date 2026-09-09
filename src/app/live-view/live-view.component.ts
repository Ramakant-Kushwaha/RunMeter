import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ILiveMatchState } from '../models';
import { LiveScoreService } from '../services/live-score.service';

/**
 * LiveViewComponent  (/live)
 * ──────────────────────────
 * Read-only scoreboard. Receives instant updates via BroadcastChannel
 * whenever the admin records a ball in /scorecard (same browser, any tab).
 * Also reads from localStorage so the page works after a refresh.
 */
@Component({
  selector: 'app-live-view',
  templateUrl: './live-view.component.html',
})
export class LiveViewComponent implements OnInit, OnDestroy {
  matchState: ILiveMatchState | null = null;
  isLoading = true;

  private sub?: Subscription;

  constructor(private liveScore: LiveScoreService) {}

  ngOnInit(): void {
    this.sub = this.liveScore.matchState$.subscribe((state) => {
      this.matchState = state;
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
