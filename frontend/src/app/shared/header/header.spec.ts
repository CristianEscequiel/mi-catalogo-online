import { OverlayContainer } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ThemeService } from '../../core/services/theme.service';
import { AuthStore } from '../../core/state/auth.store';
import { CartStore } from '../../core/state/cart.store';
import { AuthFacade } from '../../features/auth/services/auth.facade';
import { Header } from './header';

@Component({ standalone: true, template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class DummyPage {}

describe('Header (menú de usuario)', () => {
  let fixture: ComponentFixture<Header>;
  let store: AuthStore;

  const settle = async () => {
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const overlay = () => TestBed.inject(OverlayContainer).getContainerElement();
  const menuLinks = () => Array.from(overlay().querySelectorAll('a'));
  const misPedidos = () => menuLinks().find((a) => (a.textContent ?? '').includes('Mis pedidos'));
  const openUserMenu = async () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="Abrir menu de usuario"]')?.click();
    await settle();
  };

  const create = async (loggedIn: boolean) => {
    store = TestBed.inject(AuthStore);
    if (loggedIn) {
      store.setAuth('token-falso', { id: 1, email: 'ana@test.local', role: 'CLIENT' });
    }
    fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'orders', component: DummyPage }]),
        { provide: AuthFacade, useValue: { logout: () => undefined } },
        {
          provide: CartStore,
          useValue: { items: signal([]), total: signal(0), totalItems: signal(0), loadCart: () => Promise.resolve(), remove: () => Promise.resolve(), clear: () => Promise.resolve() },
        },
        { provide: ThemeService, useValue: { isDarkTheme: signal(false), setTheme: () => undefined } },
      ],
    });
  });

  afterEach(() => {
    store.clear();
    localStorage.clear();
  });

  it('REQ-5.1: con sesión el menú de usuario tiene "Mis pedidos" hacia /orders, junto a "Mi perfil"', async () => {
    await create(true);
    await openUserMenu();

    const item = misPedidos();
    expect(item).withContext('no existe el ítem "Mis pedidos"').toBeDefined();
    expect(item?.getAttribute('href')).toBe('/orders');
    const links = menuLinks();
    const profileIndex = links.findIndex((a) => (a.textContent ?? '').includes('Mi perfil'));
    expect(profileIndex).toBeGreaterThanOrEqual(0);
    expect(links.indexOf(item as HTMLAnchorElement)).toBe(profileIndex + 1);
  });

  it('REQ-5.2: sin sesión no hay menú de usuario ni ítem "Mis pedidos"', async () => {
    await create(false);

    expect((fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Abrir menu de usuario"]')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Mis pedidos');
    expect(misPedidos()).toBeUndefined();
  });

  it('REQ-5.3: al elegir "Mis pedidos" se cierra el menú y navega a /orders', async () => {
    await create(true);
    await openUserMenu();
    expect(overlay().querySelector('[role="menu"]')).not.toBeNull();

    misPedidos()?.click();
    await settle();

    expect(TestBed.inject(Router).url).toBe('/orders');
    expect(overlay().querySelector('[role="menu"]')).toBeNull();
  });
});
