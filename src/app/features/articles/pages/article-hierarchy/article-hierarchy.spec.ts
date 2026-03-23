import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ComponentRef } from '@angular/core';

import { ArticleHierarchy } from './article-hierarchy';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import { ArticleHierarchyResponse } from '../../models/article.model';

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

describe('ArticleHierarchy', () => {
  let component: ArticleHierarchy;
  let componentRef: ComponentRef<ArticleHierarchy>;
  let fixture: ComponentFixture<ArticleHierarchy>;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleHierarchy],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleHierarchy);
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
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/hierarchy`).flush(mockHierarchies);
    expect(component).toBeTruthy();
  });

  it('should load hierarchies on init', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/hierarchy`).flush(mockHierarchies);

    expect(component['hierarchies']()).toEqual(mockHierarchies);
    expect(component['loading']()).toBe(false);
  });

  it('should show loading state initially', () => {
    fixture.detectChanges();
    expect(component['loading']()).toBe(true);
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/hierarchy`).flush(mockHierarchies);
  });

  it('should toggle create form', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/hierarchy`).flush(mockHierarchies);

    expect(component['showCreateForm']()).toBe(false);
    component['toggleCreateForm']();
    expect(component['showCreateForm']()).toBe(true);
    component['toggleCreateForm']();
    expect(component['showCreateForm']()).toBe(false);
  });

  it('should have required validators on create form', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/articles/a-1/hierarchy`).flush(mockHierarchies);

    expect(component.createForm.controls.childArticleId.errors).toHaveProperty('required');
  });
});
