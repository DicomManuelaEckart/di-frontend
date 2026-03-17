import { computed, Injectable, signal } from '@angular/core';

import { TaxRateListItem } from '../models/tax-rate.model';

@Injectable({ providedIn: 'root' })
export class TaxRateService {
  private readonly itemsSignal = signal<TaxRateListItem[]>([]);
  private readonly loadingSignal = signal(false);

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly itemCount = computed(() => this.itemsSignal().length);
  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  setItems(items: TaxRateListItem[]): void {
    this.itemsSignal.set(items);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  deactivateItem(taxRateId: string): void {
    this.itemsSignal.update((items) =>
      items.map((item) => (item.taxRateId === taxRateId ? { ...item, isActive: false } : item)),
    );
  }
}
