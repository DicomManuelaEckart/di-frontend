import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { PagedResponse, PaginationParams } from '../../../shared/models/pagination.model';
import { BlueprintCustomerListItem } from '../models/blueprint-customer.model';

@Injectable({ providedIn: 'root' })
export class BlueprintCustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/blueprint/customers`;

  getAll(params?: PaginationParams): Observable<PagedResponse<BlueprintCustomerListItem>> {
    let httpParams = new HttpParams();

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          httpParams = httpParams.set(key, value);
        }
      }
    }

    return this.http.get<PagedResponse<BlueprintCustomerListItem>>(this.baseUrl, {
      params: httpParams,
    });
  }

  getById(id: string): Observable<BlueprintCustomerListItem> {
    return this.http.get<BlueprintCustomerListItem>(`${this.baseUrl}/${id}`);
  }
}
