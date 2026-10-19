// Mirrors the API rules (the API stays the authority) so users see each problem next to its field before sending.
// Every rule returns '' when the value is valid, or a Spanish message.
import { todayInBogota } from '../dates';

export const productCategories = [
  'Alimentación', 'Aseo', 'Bebidas', 'Carnes', 'Carnes frías', 'Comidas preparadas', 'Despensa', 'Frutas y verduras',
  'Granos', 'Huevos', 'Lácteos', 'Panadería', 'Pescados y mariscos', 'Pollo', 'Snacks y dulces',
] as const;

export const maxPrice = 10_000_000;
export const maxStock = 100_000;
export const maxDiscount = 90;

const collapse = (value: string | null | undefined) => (value ?? '').trim().replace(/\s+/g, ' ');
const isInteger = (value: unknown) => value !== '' && value !== null && Number.isInteger(Number(value));

export const personName = (value: string): string => {
  const name = collapse(value);
  if (!name) return 'El nombre es obligatorio.';
  if (name.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (name.length > 60) return 'El nombre debe tener como máximo 60 caracteres.';
  if (!/^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u.test(name)) return 'El nombre solo puede tener letras, espacios, apóstrofes y guiones.';
  return '';
};

export const storeName = (value: string): string => {
  const name = collapse(value);
  if (!name) return 'El nombre de la tienda es obligatorio.';
  if (name.length < 2) return 'El nombre de la tienda debe tener al menos 2 caracteres.';
  if (name.length > 80) return 'El nombre de la tienda debe tener como máximo 80 caracteres.';
  if (!/^[\p{L}\p{M}\p{N} .,&'’-]+$/u.test(name)) return "El nombre de la tienda solo puede tener letras, números y los signos . , - & '";
  if (!/\p{L}/u.test(name)) return 'El nombre de la tienda debe tener al menos una letra.';
  return '';
};

export const neighborhood = (value: string): string => {
  const name = collapse(value);
  if (!name) return 'El barrio es obligatorio.';
  if (name.length < 2 || name.length > 80) return 'El barrio debe tener entre 2 y 80 caracteres.';
  if (!/^[\p{L}\p{M}\p{N} .,'’-]+$/u.test(name)) return "El barrio solo puede tener letras, números, espacios y los signos . , - '";
  return '';
};

export const address = (value: string): string => {
  const text = collapse(value);
  if (!text) return 'La dirección es obligatoria.';
  if (text.length < 5) return 'La dirección debe tener al menos 5 caracteres.';
  if (text.length > 200) return 'La dirección debe tener como máximo 200 caracteres.';
  return '';
};

export const phone = (value: string): string => {
  const digits = (value ?? '').replace(/[\s().-]/g, '').replace(/^(\+?57)(?=\d{10}$)/, '');
  if (!digits) return '';
  return /^3\d{9}$/.test(digits) || /^60[1-8]\d{7}$/.test(digits) ? '' : 'El teléfono debe ser un celular colombiano de 10 dígitos que empiece por 3, o un fijo como 601 2345678.';
};

export const email = (value: string): string => {
  const text = (value ?? '').trim();
  if (!text) return 'El correo electrónico es obligatorio.';
  if (text.length > 254) return 'El correo electrónico debe tener como máximo 254 caracteres.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text) ? '' : 'El correo electrónico no es válido.';
};

export const password = (value: string, accountEmail = ''): string => {
  const text = value ?? '';
  if (!text) return 'La contraseña es obligatoria.';
  if (text.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (text.length > 72 || new TextEncoder().encode(text).length > 72) return 'La contraseña debe tener como máximo 72 caracteres.';
  if (!/\p{L}/u.test(text)) return 'La contraseña debe tener al menos una letra.';
  if (!/\d/.test(text)) return 'La contraseña debe tener al menos un número.';
  if (accountEmail && text.trim().toLowerCase() === accountEmail.trim().toLowerCase()) return 'La contraseña no puede ser igual a tu correo.';
  return '';
};

export const productName = (value: string): string => {
  const name = collapse(value);
  if (!name) return 'El nombre del producto es obligatorio.';
  if (name.length < 2) return 'El nombre del producto debe tener al menos 2 caracteres.';
  if (name.length > 80) return 'El nombre del producto debe tener como máximo 80 caracteres.';
  if (!/\p{L}/u.test(name)) return 'El nombre del producto debe tener al menos una letra.';
  return '';
};

export const category = (value: string, allowed: readonly string[] = productCategories): string =>
  allowed.includes(value) ? '' : 'Elige una categoría de la lista.';

export const price = (value: unknown): string => {
  if (!isInteger(value)) return 'El precio debe ser un número entero de pesos.';
  const amount = Number(value);
  if (amount < 1) return 'El precio debe ser mayor que 0.';
  if (amount > maxPrice) return 'El precio no puede superar $ 10.000.000.';
  return '';
};

export const stock = (value: unknown): string => {
  if (!isInteger(value)) return 'El stock debe ser un número entero.';
  const amount = Number(value);
  if (amount < 0) return 'El stock no puede ser negativo.';
  if (amount > maxStock) return 'El stock no puede superar 100.000 unidades.';
  return '';
};

export const discount = (value: unknown): string => {
  if (!isInteger(value)) return 'El descuento debe ser un número entero.';
  const amount = Number(value);
  if (amount < 0) return 'El descuento no puede ser negativo.';
  if (amount > maxDiscount) return 'El descuento no puede superar el 90 %.';
  return '';
};

// When creating, the date cannot be in the past (Bogota calendar). When editing, any real date is accepted.
export const expirationDate = (value: string, creating: boolean, now: Date = new Date()): string => {
  if (!value) return 'La fecha de vencimiento es obligatoria.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'La fecha debe tener el formato AAAA-MM-DD.';
  // Same check as the API: days like 2026-02-30 do not exist.
  const [year, month, day] = value.split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== value) return 'La fecha no es válida.';
  if (creating && value < todayInBogota(now)) return 'La fecha de vencimiento no puede estar en el pasado.';
  return '';
};

export const latitude = (value: unknown): string => {
  if (value === null || value === '' || value === undefined) return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'La latitud debe ser un número.';
  return number < -4.3 || number > 13.6 ? 'La latitud debe estar dentro de Colombia (entre -4,3 y 13,6).' : '';
};

export const longitude = (value: unknown): string => {
  if (value === null || value === '' || value === undefined) return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'La longitud debe ser un número.';
  return number < -82 || number > -66.8 ? 'La longitud debe estar dentro de Colombia (entre -82 y -66,8).' : '';
};

export const hasErrors = (errors: Record<string, string>) => Object.values(errors).some(Boolean);
