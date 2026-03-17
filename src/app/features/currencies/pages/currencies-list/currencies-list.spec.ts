import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

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

describe('CurrenciesList', () => {
  let component: CurrenciesList;
  let fixture: ComponentFixture<CurrenciesList>;
  let service: CurrencyService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockEur = {
    currencyId: 'cur-1',
    currencyCode: 'EUR',
    currencyName: 'Euro',
    currencyNameEN: 'Euro',
    symbol: '€',
    decimalDigits: 2,
    isActive: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrenciesList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    service = TestBed.inject(CurrencyService);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CurrenciesList);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/currencies`).flush([]);
    expect(component).toBeTruthy();
  });

  it('should show loading state', () => {
    service.setLoading(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('loading');

    httpTesting.expectOne(`${apiBaseUrl}/currencies`).flush([]);
  });

  it('should display grid when not loading and items are present', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/currencies`).flush([mockEur]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('igx-grid')).toBeTruthy();
  });

  it('should call deactivate API when toggling an active currency', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/currencies`).flush([mockEur]);
    fixture.detectChanges();

    component['onToggleActive'](mockEur);

    const req = httpTesting.expectOne(`${apiBaseUrl}/currencies/cur-1/deactivate`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);

    expect(service.items()[0].isActive).toBe(false);
  });

  it('should call activate API when toggling an inactive currency', () => {
    const inactiveItem = { ...mockEur, isActive: false };
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/currencies`).flush([inactiveItem]);
    fixture.detectChanges();

    component['onToggleActive'](inactiveItem);

    const req = httpTesting.expectOne(`${apiBaseUrl}/currencies/cur-1/activate`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);

    expect(service.items()[0].isActive).toBe(true);
  });
});
