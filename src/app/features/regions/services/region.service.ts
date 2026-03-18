import { computed, Injectable, signal } from '@angular/core';

import { RegionListItem } from '../models/region.model';

@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly itemsSignal = signal<RegionListItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly selectedCountryCodeSignal = signal<string | null>(null);

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly selectedCountryCode = this.selectedCountryCodeSignal.asReadonly();
  readonly itemCount = computed(() => this.itemsSignal().length);
  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  setItems(items: RegionListItem[]): void {
    this.itemsSignal.set(items);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  setSelectedCountryCode(code: string | null): void {
    this.selectedCountryCodeSignal.set(code);
  }
}
