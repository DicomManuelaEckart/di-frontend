import { Routes } from '@angular/router';

export const regionsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/regions-list/regions-list').then((m) => m.RegionsList),
    title: 'Regions – List',
  },
];
