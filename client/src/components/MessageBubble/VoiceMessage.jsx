import { memo } from 'react';
import { FiMic } from 'react-icons/fi';
import AudioMessage from './AudioMessage';

function VoiceMessage({ message }) {
  return <div className="relative"><AudioMessage message={message} /><span className="absolute right-12 top-1/2 -translate-y-1/2 opacity-70" title="Voice message"><FiMic aria-hidden="true" /></span></div>;
}

export default memo(VoiceMessage);
