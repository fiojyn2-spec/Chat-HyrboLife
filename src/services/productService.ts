import { Product, PersuasionPrompt, ForbiddenRule, AppLogoConfig, WelcomeSettings, PWASettings, AppSettings } from '../types';

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function saveProducts(products: Product[]): Promise<void> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products),
  });
  if (!res.ok) throw new Error('Failed to save products');
}

export async function fetchPrompts(): Promise<PersuasionPrompt[]> {
  const res = await fetch('/api/prompts');
  if (!res.ok) throw new Error('Failed to fetch prompts');
  return res.json();
}

export async function savePrompts(prompts: PersuasionPrompt[]): Promise<void> {
  const res = await fetch('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompts),
  });
  if (!res.ok) throw new Error('Failed to save prompts');
}

export async function fetchForbiddenRule(): Promise<ForbiddenRule> {
  const res = await fetch('/api/forbidden');
  if (!res.ok) throw new Error('Failed to fetch forbidden rules');
  return res.json();
}

export async function saveForbiddenRule(rule: ForbiddenRule): Promise<void> {
  const res = await fetch('/api/forbidden', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw new Error('Failed to save forbidden rules');
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
}

export interface TrashData {
  products: Product[];
  docs: (any & { productName: string; productId: string })[];
  prompts: PersuasionPrompt[];
}

export async function fetchTrash(): Promise<TrashData> {
  const res = await fetch('/api/trash');
  if (!res.ok) throw new Error('Failed to fetch trash');
  return res.json();
}

export async function restoreItem(type: 'product' | 'doc' | 'prompt', id: string, productId?: string): Promise<void> {
  const res = await fetch('/api/trash/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, id, productId }),
  });
  if (!res.ok) throw new Error('Failed to restore item');
}

export async function permanentDeleteItem(type: 'product' | 'doc' | 'prompt', id: string, productId?: string): Promise<void> {
  const res = await fetch('/api/trash/permanent-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, id, productId }),
  });
  if (!res.ok) throw new Error('Failed to permanently delete item');
}

export async function enableProvider(provider: string): Promise<void> {
  const res = await fetch('/api/ai-providers/enable-provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });
  if (!res.ok) throw new Error('Failed to enable provider');
}
