import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
     provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes), provideClientHydration(withEventReplay())
  ]
};
