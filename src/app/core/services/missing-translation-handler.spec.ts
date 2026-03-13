import { AppMissingTranslationHandler } from './missing-translation-handler';
import { MissingTranslationHandlerParams, TranslateService } from '@ngx-translate/core';

describe('AppMissingTranslationHandler', () => {
  let handler: AppMissingTranslationHandler;

  beforeEach(() => {
    handler = new AppMissingTranslationHandler();
  });

  it('should be created', () => {
    expect(handler).toBeTruthy();
  });

  it('should return the key as fallback', () => {
    const params = {
      key: 'missing.key',
      translateService: {} as TranslateService,
    } as MissingTranslationHandlerParams;

    const result = handler.handle(params);
    expect(result).toBe('missing.key');
  });

  it('should log warning in dev mode', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const params = {
      key: 'some.missing.key',
      translateService: {} as TranslateService,
    } as MissingTranslationHandlerParams;

    handler.handle(params);

    expect(warnSpy).toHaveBeenCalledWith('Missing translation for key: "some.missing.key"');
    warnSpy.mockRestore();
  });
});
