import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

export interface NavItem {
  readonly label: string;
  readonly route: string;
  readonly icon: string;
}

export interface NavGroup {
  readonly label: string;
  readonly icon: string;
  readonly children: readonly NavItem[];
}

@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, RouterLinkActive, IgxIconComponent],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidenav {
  readonly navGroups: NavGroup[] = [
    {
      label: 'Organization',
      icon: 'business',
      children: [
        { label: 'Blueprint', route: '/blueprint', icon: 'description' },
        { label: 'Number Sequences', route: '/number-sequences', icon: 'format_list_numbered' },
        { label: 'Tax Rates', route: '/tax-rates', icon: 'percent' },
        { label: 'Currencies', route: '/currencies', icon: 'currency_exchange' },
        { label: 'Countries', route: '/countries', icon: 'public' },
        { label: 'Regions', route: '/regions', icon: 'map' },
      ],
    },
  ];

  private readonly expandedGroups = signal<Set<string>>(new Set(['Organization']));

  isExpanded(groupLabel: string): boolean {
    return this.expandedGroups().has(groupLabel);
  }

  toggleGroup(groupLabel: string): void {
    this.expandedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
  }
}
