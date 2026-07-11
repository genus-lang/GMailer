import { Injectable } from '@nestjs/common';
import { BUILTIN_TEMPLATES } from './builtin-templates';

@Injectable()
export class TemplatesService {
  
  getBuiltinTemplates(plan: string) {
    if (plan === 'PRO' || plan === 'MAX') {
      return BUILTIN_TEMPLATES; // Pro users get all templates
    }
    
    // Free users get the first 3 templates
    return BUILTIN_TEMPLATES.slice(0, 3);
  }
}
