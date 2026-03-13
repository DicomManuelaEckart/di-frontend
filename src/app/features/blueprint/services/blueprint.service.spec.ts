import { TestBed } from '@angular/core/testing';

import { BlueprintService } from './blueprint.service';
import { BlueprintArticle } from '../models/blueprint-article.model';

describe('BlueprintService', () => {
  let service: BlueprintService;

  const mockArticle: BlueprintArticle = {
    articleId: 'art-1',
    name: 'Test Article',
    description: 'A test article',
  };

  const mockArticle2: BlueprintArticle = {
    articleId: 'art-2',
    name: 'Second Article',
    description: 'Another test article',
  };

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

  it('should have loading false initially', () => {
    expect(service.loading()).toBe(false);
  });

  it('should have articleCount 0 initially', () => {
    expect(service.articleCount()).toBe(0);
  });

  it('should have hasArticles false initially', () => {
    expect(service.hasArticles()).toBe(false);
  });

  it('should set articles', () => {
    service.setArticles([mockArticle]);

    expect(service.articles()).toEqual([mockArticle]);
    expect(service.articleCount()).toBe(1);
    expect(service.hasArticles()).toBe(true);
  });

  it('should add an article', () => {
    service.setArticles([mockArticle]);
    service.addArticle(mockArticle2);

    expect(service.articles()).toEqual([mockArticle, mockArticle2]);
    expect(service.articleCount()).toBe(2);
  });

  it('should remove an article by id', () => {
    service.setArticles([mockArticle, mockArticle2]);
    service.removeArticle('art-1');

    expect(service.articles()).toEqual([mockArticle2]);
    expect(service.articleCount()).toBe(1);
  });

  it('should find article by id', () => {
    service.setArticles([mockArticle, mockArticle2]);

    expect(service.getArticleById('art-2')).toEqual(mockArticle2);
  });

  it('should set loading state', () => {
    service.setLoading(true);
    expect(service.loading()).toBe(true);

    service.setLoading(false);
    expect(service.loading()).toBe(false);
  });

  it('should expose articles as readonly signal', () => {
    service.setArticles([mockArticle]);
    expect(service.articles()).toEqual([mockArticle]);
  });
});
