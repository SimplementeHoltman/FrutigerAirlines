import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Asiento } from '../interfaces/asiento.interface';

@Injectable({
  providedIn: 'root'
})
export class AsientoService {

  private apiUrl = '/api/asientos'; // El proxy lo redirige

  constructor(private http: HttpClient) { }

  /**
   * Obtiene el diagrama completo de asientos.
   */
  getAllAsientos(): Observable<Asiento[]> {
    return this.http.get<Asiento[]>(this.apiUrl);
  }

  /**
   * Obtiene asientos filtrados por clase.
   */
  getAsientosPorClase(clase: 'Negocios' | 'Economica'): Observable<Asiento[]> {
    return this.http.get<Asiento[]>(`${this.apiUrl}/${clase}`);
  }
}
