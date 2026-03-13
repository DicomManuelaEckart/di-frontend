import { TestBed } from '@angular/core/testing';

import { ReferenceGrid } from './reference-grid';

describe('ReferenceGrid', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should have default page size of 10', () => {
    const component = TestBed.runInInjectionContext(() => new ReferenceGrid());
    expect(component.pageSize()).toBe(10);
  });

  it('should have auto-generate enabled by default', () => {
    const component = TestBed.runInInjectionContext(() => new ReferenceGrid());
    expect(component.autoGenerate()).toBe(true);
  });

  it('should have empty data by default', () => {
    const component = TestBed.runInInjectionContext(() => new ReferenceGrid());
    expect(component.data()).toEqual([]);
  });
});
