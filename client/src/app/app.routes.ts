import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    {
        path: 'auth/login',
        loadComponent: () =>
            import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: 'auth/signup',
        loadComponent: () =>
            import('./features/auth/signup/signup.component').then((m) => m.SignupComponent),
    },
    {
        path: 'auth/callback',
        loadComponent: () =>
            import('./features/auth/callback/auth-callback.component').then((m) => m.AuthCallbackComponent),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        canActivate: [authGuard],
    },
    {
        path: 'items',
        loadComponent: () =>
            import('./features/items/items-list/items-list.component').then((m) => m.ItemsListComponent),
        canActivate: [authGuard],
    },
    {
        path: 'color-schemes',
        loadComponent: () =>
            import('./features/color-schemes/color-schemes-list/color-schemes-list.component').then(
                (m) => m.ColorSchemesListComponent,
            ),
        canActivate: [authGuard],
    },
    {
        path: 'color-schemes/new',
        loadComponent: () =>
            import('./features/color-schemes/scheme-detail/scheme-detail.component').then(
                (m) => m.SchemeDetailComponent,
            ),
        canActivate: [authGuard],
    },
    {
        path: 'color-schemes/:mode/:id',
        loadComponent: () =>
            import('./features/color-schemes/scheme-detail/scheme-detail.component').then(
                (m) => m.SchemeDetailComponent,
            ),
        canActivate: [authGuard],
    },
    {
        path: 'projects',
        loadComponent: () =>
            import('./features/projects/project-list/projects-list.component').then(
                (m) => m.ProjectsListComponent,
            ),
        canActivate: [authGuard],
    },
    {
        path: 'projects/:id',
        loadComponent: () =>
            import('./features/projects/project-detail/project-detail.component').then(
                (m) => m.ProjectDetailComponent,
            ),
        canActivate: [authGuard],
    },
    {
        path: 'settings',
        loadComponent: () =>
            import('./features/settings/settings.component').then((m) => m.SettingsComponent),
        canActivate: [authGuard],
    },
    {
        path: 'paint-converter',
        loadComponent: () =>
            import('./features/color-schemes/paint-converter/paint-converter.component').then(
                (m) => m.PaintConverterComponent,
            ),
        canActivate: [authGuard],
    },
    { path: '**', redirectTo: '/dashboard' },
];
