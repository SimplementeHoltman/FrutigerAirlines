import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { ModalService, ModalMessageState } from '../../services/modal.service';

declare const UIkit: any;

@Component({
  selector: 'app-modal-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-message.component.html',
  styleUrls: ['./modal-message.component.css']
})
export class ModalMessageComponent implements OnInit, OnDestroy {
  state: ModalMessageState | null = null;
  private sub?: Subscription;

  constructor(private modal: ModalService) {}

  ngOnInit(): void {
    this.sub = this.modal.state$.subscribe(state => {
      this.state = state;
      const el = document.getElementById('app-message-modal');
      if (!el || typeof UIkit === 'undefined' || !UIkit.modal) return;
      const inst = UIkit.modal(el);
      if (state?.visible) {
        inst.show();
        if (state.autoCloseMs && state.autoCloseMs > 0) {
          timer(state.autoCloseMs).subscribe(() => this.close());
        }
      } else {
        inst.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  close() {
    this.modal.close();
  }
}
