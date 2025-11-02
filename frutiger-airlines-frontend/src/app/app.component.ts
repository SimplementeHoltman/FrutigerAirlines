import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModalMessageComponent } from './components/modal-message/modal-message.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule, ModalMessageComponent],
  template: '<app-modal-message></app-modal-message><router-outlet></router-outlet>',
  styles: []
})
export class AppComponent {}