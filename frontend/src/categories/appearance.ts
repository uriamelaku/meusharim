import {
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Coins,
  Droplet,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  type LucideIcon,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  Undo2,
  Utensils,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react'

// Keep both lists in sync with backend/app/categories/schemas.py.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'shopping-basket': ShoppingBasket,
  utensils: Utensils,
  house: House,
  receipt: Receipt,
  car: Car,
  bus: Bus,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  baby: Baby,
  smartphone: Smartphone,
  'shield-check': ShieldCheck,
  plane: Plane,
  gift: Gift,
  ellipsis: Ellipsis,
  briefcase: Briefcase,
  store: Store,
  coins: Coins,
  undo: Undo2,
  coffee: Coffee,
  shirt: Shirt,
  dumbbell: Dumbbell,
  'graduation-cap': GraduationCap,
  'paw-print': PawPrint,
  fuel: Fuel,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  sparkles: Sparkles,
  'book-open': BookOpen,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
  wrench: Wrench,
}

/** Screen reader names for the icon picker. */
export const ICON_LABELS: Record<string, string> = {
  'shopping-basket': 'סל קניות',
  utensils: 'סכו"ם',
  house: 'בית',
  receipt: 'קבלה',
  car: 'רכב',
  bus: 'אוטובוס',
  'shopping-bag': 'שקית קניות',
  'heart-pulse': 'בריאות',
  baby: 'תינוק',
  smartphone: 'טלפון',
  'shield-check': 'מגן',
  plane: 'מטוס',
  gift: 'מתנה',
  ellipsis: 'שונות',
  briefcase: 'תיק עבודה',
  store: 'חנות',
  coins: 'מטבעות',
  undo: 'החזר',
  coffee: 'קפה',
  shirt: 'חולצה',
  dumbbell: 'כושר',
  'graduation-cap': 'לימודים',
  'paw-print': 'חיות מחמד',
  fuel: 'דלק',
  wifi: 'אינטרנט',
  zap: 'חשמל',
  droplet: 'מים',
  sparkles: 'טיפוח',
  'book-open': 'ספר',
  'piggy-bank': 'חיסכון',
  landmark: 'בנק',
  wrench: 'תיקונים',
}

type ColorTones = { tint: string; ink: string; solid: string }

/**
 * Light and dark tones per color. `ink` passes 4.5:1 on `tint` in both themes;
 * `solid` is for charts. The browser picks the tone through CSS light-dark(), which
 * follows the color-scheme set by the theme switch.
 */
const TONES: Record<string, { label: string; light: ColorTones; dark: ColorTones }> = {
  plum: { label: 'שזיף', light: { tint: '#e6e0fa', ink: '#4b3a99', solid: '#7b67e0' }, dark: { tint: '#30364d', ink: '#b3a6f5', solid: '#8f7ef0' } },
  rose: { label: 'ורד', light: { tint: '#ffe0e6', ink: '#9a2846', solid: '#e0577a' }, dark: { tint: '#483235', ink: '#f59bb2', solid: '#ec6f8f' } },
  pink: { label: 'ורוד', light: { tint: '#fbddec', ink: '#8f2a5e', solid: '#e5649f' }, dark: { tint: '#49353e', ink: '#f59cc6', solid: '#ec7cb0' } },
  red: { label: 'אדום', light: { tint: '#fcdcdc', ink: '#9b2525', solid: '#e05252' }, dark: { tint: '#48312b', ink: '#f59393', solid: '#ec6b6b' } },
  orange: { label: 'כתום', light: { tint: '#ffe0cc', ink: '#9c3d0a', solid: '#ff7a33' }, dark: { tint: '#4f3a24', ink: '#ffab7d', solid: '#ff8a4c' } },
  amber: { label: 'ענבר', light: { tint: '#fcebc4', ink: '#714d00', solid: '#f2b33d' }, dark: { tint: '#4c4826', ink: '#f7cf7f', solid: '#f5c05a' } },
  green: { label: 'ירוק', light: { tint: '#ddf0d0', ink: '#2f6b1f', solid: '#67b04a' }, dark: { tint: '#2b4729', ink: '#9fd885', solid: '#7cc35c' } },
  teal: { label: 'טורקיז', light: { tint: '#cff1e6', ink: '#12634e', solid: '#2fb58e' }, dark: { tint: '#1e483a', ink: '#6fdbb9', solid: '#46c79f' } },
  cyan: { label: 'תכלת', light: { tint: '#d3f0f0', ink: '#16615f', solid: '#2aa7a3' }, dark: { tint: '#1c453f', ink: '#6fd3cf', solid: '#3fbdb8' } },
  sky: { label: 'שמיים', light: { tint: '#d9eafb', ink: '#1f5487', solid: '#4d93d9' }, dark: { tint: '#25404c', ink: '#8fc0f0', solid: '#6aa8e6' } },
  blue: { label: 'כחול', light: { tint: '#dde3fb', ink: '#2c3f94', solid: '#5b74e0' }, dark: { tint: '#28394d', ink: '#9eb0f5', solid: '#7189ec' } },
  indigo: { label: 'אינדיגו', light: { tint: '#e4e0fa', ink: '#3e338c', solid: '#6a5ad6' }, dark: { tint: '#2c324b', ink: '#ada3f3', solid: '#8a7ce8' } },
  slate: { label: 'אפור כחלחל', light: { tint: '#e3e8ee', ink: '#3a4757', solid: '#6e7d90' }, dark: { tint: '#2d3b3a', ink: '#b3bfcc', solid: '#8f9db0' } },
  stone: { label: 'אבן', light: { tint: '#ede5da', ink: '#5e5145', solid: '#a89379' }, dark: { tint: '#3b4035', ink: '#d4c3ae', solid: '#bba78f' } },
}

const both = (light: string, dark: string) => `light-dark(${light}, ${dark})`

export const CATEGORY_COLORS: Record<
  string,
  { tint: string; ink: string; solid: string; label: string }
> = Object.fromEntries(
  Object.entries(TONES).map(([key, { label, light, dark }]) => [
    key,
    {
      label,
      tint: both(light.tint, dark.tint),
      ink: both(light.ink, dark.ink),
      solid: both(light.solid, dark.solid),
    },
  ]),
)

const FALLBACK_COLOR = CATEGORY_COLORS.stone

export function categoryColor(key: string) {
  return CATEGORY_COLORS[key] ?? FALLBACK_COLOR
}

export function categoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] ?? Ellipsis
}
