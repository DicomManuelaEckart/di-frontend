import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CurrencyApiService } from './currency-api.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { CurrencyListItem } from '../models/currency.model';

describe('CurrencyApiService', () => {
  let service: CurrencyApiService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockItem: CurrencyListItem = {
    currencyId: 'cur-1',
    currencyCode: 'EUR',
    currencyName: 'Euro',
    currencyNameEN: 'Euro',
    symbol: '€',
    decimalDigits: 2,
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

    service = TestBed.inject(CurrencyApiService);
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

    const req = httpTesting.expectOne(`${apiBaseUrl}/currencies`);
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call GET with isActive filter param', () => {
    service.getAll({ isActive: true }).subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(
      (r) => r.url === `${apiBaseUrl}/currencies` && r.params.get('isActive') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call PUT to activate a currency', () => {
    service.activate('cur-1').subscribe();

    const req = httpTesting.expectOne(`${apiBaseUrl}/currencies/cur-1/activate`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('should call PUT to deactivate a currency', () => {
    service.deactivate('cur-1').subscribe();

    const req = httpTesting.expectOne(`${apiBaseUrl}/currencies/cur-1/deactivate`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });
});
