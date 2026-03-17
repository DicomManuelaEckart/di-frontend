import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { CountryListItem, CountryFilterParams } from '../models/country.model';

@Injectable({ providedIn: 'root' })
export class CountryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/countries`;

  getAll(params?: CountryFilterParams): Observable<CountryListItem[]> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return this.http.get<CountryListItem[]>(this.baseUrl, { params: httpParams });
  }

  activate(code: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${code}/activate`, {});
  }

  deactivate(code: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${code}/deactivate`, {});
  }
}
