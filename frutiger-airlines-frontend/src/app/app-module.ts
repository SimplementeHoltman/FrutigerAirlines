import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Navegacion } from './components/navegacion/navegacion';
import { Login } from './pages/login/login';
import { Home } from './pages/home/home';
import { SeleccionVuelo } from './pages/seleccion-vuelo/seleccion-vuelo';
import { MisReservas } from './pages/mis-reservas/mis-reservas';
import { Reportes } from './pages/reportes/reportes';
import { AdminDatos } from './pages/admin-datos/admin-datos';

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
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
