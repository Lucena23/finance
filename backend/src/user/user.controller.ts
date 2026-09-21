import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@FamilyScopeParam() scope: FamilyScope, @Body() createUserDto: CreateUserDto) {
    return this.userService.create(scope.familyAccountId, createUserDto);
  }

  @Get()
  findAll(@FamilyScopeParam() scope: FamilyScope) {
    return this.userService.findAll(scope.familyAccountId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(scope.familyAccountId, id, updateUserDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@FamilyScopeParam() scope: FamilyScope, @Param('id') id: string) {
    return this.userService.remove(scope.familyAccountId, id);
  }
}
