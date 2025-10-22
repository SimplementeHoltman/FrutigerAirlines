import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SeleccionVueloComponent } from './pages/seleccion-vuelo/seleccion-vuelo.component';
import { MisReservasComponent } from './pages/mis-reservas/mis-reservas.component';
import { ReportesComponent } from './pages/reportes/reportes.component';
import { AdminDatosComponent } from './pages/admin-datos/admin-datos.component';
import { AuthGuard } from './guards/auth.guard'; // Importamos el guard

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard] // Protege la ruta principal
  },
  {
    path: 'seleccionar-vuelo',
    component: SeleccionVueloComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'mis-reservas',
    component: MisReservasComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'reportes',
    component: ReportesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'admin-datos',
    component: AdminDatosComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: 'login' } // Redirige todo lo demás a login
];

@NgModule({
  // onSameUrlNavigation: 'reload' hace que navegar a la misma URL vuelva a activar la ruta
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }