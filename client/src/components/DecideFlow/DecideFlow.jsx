import { useState, useEffect } from 'react';
import { FiX, FiZap, FiCheck, FiClock, FiAlertTriangle, FiBarChart2 } from 'react-icons/fi';
import { decideService } from '../../services/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';

export default function DecideFlow({ chatId, onClose }) {
  const [decisions, setDecisions] = useState([]);
  const [activeDecision, setActiveDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchDecisions();
  }, [chatId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('decision:new', ({ decision }) => {
      setDecisions((prev) => [decision, ...prev]);
    });
    socket.on('decision:update', ({ decision }) => {
      setDecisions((prev) => prev.map((d) => d._id === decision._id ? decision : d));
      setActiveDecision((prev) => prev?._id === decision._id ? decision : prev);
    });
    return () => {
      socket.off('decision:new');
      socket.off('decision:update');
    };
  }, [socket]);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const { data } = await decideService.getChat(chatId);
      setDecisions(data.decisions || []);
      if (data.decisions?.[0]) setActiveDecision(data.decisions[0]);
    } catch {
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async () => {
    try {
      setCreating(true);
      const { data } = await decideService.trigger(chatId);
      setDecisions((prev) => [data.decision, ...prev]);
      setActiveDecision(data.decision);
      toast.success('Decision flow triggered!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to trigger decision');
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (optionIndex) => {
    if (!activeDecision) return;
    try {
      const { data } = await decideService.vote(activeDecision._id, optionIndex);
      setActiveDecision(data.decision);
      setDecisions((prev) => prev.map((d) => d._id === data.decision._id ? data.decision : d));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Vote failed');
    }
  };

  const totalVotes = activeDecision?.pollOptions?.reduce((sum, opt) => sum + (opt.voteCount || 0), 0) || 1;

  return (
    <div
      className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-2">
          <FiZap size={16} className="text-primary dark:text-primary-dark" />
          <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">DecideFlow</span>
        </div>
        <button onClick={onClose} className="p-1 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark">
          <FiX size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-glass p-4 space-y-4">
        {/* Trigger Button */}
        <button
          onClick={handleTrigger}
          disabled={creating}
          className="bg-primary dark:bg-primary-dark text-white w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          {creating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <FiZap size={16} /> Trigger AI Decision
            </>
          )}
        </button>

        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl shimmer-bg" />
          ))
        ) : decisions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center justify-center text-2xl text-text-secondary dark:text-text-secondary-dark">
              <FiBarChart2 />
            </div>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark">No decisions yet</p>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">Type /decide or click the button above</p>
          </div>
          ) : (
            activeDecision && (
              <motion.div
                key={activeDecision._id}
                className="space-y-4"
                initial={{ }}
                animate={{ }}
              >
                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                  activeDecision.status === 'resolved' ? 'bg-success/20 dark:bg-success-dark/20 text-success dark:text-success-dark' :
                  activeDecision.status === 'deadlocked' ? 'bg-danger/20 dark:bg-danger-dark/20 text-danger dark:text-danger-dark' :
                  'bg-warning/20 dark:bg-warning-dark/20 text-warning dark:text-warning-dark'
                }`}>
                  {activeDecision.status === 'resolved' && <FiCheck size={14} />}
                  {activeDecision.status === 'deadlocked' && <FiAlertTriangle size={14} />}
                  {activeDecision.status === 'active' && <FiClock size={14} />}
                  <span className="capitalize">{activeDecision.status}</span>
                </div>

                {/* Summary */}
                <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">Summary</h3>
                  <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed">
                    {activeDecision.summary || 'AI is analyzing the conversation...'}
                  </p>
                </div>

                {/* Poll Options */}
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-3">Options</h3>
                  <div className="space-y-2">
                    {activeDecision.pollOptions?.map((option, i) => {
                      const percentage = totalVotes > 0 ? ((option.voteCount || 0) / totalVotes) * 100 : 0;
                      return (
                        <motion.button
                          key={i}
                          onClick={() => handleVote(i)}
                          disabled={activeDecision.status !== 'active'}
                          className="w-full bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark p-3 rounded-xl text-left hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-text-primary dark:text-text-primary-dark">{option.text}</span>
                            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">{option.voteCount || 0} votes</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface/80 dark:bg-surface-dark/80 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary dark:bg-primary-dark"
                            />
                          </div>
        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Compromise */}
                {activeDecision.compromise && (
                  <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border-2 border-warning dark:border-warning-dark rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiAlertTriangle size={14} className="text-warning dark:text-warning-dark" />
                      <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Suggested Compromise</span>
                    </div>
                    <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{activeDecision.compromise}</p>
                  </div>
                )}

                {/* Deadlock Warning */}
                {activeDecision.deadlock && activeDecision.status === 'active' && (
                  <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border-2 border-danger dark:border-danger-dark rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiAlertTriangle size={14} className="text-danger dark:text-danger-dark" />
                      <span className="text-sm font-semibold text-danger dark:text-danger-dark">Deadlock Detected</span>
                    </div>
                    <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                      AI has detected a potential deadlock. Consider using the compromise suggestion above.
                    </p>
                  </div>
                )}
              </motion.div>
            )
        )}
      </div>
    </div>
  );
}
