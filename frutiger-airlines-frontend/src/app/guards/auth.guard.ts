import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isLoggedIn()) {
      // Usuario logueado, permitir acceso
      return true;
    } else {
      // Usuario no logueado, redirigir a /login
      console.warn('Acceso denegado - Usuario no autenticado.');
      this.router.navigate(['/login']);
      return false;
    }
  }
}
