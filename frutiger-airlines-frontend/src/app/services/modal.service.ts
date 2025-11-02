import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ModalType = 'success' | 'error' | 'warning';

export interface ModalMessageState {
  visible: boolean;
  type: ModalType;
  title?: string;
  message: string;
  code?: string;
  autoCloseMs?: number;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private stateSubject = new BehaviorSubject<ModalMessageState | null>(null);
  state$ = this.stateSubject.asObservable();

  open(opts: { type: ModalType; message: string; title?: string; code?: string; autoCloseMs?: number }) {
    const state: ModalMessageState = {
      visible: true,
      type: opts.type,
      title: opts.title || this.defaultTitle(opts.type),
      message: opts.message,
      code: opts.code,
      autoCloseMs: opts.autoCloseMs
    };
    this.stateSubject.next(state);
  }

  close() {
    const curr = this.stateSubject.value;
    if (!curr) return;
    this.stateSubject.next({ ...curr, visible: false });
  }

  private defaultTitle(type: ModalType) {
    switch (type) {
      case 'success': return 'Operación exitosa';
      case 'warning': return 'Advertencia';
      case 'error':
      default: return 'Ocurrió un error';
    }
  }
}
