// Photo banners of the home page. Empty by default: the home page shows its own SVG illustration instead.
// To add one, save the file in public/img (never link images from other sites), add it here and write its
// author, source and license in public/img/CREDITOS.md. Only free licenses (Unsplash or Pexels).
export interface Banner {
  // Path inside public, for example 'img/mercado-fruta.webp'.
  src: string;
  // What the photo shows, in Spanish, for screen readers.
  alt: string;
  // Short visible credit, for example 'Foto: Ana Pérez en Unsplash'.
  credit: string;
}

export const homeBanners: readonly Banner[] = [];
