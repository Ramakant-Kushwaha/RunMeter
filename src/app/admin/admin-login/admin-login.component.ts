import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

/**
 * AdminLoginComponent  (/admin)
 * ─────────────────────────────
 * Username / password login.  Credentials: admin / admin.
 * On success writes a session flag to sessionStorage (cleared on tab close).
 * To change credentials update ADMIN_USER / ADMIN_PASS below.
 */
@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
})
export class AdminLoginComponent {
  form: FormGroup;
  showPassword = false;
  loginError = false;

  private readonly ADMIN_USER = 'admin';
  private readonly ADMIN_PASS = 'admin';

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  login() {
    this.loginError = false;
    if (this.form.invalid) return;
    const { username, password } = this.form.value as { username: string; password: string };
    if (username.trim() === this.ADMIN_USER && password === this.ADMIN_PASS) {
      sessionStorage.setItem('admin_logged_in', 'true');
      this.router.navigateByUrl('/admin/scorecard');
    } else {
      this.loginError = true;
    }
  }

  togglePassword() { this.showPassword = !this.showPassword; }
}
