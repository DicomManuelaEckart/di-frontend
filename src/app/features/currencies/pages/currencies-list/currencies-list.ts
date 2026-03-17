import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import {
  IgxColumnComponent,
  IgxCellTemplateDirective,
} from '@infragistics/igniteui-angular/grids/core';
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

import { CurrencyService } from '../../services/currency.service';
import { CurrencyApiService } from '../../services/currency-api.service';
import { CurrencyListItem } from '../../models/currency.model';

@Component({
  selector: 'app-currencies-list',
  imports: [
    TranslatePipe,
    IgxGridComponent,
    IgxColumnComponent,
    IgxCellTemplateDirective,
    IgxPaginatorComponent,
    IgxIconComponent,
  ],
  templateUrl: './currencies-list.html',
  styleUrl: './currencies-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrenciesList implements OnInit {
  private readonly currencyService = inject(CurrencyService);
  private readonly currencyApiService = inject(CurrencyApiService);

  protected readonly items = this.currencyService.items;
  protected readonly loading = this.currencyService.loading;

  protected readonly togglingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  protected onToggleActive(item: CurrencyListItem): void {
    this.togglingId.set(item.currencyId);

    const action$ = item.isActive
      ? this.currencyApiService.deactivate(item.currencyId)
      : this.currencyApiService.activate(item.currencyId);

    action$.subscribe({
      next: () => {
        this.currencyService.updateItemActiveState(item.currencyId, !item.isActive);
        this.togglingId.set(null);
      },
      error: () => {
        this.togglingId.set(null);
      },
    });
  }

  private loadData(): void {
    this.currencyService.setLoading(true);
    this.currencyApiService.getAll().subscribe({
      next: (items) => {
        this.currencyService.setItems(items);
        this.currencyService.setLoading(false);
      },
      error: () => {
        this.currencyService.setLoading(false);
      },
    });
  }
}
