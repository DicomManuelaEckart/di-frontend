import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import { IgxColumnComponent } from '@infragistics/igniteui-angular/grids/core';
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';

import { RegionService } from '../../services/region.service';
import { RegionApiService } from '../../services/region-api.service';
import { CountryApiService } from '../../../countries/services/country-api.service';
import { CountryListItem } from '../../../countries/models/country.model';

@Component({
  selector: 'app-regions-list',
  imports: [TranslatePipe, IgxGridComponent, IgxColumnComponent, IgxPaginatorComponent],
  templateUrl: './regions-list.html',
  styleUrl: './regions-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionsList implements OnInit {
  private readonly regionService = inject(RegionService);
  private readonly regionApiService = inject(RegionApiService);
  private readonly countryApiService = inject(CountryApiService);

  protected readonly items = this.regionService.items;
  protected readonly loading = this.regionService.loading;
  protected readonly selectedCountryCode = this.regionService.selectedCountryCode;

  protected readonly countries = signal<CountryListItem[]>([]);
  protected readonly countriesLoading = signal(true);

  ngOnInit(): void {
    this.loadCountries();
  }

  protected onCountryChange(event: Event): void {
    const code = (event.target as HTMLSelectElement).value;
    if (code) {
      this.regionService.setSelectedCountryCode(code);
      this.loadRegions(code);
    } else {
      this.regionService.setSelectedCountryCode(null);
      this.regionService.setItems([]);
    }
  }

  private loadCountries(): void {
    this.countriesLoading.set(true);
    this.countryApiService.getAll({ isActive: true }).subscribe({
      next: (items) => {
        this.countries.set(items);
        this.countriesLoading.set(false);
      },
      error: () => {
        this.countriesLoading.set(false);
      },
    });
  }

  private loadRegions(countryCode: string): void {
    this.regionService.setLoading(true);
    this.regionApiService.getAll(countryCode).subscribe({
      next: (items) => {
        this.regionService.setItems(items);
        this.regionService.setLoading(false);
      },
      error: () => {
        this.regionService.setLoading(false);
      },
    });
  }
}
