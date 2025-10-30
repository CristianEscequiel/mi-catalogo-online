src/app/
  core/               ← cosas globales, singletons
    guards/
      auth.guard.ts
    interceptors/
      auth.interceptor.ts
    services/
      http.service.ts
      auth.service.ts
      user-context.service.ts
    models/
      user.model.ts
      auth-response.model.ts
    core.module.ts    (si no usás standalone)
  shared/             ← componentes reutilizables
    components/
      header/
      spinner/
    directives/
    pipes/
  features/
    auth/
      pages/
        login.page.ts
        register.page.ts
      components/
        login-form/
      services/
        auth.facade.ts
      auth.routes.ts
    products/
      ...
    cart/
      ...
  app.routes.ts
  app.component.ts

  Puntos importantes de esto:

core/: vive lo que hay una sola vez en toda la app (servicios singleton, interceptor que mete el token, guard de auth).

shared/: vive lo que se reusa (botones, layout, header…).

features/: cada caso de uso (auth, products, cart, admin) vive aislado. Esto es tu “programación modular”.
