import { AuthResponse, AuthService } from './auth.service';
import { AuthenticatedUser } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<AuthResponse>;
    verifyEmail(token: string): Promise<string>;
    resendVerification(user: AuthenticatedUser): Promise<{
        message: string;
        cooldownSeconds: number;
    }>;
    login(dto: LoginDto): Promise<AuthResponse>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
