import { memo, useMemo } from 'react';
import { FiBarChart2 } from 'react-icons/fi';

function PollMessage({ message }) {
  const options = message.metadata?.pollOptions || [];
  const totalVotes = useMemo(() => options.reduce((sum, option) => sum + (option.votes?.length ?? option.voteCount ?? 0), 0), [options]);
  return <section className="w-[min(320px,calc(100vw-32px))] max-w-full overflow-hidden rounded-xl border border-border/[.55] dark:border-border-dark/[.55] bg-surface-elevated dark:bg-surface-elevated-dark/[.94]" aria-label="Poll">
    <h3 className="m-0 flex items-center gap-1.5 bg-primary/[.8] dark:bg-primary-dark/[.8] p-[10px_12px] text-sm text-white"><FiBarChart2 aria-hidden="true" />{message.content || 'Poll'}</h3>
    <div className="grid gap-2 p-[10px_12px]">{options.map((option, index) => {
      const votes = option.votes?.length ?? option.voteCount ?? 0;
      const percentage = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
      return <button className="relative flex justify-between gap-2 overflow-hidden rounded-lg border border-border/[.45] dark:border-border-dark/[.45] px-2.5 py-2 text-left text-xs" type="button" key={option._id || `${option.text}-${index}`} aria-label={`${option.text}, ${votes} votes`}>
        <span className="absolute inset-y-0 left-0 bg-primary/[.18] dark:bg-primary-dark/[.18]" style={{ width: `${percentage}%` }} aria-hidden="true" />
        <span className="relative">{option.text}</span><strong className="relative">{percentage}%</strong>
      </button>;
    })}</div>
    <footer className="px-3 pb-2.5 text-[11px] opacity-70">{totalVotes} vote{totalVotes === 1 ? '' : 's'}</footer>
  </section>;
}

export default memo(PollMessage);
