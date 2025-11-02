import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navegacion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navegacion.component.html',
  styleUrls: ['./navegacion.component.css']
})
export class NavegacionComponent {
  isLoggedIn = false;
  userName = '';
  isVip = false;

  constructor(private authService: AuthService) {
    // Nos suscribimos a los cambios del usuario
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.userName = user ? user.nombre_completo : '';
      this.isVip = !!(user?.isVip || user?.vipInfo?.es_vip);
    });
  }

  logout() {
    this.authService.logout();
  }
}