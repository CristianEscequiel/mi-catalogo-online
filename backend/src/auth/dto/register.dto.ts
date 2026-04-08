import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'src/users/dto/user.dto';

export class RegisterDto extends OmitType(CreateUserDto, ['role'] as const) {}
