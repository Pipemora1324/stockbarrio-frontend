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
  // With <base href="/"> a plain "#main-content" link would change the route, so move the focus by hand.
  skipToContent(event: Event) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
}
