import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth-guard';
import { permissionGuard } from '../../core/guards/permission-guard';

export const taxRatesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/tax-rates-list/tax-rates-list').then((m) => m.TaxRatesList),
    title: 'Tax Rates – List',
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/tax-rate-create-edit/tax-rate-create-edit').then((m) => m.TaxRateCreateEdit),
    title: 'Tax Rates – Create',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'tax-rates.create' },
  },
];
