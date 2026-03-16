---
name: nestjs-best-practices
description: Apply production-grade NestJS architecture and coding practices including dependency injection, modular architecture, validation, and secure API design.
triggers:
  - nestjs api
  - nestjs controller
  - nestjs service
  - nestjs architecture
  - nestjs refactor
  - backend nestjs
---

# NestJS Best Practices

This skill provides best practices for writing **scalable, maintainable NestJS applications**.

Use this skill when:

- building NestJS modules
- creating controllers or services
- refactoring backend code
- designing APIs
- implementing authentication
- reviewing backend architecture

---

# Core Architecture Principles

## Modular Architecture

Each feature should have its own module.

Bad:

```ts
@Module({
  controllers: [UserController, OrderController],
  providers: [UserService, OrderService]
})
export class AppModule {}

Good:

@Module({
  imports: [UserModule, OrderModule]
})
export class AppModule {}

Feature modules isolate responsibilities.

Dependency Injection

Always use NestJS dependency injection.

Avoid manual instantiation:

const service = new UserService();

Prefer:

@Injectable()
export class UserService {}

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}
}
Controllers

Controllers should remain thin.

Bad:

@Post()
createUser() {
  // business logic
}

Good:

@Post()
createUser(@Body() dto: CreateUserDto) {
  return this.userService.create(dto);
}

Business logic belongs in services.

DTO Validation

Always validate inputs using class-validator.

Example:

import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {

  @IsEmail()
  email: string;

  @IsString()
  name: string;

}

Never trust request input.

Error Handling

Use NestJS exceptions.

Example:

throw new NotFoundException('User not found');

Avoid generic errors.

Security

Always implement:

• DTO validation
• guards for authentication
• role-based authorization
• sanitized inputs

Example:

@UseGuards(AuthGuard)
@Get('profile')
getProfile() {}
Performance

Prefer:

async database queries

pagination

indexed queries

Avoid loading large datasets.

Database Layer

Use repositories or ORM abstractions.

Example with TypeORM:

constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>
) {}

Never mix database logic inside controllers.

Testing

Write unit tests for services.

Example:

describe('UserService', () => {
  it('should create a user', () => {
    expect(service.create()).toBeDefined();
  });
});
API Design

Follow REST conventions.

Example:

GET    /users
POST   /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id

Use Swagger decorators when possible.

Anti-Patterns

Avoid:

fat controllers

business logic in controllers

circular module dependencies

missing validation

unhandled exceptions

Expected Output

When using this skill, the agent should produce:

modular NestJS architecture

thin controllers

service-based business logic

DTO validation

secure and scalable APIs


---