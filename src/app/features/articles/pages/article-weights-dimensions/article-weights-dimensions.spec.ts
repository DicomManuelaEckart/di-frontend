import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ComponentRef } from '@angular/core';

import { ArticleWeightsDimensions } from './article-weights-dimensions';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import { ArticleResponse } from '../../models/article.model';

describe('ArticleWeightsDimensions', () => {
  let component: ArticleWeightsDimensions;
  let componentRef: ComponentRef<ArticleWeightsDimensions>;
  let fixture: ComponentFixture<ArticleWeightsDimensions>;
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
    isEligibleForBonus: false,
    isReturnable: false,
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleWeightsDimensions],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleWeightsDimensions);
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

    expect(component.form.value.netWeight).toBe(1.5);
    expect(component.form.value.grossWeight).toBe(2.0);
    expect(component.form.value.weightUnit).toBe('kg');
    expect(component.form.value.height).toBe(10);
    expect(component.form.value.width).toBe(20);
    expect(component.form.value.length).toBe(30);
    expect(component.form.value.dimensionUnit).toBe('cm');
    expect(component.form.value.layersPerPallet).toBe(5);
    expect(component.form.value.unitsPerLayer).toBe(10);
    expect(component.form.value.cartonsPerPallet).toBe(50);
  });

  it('should have a valid form after loading', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1`).flush(mockArticle);

    expect(component.form.valid).toBe(true);
  });
});
