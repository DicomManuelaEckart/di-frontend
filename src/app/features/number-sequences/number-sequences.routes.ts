import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth-guard';
import { permissionGuard } from '../../core/guards/permission-guard';

export const numberSequencesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/number-sequences-list/number-sequences-list').then(
        (m) => m.NumberSequencesList,
      ),
    title: 'Number Sequences – List',
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/number-sequence-create-edit/number-sequence-create-edit').then(
        (m) => m.NumberSequenceCreateEdit,
      ),
    title: 'Number Sequences – Create',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'number-sequences.create' },
  },
];
