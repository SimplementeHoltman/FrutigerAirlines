import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reporte } from '../../services/reporte';
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
