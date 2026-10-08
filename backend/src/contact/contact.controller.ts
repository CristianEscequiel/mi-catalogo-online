import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('contact')
@Controller('contact')
// El guard se aplica solo acá (nunca global) para no limitar el resto de la API.
@UseGuards(ThrottlerGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Enviar un mensaje de contacto por mail (público, con límite por IP)' })
  create(@Body() dto: CreateContactDto): Promise<{ message: string }> {
    return this.contactService.submit(dto);
  }
}
