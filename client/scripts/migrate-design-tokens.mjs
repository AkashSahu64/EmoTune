import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

const colorMap = new Map([
  ['#0B1120', 'var(--theme-bg)'],
  ['#0B0F19', 'var(--theme-bg)'],
  ['#121826', 'var(--theme-surface)'],
  ['#181F2F', 'var(--theme-surface-elevated)'],
  ['#1E293B', 'var(--theme-surface-elevated)'],
  ['#202C33', 'var(--theme-surface-elevated)'],
  ['#252F45', 'var(--theme-border)'],
  ['#F8FAFC', 'var(--theme-text)'],
  ['#E5E7EB', 'var(--theme-text)'],
  ['#CBD5E1', 'var(--theme-text-secondary)'],
  ['#94A3B8', 'var(--theme-text-secondary)'],
  ['#64748B', 'var(--theme-text-secondary)'],
  ['#475569', 'var(--theme-muted)'],
  ['#3B82F6', 'var(--theme-primary)'],
  ['#2563EB', 'var(--theme-primary)'],
  ['#1D4ED8', 'var(--theme-primary)'],
  ['#60A5FA', 'var(--theme-primary)'],
  ['#6366F1', 'var(--theme-primary)'],
  ['#8B5CF6', 'var(--color-ai)'],
  ['#7C3AED', 'var(--color-ai)'],
  ['#EC4899', 'var(--color-ai)'],
  ['#22C55E', 'var(--theme-success)'],
  ['#16A34A', 'var(--theme-success)'],
  ['#34A853', 'var(--theme-success)'],
  ['#F59E0B', 'var(--theme-warning)'],
  ['#FBBC05', 'var(--theme-warning)'],
  ['#EF4444', 'var(--theme-danger)'],
  ['#EA4335', 'var(--theme-danger)'],
  ['#06B6D4', 'var(--color-ghost)'],
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function migrateColors(source) {
  let output = source;
  for (const [hex, token] of colorMap) {
    output = output.replaceAll(`[${hex}]`, `[${token}]`);
    output = output.replaceAll(`[${hex.toLowerCase()}]`, `[${token}]`);
    output = output.replaceAll(`'${hex}'`, `'${token}'`);
    output = output.replaceAll(`"${hex}"`, `"${token}"`);
    output = output.replaceAll(`'${hex.toLowerCase()}'`, `'${token}'`);
    output = output.replaceAll(`"${hex.toLowerCase()}"`, `"${token}"`);
  }
  return output;
}

function migrateGradients(source) {
  return source
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-(?:green|emerald)-[^\s"'`}]+\s+to-(?:green|teal)-[^\s"'`}]+/g, 'bg-success')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-(?:yellow|orange)-[^\s"'`}]+\s+to-(?:orange|pink)-[^\s"'`}]+/g, 'bg-warning')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-(?:purple|violet)-[^\s"'`}]+\s+to-(?:pink|purple)-[^\s"'`}]+/g, 'bg-ai')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-\[var\(--theme-secondary\)\][^\s"'`}]*\s+to-\[var\(--theme-accent\)\][^\s"'`}]+/g, 'bg-secondary')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-\[var\(--theme-primary\)\][^\s"'`}]*\s+to-\[var\(--theme-(?:accent|secondary|primary)\)\][^\s"'`}]+/g, 'bg-primary')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-\[var\(--theme-primary\)\][^\s"'`}]*\s+via-[^\s"'`}]+\s+to-\[var\(--theme-primary\)\][^\s"'`}]+/g, 'bg-primary')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-transparent\s+via-\[var\(--theme-border\)\]\s+to-transparent/g, 'bg-[var(--theme-border)]')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-transparent\s+via-[^\s"'`}]+\s+to-transparent/g, 'bg-border/30')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)\s+from-[^\s"'`}]+(?:\s+via-[^\s"'`}]+)?\s+to-[^\s"'`}]+/g, 'bg-primary')
    .replace(/bg-gradient-to-(?:r|l|t|b|br|bl|tr|tl)/g, 'bg-surface-elevated')
    .replace(/\s+(?:from|via|to|hover:from|hover:via|hover:to)-[^\s"'`}]+/g, '')
    .replace(/bg-clip-text\s+text-transparent/g, 'text-primary');
}

function migrateSemanticClasses(source) {
  const classTokens = [
    ['bg', '--theme-surface-elevated', 'bg-surface-elevated', true],
    ['bg', '--theme-surface', 'bg-surface', true],
    ['bg', '--theme-bg-secondary', 'bg-surface', true],
    ['bg', '--theme-bg', 'bg-background', false],
    ['bg', '--theme-primary', 'bg-primary', false],
    ['bg', '--theme-secondary', 'bg-secondary', false],
    ['bg', '--theme-danger', 'bg-danger', false],
    ['bg', '--theme-success', 'bg-success', false],
    ['bg', '--theme-warning', 'bg-warning', false],
    ['border', '--theme-border', 'border-border', false],
    ['border', '--theme-primary', 'border-primary', false],
    ['border', '--theme-danger', 'border-danger', false],
    ['text', '--theme-text-secondary', 'text-text-secondary', false],
    ['text', '--theme-text', 'text-text-primary', false],
    ['text', '--theme-primary', 'text-primary', false],
    ['text', '--theme-secondary', 'text-secondary', false],
    ['text', '--theme-danger', 'text-danger', false],
    ['text', '--theme-success', 'text-success', false],
    ['text', '--theme-warning', 'text-warning', false],
    ['ring', '--theme-primary', 'ring-focus', false],
    ['ring', '--theme-focus', 'ring-focus', false],
    ['placeholder', '--theme-text-secondary', 'placeholder:text-placeholder', false],
  ];

  let output = source;
  for (const [prefix, variable, replacement, glass] of classTokens) {
    const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(`${prefix}-\\[var\\(${escaped}\\)\\](?:\\/(\\d+))?`, 'g');
    output = output.replace(matcher, (_, opacity) => `${replacement}${opacity ? `/${opacity}` : ''}${glass ? ' backdrop-blur-glass' : ''}`);
  }

  return output
    .replaceAll('hover:bg-[var(--theme-hover)]', 'hover:bg-hover/[0.07]')
    .replaceAll('active:bg-[var(--theme-pressed)]', 'active:bg-hover/[0.11]')
    .replaceAll('bg-[var(--theme-selected)]', 'bg-selection/15')
    .replaceAll('text-[var(--theme-muted)]', 'text-text-muted')
    .replaceAll('focus:ring-[var(--theme-primary)]', 'focus:ring-focus/50')
    .replaceAll('focus:border-[var(--theme-primary)]', 'focus:border-focus/60');
}

function migrateMotion(source) {
  return source
    .replace(/\s+whileHover=\{\{[^}]*\}\}/g, '')
    .replace(/\s+whileTap=\{\{[^}]*\}\}/g, '')
    .replace(/\s+whileTap=\{[^\n]*\?\s*\{[^}]*\}\s*:\s*\{[^}]*\}\}/g, '')
    .replace(/\s*scale:\s*\[[^\]]*\]\s*,?/g, '')
    .replace(/\s*scale:\s*[^,}\n]+\s*,?/g, '')
    .replace(/\s*rotate:\s*\[[^\]]*\]\s*,?/g, '')
    .replace(/\s*rotate:\s*[^,}\n]+\s*,?/g, '')
    .replace(/\s+whileHover=\{\{\s*transition:\s*\{[^}]*\}\s*\}\}/g, '')
    .replace(/\s+whileHover=\{[^\n]*\?\s*\{[^}]*\}\s*:\s*\{[^}]*\}\}/g, '')
    .replaceAll('animate-bounce', 'animate-fade-in')
    .replaceAll('active:scale-[0.98]', '')
    .replaceAll('transition-all', 'transition-colors')
    .replaceAll('duration-300', 'duration-normal')
    .replaceAll('duration-500', 'duration-normal')
    .replaceAll('shadow-2xl', 'shadow-floating')
    .replaceAll('shadow-xl', 'shadow-lg')
    .replace(/(?:backdrop-blur-glass\s+){2,}/g, 'backdrop-blur-glass ');
}

function repairRemovedMotionProperties(source) {
  return source.replace(/\bopacit\b/g, '').replace(/\bdela\b/g, '');
}

for (const file of walk(sourceRoot).filter((item) => extensions.has(path.extname(item)))) {
  const before = fs.readFileSync(file, 'utf8');
  const after = repairRemovedMotionProperties(migrateMotion(migrateSemanticClasses(migrateGradients(migrateColors(before)))));
  if (after !== before) fs.writeFileSync(file, after, 'utf8');
}
