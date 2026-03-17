import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  readonly label: string;
  readonly route: string;
  readonly icon?: string;
}

@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidenav {
  readonly navItems: NavItem[] = [
    { label: 'Blueprint', route: '/blueprint', icon: '📋' },
    { label: 'Number Sequences', route: '/number-sequences', icon: '🔢' },
    { label: 'Tax Rates', route: '/tax-rates', icon: '💰' },
    { label: 'Currencies', route: '/currencies', icon: '💱' },
    { label: 'Countries', route: '/countries', icon: '🌍' },
  ];
}
