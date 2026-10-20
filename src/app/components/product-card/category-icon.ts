import type { IconName } from '../icon/icon.component';

// Tono del sello de la categoría: un color de la paleta, para que se adapte a los temas claro y oscuro.
export type CategoryTone = 'tomato' | 'corn' | 'blue' | 'cream';

export interface CategoryIcon {
  icon: IconName;
  tone: CategoryTone;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Palabra clave → ícono. Gana la primera palabra que aparece en la categoría, así que las más específicas van primero.
const icons: Array<{ keywords: string[]; icon: CategoryIcon }> = [
  { keywords: ['huevo'], icon: { icon: 'egg', tone: 'corn' } },
  { keywords: ['lacteo', 'leche', 'queso', 'yogur'], icon: { icon: 'milk', tone: 'blue' } },
  { keywords: ['panaderia', 'pan', 'arepa'], icon: { icon: 'bread', tone: 'corn' } },
  { keywords: ['fruta', 'verdura', 'hortaliza'], icon: { icon: 'leaf', tone: 'tomato' } },
  { keywords: ['pescado', 'marisco'], icon: { icon: 'fish', tone: 'blue' } },
  { keywords: ['carne', 'pollo', 'embutido'], icon: { icon: 'meat', tone: 'tomato' } },
  { keywords: ['comida', 'preparad'], icon: { icon: 'basket', tone: 'tomato' } },
  { keywords: ['grano', 'arroz', 'frijol', 'cereal'], icon: { icon: 'grain', tone: 'corn' } },
  { keywords: ['bebida', 'jugo', 'gaseosa'], icon: { icon: 'drink', tone: 'blue' } },
  { keywords: ['aseo', 'limpieza'], icon: { icon: 'soap', tone: 'blue' } },
  { keywords: ['snack', 'dulce'], icon: { icon: 'candy', tone: 'tomato' } },
  { keywords: ['despensa', 'abarrote', 'untable', 'enlatado'], icon: { icon: 'can', tone: 'cream' } },
];

const fallbackIcon: CategoryIcon = { icon: 'basket', tone: 'cream' };

export const iconForCategory = (category: string | null | undefined): CategoryIcon => {
  const text = normalize(category ?? '');
  return icons.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))?.icon ?? fallbackIcon;
};
