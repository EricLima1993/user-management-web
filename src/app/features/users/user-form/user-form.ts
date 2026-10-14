import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ChangeDetectorRef } from '@angular/core';
import { CepService } from '../../../core/cep/cep.service';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../user.service';
import { UserCreateRequest } from '../user.models';

@Component({
    selector: 'app-user-form',
    imports: [
        ReactiveFormsModule, RouterLink,
        MatButtonModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatSelectModule,
    ],
    templateUrl: './user-form.html',
    styleUrl: './user-form.scss',
})
export class UserForm {
    private readonly fb = inject(FormBuilder).nonNullable;
    private readonly router = inject(Router);
    private readonly cepService = inject(CepService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly userService = inject(UserService);
    private readonly snackBar = inject(MatSnackBar);

    readonly saving = signal(false); // true enquanto a requisição está em andamento

    readonly form = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(120)]],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
        role: ['USER', Validators.required],
        addresses: this.fb.array([this.newAddress(true)]), // começa com 1 endereço, já principal
    });

    get addresses() {
        return this.form.controls.addresses;
    }

    private newAddress(main = false) {
        return this.fb.group({
            cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
            street: ['', Validators.required],
            number: ['', Validators.required],
            complement: [''],
            district: ['', Validators.required],
            city: ['', Validators.required],
            state: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
            mainAddress: [main],
        });
    }

    addAddress() {
        this.addresses.push(this.newAddress());
    }

    removeAddress(index: number) {
        if (this.addresses.length === 1) return; // sempre fica ao menos um
        const removedWasMain = this.addresses.at(index).controls.mainAddress.value;
        this.addresses.removeAt(index);
        if (removedWasMain) this.setMain(0); // se removeu o principal, o primeiro assume
    }

    setMain(index: number) {
        this.addresses.controls.forEach((group, i) =>
            group.controls.mainAddress.setValue(i === index),
        );
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        const value = this.form.getRawValue();
        const request = { ...value, phone: value.phone || undefined } as UserCreateRequest;

        this.userService.create(request).subscribe({
            next: () => {
                this.snackBar.open('Usuário criado com sucesso.', 'OK', { duration: 3000 });
                this.router.navigate(['/users']);
            },
            error: (err: HttpErrorResponse) => {
                this.saving.set(false);
                const message = err.error?.detail ?? 'Não foi possível salvar o usuário.';
                this.snackBar.open(message, 'OK', { duration: 6000 });
            },
        });
    }

    lookupCep(index: number) {
        const group = this.addresses.at(index);
        const cep = group.controls.cep;
        if (cep.hasError('required') || cep.hasError('pattern')) return; // ainda não tem 8 dígitos

        this.cepService.lookup(cep.value).subscribe({
            next: (result) => {
                if (!result) {
                    cep.setErrors({ notFound: true });
                } else {
                    group.patchValue(result);
                }
                this.cdr.markForCheck(); // o app é zoneless: avisamos o Angular que a tela mudou
            },
            error: () => {
                // ViaCEP fora do ar ou sem internet: o usuário preenche à mão e o backend valida
            },
        });
    }
}