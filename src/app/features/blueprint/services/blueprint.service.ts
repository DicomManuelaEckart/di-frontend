import { Injectable, signal } from '@angular/core';

import { BlueprintArticle } from '../models/blueprint-article.model';

@Injectable({
  providedIn: 'root',
})
export class BlueprintService {
  private readonly articlesSignal = signal<BlueprintArticle[]>([]);

  readonly articles = this.articlesSignal.asReadonly();

  getArticles(): BlueprintArticle[] {
    return this.articlesSignal();
  }

  getArticleById(id: string): BlueprintArticle | undefined {
    return this.articlesSignal().find((a) => a.articleId === id);
  }
}
