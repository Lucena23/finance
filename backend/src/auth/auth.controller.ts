import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { AuthResponse, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * AuthController — rotas públicas de autenticação.
 * ARCHITECTURE §3.2 — MÓDULO AUTH.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }
}
