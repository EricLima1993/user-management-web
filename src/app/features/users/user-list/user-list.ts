import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-user-list',
  imports: [MatButtonModule],
  template: `
    <p>Logado como {{ auth.session()?.email }} ({{ auth.session()?.role }})</p>
    <button mat-flat-button (click)="auth.logout()">Sair</button>
  `,
})
export class UserList {
  protected readonly auth = inject(AuthService);
}