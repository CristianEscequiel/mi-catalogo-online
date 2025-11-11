// import { bootstrapApplication } from '@angular/platform-browser';
// import { appConfig } from './app/app.config';
// import { App } from './app/app';

// bootstrapApplication(App, appConfig)
//   .catch((err) => console.error(err));



// main.ts (cliente)
import 'zone.js'; // <- imprescindible para hydration
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { App } from './app/app';
import { authInterceptor } from './app/core/interceptors/auth-interceptor';
import { AuthFacade } from './app/features/auth/services/auth.facade';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

bootstrapApplication(App, {
  providers: [
    provideClientHydration(withEventReplay()),           // hydration + replay de eventos
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    AuthFacade,
  ],
}).then(ref => ref.injector.get(AuthFacade).hydrate()); // rehidrata estado auth al arrancar
