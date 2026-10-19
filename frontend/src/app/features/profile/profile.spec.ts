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
  let save$: Subject<unknown>;
  let updateProfile: jasmine.Spy;
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
    save$ = new Subject();
    updateProfile = jasmine.createSpy('updateProfile').and.callFake(() => save$);
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: { uploadProfileImage: () => upload, deleteProfileImage: () => remove, updateProfile } },
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

  describe('profile-and-images: guardar y cancelar', () => {
    const saveButton = () =>
      Array.from(el().querySelectorAll<HTMLButtonElement>('form > button')).find((b) => /^Guard/.test(b.textContent?.trim() ?? ''));
    const type = (id: string, value: string) => {
      input(id).value = value;
      input(id).dispatchEvent(new Event('input'));
    };
    const startEdit = async (name?: string, lastName?: string) => {
      button('Editar')!.click();
      await settle();
      if (name !== undefined) {
        type('name', name);
      }
      if (lastName !== undefined) {
        type('lastName', lastName);
      }
      await settle();
    };
    const submitForm = async () => {
      el().querySelector('form')!.dispatchEvent(new Event('submit'));
      await settle();
    };
    // Deja una petición de guardado en curso con valores nuevos.
    const startSaving = async () => {
      await startEdit('Anabel', 'Gómez');
      saveButton()!.click();
      await settle();
    };

    it('REQ-1.1: «Guardar» envía el perfil con nombre y apellido sin espacios al inicio ni al final', async () => {
      await create(ana);
      await startEdit('  Anabel ', ' Gómez  ');

      saveButton()!.click();
      await settle();

      expect(updateProfile).toHaveBeenCalledOnceWith(1, { name: 'Anabel', lastName: 'Gómez' });
    });

    it('REQ-1.2: varios envíos mientras la petición está en curso generan un único PUT', async () => {
      await create(ana);
      await startEdit('Anabel');

      el().querySelector('form')!.dispatchEvent(new Event('submit'));
      el().querySelector('form')!.dispatchEvent(new Event('submit'));
      el().querySelector('form')!.dispatchEvent(new Event('submit'));
      await settle();

      expect(updateProfile).toHaveBeenCalledTimes(1);
    });

    it('REQ-1.3: mientras guarda, «Guardar» queda deshabilitado e indica que está guardando', async () => {
      await create(ana);
      await startSaving();

      expect(saveButton()!.disabled).toBeTrue();
      expect(saveButton()!.textContent).toContain('Guardando');
    });

    it('REQ-1.4: mientras guarda, «Cancelar» queda deshabilitado', async () => {
      await create(ana);
      await startSaving();

      expect(button('Cancelar')!.disabled).toBeTrue();
    });

    it('REQ-1.5: al guardar con éxito actualiza name y lastName del store con los valores enviados y conserva id, email y avatar', async () => {
      const conAvatar = { ...ana, avatar: '/uploads/users/a.png' };
      await create(conAvatar);
      await startEdit('  Anabel ', 'Gómez');
      saveButton()!.click();
      await settle();

      save$.next({ id: 1, profile: { name: 'otro', lastName: 'otro' } });
      await settle();

      expect(store.userProfile()).toEqual({ id: 1, email: 'ana@x.com', name: 'Anabel', lastName: 'Gómez', avatar: '/uploads/users/a.png' });
    });

    it('REQ-1.6: al guardar con éxito muestra «Perfil actualizado correctamente.»', async () => {
      await create(ana);
      await startSaving();

      save$.next({});
      await settle();

      expect(notifications.success).toHaveBeenCalledWith('Perfil actualizado correctamente.');
    });

    it('REQ-1.7: al guardar con éxito el formulario queda en solo lectura con los valores nuevos', async () => {
      await create(ana);
      await startSaving();

      save$.next({});
      await settle();

      expect(input('name').disabled).toBeTrue();
      expect(input('lastName').disabled).toBeTrue();
      expect(input('name').value).toBe('Anabel');
      expect(input('lastName').value).toBe('Gómez');
      expect(button('Editar')).toBeDefined();
      expect(saveButton()).toBeUndefined();
    });

    it('REQ-1.8: si la petición falla muestra «No se pudo guardar el perfil.»', async () => {
      await create(ana);
      await startSaving();

      save$.error(new HttpErrorResponse({ status: 500 }));
      await settle();

      expect(notifications.error).toHaveBeenCalledWith('No se pudo guardar el perfil.');
      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('REQ-1.9: si la petición falla deja el formulario en edición con lo que el usuario escribió', async () => {
      await create(ana);
      await startSaving();

      save$.error(new HttpErrorResponse({ status: 500 }));
      await settle();

      expect(updateProfile).toHaveBeenCalledTimes(1);
      expect(input('name').disabled).toBeFalse();
      expect(input('name').value).toBe('Anabel');
      expect(input('lastName').value).toBe('Gómez');
      expect(store.userProfile()).toEqual(ana);
    });

    it('REQ-1.10: si la petición falla vuelve a habilitar «Guardar» y «Cancelar»', async () => {
      await create(ana);
      await startSaving();

      save$.error(new HttpErrorResponse({ status: 500 }));
      await settle();

      expect(saveButton()!.disabled).toBeFalse();
      expect(saveButton()!.textContent?.trim()).toBe('Guardar');
      expect(button('Cancelar')!.disabled).toBeFalse();
    });

    it('REQ-1.11: «Cancelar» restaura nombre y apellido desde el store y vuelve a solo lectura', async () => {
      await create(ana);
      await startEdit('Anabel', 'Gómez');

      button('Cancelar')!.click();
      await settle();

      expect(input('name').value).toBe('Ana');
      expect(input('lastName').value).toBe('Pérez');
      expect(input('name').disabled).toBeTrue();
      expect(button('Editar')).toBeDefined();
    });

    it('REQ-1.12: «Cancelar» no envía ninguna petición', async () => {
      await create(ana);
      await startEdit('Anabel', 'Gómez');

      button('Cancelar')!.click();
      await settle();

      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('REQ-1.13: con el nombre vacío o solo con espacios «Guardar» queda deshabilitado', async () => {
      await create(ana);
      await startEdit('   ', undefined);

      expect(saveButton()!.disabled).toBeTrue();
      await submitForm();
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('REQ-1.13: con el apellido vacío o solo con espacios «Guardar» queda deshabilitado', async () => {
      await create(ana);
      await startEdit('Anabel', '   ');

      expect(saveButton()!.disabled).toBeTrue();
      await submitForm();
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('REQ-1.14: con el nombre en blanco y tocado muestra «El nombre es obligatorio.»', async () => {
      await create(ana);
      await startEdit('   ', undefined);
      expect(el().textContent).not.toContain('El nombre es obligatorio.');

      input('name').dispatchEvent(new Event('blur'));
      await settle();

      expect(el().textContent).toContain('El nombre es obligatorio.');
    });

    it('REQ-1.14: con el apellido en blanco y tocado muestra «El apellido es obligatorio.»', async () => {
      await create(ana);
      await startEdit(undefined, '');

      input('lastName').dispatchEvent(new Event('blur'));
      await settle();

      expect(el().textContent).toContain('El apellido es obligatorio.');
    });

    it('REQ-1.15: si los valores recortados son iguales a los del store «Guardar» queda deshabilitado', async () => {
      await create(ana);
      await startEdit('Ana ', ' Pérez');

      expect(saveButton()!.disabled).toBeTrue();
      await submitForm();
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('REQ-1.17: «Editar» habilita los campos y muestra «Guardar» y «Cancelar»', async () => {
      await create(ana);

      button('Editar')!.click();
      await settle();

      expect(input('name').disabled).toBeFalse();
      expect(input('lastName').disabled).toBeFalse();
      expect(saveButton()).toBeDefined();
      expect(button('Cancelar')).toBeDefined();
    });
  });

  describe('profile-and-images: errores de subida de imagen', () => {
    const failUpload = async (status: number) => {
      await create(ana);
      component.onImageFileSelected(file());
      void component.onUploadImage();
      await settle();
      upload.error(new HttpErrorResponse({ status }));
      await settle();
    };

    it('REQ-2.10: con 415 muestra bajo el selector el mensaje de formato', async () => {
      await failUpload(415);

      expect(el().textContent).toContain('Formato no permitido. Usa JPG, PNG o WebP.');
    });

    it('REQ-2.11: con 415 el aviso emergente es el mensaje de formato', async () => {
      await failUpload(415);

      expect(notifications.error).toHaveBeenCalledWith('Formato no permitido. Usa JPG, PNG o WebP.');
    });

    it('REQ-2.12: con 413 muestra bajo el selector un mensaje que nombra el máximo de 5 MB', async () => {
      await failUpload(413);

      expect(el().querySelector('app-image-field [class*="text-error"]')?.textContent).toContain('5 MB');
    });

    it('REQ-2.13: con 413 el aviso emergente nombra el máximo de 5 MB', async () => {
      await failUpload(413);

      expect(notifications.error).toHaveBeenCalledTimes(1);
      expect(notifications.error.calls.mostRecent().args[0]).toContain('5 MB');
    });
  });
});
