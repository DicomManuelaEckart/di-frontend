import { Routes } from '@angular/router';

export const currenciesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/currencies-list/currencies-list').then((m) => m.CurrenciesList),
    title: 'Currencies – List',
  },
];
