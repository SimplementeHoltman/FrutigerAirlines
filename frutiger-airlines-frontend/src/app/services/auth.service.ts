import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { VipService, VipStatusResponse } from './vip.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Usamos un BehaviorSubject para saber el estado del usuario en toda la app
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private apiUrl = '/api/auth'; // El proxy lo redirige a localhost:3000

  constructor(private http: HttpClient, private router: Router, private vipService: VipService) {
    // Intentar cargar usuario desde localStorage al iniciar
    const user = localStorage.getItem('frutiger_user');
    if (user) {
      const parsed = JSON.parse(user);
      this.currentUserSubject.next(parsed);
      // Refrescar estado VIP en segundo plano
      if (parsed?.usuario_id) {
        this.actualizarVip(parsed.usuario_id);
      }
    }
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }

  login(email: string, contrasena: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, contrasena })
      .pipe(
        tap(response => {
          // Guardar usuario en localStorage y en el Subject
          const user = response.usuario;
          localStorage.setItem('frutiger_user', JSON.stringify(user));
          this.currentUserSubject.next(user);
          if (user?.usuario_id) {
            this.actualizarVip(user.usuario_id);
          }
        })
      );
  }

  register(nombreCompleto: string, email: string, contrasena: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, { nombreCompleto, email, contrasena });
  }

  logout() {
    localStorage.removeItem('frutiger_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private actualizarVip(usuarioId: number | string) {
    this.vipService.getVipStatus(usuarioId).subscribe({
      next: (vip: VipStatusResponse) => {
        const curr = this.currentUserSubject.value || {};
        const actualizado = { ...curr, isVip: !!vip.es_vip, vipInfo: vip };
        this.currentUserSubject.next(actualizado);
        localStorage.setItem('frutiger_user', JSON.stringify(actualizado));
      },
      error: () => {
        // Silencioso: no bloquear la UX si falla VIP
      }
    });
  }
}
