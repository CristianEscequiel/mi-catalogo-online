---
name: nestjs-api
description: Create REST APIs using NestJS with controllers, services, DTO validation, and Swagger documentation.
triggers:
  - create nestjs api
  - nestjs controller
  - nestjs service
  - nestjs dto
  - rest api nestjs
  - nestjs endpoint
---

# NestJS API Skill

This skill guides the agent to implement **REST APIs in NestJS** following production-ready patterns.

Use this skill when:

- creating controllers
- building services
- defining DTOs
- implementing CRUD endpoints
- adding validation
- documenting APIs

---

# Architecture Pattern

A feature should follow this structure:


feature/
├ controller
├ service
├ dto
├ entity
└ module


Example:


users/
├ users.controller.ts
├ users.service.ts
├ dto/
│ ├ create-user.dto.ts
│ └ update-user.dto.ts
├ users.entity.ts
└ users.module.ts


---

# Controllers

Controllers define HTTP routes and delegate logic to services.

Controllers must remain **thin**.

Example:

```ts
@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

}

Controllers should not contain business logic.

Services

Services implement the business logic.

Example:

@Injectable()
export class UsersService {

  async create(dto: CreateUserDto) {
    // business logic
  }

  async findAll() {
    // fetch data
  }

}

Services may interact with repositories or ORM layers.

DTO Validation

Always validate request input using class-validator.

Example:

import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {

  @IsEmail()
  email: string;

  @IsString()
  name: string;

}

Validation ensures API security and data integrity.

Update DTO

Prefer using PartialType for update DTOs.

Example:

import { PartialType } from '@nestjs/mapped-types';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
REST Endpoint Design

Follow REST conventions.

GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id

Use clear resource naming.

Swagger Documentation

Document APIs with Swagger decorators.

Example:

@ApiTags('users')
@Controller('users')
export class UsersController {}

DTO example:

@ApiProperty({
  example: 'john@email.com',
  description: 'User email'
})
email: string;
Exception Handling

Use NestJS built-in exceptions.

Example:

throw new NotFoundException('User not found');

Avoid generic errors.

Async Operations

Prefer async/await for database and external calls.

Example:

async findAll(): Promise<User[]> {
  return this.userRepository.find();
}
Security

Always consider:

input validation

authentication guards

role authorization

sanitized inputs

Example:

@UseGuards(AuthGuard)
@Get('profile')
getProfile() {}
Anti-Patterns

Avoid:

business logic in controllers

missing DTO validation

circular module dependencies

large services (>400 lines)

Expected Output

When this skill is used the agent should generate:

modular NestJS API structure

DTO validation

service-based business logic

RESTful endpoints

Swagger documentation

---