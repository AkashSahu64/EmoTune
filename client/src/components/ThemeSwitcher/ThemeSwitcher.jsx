import { useState } from 'react';
import { FiCheck, FiMonitor, FiMoon, FiSun } from 'react-icons/fi';
import { Modal, ModalHeader, Toggle, Badge, SearchInput, ScrollArea } from '../ui';
import { themes } from '../../theme/tokens';
import { cn } from '../../theme/utilities';

const ModeIcon = ({ mode }) => mode === 'system'
  ? <FiMonitor size={16} />
  : mode === 'light' ? <FiSun size={16} /> : <FiMoon size={16} />;

export default function ThemeSwitcher({ currentTheme, onSelect, onClose, emotionThemeEnabled, onToggleEmotionTheme }) {
  const [search, setSearch] = useState('');
  const filtered = themes.filter((theme) => theme.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader title="Theme Gallery" subtitle="Every theme is powered by shared semantic tokens" onClose={onClose} />

      <div className="px-5 pt-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search themes..." />
      </div>

      {onToggleEmotionTheme && (
        <div className="glass-elevated mx-5 mt-4 flex items-center justify-between rounded-lg px-3.5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-ai/14 text-ai"><FiSun size={16} /></span>
            <div>
              <p className="text-body font-medium text-text-primary">Emotion auto-theme</p>
              <p className="text-label text-text-secondary">Adapts accent tokens to conversation mood</p>
            </div>
          </div>
          <Toggle value={emotionThemeEnabled} onChange={onToggleEmotionTheme} label="Emotion auto-theme" />
        </div>
      )}

      <ScrollArea className="max-h-[430px] px-5 pb-5 pt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((theme) => {
            const isActive = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                data-theme={theme.id === 'system' ? undefined : theme.id}
                onClick={() => onSelect(theme.id)}
                className={cn(
                  'interactive relative overflow-hidden rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60',
                  isActive ? 'border-primary bg-selection/15' : 'border-border/25 bg-surface/70 hover:bg-surface-elevated/75',
                )}
                aria-label={`${theme.name} theme`}
                aria-pressed={isActive}
                type="button"
              >
                <div className="mb-3 flex h-16 items-end gap-2 rounded-lg border border-border/20 bg-background/75 p-2">
                  <span className="h-9 flex-1 rounded-md bg-surface/80" />
                  <span className="h-12 flex-[1.4] rounded-md bg-surface-elevated/90" />
                  <span className="size-5 rounded-full bg-primary" />
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-primary"><ModeIcon mode={theme.mode} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold text-text-primary">{theme.name}</span>
                    <span className="block text-label text-text-secondary">{theme.description}</span>
                  </span>
                  {isActive ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-on-primary"><FiCheck size={13} /></span>
                  ) : theme.featured ? <Badge variant="glass">Featured</Badge> : null}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </Modal>
  );
}
