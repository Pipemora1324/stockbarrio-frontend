import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Con <base href="/"> un enlace "#main-content" normal cambiaría la ruta, así que el foco se mueve a mano.
  skipToContent(event: Event) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
}
