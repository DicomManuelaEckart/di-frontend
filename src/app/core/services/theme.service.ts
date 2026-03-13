import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'app-theme';
const DATA_ATTR = 'data-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly currentTheme = signal<Theme>(this.resolveInitialTheme());

  readonly theme = this.currentTheme.asReadonly();

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    this.persistTheme(theme);
  }

  toggleTheme(): void {
    const next: Theme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  private resolveInitialTheme(): Theme {
    const stored = this.readStoredTheme();
    if (stored) {
      this.applyTheme(stored);
      return stored;
    }
    return 'light';
  }

  private applyTheme(theme: Theme): void {
    if (theme === 'light') {
      this.document.documentElement.removeAttribute(DATA_ATTR);
    } else {
      this.document.documentElement.setAttribute(DATA_ATTR, theme);
    }
  }

  private persistTheme(theme: Theme): void {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage may be unavailable */
    }
  }

  private readStoredTheme(): Theme | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }
}
