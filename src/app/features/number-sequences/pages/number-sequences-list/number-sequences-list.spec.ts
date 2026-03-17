import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { NumberSequencesList } from './number-sequences-list';
import { NumberSequenceService } from '../../services/number-sequence.service';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';

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

describe('NumberSequencesList', () => {
  let component: NumberSequencesList;
  let fixture: ComponentFixture<NumberSequencesList>;
  let service: NumberSequenceService;
  let httpTesting: HttpTestingController;

  const apiBaseUrl = 'http://localhost:5000/api/v1';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberSequencesList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideTranslateService({ defaultLanguage: 'en' }),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    }).compileComponents();

    service = TestBed.inject(NumberSequenceService);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NumberSequencesList);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    // Flush the ngOnInit HTTP request
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/number-sequences`).flush([]);
    expect(component).toBeTruthy();
  });

  it('should show loading state', () => {
    service.setLoading(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('loading');

    // Flush pending request from ngOnInit
    httpTesting.expectOne(`${apiBaseUrl}/number-sequences`).flush([]);
  });

  it('should display grid when not loading and items are present', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/number-sequences`).flush([
      {
        numberSequenceId: 'ns-1',
        companyId: 'comp-1',
        documentType: 1,
        numberPattern: 'INV-{YYYY}-{####}',
        prefix: 'INV',
        currentValue: 42,
        startValue: 1,
        yearlyReset: true,
        isActive: true,
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('igx-grid')).toBeTruthy();
  });

  it('should call preview API and display result banner', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/number-sequences`).flush([
      {
        numberSequenceId: 'ns-1',
        companyId: 'comp-1',
        documentType: 1,
        numberPattern: 'INV-{YYYY}-{####}',
        prefix: 'INV',
        currentValue: 42,
        startValue: 1,
        yearlyReset: true,
        isActive: true,
      },
    ]);
    fixture.detectChanges();

    component['onPreview']({
      numberSequenceId: 'ns-1',
      companyId: 'comp-1',
      documentType: 1,
      numberPattern: 'INV-{YYYY}-{####}',
      prefix: 'INV',
      currentValue: 42,
      startValue: 1,
      yearlyReset: true,
      isActive: true,
    });

    const previewReq = httpTesting.expectOne(`${apiBaseUrl}/number-sequences/ns-1/preview`);
    expect(previewReq.request.method).toBe('GET');
    previewReq.flush({ previewNumber: 'INV-2026-0043' });

    expect(component['previewResult']()).toEqual({
      numberSequenceId: 'ns-1',
      prefix: 'INV',
      previewNumber: 'INV-2026-0043',
    });
    expect(component['previewLoading']()).toBe(false);
  });

  it('should dismiss preview result', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${apiBaseUrl}/number-sequences`).flush([]);

    component['previewResult'].set({
      numberSequenceId: 'ns-1',
      prefix: 'INV',
      previewNumber: 'INV-2026-0043',
    });
    expect(component['previewResult']()).toBeTruthy();

    component['dismissPreview']();
    expect(component['previewResult']()).toBeNull();
  });
});
