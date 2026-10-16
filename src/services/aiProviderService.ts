import { AIProviderId, AIProviderStatus, AIEngineConfig, FailoverIncident } from '../types';

export interface ProvidersStatusResponse {
  config: AIEngineConfig;
  providers: AIProviderStatus[];
  activeFailover: FailoverIncident | null;
  failoverHistory: FailoverIncident[];
}

export interface TestProviderResponse {
  success: boolean;
  provider: AIProviderId;
  latencyMs: number;
  reply?: string;
  error?: string;
}

export async function fetchAIProvidersStatus(): Promise<ProvidersStatusResponse> {
  const res = await fetch('/api/ai-providers/status');
  if (!res.ok) {
    throw new Error(`تعذر جلب حالة محركات الذكاء الاصطناعي (${res.status})`);
  }
  return res.json();
}

export async function testAIProvider(
  provider: AIProviderId,
  model?: string
): Promise<TestProviderResponse> {
  const res = await fetch('/api/ai-providers/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model }),
  });
  return res.json();
}

export async function saveAIEngineConfig(
  config: Partial<AIEngineConfig>
): Promise<{ success: boolean; config: AIEngineConfig; message: string }> {
  const res = await fetch('/api/ai-providers/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    throw new Error(`تعذر حفظ إعدادات المحرك (${res.status})`);
  }
  return res.json();
}

export async function resolveFailoverIncident(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/ai-providers/resolve-failover', {
    method: 'POST',
  });
  return res.json();
}

export async function simulateFailover(params?: {
  originalProvider?: AIProviderId;
  fallbackProvider?: AIProviderId;
  reason?: string;
}): Promise<{ success: boolean; message: string; activeFailover: FailoverIncident }> {
  const res = await fetch('/api/ai-providers/simulate-failover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}

