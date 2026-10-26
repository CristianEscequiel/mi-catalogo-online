import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, signal, SimpleChanges, viewChild } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faTrash , faEdit } from "@fortawesome/free-solid-svg-icons";
import { IMAGE_RULES_HINT, validateImageFile } from '../../utils/image-rules';

@Component({
  selector: 'app-image-field',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './image-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageFieldComponent implements OnChanges, OnDestroy {
  faTrash = faTrash;
  faEdit = faEdit;
  private dialog = inject(Dialog);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

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
  @Input() mode: 'default' | 'controls' = 'default';

  @Output() fileSelected = new EventEmitter<File | null>();
  @Output() uploadRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() previewChanged = new EventEmitter<string | null>();

  selectedFile: File | null = null;
  readonly previewUrl = signal<string | null>(null);
  readonly rejectionMessage = signal<string | null>(null);
  readonly rulesHint = IMAGE_RULES_HINT;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageUrl']?.currentValue && this.selectedFile) {
      this.discardSelection();
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

    const rejection = validateImageFile(file);
    if (rejection) {
      this.rejectionMessage.set(rejection);
      input.value = '';
      return;
    }

    this.rejectionMessage.set(null);
    this.revokePreview();
    this.selectedFile = file;
    const url = URL.createObjectURL(file);
    this.previewUrl.set(url);
    this.fileSelected.emit(this.selectedFile);
    this.previewChanged.emit(url);

    if (this.autoUploadOnSelect) {
      this.uploadRequested.emit();
    }
  }

  clearSelection() {
    this.discardSelection();
    this.rejectionMessage.set(null);
    this.previewChanged.emit(null);
  }

  private discardSelection() {
    this.revokePreview();
    this.selectedFile = null;
    this.previewUrl.set(null);
    // Sin vaciar el input, el navegador no dispara `change` al volver a elegir el mismo archivo.
    const input = this.fileInput();
    if (input) {
      input.nativeElement.value = '';
    }
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
    const preview = this.previewUrl();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }
}
