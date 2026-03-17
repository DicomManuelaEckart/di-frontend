import { Routes } from '@angular/router';

export const countriesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/countries-list/countries-list').then((m) => m.CountriesList),
    title: 'Countries – List',
  },
];
