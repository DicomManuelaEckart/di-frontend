import { Routes } from '@angular/router';

import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      {
        path: 'blueprint',
        loadChildren: () =>
          import('./features/blueprint/blueprint.routes').then((m) => m.blueprintRoutes),
      },
      {
        path: 'number-sequences',
        loadChildren: () =>
          import('./features/number-sequences/number-sequences.routes').then(
            (m) => m.numberSequencesRoutes,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'blueprint',
      },
    ],
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/errors/access-denied/access-denied').then((m) => m.AccessDenied),
    title: 'Access Denied',
  },
  {
    path: '**',
    loadComponent: () => import('./features/errors/not-found/not-found').then((m) => m.NotFound),
    title: 'Page Not Found',
  },
];
