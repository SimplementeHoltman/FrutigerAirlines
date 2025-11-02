import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Gestion {
  constructor(private http: HttpClient) {}

  exportarXML(): Observable<string> {
    return this.http.get('/api/exportar/xml', { responseType: 'text' });
  }

  importarXML(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post('/api/importar/xml', formData);
  }
}
