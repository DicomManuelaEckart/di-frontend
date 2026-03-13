import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { BlueprintCustomerService } from './blueprint-customer.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { PagedResponse } from '../../../shared/models/pagination.model';
import { BlueprintCustomerListItem } from '../models/blueprint-customer.model';

describe('BlueprintCustomerService', () => {
  let service: BlueprintCustomerService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockCustomer: BlueprintCustomerListItem = {
    id: 'c1',
    name: 'Customer One',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const mockPagedResponse: PagedResponse<BlueprintCustomerListItem> = {
    data: [mockCustomer],
    pagination: {
      page: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });

    service = TestBed.inject(BlueprintCustomerService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET without params when no pagination params provided', () => {
    service.getAll().subscribe((response) => {
      expect(response).toEqual(mockPagedResponse);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/blueprint/customers`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPagedResponse);
  });

  it('should call GET with pagination params', () => {
    service.getAll({ page: 2, pageSize: 10 }).subscribe((response) => {
      expect(response).toEqual(mockPagedResponse);
    });

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/blueprint/customers` &&
        r.params.get('page') === '2' &&
        r.params.get('pageSize') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPagedResponse);
  });

  it('should call GET with sorting params', () => {
    service.getAll({ sortBy: 'name', sortOrder: 'desc' }).subscribe((response) => {
      expect(response).toEqual(mockPagedResponse);
    });

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/blueprint/customers` &&
        r.params.get('sortBy') === 'name' &&
        r.params.get('sortOrder') === 'desc',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPagedResponse);
  });

  it('should call GET with all params combined', () => {
    service
      .getAll({ page: 1, pageSize: 5, sortBy: 'createdAt', sortOrder: 'asc' })
      .subscribe((response) => {
        expect(response).toEqual(mockPagedResponse);
      });

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/blueprint/customers` &&
        r.params.get('page') === '1' &&
        r.params.get('pageSize') === '5' &&
        r.params.get('sortBy') === 'createdAt' &&
        r.params.get('sortOrder') === 'asc',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPagedResponse);
  });

  it('should call GET for a single customer by id', () => {
    service.getById('c1').subscribe((customer) => {
      expect(customer).toEqual(mockCustomer);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/blueprint/customers/c1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCustomer);
  });
});
