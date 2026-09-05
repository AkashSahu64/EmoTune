import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiExternalLink, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';

export default function TruthScoreIndicator({ claim, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [localScore, setLocalScore] = useState(claim?.truthScore || 0.5);
  const [voted, setVoted] = useState(null);

  const score = claim?.truthScore || localScore;

  const getColor = () => {
    if (score >= 0.7) return '#16A34A';
    if (score >= 0.4) return '#D97706';
    return '#DC2626';
  };

  const getStatus = () => {
    if (score >= 0.7) return 'Likely True';
    if (score >= 0.4) return 'Uncertain';
    if (score > 0) return 'Likely False';
    return 'Unrated';
  };

  const handleVote = async (voteType) => {
    try {
      const { truthService } = await import('../../services/api');
      const voteValue = voteType === 'up' ? 1 : -1;
      await truthService.vote(claim?._id, voteValue);
      setVoted(voteType);
      setLocalScore((prev) => {
        const delta = voteType === 'up' ? 0.1 : -0.1;
        return Math.max(0, Math.min(1, prev + delta));
      });
    } catch {
      // silently fail
    }
  };

  if (compact) {
    return (
      <div className="relative inline-flex">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1"
          title={getStatus()}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: getColor() }}
          />
        </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                className="absolute bottom-full right-0 mb-2 w-64 z-50"
                initial={{ }}
                animate={{ }}
                exit={{ }}
              >
              <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiShield size={14} style={{ color: getColor() }} />
                  <span className="text-xs font-medium text-text-primary dark:text-text-primary-dark">{getStatus()}</span>
                </div>
                {claim?.claimText && (
                  <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-2">"{claim.claimText}"</p>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 rounded-full bg-surface/80 dark:bg-surface-dark/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-colors"
                      style={{ width: `${score * 100}%`, backgroundColor: getColor() }}
                    />
                  </div>
                  <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">{Math.round(score * 100)}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote('up')}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg transition-colors ${
                      voted === 'up' ? 'bg-success dark:bg-success-dark text-white' : 'bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark'
                    }`}
                  >
                    <FiThumbsUp size={10} /> Agree
                  </button>
                  <button
                    onClick={() => handleVote('down')}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg transition-colors ${
                      voted === 'down' ? 'bg-danger dark:bg-danger-dark text-white' : 'bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark'
                    }`}
                  >
                    <FiThumbsDown size={10} /> Disagree
                  </button>
                  {claim?.sources?.[0]?.url && (
                    <a href={claim.sources[0].url} target="_blank" rel="noopener noreferrer" className="ml-auto text-primary dark:text-primary-dark">
                      <FiExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiShield size={16} style={{ color: getColor() }} />
        <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Truth Score: {getStatus()}</span>
      </div>

      {claim?.claimText && (
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-3 bg-surface/80 dark:bg-surface-dark/80 p-2 rounded-lg italic">
          "{claim.claimText}"
        </p>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-2 rounded-full bg-surface/80 dark:bg-surface-dark/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-colors"
            style={{ width: `${score * 100}%`, backgroundColor: getColor() }}
          />
        </div>
        <span className="text-xs text-text-secondary dark:text-text-secondary-dark">{Math.round(score * 100)}%</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleVote('up')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg ${
            voted === 'up' ? 'bg-success dark:bg-success-dark text-white' : 'bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark'
          }`}
        >
          <FiThumbsUp size={12} /> ({claim?.totalUpvotes || 0})
        </button>
        <button
          onClick={() => handleVote('down')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg ${
            voted === 'down' ? 'bg-danger dark:bg-danger-dark text-white' : 'bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark'
          }`}
        >
          <FiThumbsDown size={12} /> ({claim?.totalDownvotes || 0})
        </button>
      </div>

      {claim?.sources?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
          <p className="text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Sources:</p>
          {claim.sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-primary dark:text-primary-dark hover:underline truncate"
            >
              {source.title || source.url}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
