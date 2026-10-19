import { Routes } from '@angular/router';
import { customerGuard, signedInGuard, storeGuard } from './auth.guard';
import { HomeComponent } from './pages/home/home.component';

// The home page ships in the main bundle for a fast first paint; every other page is loaded on demand.
export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'StockBarrio · Ofertas de tu barrio' },
  { path: 'catalogo', loadComponent: () => import('./pages/catalog/catalog.component').then((m) => m.CatalogComponent), title: 'Catálogo · StockBarrio' },
  { path: 'ofertas', loadComponent: () => import('./pages/offers/offers.component').then((m) => m.OffersComponent), title: 'Ofertas · StockBarrio' },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat.component').then((m) => m.ChatComponent), title: 'Asistente · StockBarrio' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent), title: 'Iniciar sesión · StockBarrio' },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent), title: 'Crear cuenta · StockBarrio' },
  { path: 'admin', canActivate: [storeGuard], loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent), title: 'Mi tienda · StockBarrio' },
  { path: 'alertas', canActivate: [customerGuard], loadComponent: () => import('./pages/alerts/alerts.component').then((m) => m.AlertsComponent), title: 'Mis alertas · StockBarrio' },
  { path: 'notificaciones', canActivate: [customerGuard], loadComponent: () => import('./pages/notifications/notifications.component').then((m) => m.NotificationsComponent), title: 'Notificaciones · StockBarrio' },
  { path: 'forgot-password', loadComponent: () => import('./pages/account/forgot-password.component').then((m) => m.ForgotPasswordComponent), title: 'Recuperar contraseña · StockBarrio' },
  { path: 'reset-password', loadComponent: () => import('./pages/account/reset-password.component').then((m) => m.ResetPasswordComponent), title: 'Nueva contraseña · StockBarrio' },
  { path: 'confirm-email', loadComponent: () => import('./pages/account/confirm-email.component').then((m) => m.ConfirmEmailComponent), title: 'Confirmar correo · StockBarrio' },
  { path: 'perfil', canActivate: [signedInGuard], loadComponent: () => import('./pages/account/profile.component').then((m) => m.ProfileComponent), title: 'Mi perfil · StockBarrio' },
  { path: '**', redirectTo: '' },
];
