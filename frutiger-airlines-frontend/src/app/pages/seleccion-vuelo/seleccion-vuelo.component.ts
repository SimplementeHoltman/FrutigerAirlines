import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Asiento } from '../../interfaces/asiento.interface';
import { AsientoService } from '../../services/asiento.service';
import { CuiService } from '../../services/cui.service';
import { ReservacionService } from '../../services/reservacion.service';
import { NavegacionComponent } from '../../components/navegacion/navegacion.component'; // <-- importar aquí
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';


// Tipo para agrupar asientos por fila
type AsientosAgrupados = { [fila: string]: Asiento[] };

@Component({
  selector: 'app-seleccion-vuelo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavegacionComponent],
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
  isVip = false;
  vipDescuento = 0;
  // Selección aleatoria
  cantidadAleatoria: number = 1;
  seleccionFueAleatoria: boolean = false;
  avisoAleatorio: string = '';
  incluirNegocios: boolean = true;
  incluirEconomica: boolean = true;

  constructor(
    private asientoService: AsientoService,
    private reservacionService: ReservacionService,
    private cuiService: CuiService,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private modal: ModalService
  ) {
    this.pasajerosForm = this.fb.group({
      pasajeros: this.fb.array([])
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    this.isVip = !!(user?.isVip || user?.vipInfo?.es_vip);
    this.vipDescuento = user?.vipInfo?.descuento_aplicable ? (user.vipInfo.descuento_aplicable * 100) : 0;
    this.authService.currentUser$.subscribe(u => {
      this.isVip = !!(u?.isVip || u?.vipInfo?.es_vip);
      this.vipDescuento = u?.vipInfo?.descuento_aplicable ? (u.vipInfo.descuento_aplicable * 100) : 0;
    });
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
      // Si el usuario agregó manualmente, lo marcamos como selección manual
      this.seleccionFueAleatoria = false;
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

  // Selección aleatoria de asientos libres
  seleccionarAleatorio() {
    this.avisoAleatorio = '';
    const libres: Asiento[] = [];
    const agregar = (dic: { [fila: string]: Asiento[] }) => {
      Object.keys(dic).forEach(f => {
        dic[f].forEach(a => {
          const yaSeleccionado = this.seleccion.some(s => s.asiento_id === a.asiento_id);
          if (a.estado === 'Libre' && !yaSeleccionado) libres.push(a);
        });
      });
    };
    if (this.incluirNegocios) agregar(this.asientosNegocios);
    if (this.incluirEconomica) agregar(this.asientosEconomica);

    if (!this.incluirNegocios && !this.incluirEconomica) {
      this.avisoAleatorio = 'Selecciona al menos una clase (Negocios o Económica).';
      this.modal.open({ type: 'warning', message: this.avisoAleatorio });
      return;
    }

    if (libres.length === 0) {
      this.avisoAleatorio = 'No hay asientos libres disponibles.';
      this.modal.open({ type: 'warning', message: this.avisoAleatorio });
      return;
    }

    // Normalizar cantidad solicitada y no exceder los disponibles
    const solicitados = Math.max(1, Math.floor(this.cantidadAleatoria || 1));
    const n = Math.min(solicitados, libres.length);
    if (solicitados > libres.length) {
      this.avisoAleatorio = `Solo hay ${libres.length} asiento(s) disponible(s) en la(s) clase(s) seleccionada(s). Se ajustó la cantidad a ${n}.`;
      this.modal.open({ type: 'warning', message: this.avisoAleatorio });
      this.cantidadAleatoria = n;
    }
    // Mezclar aleatoriamente (Fisher-Yates simplificado usando sort para simplicidad)
    const seleccionados = [...libres].sort(() => Math.random() - 0.5).slice(0, n);

    for (const asiento of seleccionados) {
      // Evitar duplicados por seguridad
      if (!this.seleccion.some(s => s.asiento_id === asiento.asiento_id)) {
        this.seleccion.push(asiento);
        this.pasajerosArray.push(this.crearFormGroupPasajero(asiento));
        this.cuiErrores.push('');
      }
    }

    this.seleccionFueAleatoria = true;
    this.avisoAleatorio = `Se seleccionaron aleatoriamente ${seleccionados.length} asiento(s).`;
    this.modal.open({ type: 'success', message: this.avisoAleatorio, autoCloseMs: 2500 });
  }

  limpiarSeleccion() {
    this.pasajerosArray.clear();
    this.seleccion = [];
    this.cuiErrores = [];
    this.errorReserva = '';
    this.exitoReserva = '';
    this.seleccionFueAleatoria = false;
  }

  // Lógica de confirmación de reserva
  async confirmarReserva() {
    if (this.pasajerosForm.invalid) {
      this.errorReserva = 'Por favor, completa todos los campos de los pasajeros.';
      this.modal.open({ type: 'error', message: this.errorReserva });
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
        this.cuiErrores[i] = error.error?.mensaje || error.error?.message || 'CUI inválido';
      }
    }

    if (!todosCuisValidos) {
      this.errorReserva = 'Hay errores en los números de CUI. Por favor, revísalos.';
      this.modal.open({ type: 'error', message: this.errorReserva });
      return;
    }

    // 2. Si todos los CUIs son válidos, enviar la reserva
    const metodo: 'Manual' | 'Aleatorio' = this.seleccionFueAleatoria ? 'Aleatorio' : 'Manual';
    this.reservacionService.crearReservacion(pasajerosData, metodo).subscribe({
      next: (response) => {
        const vipMsg = this.isVip ? ` (incluye descuento VIP ${this.vipDescuento || 10}%)` : '';
  this.exitoReserva = `¡Reserva confirmada! Total: Q${response.precioTotal}${vipMsg}. Serás redirigido a 'Mis Reservas'.`;

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
        this.errorReserva = err.error?.message || err.error?.mensaje || 'Error desconocido al crear la reserva.';
        this.cargarAsientos(); // Recargar por si alguien más tomó el asiento
      }
    });
  }
}