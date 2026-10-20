import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<main class="auth-page">
  <section class="auth-card" aria-live="polite">
    <span class="eyebrow">Correo nuevo</span>
    <h1>Confirmación de correo</h1>
    @if (loading()) {
      <p role="status">Confirmando tu correo…</p>
    } @else if (failure()) {
      <p class="form-message failure" role="alert">{{ failure() }}</p>
      <a routerLink="/perfil">Volver a mi perfil</a>
    } @else {
      <p class="form-message success" role="status">{{ message() }}</p>
      <a class="button" routerLink="/login">Iniciar sesión</a>
    }
  </section>
</main>`,
})
export class ConfirmEmailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';
  readonly loading = signal(true);
  readonly message = signal('');
  readonly failure = signal('');

  async ngOnInit() {
    if (!this.token) {
      this.failure.set('El enlace está incompleto. Pide de nuevo el cambio de correo desde tu perfil.');
      this.loading.set(false);
      return;
    }
    try {
      this.message.set((await this.api.confirmEmailChange(this.token)).message);
      // El correo cambió, así que la sesión vieja ya no es válida en el servidor.
      this.auth.endSession();
    } catch (caught) {
      this.failure.set(caught instanceof Error ? caught.message : 'No se pudo confirmar el correo.');
    } finally {
      this.loading.set(false);
    }
  }
}
