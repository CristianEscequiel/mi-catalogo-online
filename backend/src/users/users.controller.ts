import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { createImageMulterOptions } from 'src/files/multer-image-options.factory';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';

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
  @Get(':id/products')
  getUserProducts(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getPorductsByUserId(id);
  }

  @Get(':id/categories')
  getUserCategories(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getCategoriesByUserId(id);
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

  @ApiOperation({ summary: 'Upload profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/profile/image')
  @UseInterceptors(FileInterceptor('file', createImageMulterOptions(UPLOAD_FOLDERS.profiles)))
  uploadProfileImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file?: { filename: string }) {
    if (!file?.filename) {
      throw new BadRequestException('File is required');
    }
    return this.userService.uploadProfileImage(id, file.filename);
  }

  @ApiOperation({ summary: 'Delete profile image' })
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/profile/image')
  deleteProfileImage(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteProfileImage(id);
  }
}
