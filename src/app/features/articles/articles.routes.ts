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
  {
    path: ':id/properties',
    loadComponent: () =>
      import('./pages/article-properties/article-properties').then((m) => m.ArticleProperties),
    title: 'Articles – Properties',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'articles.edit' },
  },
  {
    path: ':id/weights-dimensions',
    loadComponent: () =>
      import('./pages/article-weights-dimensions/article-weights-dimensions').then(
        (m) => m.ArticleWeightsDimensions,
      ),
    title: 'Articles – Weights & Dimensions',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'articles.edit' },
  },
  {
    path: ':id/hierarchy',
    loadComponent: () =>
      import('./pages/article-hierarchy/article-hierarchy').then((m) => m.ArticleHierarchy),
    title: 'Articles – Hierarchy',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'articles.edit' },
  },
];
