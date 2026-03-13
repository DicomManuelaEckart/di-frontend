import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth-guard';
import { permissionGuard } from '../../core/guards/permission-guard';

export const blueprintRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/blueprint-list/blueprint-list').then((m) => m.BlueprintList),
    title: 'Blueprint – List',
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/blueprint-create-edit/blueprint-create-edit').then(
        (m) => m.BlueprintCreateEdit,
      ),
    title: 'Blueprint – Create',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'blueprint.create' },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/blueprint-create-edit/blueprint-create-edit').then(
        (m) => m.BlueprintCreateEdit,
      ),
    title: 'Blueprint – Edit',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'blueprint.edit' },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/blueprint-detail/blueprint-detail').then((m) => m.BlueprintDetail),
    title: 'Blueprint – Detail',
  },
];
