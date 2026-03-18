import { TestBed } from '@angular/core/testing';

import { RegionService } from './region.service';
import { RegionListItem } from '../models/region.model';

describe('RegionService', () => {
  let service: RegionService;

  const mockItem: RegionListItem = {
    regionId: 'reg-1',
    regionCode: 'BY',
    regionName: 'Bayern',
    countryCodeAlpha2: 'DE',
    isActive: true,
  };

  const mockItem2: RegionListItem = {
    regionId: 'reg-2',
    regionCode: 'NW',
    regionName: 'Nordrhein-Westfalen',
    countryCodeAlpha2: 'DE',
    isActive: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegionService);
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

  it('should have selectedCountryCode null initially', () => {
    expect(service.selectedCountryCode()).toBeNull();
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

  it('should set selected country code', () => {
    service.setSelectedCountryCode('DE');
    expect(service.selectedCountryCode()).toBe('DE');
  });

  it('should clear selected country code', () => {
    service.setSelectedCountryCode('DE');
    service.setSelectedCountryCode(null);
    expect(service.selectedCountryCode()).toBeNull();
  });
});
