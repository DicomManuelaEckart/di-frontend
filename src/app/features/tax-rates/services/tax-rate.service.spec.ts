import { TaxRateService } from './tax-rate.service';

describe('TaxRateService', () => {
  let service: TaxRateService;

  beforeEach(() => {
    service = new TaxRateService();
  });

  it('should be created with empty items', () => {
    expect(service.items()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.itemCount()).toBe(0);
    expect(service.hasItems()).toBe(false);
  });

  it('should set items', () => {
    const items = [
      {
        taxRateId: 'tr-1',
        name: 'Standard VAT',
        percentage: 19,
        taxType: 1,
        countryCode: 'DE',
        regionCode: null,
        validFrom: '2024-01-01',
        validTo: null,
        ediTaxCode: 'S',
        isActive: true,
      },
    ];

    service.setItems(items);

    expect(service.items()).toEqual(items);
    expect(service.itemCount()).toBe(1);
    expect(service.hasItems()).toBe(true);
  });

  it('should set loading state', () => {
    service.setLoading(true);
    expect(service.loading()).toBe(true);

    service.setLoading(false);
    expect(service.loading()).toBe(false);
  });

  it('should deactivate an item by id', () => {
    service.setItems([
      {
        taxRateId: 'tr-1',
        name: 'Standard VAT',
        percentage: 19,
        taxType: 1,
        countryCode: 'DE',
        regionCode: null,
        validFrom: '2024-01-01',
        validTo: null,
        ediTaxCode: 'S',
        isActive: true,
      },
      {
        taxRateId: 'tr-2',
        name: 'Reduced VAT',
        percentage: 7,
        taxType: 2,
        countryCode: 'DE',
        regionCode: null,
        validFrom: '2024-01-01',
        validTo: null,
        ediTaxCode: 'R',
        isActive: true,
      },
    ]);

    service.deactivateItem('tr-1');

    expect(service.items()[0].isActive).toBe(false);
    expect(service.items()[1].isActive).toBe(true);
  });

  it('should not affect items when deactivating non-existent id', () => {
    service.setItems([
      {
        taxRateId: 'tr-1',
        name: 'Standard VAT',
        percentage: 19,
        taxType: 1,
        countryCode: 'DE',
        regionCode: null,
        validFrom: '2024-01-01',
        validTo: null,
        ediTaxCode: 'S',
        isActive: true,
      },
    ]);

    service.deactivateItem('non-existent');

    expect(service.items()[0].isActive).toBe(true);
  });
});
