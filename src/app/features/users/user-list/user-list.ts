import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, filter, of, switchMap, tap } from 'rxjs';
import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { PageResponse } from '../../../core/models/page.model';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { UserQuery, UserStatus, UserSummary } from '../user.models';
import { UserService } from '../user.service';

const EMPTY_PAGE: PageResponse<UserSummary> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

@Component({
  selector: 'app-user-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['name', 'email', 'phone', 'city', 'role', 'status', 'actions'];
  protected readonly currentUserId = computed(() => this.auth.session()?.userId);

  protected readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    status: new FormControl<UserStatus | null>(null),
    role: new FormControl<Role | null>(null),
  });

  // Estado da consulta: mudou aqui, a tela busca de novo.
  private readonly query = signal<UserQuery>({
    search: '',
    city: '',
    status: null,
    role: null,
    page: 0,
    size: 10,
    sort: 'name',
    direction: 'asc',
  });

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly page = toSignal(
    toObservable(this.query).pipe(
      tap(() => {
        this.loading.set(true);
        this.errorMessage.set(null);
      }),
      switchMap((query) =>
        this.users.list(query).pipe(
          catchError((error: HttpErrorResponse) => {
            this.errorMessage.set(this.messageFor(error));
            return of(EMPTY_PAGE);
          }),
        ),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: EMPTY_PAGE },
  );

  constructor() {
    this.filters.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((value) =>
      this.query.update((query) => ({
        ...query,
        search: value.search?.trim() ?? '',
        city: value.city?.trim() ?? '',
        status: value.status ?? null,
        role: value.role ?? null,
        page: 0,
      })),
    );
  }

  protected onPage(event: PageEvent): void {
    this.query.update((query) => ({ ...query, page: event.pageIndex, size: event.pageSize }));
  }

  protected onSort(sort: Sort): void {
    this.query.update((query) => ({
      ...query,
      sort: sort.active,
      direction: sort.direction || 'asc',
      page: 0,
    }));
  }

  protected clearFilters(): void {
    this.filters.reset();
  }

  protected remove(user: UserSummary): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Excluir usuário',
          message: `Deseja excluir ${user.name}? Essa ação não pode ser desfeita pela tela.`,
          confirmLabel: 'Excluir',
        },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.users.delete(user.id)),
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Usuário excluído.', 'Fechar', { duration: 4000 });
          this.reloadAfterDelete();
        },
        error: (error: HttpErrorResponse) =>
          this.snackBar.open(this.messageFor(error), 'Fechar', { duration: 5000 }),
      });
  }

  protected roleLabel(role: Role): string {
    return role === 'ADMIN' ? 'Administrador' : 'Usuário';
  }

  protected statusLabel(status: UserStatus): string {
    return status === 'ACTIVE' ? 'Ativo' : 'Inativo';
  }

  private reloadAfterDelete(): void {
    const current = this.page();
    const wasLastItemOfPage = current.content.length === 1 && current.page > 0;
    this.query.update((query) => ({
      ...query,
      page: wasLastItemOfPage ? query.page - 1 : query.page,
    }));
  }

  private messageFor(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Servidor indisponível. Tente novamente em instantes.';
    if (error.status === 403) return 'Você não tem permissão para esta ação.';
    return error.error?.detail ?? 'Não foi possível concluir a operação.';
  }
}