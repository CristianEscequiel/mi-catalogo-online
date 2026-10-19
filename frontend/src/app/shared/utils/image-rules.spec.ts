import { HttpErrorResponse } from '@angular/common/http';

import { imageTooLargeMessage, imageUploadErrorMessage, validateImageFile } from './image-rules';

const MB = 1024 * 1024;
const FORMAT_ERROR = 'Formato no permitido. Usa JPG, PNG o WebP.';

const fileOf = (type: string, size = 1) => {
  const file = new File(['x'], 'archivo', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('image-rules', () => {
  describe('validateImageFile', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      it(`REQ-2.2: acepta ${type}`, () => {
        expect(validateImageFile(fileOf(type))).toBeNull();
      });
    }

    it('REQ-2.3: rechaza application/pdf con el mensaje de formato', () => {
      expect(validateImageFile(fileOf('application/pdf'))).toBe(FORMAT_ERROR);
    });

    it('REQ-2.2: rechaza un archivo con file.type vacío como formato no permitido', () => {
      expect(validateImageFile(fileOf(''))).toBe(FORMAT_ERROR);
    });

    it('REQ-2.4: un archivo de exactamente 5 MB es válido', () => {
      expect(validateImageFile(fileOf('image/png', 5 * MB))).toBeNull();
    });

    it('REQ-2.4: un archivo de 5 MB + 1 byte se rechaza', () => {
      expect(validateImageFile(fileOf('image/png', 5 * MB + 1))).not.toBeNull();
    });

    it('REQ-2.5: el rechazo por tamaño indica el tamaño del archivo y el máximo', () => {
      expect(validateImageFile(fileOf('image/png', Math.round(7.2 * MB)))).toBe('La imagen pesa 7,2 MB y el máximo es 5 MB.');
    });

    it('REQ-2.3: si el formato y el tamaño son inválidos, gana el mensaje de formato', () => {
      expect(validateImageFile(fileOf('application/pdf', 9 * MB))).toBe(FORMAT_ERROR);
    });
  });

  describe('imageTooLargeMessage', () => {
    it('REQ-2.5: formatea con una decimal y coma decimal', () => {
      expect(imageTooLargeMessage(Math.round(7.2 * MB))).toBe('La imagen pesa 7,2 MB y el máximo es 5 MB.');
    });

    it('REQ-2.5: redondea hacia arriba (5 242 881 bytes pesan 5,1 MB)', () => {
      expect(imageTooLargeMessage(5 * MB + 1)).toBe('La imagen pesa 5,1 MB y el máximo es 5 MB.');
    });
  });

  describe('imageUploadErrorMessage', () => {
    it('REQ-2.10: con 415 devuelve el mensaje de formato', () => {
      expect(imageUploadErrorMessage(new HttpErrorResponse({ status: 415 }))).toBe(FORMAT_ERROR);
    });

    it('REQ-2.11: con 415 devuelve el mensaje de formato aunque se pase un genérico propio', () => {
      expect(imageUploadErrorMessage(new HttpErrorResponse({ status: 415 }), 'otro')).toBe(FORMAT_ERROR);
    });

    it('REQ-2.12: con 413 devuelve un mensaje que nombra el máximo de 5 MB', () => {
      expect(imageUploadErrorMessage(new HttpErrorResponse({ status: 413 }))).toContain('5 MB');
    });

    it('REQ-2.13: con 413 ignora el genérico propio y nombra el máximo', () => {
      const message = imageUploadErrorMessage(new HttpErrorResponse({ status: 413 }), 'otro');

      expect(message).toContain('5 MB');
      expect(message).not.toBe('otro');
    });

    it('REQ-2.14: con otro error HTTP devuelve «No se pudo subir la imagen.»', () => {
      expect(imageUploadErrorMessage(new HttpErrorResponse({ status: 500 }))).toBe('No se pudo subir la imagen.');
    });

    it('REQ-2.14: con un error que no es HTTP devuelve «No se pudo subir la imagen.»', () => {
      expect(imageUploadErrorMessage(new Error('boom'))).toBe('No se pudo subir la imagen.');
    });

    it('REQ-2.15: con otro error y un genérico propio devuelve ese genérico', () => {
      expect(imageUploadErrorMessage(new HttpErrorResponse({ status: 500 }), 'No se pudo subir la imagen de perfil.')).toBe(
        'No se pudo subir la imagen de perfil.',
      );
    });
  });
});
