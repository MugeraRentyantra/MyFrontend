import {
  Boxes,
  Building2,
  Code2,
  Coffee,
  Cpu,
  Database,
  Globe,
  HeartPulse,
  Hexagon,
  Landmark,
  Layers,
  Shield,
  ShoppingBag,
  Smartphone,
  Terminal,
  Workflow,
} from '@/shared/icons';

/**
 * Decorative visuals (icon + gradient) for designations and domains, keyed by slug.
 * Unknown slugs get a deterministic fallback so a new designation still looks intentional.
 * Class names are complete strings so Tailwind keeps them.
 */

const DESIGNATION_VISUALS = {
  'java-developer': {
    icon: Coffee,
    gradient: 'from-orange-500 to-amber-400',
    tint: 'bg-orange-50 text-orange-700',
  },
  'full-stack-developer': {
    icon: Layers,
    gradient: 'from-brand-600 to-sky-500',
    tint: 'bg-brand-50 text-brand-700',
  },
  'dotnet-developer': {
    icon: Hexagon,
    gradient: 'from-violet-600 to-indigo-500',
    tint: 'bg-violet-50 text-violet-700',
  },
  'devops-engineer': {
    icon: Workflow,
    gradient: 'from-teal-600 to-cyan-500',
    tint: 'bg-teal-50 text-teal-700',
  },
  'data-engineer': {
    icon: Database,
    gradient: 'from-sky-600 to-cyan-400',
    tint: 'bg-sky-50 text-sky-700',
  },
};

const DESIGNATION_FALLBACKS = [
  { icon: Code2, gradient: 'from-indigo-600 to-brand-500', tint: 'bg-indigo-50 text-indigo-700' },
  { icon: Cpu, gradient: 'from-fuchsia-600 to-violet-500', tint: 'bg-fuchsia-50 text-fuchsia-700' },
  { icon: Terminal, gradient: 'from-slate-700 to-slate-500', tint: 'bg-slate-100 text-slate-700' },
  { icon: Boxes, gradient: 'from-cyan-600 to-teal-500', tint: 'bg-cyan-50 text-cyan-700' },
];

const DOMAIN_VISUALS = {
  banking: { icon: Landmark, tint: 'bg-brand-50 text-brand-700' },
  healthcare: { icon: HeartPulse, tint: 'bg-rose-50 text-rose-700' },
  telecom: { icon: Smartphone, tint: 'bg-violet-50 text-violet-700' },
  'e-commerce': { icon: ShoppingBag, tint: 'bg-orange-50 text-orange-700' },
  insurance: { icon: Shield, tint: 'bg-teal-50 text-teal-700' },
};

const DOMAIN_FALLBACKS = [
  { icon: Building2, tint: 'bg-slate-100 text-slate-700' },
  { icon: Globe, tint: 'bg-sky-50 text-sky-700' },
];

function hashString(value = '') {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/** { icon, gradient, tint } for a designation (pass its slug; the name works as a fallback key). */
export function getDesignationVisual(slugOrName) {
  const key = String(slugOrName ?? '').toLowerCase();
  return DESIGNATION_VISUALS[key] ?? DESIGNATION_FALLBACKS[hashString(key) % DESIGNATION_FALLBACKS.length];
}

/** { icon, tint } for a domain (pass its slug). */
export function getDomainVisual(slugOrName) {
  const key = String(slugOrName ?? '').toLowerCase();
  return DOMAIN_VISUALS[key] ?? DOMAIN_FALLBACKS[hashString(key) % DOMAIN_FALLBACKS.length];
}
