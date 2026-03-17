import { computed, Injectable, signal } from '@angular/core';

import { CurrencyListItem } from '../models/currency.model';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly itemsSignal = signal<CurrencyListItem[]>([]);
  private readonly loadingSignal = signal(false);

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly itemCount = computed(() => this.itemsSignal().length);
  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  setItems(items: CurrencyListItem[]): void {
    this.itemsSignal.set(items);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  updateItemActiveState(currencyId: string, isActive: boolean): void {
    this.itemsSignal.update((items) =>
      items.map((item) => (item.currencyId === currencyId ? { ...item, isActive } : item)),
    );
  }
}
