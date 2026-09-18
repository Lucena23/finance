import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { CreateFamilyAccountDto } from './dto/create-family-account.dto';
import { UpdateFamilyAccountDto } from './dto/update-family-account.dto';
import {
  FamilyAccountService,
  FamilyAccountView,
} from './family-account.service';

/**
 * FamilyAccountController — gestão do workspace familiar.
 * ARCHITECTURE §3.2 — MÓDULO FAMILY-ACCOUNT — TAREFA 15.
 *
 * O familyAccountId é SEMPRE derivado do JWT via FamilyScopeInterceptor
 * (RN-01 / §8.3) — nunca aceito como parâmetro de query/body.
 */
@Controller('family-account')
export class FamilyAccountController {
  constructor(private readonly familyAccountService: FamilyAccountService) {}

  /**
   * Cria um novo workspace familiar (RN-02).
   * Requer ADMIN — o criador torna-se o titular do workspace.
   */
  @Roles(Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFamilyAccountDto): Promise<FamilyAccountView> {
    return this.familyAccountService.create(dto);
  }

  /**
   * Retorna o workspace do escopo familiar autenticado.
   */
  @Get('current')
  findCurrent(
    @FamilyScopeParam() scope: FamilyScope,
  ): Promise<FamilyAccountView> {
    return this.familyAccountService.findCurrent(scope.familyAccountId);
  }

  /**
   * Atualiza o nome do workspace do escopo familiar autenticado.
   * Requer ADMIN (RN-03).
   */
  @Roles(Role.ADMIN)
  @Patch('current')
  update(
    @FamilyScopeParam() scope: FamilyScope,
    @Body() dto: UpdateFamilyAccountDto,
  ): Promise<FamilyAccountView> {
    return this.familyAccountService.update(scope.familyAccountId, dto);
  }
}
