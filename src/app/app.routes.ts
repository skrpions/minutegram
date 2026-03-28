import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./modules/auth/views/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'minutograms',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/minutograma/views/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'minutograms/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/minutograma/views/minutogram/minutogram.component').then(
        (m) => m.MinutogramaComponent,
      ),
  },
  { path: '', redirectTo: 'minutograms', pathMatch: 'full' },
  { path: '**', redirectTo: 'minutograms' },
];
