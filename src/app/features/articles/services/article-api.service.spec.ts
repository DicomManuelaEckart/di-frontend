import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ArticleApiService } from './article-api.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  ArticleHierarchyResponse,
  ArticleResponse,
  CreateArticleHierarchyRequest,
  CreateArticleRequest,
  DiscontinueArticleRequest,
  DiscontinueArticleResponse,
  PagedArticleResponse,
  UpdateArticlePropertiesRequest,
  UpdateWeightsDimensionsRequest,
} from '../models/article.model';

describe('ArticleApiService', () => {
  let service: ArticleApiService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockArticle: ArticleResponse = {
    articleId: 'a-1',
    articleNr: 'ART-001',
    gtin: '4006381333931',
    articleName: 'Test Article',
    articleLongText: 'A test article for unit tests',
    articleType: 0,
    supplierArticleNr: 'SUP-001',
    buyerArticleNr: null,
    brandName: 'TestBrand',
    modelDescription: null,
    receiptText: null,
    productGroupId: null,
    taxRateId: 'tr-1',
    articleStatus: 0,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: null,
    isEligibleForBonus: false,
    isReturnable: true,
    conditionBlock: false,
    neverOutOfStock: false,
    availableFrom: null,
    earliestSaleDate: null,
    colorCode: null,
    colorName: null,
    sizeCode: null,
    sizeName: null,
    seasonCode: null,
    countryOfOrigin: null,
    minimumOrderQuantity: null,
    lotFactor: null,
    successorArticleId: null,
    predecessorArticleId: null,
    netWeight: null,
    grossWeight: null,
    weightUnit: null,
    height: null,
    width: null,
    length: null,
    dimensionUnit: null,
    layersPerPallet: null,
    unitsPerLayer: null,
    cartonsPerPallet: null,
  };

  const mockPagedResponse: PagedArticleResponse = {
    data: [mockArticle],
    pagination: {
      page: 1,
      pageSize: 25,
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

    service = TestBed.inject(ArticleApiService);
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
      expect(response).toEqual(mockPagedResponse);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPagedResponse);
  });

  it('should call GET with filter params', () => {
    service.getAll({ searchTerm: 'test', page: 2 }).subscribe((response) => {
      expect(response).toEqual(mockPagedResponse);
    });

    const req = httpTesting.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/articles` &&
        r.params.get('searchTerm') === 'test' &&
        r.params.get('page') === '2',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPagedResponse);
  });

  it('should call GET by id', () => {
    service.getById('a-1').subscribe((response) => {
      expect(response).toEqual(mockArticle);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockArticle);
  });

  it('should call POST to create', () => {
    const request: CreateArticleRequest = {
      articleNr: 'ART-002',
      gtin: null,
      articleName: 'New Article',
      articleLongText: null,
      articleType: 0,
      supplierArticleNr: null,
      buyerArticleNr: null,
      brandName: null,
      modelDescription: null,
      receiptText: null,
      productGroupId: null,
      taxRateId: 'tr-1',
    };

    service.create(request).subscribe((response) => {
      expect(response).toEqual(mockArticle);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockArticle);
  });

  it('should call PUT to update', () => {
    const request = {
      articleName: 'Updated Article',
      articleLongText: null,
      articleType: 0,
      supplierArticleNr: null,
      buyerArticleNr: null,
      brandName: null,
      modelDescription: null,
      receiptText: null,
      productGroupId: null,
      taxRateId: 'tr-1',
    };

    service.update('a-1', request).subscribe((response) => {
      expect(response).toEqual(mockArticle);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(mockArticle);
  });

  it('should call POST to deactivate', () => {
    service.deactivate('a-1').subscribe();

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/deactivate`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('should call POST to reactivate', () => {
    service.reactivate('a-1').subscribe();

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/reactivate`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('should call GET by GTIN', () => {
    service.getByGtin('4006381333931').subscribe((response) => {
      expect(response).toEqual(mockArticle);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/by-gtin/4006381333931`);
    expect(req.request.method).toBe('GET');
    req.flush(mockArticle);
  });

  it('should call PUT to update properties', () => {
    const request: UpdateArticlePropertiesRequest = {
      isEligibleForBonus: true,
      isReturnable: true,
      conditionBlock: false,
      neverOutOfStock: false,
      availableFrom: null,
      earliestSaleDate: null,
      colorCode: 'RED',
      colorName: 'Red',
      sizeCode: null,
      sizeName: null,
      seasonCode: null,
      countryOfOrigin: 'DE',
      minimumOrderQuantity: 10,
      lotFactor: 5,
      successorArticleId: null,
      predecessorArticleId: null,
    };

    service.updateProperties('a-1', request).subscribe((response) => {
      expect(response).toEqual(mockArticle);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/properties`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(mockArticle);
  });

  it('should call PUT to update weights and dimensions', () => {
    const request: UpdateWeightsDimensionsRequest = {
      netWeight: 1.5,
      grossWeight: 2.0,
      weightUnit: 'kg',
      height: 10,
      width: 20,
      length: 30,
      dimensionUnit: 'cm',
      layersPerPallet: 5,
      unitsPerLayer: 10,
      cartonsPerPallet: 50,
    };

    service.updateWeightsDimensions('a-1', request).subscribe((response) => {
      expect(response).toEqual(mockArticle);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/weights-dimensions`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(mockArticle);
  });

  it('should call POST to discontinue', () => {
    const request: DiscontinueArticleRequest = {
      successorArticleId: null,
    };
    const mockResponse: DiscontinueArticleResponse = {
      articleId: 'a-1',
      missingSuccessorWarning: true,
    };

    service.discontinue('a-1', request).subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/discontinue`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should call GET to fetch hierarchies', () => {
    const mockHierarchies: ArticleHierarchyResponse[] = [
      {
        hierarchyId: 'h-1',
        parentArticleId: 'a-1',
        childArticleId: 'a-2',
        containedQuantity: 10,
        isMainUnit: true,
        isSubUnit: false,
        isOrderUnit: true,
        isDeliveryUnit: false,
        isConsumerUnit: true,
        isSmallestUnit: false,
        createdAt: '2025-06-01T00:00:00Z',
      },
    ];

    service.getHierarchies('a-1').subscribe((response) => {
      expect(response).toEqual(mockHierarchies);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/hierarchy`);
    expect(req.request.method).toBe('GET');
    req.flush(mockHierarchies);
  });

  it('should call POST to create hierarchy', () => {
    const request: CreateArticleHierarchyRequest = {
      childArticleId: 'a-2',
      containedQuantity: 10,
      isMainUnit: true,
      isSubUnit: false,
      isOrderUnit: true,
      isDeliveryUnit: false,
      isConsumerUnit: true,
      isSmallestUnit: false,
    };
    const mockHierarchy: ArticleHierarchyResponse = {
      hierarchyId: 'h-1',
      parentArticleId: 'a-1',
      childArticleId: 'a-2',
      containedQuantity: 10,
      isMainUnit: true,
      isSubUnit: false,
      isOrderUnit: true,
      isDeliveryUnit: false,
      isConsumerUnit: true,
      isSmallestUnit: false,
      createdAt: '2025-06-01T00:00:00Z',
    };

    service.createHierarchy('a-1', request).subscribe((response) => {
      expect(response).toEqual(mockHierarchy);
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/hierarchy`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockHierarchy);
  });

  it('should call DELETE to remove hierarchy', () => {
    service.deleteHierarchy('a-1', 'h-1').subscribe();

    const req = httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/hierarchy/h-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
