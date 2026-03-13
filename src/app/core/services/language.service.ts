import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const LANGUAGE_STORAGE_KEY = 'app-language';
const DEFAULT_LANGUAGE = 'de';
const SUPPORTED_LANGUAGES = ['de', 'en'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly supportedLanguages: readonly SupportedLanguage[] = SUPPORTED_LANGUAGES;
  readonly currentLang = signal<SupportedLanguage>(DEFAULT_LANGUAGE);

  constructor() {
    this.translate.addLangs([...SUPPORTED_LANGUAGES]);
    this.translate.setDefaultLang(DEFAULT_LANGUAGE);

    const stored = this.getStoredLanguage();
    this.applyLanguage(stored);
  }

  setLanguage(lang: SupportedLanguage): void {
    this.applyLanguage(lang);
    this.storeLanguage(lang);
  }

  private applyLanguage(lang: SupportedLanguage): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
  }

  private getStoredLanguage(): SupportedLanguage {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return this.isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  }

  private storeLanguage(lang: SupportedLanguage): void {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }

  private isSupportedLanguage(lang: string | null): lang is SupportedLanguage {
    return lang !== null && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
  }
}
