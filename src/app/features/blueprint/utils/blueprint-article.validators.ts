import { BlueprintArticle } from '../models/blueprint-article.model';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export function validateArticle(article: Partial<BlueprintArticle>): ValidationResult {
  const errors: string[] = [];

  if (!article.articleId?.trim()) {
    errors.push('articleId is required');
  }

  if (!article.name?.trim()) {
    errors.push('name is required');
  }

  if (!article.description?.trim()) {
    errors.push('description is required');
  }

  return { valid: errors.length === 0, errors };
}

export function isArticleNameUnique(name: string, existing: BlueprintArticle[]): boolean {
  return !existing.some((a) => a.name.toLowerCase() === name.toLowerCase());
}
