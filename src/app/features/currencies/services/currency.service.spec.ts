import { TestBed } from '@angular/core/testing';

import { CurrencyService } from './currency.service';
import { CurrencyListItem } from '../models/currency.model';

describe('CurrencyService', () => {
  let service: CurrencyService;

  const mockItem: CurrencyListItem = {
    currencyId: 'cur-1',
    currencyCode: 'EUR',
    currencyName: 'Euro',
    currencyNameEN: 'Euro',
    symbol: '€',
    decimalDigits: 2,
    isActive: true,
  };

  const mockItem2: CurrencyListItem = {
    currencyId: 'cur-2',
    currencyCode: 'USD',
    currencyName: 'US-Dollar',
    currencyNameEN: 'US Dollar',
    symbol: '$',
    decimalDigits: 2,
    isActive: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrencyService);
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

  it('should update item active state', () => {
    service.setItems([mockItem, mockItem2]);

    service.updateItemActiveState('cur-1', false);

    const updatedItems = service.items();
    expect(updatedItems[0].isActive).toBe(false);
    expect(updatedItems[1].isActive).toBe(false); // unchanged
  });

  it('should activate an inactive item', () => {
    service.setItems([mockItem2]);

    service.updateItemActiveState('cur-2', true);

    expect(service.items()[0].isActive).toBe(true);
  });
});
