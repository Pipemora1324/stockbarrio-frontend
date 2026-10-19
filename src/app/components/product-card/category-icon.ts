export interface CategoryIcon {
  icon: string;
  background: string;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Keyword → icon. The first keyword found in the category wins, so more specific words go first.
const icons: Array<{ keywords: string[]; icon: CategoryIcon }> = [
  { keywords: ['huevo'], icon: { icon: '🥚', background: '#fff4dc' } },
  { keywords: ['lacteo', 'leche', 'queso', 'yogur'], icon: { icon: '🥛', background: '#eaf3ff' } },
  { keywords: ['panaderia', 'pan', 'arepa'], icon: { icon: '🍞', background: '#fbefe2' } },
  { keywords: ['fruta', 'verdura', 'hortaliza'], icon: { icon: '🥬', background: '#e8f6ea' } },
  { keywords: ['carne', 'pollo', 'embutido', 'pescado'], icon: { icon: '🥩', background: '#fdecec' } },
  { keywords: ['grano', 'arroz', 'frijol', 'cereal'], icon: { icon: '🌾', background: '#f6f1e3' } },
  { keywords: ['bebida', 'jugo', 'gaseosa'], icon: { icon: '🧃', background: '#eef3ff' } },
  { keywords: ['aseo', 'limpieza'], icon: { icon: '🧴', background: '#eef6f7' } },
  { keywords: ['despensa', 'abarrote', 'untable', 'enlatado'], icon: { icon: '🥫', background: '#f3efe8' } },
];

const fallbackIcon: CategoryIcon = { icon: '🛒', background: '#edf6f2' };

export const iconForCategory = (category: string | null | undefined): CategoryIcon => {
  const text = normalize(category ?? '');
  return icons.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))?.icon ?? fallbackIcon;
};
