import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { NumberSequenceApiService } from './number-sequence-api.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  NumberSequenceListItem,
  CreateNumberSequenceRequest,
  CreateNumberSequenceResponse,
  AllocateNextNumberResponse,
  PreviewNextNumberResponse,
} from '../models/number-sequence.model';

describe('NumberSequenceApiService', () => {
  let service: NumberSequenceApiService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockItem: NumberSequenceListItem = {
    numberSequenceId: 'ns-1',
    companyId: 'comp-1',
    documentType: 1,
    numberPattern: 'INV-{YYYY}-{####}',
    prefix: 'INV',
    currentValue: 42,
    startValue: 1,
    yearlyReset: true,
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

    service = TestBed.inject(NumberSequenceApiService);
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

    const req = httpTesting.expectOne(`${apiBaseUrl}/number-sequences`);
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call GET with filter params', () => {
    service.getAll({ documentType: 1, isActive: true }).subscribe((response) => {
      expect(response).toEqual([mockItem]);
    });

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/number-sequences` &&
        r.params.get('documentType') === '1' &&
        r.params.get('isActive') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should call POST to create a number sequence', () => {
    const request: CreateNumberSequenceRequest = {
      documentType: 1,
      numberPattern: 'INV-{YYYY}-{####}',
      prefix: 'INV',
      startValue: 1,
      yearlyReset: true,
    };
    const response: CreateNumberSequenceResponse = { numberSequenceId: 'ns-new' };

    service.create(request).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/number-sequences`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(response);
  });

  it('should call POST to allocate next number', () => {
    const response: AllocateNextNumberResponse = { formattedNumber: 'INV-2026-0043' };

    service.allocate('ns-1').subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/number-sequences/ns-1/allocate`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
  });

  it('should call GET to preview next number', () => {
    const response: PreviewNextNumberResponse = { previewNumber: 'INV-2026-0043' };

    service.preview('ns-1').subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/number-sequences/ns-1/preview`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });
});
