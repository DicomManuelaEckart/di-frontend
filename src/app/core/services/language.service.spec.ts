import { TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';

import { LanguageService, SupportedLanguage } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let translateService: TranslateService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideTranslateService()],
    });

    service = TestBed.inject(LanguageService);
    translateService = TestBed.inject(TranslateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default language "de"', () => {
    expect(service.currentLang()).toBe('de');
  });

  it('should expose supported languages', () => {
    expect(service.supportedLanguages).toEqual(['de', 'en']);
  });

  it('should switch language', () => {
    service.setLanguage('en');

    expect(service.currentLang()).toBe('en');
    expect(translateService.currentLang).toBe('en');
  });

  it('should persist language to localStorage', () => {
    service.setLanguage('en');

    expect(localStorage.getItem('app-language')).toBe('en');
  });

  it('should restore language from localStorage', () => {
    localStorage.setItem('app-language', 'en');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideTranslateService()],
    });

    const freshService = TestBed.inject(LanguageService);
    expect(freshService.currentLang()).toBe('en');
  });

  it('should fall back to default when stored language is invalid', () => {
    localStorage.setItem('app-language', 'fr');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideTranslateService()],
    });

    const freshService = TestBed.inject(LanguageService);
    expect(freshService.currentLang()).toBe('de');
  });

  it('should set default language on TranslateService', () => {
    expect(translateService.defaultLang).toBe('de');
  });

  it('should add supported languages to TranslateService', () => {
    expect(translateService.getLangs()).toEqual(['de', 'en']);
  });

  it('should update currentLang signal when switching', () => {
    const languages: SupportedLanguage[] = [];
    languages.push(service.currentLang());

    service.setLanguage('en');
    languages.push(service.currentLang());

    service.setLanguage('de');
    languages.push(service.currentLang());

    expect(languages).toEqual(['de', 'en', 'de']);
  });
});
