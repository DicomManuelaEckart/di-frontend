import { render, screen } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';

import { RegionsList } from './regions-list';
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

describe('RegionsList (Integration)', () => {
  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const providers = [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideAnimations(),
    provideTranslateService({ defaultLanguage: 'en' }),
    { provide: API_BASE_URL, useValue: apiBaseUrl },
  ];

  function flushCountries(httpTesting: HttpTestingController): void {
    httpTesting
      .expectOne((r) => r.url === `${apiBaseUrl}/countries` && r.params.get('isActive') === 'true')
      .flush([
        {
          countryId: 'cty-1',
          countryCodeAlpha2: 'DE',
          countryCodeAlpha3: 'DEU',
          countryCodeNumeric: '276',
          countryName: 'Deutschland',
          countryNameEN: 'Germany',
          phonePrefix: '+49',
          postalCodeFormat: '#####',
          isEuMember: true,
          isActive: true,
        },
      ]);
  }

  it('should display heading', async () => {
    const { fixture } = await render(RegionsList, { providers });
    const httpTesting = TestBed.inject(HttpTestingController);
    flushCountries(httpTesting);
    fixture.detectChanges();

    expect(screen.getByRole('heading')).toBeTruthy();
    httpTesting.verify();
  });

  it('should display country select after countries loaded', async () => {
    const { fixture } = await render(RegionsList, { providers });
    const httpTesting = TestBed.inject(HttpTestingController);
    flushCountries(httpTesting);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select');
    expect(select).toBeTruthy();
    httpTesting.verify();
  });

  it('should display grid when country is selected and regions are loaded', async () => {
    const { fixture } = await render(RegionsList, { providers });
    const httpTesting = TestBed.inject(HttpTestingController);
    flushCountries(httpTesting);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'DE';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    httpTesting.expectOne(`${apiBaseUrl}/countries/DE/regions`).flush([
      {
        regionId: 'reg-1',
        regionCode: 'BY',
        regionName: 'Bayern',
        countryCodeAlpha2: 'DE',
        isActive: true,
      },
    ]);
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('igx-grid');
    expect(grid).toBeTruthy();
    httpTesting.verify();
  });
});
