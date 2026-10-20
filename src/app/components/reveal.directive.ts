import { DestroyRef, Directive, ElementRef, inject, OnInit } from '@angular/core';

// Hace aparecer el contenido cuando entra en pantalla. Sin IntersectionObserver, o con prefers-reduced-motion,
// el contenido se muestra de una vez (styles.scss también quita el movimiento con movimiento reducido).
@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class RevealDirective implements OnInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    const view = this.element.ownerDocument.defaultView;
    const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced || typeof view?.IntersectionObserver !== 'function') {
      this.element.classList.add('is-visible');
      return;
    }
    const observer = new view.IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.element.classList.add('is-visible');
        observer.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    observer.observe(this.element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
