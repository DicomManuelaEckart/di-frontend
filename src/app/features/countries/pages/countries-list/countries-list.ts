import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import {
  IgxColumnComponent,
  IgxCellTemplateDirective,
} from '@infragistics/igniteui-angular/grids/core';
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

import { CountryService } from '../../services/country.service';
import { CountryApiService } from '../../services/country-api.service';
import { CountryListItem } from '../../models/country.model';

@Component({
  selector: 'app-countries-list',
  imports: [
    TranslatePipe,
    IgxGridComponent,
    IgxColumnComponent,
    IgxCellTemplateDirective,
    IgxPaginatorComponent,
    IgxIconComponent,
  ],
  templateUrl: './countries-list.html',
  styleUrl: './countries-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountriesList implements OnInit {
  private readonly countryService = inject(CountryService);
  private readonly countryApiService = inject(CountryApiService);

  protected readonly items = this.countryService.items;
  protected readonly loading = this.countryService.loading;

  protected readonly togglingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  protected onToggleActive(item: CountryListItem): void {
    this.togglingId.set(item.countryId);

    const action$ = item.isActive
      ? this.countryApiService.deactivate(item.countryCodeAlpha2)
      : this.countryApiService.activate(item.countryCodeAlpha2);

    action$.subscribe({
      next: () => {
        this.countryService.updateItemActiveState(item.countryId, !item.isActive);
        this.togglingId.set(null);
      },
      error: () => {
        this.togglingId.set(null);
      },
    });
  }

  private loadData(): void {
    this.countryService.setLoading(true);
    this.countryApiService.getAll().subscribe({
      next: (items) => {
        this.countryService.setItems(items);
        this.countryService.setLoading(false);
      },
      error: () => {
        this.countryService.setLoading(false);
      },
    });
  }
}
