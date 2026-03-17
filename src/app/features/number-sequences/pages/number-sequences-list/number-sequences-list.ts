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

import { NumberSequenceService } from '../../services/number-sequence.service';
import { NumberSequenceApiService } from '../../services/number-sequence-api.service';
import { NumberSequenceListItem } from '../../models/number-sequence.model';

export interface PreviewResult {
  readonly numberSequenceId: string;
  readonly prefix: string | null;
  readonly previewNumber: string;
}

@Component({
  selector: 'app-number-sequences-list',
  imports: [
    TranslatePipe,
    IgxGridComponent,
    IgxColumnComponent,
    IgxCellTemplateDirective,
    IgxPaginatorComponent,
    IgxIconComponent,
  ],
  templateUrl: './number-sequences-list.html',
  styleUrl: './number-sequences-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberSequencesList implements OnInit {
  private readonly numberSequenceService = inject(NumberSequenceService);
  private readonly numberSequenceApiService = inject(NumberSequenceApiService);
  private readonly router = inject(Router);

  protected readonly items = this.numberSequenceService.items;
  protected readonly loading = this.numberSequenceService.loading;

  protected readonly previewResult = signal<PreviewResult | null>(null);
  protected readonly previewLoading = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  protected onCreate(): void {
    void this.router.navigate(['/number-sequences/create']);
  }

  protected onPreview(item: NumberSequenceListItem): void {
    this.previewLoading.set(true);
    this.previewResult.set(null);
    this.numberSequenceApiService.preview(item.numberSequenceId).subscribe({
      next: (response) => {
        this.previewResult.set({
          numberSequenceId: item.numberSequenceId,
          prefix: item.prefix,
          previewNumber: response.previewNumber,
        });
        this.previewLoading.set(false);
      },
      error: () => {
        this.previewLoading.set(false);
      },
    });
  }

  protected dismissPreview(): void {
    this.previewResult.set(null);
  }

  private loadData(): void {
    this.numberSequenceService.setLoading(true);
    this.numberSequenceApiService.getAll().subscribe({
      next: (items) => {
        this.numberSequenceService.setItems(items);
        this.numberSequenceService.setLoading(false);
      },
      error: () => {
        this.numberSequenceService.setLoading(false);
      },
    });
  }
}
