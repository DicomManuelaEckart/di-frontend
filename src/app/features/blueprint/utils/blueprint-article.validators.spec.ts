import { BlueprintArticle } from '../models/blueprint-article.model';
import { validateArticle, isArticleNameUnique } from './blueprint-article.validators';

describe('BlueprintArticle Validators', () => {
  describe('validateArticle', () => {
    it('should return valid for a complete article', () => {
      const result = validateArticle({
        articleId: 'a1',
        name: 'Widget',
        description: 'A useful widget',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when articleId is missing', () => {
      const result = validateArticle({ name: 'Widget', description: 'Desc' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('articleId is required');
    });

    it('should return error when name is empty', () => {
      const result = validateArticle({ articleId: 'a1', name: '  ', description: 'Desc' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should return error when description is missing', () => {
      const result = validateArticle({ articleId: 'a1', name: 'Widget' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('description is required');
    });

    it('should collect multiple errors', () => {
      const result = validateArticle({});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('isArticleNameUnique', () => {
    const existing: BlueprintArticle[] = [
      { articleId: 'a1', name: 'Widget', description: 'Desc' },
      { articleId: 'a2', name: 'Gadget', description: 'Desc' },
    ];

    it('should return true for a unique name', () => {
      expect(isArticleNameUnique('New Item', existing)).toBe(true);
    });

    it('should return false for a duplicate name', () => {
      expect(isArticleNameUnique('Widget', existing)).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isArticleNameUnique('widget', existing)).toBe(false);
    });

    it('should return true for empty existing list', () => {
      expect(isArticleNameUnique('Anything', [])).toBe(true);
    });
  });
});
