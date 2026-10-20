import { Routes } from '@angular/router';
import { signedInGuard, storeGuard } from './auth.guard';
import { environment } from '../environments/environment';
import { HomeComponent } from './pages/home/home.component';

const supabaseAuth = environment.authProvider === 'supabase';

// Own login: recovery by link and email confirmation pages of the API.
const legacyAccountRoutes: Routes = [
  { path: 'forgot-password', loadComponent: () => import('./pages/account/forgot-password.component').then((m) => m.ForgotPasswordComponent), title: 'Recuperar contraseña · Stock Barrio' },
  { path: 'reset-password', loadComponent: () => import('./pages/account/reset-password.component').then((m) => m.ResetPasswordComponent), title: 'Nueva contraseña · Stock Barrio' },
  { path: 'confirm-email', loadComponent: () => import('./pages/account/confirm-email.component').then((m) => m.ConfirmEmailComponent), title: 'Confirmar correo · Stock Barrio' },
];

// Supabase Auth: recovery with a 6 digit code; old links to the legacy pages lead to the new flow.
const supabaseAccountRoutes: Routes = [
  { path: 'forgot-password', loadComponent: () => import('./pages/account/recover-with-code.component').then((m) => m.RecoverWithCodeComponent), title: 'Recuperar contraseña · Stock Barrio' },
  { path: 'reset-password', redirectTo: 'forgot-password' },
  { path: 'confirm-email', redirectTo: 'login' },
];

// The home page ships in the main bundle for a fast first paint; every other page is loaded on demand.
export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Stock Barrio' },
  { path: 'catalogo', loadComponent: () => import('./pages/catalog/catalog.component').then((m) => m.CatalogComponent), title: 'Catálogo · Stock Barrio' },
  { path: 'ofertas', loadComponent: () => import('./pages/offers/offers.component').then((m) => m.OffersComponent), title: 'Ofertas · Stock Barrio' },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat.component').then((m) => m.ChatComponent), title: 'Asistente · Stock Barrio' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent), title: 'Iniciar sesión · Stock Barrio' },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent), title: 'Crear cuenta · Stock Barrio' },
  { path: 'admin', canActivate: [storeGuard], loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent), title: 'Mi tienda · Stock Barrio' },
  ...(supabaseAuth ? supabaseAccountRoutes : legacyAccountRoutes),
  { path: 'perfil', canActivate: [signedInGuard], loadComponent: () => import('./pages/account/profile.component').then((m) => m.ProfileComponent), title: 'Mi perfil · Stock Barrio' },
  { path: '**', redirectTo: '' },
];
