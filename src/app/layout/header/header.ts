import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IgxNavbarComponent, IgxNavbarTitleDirective } from '@infragistics/igniteui-angular/navbar';
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

@Component({
  selector: 'app-header',
  imports: [IgxNavbarComponent, IgxNavbarTitleDirective, IgxIconComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {}
