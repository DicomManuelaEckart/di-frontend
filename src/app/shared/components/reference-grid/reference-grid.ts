import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';

@Component({
  selector: 'app-reference-grid',
  imports: [IgxGridComponent, IgxPaginatorComponent],
  templateUrl: './reference-grid.html',
  styleUrl: './reference-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceGrid {
  readonly data = input<unknown[]>([]);
  readonly autoGenerate = input(true);
  readonly pageSize = input(10);
}
