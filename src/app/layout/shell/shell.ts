import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from '../footer/footer';
import { Header } from '../header/header';
import { Sidenav } from '../sidenav/sidenav';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, Footer, Sidenav],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {}
