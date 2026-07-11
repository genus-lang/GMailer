// src/lib/inbox/ai-inbox.service.ts
import { AIProvider } from "../ai/aiService";
import { JobThread } from "./thread.service";

export type SmartStatus = 'Waiting' | 'Interview' | 'Assessment' | 'Offer' | 'Rejected' | 'Replied' | 'No Response' | 'Unknown';

export async function detectSmartStatus(provider: AIProvider, thread: JobThread): Promise<SmartStatus> {
  const systemPrompt = `You are an AI assistant parsing an email thread regarding a job application.
Determine the current status of the application based on the email content.
Choose EXACTLY ONE of these statuses: Waiting, Interview, Assessment, Offer, Rejected, Replied, No Response, Unknown.
Return ONLY the status string. Do not include quotes or any other text.`;
  
  const threadContent = thread.messages.map(m => `Date: ${m.date}\nFrom: ${m.sender.name}\nSnippet: ${m.snippet}\nBody: ${m.bodyText.substring(0, 500)}`).join('\n\n');
  
  try {
    const status = await provider.rawCompletion(systemPrompt, threadContent);
    const cleanStatus = status.trim();
    if (['Waiting', 'Interview', 'Assessment', 'Offer', 'Rejected', 'Replied', 'No Response'].includes(cleanStatus)) {
      return cleanStatus as SmartStatus;
    }
  } catch (e) {
    console.error("Smart Status detection failed", e);
  }
  return 'Unknown';
}

export async function generateSummary(provider: AIProvider, thread: JobThread): Promise<{ summary: string, suggestedAction: string }> {
  const systemPrompt = `You are an AI assistant summarizing a job application email thread.
Provide a brief 1-2 sentence summary of the current situation.
Then provide a short 1 sentence suggested action for the user.
Return the result in exactly this JSON format:
{"summary": "...", "suggestedAction": "..."}
Do not include markdown blocks.`;

  const threadContent = thread.messages.map(m => `From: ${m.sender.name}\nBody: ${m.bodyText.substring(0, 1000)}`).join('\n\n');

  try {
    const res = await provider.rawCompletion(systemPrompt, threadContent);
    const cleanRes = res.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanRes);
  } catch (e) {
    console.error("Summary generation failed", e);
    return { summary: "Could not generate summary.", suggestedAction: "Review thread manually." };
  }
}

export async function generateReplies(provider: AIProvider, thread: JobThread): Promise<string[]> {
  const systemPrompt = `Generate 5 variations of a reply to this job-related email thread.
Styles: 1. Professional, 2. Friendly, 3. Formal, 4. Short, 5. Grateful.
Return ONLY a JSON array of strings containing the 5 variations in order. Do not include markdown blocks.`;

  const lastMessage = thread.messages[thread.messages.length - 1];
  const emailContent = `From: ${lastMessage?.sender.name}\nBody: ${lastMessage?.bodyText.substring(0, 1500)}`;

  try {
    const res = await provider.rawCompletion(systemPrompt, emailContent);
    const cleanRes = res.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanRes);
  } catch (e) {
    console.error("Reply generation failed", e);
    return ["Could not generate replies."];
  }
}
