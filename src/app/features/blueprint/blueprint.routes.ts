import { Routes } from '@angular/router';

export const blueprintRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/blueprint-list/blueprint-list').then((m) => m.BlueprintList),
    title: 'Blueprint – List',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/blueprint-detail/blueprint-detail').then((m) => m.BlueprintDetail),
    title: 'Blueprint – Detail',
  },
];
