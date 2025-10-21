import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  registerForm: FormGroup;

  loginError = '';
  registerError = '';
  registerSuccess = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Si ya está logueado, que vaya al Home
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
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  onLogin() {
    if (this.loginForm.invalid) return;
    this.loginError = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        // Login exitoso, el servicio Auth se encarga de guardar
        // y el AuthGuard nos llevará al home.
        console.log('Login exitoso:', response.usuario);
        this.router.navigate(['/']); // Redirigir a la página principal
      },
      error: (err) => {
        console.error('Error de login:', err);
        this.loginError = err.error?.message || 'Credenciales inválidas.';
      }
    });
  }

  onRegister() {
    if (this.registerForm.invalid) {
      this.registerError = 'Por favor, corrige los campos del formulario.';
      return;
    }

    this.registerError = '';
    this.registerSuccess = '';
    const { nombreCompleto, email, password } = this.registerForm.value;

    this.authService.register(nombreCompleto, email, password).subscribe({
      next: (response) => {
        this.registerSuccess = '¡Registro exitoso! Ahora puedes iniciar sesión.';
        this.registerForm.reset();
      },
      error: (err) => {
        console.error('Error de registro:', err);
        this.registerError = err.error?.message || 'Error al registrar la cuenta.';
      }
    });
  }
}
