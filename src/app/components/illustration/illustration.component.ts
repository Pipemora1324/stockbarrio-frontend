import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IllustrationName = 'stall' | 'empty-basket' | 'empty-store' | 'empty-tag' | 'chat';

// Ilustraciones propias dibujadas con las variables de la paleta, así siguen los temas claro y oscuro.
// Son decorativas: el texto de al lado siempre dice lo mismo.
@Component({
  selector: 'app-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[class]': '"illustration illustration-" + name()' },
  styles: [
    `:host { display: block; }
     svg { width: 100%; height: auto; overflow: visible; }
     .ink { fill: var(--color-ink); } .ink-line { stroke: var(--color-ink); }
     .tomato { fill: var(--color-primary); } .corn { fill: var(--color-corn); } .blue { fill: var(--color-blue); }
     .cream { fill: var(--color-surface); } .paper { fill: var(--color-surface-2); } .line { stroke: var(--color-border-strong); }
     .awning-a { fill: var(--illustration-awning-a); } .awning-b { fill: var(--illustration-awning-b); }
     .swing { transform-origin: 300px 150px; animation: swing 4s ease-in-out infinite; }
     @keyframes swing { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
     @media (prefers-reduced-motion: reduce) { .swing { animation: none; } }`,
  ],
  template: `
@switch (name()) {
  @case ('stall') {
    <svg viewBox="0 0 420 320" role="presentation">
      <rect class="paper" x="20" y="250" width="380" height="18" rx="9" />
      <rect class="ink" x="70" y="96" width="10" height="160" rx="3" />
      <rect class="ink" x="340" y="96" width="10" height="160" rx="3" />
      <path class="awning-a" d="M52 60h316l20 46H32z" />
      @for (stripe of stripes; track stripe) { <path class="awning-b" [attr.d]="'M' + (52 + stripe * 63) + ' 60h31l10 46H' + (42 + stripe * 63) + 'z'" /> }
      <path class="awning-a" d="M32 106h356v16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16c0 10-8 16-18 16s-18-6-18-16z" />
      <rect class="cream" x="92" y="176" width="236" height="76" rx="8" />
      <rect class="ink" x="92" y="176" width="236" height="10" rx="4" />
      <rect class="paper" x="104" y="196" width="66" height="44" rx="6" />
      <rect class="paper" x="178" y="196" width="66" height="44" rx="6" />
      <rect class="paper" x="252" y="196" width="66" height="44" rx="6" />
      <circle class="tomato" cx="122" cy="170" r="17" /><circle class="tomato" cx="146" cy="166" r="15" /><circle class="tomato" cx="134" cy="152" r="13" />
      <ellipse class="corn" cx="206" cy="164" rx="12" ry="24" transform="rotate(-24 206 164)" /><ellipse class="corn" cx="228" cy="162" rx="12" ry="24" transform="rotate(18 228 162)" />
      <path class="blue" d="M268 150h40v30h-40z" /><rect class="cream" x="276" y="158" width="24" height="7" rx="3" />
      <g class="swing">
        <path class="ink-line" d="M300 122v22" stroke-width="3" fill="none" />
        <path class="corn" d="M276 150h48l14 22-14 22h-48z" />
        <circle class="ink" cx="290" cy="172" r="4" />
        <path class="ink" d="M302 165h20v4h-20zM302 175h14v4h-14z" />
      </g>
    </svg>
  }
  @case ('empty-basket') {
    <svg viewBox="0 0 200 150" role="presentation">
      <ellipse class="paper" cx="100" cy="132" rx="78" ry="10" />
      <path class="tomato" d="M30 62h140l-14 66H44z" />
      <path class="awning-b" d="M44 76h112M48 94h104M52 112h96" stroke="var(--illustration-awning-b)" stroke-width="5" fill="none" />
      <path class="ink-line" d="M62 62c0-30 76-30 76 0" stroke-width="7" fill="none" stroke-linecap="round" />
      <circle class="corn" cx="160" cy="34" r="9" /><circle class="corn" cx="40" cy="40" r="5" />
    </svg>
  }
  @case ('empty-store') {
    <svg viewBox="0 0 200 150" role="presentation">
      <ellipse class="paper" cx="100" cy="134" rx="80" ry="9" />
      <rect class="cream" x="38" y="58" width="124" height="74" rx="6" />
      <path class="awning-a" d="M30 36h140l8 24H22z" />
      <path class="awning-b" d="M58 36h20l3 24H55zM100 36h20l3 24h-26z" />
      <rect class="ink" x="84" y="88" width="32" height="44" rx="3" />
      <rect class="corn" x="56" y="76" width="22" height="18" rx="3" /><rect class="corn" x="122" y="76" width="22" height="18" rx="3" />
      <rect class="blue" x="70" y="104" width="60" height="16" rx="8" transform="rotate(-8 100 112)" />
    </svg>
  }
  @case ('empty-tag') {
    <svg viewBox="0 0 200 150" role="presentation">
      <ellipse class="paper" cx="100" cy="134" rx="70" ry="9" />
      <path class="corn" d="M58 40h96l26 40-26 40H58z" transform="rotate(-8 110 80)" />
      <circle class="cream" cx="80" cy="84" r="9" />
      <path class="ink" d="M100 68h50v8h-50zM100 86h34v8h-34z" transform="rotate(-8 110 80)" />
      <path class="ink-line" d="M80 84C60 70 44 52 46 30" stroke-width="3" fill="none" />
    </svg>
  }
  @case ('chat') {
    <svg viewBox="0 0 200 150" role="presentation">
      <path class="tomato" d="M24 26h104a12 12 0 0 1 12 12v44a12 12 0 0 1-12 12H62l-24 20V94H24a12 12 0 0 1-12-12V38a12 12 0 0 1 12-12z" />
      <path class="corn" d="M96 64h78a10 10 0 0 1 10 10v34a10 10 0 0 1-10 10h-8v16l-20-16H96a10 10 0 0 1-10-10V74a10 10 0 0 1 10-10z" />
      <circle class="cream" cx="46" cy="60" r="7" /><circle class="cream" cx="70" cy="60" r="7" /><circle class="cream" cx="94" cy="60" r="7" />
      <path class="ink" d="M106 84h56v7h-56zM106 98h36v7h-36z" />
    </svg>
  }
}`,
})
export class IllustrationComponent {
  readonly name = input.required<IllustrationName>();
  protected readonly stripes = [0, 1, 2, 3, 4];
}
