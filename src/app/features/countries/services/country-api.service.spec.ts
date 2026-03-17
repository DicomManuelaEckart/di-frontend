import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CountryApiService } from './country-api.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { CountryListItem } from '../models/country.model';

describe('CountryApiService', () => {
  let service: CountryApiService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockItem: CountryListItem = {
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });

    service = TestBed.inject(CountryApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET without params when no filter params provided', () => {
    service.getAll().subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/countries`);
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call GET with isActive filter param', () => {
    service.getAll({ isActive: true }).subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(
      (r) => r.url === `${apiBaseUrl}/countries` && r.params.get('isActive') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call GET with search filter param', () => {
    service.getAll({ search: 'Germany' }).subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(
      (r) => r.url === `${apiBaseUrl}/countries` && r.params.get('search') === 'Germany',
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call PUT to activate a country', () => {
    service.activate('DE').subscribe();

    const req = httpTesting.expectOne(`${apiBaseUrl}/countries/DE/activate`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('should call PUT to deactivate a country', () => {
    service.deactivate('DE').subscribe();

    const req = httpTesting.expectOne(`${apiBaseUrl}/countries/DE/deactivate`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });
});
