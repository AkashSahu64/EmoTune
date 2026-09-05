import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiClock, FiEdit3, FiCode, FiGrid, FiUsers, FiTrash2, FiSave } from 'react-icons/fi';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Editor from '@monaco-editor/react';
import { ghostService } from '../../services/api';
import { toast } from 'sonner';

const MODES = [
  { id: 'whiteboard', label: 'Whiteboard', icon: FiGrid },
  { id: 'document', label: 'Document', icon: FiEdit3 },
  { id: 'code', label: 'Code', icon: FiCode },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
};

export default function GhostCollaboration({ session, onClose, socket, chatId }) {
  const [mode, setMode] = useState(session?.type || 'whiteboard');
  const [content, setContent] = useState(session?.data?.content || '');
  const [documentContent, setDocumentContent] = useState(session?.data?.document || '');
  const [codeContent, setCodeContent] = useState(session?.data?.code || '');
  const [codeLanguage, setCodeLanguage] = useState(session?.data?.language || 'javascript');
  const [participants, setParticipants] = useState(session?.participants || []);
  const [timeLeft, setTimeLeft] = useState(session?.ttl || 3600);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const whiteboardRef = useRef(null);
  const syncTimerRef = useRef(null);

  useEffect(() => {
    if (!socket || !session?._id) return;
    socket.emit('ghost:join', { sessionId: session._id, chatId });
    socket.on('ghost:sync', ({ userId, data }) => {
      if (!data) return;
      if (data.mode === 'whiteboard' && data.whiteboard) {
      } else if (data.mode === 'document' && data.document !== undefined) {
        setDocumentContent(data.document);
      } else if (data.mode === 'code' && data.code !== undefined) {
        setCodeContent(data.code);
      } else if (data.content !== undefined) {
        setContent(data.content);
      }
    });
    socket.on('ghost:userJoined', ({ userId }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.user?._id === userId || p.user === userId)) return prev;
        return [...prev, { user: { _id: userId }, joinedAt: new Date() }];
      });
    });
    socket.on('ghost:userLeft', ({ userId }) => {
      setParticipants((prev) => prev.filter((p) => {
        const pid = p.user?._id || p.user;
        return pid !== userId;
      }));
    });
    return () => {
      socket.emit('ghost:leave', { sessionId: session._id });
      socket.off('ghost:sync');
      socket.off('ghost:userJoined');
      socket.off('ghost:userLeft');
    };
  }, [socket, session, chatId]);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !session?._id || !socket) return;
    syncTimerRef.current = setInterval(() => {
      const data = { mode };
      if (mode === 'document') data.document = documentContent;
      else if (mode === 'code') data.code = codeContent;
      else data.content = content;
      socket.emit('ghost:sync', { sessionId: session._id, data });
    }, 3000);
    return () => clearInterval(syncTimerRef.current);
  }, [isActive, session, socket, mode, documentContent, codeContent, content]);

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    if (socket && session?._id) {
      socket.emit('ghost:sync', { sessionId: session._id, data: { mode: newMode } });
    }
  };

  const handleDestroy = async () => {
    try {
      setSaving(true);
      await ghostService.destroy(session._id);
      setIsActive(false);
      toast.success('Ghost session ended');
    } catch {
      toast.error('Failed to end session');
    } finally {
      setSaving(false);
      onClose?.();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return (
      <motion.div
        className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl p-8 text-center"
        initial={{ }}
        animate={{ }}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center justify-center text-2xl text-text-secondary dark:text-text-secondary-dark">
          <FiClock />
        </div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">Session Ended</h3>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">This ghost session has been destroyed</p>
        <button onClick={onClose} className="mt-4 bg-primary dark:bg-primary-dark text-white px-5 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity">Close</button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl flex flex-col h-full"
      initial={{ }}
      animate={{ }}
    >
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">👻 Ghost Session</span>
          <span className={`flex items-center gap-1 text-xs ${
            timeLeft < 60 ? 'text-danger dark:text-danger-dark' : 'text-text-secondary dark:text-text-secondary-dark'
          }`}>
            <FiClock size={12} />
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary dark:text-text-secondary-dark flex items-center gap-1">
            <FiUsers size={12} /> {participants.length}
          </span>
          <button onClick={handleDestroy} disabled={saving} className="p-1.5 text-danger dark:text-danger-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] rounded-lg" title="Destroy Session">
            <FiTrash2 size={16} />
          </button>
          <button onClick={onClose} className="p-1.5 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark" title="Minimize">
            <FiX size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-b border-border dark:border-border-dark">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => handleModeSwitch(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                mode === m.id
                  ? 'bg-primary dark:bg-primary-dark text-white'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]'
              }`}
            >
              <Icon size={14} />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'whiteboard' && (
          <div className="w-full h-full">
            <Tldraw
              onMount={(editor) => {
                whiteboardRef.current = editor;
              }}
            />
          </div>
        )}

        {mode === 'document' && (
          <div className="w-full h-full overflow-y-auto">
            <ReactQuill
              theme="snow"
              value={documentContent}
              onChange={setDocumentContent}
              modules={QUILL_MODULES}
              placeholder="Start writing collaboratively..."
              className="h-full ghost-quill-editor"
            />
          </div>
        )}

        {mode === 'code' && (
          <div className="w-full h-full flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border dark:border-border-dark bg-background dark:bg-background-dark">
              <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">Language:</span>
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                className="text-[11px] bg-transparent text-text-primary dark:text-text-primary-dark border border-border dark:border-border-dark rounded px-1.5 py-0.5 outline-none"
              >
                {['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'go', 'rust', 'sql'].map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Editor
                language={codeLanguage}
                value={codeContent}
                onChange={(value) => setCodeContent(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 border-t border-border dark:border-border-dark">
        <div className="flex items-center gap-2">
          {participants.map((p, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-primary dark:bg-primary-dark flex items-center justify-center text-white text-[8px] font-bold"
              title={p.user?.username || 'User'}
            >
              {p.user?.username?.[0] || 'U'}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
          Content auto-destroys when timer ends
        </p>
      </div>
    </motion.div>
  );
}
