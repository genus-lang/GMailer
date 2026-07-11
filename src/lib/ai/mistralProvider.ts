import { AIProvider } from "./aiService";

export class MistralProvider implements AIProvider {
  private apiKey: string;
  private model = "mistral-large-latest";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async testConnection(): Promise<boolean> { return true; }
  async cleanContacts(rawText: string): Promise<any[]> { return []; }
  async improveEmail(emailBody: string): Promise<string> { return emailBody; }
  async personalizeEmail(emailBody: string, companyContext: string): Promise<string> { return emailBody; }
  async generateSubjects(context: string): Promise<string[]> { return ["Stub Subject"]; }
  async generateVariations(emailBody: string): Promise<string[]> { return [emailBody]; }
  async matchResume(emailBody: string, resumeText: string): Promise<string> { return emailBody; }
  async rawCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    return "Mistral Stub Response";
  }
}
