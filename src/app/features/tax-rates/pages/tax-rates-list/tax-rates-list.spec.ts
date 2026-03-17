import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { TaxRatesList } from './tax-rates-list';
import { TaxRateService } from '../../services/tax-rate.service';
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

describe('TaxRatesList', () => {
  let component: TaxRatesList;
  let fixture: ComponentFixture<TaxRatesList>;
  let service: TaxRateService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxRatesList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    service = TestBed.inject(TaxRateService);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TaxRatesList);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/tax-rates`).flush([]);
    expect(component).toBeTruthy();
  });

  it('should show loading state', () => {
    service.setLoading(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('loading');

    httpTesting.expectOne(`${apiBaseUrl}/tax-rates`).flush([]);
  });

  it('should display grid when not loading and items are present', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/tax-rates`).flush([
      {
        taxRateId: 'tr-1',
        name: 'Standard VAT',
        percentage: 19,
        taxType: 1,
        countryCode: 'DE',
        regionCode: null,
        validFrom: '2024-01-01',
        validTo: null,
        ediTaxCode: 'S',
        isActive: true,
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const grid = compiled.querySelector('igx-grid');
    expect(grid).toBeTruthy();
  });
});
