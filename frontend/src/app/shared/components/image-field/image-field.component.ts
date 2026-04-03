import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faTrash , faEdit } from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'app-image-field',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './image-field.component.html'
})
export class ImageFieldComponent implements OnChanges, OnDestroy {
  faTrash = faTrash;
  faEdit = faEdit;
  private dialog = inject(Dialog);

  @Input() label = 'Imagen';
  @Input() imageUrl: string | null = null;
  @Input() isUploading = false;
  @Input() isDeleting = false;
  @Input() uploadDisabled = false;
  @Input() deleteDisabled = false;
  @Input() canSelectWhenImageExists = true;
  @Input() maxImages = 1;
  @Input() errorMessage: string | null = null;
  @Input() autoUploadOnSelect = false;

  @Output() fileSelected = new EventEmitter<File | null>();
  @Output() uploadRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();

  selectedFile: File | null = null;
  previewUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageUrl']?.currentValue && this.selectedFile) {
      this.clearSelection();
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    this.revokePreview();
    this.selectedFile = file;
    this.previewUrl = file ? URL.createObjectURL(file) : null;
    this.fileSelected.emit(this.selectedFile);

    if (this.autoUploadOnSelect) {
      this.uploadRequested.emit();
    }
  }

  clearSelection() {
    this.revokePreview();
    this.selectedFile = null;
    this.previewUrl = null;
    this.fileSelected.emit(null);
  }

  requestUpload() {
    this.uploadRequested.emit();
  }

  requestDelete() {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar eliminación',
        message: '¿Seguro que deseas eliminar esta imagen?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    ref.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.deleteRequested.emit();
      }
    });
  }

  canSelectNewFile() {
    return !this.uploadDisabled && (!this.imageUrl || this.canSelectWhenImageExists);
  }

  private revokePreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }
}
