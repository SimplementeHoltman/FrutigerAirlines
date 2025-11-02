import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReservacionService } from '../../services/reservacion.service';
import { RouterModule, Router } from '@angular/router';
import { NavegacionComponent } from '../../components/navegacion/navegacion.component'; // <-- importar aquí
import { AsientoService } from '../../services/asiento.service';
import { Asiento } from '../../interfaces/asiento.interface';
import { firstValueFrom } from 'rxjs';

type AsientosAgrupados = { [fila: string]: Asiento[] | any[] };

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavegacionComponent, RouterModule],
  templateUrl: './mis-reservas.component.html',
  styleUrls: ['./mis-reservas.component.css']
})
export class MisReservasComponent implements OnInit {

  reservaciones: any[] = [];
  loading = false;
  error = '';
  success = '';

  modificarForms: { [reservacionId: number]: FormGroup } = {};
  mostrarModificar: { [reservacionId: number]: boolean } = {};

  seatsCache: { [clase: string]: AsientosAgrupados } = {};
  seatsFlatCache: { [clase: string]: Asiento[] } = {};

  seleccionNuevoAsiento: { [reservacionId: number]: Asiento | null } = {};
  seleccionando: { [reservacionId: number]: boolean } = {};

  filasNegocios: string[] = ['I', 'G', 'F', 'D', 'C', 'A'];
  filasEconomica: string[] = ['I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

  constructor(
    private reservacionService: ReservacionService,
    private asientoService: AsientoService,
    private fb: FormBuilder,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarReservaciones();
  }

  cargarReservaciones(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.reservacionService.getMisReservaciones().subscribe({
      next: (res: any[]) => {
        this.reservaciones = res || [];
        this.initModificarForms();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar reservaciones', err);
        this.error = err?.error?.message || 'Error al cargar reservaciones.';
        this.loading = false;
      }
    });
  }

  initModificarForms(): void {
    this.modificarForms = {};
    this.mostrarModificar = {};
    this.seleccionNuevoAsiento = {};
    this.seleccionando = {};
    for (const r of this.reservaciones) {
      const id = r.reservacion_id ?? r.id ?? null;
      if (id == null) continue;
      this.modificarForms[id] = this.fb.group({
        cui_pasajero: [r.cui_pasajero ?? '', [Validators.required, Validators.pattern('^[0-9]{13}$')]]
      });
      this.mostrarModificar[id] = false;
      this.seleccionNuevoAsiento[id] = null;
      this.seleccionando[id] = false;
    }
  }

  toggleModificar(reservacion: any): void {
    const id = reservacion.reservacion_id ?? reservacion.id ?? null;
    if (id == null) return;
    this.mostrarModificar[id] = !this.mostrarModificar[id];
    if (this.mostrarModificar[id]) {
      // Normalizar el valor de 'clase' para corresponder al tipo esperado
      const raw = reservacion.clase_asiento ?? reservacion.clase ?? 'Economica';
      const clase: 'Negocios' | 'Economica' = raw === 'Negocios' ? 'Negocios' : 'Economica';
      this.loadSeatsForClass(clase);
      const form = this.modificarForms[id];
      if (form && !form.value.cui_pasajero && reservacion.cui_pasajero) {
        form.patchValue({ cui_pasajero: reservacion.cui_pasajero });
      }
    } else {
      this.seleccionNuevoAsiento[id] = null;
    }
  }

  // Ahora loadSeatsForClass recibe el tipo correcto
  async loadSeatsForClass(clase: 'Negocios' | 'Economica') {
    if (this.seatsCache[clase]) return;

    try {
      // Usar el endpoint por clase para ser más eficiente
      const asientos = (await firstValueFrom(this.asientoService.getAsientosPorClase(clase))) || [];
      const filtrados = asientos as Asiento[];
      this.seatsFlatCache[clase] = filtrados;

      const agrupado: AsientosAgrupados = {};
      for (const a of filtrados) {
        const fila = a.numero_asiento.charAt(0);
        if (!agrupado[fila]) agrupado[fila] = [];
        agrupado[fila].push(a);
      }
      for (const f of Object.keys(agrupado)) {
        agrupado[f].sort((x: any, y: any) => x.numero_asiento.localeCompare(y.numero_asiento));
      }

      this.seatsCache[clase] = agrupado;
    } catch (err) {
      console.error('Error cargando asientos por clase', err);
    }
  }

  estaSeleccionadoComoNuevo(reservacionId: number, asiento: Asiento): boolean {
    const sel = this.seleccionNuevoAsiento[reservacionId];
    return sel ? sel.asiento_id === asiento.asiento_id : false;
  }

  seleccionarNuevoAsiento(reservacion: any, asiento: Asiento): void {
    const id = reservacion.reservacion_id ?? reservacion.id ?? null;
    if (id == null) return;
    if (asiento.estado === 'Ocupado') return;
    if (Number(asiento.asiento_id) === Number(reservacion.asiento_id)) {
      this.seleccionNuevoAsiento[id] = null;
      return;
    }
    this.seleccionNuevoAsiento[id] = asiento;
  }

  estimarRecargoYTotal(reservacion: any, nuevoAsiento: Asiento | null) {
    if (!nuevoAsiento) return null;
    const precio_base = parseFloat(reservacion.precio_base ?? reservacion.precioBase ?? reservacion.precio_base ?? 0);
    let precioBaseInferido = precio_base;
    if (!precioBaseInferido || precioBaseInferido === 0) {
      const clase = reservacion.clase_asiento ?? reservacion.clase;
      precioBaseInferido = clase === 'Negocios' ? 550.00 : 250.00;
    }
    const recargo = precioBaseInferido * 0.10;
    const nuevoTotal = (parseFloat(reservacion.precio_total ?? reservacion.precioTotal ?? reservacion.total ?? precioBaseInferido) + recargo);
    return { recargo: recargo, nuevoTotal: nuevoTotal };
  }

  confirmarModificar(reservacion: any): void {
    this.error = '';
    this.success = '';
    const id = reservacion.reservacion_id ?? reservacion.id ?? null;
    if (id == null) {
      this.error = 'ID de reservación inválido.';
      return;
    }

    const form = this.modificarForms[id];
    if (!form || form.invalid) {
      this.error = 'Por favor ingresa el CUI válido (13 dígitos).';
      return;
    }

    const nuevo = this.seleccionNuevoAsiento[id];
    if (!nuevo) {
      this.error = 'Selecciona primero un nuevo asiento disponible.';
      return;
    }

    const nuevo_asiento_id = Number(nuevo.asiento_id);
    const cui_pasajero = form.value.cui_pasajero;

    this.loading = true;
    this.reservacionService.modificarReservacion(id, nuevo_asiento_id, cui_pasajero).subscribe({
      next: (resp) => {
        this.success = resp?.message || 'Asiento modificado con éxito.';
        this.loading = false;
        this.seatsCache = {};
        this.seatsFlatCache = {};
        this.cargarReservaciones();
      },
      error: (err) => {
        console.error('Error al modificar reservación', err);
        this.error = err?.error?.message || 'Error al modificar la reservación.';
        this.loading = false;
        const raw = reservacion.clase_asiento ?? reservacion.clase ?? 'Economica';
        const clase: 'Negocios' | 'Economica' = raw === 'Negocios' ? 'Negocios' : 'Economica';
        if (clase) this.loadSeatsForClass(clase);
      }
    });
  }

  cancelarReservacion(reservacion: any): void {
    this.error = '';
    this.success = '';
    const id = reservacion.reservacion_id ?? reservacion.id ?? null;
    if (id == null) {
      this.error = 'ID de reservación inválido.';
      return;
    }

    const conf = window.confirm('¿Estás seguro que deseas cancelar esta reservación?');
    if (!conf) return;

    const cui = window.prompt('Ingresa el CUI (13 dígitos) del pasajero para confirmar la cancelación:');
    if (!cui) return;

    if (!/^[0-9]{13}$/.test(cui)) {
      this.error = 'CUI inválido. Debe tener 13 dígitos numéricos.';
      return;
    }

    this.loading = true;
    this.reservacionService.cancelarReservacion(id, cui).subscribe({
      next: (resp) => {
        this.success = resp?.message || 'Reservación cancelada correctamente.';
        this.loading = false;
        this.cargarReservaciones();
      },
      error: (err) => {
        console.error('Error al cancelar reservación', err);
        this.error = err?.error?.message || 'Error al cancelar la reservación.';
        this.loading = false;
        this.cargarReservaciones();
      }
    });
  }

  obtenerPasajerosTexto(reservacion: any): string {
    if (!reservacion) return '';
    if (Array.isArray(reservacion.pasajeros) && reservacion.pasajeros.length > 0) {
      return reservacion.pasajeros.map((p: any) => `${p.nombre_pasajero} (Asiento: ${p.numero_asiento ?? p.asiento_numero ?? p.asiento_id ?? ''}, CUI: ${p.cui_pasajero})`).join('; ');
    }
    if (reservacion.nombre_pasajero || reservacion.cui_pasajero) {
      return `${reservacion.nombre_pasajero ?? 'N/A'} (Asiento: ${reservacion.numero_asiento ?? reservacion.asiento_numero ?? reservacion.asiento_id ?? ''}, CUI: ${reservacion.cui_pasajero ?? 'N/A'})`;
    }
    return '';
  }

  irAPaginaDetalle(reservacion: any): void {
    const id = reservacion.reservacion_id ?? reservacion.id ?? null;
    if (id == null) return;
    this.router.navigate(['/mis-reservas', id]);
  }
}