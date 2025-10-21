import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavegacionComponent } from './components/navegacion/navegacion.component';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SeleccionVueloComponent } from './pages/seleccion-vuelo/seleccion-vuelo.component';
import { MisReservasComponent } from './pages/mis-reservas/mis-reservas.component';
import { ReportesComponent } from './pages/reportes/reportes.component';
import { AdminDatosComponent } from './pages/admin-datos/admin-datos.component';

@NgModule({
  // No declarar componentes standalone; mantener declarations vacío
  declarations: [],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    HttpClientModule, // <-- Para hacer peticiones API
    FormsModule,      // <-- Para formularios (template-driven)
    ReactiveFormsModule, // <-- Para formularios (reactivos)

    // Componentes standalone se añaden en imports, no en declarations
    AppComponent,
    NavegacionComponent,
    LoginComponent,
    HomeComponent,
    SeleccionVueloComponent,
    MisReservasComponent,
    ReportesComponent,
    AdminDatosComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }