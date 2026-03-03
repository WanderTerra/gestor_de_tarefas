import { z } from 'zod';
import { UserRole } from './user.schema.js';

export const loginSchema = z.object({
  username: z.string().min(1, 'Usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(50),
  password: z.string().min(4, 'Mínimo 4 caracteres').max(100),
  name: z.string().min(1, 'Nome é obrigatório').max(100),
});

export const approveUserSchema = z.object({
  userId: z.number().int().positive(),
  role: UserRole,
});

export const rejectUserSchema = z.object({
  userId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ApproveUserInput = z.infer<typeof approveUserSchema>;
export type RejectUserInput = z.infer<typeof rejectUserSchema>;
