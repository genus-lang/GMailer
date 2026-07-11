import { AIProvider } from "./aiService";

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model = "gemini-1.5-flash";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [{
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) throw new Error("Invalid API Key");
      if (response.status === 429) throw new Error("Your AI Provider credits have been exhausted or you have hit a rate limit. Please add billing details to your AI provider account, or switch to a different AI Provider in Settings.");
      throw new Error("Unable to connect to AI provider.");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.callAPI("Respond with exactly the word OK.", "Test");
      return true;
    } catch (e) {
      throw e;
    }
  }

  async rawCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.callAPI(systemPrompt, userPrompt);
  }

  async cleanContacts(rawText: string): Promise<any[]> {
    const systemPrompt = `You are a data extraction assistant. Extract contact information from the raw text provided.
Return ONLY a valid JSON array of objects. Each object must have the following string keys: firstName, lastName, company, role, email.
If a field is missing, use an empty string. DO NOT wrap the output in markdown code blocks. Just return the raw JSON array.`;
    
    const res = await this.callAPI(systemPrompt, rawText);
    try {
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse JSON from AI", res);
      throw new Error("Failed to parse AI response. Please try again.");
    }
  }

  async improveEmail(emailBody: string): Promise<string> {
    const systemPrompt = `You are an expert email copywriter. Improve the following email for grammar, formatting, readability, and professionalism. Remove repetition and keep the original meaning. 
CRITICAL RULE: NEVER modify or remove placeholders like {{firstName}}, {{company}}, {{role}}, or any other {{var}}.
You may also dynamically insert {{senderName}}, {{currentRole}}, {{skills}}, {{portfolio}}, {{linkedin}}, or {{github}} if appropriate.
Return ONLY the improved email body text.`;
    return this.callAPI(systemPrompt, emailBody);
  }

  async personalizeEmail(emailBody: string, companyContext: string): Promise<string> {
    const systemPrompt = `Rewrite the following email to be highly personalized for the company type: ${companyContext}.
If it's a startup, be energetic. If it's enterprise, be professional and mention scale. If it's NGO, be empathetic.
Keep it concise. Do not invent fake facts. CRITICAL RULE: Preserve all {{placeholders}}.
Return ONLY the rewritten email body.`;
    return this.callAPI(systemPrompt, emailBody);
  }

  async generateSubjects(context: string): Promise<string[]> {
    const systemPrompt = `Generate 5 highly clickable, professional email subject lines based on the provided email context.
Return them as a JSON array of strings. Do not include markdown or explanations.`;
    const res = await this.callAPI(systemPrompt, context);
    try {
      return JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
      return res.split('\n').filter(l => l.trim().length > 0).map(l => l.replace(/^[-*0-9.]+\s*/, ''));
    }
  }

  async generateVariations(emailBody: string): Promise<string[]> {
    const systemPrompt = `Generate 5 variations of the provided email.
1: Formal
2: Friendly
3: Short
4: Recruiter-focused
5: Founder-focused
CRITICAL RULE: Preserve all {{placeholders}}.
You may also dynamically insert {{senderName}}, {{currentRole}}, {{skills}}, {{portfolio}}, {{linkedin}}, or {{github}} if appropriate.
Return ONLY a JSON array of strings containing the 5 variations in order. Do not include markdown blocks.`;
    const res = await this.callAPI(systemPrompt, emailBody);
    try {
      return JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
       throw new Error("Failed to parse AI response.");
    }
  }

  async matchResume(emailBody: string, resumeText: string): Promise<string> {
    const systemPrompt = `You are a career coach. The user is sending a cold email and has provided their resume.
Rewrite the email body to perfectly align with their resume experience without fabricating skills.
CRITICAL RULE: Preserve all {{placeholders}}.
Return ONLY the rewritten email body text.`;
    return this.callAPI(systemPrompt, `RESUME:\n${resumeText}\n\nEMAIL:\n${emailBody}`);
  }

  async extractResumeDetails(resumeText: string): Promise<{ senderName?: string; currentRole?: string; skills?: string; portfolio?: string; linkedin?: string; github?: string; }> {
    const systemPrompt = `Extract key details from the following resume text to populate an email sender profile.
Return ONLY a JSON object with the following keys (if missing, leave as empty string):
- senderName: Full name of the candidate
- currentRole: Their current or most recent job title (e.g. "Software Engineer")
- skills: A comma-separated list of their top 5-10 technical or core skills
- portfolio: URL to their personal website/portfolio (if found)
- linkedin: URL to their LinkedIn profile (if found)
- github: URL to their GitHub profile (if found)
DO NOT include markdown block markers like \`\`\`json. Return raw JSON only.`;
    
    const res = await this.callAPI(systemPrompt, resumeText);
    try {
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse resume JSON", res);
      throw new Error("Failed to parse resume details from AI.");
    }
  }
}
