/**
 * Contact Deduplication
 * Prevents duplicate contacts from being added by normalizing and hashing emails.
 */

import { Contact } from '@/store/useStore';

/** Normalize email for comparison */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Check if an email already exists in the contact list.
 */
export function isDuplicate(email: string, existingContacts: Contact[]): Contact | null {
  const normalized = normalizeEmail(email);
  return existingContacts.find(c => normalizeEmail(c.email) === normalized) || null;
}

export interface DeduplicationResult {
  unique: Contact[];
  duplicates: { contact: Contact; existingId: number }[];
  merged: number;
}

/**
 * Deduplicate an array of incoming contacts against the existing contacts.
 * Strategy: Keep existing, skip incoming duplicate. Log all duplicates found.
 */
export function deduplicateContacts(
  incoming: Omit<Contact, 'id'>[],
  existing: Contact[]
): DeduplicationResult {
  const result: DeduplicationResult = {
    unique: [],
    duplicates: [],
    merged: 0,
  };

  const existingEmailSet = new Map<string, Contact>();
  existing.forEach(c => existingEmailSet.set(normalizeEmail(c.email), c));

  // Deduplicate within the incoming batch itself
  const incomingEmailsSeen = new Set<string>();

  for (const contact of incoming) {
    const norm = normalizeEmail(contact.email);

    // Skip if duplicate within incoming batch
    if (incomingEmailsSeen.has(norm)) {
      result.merged++;
      continue;
    }
    incomingEmailsSeen.add(norm);

    const existingMatch = existingEmailSet.get(norm);
    if (existingMatch) {
      result.duplicates.push({ contact: contact as Contact, existingId: existingMatch.id });
      result.merged++;
    } else {
      result.unique.push(contact as Contact);
    }
  }

  return result;
}

/**
 * Merge two contacts: incoming fields fill in missing existing fields.
 */
export function mergeContacts(existing: Contact, incoming: Partial<Contact>): Contact {
  return {
    ...existing,
    name: existing.name || incoming.name || '',
    variables: { ...(incoming.variables || {}), ...(existing.variables || {}) },
  };
}
