import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Asiento } from 'src/app/interfaces/asiento.interface';
import { AsientoService } from 'src/app/services/asiento.service';
import { CuiService } from 'src/app/services/cui.service';
import { ReservacionService } from 'src/app/services/reservacion.service';

// Tipo para agrupar asientos por fila
type AsientosAgrupados = { [fila: string]: Asiento[] };

@Component({
  selector: 'app-seleccion-vuelo',
  templateUrl: './seleccion-vuelo.component.html',
  styleUrls: ['./seleccion-vuelo.component.css']
})
export class SeleccionVueloComponent implements OnInit {

  // Almacenes de asientos
  asientosNegocios: AsientosAgrupados = {};
  asientosEconomica: AsientosAgrupados = {};
  filasNegocios: string[] = ['I', 'G', 'F', 'D', 'C', 'A'];
  filasEconomica: string[] = ['I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

  // Formulario
  pasajerosForm: FormGroup;
  seleccion: Asiento[] = [];

  // Mensajes
  cuiErrores: string[] = [];
  errorReserva = '';
  exitoReserva = '';

  constructor(
    private asientoService: AsientoService,
    private reservacionService: ReservacionService,
    private cuiService: CuiService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.pasajerosForm = this.fb.group({
      pasajeros: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.cargarAsientos();
  }

  // Obtiene el FormArray 'pasajeros'
  get pasajerosArray(): FormArray {
    return this.pasajerosForm.get('pasajeros') as FormArray;
  }

  cargarAsientos() {
    this.asientoService.getAllAsientos().subscribe(asientos => {
      // Reiniciamos
      this.asientosNegocios = {};
      this.asientosEconomica = {};

      // Agrupar asientos por fila y clase
      for (const asiento of asientos) {
        const fila = asiento.numero_asiento.charAt(0); // 'A', 'B', 'I', etc.

        if (asiento.clase_asiento === 'Negocios') {
          if (!this.asientosNegocios[fila]) this.asientosNegocios[fila] = [];
          this.asientosNegocios[fila].push(asiento);
        } else {
          if (!this.asientosEconomica[fila]) this.asientosEconomica[fila] = [];
          this.asientosEconomica[fila].push(asiento);
        }
      }
    });
  }

  // Maneja el clic en un asiento
  toggleSeleccion(asiento: Asiento) {
    if (asiento.estado === 'Ocupado') return; // No hacer nada si está ocupado

    const index = this.seleccion.findIndex(s => s.asiento_id === asiento.asiento_id);

    if (index > -1) {
      // Si ya estaba, quitarlo
      this.seleccion.splice(index, 1);
      this.pasajerosArray.removeAt(index);
      this.cuiErrores.splice(index, 1);
    } else {
      // Si no estaba, añadirlo
      this.seleccion.push(asiento);
      this.pasajerosArray.push(this.crearFormGroupPasajero(asiento));
      this.cuiErrores.push(''); // Espacio para error de CUI
    }
  }

  // Verifica si un asiento está en la selección actual
  estaSeleccionado(asiento: Asiento): boolean {
    return this.seleccion.some(s => s.asiento_id === asiento.asiento_id);
  }

  // Crea el FormGroup para un nuevo pasajero
  crearFormGroupPasajero(asiento: Asiento): FormGroup {
    return this.fb.group({
      asiento_id: [asiento.asiento_id],
      nombre_pasajero: ['', Validators.required],
      cui_pasajero: ['', [Validators.required, Validators.pattern('^[0-9]{13}$')]],
      tiene_equipaje: [false]
    });
  }

  // Lógica de confirmación de reserva
  async confirmarReserva() {
    if (this.pasajerosForm.invalid) {
      this.errorReserva = 'Por favor, completa todos los campos de los pasajeros.';
      return;
    }

    this.errorReserva = '';
    this.exitoReserva = '';
    this.cuiErrores = new Array(this.seleccion.length).fill('');

    // 1. Validar todos los CUIs
    let todosCuisValidos = true;
    const pasajerosData = this.pasajerosArray.value;

    for (let i = 0; i < pasajerosData.length; i++) {
      const cui = pasajerosData[i].cui_pasajero;
      try {
        await this.cuiService.validarCui(cui).toPromise();
        // Si la promesa se resuelve, el CUI es válido
      } catch (error: any) {
        // Si la promesa falla (400), el CUI es inválido
        todosCuisValidos = false;
        this.cuiErrores[i] = error.error?.mensaje || 'CUI inválido';
      }
    }

    if (!todosCuisValidos) {
      this.errorReserva = 'Hay errores en los números de CUI. Por favor, revísalos.';
      return;
    }

    // 2. Si todos los CUIs son válidos, enviar la reserva
    this.reservacionService.crearReservacion(pasajerosData, 'Manual').subscribe({
      next: (response) => {
        this.exitoReserva = `¡Reserva confirmada! Total: Q${response.precioTotal}. Serás redirigido a 'Mis Reservas'.`;

        // Limpiar formulario y selección
        this.pasajerosArray.clear();
        this.seleccion = [];
        this.cargarAsientos(); // Recargar asientos para verlos 'Ocupados'

        setTimeout(() => {
          this.router.navigate(['/mis-reservas']);
        }, 3000);
      },
      error: (err) => {
        console.error('Error al reservar:', err);
        this.errorReserva = err.error?.message || 'Error desconocido al crear la reserva.';
        this.cargarAsientos(); // Recargar por si alguien más tomó el asiento
      }
    });
  }
}
