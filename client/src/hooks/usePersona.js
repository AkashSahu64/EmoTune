import { useContext } from 'react';
import { PersonaContext } from '../contexts/PersonaContext';

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
}
