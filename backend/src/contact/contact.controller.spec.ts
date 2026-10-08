import { ServiceUnavailableException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ContactController } from './contact.controller';
import { CONTACT_FAILURE_MESSAGE, CONTACT_SUCCESS_MESSAGE, ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

describe('ContactController', () => {
  const dto = Object.assign(new CreateContactDto(), {
    name: 'Ana Pérez',
    email: 'ana@ejemplo.com',
    message: 'Hola, me gustaría hablar.',
  });

  let submit: jest.Mock;
  let controller: ContactController;

  beforeEach(() => {
    submit = jest.fn();
    controller = new ContactController({ submit } as unknown as ContactService);
  });

  it('delega en el servicio y devuelve su cuerpo', async () => {
    submit.mockResolvedValue({ message: CONTACT_SUCCESS_MESSAGE });

    await expect(controller.create(dto)).resolves.toEqual({ message: CONTACT_SUCCESS_MESSAGE });
    expect(submit).toHaveBeenCalledWith(dto);
  });

  it('propaga el 503 del servicio', async () => {
    submit.mockRejectedValue(new ServiceUnavailableException(CONTACT_FAILURE_MESSAGE));

    await expect(controller.create(dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('aplica el límite de frecuencia solo en este controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ContactController) as unknown[];
    expect(guards).toContain(ThrottlerGuard);
  });
});
