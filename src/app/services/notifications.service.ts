import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { AuthService } from '../auth.service';

export const unreadPollMs = 60_000;

// Keeps the unread counter of the header up to date while a customer is signed in.
@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private timer: ReturnType<typeof setInterval> | null = null;
  readonly unread = signal(0);

  constructor() {
    effect(() => {
      if (this.auth.isCustomer()) this.start();
      else this.stop();
    });
  }

  async refresh(): Promise<void> {
    if (!this.auth.isCustomer() || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
    try {
      this.unread.set(await this.api.getUnreadCount());
    } catch {
      // The counter is a convenience: a failed refresh keeps the last value.
    }
  }

  setUnread(value: number): void {
    this.unread.set(value);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private start(): void {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), unreadPollMs);
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.unread.set(0);
  }
}
