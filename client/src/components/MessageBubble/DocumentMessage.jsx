import { memo } from 'react';
import FileMessage from './FileMessage';

function DocumentMessage(props) {
  return <FileMessage {...props} document />;
}

export default memo(DocumentMessage);
