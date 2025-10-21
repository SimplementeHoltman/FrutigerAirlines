import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ReservacionService {

  private apiUrl = '/api/reservaciones';

  constructor(private http: HttpClient, private authService: AuthService) { }

  /**
   * Crea una o más reservaciones.
   * @param asientos - Array de pasajeros/asientos
   * @param metodo - 'Manual' o 'Aleatorio'
   */
  crearReservacion(asientos: any[], metodo_seleccion: 'Manual' | 'Aleatorio'): Observable<any> {
    const usuario_id = this.authService.currentUserValue.usuario_id;

    const body = {
      usuario_id: usuario_id,
      asientos: asientos, // { asiento_id, nombre_pasajero, cui_pasajero, tiene_equipaje }
      metodo_seleccion: metodo_seleccion
    };

    return this.http.post<any>(this.apiUrl, body);
  }

  /**
   * Obtiene las reservaciones del usuario logueado.
   */
  getMisReservaciones(): Observable<any[]> {
    const usuario_id = this.authService.currentUserValue.usuario_id;
    return this.http.get<any[]>(`${this.apiUrl}/usuario/${usuario_id}`);
  }

  /**
   * Modifica una reservación.
   */
  modificarReservacion(reservacionId: number, nuevo_asiento_id: number, cui_pasajero: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${reservacionId}`, { nuevo_asiento_id, cui_pasajero });
  }

  /**
   * Cancela una reservación.
   */
  cancelarReservacion(reservacionId: number, cui_pasajero: string): Observable<any> {
    // HTTP DELETE con body
    const options = {
      body: {
        cui_pasajero: cui_pasajero
      }
    };
    return this.http.delete<any>(`${this.apiUrl}/${reservacionId}`, options);
  }
}
