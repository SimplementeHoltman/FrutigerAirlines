import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VipStatusResponse {
  es_vip: boolean;
  total_reservaciones: number;
  reservaciones_requeridas: number;
  descuento_aplicable: number; // 0.10 si VIP, 0 si no
}

@Injectable({ providedIn: 'root' })
export class VipService {
  constructor(private http: HttpClient) {}

  getVipStatus(usuarioId: number | string): Observable<VipStatusResponse> {
    return this.http.get<VipStatusResponse>(`/api/usuarios/${usuarioId}/vip`);
  }
}
