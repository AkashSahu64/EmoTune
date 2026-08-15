import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import storyService from '../../services/storyService';
import { uploadFile } from '../../services/api';

const COLORS = ['#1a1a2e','#16213e','#0f3460','#533483','#e94560','#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6b9d','#00b4d8','#7209b7','#f72585','#06d6a0','#118ab2'];
const FONTS = [
  { name: 'Classic', value: 'serif' }, { name: 'Modern', value: 'sans-serif' },
  { name: 'Elegant', value: 'cursive' }, { name: 'Bold', value: 'Impact' },
  { name: 'Playful', value: 'Comic Sans MS' }, { name: 'Minimal', value: 'system-ui' },
  { name: 'Vintage', value: 'Georgia' }, { name: 'Handwritten', value: 'Segoe Print' },
];
const LAYOUTS = ['full','split','bottom','top','minimal','collage','meme','storybook'];
const FILTERS = ['Warm Glow','Cool Breeze','Golden Hour','Noir','Pastel Dream','Vivid Pop','Vintage','B&W Classic'];
const MOODS = ['happy','joyful','romantic','sad','energetic','calm','grateful','excited','thoughtful'];
const AUDIENCE_TYPES = ['public','close_friends','custom','private'];
const STORY_TYPES = [
  { value: 'text', label: 'Text', icon: 'Aa' },
  { value: 'image', label: 'Photo', icon: '📷' },
  { value: 'video', label: 'Video', icon: '🎬' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'voice', label: 'Voice', icon: '🎤' },
  { value: 'multi_image', label: 'Multi', icon: '📸' },
];

