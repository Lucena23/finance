import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Chave de metadata para papéis exigidos por rota (RN-03).
 */
export const ROLES_KEY = 'roles';

/**
 * @Roles(Role.ADMIN) — restringe o acesso a rotas por papel de usuário.
 * Consumido pelo RolesGuard. ARCHITECTURE §5.2 — TAREFA 12.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
