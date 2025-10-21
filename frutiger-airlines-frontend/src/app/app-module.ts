import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common'; // <-- Importado
import { HttpClientModule } from '@angular/common/http'; // <-- Importado
import { ReactiveFormsModule } from '@angular/forms'; // <-- Importado

import { AppRoutingModule } from './app-routing-module'; // Asegúrate que la ruta sea correcta
import { App } from './app'; // Asegúrate que la ruta y nombre sean correctos
import { Navegacion } from './components/navegacion/navegacion'; // Asegúrate que la ruta y nombre sean correctos
import { Login } from './pages/login/login'; // Asegúrate que la ruta y nombre sean correctos
import { Home } from './pages/home/home'; // Asegúrate que la ruta y nombre sean correctos
import { SeleccionVuelo } from './pages/seleccion-vuelo/seleccion-vuelo'; // Asegúrate que la ruta y nombre sean correctos
import { MisReservas } from './pages/mis-reservas/mis-reservas'; // Asegúrate que la ruta y nombre sean correctos
import { Reportes } from './pages/reportes/reportes'; // Asegúrate que la ruta y nombre sean correctos
import { AdminDatos } from './pages/admin-datos/admin-datos'; // Asegúrate que la ruta y nombre sean correctos

@NgModule({
  declarations: [
    App,
    Navegacion,
    Login,
    Home,
    SeleccionVuelo,
    MisReservas,
    Reportes,
    AdminDatos
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,         // <-- Añadido
    HttpClientModule,     // <-- Añadido
    ReactiveFormsModule   // <-- Añadido
  ],
  providers: [
    // No necesitas provideBrowserGlobalErrorListeners aquí normalmente
    // Los servicios se proveen con providedIn: 'root' o se listan aquí si no lo usan.
  ],
  bootstrap: [App] // Asegúrate que App sea el componente raíz correcto
})
export class AppModule { }
