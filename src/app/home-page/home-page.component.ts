import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppState } from '../services/app-state.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent {
  matchForm!: FormGroup;
  submitted = false;
  createdMatch: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private appState: AppState
  ) {}

  ngOnInit(): void {
    this.matchForm = this.fb.group({
      teamA: ['', Validators.required],
      teamB: ['', Validators.required],
      overs: [5, [Validators.required, Validators.min(1)]],
    });
  }

  onSubmit(): void {
    if (this.matchForm.valid) {
      this.createdMatch = this.matchForm.value;
      this.submitted = true;
      this.appState.setMatchData(this.createdMatch);
      this.router.navigate(['/toss']);
      this.matchForm.reset({ overs: 5 });
    } else {
      this.matchForm.markAllAsTouched();
    }
  }
}
