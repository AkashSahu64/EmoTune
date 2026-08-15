import { memo } from 'react';

function SenderName({ name }) {
  return <span>{name}</span>;
}

export default memo(SenderName);
