import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { ScoreCardComponent } from './score-card/score-card.component';
import { TossComponent } from './toss/toss.component';
import { LiveViewComponent } from './live-view/live-view.component';

const routes: Routes = [
  { path: '', component: HomePageComponent, pathMatch: 'full' },
  { path: 'toss', component: TossComponent },
  // Admin scores here — no login required
  { path: 'scorecard', component: ScoreCardComponent },
  // Spectators open this link
  { path: 'live', component: LiveViewComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
