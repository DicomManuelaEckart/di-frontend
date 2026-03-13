import { BlueprintArticle } from '../models/blueprint-article.model';
import { BlueprintArticleView, toArticleView, toArticleViewList } from './blueprint-article.mapper';

describe('BlueprintArticle Mapper', () => {
  const article: BlueprintArticle = {
    articleId: 'a1',
    name: 'Widget',
    description: 'A useful widget',
  };

  describe('toArticleView', () => {
    it('should map articleId to id', () => {
      const view: BlueprintArticleView = toArticleView(article);
      expect(view.id).toBe('a1');
    });

    it('should combine name and description into displayName', () => {
      const view: BlueprintArticleView = toArticleView(article);
      expect(view.displayName).toBe('Widget – A useful widget');
    });
  });

  describe('toArticleViewList', () => {
    it('should return empty array for empty input', () => {
      expect(toArticleViewList([])).toEqual([]);
    });

    it('should map all articles to view models', () => {
      const articles: BlueprintArticle[] = [
        { articleId: 'a1', name: 'First', description: 'Desc 1' },
        { articleId: 'a2', name: 'Second', description: 'Desc 2' },
      ];

      const views = toArticleViewList(articles);
      expect(views).toHaveLength(2);
      expect(views[0]).toEqual({ id: 'a1', displayName: 'First – Desc 1' });
      expect(views[1]).toEqual({ id: 'a2', displayName: 'Second – Desc 2' });
    });
  });
});
