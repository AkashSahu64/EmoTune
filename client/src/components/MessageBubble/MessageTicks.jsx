import { memo, useMemo } from 'react';

function hasOtherUser(entries, userId) {
  return entries?.some((entry) => {
    const id = typeof entry === 'string' ? entry : entry?._id || entry?.user;
    return id && String(id) !== String(userId);
  });
}

function MessageTicks({ message, userId }) {
  const state = useMemo(() => {
    if (hasOtherUser(message.readBy, userId)) return 'read';
    if (hasOtherUser(message.deliveredTo, userId)) return 'delivered';
    return 'sent';
  }, [message.readBy, message.deliveredTo, userId]);

  const double = state !== 'sent';
  return (
    <span className="inline-flex items-center" aria-label={state} title={state}>
      <svg width={double ? 17 : 13} height="10" viewBox={double ? '0 0 18 10' : '0 0 13 10'} fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1.5 5.5 4.5 8.5 10.5 2.5" />
        {double && <path d="M6.5 5.5 9.5 8.5 15.5 2.5" />}
      </svg>
    </span>
  );
}

export default memo(MessageTicks);
