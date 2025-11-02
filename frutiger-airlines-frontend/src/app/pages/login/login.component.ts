import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  registerForm: FormGroup;

  // Visibilidad de contraseñas (toggles)
  showLoginPassword = false;
  showRegisterPassword = false;
  showRegisterConfirmPassword = false;

  // Mensaje general (inline alert)
  errorMessage: string | null = null; // Obsoleto: se mantiene por compatibilidad visual
  successMessage: string | null = null; // Obsoleto: se mantiene por compatibilidad visual

  // Errores por campo que vienen del servidor
  serverFieldErrors: { [field: string]: string } = {};

  constructor(
    private fb: FormBuilder,
  private authService: AuthService,
  private modal: ModalService,
    private router: Router
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      nombreCompleto: ['', Validators.required],
      email: ['', [Validators.required, Validators.email, Validators.pattern(/(@gmail\.com|@outlook\.com)$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator() });
  }

  ngOnInit(): void {}

  // Muestra un mensaje inline (error o success). Si timeout > 0 lo oculta automáticamente.
  private showInlineMessage(message: string, type: 'error' | 'success' = 'error', timeout = 6000) {
    // Mostrar SIEMPRE en modal UIkit
    this.modal.open({ type: type === 'error' ? 'error' : 'success', message, autoCloseMs: type === 'success' ? Math.min(timeout, 4000) : undefined });
    // Mantener mensaje inline temporalmente para no romper diseño actual
    if (type === 'error') {
      this.errorMessage = message;
      this.successMessage = null;
    } else {
      this.successMessage = message;
      this.errorMessage = null;
    }
    if (timeout > 0) {
      setTimeout(() => { this.errorMessage = null; this.successMessage = null; }, timeout);
    }
  }

  // Intenta extraer y normalizar el body de error del HttpErrorResponse
  private async extractErrorBody(err: any): Promise<any> {
    try {
      // err.error puede ser:
      // - un objeto ya parseado { message: '...' }
      // - una cadena
      // - un Blob (cuando backend no setea Content-Type application/json)
      const body = err?.error;
      if (!body) return { message: err?.message ?? 'Error desconocido', status: err?.status };

      if (typeof body === 'object') {
        return body;
      }

      if (typeof body === 'string') {
        // intentar parsear JSON de la cadena, si es posible
        try {
          return JSON.parse(body);
        } catch (_) {
          return { message: body };
        }
      }

      // Si es Blob (por ejemplo cuando backend responde texto pero HttpClient lo devuelve como Blob)
      if (body instanceof Blob) {
        const text = await new Response(body).text();
        try {
          return JSON.parse(text);
        } catch {
          return { message: text };
        }
      }

      return { message: String(body) };
    } catch (e) {
      console.error('extractErrorBody fallo', e);
      return { message: 'Error al procesar la respuesta del servidor.' };
    }
  }

  // Procesa errores genéricos o por campo que devuelva la API
  private async handleApiError(err: any, fallback = 'Ocurrió un error') {
    this.serverFieldErrors = {};
    try {
      const body = await this.extractErrorBody(err);

      // Manejar arrays de errores { errors: [{ field, message }] }
  if (body?.errors && Array.isArray(body.errors)) {
        const messages: string[] = [];
        for (const e of body.errors) {
          if (e.field) {
            this.serverFieldErrors[e.field] = e.message || String(e);
            const ctrl = this.getControlByFieldName(e.field);
            if (ctrl) ctrl.setErrors({ server: e.message || true });
          } else {
            messages.push(e.message || String(e));
          }
        }
        if (messages.length > 0) {
          this.showInlineMessage(messages.join('; '));
        } else {
          this.showInlineMessage('Hay errores en algunos campos. Revísalos.', 'error');
        }
        return;
      }

      // Manejar objeto fieldErrors: { field: message, ... }
  if (body?.fieldErrors && typeof body.fieldErrors === 'object') {
        const messages: string[] = [];
        for (const k of Object.keys(body.fieldErrors)) {
          this.serverFieldErrors[k] = body.fieldErrors[k];
          const ctrl = this.getControlByFieldName(k);
          if (ctrl) ctrl.setErrors({ server: body.fieldErrors[k] });
          messages.push(body.fieldErrors[k]);
        }
        this.showInlineMessage(messages.join('; '));
        return;
      }

      // Mensaje simple { message: '...' }
      if (body?.message) {
        this.showInlineMessage(body.message);
        return;
      }

      // Si hay status (ej. 401), mostrar mensaje por defecto con status
      if (err?.status) {
        const statusMsg = `Error ${err.status}: ${err.statusText || 'Error de servidor'}`;
        this.showInlineMessage(body?.message ? `${body.message} (${statusMsg})` : statusMsg);
        return;
      }

      // Fallback genérico
      this.showInlineMessage(fallback);
    } catch (e) {
      console.error('handleApiError fallo', e);
      this.showInlineMessage(fallback);
    }
  }

  // Helper: intenta obtener control por nombres comunes de campo
  private getControlByFieldName(field: string) {
    if (this.loginForm.contains(field)) return this.loginForm.get(field);
    if (this.registerForm.contains(field)) return this.registerForm.get(field);
    const map: { [k: string]: { form: FormGroup, name: string } } = {
      nombre: { form: this.registerForm, name: 'nombreCompleto' },
      nombreCompleto: { form: this.registerForm, name: 'nombreCompleto' },
      email: { form: this.loginForm, name: 'email' },
      contrasena: { form: this.loginForm, name: 'password' },
      password: { form: this.loginForm, name: 'password' },
      confirmPassword: { form: this.registerForm, name: 'confirmPassword' },
    };
    if (map[field]) return map[field].form.get(map[field].name);
    return null;
  }

  // Permite cerrar manualmente el alert inline
  closeAlert() {
    this.errorMessage = null;
    this.successMessage = null;
  }

  // LOGIN
  onLogin() {
    if (this.loginForm.invalid) {
      this.showInlineMessage('Por favor completa los campos del formulario.');
      return;
    }
    this.errorMessage = null;
    this.serverFieldErrors = {};

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        // Guardado en AuthService (realizado por el service). El interceptor mostrará el modal con el mensaje de la API.
        this.router.navigate(['/']);
      },
      error: async (err) => {
        console.error('Error de login (raw):', err);
        // Manejo robusto que mostrará mensaje aunque la API no devuelva JSON
        await this.handleApiError(err, 'Credenciales inválidas.');
      }
    });
  }

  // REGISTER
  onRegister() {
    // marcar todos los controles como touched para que se muestren los errores de validación cliente
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) {
      this.showInlineMessage('Por favor, corrige los campos del formulario.');
      return;
    }

    this.serverFieldErrors = {};
    const { nombreCompleto, email, password } = this.registerForm.value;

    this.authService.register(nombreCompleto, email, password).subscribe({
      next: (response) => {
        // El interceptor mostrará el modal con el mensaje de la API.
        this.registerForm.reset();
      },
      error: async (err) => {
        console.error('Error de registro (raw):', err);
        await this.handleApiError(err, 'Error al registrar la cuenta.');
      }
    });
  }

  // Validador: coincide password y confirmPassword
  private passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const pass = group.get('password')?.value;
      const confirm = group.get('confirmPassword')?.value;
      if (pass && confirm && pass !== confirm) {
        return { passwordMismatch: true };
      }
      return null;
    };
  }

}