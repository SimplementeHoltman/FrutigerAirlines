import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Reporte {
  constructor(private http: HttpClient) {}

  getDiagramaAsientos(): Observable<any> {
    return this.http.get<any>('/api/reportes/diagrama-asientos');
  }

  getEstadisticas(): Observable<any> {
    return this.http.get<any>('/api/reportes/estadisticas');
  }

  getReservacionesPorUsuario(): Observable<any[]> {
    return this.http.get<any[]>('/api/reportes/reservaciones-usuario');
  }
}
