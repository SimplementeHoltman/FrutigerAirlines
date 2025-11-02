import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { NavegacionComponent } from '../../components/navegacion/navegacion.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NavegacionComponent], // UNA sola entrada
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  userName = '';
  isVip = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.userName = this.authService.currentUserValue?.nombre_completo || 'Usuario';
    this.isVip = !!(this.authService.currentUserValue?.isVip || this.authService.currentUserValue?.vipInfo?.es_vip);
    // Mantener sincronizado si cambia el usuario
    this.authService.currentUser$.subscribe(u => {
      this.userName = u?.nombre_completo || this.userName;
      this.isVip = !!(u?.isVip || u?.vipInfo?.es_vip);
    });
  }

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

  canAccessAdmin(): boolean {
    const user = this.authService.currentUserValue;
    if (!user) return false;
    return !!(user.isAdmin || user.role === 'admin' || user.rol === 'admin' || user.admin);
  }
}