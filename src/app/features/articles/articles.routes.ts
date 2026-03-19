import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth-guard';
import { permissionGuard } from '../../core/guards/permission-guard';

export const articlesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/articles-list/articles-list').then((m) => m.ArticlesList),
    title: 'Articles – List',
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/article-create-edit/article-create-edit').then((m) => m.ArticleCreateEdit),
    title: 'Articles – Create',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'articles.create' },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/article-create-edit/article-create-edit').then((m) => m.ArticleCreateEdit),
    title: 'Articles – Edit',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'articles.edit' },
  },
];
