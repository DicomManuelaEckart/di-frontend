import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ArticlesList } from './articles-list';
import { ArticleService } from '../../services/article.service';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import { PagedArticleResponse, ArticleStatus } from '../../models/article.model';

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

describe('ArticlesList', () => {
  let component: ArticlesList;
  let fixture: ComponentFixture<ArticlesList>;
  let service: ArticleService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockPagedResponse: PagedArticleResponse = {
    data: [
      {
        articleId: 'a-1',
        articleNr: 'ART-001',
        gtin: '4006381333931',
        articleName: 'Test Article',
        articleLongText: null,
        articleType: 0,
        supplierArticleNr: null,
        buyerArticleNr: null,
        brandName: 'TestBrand',
        modelDescription: null,
        receiptText: null,
        productGroupId: null,
        taxRateId: 'tr-1',
        articleStatus: ArticleStatus.Active,
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
      },
    ],
    pagination: {
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticlesList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    service = TestBed.inject(ArticleService);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ArticlesList);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles`).flush(mockPagedResponse);
    expect(component).toBeTruthy();
  });

  it('should show loading state', () => {
    service.setLoading(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('loading');

    httpTesting.expectOne(`${apiBaseUrl}/articles`).flush(mockPagedResponse);
  });

  it('should display grid when not loading and items are present', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles`).flush(mockPagedResponse);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const grid = compiled.querySelector('igx-grid');
    expect(grid).toBeTruthy();
  });
});
