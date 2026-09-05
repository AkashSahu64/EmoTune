import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export const PersonaContext = createContext(null);

export function PersonaProvider({ children }) {
  const { user } = useAuth();
  const [personas, setPersonas] = useState([]);
  const [activePersona, setActivePersonaState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setPersonas(user.personas || []);
      const active = (user.personas || []).find((p) => p.isActive);
      setActivePersonaState(active || null);
    }
  }, [user]);

  const fetchPersonas = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/personas');
      setPersonas(data.personas);
      const active = data.personas.find((p) => p.isActive);
      setActivePersonaState(active || null);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const createPersona = useCallback(async (personaData) => {
    const { data } = await api.post('/personas', personaData);
    setPersonas(data.personas);
    return data.personas;
  }, []);

  const updatePersona = useCallback(async (personaId, updates) => {
    const { data } = await api.patch(`/personas/${personaId}`, updates);
    setPersonas(data.personas);
    return data.personas;
  }, []);

  const deletePersona = useCallback(async (personaId) => {
    const { data } = await api.delete(`/personas/${personaId}`);
    setPersonas(data.personas);
    if (activePersona?._id === personaId) {
      setActivePersonaState(null);
    }
    return data.personas;
  }, [activePersona]);

  const setActivePersona = useCallback(async (personaId) => {
    const { data } = await api.post(`/personas/${personaId}/activate`);
    setPersonas(data.personas);
    const active = data.personas.find((p) => p.isActive);
    setActivePersonaState(active || null);
  }, []);

  const clearActivePersona = useCallback(() => {
    setActivePersonaState(null);
  }, []);

  const value = useMemo(() => ({
      personas,
      activePersona,
      loading,
      fetchPersonas,
      createPersona,
      updatePersona,
      deletePersona,
      setActivePersona,
      clearActivePersona,
  }), [
    personas,
    activePersona,
    loading,
    fetchPersonas,
    createPersona,
    updatePersona,
    deletePersona,
    setActivePersona,
    clearActivePersona,
  ]);

  return (
    <PersonaContext.Provider value={value}>
      {children}
    </PersonaContext.Provider>
  );
}
