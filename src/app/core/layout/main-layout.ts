import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar class="bar">
      <span class="bar__title">Gestão de usuários</span>
      <span class="bar__spacer"></span>
      <span class="bar__user">{{ auth.session()?.email }} ({{ auth.session()?.role }})</span>
      <button mat-button (click)="auth.logout()">Sair</button>
    </mat-toolbar>
    <router-outlet />
  `,
  styles: `
    .bar { gap: 12px; }
    .bar__spacer { flex: 1 1 auto; }
    .bar__user { font-size: 0.875rem; }
  `,
})
export class MainLayout {
  protected readonly auth = inject(AuthService);
}