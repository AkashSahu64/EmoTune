import { useState } from 'react';
import { FiSearch, FiCheckCircle, FiClock, FiShield, FiSend, FiAlertCircle } from 'react-icons/fi';
import { useMemory } from '../../hooks/useMemory';
import { motion } from 'framer-motion';
import { ShimmerCard } from '../Loaders/Loader';

export default function MemoryMesh({ chatId, onSendMessage }) {
  const [query, setQuery] = useState('');
  const { results, loading, error, searchMemory, clearResults } = useMemory();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      searchMemory(chatId, query);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="p-3">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-text-secondary-dark" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories..."
            className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark w-full pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:border-primary dark:focus:border-primary-dark focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark transition-colors"
          />
        </div>
      </form>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-glass px-3 pb-3 space-y-2">
        {/* Empty State */}
        {!query && !loading && results.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary dark:bg-primary-dark opacity-30 flex items-center justify-center text-xl">
              🧠
            </div>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Search your conversation history with AI-powered semantic recall
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <ShimmerCard key={i} lines={2} />)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-danger dark:border-danger-dark rounded-2xl p-3 flex items-start gap-2">
            <FiAlertCircle className="text-danger dark:text-danger-dark mt-0.5 flex-shrink-0" size={14} />
            <p className="text-xs text-danger dark:text-danger-dark">{error}</p>
          </div>
        )}

        {/* Results */}
          {results.map((result) => (
            <motion.div
              key={result.id}
              className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl p-3 cursor-pointer hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  result.isVerified ? 'bg-success dark:bg-success-dark' : 'bg-warning dark:bg-warning-dark'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary dark:text-text-primary-dark line-clamp-2">{result.text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
                      {result.sender?.username || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
                      {Math.round(result.score * 100)}% match
                    </span>
                    {result.isVerified ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-success dark:text-success-dark">
                        <FiCheckCircle size={10} /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[10px] text-warning dark:text-warning-dark">
                        <FiClock size={10} /> Pending
                      </span>
                    )}
                  </div>
                </div>
                {onSendMessage && (
                  <button
                    onClick={() => onSendMessage(result.text, 'text', { memoryRef: result.id })}
                    className="p-1.5 bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-primary dark:text-primary-dark flex-shrink-0"
                    title="Send in chat"
                  >
                    <FiSend size={12} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
