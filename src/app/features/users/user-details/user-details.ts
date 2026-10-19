import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UserDetail } from '../user.models';
import { UserService } from '../user.service';

@Component({
  selector: 'app-user-details',
  imports: [DatePipe, RouterLink, MatButtonModule, MatProgressBarModule],
  templateUrl: './user-details.html',
  styleUrl: './user-details.scss',
})
export class UserDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly userId = Number(this.route.snapshot.paramMap.get('id'));
  readonly isAdmin = this.auth.isAdmin;
  readonly loading = signal(false);
  readonly user = signal<UserDetail | null>(null);

  constructor() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.userService.findById(this.userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.snackBar.open(err.error?.detail ?? 'Não foi possível carregar o usuário.', 'OK', { duration: 6000 });
        this.cdr.markForCheck();
      },
    });
  }
}
