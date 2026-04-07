import { HttpErrorResponse } from '@angular/common/http';
import { Dialog } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

export async function confirmImageReplacementDialog(dialog: Dialog) {
  const ref = dialog.open<boolean>(ConfirmDialogComponent, {
    data: {
      title: 'Reemplazar imagen',
      message: '¿Realmente desea reemplazar la imagen actual?',
      confirmText: 'Reemplazar',
      cancelText: 'Cancelar',
    },
  });

  const confirmed = await firstValueFrom(ref.closed);
  return confirmed === true;
}

export function isNotFoundHttpError(error: unknown) {
  return error instanceof HttpErrorResponse && error.status === 404;
}

