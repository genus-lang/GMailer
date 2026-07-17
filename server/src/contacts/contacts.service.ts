import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const pastEmails = await this.prisma.emailQueue.findMany({
      where: { 
        userId, 
        status: { in: ['SENT', 'PROCESSING', 'PENDING'] } 
      },
      select: { toEmail: true }
    });
    
    const emailedSet = new Set(pastEmails.map(e => e.toEmail));

    return contacts.map(c => ({
      ...c,
      hasBeenEmailed: emailedSet.has(c.email)
    }));
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

  async createBulk(userId: string, contacts: any[]) {
    // We want to skip duplicates. Prisma's createMany supports skipDuplicates.
    const data = contacts.map(c => ({
      userId,
      email: c.email,
      name: c.name || '',
      company: c.company || '',
      role: c.role || '',
      tags: c.tags || [],
    }));

    return this.prisma.contact.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async delete(userId: string, id: string) {
    return this.prisma.contact.delete({
      where: { id, userId },
    });
  }
}
