import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  NumberSequenceListItem,
  CreateNumberSequenceRequest,
  CreateNumberSequenceResponse,
  AllocateNextNumberResponse,
  PreviewNextNumberResponse,
  NumberSequenceFilterParams,
} from '../models/number-sequence.model';

@Injectable({ providedIn: 'root' })
export class NumberSequenceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/number-sequences`;

  getAll(params?: NumberSequenceFilterParams): Observable<NumberSequenceListItem[]> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return this.http.get<NumberSequenceListItem[]>(this.baseUrl, { params: httpParams });
  }

  create(request: CreateNumberSequenceRequest): Observable<CreateNumberSequenceResponse> {
    return this.http.post<CreateNumberSequenceResponse>(this.baseUrl, request);
  }

  allocate(id: string): Observable<AllocateNextNumberResponse> {
    return this.http.post<AllocateNextNumberResponse>(`${this.baseUrl}/${id}/allocate`, {});
  }

  preview(id: string): Observable<PreviewNextNumberResponse> {
    return this.http.get<PreviewNextNumberResponse>(`${this.baseUrl}/${id}/preview`);
  }
}
