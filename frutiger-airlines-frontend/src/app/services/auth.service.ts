import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Usamos un BehaviorSubject para saber el estado del usuario en toda la app
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private apiUrl = '/api/auth'; // El proxy lo redirige a localhost:3000

  constructor(private http: HttpClient, private router: Router) {
    // Intentar cargar usuario desde localStorage al iniciar
    const user = localStorage.getItem('frutiger_user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
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
          localStorage.setItem('frutiger_user', JSON.stringify(response.usuario));
          this.currentUserSubject.next(response.usuario);
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
}
