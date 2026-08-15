import { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useMemory } from '../hooks/useMemory';
import { FiSearch, FiArrowLeft, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { ShimmerCard } from '../components/Loaders/Loader';
import SEO from '../components/SEO/SEO';
import { WebPageSchema, BreadcrumbSchema } from '../utils/schema';

const webPageSchema = WebPageSchema({
  title: 'Memory Mesh - Emotune',
  description: 'Search your Emotune conversations with AI-powered semantic search. Find messages, emotions, songs, and memories instantly.',
  url: 'https://emotune.app/app/memory',
  dateModified: new Date().toISOString(),
});

const breadcrumbSchema = BreadcrumbSchema({
  items: [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/app' },
    { name: 'Memory Mesh', path: '/app/memory' },
  ],
});

function MemorySearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState('');
  const { results, loading, searchMemory, error } = useMemory();

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    await searchMemory(selectedChat || undefined, searchQuery);
  }, [searchQuery, selectedChat, searchMemory]);

  return (
    <>
      <SEO
        title="Memory Mesh"
        description="Search your Emotume conversations with AI-powered semantic search powered by embeddings. Find messages, emotions, songs, and memories instantly."
        keywords="memory mesh, semantic search, AI search, conversation search, Emotume memory, embeddings"
        canonical="https://emotune.app/app/memory"
        noIndex
      />

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <main className="memory-page min-h-screen bg-transparent theme-transition p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <nav aria-label="Breadcrumb" className="flex items-center gap-4 mb-8">
            <Link to="/app" aria-label="Back to dashboard">
              <motion.button
                className="w-10 h-10 rounded-xl bg-surface backdrop-blur-glass border border-border flex items-center justify-center text-text-primary"
              >
                <FiArrowLeft aria-hidden="true" />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Memory Mesh</h1>
              <p className="text-sm text-text-secondary">Semantic search across your conversations</p>
            </div>
          </nav>

          <form onSubmit={handleSearch} className="mb-8" role="search" aria-label="Search memories">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your memories..."
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-xl bg-surface backdrop-blur-glass border border-border text-text-primary placeholder:text-placeholder focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus transition-colors"
                  aria-label="Search query"
                />
              </div>
              <motion.button
                type="submit"
                className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-sm shadow-sm hover:opacity-90 transition-colors disabled:opacity-50"
                disabled={loading}
                aria-label="Execute search"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status" aria-label="Searching" />
                ) : 'Search'}
              </motion.button>
            </div>
          </form>

          {error && (
            <div className="bg-surface backdrop-blur-glass border border-border rounded-2xl p-4 mb-6 border-danger" role="alert">
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-4" aria-label="Loading results">
              {Array.from({ length: 3 }).map((_, i) => <ShimmerCard key={i} />)}
            </div>
          )}

          {!loading && results.length === 0 && searchQuery && (
            <div className="text-center py-16" aria-live="polite">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface backdrop-blur-glass border border-border flex items-center justify-center text-3xl text-text-secondary" aria-hidden="true">
                <FiSearch />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">No Memories Found</h2>
              <p className="text-sm text-text-secondary mt-1">Try a different search query</p>
            </div>
          )}

          {!loading && results.length === 0 && !searchQuery && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-primary opacity-20 flex items-center justify-center text-4xl" aria-hidden="true">
                🧠
              </div>
              <h2 className="text-xl font-semibold text-text-primary">Search Your Memories</h2>
              <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
                Type a query above to search through all your conversations using AI-powered semantic search.
                Find that shayari, song, or important message instantly.
              </p>
            </div>
          )}

          <div className="space-y-4" role="list" aria-label="Search results">
            {results.map((result) => (
              <motion.article
                key={result.id}
                className="bg-surface backdrop-blur-glass border border-border rounded-2xl p-5"
                role="listitem"
                initial={{ }}
                whileInView={{ }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-medium" aria-hidden="true">
                        {result.sender?.username?.[0] || '?'}
                      </div>
                      <span className="text-xs font-medium text-text-secondary">
                        {result.sender?.username || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {new Date(result.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-sm text-text-primary leading-relaxed">
                      {result.text}
                    </p>

                    {result.metadata?.emotionTag && (
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--theme-glass)] text-text-secondary">
                        {result.metadata.emotionTag}
                      </span>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] text-text-secondary">
                        Relevance: {Math.round(result.score * 100)}%
                      </span>
                      {result.isVerified ? (
                        <span className="flex items-center gap-1 text-[10px] text-success">
                          <FiCheckCircle aria-hidden="true" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-warning">
                          <FiClock aria-hidden="true" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0" aria-hidden="true">
                    <div className={`w-3 h-3 rounded-full ${result.isVerified ? 'bg-success' : 'bg-warning'}`} />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

export default memo(MemorySearchPage);
