import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { CepService } from '../../../core/cep/cep.service';
import { UserService } from '../user.service';
import { UserCreateRequest, UserUpdateRequest } from '../user.models';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
    selector: 'app-user-form',
    imports: [
        ReactiveFormsModule, RouterLink,
        MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatRadioModule, MatSelectModule,
    ],
    templateUrl: './user-form.html',
    styleUrl: './user-form.scss',
})
export class UserForm {
    private readonly fb = inject(FormBuilder).nonNullable;
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthService);
    private readonly userService = inject(UserService);
    private readonly cepService = inject(CepService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly userId = this.route.snapshot.paramMap.get('id'); // null = criando
    readonly isEdit = this.userId !== null;
    readonly isAdmin = this.auth.isAdmin;
    readonly saving = signal(false);
    readonly loading = signal(false);

    readonly form = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(120)]],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
        role: ['USER', Validators.required],
        status: ['ACTIVE'],
        addresses: this.fb.array([this.newAddress(true)]),
    });

    constructor() {
        if (this.isEdit) {
            // e-mail não muda; senha vira opcional (em branco = manter a atual)
            this.form.controls.email.disable();
            this.form.controls.password.setValidators([Validators.minLength(8), Validators.maxLength(72)]);
            this.form.controls.password.updateValueAndValidity();
            this.load(Number(this.userId));
        }
    }

    get addresses() {
        return this.form.controls.addresses;
    }

    private newAddress(main = false) {
        return this.fb.group({
            cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
            street: ['', Validators.required],
            number: ['', Validators.required],
            complement: [''],
            district: [''],
            city: ['', Validators.required],
            state: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
            mainAddress: [main],
        });
    }

    private load(id: number) {
        this.loading.set(true); // 1. liga ao começar
        this.userService.findById(id).subscribe({
            next: (user) => {
                this.form.patchValue({
                    name: user.name,
                    email: user.email,
                    phone: user.phone ?? '',
                    role: user.role,
                    status: user.status,
                });
                this.addresses.clear();
                user.addresses.forEach((a) => {
                    const group = this.newAddress();
                    group.patchValue({
                        cep: a.cep,
                        street: a.street,
                        number: a.number,
                        complement: a.complement ?? '',
                        district: a.district ?? '',
                        city: a.city,
                        state: a.state,
                        mainAddress: a.mainAddress,
                    });
                    this.addresses.push(group);
                });
                this.loading.set(false); // 2. desliga quando os dados chegam
                this.cdr.markForCheck();
            },
            error: (err: HttpErrorResponse) => {
                this.loading.set(false); // 3. desliga também se der erro
                this.snackBar.open(err.error?.detail ?? 'Não foi possível carregar o usuário.', 'OK', { duration: 6000 });
                if (this.isAdmin()) this.router.navigate(['/users']); // USER fica na tela, sem ciclo
            },
        });
    }

    addAddress() {
        this.addresses.push(this.newAddress());
    }

    removeAddress(index: number) {
        if (this.addresses.length === 1) return;
        const removedWasMain = this.addresses.at(index).controls.mainAddress.value;
        this.addresses.removeAt(index);
        if (removedWasMain) this.setMain(0);
    }

    setMain(index: number) {
        this.addresses.controls.forEach((group, i) =>
            group.controls.mainAddress.setValue(i === index),
        );
    }

    lookupCep(index: number) {
        const group = this.addresses.at(index);
        const cep = group.controls.cep;
        if (cep.hasError('required') || cep.hasError('pattern')) return;

        this.cepService.lookup(cep.value).subscribe({
            next: (result) => {
                if (!result) {
                    cep.setErrors({ notFound: true });
                } else {
                    group.patchValue(result);
                }
                this.cdr.markForCheck();
            },
            error: () => { },
        });
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        const v = this.form.getRawValue();

        const request$ = this.isEdit
            ? this.userService.update(
                Number(this.userId),
                {
                    name: v.name,
                    phone: v.phone || undefined,
                    password: v.password || undefined,
                    addresses: v.addresses,
                    // só o admin envia perfil e situação
                    ...(this.isAdmin() ? { role: v.role, status: v.status } : {}),
                } as UserUpdateRequest,
            )
            : this.userService.create({ ...v, phone: v.phone || undefined } as UserCreateRequest);

        request$.subscribe({
            next: () => {
                this.snackBar.open(this.isEdit ? 'Usuário atualizado.' : 'Usuário criado com sucesso.', 'OK', { duration: 3000 });
                this.saving.set(false);
                this.router.navigate(this.isAdmin() ? ['/users'] : ['/users', this.userId, 'details']);
            },
            error: (err: HttpErrorResponse) => {
                this.saving.set(false);
                this.snackBar.open(err.error?.detail ?? 'Não foi possível salvar o usuário.', 'OK', { duration: 6000 });
            },
        });
    }
}