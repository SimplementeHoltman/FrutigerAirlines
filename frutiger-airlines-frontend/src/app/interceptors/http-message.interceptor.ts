import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { ModalService } from '../services/modal.service';

@Injectable()
export class HttpMessageInterceptor implements HttpInterceptor {
  constructor(private modal: ModalService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const body = event.body;
          if (body && typeof body === 'object') {
            // Mostrar éxito solamente si la respuesta trae un mensaje explícito
            if (typeof body.message === 'string' && body.message.trim().length > 0) {
              const success = body.success;
              // Si success es undefined pero status es 2xx y hay message, asumimos success
              if (success === true || success === undefined) {
                this.modal.open({ type: 'success', message: body.message, code: body.code });
              } else if (success === false) {
                // Respuestas 2xx con success=false (advertencias)
                this.modal.open({ type: 'warning', message: body.message, code: body.code });
              }
            }
          }
        }
      }),
      catchError((err: HttpErrorResponse) => {
        let msg = 'Ocurrió un error';
        let code: string | undefined;
        const e = err?.error;
        if (e) {
          if (typeof e === 'string') {
            msg = e;
          } else if (typeof e === 'object') {
            msg = e.message || e.mensaje || msg;
            code = e.code;
          }
        } else if (err.statusText) {
          msg = `${err.status} ${err.statusText}`;
        }
        this.modal.open({ type: 'error', message: msg, code });
        return throwError(() => err);
      })
    );
  }
}
