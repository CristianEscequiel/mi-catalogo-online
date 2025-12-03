import 'zone.js'; // <- imprescindible para hydration
import { APP_INITIALIZER, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { App } from './app/app';
import { authInterceptor } from './app/core/interceptors/auth-interceptor';
import { AuthFacade } from './app/features/auth/services/auth.facade';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { AuthStore } from './app/core/state/auth.store';

const rehydrateStore = () => {
  const store = inject(AuthStore);
  return () => store.rehydrate(); // sync: deja el token listo antes de las rutas
};

bootstrapApplication(App, {
  providers: [
    provideClientHydration(withEventReplay()), // hydration + replay de eventos
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: rehydrateStore,
    },
    AuthFacade,
  ],
}).then(ref => ref.injector.get(AuthFacade).hydrate()); // carga perfil en 2º plano
