import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { Layout } from './layout';

@Component({ selector: 'app-destino-prueba', template: '<p>Pantalla de prueba</p>', changeDetection: ChangeDetectionStrategy.OnPush })
class DestinoPrueba {}

describe('Layout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'prueba', component: DestinoPrueba }]),
      ],
    }).compileComponents();
  });

  it('REQ-2.2: muestra el contenedor de avisos y el encabezado', () => {
    const fixture = TestBed.createComponent(Layout);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('app-toast-container')).not.toBeNull();
    expect(el.querySelector('app-header')).not.toBeNull();
  });

  it('REQ-2.2: al navegar a una ruta, la pantalla aparece dentro del encabezado', async () => {
    const fixture = TestBed.createComponent(Layout);
    fixture.detectChanges();

    await TestBed.inject(Router).navigateByUrl('/prueba');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-header app-destino-prueba')?.textContent).toContain('Pantalla de prueba');
  });
});
