import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navegacion',
  templateUrl: './navegacion.component.html',
  styleUrls: ['./navegacion.component.css']
})
export class NavegacionComponent {
  isLoggedIn = false;
  userName = '';

  constructor(private authService: AuthService) {
    // Nos suscribimos a los cambios del usuario
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.userName = user ? user.nombre_completo : '';
    });
  }

  logout() {
    this.authService.logout();
  }
}
