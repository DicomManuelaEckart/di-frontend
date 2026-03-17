import { TestBed } from '@angular/core/testing';

import { NumberSequenceService } from './number-sequence.service';
import { NumberSequenceListItem } from '../models/number-sequence.model';

describe('NumberSequenceService', () => {
  let service: NumberSequenceService;

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

  const mockItem2: NumberSequenceListItem = {
    numberSequenceId: 'ns-2',
    companyId: 'comp-1',
    documentType: 2,
    numberPattern: 'ORD-{YYYY}-{####}',
    prefix: 'ORD',
    currentValue: 10,
    startValue: 1,
    yearlyReset: false,
    isActive: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NumberSequenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty items initially', () => {
    expect(service.items()).toEqual([]);
  });

  it('should have loading false initially', () => {
    expect(service.loading()).toBe(false);
  });

  it('should have itemCount 0 initially', () => {
    expect(service.itemCount()).toBe(0);
  });

  it('should have hasItems false initially', () => {
    expect(service.hasItems()).toBe(false);
  });

  it('should set items', () => {
    service.setItems([mockItem]);

    expect(service.items()).toEqual([mockItem]);
    expect(service.itemCount()).toBe(1);
    expect(service.hasItems()).toBe(true);
  });

  it('should replace items when setItems is called again', () => {
    service.setItems([mockItem]);
    service.setItems([mockItem, mockItem2]);

    expect(service.items()).toEqual([mockItem, mockItem2]);
    expect(service.itemCount()).toBe(2);
  });

  it('should set loading state', () => {
    service.setLoading(true);
    expect(service.loading()).toBe(true);

    service.setLoading(false);
    expect(service.loading()).toBe(false);
  });
});
