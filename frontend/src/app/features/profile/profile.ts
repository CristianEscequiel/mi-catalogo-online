import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { AuthStore } from '../../core/state/auth.store';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { firstValueFrom } from 'rxjs';
import { ImageFieldComponent } from '../../shared/components/image-field/image-field.component';
import { resolveImageUrl } from '../../core/config/api.config';
import { confirmImageReplacementDialog, isNotFoundHttpError } from '../../shared/utils/image-replacement.helper';

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
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
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
  } catch {
    this.imageError.set('No se pudo subir la imagen.');
    this.notificationService.error('No se pudo subir la imagen de perfil.');
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
