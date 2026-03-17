import { computed, Injectable, signal } from '@angular/core';

import { NumberSequenceListItem } from '../models/number-sequence.model';

@Injectable({ providedIn: 'root' })
export class NumberSequenceService {
  private readonly itemsSignal = signal<NumberSequenceListItem[]>([]);
  private readonly loadingSignal = signal(false);

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly itemCount = computed(() => this.itemsSignal().length);
  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  setItems(items: NumberSequenceListItem[]): void {
    this.itemsSignal.set(items);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }
}
