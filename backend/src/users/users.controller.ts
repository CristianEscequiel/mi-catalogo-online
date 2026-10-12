import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, UpdateUserRoleDto } from './dto/user.dto';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { createImageMulterOptions } from 'src/files/multer-image-options.factory';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { Role } from 'src/auth/roles/roles.enum';
import { SelfOrAdminGuard } from 'src/auth/roles/self-or-admin.guard';

// Todo /users requiere JWT. Las rutas con `:id` dejan pasar solo al propio usuario o a un ADMIN;
// listar, crear, borrar y cambiar roles es exclusivo de ADMIN. El alta pública es /auth/register.
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Roles(Role.ADMIN)
  @Get()
  getUsers() {
    return this.userService.findAll();
  }

  @UseGuards(SelfOrAdminGuard)
  @Get(':id/profile')
  getUsersProfile(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getProfileByUserId(id);
  }

  @UseGuards(SelfOrAdminGuard)
  @Get(':id/products')
  getUserProducts(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getPorductsByUserId(id);
  }

  @UseGuards(SelfOrAdminGuard)
  @Get(':id/categories')
  getUserCategories(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getCategoriesByUserId(id);
  }

  @UseGuards(SelfOrAdminGuard)
  @Get(':id')
  findUsers(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserByID(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }

  @UseGuards(SelfOrAdminGuard)
  @Put(':id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() changes: UpdateUserDto) {
    return this.userService.update(id, changes);
  }

  @ApiOperation({ summary: 'Change a user role (admin)' })
  @Roles(Role.ADMIN)
  @Patch(':id/role')
  updateUserRole(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateUserRoleDto) {
    return this.userService.updateRole(id, body.role);
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
  @UseGuards(SelfOrAdminGuard)
  @Post(':id/profile/image')
  @UseInterceptors(FileInterceptor('file', createImageMulterOptions(UPLOAD_FOLDERS.profiles)))
  uploadProfileImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file?: { filename: string }) {
    if (!file?.filename) {
      throw new BadRequestException('File is required');
    }
    return this.userService.uploadProfileImage(id, file.filename);
  }

  @ApiOperation({ summary: 'Delete profile image' })
  @UseGuards(SelfOrAdminGuard)
  @Delete(':id/profile/image')
  deleteProfileImage(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteProfileImage(id);
  }
}
