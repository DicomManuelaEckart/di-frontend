import { ArticleService } from './article.service';
import { ArticleResponse, ArticleStatus } from '../models/article.model';

describe('ArticleService', () => {
  let service: ArticleService;

  const mockArticle: ArticleResponse = {
    articleId: 'a-1',
    articleNr: 'ART-001',
    gtin: '4006381333931',
    articleName: 'Test Article',
    articleLongText: null,
    articleType: 0,
    supplierArticleNr: null,
    buyerArticleNr: null,
    brandName: 'TestBrand',
    modelDescription: null,
    receiptText: null,
    productGroupId: null,
    taxRateId: 'tr-1',
    articleStatus: ArticleStatus.Active,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: null,
    isEligibleForBonus: false,
    isReturnable: true,
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
    netWeight: null,
    grossWeight: null,
    weightUnit: null,
    height: null,
    width: null,
    length: null,
    dimensionUnit: null,
    layersPerPallet: null,
    unitsPerLayer: null,
    cartonsPerPallet: null,
  };

  beforeEach(() => {
    service = new ArticleService();
  });

  it('should be created with empty items', () => {
    expect(service.items()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.itemCount()).toBe(0);
    expect(service.hasItems()).toBe(false);
  });

  it('should set items', () => {
    service.setItems([mockArticle]);

    expect(service.items()).toEqual([mockArticle]);
    expect(service.hasItems()).toBe(true);
  });

  it('should set pagination', () => {
    const pagination = {
      page: 2,
      pageSize: 25,
      totalCount: 50,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    };

    service.setPagination(pagination);

    expect(service.pagination()).toEqual(pagination);
    expect(service.itemCount()).toBe(50);
  });

  it('should set loading state', () => {
    service.setLoading(true);
    expect(service.loading()).toBe(true);

    service.setLoading(false);
    expect(service.loading()).toBe(false);
  });

  it('should deactivate an item by id', () => {
    const secondArticle: ArticleResponse = {
      ...mockArticle,
      articleId: 'a-2',
      articleNr: 'ART-002',
    };
    service.setItems([mockArticle, secondArticle]);

    service.deactivateItem('a-1');

    const items = service.items();
    expect(items[0].articleStatus).toBe(ArticleStatus.Inactive);
    expect(items[1].articleStatus).toBe(ArticleStatus.Active);
  });

  it('should reactivate an item by id', () => {
    const inactiveArticle: ArticleResponse = {
      ...mockArticle,
      articleStatus: ArticleStatus.Inactive,
    };
    service.setItems([inactiveArticle]);

    service.reactivateItem('a-1');

    expect(service.items()[0].articleStatus).toBe(ArticleStatus.Active);
  });

  it('should not modify other items when deactivating', () => {
    service.setItems([mockArticle]);

    service.deactivateItem('non-existent-id');

    expect(service.items()[0].articleStatus).toBe(ArticleStatus.Active);
  });
});
