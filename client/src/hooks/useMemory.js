import { useState, useCallback } from 'react';
import api from '../services/api';

export function useMemory() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchMemory = useCallback(async (chatId, query) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/memory/search', { params: { chatId, query } });
      setResults(data.results || []);
      return data.results;
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const requestVerification = useCallback(async (memoryId) => {
    try {
      const { data } = await api.post(`/memory/${memoryId}/verify`);
      return data.memory;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Verification request failed');
    }
  }, []);

  const respondVerification = useCallback(async (memoryId, status, editedText) => {
    try {
      const { data } = await api.post(`/memory/${memoryId}/respond`, { status, editedText });
      return data.memory;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Verification response failed');
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, searchMemory, requestVerification, respondVerification, clearResults };
}
