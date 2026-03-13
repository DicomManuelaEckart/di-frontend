import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ReferenceGrid } from './reference-grid';

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

describe('ReferenceGrid', () => {
  let component: ReferenceGrid;
  let fixture: ComponentFixture<ReferenceGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferenceGrid],
      providers: [provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ReferenceGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default empty data', () => {
    expect(component.data()).toEqual([]);
  });

  it('should have default empty columns', () => {
    expect(component.columns()).toEqual([]);
  });

  it('should have default page size of 15', () => {
    expect(component.pageSize()).toBe(15);
  });

  it('should have default primary key of id', () => {
    expect(component.primaryKey()).toBe('id');
  });
});
