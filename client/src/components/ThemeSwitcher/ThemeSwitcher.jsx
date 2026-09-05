import { useState } from 'react';
import { FiCheck, FiMoon, FiSun } from 'react-icons/fi';
import { Modal, ModalHeader, Badge, SearchInput, ScrollArea } from '../ui';
import { themes } from '../../theme/tokens';
import { cn } from '../../theme/utilities';

const ModeIcon = ({ mode }) => (mode === 'light' ? <FiSun size={16} /> : <FiMoon size={16} />);

export default function ThemeSwitcher({ currentTheme, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = themes.filter((theme) => theme.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader title="Theme" subtitle="Choose between light and dark" onClose={onClose} />

      <div className="px-5 pt-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search themes..." />
      </div>

      <ScrollArea className="max-h-[430px] px-5 pb-5 pt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((theme) => {
            const isActive = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onSelect(theme.id)}
                className={cn(
                  'interactive relative overflow-hidden rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 dark:focus-visible:ring-focus-dark/60',
                  isActive ? 'border-primary dark:border-primary-dark bg-selection/15 dark:bg-selection-dark/15' : 'border-border/25 dark:border-border-dark/25 bg-surface/70 dark:bg-surface-dark/70 hover:bg-surface-elevated/75 dark:hover:bg-surface-elevated-dark/75',
                )}
                aria-label={`${theme.name} theme`}
                aria-pressed={isActive}
                type="button"
              >
                <div className="mb-3 flex h-16 items-end gap-2 rounded-lg border border-border/20 dark:border-border-dark/20 bg-background/75 dark:bg-background-dark/75 p-2">
                  <span className="h-9 flex-1 rounded-md bg-surface/80 dark:bg-surface-dark/80" />
                  <span className="h-12 flex-[1.4] rounded-md bg-surface-elevated/90 dark:bg-surface-elevated-dark/90" />
                  <span className="size-5 rounded-full bg-primary dark:bg-primary-dark" />
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-primary dark:text-primary-dark"><ModeIcon mode={theme.mode} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold text-text-primary dark:text-text-primary-dark">{theme.name}</span>
                    <span className="block text-label text-text-secondary dark:text-text-secondary-dark">{theme.description}</span>
                  </span>
                  {isActive ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark"><FiCheck size={13} /></span>
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
