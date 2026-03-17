import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  TaxRateListItem,
  CreateTaxRateRequest,
  CreateTaxRateResponse,
  ResolveTaxRateResponse,
  TaxRateFilterParams,
} from '../models/tax-rate.model';

@Injectable({ providedIn: 'root' })
export class TaxRateApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/tax-rates`;

  getAll(params?: TaxRateFilterParams): Observable<TaxRateListItem[]> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return this.http.get<TaxRateListItem[]>(this.baseUrl, { params: httpParams });
  }

  create(request: CreateTaxRateRequest): Observable<CreateTaxRateResponse> {
    return this.http.post<CreateTaxRateResponse>(this.baseUrl, request);
  }

  deactivate(id: string, hasOpenDocuments = false): Observable<void> {
    const params = new HttpParams().set('hasOpenDocuments', String(hasOpenDocuments));
    return this.http.put<void>(`${this.baseUrl}/${id}/deactivate`, {}, { params });
  }

  resolve(
    countryCode: string,
    taxType: number,
    referenceDate: string,
  ): Observable<ResolveTaxRateResponse> {
    const params = new HttpParams()
      .set('countryCode', countryCode)
      .set('taxType', String(taxType))
      .set('referenceDate', referenceDate);
    return this.http.get<ResolveTaxRateResponse>(`${this.baseUrl}/resolve`, { params });
  }
}
