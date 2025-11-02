import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Gestion } from '../../services/gestion';
import { NavegacionComponent } from '../../components/navegacion/navegacion.component';

@Component({
  selector: 'app-admin-datos',
  standalone: true,
  imports: [CommonModule, NavegacionComponent],
  templateUrl: './admin-datos.component.html',
  styleUrls: ['./admin-datos.component.css']
})
export class AdminDatosComponent {
  subiendo = false;
  resultado: any = null;
  errores: string[] = [];

  constructor(private gestion: Gestion) {}

  exportar() {
    this.gestion.exportarXML().subscribe(xml => {
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FrutigerAirlines_Export_${Date.now()}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  onFileChange(event: any) {
    const file: File = event?.target?.files?.[0];
    if (!file) return;
    this.subiendo = true;
    this.resultado = null;
    this.errores = [];
    this.gestion.importarXML(file).subscribe({
      next: (res) => {
        this.resultado = res;
        this.errores = res?.errores || [];
        this.subiendo = false;
      },
      error: (err) => {
        this.subiendo = false;
        this.resultado = null;
        this.errores = [err?.error?.message || 'Error desconocido al importar.'];
      }
    });
  }
}
