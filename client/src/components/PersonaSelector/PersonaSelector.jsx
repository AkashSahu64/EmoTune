import { useState, useRef, useEffect, memo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { usePersona } from '../../hooks/usePersona';
import { FiChevronDown, FiUser } from 'react-icons/fi';

const TONE_EMOJIS = {
  professional: '💼',
  casual: '😊',
  romantic: '❤️',
  humorous: '😂',
  custom: '🎭',
};

function PersonaSelector() {
  const { personas, activePersona, setActivePersona, clearActivePersona } = usePersona();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark ${
          activePersona
            ? 'bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark text-primary dark:text-primary-dark'
            : 'text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]'
        }`}
        title={activePersona ? `Active: ${activePersona.name}` : 'Select Persona'}
        aria-label={activePersona ? `Active persona: ${activePersona.name}` : 'Select persona'}
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button"
      >
        <span aria-hidden="true">{activePersona ? TONE_EMOJIS[activePersona.tone] || '🎭' : '🎭'}</span>
        <span className="hidden md:inline">{activePersona ? activePersona.name : 'Persona'}</span>
        <FiChevronDown size={12} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-full left-0 mb-2 w-56 z-50"
            key="persona-dropdown"
            initial={{ }}
            animate={{ }}
            exit={{ }}
          >
            <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl p-2 max-h-64 overflow-y-auto scrollbar-glass" role="menu" aria-label="Persona selection">
              <button
                onClick={() => { clearActivePersona(); setIsOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus dark:focus:ring-focus-dark ${
                  !activePersona
                    ? 'bg-primary dark:bg-primary-dark text-white'
                    : 'text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]'
                }`}
                role="menuitem"
                aria-pressed={!activePersona}
                type="button"
              >
                <FiUser size={14} aria-hidden="true" />
                <span>Default (No Persona)</span>
              </button>

              {personas.length === 0 && (
                <p className="px-3 py-2 text-[10px] text-text-secondary dark:text-text-secondary-dark">
                  No personas yet. Create one in settings.
                </p>
              )}

              {personas.map((persona) => (
                <button
                  key={persona._id}
                  onClick={() => { setActivePersona(persona._id); setIsOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors mt-1 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus dark:focus:ring-focus-dark ${
                    activePersona?._id === persona._id
                      ? 'bg-primary dark:bg-primary-dark text-white'
                      : 'text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]'
                  }`}
                  role="menuitem"
                  aria-pressed={activePersona?._id === persona._id}
                  type="button"
                >
                  <span aria-hidden="true">{TONE_EMOJIS[persona.tone] || '🎭'}</span>
                  <div className="text-left flex-1 min-w-0">
                    <p className="truncate">{persona.name}</p>
                    <p className="text-[10px] opacity-60 capitalize">{persona.tone}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(PersonaSelector);
