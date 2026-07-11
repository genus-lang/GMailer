import Papa from 'papaparse';
import { Contact } from '@/store/useStore';

export interface ParseResult {
  contacts: Contact[];
  errors: string[];
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const parsedContacts: Contact[] = [];
        const errors: string[] = [];
        const emailSet = new Set<string>();

        results.data.forEach((row: any, index: number) => {
          // Normalize keys (trim whitespace)
          const normalizedRow: Record<string, string> = {};
          Object.keys(row).forEach(key => {
            normalizedRow[key.trim().toLowerCase()] = (row[key] || '').trim();
          });

          // Find email field
          const email = normalizedRow['email'];
          if (!email) {
            errors.push(`Row ${index + 1}: Missing Email`);
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`Row ${index + 1}: Invalid Email format (${email})`);
            return;
          }

          // Check duplicates
          if (emailSet.has(email)) {
            errors.push(`Row ${index + 1}: Duplicate Email (${email})`);
            return;
          }
          emailSet.add(email);

          // Find name field
          const name = normalizedRow['name'] || normalizedRow['first name'] || email.split('@')[0];

          // Store other fields as variables
          const variables: Record<string, string> = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            if (cleanKey.toLowerCase() !== 'email' && cleanKey.toLowerCase() !== 'name') {
              variables[cleanKey] = row[key].trim();
            }
          });

          parsedContacts.push({
            id: Date.now() + index, // Simple unique ID
            name,
            email,
            status: 'Active',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            variables
          });
        });

        resolve({ contacts: parsedContacts, errors });
      },
      error: (error: any) => {
        resolve({ contacts: [], errors: [error.message] });
      }
    });
  });
}
