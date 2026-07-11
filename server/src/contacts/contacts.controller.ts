import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('contacts')
@UseGuards(AuthGuard('jwt'))
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async getContacts(@Req() req: any) {
    return this.contactsService.findAll(req.user.userId);
  }

  @Post()
  async createContact(@Req() req: any, @Body() data: any) {
    return this.contactsService.create(req.user.userId, data);
  }

  @Delete(':id')
  async deleteContact(@Req() req: any, @Param('id') id: string) {
    return this.contactsService.delete(req.user.userId, id);
  }
}
