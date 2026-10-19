import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import type { AppNotification } from '../../models';
import { NotificationsService } from '../../services/notifications.service';

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

@Component({
  selector: 'app-notifications',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './notifications.component.scss',
  template: `
<main class="inbox-page">
  <header class="page-header">
    <div><span class="eyebrow">Bandeja</span><h1>Notificaciones</h1></div>
    @if (hasUnread()) { <button class="button button-light" type="button" (click)="markAll()">Marcar todas como leídas</button> }
  </header>
  @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
  @if (loading()) {
    <p class="muted" role="status">Cargando tus notificaciones…</p>
  } @else if (!notifications().length) {
    <section class="card empty"><p>Todavía no tienes notificaciones.</p><p>Crea una <a routerLink="/alertas">alerta</a> y te avisaremos cuando una tienda aplique un descuento que te interese.</p></section>
  } @else {
    <ul class="inbox">
      @for (notification of notifications(); track notification.id) {
        <li class="card" [class.unread]="!notification.readAt">
          <div>
            <strong>{{ notification.title }}</strong>
            <p>{{ notification.message }}</p>
            <small>{{ formatDate(notification.createdAt) }}</small>
          </div>
          @if (!notification.readAt) { <button class="link-button" type="button" (click)="markRead(notification)">Marcar como leída</button> }
        </li>
      }
    </ul>
  }
</main>`,
})
export class NotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly counter = inject(NotificationsService);
  readonly notifications = signal<AppNotification[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit() {
    void this.load();
  }

  hasUnread() {
    return this.notifications().some((notification) => !notification.readAt);
  }

  formatDate(value: string) {
    return dateTimeFormatter.format(new Date(value));
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.getNotifications();
      this.notifications.set(response.data);
      this.counter.setUnread(response.unread);
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudieron cargar tus notificaciones.');
    } finally {
      this.loading.set(false);
    }
  }

  async markRead(notification: AppNotification) {
    try {
      this.counter.setUnread(await this.api.markNotificationRead(notification.id));
      this.notifications.update((items) => items.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)));
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo marcar como leída.');
    }
  }

  async markAll() {
    try {
      this.counter.setUnread(await this.api.markAllNotificationsRead());
      const now = new Date().toISOString();
      this.notifications.update((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudieron marcar como leídas.');
    }
  }
}
