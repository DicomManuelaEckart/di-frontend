import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IgxNavigationDrawerComponent,
  IgxNavDrawerTemplateDirective,
} from '@infragistics/igniteui-angular/navigation-drawer';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

export interface NavItem {
  readonly label: string;
  readonly route: string;
  readonly icon: string;
}

@Component({
  selector: 'app-sidenav',
  imports: [
    RouterLink,
    RouterLinkActive,
    IgxNavigationDrawerComponent,
    IgxNavDrawerTemplateDirective,
    IgxIconComponent,
  ],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidenav {
  readonly navItems: NavItem[] = [{ label: 'Blueprint', route: '/blueprint', icon: 'description' }];
}
