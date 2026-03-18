import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { RegionsList } from './regions-list';
import { RegionService } from '../../services/region.service';
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

describe('RegionsList', () => {
  let component: RegionsList;
  let fixture: ComponentFixture<RegionsList>;
  let service: RegionService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockCountry = {
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

  const mockRegion = {
    regionId: 'reg-1',
    regionCode: 'BY',
    regionName: 'Bayern',
    countryCodeAlpha2: 'DE',
    isActive: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegionsList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    service = TestBed.inject(RegionService);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegionsList);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  function flushCountries(countries = [mockCountry]): void {
    const req = httpTesting.expectOne(
      (r) => r.url === `${apiBaseUrl}/countries` && r.params.get('isActive') === 'true',
    );
    req.flush(countries);
  }

  it('should create', () => {
    fixture.detectChanges();
    flushCountries();
    expect(component).toBeTruthy();
  });

  it('should load countries on init', () => {
    fixture.detectChanges();
    flushCountries();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2); // placeholder + 1 country
  });

  it('should not show grid before country is selected', () => {
    fixture.detectChanges();
    flushCountries();
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('igx-grid');
    expect(grid).toBeNull();
  });

  it('should load regions when country is selected', () => {
    fixture.detectChanges();
    flushCountries();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'DE';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpTesting.expectOne(`${apiBaseUrl}/countries/DE/regions`);
    expect(req.request.method).toBe('GET');
    req.flush([mockRegion]);
    fixture.detectChanges();

    expect(service.items()).toEqual([mockRegion]);
    const grid = fixture.nativeElement.querySelector('igx-grid');
    expect(grid).toBeTruthy();
  });

  it('should clear regions when empty option is selected', () => {
    fixture.detectChanges();
    flushCountries();
    fixture.detectChanges();

    // First select a country
    service.setSelectedCountryCode('DE');
    service.setItems([mockRegion]);

    // Then clear selection
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(service.selectedCountryCode()).toBeNull();
    expect(service.items()).toEqual([]);
  });
});
