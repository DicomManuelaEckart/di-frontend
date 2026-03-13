import { BlueprintArticle } from '../models/blueprint-article.model';

export interface BlueprintArticleView {
  readonly id: string;
  readonly displayName: string;
}

export function toArticleView(article: BlueprintArticle): BlueprintArticleView {
  return {
    id: article.articleId,
    displayName: `${article.name} – ${article.description}`,
  };
}

export function toArticleViewList(articles: BlueprintArticle[]): BlueprintArticleView[] {
  return articles.map(toArticleView);
}
