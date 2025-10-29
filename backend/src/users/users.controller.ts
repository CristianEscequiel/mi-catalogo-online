import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get()
  getUsers() {
    return this.userService.findAll();
  }
  @Get(':id/profile')
  getUsersProfile(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getProfileByUserId(id);
  }
  @Get(':id/posts')
  getUserPosts(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getPostsByUserId(id);
  }

  @Get(':id')
  findUsers(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserByID(id);
  }

  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }

  @Put(':id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() changes: UpdateUserDto) {
    return this.userService.update(id, changes);
  }
}
