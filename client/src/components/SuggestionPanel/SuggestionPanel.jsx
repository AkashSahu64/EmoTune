import { useState, useEffect, useCallback } from 'react';
import { FiMusic, FiBookOpen, FiSmile, FiVideo, FiSend, FiBookmark, FiChevronUp, FiChevronDown, FiZap, FiMessageSquare, FiEdit3, FiRefreshCw, FiVolume2, FiFileText, FiCopy, FiCheck, FiImage, FiGlobe } from 'react-icons/fi';
import { ThinkingShimmer } from '../Loaders/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { Chip, Button, IconButton, GlassCard } from '../ui';
import { toast } from 'sonner';
import AI_SERVICE from '../../services/aiService';

const suggestionTabs = [
  { id: 'quick', label: 'Quick', icon: FiZap },
  { id: 'emoji', label: 'Emoji', icon: FiSmile },
  { id: 'gif', label: 'GIF', icon: FiImage },
  { id: 'shayari', label: 'Shayari', icon: FiBookOpen },
  { id: 'song', label: 'Songs', icon: FiMusic },
  { id: 'video', label: 'Videos', icon: FiVideo },
  { id: 'summary', label: 'Summary', icon: FiFileText },
  { id: 'rewrite', label: 'Rewrite', icon: FiEdit3 },
  { id: 'translate', label: 'Translate', icon: FiGlobe },
];

const quickReplies = [
  { text: 'That makes sense!', emoji: '👍' },
  { text: 'Tell me more...', emoji: '👀' },
  { text: 'I agree with you', emoji: '🤝' },
  { text: 'That\'s interesting!', emoji: '🤔' },
  { text: 'Let me think about it', emoji: '🧠' },
  { text: 'Sounds good!', emoji: '😊' },
  { text: 'I appreciate that', emoji: '💛' },
  { text: 'Can you elaborate?', emoji: '📝' },
];

const TONES = [
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'casual', label: 'Casual', icon: '😊' },
  { id: 'romantic', label: 'Romantic', icon: '❤️' },
  { id: 'humorous', label: 'Humorous', icon: '😂' },
];

