import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import {
  IgxColumnComponent,
  IgxCellTemplateDirective,
} from '@infragistics/igniteui-angular/grids/core';
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

import { TaxRateService } from '../../services/tax-rate.service';
import { TaxRateApiService } from '../../services/tax-rate-api.service';
import { TaxRateListItem } from '../../models/tax-rate.model';

@Component({
  selector: 'app-tax-rates-list',
  imports: [
    TranslatePipe,
    IgxGridComponent,
    IgxColumnComponent,
    IgxCellTemplateDirective,
    IgxPaginatorComponent,
    IgxIconComponent,
  ],
  templateUrl: './tax-rates-list.html',
  styleUrl: './tax-rates-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxRatesList implements OnInit {
  private readonly taxRateService = inject(TaxRateService);
  private readonly taxRateApiService = inject(TaxRateApiService);
  private readonly router = inject(Router);

  protected readonly items = this.taxRateService.items;
  protected readonly loading = this.taxRateService.loading;

  protected readonly deactivatingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  protected onCreate(): void {
    void this.router.navigate(['/tax-rates/create']);
  }

  protected onDeactivate(item: TaxRateListItem): void {
    this.deactivatingId.set(item.taxRateId);
    this.taxRateApiService.deactivate(item.taxRateId).subscribe({
      next: () => {
        this.taxRateService.deactivateItem(item.taxRateId);
        this.deactivatingId.set(null);
      },
      error: () => {
        this.deactivatingId.set(null);
      },
    });
  }

  private loadData(): void {
    this.taxRateService.setLoading(true);
    this.taxRateApiService.getAll().subscribe({
      next: (items) => {
        this.taxRateService.setItems(items);
        this.taxRateService.setLoading(false);
      },
      error: () => {
        this.taxRateService.setLoading(false);
      },
    });
  }
}
