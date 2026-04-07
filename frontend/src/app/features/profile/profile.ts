import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { AuthStore } from '../../core/state/auth.store';
import { Form, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserFormLogin } from '../../core/models/user-form.model';
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
})
export class Profile implements AfterViewInit {
  profileForm = new FormGroup<ProfileForm>({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    // email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  })

private store = inject(AuthStore)
private authService = inject(AuthService)
private notificationService = inject(NotificationService)
private dialog = inject(Dialog)
profile = this.store.userProfile()
avatar = this.profile?.avatar;
selectedImageFile: File | null = null;
imageError: string | null = null;
isUploadingImage = false;
isDeletingImage = false;
enableEdit:boolean = false;

ngAfterViewInit(){
  this.profileForm.patchValue({
    name: this.profile?.name,
    lastName:this.profile?.lastName,
    // email:this.profile?.email
  })
  this.profileForm.disable()
}
edit(){
  this.profileForm.enable()
  this.enableEdit = true;
}

onImageFileSelected(file: File | null) {
  this.imageError = null;
  this.selectedImageFile = file;
}

async onUploadImage() {
  const userId = this.store.userLite()?.id;
  if (!userId || !this.selectedImageFile) {
    return;
  }

  const fileToUpload = this.selectedImageFile;

  try {
    this.isUploadingImage = true;

    if (this.avatar) {
      const confirmed = await confirmImageReplacementDialog(this.dialog);
      if (!confirmed) {
        return;
      }
      await this.deleteProfileImage(false, false);
    }

    const response = await firstValueFrom(this.authService.uploadProfileImage(userId, fileToUpload));
    this.avatar = response.imageUrl;
    this.selectedImageFile = null;
    const currentProfile = this.store.userProfile();
    if (currentProfile) {
      this.store.setUserProfile({ ...currentProfile, avatar: response.imageUrl });
    }
    this.notificationService.success('Imagen de perfil subida correctamente.');
  } catch {
    this.imageError = 'No se pudo subir la imagen.';
    this.notificationService.error('No se pudo subir la imagen de perfil.');
  } finally {
    this.isUploadingImage = false;
  }
}

onDeleteImage() {
  this.deleteProfileImage(true);
}

resolvedAvatarUrl() {
  return resolveImageUrl(this.avatar);
}

private async deleteProfileImage(showSuccessToast: boolean, clearSelection = true) {
  const userId = this.store.userLite()?.id;
  if (!userId || !this.avatar) {
    return;
  }

  this.isDeletingImage = true;
  try {
    const response = await firstValueFrom(this.authService.deleteProfileImage(userId));
    this.avatar = response.imageUrl;
    if (clearSelection) {
      this.selectedImageFile = null;
    }
    const currentProfile = this.store.userProfile();
    if (currentProfile) {
      this.store.setUserProfile({ ...currentProfile, avatar: response.imageUrl });
    }
    if (showSuccessToast) {
      this.notificationService.success('Imagen de perfil eliminada correctamente.');
    }
  } catch (error) {
    if (!showSuccessToast && isNotFoundHttpError(error)) {
      this.avatar = null;
      return;
    }
    this.notificationService.error('No se pudo eliminar la imagen de perfil.');
    throw new Error('PROFILE_IMAGE_DELETE_FAILED');
  } finally {
    this.isDeletingImage = false;
  }
}
}
