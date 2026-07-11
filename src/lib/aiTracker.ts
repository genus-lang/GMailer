/**
 * AI Usage Tracker
 * Tracks tokens used, cost estimates, provider, latency, and errors.
 */

export interface AIUsageEntry {
  id: string;
  timestamp: string;
  provider: string;
  operation: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  cost?: number; // USD estimate
  success: boolean;
  error?: string;
}

// Approximate cost per 1M tokens (input/output averaged)
const COST_PER_MILLION_TOKENS: Record<string, number> = {
  Groq: 0.05,     // Groq is very cheap
  Gemini: 0.075,
  OpenAI: 2.5,
  Claude: 3.0,
  Mistral: 0.25,
};

function estimateCost(provider: string, tokens: number): number {
  const rate = COST_PER_MILLION_TOKENS[provider] || 1.0;
  return (tokens / 1_000_000) * rate;
}

async function getUsageHistory(): Promise<AIUsageEntry[]> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['ai_usage_history'], (res) => {
        resolve(res.ai_usage_history || []);
      });
    } else {
      resolve([]);
    }
  });
}

export async function trackAIUsage(
  provider: string,
  operation: string,
  latencyMs: number,
  success: boolean,
  tokens?: number,
  error?: string
): Promise<void> {
  const entry: AIUsageEntry = {
    id: `ai_${Date.now()}`,
    timestamp: new Date().toISOString(),
    provider,
    operation,
    latencyMs,
    success,
    totalTokens: tokens,
    cost: tokens ? estimateCost(provider, tokens) : undefined,
    error,
  };

  const history = await getUsageHistory();
  const updated = [entry, ...history].slice(0, 200); // Keep last 200 calls
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ ai_usage_history: updated });
  }
}

export async function getAIStats(): Promise<{
  totalCalls: number;
  successRate: number;
  totalTokens: number;
  estimatedCost: number;
  avgLatencyMs: number;
  byProvider: Record<string, number>;
}> {
  const history = await getUsageHistory();
  if (history.length === 0) {
    return { totalCalls: 0, successRate: 0, totalTokens: 0, estimatedCost: 0, avgLatencyMs: 0, byProvider: {} };
  }

  const totalCalls = history.length;
  const successes = history.filter(e => e.success).length;
  const totalTokens = history.reduce((sum, e) => sum + (e.totalTokens || 0), 0);
  const estimatedCost = history.reduce((sum, e) => sum + (e.cost || 0), 0);
  const avgLatencyMs = Math.round(history.reduce((sum, e) => sum + e.latencyMs, 0) / totalCalls);
  const byProvider: Record<string, number> = {};
  history.forEach(e => { byProvider[e.provider] = (byProvider[e.provider] || 0) + 1; });

  return {
    totalCalls,
    successRate: Math.round((successes / totalCalls) * 100),
    totalTokens,
    estimatedCost: parseFloat(estimatedCost.toFixed(4)),
    avgLatencyMs,
    byProvider,
  };
}
