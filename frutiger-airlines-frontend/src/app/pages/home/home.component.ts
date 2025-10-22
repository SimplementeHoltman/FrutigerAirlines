import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  userName = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.userName = this.authService.currentUserValue?.nombre_completo || 'Usuario';
  }

  /**
   * Navega a la ruta indicada. Si ya estás en la misma ruta,
   * fuerza una recarga temporal para re-disparar la activación.
   */
  go(route: string) {
    const target = route.startsWith('/') ? route : `/${route}`;
    if (this.router.url === target) {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([target]);
      });
    } else {
      this.router.navigate([target]);
    }
  }

  /**
   * Comprueba si el usuario tiene permiso de admin.
   * Ajusta la comprobación según la estructura de tu currentUserValue.
   */
  canAccessAdmin(): boolean {
    const user = this.authService.currentUserValue;
    if (!user) return false;
    // Intenta cubrir varias convenciones de campo (isAdmin, role, rol, admin)
    return !!(user.isAdmin || user.role === 'admin' || user.rol === 'admin' || user.admin);
  }
}