import { computed, Injectable, signal } from '@angular/core';

import { BlueprintArticle } from '../models/blueprint-article.model';

@Injectable({
  providedIn: 'root',
})
export class BlueprintService {
  private readonly articlesSignal = signal<BlueprintArticle[]>([]);
  private readonly loadingSignal = signal(false);

  readonly articles = this.articlesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly articleCount = computed(() => this.articlesSignal().length);
  readonly hasArticles = computed(() => this.articlesSignal().length > 0);

  getArticles(): BlueprintArticle[] {
    return this.articlesSignal();
  }

  getArticleById(id: string): BlueprintArticle | undefined {
    return this.articlesSignal().find((a) => a.articleId === id);
  }

  setArticles(articles: BlueprintArticle[]): void {
    this.articlesSignal.set(articles);
  }

  addArticle(article: BlueprintArticle): void {
    this.articlesSignal.update((current) => [...current, article]);
  }

  removeArticle(articleId: string): void {
    this.articlesSignal.update((current) => current.filter((a) => a.articleId !== articleId));
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }
}
