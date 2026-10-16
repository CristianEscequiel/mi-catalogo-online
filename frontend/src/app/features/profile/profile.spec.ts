import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';

import { NotificationService } from '../../core/services/notification.service';
import { AuthStore, UserProfile } from '../../core/state/auth.store';
import { ImageFieldComponent } from '../../shared/components/image-field/image-field.component';
import { AuthService } from '../auth/services/auth.service';
import { Profile } from './profile';

type ImageResponse = { userId: number; imageUrl: string | null };

const ana: UserProfile = { id: 1, email: 'ana@x.com', name: 'Ana', lastName: 'Pérez', avatar: null };
const beto: UserProfile = { id: 1, email: 'ana@x.com', name: 'Beto', lastName: 'Gómez', avatar: null };

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let component: Profile;
  let store: AuthStore;
  let upload: Subject<ImageResponse>;
  let remove: Subject<ImageResponse>;
  let notifications: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  const el = () => fixture.nativeElement as HTMLElement;
  const field = () => fixture.debugElement.query(By.directive(ImageFieldComponent)).componentInstance as ImageFieldComponent;
  const input = (id: string) => el().querySelector<HTMLInputElement>(`#${id}`)!;
  const button = (text: string) =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('form > button')).find((b) => b.textContent?.trim() === text);
  const file = () => new File(['x'], 'foto.png', { type: 'image/png' });
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const create = async (profile: UserProfile | null) => {
    if (profile) {
      store.setUserProfile(profile);
    }
    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
  };

  beforeEach(async () => {
    upload = new Subject();
    remove = new Subject();
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: { uploadProfileImage: () => upload, deleteProfileImage: () => remove } },
        { provide: NotificationService, useValue: notifications },
        { provide: Dialog, useValue: { open: () => ({ closed: of(true) }) } },
      ],
    }).compileComponents();

    store = TestBed.inject(AuthStore);
    store.setAuth('token-x', { id: 1, email: 'ana@x.com' } as never);
  });

  afterEach(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
  });

  it('should create', async () => {
    await create(ana);

    expect(component).toBeTruthy();
  });

  it('REQ-3.1: si el perfil del store cambia, muestra los datos nuevos sin recargar', async () => {
    await create(ana);
    expect(input('name').value).toBe('Ana');

    store.setUserProfile(beto);
    await settle();

    expect(input('name').value).toBe('Beto');
    expect(input('lastName').value).toBe('Gómez');
  });

  it('REQ-3.2: al presionar editar habilita el formulario', async () => {
    await create(ana);
    expect(input('name').disabled).toBeTrue();

    button('Editar')!.click();
    await settle();

    expect(input('name').disabled).toBeFalse();
    expect(input('lastName').disabled).toBeFalse();
  });

  it('REQ-3.3: al presionar editar pasa a modo edición y muestra "Guardar" en lugar de "Editar"', async () => {
    await create(ana);
    expect(button('Guardar')).toBeUndefined();

    button('Editar')!.click();
    await settle();

    expect(button('Guardar')).toBeDefined();
    expect(button('Editar')).toBeUndefined();
  });

  it('REQ-3.4: si el perfil todavía no está cargado, el formulario queda vacío y deshabilitado sin lanzar errores', async () => {
    await expectAsync(create(null)).toBeResolved();

    expect(input('name').value).toBe('');
    expect(input('lastName').value).toBe('');
    expect(input('name').disabled).toBeTrue();
    expect(input('lastName').disabled).toBeTrue();
  });

  it('REQ-3.5: al comenzar la subida de una imagen el campo de imagen queda en "subiendo"', async () => {
    await create(ana);
    component.onImageFileSelected(file());

    void component.onUploadImage();
    await settle();

    expect(field().isUploading).toBeTrue();
  });

  it('REQ-3.6: si la subida termina con éxito deja de estar "subiendo" y muestra la nueva imagen', async () => {
    await create(ana);
    component.onImageFileSelected(file());
    void component.onUploadImage();
    await settle();

    upload.next({ userId: 1, imageUrl: '/uploads/users/nueva.png' });
    await settle();

    expect(field().isUploading).toBeFalse();
    expect(el().querySelector('app-image-field img')?.getAttribute('src')).toContain('/uploads/users/nueva.png');
    expect(store.userProfile()?.avatar).toBe('/uploads/users/nueva.png');
  });

  it('REQ-3.7: si la subida falla deja de estar "subiendo" y muestra el mensaje de error', async () => {
    await create(ana);
    component.onImageFileSelected(file());
    void component.onUploadImage();
    await settle();

    upload.error(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(field().isUploading).toBeFalse();
    expect(el().textContent).toContain('No se pudo subir la imagen.');
    expect(notifications.error).toHaveBeenCalledWith('No se pudo subir la imagen de perfil.');
  });

  it('REQ-3.8: al comenzar el borrado de la imagen el campo de imagen queda en "borrando"', async () => {
    await create({ ...ana, avatar: '/uploads/users/vieja.png' });

    component.onDeleteImage();
    await settle();

    expect(field().isDeleting).toBeTrue();
  });

  it('REQ-3.9: si el borrado termina con éxito deja de estar "borrando" y quita la imagen', async () => {
    await create({ ...ana, avatar: '/uploads/users/vieja.png' });
    expect(el().querySelector('app-image-field img')).not.toBeNull();
    component.onDeleteImage();
    await settle();

    remove.next({ userId: 1, imageUrl: null });
    await settle();

    expect(field().isDeleting).toBeFalse();
    expect(el().querySelector('app-image-field img')).toBeNull();
    expect(store.userProfile()?.avatar).toBeNull();
  });

  it('REQ-3.10: si el borrado falla deja de estar "borrando" y muestra el mensaje de error', async () => {
    await create({ ...ana, avatar: '/uploads/users/vieja.png' });
    component.onDeleteImage();
    await settle();

    remove.error(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(field().isDeleting).toBeFalse();
    expect(el().textContent).toContain('No se pudo eliminar la imagen de perfil.');
    expect(el().querySelector('app-image-field img')).not.toBeNull();
  });

  it('REQ-3.11: al elegir un archivo nuevo desaparece el mensaje de error anterior', async () => {
    await create(ana);
    component.onImageFileSelected(file());
    void component.onUploadImage();
    await settle();
    upload.error(new HttpErrorResponse({ status: 500 }));
    await settle();
    expect(el().textContent).toContain('No se pudo subir la imagen.');

    component.onImageFileSelected(file());
    await settle();

    expect(el().textContent).not.toContain('No se pudo subir la imagen.');
  });

  it('REQ-3.1: subir una imagen mientras se edita no pisa lo que se está escribiendo', async () => {
    await create(ana);
    button('Editar')!.click();
    await settle();
    input('name').value = 'Anabel';
    input('name').dispatchEvent(new Event('input'));
    component.onImageFileSelected(file());
    void component.onUploadImage();
    await settle();

    upload.next({ userId: 1, imageUrl: '/uploads/users/nueva.png' });
    await settle();

    expect(input('name').value).toBe('Anabel');
    expect(el().querySelector('app-image-field img')?.getAttribute('src')).toContain('/uploads/users/nueva.png');
  });
});
