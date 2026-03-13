import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { BlueprintService } from '../../services/blueprint.service';

@Component({
  selector: 'app-blueprint-detail',
  imports: [],
  templateUrl: './blueprint-detail.html',
  styleUrl: './blueprint-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlueprintDetail {
  private readonly blueprintService = inject(BlueprintService);

  readonly id = input.required<string>();

  // Computed signal – derives from route input + service state
  protected readonly article = computed(() => this.blueprintService.getArticleById(this.id()));
  protected readonly articleName = computed(() => this.article()?.name ?? this.id());
}
