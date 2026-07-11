export interface AIProvider {
  testConnection(): Promise<boolean>;
  
  cleanContacts(rawText: string): Promise<any[]>;
  improveEmail(emailBody: string): Promise<string>;
  personalizeEmail(emailBody: string, companyContext: string): Promise<string>;
  generateSubjects(context: string): Promise<string[]>;
  generateVariations(emailBody: string): Promise<string[]>;
  matchResume(emailBody: string, resumeText: string): Promise<string>;
  rawCompletion(systemPrompt: string, userPrompt: string): Promise<string>;
  extractResumeDetails?(resumeText: string): Promise<{ senderName?: string; currentRole?: string; skills?: string; portfolio?: string; linkedin?: string; github?: string; }>;
}

import { GroqProvider } from "./groqProvider";
import { GeminiProvider } from "./geminiProvider";
import { OpenAIProvider } from "./openAiProvider";
import { ClaudeProvider } from "./claudeProvider";
import { MistralProvider } from "./mistralProvider";

export type AIProviderType = 'Groq' | 'Gemini' | 'OpenAI' | 'Claude' | 'Mistral' | 'None';

export function getAIProvider(provider: AIProviderType, apiKey: string | null): AIProvider | null {
  if (provider === 'None' || !apiKey) return null;
  const cleanKey = apiKey.trim();
  if (provider === 'Groq') return new GroqProvider(cleanKey);
  if (provider === 'Gemini') return new GeminiProvider(cleanKey);
  if (provider === 'OpenAI') return new OpenAIProvider(cleanKey);
  if (provider === 'Claude') return new ClaudeProvider(cleanKey);
  if (provider === 'Mistral') return new MistralProvider(cleanKey);
  return null;
}
