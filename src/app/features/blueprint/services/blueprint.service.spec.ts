import { TestBed } from '@angular/core/testing';

import { BlueprintService } from './blueprint.service';

describe('BlueprintService', () => {
  let service: BlueprintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlueprintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty articles initially', () => {
    expect(service.getArticles()).toEqual([]);
  });

  it('should return undefined for non-existent article', () => {
    expect(service.getArticleById('non-existent')).toBeUndefined();
  });
});
