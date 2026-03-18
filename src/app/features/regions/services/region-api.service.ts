import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { RegionListItem, RegionFilterParams } from '../models/region.model';

@Injectable({ providedIn: 'root' })
export class RegionApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getAll(countryCode: string, params?: RegionFilterParams): Observable<RegionListItem[]> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return this.http.get<RegionListItem[]>(`${this.apiBaseUrl}/countries/${countryCode}/regions`, {
      params: httpParams,
    });
  }
}