function StoryUploadModal({ onClose, onCreated }) {
  const [step, setStep] = useState('type');
  const [storyType, setStoryType] = useState('text');
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [font, setFont] = useState('serif');
  const [fontSize, setFontSize] = useState('24');
  const [textPosition, setTextPosition] = useState('center');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [layout, setLayout] = useState('full');
  const [mood, setMood] = useState('');
  const [audience, setAudience] = useState('public');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const fileInputRef = useRef(null);
  const voiceInputRef = useRef(null);
  const extraInputRef = useRef(null);

  useEffect(() => {
    if (step === 'type') {
      setAiSuggestions(null);
      setLoadingAI(true);
      storyService.getSuggestions().then(d => {
        setAiSuggestions(d.suggestions || d);
      }).catch(() => {}).finally(() => setLoadingAI(false));
    }
  }, [step]);

  const applyAICaption = () => {
    if (aiSuggestions?.captions?.length) {
      const c = aiSuggestions.captions[Math.floor(Math.random() * aiSuggestions.captions.length)];
      setCaption(c.text || c);
    }
  };

  const applyAIEmojis = () => {
    if (aiSuggestions?.emojis?.length) {
      toast.info(`Suggested emojis: ${aiSuggestions.emojis.slice(0, 5).join(' ')}`);
    }
  };

  const applyAIHashtags = () => {
    if (aiSuggestions?.hashtags?.length) {
      setTags(aiSuggestions.hashtags.map(h => (typeof h === 'string' ? h : h.tag || h.hashtag || '')).map(h => h.replace(/^#/, '')).filter(Boolean).slice(0, 5).join(', '));
    }
  };

  const applyAIBackground = () => {
    if (aiSuggestions?.backgrounds?.length) {
      const bg = aiSuggestions.backgrounds[0];
      setBgColor(bg.colors?.[0] || bg.color || bg.backgroundColor || COLORS[0]);
      if (bg.colors?.length > 1) {
        toast.info(`Suggested gradient: ${bg.colors.join(' → ')}`);
      }
    }
  };

  const applyAIFont = () => {
    if (aiSuggestions?.fonts?.length) {
      const sf = aiSuggestions.fonts[0];
      const matched = FONTS.find(f => f.name.toLowerCase() === sf.name?.toLowerCase() || f.value === sf.style);
      if (matched) setFont(matched.value);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('File too large. Max 50MB.'); return; }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleExtraImages = (e) => {
    const files = Array.from(e.target.files || []);
    setExtraImages(prev => [...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f), caption: '', order: prev.length }))]);
  };

  const handleCreateStory = async () => {
    setUploading(true);
    try {
      let mediaUrl = '';
      let mediaType = '';
      if (mediaFile) {
        const r = await uploadFile(mediaFile);
        mediaUrl = r.url || r.data?.url || '';
        mediaType = mediaFile.type;
      }

      let voiceUrl = '';
      let voiceDuration = 0;
      if (voiceFile) {
        const r = await uploadFile(voiceFile);
        voiceUrl = r.url || r.data?.url || '';
        voiceDuration = Math.round(voiceFile.size / 10000);
      }

      const uploadedExtra = await Promise.all(extraImages.map(async (img, i) => {
        if (!img.file) return img;
        const r = await uploadFile(img.file);
        return { url: r.url || r.data?.url || '', caption: img.caption, order: i };
      }));

      const typeMap = { image: 'image', video: 'video', music: 'music', voice: 'voice', multi_image: 'multi_image' };
      const storyData = {
        type: typeMap[storyType] || 'text',
        content: {
          text: ['text','music','voice'].includes(storyType) ? text : '',
          caption: caption || undefined,
          backgroundColor: ['text','music','voice'].includes(storyType) ? bgColor : undefined,
          font: ['text','music','voice'].includes(storyType) ? font : undefined,
          fontSize: storyType === 'text' ? fontSize : undefined,
          textPosition: storyType === 'text' ? textPosition : undefined,
          mediaUrl,
          mediaType,
          musicUrl: musicUrl || undefined,
          musicTitle: musicTitle || undefined,
          voiceUrl: voiceUrl || undefined,
          voiceDuration: voiceDuration || undefined,
          images: storyType === 'multi_image' ? uploadedExtra : undefined,
          filterName: filterName || undefined,
          layout: layout || undefined,
          mood: mood || undefined,
        },
        audience: { type: audience },
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean).map(t => `#${t.replace(/^#/, '')}`) : [],
        isDraft: false,
      };

      const result = await storyService.createStory(storyData);
      toast.success('Story created!');
      onCreated?.(result.story);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ }} animate={{ }} exit={{ }} onClick={onClose}
      role="dialog" aria-modal="true" aria-label="Create story">
      <motion.div className="relative w-full max-w-lg mx-4 bg-background rounded-2xl overflow-hidden border border-border shadow-floating max-h-[90vh] flex flex-col"
        initial={{ }} animate={{ }} exit={{ }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Create Story</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-hover/[0.07] text-text-secondary" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-glass">
          <AnimatePresence mode="wait">
            {step === 'type' && (
              <motion.div key="type" initial={{ }} animate={{ }} exit={{ }} className="p-5">
                <p className="text-xs text-text-secondary mb-4">What kind of story?</p>
                {loadingAI && <p className="text-[10px] text-text-secondary mb-2 italic">✨ Loading AI suggestions...</p>}
                {aiSuggestions?.bestTime && (
                  <p className="text-[9px] text-primary mb-3">⏰ Best time to post: {aiSuggestions.bestTime.hour}:00 {aiSuggestions.bestTime.dayOfWeek} — {aiSuggestions.bestTime.reason}</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {STORY_TYPES.map(t => (
                    <motion.button key={t.value}
                      onClick={() => { setStoryType(t.value); setStep('configure'); }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface backdrop-blur-glass hover:bg-hover/[0.07] border border-border transition-colors" type="button">
                      <div className="w-10 h-10 rounded-full bg-ai flex items-center justify-center text-white text-sm font-bold">{t.icon}</div>
                      <span className="text-xs font-medium text-text-primary">{t.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'configure' && (
              <motion.div key="configure" initial={{ }} animate={{ }} exit={{ }} className="p-5 space-y-4">
                {/* AI Suggestions Bar */}
                {aiSuggestions && (aiSuggestions.captions?.length || aiSuggestions.hashtags?.length || aiSuggestions.backgrounds?.length) && (
                  <div className="bg-surface backdrop-blur-glass rounded-xl p-3 border border-purple-500/20">
                    <p className="text-[10px] font-medium text-purple-400 mb-2">✨ AI Suggestions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiSuggestions.captions?.length > 0 && <AIChip label={`💬 Caption (${aiSuggestions.captions.length})`} onClick={applyAICaption} />}
                      {aiSuggestions.hashtags?.length > 0 && <AIChip label={`# Hashtags (${aiSuggestions.hashtags.length})`} onClick={applyAIHashtags} />}
                      {aiSuggestions.emojis?.length > 0 && <AIChip label={`😊 Emojis (${aiSuggestions.emojis.length})`} onClick={applyAIEmojis} />}
                      {aiSuggestions.backgrounds?.length > 0 && <AIChip label={`🎨 Background`} onClick={applyAIBackground} />}
                      {aiSuggestions.fonts?.length > 0 && <AIChip label={`📝 Font`} onClick={applyAIFont} />}
                    </div>
                  </div>
                )}

                {/* Text Input */}
                {['text','music','voice'].includes(storyType) && (
                  <div>
                    <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Text</label>
                    <div className="w-full min-h-[180px] rounded-xl flex items-start justify-center p-4 transition-colors" style={{ backgroundColor: bgColor }}>
                      <textarea value={text} onChange={e => setText(e.target.value.slice(0, 500))}
                        placeholder="What's on your mind?" className="w-full bg-transparent text-white text-center resize-none focus:outline-none placeholder-white/40 leading-relaxed"
                        style={{ fontFamily: font, fontSize: `${fontSize}px` }} rows={3} maxLength={500} />
                    </div>
                  </div>
                )}

                {/* Caption */}
                {storyType !== 'multi_image' && (
                  <div>
                    <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Caption {aiSuggestions?.captions?.length > 0 && <button onClick={applyAICaption} className="text-purple-400 normal-case ml-1">✨ suggest</button>}</label>
                    <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." className="w-full px-3 py-2 rounded-xl bg-[var(--theme-glass)] border border-border text-xs text-text-primary placeholder:text-placeholder focus:outline-none focus:border-primary" />
                  </div>
                )}

                {/* Media Upload */}
                {(storyType === 'image' || storyType === 'video') && (
                  <MediaUploadBlock mediaPreview={mediaPreview} mediaFile={mediaFile} onSelect={() => fileInputRef.current?.click()} onRemove={() => { setMediaFile(null); setMediaPreview(null); }} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} />
                )}

                {/* Multi Image */}
                {storyType === 'multi_image' && (
                  <MultiImageBlock extraImages={extraImages} onAdd={() => extraInputRef.current?.click()} onRemove={(i) => setExtraImages(prev => prev.filter((_, idx) => idx !== i))} extraInputRef={extraInputRef} handleExtraImages={handleExtraImages} />
                )}

                {/* Music */}
                {storyType === 'music' && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Music URL</label>
                      <input value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-[var(--theme-glass)] border border-border text-xs text-text-primary focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Song Title</label>
                      <input value={musicTitle} onChange={e => setMusicTitle(e.target.value)} placeholder="Song name..." className="w-full px-3 py-2 rounded-xl bg-[var(--theme-glass)] border border-border text-xs text-text-primary focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                )}

                {/* Voice */}
                {storyType === 'voice' && (
                  <div>
                    <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Voice Recording</label>
                    <button onClick={() => voiceInputRef.current?.click()} className="w-full py-8 rounded-xl border-2 border-dashed border-border flex flex-col items-center gap-2 hover:border-primary/50 transition-colors" type="button">
                      <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                      </div>
                      <span className="text-xs text-text-secondary">{voiceFile ? voiceFile.name : 'Upload voice recording'}</span>
                    </button>
                    <input ref={voiceInputRef} type="file" accept="audio/*" className="hidden" onChange={e => setVoiceFile(e.target.files?.[0] || null)} />
                  </div>
                )}

                {/* Colors & Fonts (for text/music/voice) */}
                {['text','music','voice'].includes(storyType) && (
                  <>
                    <ColorPicker colors={COLORS} selected={bgColor} onChange={setBgColor} />
                    <FontPicker fonts={FONTS} selected={font} onChange={setFont} />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Size</label>
                        <div className="flex gap-1.5">
                          {['18','24','32','40'].map(s => (
                            <button key={s} onClick={() => setFontSize(s)} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${fontSize === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`} type="button">{s}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Position</label>
                        <div className="flex gap-1.5">
                          {['top','center','bottom'].map(p => (
                            <button key={p} onClick={() => setTextPosition(p)} className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition-colors ${textPosition === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`} type="button">{p}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Filters */}
                {storyType === 'image' && (
                  <div>
                    <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Filter {aiSuggestions?.filters?.length > 0 && <button onClick={() => { const f = aiSuggestions.filters[0]; setFilterName(f.name); }} className="text-purple-400 normal-case ml-1">✨ suggest</button>}</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setFilterName('')} className={`px-2.5 py-1 rounded-lg text-[10px] border transition-colors ${!filterName ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`} type="button">None</button>
                      {FILTERS.map(f => <button key={f} onClick={() => setFilterName(f)} className={`px-2.5 py-1 rounded-lg text-[10px] border transition-colors ${filterName === f ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`} type="button">{f}</button>)}
                    </div>
                  </div>
                )}

                {/* Layout */}
                {storyType === 'text' && (
                  <div>
                    <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Layout {aiSuggestions?.layouts?.length > 0 && <button onClick={() => { const l = aiSuggestions.layouts[0]; setLayout(l.preview || l.name); }} className="text-purple-400 normal-case ml-1">✨ suggest</button>}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {LAYOUTS.map(l => <button key={l} onClick={() => setLayout(l)} className={`px-2.5 py-1 rounded-lg text-[10px] border capitalize transition-colors ${layout === l ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`} type="button">{l}</button>)}
                    </div>
                  </div>
                )}

                {/* Mood */}
                <div>
                  <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Mood {aiSuggestions?.mood && <span className="text-purple-400 normal-case ml-1">✨ detected: {aiSuggestions.mood}</span>}</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setMood('')} className={`px-2.5 py-1 rounded-lg text-[10px] border transition-colors ${!mood ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`} type="button">None</button>
                    {MOODS.map(m => <button key={m} onClick={() => setMood(m)} className={`px-2.5 py-1 rounded-lg text-[10px] border capitalize transition-colors ${mood === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`} type="button">{m === 'joyful' ? '😊' : m === 'romantic' ? '❤️' : m === 'sad' ? '😢' : m === 'energetic' ? '⚡' : m === 'calm' ? '🌊' : m === 'grateful' ? '🙏' : m === 'excited' ? '🔥' : m === 'thoughtful' ? '🤔' : '😄'} {m}</button>)}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Tags {aiSuggestions?.hashtags?.length > 0 && <button onClick={applyAIHashtags} className="text-purple-400 normal-case ml-1">✨ generate</button>}</label>
                  <input value={tags} onChange={e => setTags(e.target.value)} placeholder="vibes, mood, daily (comma separated)" className="w-full px-3 py-2 rounded-xl bg-[var(--theme-glass)] border border-border text-xs text-text-primary placeholder:text-placeholder focus:outline-none focus:border-primary" />
                </div>

                {/* Audience */}
                <div>
                  <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Audience {aiSuggestions?.privacy && <span className="text-purple-400 normal-case ml-1">✨ recommended: {aiSuggestions.privacy.recommended}</span>}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AUDIENCE_TYPES.map(a => <button key={a} onClick={() => setAudience(a)} className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition-colors ${audience === a ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`} type="button">{a === 'public' ? '🌍' : a === 'close_friends' ? '👥' : a === 'custom' ? '✏️' : '🔒'} {a.replace('_',' ')}</button>)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <motion.button onClick={() => setStep('type')} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-text-secondary hover:bg-hover/[0.07] transition-colors" type="button">Back</motion.button>
                  <motion.button onClick={handleCreateStory} disabled={uploading || (!text && !mediaFile && !musicUrl && !voiceFile)} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-white disabled:opacity-50 transition-colors" type="button">
                    {uploading ? 'Creating...' : 'Share'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AIChip({ label, onClick }) {
  return (
    <motion.button onClick={onClick}
      className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors" type="button">
      {label}
    </motion.button>
  );
}

function ColorPicker({ colors, selected, onChange }) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Background Color</label>
      <div className="flex flex-wrap gap-2">
        {colors.map(c => (
          <motion.button key={c} onClick={() => onChange(c)}
            className={`h-8 w-8 rounded-full border-2 transition-colors ${selected === c ? 'border-white ring-2 ring-primary/40' : 'border-transparent'}`}
            style={{ backgroundColor: c }} type="button" />
        ))}
      </div>
    </div>
  );
}

function FontPicker({ fonts, selected, onChange }) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Font Style</label>
      <div className="flex flex-wrap gap-1.5">
        {fonts.map(f => (
          <button key={f.name} onClick={() => onChange(f.value)} className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${selected === f.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:bg-hover/[0.07]'}`}
            style={{ fontFamily: f.value }} type="button">{f.name}</button>
        ))}
      </div>
    </div>
  );
}

function MediaUploadBlock({ mediaPreview, mediaFile, onSelect, onRemove, fileInputRef, handleFileSelect }) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Media</label>
      {mediaPreview ? (
        <div className="w-full min-h-[180px] rounded-xl overflow-hidden mb-2 bg-black/10 flex items-center justify-center relative">
          {mediaFile?.type?.startsWith('video/') ? (
            <video src={mediaPreview} className="w-full max-h-[180px] object-contain" controls />
          ) : (
            <img src={mediaPreview} alt="" className="w-full max-h-[180px] object-contain" />
          )}
          <button onClick={onRemove} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white text-xs" type="button">✕</button>
        </div>
      ) : (
        <div onClick={onSelect} className="w-full min-h-[120px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <span className="text-xs text-text-secondary">Upload Photo or Video</span>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}

function MultiImageBlock({ extraImages, onAdd, onRemove, extraInputRef, handleExtraImages }) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-1.5 block">Images ({extraImages.length})</label>
      <div className="grid grid-cols-3 gap-2">
        {extraImages.map((img, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-black/10">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => onRemove(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white text-[8px]" type="button">✕</button>
          </div>
        ))}
        <button onClick={onAdd} className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--theme-text-secondary)" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <input ref={extraInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtraImages} />
    </div>
  );
}

export default StoryUploadModal;
