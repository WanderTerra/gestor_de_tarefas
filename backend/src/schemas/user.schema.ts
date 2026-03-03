import { z } from 'zod';

// Roles disponíveis: adm (manager) e os demais são employees
export const UserRole = z.enum(['adm', 'backoffice', 'supervisor', 'financeiro', 'rh', 'monitor']);

// Helper para verificar se é administrador
export function isManagerRole(role: string): boolean {
  return role === 'adm';
}

// Helper para verificar se é employee (todos exceto adm)
export function isEmployeeRole(role: string): boolean {
  return role !== 'adm';
}

export const createUserSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(50),
  password: z.string().min(4, 'Mínimo 4 caracteres').max(100),
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  role: UserRole.default('backoffice'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(4).max(100).optional(),
  role: UserRole.optional(),
  active: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
