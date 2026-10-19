import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { ChatComponent } from './pages/chat/chat.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { AdminComponent } from './pages/admin/admin.component';
import { customerGuard, storeGuard } from './auth.guard';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'catalogo', component: CatalogComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin', component: AdminComponent, canActivate: [storeGuard] },
  { path: 'alertas', component: AlertsComponent, canActivate: [customerGuard] },
  { path: 'notificaciones', component: NotificationsComponent, canActivate: [customerGuard] },
  { path: '**', redirectTo: '' },
];
