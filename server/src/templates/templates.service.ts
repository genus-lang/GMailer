import { Injectable } from '@nestjs/common';
import { BUILTIN_TEMPLATES } from './builtin-templates';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  getBuiltinTemplates(plan: string) {
    if (plan === 'PRO' || plan === 'MAX') {
      return BUILTIN_TEMPLATES; // Pro users get all templates
    }
    
    // Free users get the first 3 templates
    return BUILTIN_TEMPLATES.slice(0, 3);
  }

  async findAllCustom(userId: string) {
    return this.prisma.template.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async upsertCustom(userId: string, data: { id?: string, name: string, subject: string, body: string }) {
    if (data.id) {
      // Try to find if it exists for this user
      const existing = await this.prisma.template.findUnique({
        where: { id: data.id }
      });
      
      if (existing && existing.userId === userId) {
        return this.prisma.template.update({
          where: { id: data.id },
          data: {
            name: data.name,
            subject: data.subject,
            body: data.body,
          }
        });
      }
    }
    
    // Otherwise create new
    return this.prisma.template.create({
      data: {
        userId,
        name: data.name,
        subject: data.subject,
        body: data.body
      }
    });
  }

  async deleteCustom(userId: string, id: string) {
    return this.prisma.template.delete({
      where: { id, userId }
    });
  }
}
