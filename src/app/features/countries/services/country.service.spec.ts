import { TestBed } from '@angular/core/testing';

import { CountryService } from './country.service';
import { CountryListItem } from '../models/country.model';

describe('CountryService', () => {
  let service: CountryService;

  const mockItem: CountryListItem = {
    countryId: 'cty-1',
    countryCodeAlpha2: 'DE',
    countryCodeAlpha3: 'DEU',
    countryCodeNumeric: '276',
    countryName: 'Deutschland',
    countryNameEN: 'Germany',
    phonePrefix: '+49',
    postalCodeFormat: '#####',
    isEuMember: true,
    isActive: true,
  };

  const mockItem2: CountryListItem = {
    countryId: 'cty-2',
    countryCodeAlpha2: 'US',
    countryCodeAlpha3: 'USA',
    countryCodeNumeric: '840',
    countryName: 'Vereinigte Staaten',
    countryNameEN: 'United States',
    phonePrefix: '+1',
    postalCodeFormat: '#####-####',
    isEuMember: false,
    isActive: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CountryService);
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

    service.updateItemActiveState('cty-1', false);

    const updatedItems = service.items();
    expect(updatedItems[0].isActive).toBe(false);
    expect(updatedItems[1].isActive).toBe(false); // unchanged
  });

  it('should activate an inactive item', () => {
    service.setItems([mockItem2]);

    service.updateItemActiveState('cty-2', true);

    expect(service.items()[0].isActive).toBe(true);
  });
});
