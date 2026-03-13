import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-blueprint-detail',
  imports: [],
  templateUrl: './blueprint-detail.html',
  styleUrl: './blueprint-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlueprintDetail {
  readonly id = input.required<string>();
}
