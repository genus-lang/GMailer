import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, data: any) {
    return this.prisma.contact.create({
      data: {
        userId,
        email: data.email,
        name: data.name,
        company: data.company,
        role: data.role,
        tags: data.tags || [],
      },
    });
  }

  async delete(userId: string, id: string) {
    return this.prisma.contact.delete({
      where: { id, userId },
    });
  }
}
