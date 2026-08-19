import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { WebToken } from '../api/contracts';
import { AuthApi } from '../api/auth.api';
import { SessionStore } from './session.store';

let refreshRequest$: Observable<WebToken> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionStore);
  const authApi = inject(AuthApi);
  const token = session.accessToken();

  const isApi = request.url.startsWith('/api/');
  const isAuthWeb = request.url.startsWith('/api/v1/auth/web/');
  const authorized = isApi && token && !isAuthWeb
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !isApi || isAuthWeb) {
        return throwError(() => error);
      }

      if (!refreshRequest$) {
        refreshRequest$ = authApi.webRefresh().pipe(
          catchError(refreshError => {
            session.clear();
            return throwError(() => refreshError);
          }),
          finalize(() => { refreshRequest$ = null; }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
      }

      return refreshRequest$.pipe(
        switchMap(newToken => {
          session.setAccessToken(newToken.accessToken);
          return next(request.clone({
            setHeaders: { Authorization: `Bearer ${newToken.accessToken}` }
          }));
        })
      );
    })
  );
};
