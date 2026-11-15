import type { ProjectDoc } from './studio-types';

/**
 * Puerto de almacenamiento. La demo usa almacenamiento local y NO toca el Worker de WAYUP.
 * La implementación real debe adaptar el HTML y el control de versión del API de Cloudflare.
 */
export interface StudioRepository {
  getProject(id: string): Promise<ProjectDoc>;
  saveProject(doc: ProjectDoc, expectedVersion: number): Promise<{ version: number }>;
}

export const STORAGE_KEY = 'wayup-studio-next-demo-v1';

export function loadLocalDemo(fallback: ProjectDoc): ProjectDoc {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const doc: unknown = JSON.parse(raw);
    if (!doc || typeof doc !== 'object') return fallback;
    const candidate = doc as Partial<ProjectDoc>;
    return candidate.id === fallback.id && candidate.elements && candidate.sections ? candidate as ProjectDoc : fallback;
  } catch { return fallback; }
}

export function persistLocalDemo(doc: ProjectDoc) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
}