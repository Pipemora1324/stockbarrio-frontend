// Banners fotográficos del inicio. Vacío por defecto: el inicio muestra su propia ilustración en SVG.
// Para agregar uno, guarda el archivo en public/img (nunca enlaces imágenes de otros sitios), agrégalo aquí y escribe
// su autor, su fuente y su licencia en public/img/CREDITOS.md. Solo licencias libres (Unsplash o Pexels).
export interface Banner {
  // Ruta dentro de public, por ejemplo 'img/mercado-fruta.webp'.
  src: string;
  // Qué muestra la foto, en español, para los lectores de pantalla.
  alt: string;
  // Crédito visible corto, por ejemplo 'Foto: Ana Pérez en Unsplash'.
  credit: string;
}

export const homeBanners: readonly Banner[] = [];
