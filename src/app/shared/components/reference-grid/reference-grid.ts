import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import { IgxColumnComponent } from '@infragistics/igniteui-angular/grids/core';
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';

export interface GridColumn {
  readonly field: string;
  readonly header: string;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly width?: string;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'date';
}

export interface SortEvent {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-reference-grid',
  imports: [IgxGridComponent, IgxColumnComponent, IgxPaginatorComponent],
  templateUrl: './reference-grid.html',
  styleUrl: './reference-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceGrid {
  readonly data = input<unknown[]>([]);
  readonly columns = input<GridColumn[]>([]);
  readonly pageSize = input(15);
  readonly primaryKey = input<string>('id');

  readonly rowSelected = output<unknown>();
  readonly sortChanged = output<SortEvent>();
}
