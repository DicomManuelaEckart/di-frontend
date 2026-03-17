import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { CountriesList } from './countries-list';
import { CountryService } from '../../services/country.service';
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

describe('CountriesList', () => {
  let component: CountriesList;
  let fixture: ComponentFixture<CountriesList>;
  let service: CountryService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockDE = {
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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountriesList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    service = TestBed.inject(CountryService);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CountriesList);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/countries`).flush([]);
    expect(component).toBeTruthy();
  });

  it('should show loading state', () => {
    service.setLoading(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('loading');

    httpTesting.expectOne(`${apiBaseUrl}/countries`).flush([]);
  });

  it('should display grid when not loading and items are present', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/countries`).flush([mockDE]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('igx-grid')).toBeTruthy();
  });

  it('should call deactivate API when toggling an active country', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/countries`).flush([mockDE]);
    fixture.detectChanges();

    component['onToggleActive'](mockDE);

    const req = httpTesting.expectOne(`${apiBaseUrl}/countries/DE/deactivate`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);

    expect(service.items()[0].isActive).toBe(false);
  });

  it('should call activate API when toggling an inactive country', () => {
    const inactiveItem = { ...mockDE, isActive: false };
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/countries`).flush([inactiveItem]);
    fixture.detectChanges();

    component['onToggleActive'](inactiveItem);

    const req = httpTesting.expectOne(`${apiBaseUrl}/countries/DE/activate`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);

    expect(service.items()[0].isActive).toBe(true);
  });
});
