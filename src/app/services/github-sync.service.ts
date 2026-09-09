import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, interval, switchMap, startWith, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { ILiveMatchState } from '../models';

/**
 * GitHubSyncService
 * -----------------
 * Handles two-way sync of the live match state with a JSON file hosted in a
 * GitHub repository, served as a static asset on GitHub Pages.
 *
 * READS  — viewers poll the Pages-served asset URL (no auth needed).
 * WRITES — the admin commits new JSON via the GitHub Contents API using a
 *          Personal Access Token stored in sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class GitHubSyncService {
  /** Base URL for the GitHub Contents REST API */
  private readonly apiBase = `https://api.github.com/repos/${environment.githubOwner}/${environment.githubRepo}/contents/${environment.liveMatchFile}`;

  /**
   * URL of the JSON file as served by GitHub Pages.
   * Using a relative path so it works both locally (ng serve) and on Pages.
   */
  private readonly assetUrl = `assets/matches/live-match.json`;

  constructor(private http: HttpClient) {}

  // ─── ADMIN: Read current file SHA (required for GitHub Contents API PUT) ──

  /** Fetches current file metadata (including sha) from the GitHub API. */
  private getCurrentFileSha(): Observable<{ sha: string; content: string }> {
    return this.http.get<{ sha: string; content: string }>(this.apiBase, {
      headers: {
        Authorization: `Bearer ${environment.githubPat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  // ─── ADMIN: Push updated match state to GitHub ────────────────────────────

  /**
   * Commits the new match state JSON to the repository.
   * Returns an Observable that completes when GitHub confirms the commit.
   */
  pushMatchState(state: ILiveMatchState): Observable<any> {
    const updatedState: ILiveMatchState = {
      ...state,
      lastUpdated: new Date().toISOString(),
    };

    // GitHub Contents API requires the file content as base64.
    const content = btoa(
      unescape(encodeURIComponent(JSON.stringify(updatedState, null, 2)))
    );

    return new Observable((observer) => {
      // Step 1: Get the current SHA (required for updates)
      this.getCurrentFileSha().subscribe({
        next: (fileInfo) => {
          // Step 2: PUT the new content
          this.http
            .put(
              this.apiBase,
              {
                message: `chore: update live score [${new Date().toISOString()}]`,
                content,
                sha: fileInfo.sha,
                branch: environment.githubBranch,
              },
              {
                headers: {
                  Authorization: `Bearer ${environment.githubPat}`,
                  Accept: 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                },
              }
            )
            .subscribe({
              next: (res) => { observer.next(res); observer.complete(); },
              error: (err) => observer.error(err),
            });
        },
        error: (err) => observer.error(err),
      });
    });
  }

  // ─── VIEWER: Poll the static asset every N seconds ───────────────────────

  /**
   * Returns a hot Observable that emits a fresh ILiveMatchState on every poll.
   * The `?t=` query param busts the GitHub Pages CDN cache on each request.
   *
   * @param intervalMs  Polling frequency in milliseconds (default: 10 000)
   */
  pollMatchState(intervalMs = 10_000): Observable<ILiveMatchState> {
    return interval(intervalMs).pipe(
      startWith(0),                          // emit immediately on subscribe
      switchMap(() =>
        this.http.get<ILiveMatchState>(
          `${this.assetUrl}?t=${Date.now()}`
        )
      ),
      shareReplay(1)
    );
  }
}
