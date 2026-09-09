import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

/**
 * Blocks /admin/scorecard unless admin has logged in this session.
 * sessionStorage is cleared automatically when the tab is closed.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    if (sessionStorage.getItem('admin_logged_in') === 'true') return true;
    this.router.navigateByUrl('/admin');
    return false;
  }
}
