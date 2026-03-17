import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { TaxRateApiService } from './tax-rate-api.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  TaxRateListItem,
  CreateTaxRateRequest,
  CreateTaxRateResponse,
  ResolveTaxRateResponse,
} from '../models/tax-rate.model';

describe('TaxRateApiService', () => {
  let service: TaxRateApiService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockItem: TaxRateListItem = {
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
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });

    service = TestBed.inject(TaxRateApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET without params when no filter provided', () => {
    service.getAll().subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/tax-rates`);
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call GET with filter params', () => {
    service.getAll({ countryCode: 'DE', isActive: true }).subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/tax-rates` &&
        r.params.get('countryCode') === 'DE' &&
        r.params.get('isActive') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call POST to create a tax rate', () => {
    const request: CreateTaxRateRequest = {
      taxRateName: 'Standard VAT',
      taxPercentage: 19,
      taxType: 1,
      countryCode: 'DE',
      regionCode: null,
      validFrom: '2024-01-01',
      validTo: null,
      ediTaxCode: 'S',
    };
    const mockResponse: CreateTaxRateResponse = { taxRateId: 'tr-new' };

    service.create(request).subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/tax-rates`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should call PUT to deactivate a tax rate', () => {
    service.deactivate('tr-1').subscribe();

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/tax-rates/tr-1/deactivate` &&
        r.params.get('hasOpenDocuments') === 'false',
    );
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });

  it('should call PUT to deactivate with hasOpenDocuments', () => {
    service.deactivate('tr-1', true).subscribe();

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/tax-rates/tr-1/deactivate` &&
        r.params.get('hasOpenDocuments') === 'true',
    );
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });

  it('should call GET to resolve a tax rate', () => {
    const mockResolve: ResolveTaxRateResponse = {
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
    };

    service.resolve('DE', 1, '2024-06-01').subscribe((response) => {
      expect(response).toEqual(mockResolve);
    });

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/tax-rates/resolve` &&
        r.params.get('countryCode') === 'DE' &&
        r.params.get('taxType') === '1' &&
        r.params.get('referenceDate') === '2024-06-01',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResolve);
  });
});
