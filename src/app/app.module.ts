import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomePageComponent } from './home-page/home-page.component';
import { RecentMatchCardComponent } from './recent-match-card/recent-match-card.component';
import { ScoreCardComponent } from './score-card/score-card.component';
import { TossComponent } from './toss/toss.component';

@NgModule({
  declarations: [
    AppComponent,
    RecentMatchCardComponent,
    ScoreCardComponent,
    HomePageComponent,
    TossComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