const LANGUAGES = [
  { code: 'hi', name: 'Hindi' },
  { code: 'ur', name: 'Urdu' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
];

export default function SuggestionPanel({ suggestions, onSend, chatId, onBookmark }) {
  const [activeTab, setActiveTab] = useState('quick');
  const [collapsed, setCollapsed] = useState(false);
  const [sending, setSending] = useState(null);
  const [loading, setLoading] = useState({});
  const [tabData, setTabData] = useState({});

  const [rewriteText, setRewriteText] = useState('');
  const [selectedTone, setSelectedTone] = useState('casual');
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriting, setRewriting] = useState(false);

  const [translateText, setTranslateText] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [translateResult, setTranslateResult] = useState(null);
  const [translating, setTranslating] = useState(false);

  const [copiedId, setCopiedId] = useState(null);

  const fetchTabData = useCallback(async (tabId) => {
    if (!chatId) return;
    if (tabData[tabId] && tabData[tabId].length > 0) return;
    if (loading[tabId]) return;

    setLoading((prev) => ({ ...prev, [tabId]: true }));

    try {
      let data;
      switch (tabId) {
        case 'emoji':
          data = await AI_SERVICE.getEmojis(chatId);
          setTabData((prev) => ({ ...prev, emoji: data.emojis || [], _mood: data.mood }));
          break;
        case 'gif':
          data = await AI_SERVICE.getGifs(chatId);
          setTabData((prev) => ({ ...prev, gif: data.gifs || [] }));
          break;
        case 'shayari':
          data = await AI_SERVICE.getShayari(chatId);
          setTabData((prev) => ({ ...prev, shayari: data.shayaris || [] }));
          break;
        case 'song':
          data = await AI_SERVICE.getSongs(chatId);
          setTabData((prev) => ({ ...prev, song: data.songs || [] }));
          break;
        case 'video':
          data = await AI_SERVICE.getVideos(chatId);
          setTabData((prev) => ({ ...prev, video: data.videos || [] }));
          break;
        case 'summary':
          data = await AI_SERVICE.getSummary(chatId, 50);
          setTabData((prev) => ({ ...prev, summary: data }));
          break;
      }
    } catch (err) {
      console.error(`Failed to fetch ${tabId}:`, err);
    } finally {
      setLoading((prev) => ({ ...prev, [tabId]: false }));
    }
  }, [chatId, tabData, loading]);

  useEffect(() => {
    if (activeTab !== 'quick' && activeTab !== 'rewrite' && activeTab !== 'translate') {
      fetchTabData(activeTab);
    }
  }, [activeTab, fetchTabData]);

  const handleSend = async (type, content, metadata = {}) => {
    setSending(type);
    try { await onSend(content, type, metadata); } finally { setSending(null); }
  };

  const handleQuickReply = (text) => {
    handleSend('text', text, {});
  };

  const handleRewrite = async () => {
    if (!rewriteText.trim()) { toast.error('Please enter a message to rewrite'); return; }
    setRewriting(true);
    try {
      const result = await AI_SERVICE.rewriteWithPersona(rewriteText, selectedTone);
      setRewriteResult(result);
    } catch {
      toast.error('Rewrite failed');
    } finally {
      setRewriting(false);
    }
  };

  const handleTranslate = async () => {
    if (!translateText.trim()) { toast.error('Please enter text to translate'); return; }
    setTranslating(true);
    try {
      const result = await AI_SERVICE.translateMessage(translateText, targetLang);
      setTranslateResult(result);
    } catch {
      toast.error('Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const renderQuickTab = () => (
    <div className="flex flex-wrap gap-2">
      {quickReplies.map((reply, i) => (
        <motion.button
          key={i}
          onClick={() => handleQuickReply(reply.text)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-xl hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors text-xs font-medium text-text-primary dark:text-text-primary-dark"
        >
          <span>{reply.emoji}</span>
          <span>{reply.text}</span>
        </motion.button>
      ))}
    </div>
  );

  const renderEmojiTab = () => {
    const emojis = tabData.emoji || (suggestions?.allEmojis) || (suggestions?.emoji ? [suggestions.emoji] : []);

    if (loading.emoji && emojis.length === 0) return <ThinkingShimmer />;

    return (
      <div>
        {emojis.length > 0 ? (
          <>
            {tabData._mood && (
              <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mb-2 capitalize">Mood: {tabData._mood}</p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {emojis.map((emoji, i) => (
                <motion.button
                  key={i}
                  className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark w-14 h-14 rounded-2xl flex items-center justify-center text-2xl hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
                  onClick={() => {
                    handleSend('emoji', emoji, { emoji });
                    onBookmark?.({
                      type: 'emoji',
                      source: 'ai',
                      content: emoji,
                      metadata: { emoji, sourceChatId: chatId },
                    });
                  }}
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center">No emoji suggestions available</p>
        )}
      </div>
    );
  };

  const renderGifTab = () => {
    const gifs = tabData.gif || [];

    if (loading.gif && gifs.length === 0) return <ThinkingShimmer />;

    return (
      <div>
        {gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.slice(0, 6).map((gif, i) => (
              <div key={gif.id || i} className="relative">
                <motion.button
                  className="w-full bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-xl overflow-hidden hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
                  onClick={() => handleSend('gif', gif.title || 'GIF', { mediaUrl: gif.url, gifId: gif.id })}
                >
                  <img
                    src={gif.preview || gif.url}
                    alt={gif.title || 'GIF'}
                    className="w-full h-24 object-cover"
                    loading="lazy"
                  />
                </motion.button>
                <IconButton
                  icon={FiBookmark}
                  size="xs"
                  onClick={() => onBookmark?.({
                    type: 'image',
                    source: 'ai',
                    content: gif.url || gif.preview || gif.title || 'GIF',
                    metadata: { sourceChatId: chatId },
                  })}
                  label="Save GIF"
                  className="absolute right-1 top-1 bg-surface/90"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center">No GIFs available. Try adding GIPHY_API_KEY in server .env</p>
        )}
      </div>
    );
  };

  const renderShayariTab = () => {
    const shayaris = tabData.shayari || (suggestions?.allShayaris) || (suggestions?.shayari ? [suggestions.shayari] : []);

    if (loading.shayari && shayaris.length === 0) return <ThinkingShimmer />;

    return (
      <div className="space-y-2">
        {shayaris.length > 0 ? (
          shayaris.map((shayari, i) => (
            <GlassCard key={i} className="p-4">
              <p className="text-sm italic text-text-primary dark:text-text-primary-dark leading-relaxed font-serif whitespace-pre-line">{shayari}</p>
              <div className="flex items-center gap-2 mt-3">
                <Button variant="secondary" size="xs" icon={FiSend} onClick={() => handleSend('shayari', shayari, { shayari })}>Send</Button>
                <Button variant="ghost" size="xs" icon={FiBookmark} onClick={() => onBookmark?.({
                  type: 'shayari',
                  source: 'ai',
                  content: shayari,
                  metadata: { shayari, sourceChatId: chatId },
                })}>Save</Button>
              </div>
            </GlassCard>
          ))
        ) : (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark">No shayari available</p>
        )}
      </div>
    );
  };

  const renderSongTab = () => {
    const songs = tabData.song || suggestions?.allSongs || suggestions?.songs || [];

    if (loading.song && songs.length === 0) return <ThinkingShimmer />;

    return (
      <div className="space-y-2">
        {songs.length > 0 ? (
          songs.slice(0, 5).map((song, i) => (
            <GlassCard key={i} className="p-3 flex items-center gap-3" hover>
              <div className="w-10 h-10 rounded-xl bg-primary dark:bg-primary-dark flex items-center justify-center text-white flex-shrink-0">
                <FiMusic size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate">{song.title || 'Unknown Song'}</p>
                <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark truncate">
                  {song.artist || ''}
                  {song.source && <span className="ml-1 opacity-50">· {song.source}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <IconButton icon={FiBookmark} size="xs" onClick={() => onBookmark?.({
                  type: 'song',
                  source: 'ai',
                  content: song.title || 'Song',
                  metadata: {
                    songTitle: song.title || 'Song',
                    songArtist: song.artist || '',
                    songClipUrl: song.previewUrl || song.externalUrl || '',
                    sourceChatId: chatId,
                  },
                })} label="Save song" />
                <IconButton icon={FiSend} size="xs" onClick={() => handleSend('song', song.title || 'Song', { songTitle: song.title, songArtist: song.artist, songClipUrl: song.previewUrl || song.externalUrl })} label="Send song" />
              </div>
            </GlassCard>
          ))
        ) : (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark">No song suggestions available</p>
        )}
      </div>
    );
  };

  const renderVideoTab = () => {
    const videos = tabData.video || suggestions?.allVideos || suggestions?.videos || [];

    if (loading.video && videos.length === 0) return <ThinkingShimmer />;

    return (
      <div className="space-y-2">
        {videos.length > 0 ? (
          videos.slice(0, 5).map((video, i) => (
            <GlassCard key={i} className="p-3 flex items-center gap-3" hover>
              <div className="w-10 h-10 rounded-xl bg-primary dark:bg-primary-dark flex items-center justify-center text-white flex-shrink-0">
                <FiVideo size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate">{video.title || 'Video'}</p>
                <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
                  {video.source || ''}
                  {video.duration && <span className="ml-1 opacity-50">· {typeof video.duration === 'number' ? `${Math.round(video.duration / 60)}m` : video.duration}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <IconButton icon={FiBookmark} size="xs" onClick={() => onBookmark?.({
                  type: 'video',
                  source: 'ai',
                  content: video.title || video.query || 'Video',
                  metadata: {
                    videoQuery: video.query || video.title || '',
                    videoEmbedUrl: video.embedUrl || video.externalUrl || '',
                    sourceChatId: chatId,
                  },
                })} label="Save video" />
                <IconButton icon={FiSend} size="xs" onClick={() => handleSend('video', video.title || 'Video', { videoEmbedUrl: video.embedUrl, videoQuery: video.query })} label="Send video" />
              </div>
            </GlassCard>
          ))
        ) : (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark">No video suggestions available</p>
        )}
      </div>
    );
  };

  const renderSummaryTab = () => {
    const summary = tabData.summary;

    if (loading.summary && !summary) return <ThinkingShimmer />;

    return (
      <div className="space-y-2">
        {summary ? (
          <>
            <GlassCard className="p-4">
              <p className="text-sm text-text-primary dark:text-text-primary-dark leading-relaxed">{summary.summary}</p>
              {summary.mainPoints?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider mb-1.5">Key Points</p>
                  <ul className="space-y-1">
                    {summary.mainPoints.filter(Boolean).map((point, i) => (
                      <li key={i} className="text-xs text-text-secondary dark:text-text-secondary-dark flex items-start gap-2">
                        <span className="text-primary dark:text-primary-dark mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.tone && (
                <p className="text-xs mt-2 text-text-secondary dark:text-text-secondary-dark">
                  Tone: <span className="font-medium capitalize text-text-primary dark:text-text-primary-dark">{summary.tone}</span>
                </p>
              )}
              {summary.actionItems?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-warning dark:text-warning-dark uppercase tracking-wider mb-1.5">Action Items</p>
                  {summary.actionItems.map((item, i) => (
                    <p key={i} className="text-xs text-text-secondary dark:text-text-secondary-dark flex items-start gap-2">
                      <span className="text-warning dark:text-warning-dark mt-0.5">▶</span>
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
              )}
            </GlassCard>
            <Button variant="secondary" size="xs" icon={FiRefreshCw} onClick={() => {
              setTabData((prev) => ({ ...prev, summary: null }));
              fetchTabData('summary');
            }}>
              Refresh Summary
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" icon={FiFileText} onClick={() => fetchTabData('summary')} className="w-full">
            Generate Summary
          </Button>
        )}
      </div>
    );
  };

  const renderRewriteTab = () => (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">Message to rewrite</p>
        <textarea
          value={rewriteText}
          onChange={(e) => setRewriteText(e.target.value)}
          placeholder="Paste or type a message to rewrite..."
          className="w-full bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark px-3 py-2 text-sm rounded-xl min-h-[60px] resize-none focus:outline-none focus:border-primary dark:focus:border-primary-dark focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark transition-colors"
          rows={2}
        />
        <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1">Select tone</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {TONES.map((tone) => (
            <Chip
              key={tone.id}
              icon={() => <span>{tone.icon}</span>}
              active={selectedTone === tone.id}
              onClick={() => setSelectedTone(tone.id)}
              size="xs"
              variant="ghost"
            >
              {tone.label}
            </Chip>
          ))}
        </div>
        <Button
          variant="gradient"
          size="xs"
          icon={FiEdit3}
          className="mt-2 w-full"
          onClick={handleRewrite}
          disabled={rewriting || !rewriteText.trim()}
        >
          {rewriting ? 'Rewriting...' : 'Rewrite'}
        </Button>
      </div>

      {rewriteResult && (
        <motion.div initial={{ }} animate={{ }}>
          <GlassCard className="p-4">
            <p className="text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Original</p>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-3 italic">{rewriteResult.original}</p>
            <p className="text-[10px] font-medium text-primary dark:text-primary-dark mb-1">Rewritten</p>
            <p className="text-sm text-text-primary dark:text-text-primary-dark leading-relaxed">{rewriteResult.rewritten}</p>
            {rewriteResult.changes && (
              <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-2 italic">{rewriteResult.changes}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Button variant="secondary" size="xs" icon={FiSend} onClick={() => handleSend('text', rewriteResult.rewritten)}>Send</Button>
              <Button variant="ghost" size="xs" icon={FiCopy} onClick={() => copyToClipboard(rewriteResult.rewritten, 'rewrite')}>
                {copiedId === 'rewrite' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );

  const renderTranslateTab = () => (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">Text to translate</p>
        <textarea
          value={translateText}
          onChange={(e) => setTranslateText(e.target.value)}
          placeholder="Enter text to translate..."
          className="w-full bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark px-3 py-2 text-sm rounded-xl min-h-[60px] resize-none focus:outline-none focus:border-primary dark:focus:border-primary-dark focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark transition-colors"
          rows={2}
        />
        <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1">Translate to</p>
        <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
          {LANGUAGES.slice(0, 6).map((lang) => (
            <Chip
              key={lang.code}
              active={targetLang === lang.code}
              onClick={() => setTargetLang(lang.code)}
              size="xs"
              variant="ghost"
            >
              {lang.name}
            </Chip>
          ))}
        </div>
        <Button
          variant="gradient"
          size="xs"
          icon={FiGlobe}
          className="w-full"
          onClick={handleTranslate}
          disabled={translating || !translateText.trim()}
        >
          {translating ? 'Translating...' : 'Translate'}
        </Button>
      </div>

      {translateResult && (
        <motion.div initial={{ }} animate={{ }}>
          <GlassCard className="p-4">
            <p className="text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Original</p>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-3 italic">{translateResult.original}</p>
            <p className="text-[10px] font-medium text-primary dark:text-primary-dark mb-1">Translated</p>
            <p className="text-sm text-text-primary dark:text-text-primary-dark leading-relaxed">{translateResult.translated}</p>
            {translateResult.detectedLanguage && translateResult.detectedLanguage !== 'unknown' && (
              <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1">Detected: {translateResult.detectedLanguage}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Button variant="secondary" size="xs" icon={FiSend} onClick={() => handleSend('text', translateResult.translated)}>Send</Button>
              <Button variant="ghost" size="xs" icon={FiCopy} onClick={() => copyToClipboard(translateResult.translated, 'translate')}>
                {copiedId === 'translate' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'quick': return renderQuickTab();
      case 'emoji': return renderEmojiTab();
      case 'gif': return renderGifTab();
      case 'shayari': return renderShayariTab();
      case 'song': return renderSongTab();
      case 'video': return renderVideoTab();
      case 'summary': return renderSummaryTab();
      case 'rewrite': return renderRewriteTab();
      case 'translate': return renderTranslateTab();
      default: return null;
    }
  };

  return (
    <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border-t border-border dark:border-border-dark">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary dark:bg-primary-dark flex items-center justify-center text-white text-[10px] font-bold">AI</div>
          <span className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">AI Assistant</span>
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]">
          {collapsed ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
            {suggestionTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Chip key={tab.id} icon={Icon} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} size="xs" variant="ghost">
                  {tab.label}
                </Chip>
              );
            })}
          </div>

          <div className="px-4 pb-4 max-h-72 overflow-y-auto scrollbar-glass">
            <motion.div key={activeTab} initial={{ }} animate={{ }} transition={{ duration: 0.15 }}>
              {renderTabContent()}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
