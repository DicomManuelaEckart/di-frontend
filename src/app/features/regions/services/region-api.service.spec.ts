import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { RegionApiService } from './region-api.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { RegionListItem } from '../models/region.model';

describe('RegionApiService', () => {
  let service: RegionApiService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockItem: RegionListItem = {
    regionId: 'reg-1',
    regionCode: 'BY',
    regionName: 'Bayern',
    countryCodeAlpha2: 'DE',
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

    service = TestBed.inject(RegionApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET for a country without filter params', () => {
    service.getAll('DE').subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/countries/DE/regions`);
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call GET with isActive filter param', () => {
    service.getAll('DE', { isActive: true }).subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(
      (r) => r.url === `${apiBaseUrl}/countries/DE/regions` && r.params.get('isActive') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should use the correct country code in the URL', () => {
    service.getAll('AT').subscribe();

    const req = httpTesting.expectOne(`${apiBaseUrl}/countries/AT/regions`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
