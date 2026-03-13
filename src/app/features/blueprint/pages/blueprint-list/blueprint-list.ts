import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { BlueprintService } from '../../services/blueprint.service';

@Component({
  selector: 'app-blueprint-list',
  imports: [],
  templateUrl: './blueprint-list.html',
  styleUrl: './blueprint-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlueprintList {
  private readonly blueprintService = inject(BlueprintService);

  // Local component state (signal)
  private readonly filterTerm = signal('');

  // Feature-wide state from service (readonly signals)
  protected readonly articles = this.blueprintService.articles;
  protected readonly loading = this.blueprintService.loading;
  protected readonly articleCount = this.blueprintService.articleCount;

  // Computed signal – derived from local + service state
  protected readonly filteredArticles = computed(() => {
    const term = this.filterTerm().toLowerCase();
    if (!term) {
      return this.articles();
    }
    return this.articles().filter(
      (a) => a.name.toLowerCase().includes(term) || a.description.toLowerCase().includes(term),
    );
  });

  protected readonly filteredCount = computed(() => this.filteredArticles().length);

  protected setFilter(term: string): void {
    this.filterTerm.set(term);
  }
}
