import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogModule, DialogRef } from '@angular/cdk/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  template: `
    <div class="bg-base-200 rounded-2xl shadow-xl p-4 w-full max-w-sm">
      <h2 class="text-lg font-semibold mb-2">{{ data.title }}</h2>
      <p class="text-sm opacity-80">{{ data.message }}</p>

      <div class="flex justify-end gap-2 mt-6">
        <button type="button" class="btn btn-outline" (click)="onCancel()">
          {{ data.cancelText ?? 'Cancelar' }}
        </button>
        <button type="button" class="btn btn-error" (click)="onConfirm()">
          {{ data.confirmText ?? 'Eliminar' }}
        </button>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  constructor(
    private dialogRef: DialogRef<boolean>,
    @Inject(DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm() {
    this.dialogRef.close(true);
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
