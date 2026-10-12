import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'src/users/dto/user.dto';

// El rol lo fija el servidor (CLIENT); el cliente no puede enviarlo.
export class RegisterDto extends OmitType(CreateUserDto, ['role'] as const) {}
