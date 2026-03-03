import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema.js';

export const userService = {
  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'Usuário não encontrado');
    }

    return user;
  },

  async create(data: CreateUserInput) {
    // Verificar se username já existe
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new AppError(409, 'Nome de usuário já existe');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        name: data.name,
        role: data.role,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return user;
  },

  async update(id: number, data: UpdateUserInput) {
    await userService.findById(id);

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  },
};
