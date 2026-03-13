import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService, provideMissingTranslationHandler } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { AppMissingTranslationHandler } from './core/services/missing-translation-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideTranslateService({
      defaultLanguage: 'de',
      fallbackLang: 'de',
      useDefaultLang: true,
      loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
      missingTranslationHandler: provideMissingTranslationHandler(AppMissingTranslationHandler),
    }),
  ],
};
