import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CuiService {

  constructor(private http: HttpClient) { }

  validarCui(cui: string): Observable<any> {
    // El proxy redirige /api/validar-cui
    return this.http.post<any>('/api/validar-cui', { cui });
  }

  getDepartamentos(): Observable<any[]> {
    return this.http.get<any[]>('/api/departamentos');
  }

  getMunicipios(codigoDepto: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/departamentos/${codigoDepto}/municipios`);
  }
}
