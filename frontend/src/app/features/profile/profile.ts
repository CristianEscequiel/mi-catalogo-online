import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { AuthStore } from '../../core/state/auth.store';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ImageFieldComponent } from '../../shared/components/image-field/image-field.component';
import { resolveImageUrl } from '../../core/config/api.config';
import { imageUploadErrorMessage } from '../../shared/utils/image-rules';
import { confirmImageReplacementDialog, isNotFoundHttpError } from '../../shared/utils/image-replacement.helper';

const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

interface ProfileForm {
name:FormControl;
lastName:FormControl;
// email:FormControl;
}

@Component({
  selector: 'app-profile',
  standalone:true,
  imports: [ReactiveFormsModule , CommonModule, ImageFieldComponent],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  profileForm = new FormGroup<ProfileForm>({
    name: new FormControl<string>('', { nonNullable: true, validators: [notBlank] }),
    lastName: new FormControl<string>('', { nonNullable: true, validators: [notBlank] }),
    // email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  })

private store = inject(AuthStore)
private authService = inject(AuthService)
private notificationService = inject(NotificationService)
private dialog = inject(Dialog)
profile = this.store.userProfile;
avatar = computed(() => this.profile()?.avatar ?? null);
selectedImageFile = signal<File | null>(null);
imageError = signal<string | null>(null);
isUploadingImage = signal(false);
isDeletingImage = signal(false);
enableEdit = signal(false);
isSaving = signal(false);
private formEvents = toSignal(this.profileForm.events, { initialValue: null });
nameError = computed(() => {
  this.formEvents();
  const control = this.profileForm.controls.name;
  return control.touched && control.hasError('required') ? 'El nombre es obligatorio.' : null;
});
lastNameError = computed(() => {
  this.formEvents();
  const control = this.profileForm.controls.lastName;
  return control.touched && control.hasError('required') ? 'El apellido es obligatorio.' : null;
});
canSave = computed(() => {
  this.formEvents();
  const current = this.profile();
  if (!this.enableEdit() || this.isSaving() || !this.profileForm.valid || !this.store.userLite()?.id || !current) {
    return false;
  }
  const { name, lastName } = this.profileForm.getRawValue();
  return name.trim() !== current.name || lastName.trim() !== current.lastName;
});

constructor() {
  // Copia el perfil al formulario solo fuera de edición: subir o borrar la imagen
  // durante la edición cambia el perfil del store pero no pisa lo que se está escribiendo.
  effect(() => {
    const profile = this.profile();
    if (this.enableEdit()) {
      return;
    }
    this.profileForm.reset({
      name: profile?.name ?? '',
      lastName: profile?.lastName ?? '',
      // email: profile?.email ?? ''
    });
    this.profileForm.disable();
  });
}

edit(){
  this.profileForm.enable()
  this.enableEdit.set(true);
}

cancel() {
  this.enableEdit.set(false);
}

async save() {
  const userId = this.store.userLite()?.id;
  const current = this.store.userProfile();
  if (this.isSaving() || !this.canSave() || !userId || !current) {
    return;
  }
  const raw = this.profileForm.getRawValue();
  const name = raw.name.trim();
  const lastName = raw.lastName.trim();
  this.isSaving.set(true);
  try {
    await firstValueFrom(this.authService.updateProfile(userId, { name, lastName }));
    this.store.setUserProfile({ ...current, name, lastName });
    this.notificationService.success('Perfil actualizado correctamente.');
    this.enableEdit.set(false);
  } catch {
    this.notificationService.error('No se pudo guardar el perfil.');
  } finally {
    this.isSaving.set(false);
  }
}

onImageFileSelected(file: File | null) {
  this.imageError.set(null);
  this.selectedImageFile.set(file);
}

async onUploadImage() {
  const userId = this.store.userLite()?.id;
  const fileToUpload = this.selectedImageFile();
  if (!userId || !fileToUpload) {
    return;
  }

  try {
    this.isUploadingImage.set(true);

    if (this.avatar()) {
      const confirmed = await confirmImageReplacementDialog(this.dialog);
      if (!confirmed) {
        return;
      }
      await this.deleteProfileImage(false, false);
    }

    const response = await firstValueFrom(this.authService.uploadProfileImage(userId, fileToUpload));
    this.selectedImageFile.set(null);
    this.setAvatar(response.imageUrl);
    this.notificationService.success('Imagen de perfil subida correctamente.');
  } catch (error) {
    this.imageError.set(imageUploadErrorMessage(error));
    this.notificationService.error(imageUploadErrorMessage(error, 'No se pudo subir la imagen de perfil.'));
  } finally {
    this.isUploadingImage.set(false);
  }
}

async onDeleteImage() {
  try {
    await this.deleteProfileImage(true);
  } catch {
    // deleteProfileImage ya avisó el error y dejó el mensaje en imageError
  }
}

resolvedAvatarUrl() {
  return resolveImageUrl(this.avatar());
}

private setAvatar(imageUrl: string | null) {
  const currentProfile = this.store.userProfile();
  if (currentProfile) {
    this.store.setUserProfile({ ...currentProfile, avatar: imageUrl });
  }
}

private async deleteProfileImage(showSuccessToast: boolean, clearSelection = true) {
  const userId = this.store.userLite()?.id;
  if (!userId || !this.avatar()) {
    return;
  }

  this.isDeletingImage.set(true);
  try {
    const response = await firstValueFrom(this.authService.deleteProfileImage(userId));
    if (clearSelection) {
      this.selectedImageFile.set(null);
    }
    this.setAvatar(response.imageUrl);
    if (showSuccessToast) {
      this.notificationService.success('Imagen de perfil eliminada correctamente.');
    }
  } catch (error) {
    if (!showSuccessToast && isNotFoundHttpError(error)) {
      this.setAvatar(null);
      return;
    }
    this.imageError.set('No se pudo eliminar la imagen de perfil.');
    this.notificationService.error('No se pudo eliminar la imagen de perfil.');
    throw new Error('PROFILE_IMAGE_DELETE_FAILED');
  } finally {
    this.isDeletingImage.set(false);
  }
}
}
