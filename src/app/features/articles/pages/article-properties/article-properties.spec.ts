import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ComponentRef } from '@angular/core';

import { ArticleProperties } from './article-properties';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import { ArticleResponse } from '../../models/article.model';

describe('ArticleProperties', () => {
  let component: ArticleProperties;
  let componentRef: ComponentRef<ArticleProperties>;
  let fixture: ComponentFixture<ArticleProperties>;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  const mockArticle: ArticleResponse = {
    articleId: 'a-1',
    articleNr: 'ART-001',
    gtin: null,
    articleName: 'Test Article',
    articleLongText: null,
    articleType: 0,
    supplierArticleNr: null,
    buyerArticleNr: null,
    brandName: null,
    modelDescription: null,
    receiptText: null,
    productGroupId: null,
    taxRateId: 'tr-1',
    articleStatus: 0,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: null,
    isEligibleForBonus: true,
    isReturnable: false,
    conditionBlock: false,
    neverOutOfStock: true,
    availableFrom: '2025-06-01T00:00:00Z',
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleProperties],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleProperties);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'a-1');
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1`).flush(mockArticle);
    expect(component).toBeTruthy();
  });

  it('should load article and patch form on init', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1`).flush(mockArticle);

    expect(component.form.value.isEligibleForBonus).toBe(true);
    expect(component.form.value.isReturnable).toBe(false);
    expect(component.form.value.neverOutOfStock).toBe(true);
    expect(component.form.value.colorCode).toBe('RED');
    expect(component.form.value.countryOfOrigin).toBe('DE');
    expect(component.form.value.minimumOrderQuantity).toBe(10);
    expect(component.form.value.lotFactor).toBe(5);
  });

  it('should have a valid form after loading', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1`).flush(mockArticle);

    expect(component.form.valid).toBe(true);
  });
});
