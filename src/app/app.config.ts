import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService, provideMissingTranslationHandler } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { AppMissingTranslationHandler } from './core/services/missing-translation-handler';
import { API_BASE_URL } from './core/tokens/api-base-url.token';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    provideAnimations(),
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    provideTranslateService({
      defaultLanguage: 'de',
      fallbackLang: 'de',
      useDefaultLang: true,
      loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
      missingTranslationHandler: provideMissingTranslationHandler(AppMissingTranslationHandler),
    }),
  ],
};
