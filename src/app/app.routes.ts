import { Routes } from '@angular/router';
import { customerGuard, signedInGuard, storeGuard } from './auth.guard';
import { environment } from '../environments/environment';
import { HomeComponent } from './pages/home/home.component';

const alertRoutes: Routes = [
  { path: 'alertas', canActivate: [customerGuard], loadComponent: () => import('./pages/alerts/alerts.component').then((m) => m.AlertsComponent), title: 'Mis alertas · StockBarrio' },
  { path: 'notificaciones', canActivate: [customerGuard], loadComponent: () => import('./pages/notifications/notifications.component').then((m) => m.NotificationsComponent), title: 'Notificaciones · StockBarrio' },
];

const supabaseAuth = environment.authProvider === 'supabase';

// Own login: recovery by link and email confirmation pages of the API.
const legacyAccountRoutes: Routes = [
  { path: 'forgot-password', loadComponent: () => import('./pages/account/forgot-password.component').then((m) => m.ForgotPasswordComponent), title: 'Recuperar contraseña · StockBarrio' },
  { path: 'reset-password', loadComponent: () => import('./pages/account/reset-password.component').then((m) => m.ResetPasswordComponent), title: 'Nueva contraseña · StockBarrio' },
  { path: 'confirm-email', loadComponent: () => import('./pages/account/confirm-email.component').then((m) => m.ConfirmEmailComponent), title: 'Confirmar correo · StockBarrio' },
];

// Supabase Auth: recovery with a 6 digit code; old links to the legacy pages lead to the new flow.
const supabaseAccountRoutes: Routes = [
  { path: 'forgot-password', loadComponent: () => import('./pages/account/recover-with-code.component').then((m) => m.RecoverWithCodeComponent), title: 'Recuperar contraseña · StockBarrio' },
  { path: 'reset-password', redirectTo: 'forgot-password' },
  { path: 'confirm-email', redirectTo: 'login' },
];

// The home page ships in the main bundle for a fast first paint; every other page is loaded on demand.
export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'StockBarrio · Ofertas de tu barrio' },
  { path: 'catalogo', loadComponent: () => import('./pages/catalog/catalog.component').then((m) => m.CatalogComponent), title: 'Catálogo · StockBarrio' },
  { path: 'ofertas', loadComponent: () => import('./pages/offers/offers.component').then((m) => m.OffersComponent), title: 'Ofertas · StockBarrio' },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat.component').then((m) => m.ChatComponent), title: 'Asistente · StockBarrio' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent), title: 'Iniciar sesión · StockBarrio' },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent), title: 'Crear cuenta · StockBarrio' },
  { path: 'admin', canActivate: [storeGuard], loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent), title: 'Mi tienda · StockBarrio' },
  // Alerts and the inbox are paused (environment.enableAlerts); with the flag off these addresses go to the home page.
  ...(environment.enableAlerts ? alertRoutes : []),
  ...(supabaseAuth ? supabaseAccountRoutes : legacyAccountRoutes),
  { path: 'perfil', canActivate: [signedInGuard], loadComponent: () => import('./pages/account/profile.component').then((m) => m.ProfileComponent), title: 'Mi perfil · StockBarrio' },
  { path: '**', redirectTo: '' },
];
