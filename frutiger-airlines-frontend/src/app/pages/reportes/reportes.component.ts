import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reporte } from '../../services/reporte';
import { Asiento } from '../../interfaces/asiento.interface';
import { NavegacionComponent } from '../../components/navegacion/navegacion.component';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, NavegacionComponent],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent implements OnInit {
  cargando = false;
  diagrama: any = null;
  estadisticas: any = null;
  porUsuario: any[] = [];
  totales: { asientosNegocios: number; asientosEconomica: number } = { asientosNegocios: 0, asientosEconomica: 0 };

  // Mapa de asientos (solo lectura)
  asientosNegocios: { [fila: string]: Asiento[] } = {};
  asientosEconomica: { [fila: string]: Asiento[] } = {};
  filasNegocios: string[] = ['I', 'G', 'F', 'D', 'C', 'A'];
  filasEconomica: string[] = ['I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

  constructor(private reporte: Reporte) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.reporte.getDiagramaAsientos().subscribe(diag => {
      this.diagrama = diag;
      this.totales = {
        asientosNegocios: diag?.asientos_negocios?.length || 0,
        asientosEconomica: diag?.asientos_economica?.length || 0
      };

      // Construir mapa de asientos agrupado por fila
      this.asientosNegocios = {};
      this.asientosEconomica = {};

      const agrupar = (lista: Asiento[], target: { [fila: string]: Asiento[] }) => {
        if (!Array.isArray(lista)) return;
        for (const a of lista) {
          const fila = a.numero_asiento?.charAt(0) || '';
          if (!target[fila]) target[fila] = [];
          target[fila].push(a);
        }
        // ordenar cada fila por numero_asiento
        Object.keys(target).forEach(f => {
          target[f].sort((x, y) => x.numero_asiento.localeCompare(y.numero_asiento, undefined, { numeric: true }));
        });
      };

      agrupar(diag?.asientos_negocios || [], this.asientosNegocios);
      agrupar(diag?.asientos_economica || [], this.asientosEconomica);
    });
    this.reporte.getEstadisticas().subscribe(stats => {
      this.estadisticas = stats;
    });
    this.reporte.getReservacionesPorUsuario().subscribe(data => {
      this.porUsuario = data;
      this.cargando = false;
    }, _ => this.cargando = false);
  }
}
