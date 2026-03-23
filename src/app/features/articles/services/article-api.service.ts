import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  ArticleResponse,
  ArticleHierarchyResponse,
  CreateArticleRequest,
  CreateArticleHierarchyRequest,
  DiscontinueArticleRequest,
  DiscontinueArticleResponse,
  UpdateArticleRequest,
  UpdateArticlePropertiesRequest,
  UpdateWeightsDimensionsRequest,
  PagedArticleResponse,
  ArticleFilterParams,
} from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class ArticleApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/articles`;

  getAll(params?: ArticleFilterParams): Observable<PagedArticleResponse> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return this.http.get<PagedArticleResponse>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<ArticleResponse> {
    return this.http.get<ArticleResponse>(`${this.baseUrl}/${id}`);
  }

  getByGtin(gtin: string): Observable<ArticleResponse> {
    return this.http.get<ArticleResponse>(`${this.baseUrl}/by-gtin/${gtin}`);
  }

  create(request: CreateArticleRequest): Observable<ArticleResponse> {
    return this.http.post<ArticleResponse>(this.baseUrl, request);
  }

  update(id: string, request: UpdateArticleRequest): Observable<ArticleResponse> {
    return this.http.put<ArticleResponse>(`${this.baseUrl}/${id}`, request);
  }

  updateProperties(
    id: string,
    request: UpdateArticlePropertiesRequest,
  ): Observable<ArticleResponse> {
    return this.http.put<ArticleResponse>(`${this.baseUrl}/${id}/properties`, request);
  }

  updateWeightsDimensions(
    id: string,
    request: UpdateWeightsDimensionsRequest,
  ): Observable<ArticleResponse> {
    return this.http.put<ArticleResponse>(`${this.baseUrl}/${id}/weights-dimensions`, request);
  }

  deactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  reactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/reactivate`, {});
  }

  discontinue(
    id: string,
    request: DiscontinueArticleRequest,
  ): Observable<DiscontinueArticleResponse> {
    return this.http.post<DiscontinueArticleResponse>(`${this.baseUrl}/${id}/discontinue`, request);
  }

  getHierarchies(id: string): Observable<ArticleHierarchyResponse[]> {
    return this.http.get<ArticleHierarchyResponse[]>(`${this.baseUrl}/${id}/hierarchy`);
  }

  createHierarchy(
    id: string,
    request: CreateArticleHierarchyRequest,
  ): Observable<ArticleHierarchyResponse> {
    return this.http.post<ArticleHierarchyResponse>(`${this.baseUrl}/${id}/hierarchy`, request);
  }

  deleteHierarchy(id: string, hierarchyId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/hierarchy/${hierarchyId}`);
  }
}
