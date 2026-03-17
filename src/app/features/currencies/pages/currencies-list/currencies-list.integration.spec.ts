import { render, screen } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';

import { CurrenciesList } from './currencies-list';
import { CurrencyService } from '../../services/currency.service';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';

// jsdom does not provide ResizeObserver; supply a minimal stub for Infragistics grid
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {
      /* noop – test stub */
    }
    unobserve(): void {
      /* noop – test stub */
    }
    disconnect(): void {
      /* noop – test stub */
    }
  } as unknown as typeof globalThis.ResizeObserver;
}

describe('CurrenciesList (Integration)', () => {
  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const providers = [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideAnimations(),
    provideTranslateService({ defaultLanguage: 'en' }),
    { provide: API_BASE_URL, useValue: apiBaseUrl },
  ];

  it('should display heading', async () => {
    const { fixture } = await render(CurrenciesList, { providers });
    const httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne(`${apiBaseUrl}/currencies`).flush([]);
    fixture.detectChanges();

    expect(screen.getByRole('heading')).toBeTruthy();
    httpTesting.verify();
  });

  it('should display loading state', async () => {
    const { fixture } = await render(CurrenciesList, { providers });
    const httpTesting = TestBed.inject(HttpTestingController);
    const service = fixture.debugElement.injector.get(CurrencyService);

    service.setLoading(true);
    fixture.detectChanges();

    expect(screen.getByText(/loading/i)).toBeTruthy();

    httpTesting.expectOne(`${apiBaseUrl}/currencies`).flush([]);
    httpTesting.verify();
  });

  it('should display grid when items are loaded', async () => {
    const { fixture } = await render(CurrenciesList, { providers });
    const httpTesting = TestBed.inject(HttpTestingController);

    httpTesting.expectOne(`${apiBaseUrl}/currencies`).flush([
      {
        currencyId: 'cur-1',
        currencyCode: 'EUR',
        currencyName: 'Euro',
        currencyNameEN: 'Euro',
        symbol: '€',
        decimalDigits: 2,
        isActive: true,
      },
    ]);
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('igx-grid');
    expect(grid).toBeTruthy();
    httpTesting.verify();
  });
});
