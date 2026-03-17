import { computed, Injectable, signal } from '@angular/core';

import { CountryListItem } from '../models/country.model';

@Injectable({ providedIn: 'root' })
export class CountryService {
  private readonly itemsSignal = signal<CountryListItem[]>([]);
  private readonly loadingSignal = signal(false);

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly itemCount = computed(() => this.itemsSignal().length);
  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  setItems(items: CountryListItem[]): void {
    this.itemsSignal.set(items);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  updateItemActiveState(countryId: string, isActive: boolean): void {
    this.itemsSignal.update((items) =>
      items.map((item) => (item.countryId === countryId ? { ...item, isActive } : item)),
    );
  }
}
