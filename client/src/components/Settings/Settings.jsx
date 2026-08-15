import { useState, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FiX, FiSave, FiUser, FiEye, FiEyeOff, FiBell, FiLock, FiMessageCircle,
  FiZap, FiImage, FiHeart, FiSliders, FiTrash2, FiCamera,
  FiSun, FiMonitor, FiChevronRight, FiAlertTriangle, FiClock,
  FiSmartphone, FiGlobe, FiRefreshCw, FiDownload, FiPlus,
  FiEdit2, FiCheck, FiMaximize2, FiShield, FiCpu, FiSmile
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { userService, personaService } from '../../services/api';
import {
  Toggle, Select, Slider, ScrollArea, Button, Badge, Card, Divider
} from '../ui';

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'custom', label: 'Custom' },
];

const TONES_WITH_EMOJI = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'custom', label: 'Custom' },
];

const CATEGORIES = [
  { id: 'account', label: 'Account', icon: FiUser, group: 'General' },
  { id: 'appearance', label: 'Appearance', icon: FiSun, group: 'General' },
  { id: 'notifications', label: 'Notifications', icon: FiBell, group: 'General' },
  { id: 'privacy', label: 'Privacy & Security', icon: FiShield, group: 'General' },
  { id: 'chat', label: 'Chat', icon: FiMessageCircle, group: 'Chat' },
  { id: 'personas', label: 'Personas', icon: FiSmile, group: 'Chat' },
  { id: 'ai', label: 'AI Features', icon: FiCpu, group: 'Chat' },
  { id: 'ghost', label: 'Ghost Mode', icon: FiEyeOff, group: 'Privacy' },
  { id: 'media', label: 'Media', icon: FiImage, group: 'Privacy' },
  { id: 'accessibility', label: 'Accessibility', icon: FiHeart, group: 'Preferences' },
  { id: 'advanced', label: 'Advanced', icon: FiSliders, group: 'Preferences' },
];

const GROUP_ORDER = ['General', 'Chat', 'Privacy', 'Preferences'];
const CATEGORIES_BY_GROUP = {};
CATEGORIES.forEach((c) => {
  if (!CATEGORIES_BY_GROUP[c.group]) CATEGORIES_BY_GROUP[c.group] = [];
  CATEGORIES_BY_GROUP[c.group].push(c);
});

function SettingRow({ icon: Icon, label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-surface backdrop-blur-glass border border-border rounded-xl hover:bg-hover/[0.07] transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {Icon && <Icon className="mt-0.5 text-text-secondary flex-shrink-0" size={16} />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">{children}</div>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description && <p className="text-xs text-text-secondary mt-1">{description}</p>}
    </div>
  );
}

const defaultPreferences = {
  account: { displayName: '', about: '' },
  appearance: { fontSize: 'medium', messageDensity: 'comfortable', showTimestamps: true, enterToSend: true, showEmojiSuggestions: true, reduceMotion: false, highContrast: false },
  notifications: { pushEnabled: true, messagePreview: true, soundEnabled: true, vibration: true, silentMode: false, doNotDisturb: { enabled: false, startTime: '22:00', endTime: '08:00' }, groupNotifications: true },
  privacy: { readReceipts: true, profilePhotoVisibility: 'everyone', onlineStatus: 'everyone', blockedUsers: [], twoFactorEnabled: false },
  chat: { enterToSend: true, autoSaveMedia: false, inlineMedia: true, linkPreviews: true, typingIndicators: true, voiceMessages: true },
  ai: { autoSuggestions: true, personaCreativity: 50, emotionDetection: true, truthSyncVisibility: true, smartReplies: true, factCheck: true, decideFlow: true },
  ghostMode: { defaultDuration: 5, autoEnable: false, visibility: 'offline', typingDisguise: false },
  media: { autoDownloadPhotos: true, autoDownloadVideo: false, autoDownloadAudio: false, dataSaver: false, defaultWallpaper: '' },
  accessibility: { reduceMotion: false, highContrast: false, screenReader: false, closedCaptions: false, linkUnderline: false },
  advanced: { messageHistoryDays: 365, autoBackup: false, backupFrequency: 'daily', dataUsageWarn: true, cacheEnabled: true },
};

function PersonasSettings({ user }) {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', tone: 'casual', customPrompt: '', color: 'var(--theme-primary)' });
  const [saving, setSaving] = useState(false);

  const fetchPersonas = async () => {
    try {
      const { data } = await personaService.getAll();
      setPersonas(data.personas || []);
    } catch {
      toast.error('Failed to load personas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPersonas(); }, []);

  const resetForm = () => {
    setForm({ name: '', tone: 'casual', customPrompt: '', color: 'var(--theme-primary)' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (persona) => {
    setForm({ name: persona.name, tone: persona.tone, customPrompt: persona.customPrompt || '', color: persona.color || 'var(--theme-primary)' });
    setEditingId(persona._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (editingId) {
        const data = await personaService.update(editingId, form);
        setPersonas(data.data.personas || personas.map((p) => p._id === editingId ? { ...p, ...form } : p));
        toast.success('Persona updated');
      } else {
        const data = await personaService.create(form);
        setPersonas(data.data.personas || [...personas, { ...form, _id: Date.now().toString() }]);
        toast.success('Persona created');
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save persona');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (personaId) => {
    try {
      const data = await personaService.delete(personaId);
      setPersonas(data.data.personas || personas.filter((p) => p._id !== personaId));
      toast.success('Persona deleted');
      if (editingId === personaId) resetForm();
    } catch {
      toast.error('Failed to delete persona');
    }
  };

  const handleActivate = async (personaId) => {
    try {
      const data = await personaService.activate(personaId);
      setPersonas(data.data.personas || personas.map((p) => ({ ...p, isActive: p._id === personaId })));
      toast.success('Persona activated');
    } catch {
      toast.error('Failed to activate persona');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Personas" description="Create and manage AI personas" />
        <div className="text-sm text-text-secondary">Loading personas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Personas" description="Create and manage AI personas. Select one from the chat toolbar to use it." />

      {personas.length === 0 && !showForm && (
        <div className="p-6 bg-surface backdrop-blur-glass border border-border rounded-xl text-center">
          <p className="text-sm text-text-secondary mb-3">No personas yet. Create your first one!</p>
          <Button onClick={() => setShowForm(true)} variant="secondary">
            <FiPlus size={16} /> Create Persona
          </Button>
        </div>
      )}

      {(personas.length > 0 || showForm) && (
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} variant="secondary" className="w-full justify-center">
          {showForm ? <FiX size={16} /> : <FiPlus size={16} />}
          {showForm ? 'Cancel' : 'Create Persona'}
        </Button>
      )}

      {showForm && (
        <motion.div
          initial={{  height: 0 }}
          animate={{  height: 'auto' }}
          exit={{  height: 0 }}
          className="overflow-hidden"
        >
          <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
            <h4 className="text-sm font-medium text-text-primary">{editingId ? 'Edit Persona' : 'New Persona'}</h4>

            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Friendly Assistant" maxLength={50} className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl" />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Tone</label>
              <Select value={form.tone} onChange={(v) => setForm({ ...form, tone: v })} options={TONES_WITH_EMOJI} />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Custom Prompt</label>
              <textarea value={form.customPrompt} onChange={(e) => setForm({ ...form, customPrompt: e.target.value })} placeholder="Instructions for the AI persona..." maxLength={500} rows={3} className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl resize-none" />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded-xl cursor-pointer border border-border" />
                <span className="text-xs text-text-secondary">{form.color}</span>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !form.name.trim()} variant="primary" className="w-full">
              <FiSave size={16} /> {saving ? 'Saving...' : editingId ? 'Update Persona' : 'Create Persona'}
            </Button>
          </div>
        </motion.div>
      )}

      {personas.length > 0 && (
        <div className="space-y-2">
          {personas.map((persona) => (
            <div
              key={persona._id}
              className={`p-4 bg-surface backdrop-blur-glass border border-border rounded-xl border transition-colors ${persona.isActive ? 'border-primary' : 'border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: persona.color || 'var(--theme-primary)', color: '#fff' }}>
                  {persona.name[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary truncate">{persona.name}</p>
                    {persona.isActive && (
                      <Badge variant="primary">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary capitalize">{persona.tone}</p>
                  {persona.customPrompt && (
                    <p className="text-xs text-text-secondary mt-1 truncate">{persona.customPrompt}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!persona.isActive && (
                    <button onClick={() => handleActivate(persona._id)} className="p-2 rounded-lg hover:bg-hover/[0.07] text-text-secondary hover:text-primary transition-colors" title="Activate" type="button">
                      <FiCheck size={16} />
                    </button>
                  )}
                  <button onClick={() => handleEdit(persona)} className="p-2 rounded-lg hover:bg-hover/[0.07] text-text-secondary hover:text-text-primary transition-colors" title="Edit" type="button">
                    <FiEdit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(persona._id)} className="p-2 rounded-lg hover:bg-hover/[0.07] text-text-secondary hover:text-danger transition-colors" title="Delete" type="button">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AvatarPreviewModal({ src, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      initial={{ }} animate={{ }} exit={{ }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Profile photo preview"
    >
      <motion.div
        className="relative max-w-lg max-h-lg"
        initial={{ }} animate={{ }} exit={{ }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={src} alt="Profile photo preview" className="max-w-full max-h-[80vh] rounded-2xl shadow-floating" />
        <IconButton icon={FiX} onClick={onClose} className="absolute -top-3 -right-3 shadow-lg" aria-label="Close preview" />
      </motion.div>
    </motion.div>
  );
}

function AccountSettings({ pref, onUpdate, user, onProfileUpdate }) {
  const [form, setForm] = useState({
    username: user?.username || '',
    displayName: pref.account?.displayName || '',
    bio: user?.bio || '',
    about: pref.account?.about || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    wallpaper: user?.wallpaper || '',
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setForm({
      username: user?.username || '',
      displayName: pref.account?.displayName || '',
      bio: user?.bio || '',
      about: pref.account?.about || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
      wallpaper: user?.wallpaper || '',
    });
  }, [user, pref]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm((prev) => ({ ...prev, avatar: ev.target.result }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Failed to read image');
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await userService.updateProfile({
        username: form.username,
        displayName: form.displayName,
        bio: form.bio,
        about: form.about,
        phone: form.phone,
        avatar: form.avatar,
        wallpaper: form.wallpaper,
      });
      onProfileUpdate(data.user);
      onUpdate('account', { displayName: form.displayName, about: form.about });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Account" description="Manage your profile information" />

      <div className="flex items-center gap-4 p-4 bg-surface backdrop-blur-glass border border-border rounded-xl">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold overflow-hidden cursor-pointer group"
            onClick={() => form.avatar && setShowPreview(true)}
          >
            {form.avatar ? (
              <>
                <img src={form.avatar} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <FiMaximize2 size={18} />
                </div>
              </>
            ) : (
              form.username?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            aria-label="Upload avatar"
            type="button"
          >
            {uploading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCamera size={12} />}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{user?.username}</p>
          <p className="text-xs text-text-secondary">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Display Name</label>
          <input type="text" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your display name" className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Username</label>
          <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Bio</label>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={2} maxLength={200} className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl resize-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">About</label>
          <textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={2} maxLength={500} className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl resize-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 123-4567" className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} variant="secondary" className="w-full">
        <FiSave size={16} /> {saving ? 'Saving...' : 'Save Profile'}
      </Button>

      <AnimatePresence>
        {showPreview && form.avatar && (
          <AvatarPreviewModal key="avatar-preview" src={form.avatar} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function AppearanceSettings({ pref, onUpdate, theme, setTheme, themes, emotionThemeEnabled, toggleEmotionTheme }) {
  const p = pref.appearance || defaultPreferences.appearance;

  const handleChange = (key, value) => {
    onUpdate('appearance', { ...p, [key]: value });
    if (key === 'fontSize') {
      document.documentElement.style.setProperty('--chat-font-size', value === 'small' ? '13px' : value === 'large' ? '16px' : '14px');
    }
    if (key === 'reduceMotion') {
      document.documentElement.style.setProperty('--reduce-motion', value ? 'reduce' : 'none');
    }
    if (key === 'highContrast') {
      document.documentElement.classList.toggle('high-contrast', value);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Appearance" description="Customize how the chat looks" />

      <div className="glass-elevated space-y-4 rounded-xl p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.slice(0, 6).map((t) => (
            <button
              key={t.id}
              data-theme={t.id === 'system' ? undefined : t.id}
              onClick={() => setTheme(t.id)}
              className={`interactive relative aspect-[4/3] overflow-hidden rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 ${
                theme === t.id ? 'border-primary bg-selection/10' : 'border-border/25 bg-surface/65 hover:border-border/50'
              }`}
            >
              <div className="w-full h-full flex flex-col">
                <div className="flex h-1/3 items-center justify-center bg-primary text-[10px] font-medium text-on-primary">
                  {t.name || t.id}
                </div>
                <div className="flex flex-1 gap-1 bg-background/80 p-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex-1 rounded bg-surface-elevated/80" style={{
                      height: `${50 + i * 20}%`,
                      alignSelf: i === 2 ? 'flex-end' : i === 1 ? 'center' : 'flex-start',
                    }} />
                  ))}
                </div>
              </div>
              {theme === t.id && (
                <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <FiCheck size={10} className="text-on-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Customization</p>

        <SettingRow icon={FiMonitor} label="Emotion Auto-Theme" description="Automatically change theme based on conversation mood">
          <Toggle value={emotionThemeEnabled} onChange={toggleEmotionTheme} />
        </SettingRow>

        <SettingRow label="Font Size" description="Adjust text size in chats">
          <Select value={p.fontSize} onChange={(v) => handleChange('fontSize', v)} options={[
            { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' },
          ]} />
        </SettingRow>

        <SettingRow label="Message Density" description="Spacing between messages">
          <Select value={p.messageDensity} onChange={(v) => handleChange('messageDensity', v)} options={[
            { value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' },
          ]} />
        </SettingRow>

        <SettingRow label="Show Timestamps" description="Display message timestamps">
          <Toggle value={p.showTimestamps} onChange={(v) => handleChange('showTimestamps', v)} />
        </SettingRow>

        <SettingRow label="Enter to Send" description="Press Enter to send messages">
          <Toggle value={p.enterToSend} onChange={(v) => handleChange('enterToSend', v)} />
        </SettingRow>

        <SettingRow label="Emoji Suggestions" description="Show emoji suggestions while typing">
          <Toggle value={p.showEmojiSuggestions} onChange={(v) => handleChange('showEmojiSuggestions', v)} />
        </SettingRow>

        <SettingRow label="Reduce Motion" description="Minimize animations">
          <Toggle value={p.reduceMotion} onChange={(v) => handleChange('reduceMotion', v)} />
        </SettingRow>

        <SettingRow label="High Contrast" description="Increase visual contrast">
          <Toggle value={p.highContrast} onChange={(v) => handleChange('highContrast', v)} />
        </SettingRow>
      </div>
    </div>
  );
}

function NotificationSettings({ pref, onUpdate }) {
  const p = pref.notifications || defaultPreferences.notifications;

  const requestPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleChange = (key, value) => {
    if (key === 'pushEnabled' && value) requestPermission();
    if (key === 'silentMode' && value) {
      onUpdate('notifications', { ...p, silentMode: true, soundEnabled: false, vibration: false });
      return;
    }
    onUpdate('notifications', { ...p, [key]: value });
  };

  const handleDND = (key, value) => {
    onUpdate('notifications', { ...p, doNotDisturb: { ...p.doNotDisturb, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Notifications" description="Control what alerts you receive" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">General</p>

        <SettingRow icon={FiBell} label="Push Notifications" description="Receive push notifications">
          <Toggle value={p.pushEnabled} onChange={(v) => handleChange('pushEnabled', v)} />
        </SettingRow>

        <SettingRow label="Message Preview" description="Show message content in notifications">
          <Toggle value={p.messagePreview} onChange={(v) => onUpdate('notifications', { ...p, messagePreview: v })} />
        </SettingRow>

        <SettingRow label="Group Notifications" description="Notifications for group chats">
          <Toggle value={p.groupNotifications} onChange={(v) => onUpdate('notifications', { ...p, groupNotifications: v })} />
        </SettingRow>

        <Divider />

        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Sounds & Haptics</p>

        <SettingRow label="Sound" description="Play sound for new messages">
          <Toggle value={p.soundEnabled} onChange={(v) => onUpdate('notifications', { ...p, soundEnabled: v })} disabled={p.silentMode} />
        </SettingRow>

        <SettingRow label="Vibration" description="Vibrate on new messages">
          <Toggle value={p.vibration} onChange={(v) => onUpdate('notifications', { ...p, vibration: v })} disabled={p.silentMode} />
        </SettingRow>

        <SettingRow label="Silent Mode" description="Mute all notifications">
          <Toggle value={p.silentMode} onChange={(v) => handleChange('silentMode', v)} />
        </SettingRow>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Do Not Disturb</p>
            <p className="text-xs text-text-secondary">Mute notifications during set hours</p>
          </div>
          <Toggle value={p.doNotDisturb.enabled} onChange={(v) => handleDND('enabled', v)} />
        </div>
        {p.doNotDisturb.enabled && (
          <motion.div
            initial={{  height: 0 }}
            animate={{  height: 'auto' }}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="flex-1">
              <label className="text-[10px] text-text-secondary block mb-1">From</label>
              <input type="time" value={p.doNotDisturb.startTime} onChange={(e) => handleDND('startTime', e.target.value)} className="bg-surface backdrop-blur-glass border border-border w-full px-2 py-1.5 text-xs rounded-xl" />
            </div>
            <FiChevronRight size={14} className="text-text-secondary mt-4 flex-shrink-0" />
            <div className="flex-1">
              <label className="text-[10px] text-text-secondary block mb-1">To</label>
              <input type="time" value={p.doNotDisturb.endTime} onChange={(e) => handleDND('endTime', e.target.value)} className="bg-surface backdrop-blur-glass border border-border w-full px-2 py-1.5 text-xs rounded-xl" />
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
}

function PrivacySecuritySettings({ pref, onUpdate, user }) {
  const p = pref.privacy || defaultPreferences.privacy;

  const visibilityOptions = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'my_contacts', label: 'My Contacts' },
    { value: 'nobody', label: 'Nobody' },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Privacy" description="Control your visibility and data" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Visibility</p>

        <SettingRow icon={FiEye} label="Last Seen" description="Who can see your last seen time">
          <Select value={p.lastSeen} onChange={(v) => onUpdate('privacy', { ...p, lastSeen: v })} options={visibilityOptions} />
        </SettingRow>

        <SettingRow label="Read Receipts" description="Show when you've read messages">
          <Toggle value={p.readReceipts} onChange={(v) => onUpdate('privacy', { ...p, readReceipts: v })} />
        </SettingRow>

        <SettingRow label="Profile Photo" description="Who can see your profile photo">
          <Select value={p.profilePhotoVisibility} onChange={(v) => onUpdate('privacy', { ...p, profilePhotoVisibility: v })} options={visibilityOptions} />
        </SettingRow>

        <SettingRow label="Online Status" description="Who can see when you're online">
          <Select value={p.onlineStatus} onChange={(v) => onUpdate('privacy', { ...p, onlineStatus: v })} options={visibilityOptions} />
        </SettingRow>
      </div>

      <SectionHeader title="Security" description="Protect your account" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <SettingRow icon={FiLock} label="Two-Factor Authentication" description="Add an extra layer of security">
          <Toggle value={p.twoFactorEnabled} onChange={(v) => onUpdate('privacy', { ...p, twoFactorEnabled: v })} />
        </SettingRow>
      </div>

      <ChangePasswordSection />

      <SessionsSection />
    </div>
  );
}

function ChangePasswordSection() {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await userService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShow(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <button onClick={() => setShow(!show)} className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <FiLock size={16} /> Change Password
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{  height: 0 }}
            animate={{  height: 'auto' }}
            exit={{  height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} placeholder="Current password" className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl" />
            <input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} placeholder="New password" className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl" />
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm new password" className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl" />
            <Button onClick={handleChange} disabled={saving} variant="secondary" className="w-full">
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function SessionsSection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data } = await userService.getSessions();
      setSessions(data.sessions || []);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const logoutOthers = async () => {
    try {
      await userService.logoutOtherSessions();
      toast.success('Other sessions terminated');
      fetchSessions();
    } catch {
      toast.error('Failed to terminate sessions');
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiSmartphone size={16} className="text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">Active Sessions</span>
        </div>
        <button onClick={fetchSessions} className="text-xs text-primary hover:underline focus:outline-none">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      {sessions.length > 0 ? (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-xs text-text-secondary py-1 border-b border-border last:border-0">
              <span>{s.userAgent?.slice(0, 30)}</span>
              <span className={`${s.isCurrent ? 'text-success' : ''}`}>{s.isCurrent ? 'Current' : new Date(s.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-secondary">No active sessions found</p>
      )}
      {sessions.length > 1 && (
        <Button onClick={logoutOthers} variant="secondary" className="w-full text-danger">
          Terminate other sessions
        </Button>
      )}
    </Card>
  );
}

function ChatSettings({ pref, onUpdate }) {
  const p = pref.chat || defaultPreferences.chat;

  return (
    <div className="space-y-4">
      <SectionHeader title="Chat" description="Configure chat behavior" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <SettingRow icon={FiMessageCircle} label="Enter to Send" description="Press Enter to send, Shift+Enter for new line">
          <Toggle value={p.enterToSend} onChange={(v) => onUpdate('chat', { ...p, enterToSend: v })} />
        </SettingRow>

        <SettingRow label="Inline Media" description="Display media inline in chat">
          <Toggle value={p.inlineMedia} onChange={(v) => onUpdate('chat', { ...p, inlineMedia: v })} />
        </SettingRow>

        <SettingRow label="Link Previews" description="Generate previews for shared links">
          <Toggle value={p.linkPreviews} onChange={(v) => onUpdate('chat', { ...p, linkPreviews: v })} />
        </SettingRow>

        <SettingRow label="Typing Indicators" description="Show when others are typing">
          <Toggle value={p.typingIndicators} onChange={(v) => onUpdate('chat', { ...p, typingIndicators: v })} />
        </SettingRow>

        <SettingRow label="Voice Messages" description="Enable voice message recording">
          <Toggle value={p.voiceMessages} onChange={(v) => onUpdate('chat', { ...p, voiceMessages: v })} />
        </SettingRow>

        <Divider />

        <SettingRow icon={FiDownload} label="Auto-Save Media" description="Automatically save received media">
          <Toggle value={p.autoSaveMedia} onChange={(v) => onUpdate('chat', { ...p, autoSaveMedia: v })} />
        </SettingRow>
      </div>
    </div>
  );
}

function AISettings({ pref, onUpdate }) {
  const p = pref.ai || defaultPreferences.ai;

  const visibilityOptions = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'my_contacts', label: 'My Contacts' },
    { value: 'nobody', label: 'Nobody' },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="AI Features" description="Control AI-powered features" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Suggestions</p>

        <SettingRow icon={FiZap} label="Auto-Suggestions" description="AI suggests replies and content">
          <Toggle value={p.autoSuggestions} onChange={(v) => onUpdate('ai', { ...p, autoSuggestions: v })} />
        </SettingRow>

        <SettingRow label="Smart Replies" description="Quick AI-generated response suggestions">
          <Toggle value={p.smartReplies} onChange={(v) => onUpdate('ai', { ...p, smartReplies: v })} />
        </SettingRow>

        <Divider />

        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Detection</p>

        <SettingRow label="Emotion Detection" description="Analyze conversation mood automatically">
          <Toggle value={p.emotionDetection} onChange={(v) => onUpdate('ai', { ...p, emotionDetection: v })} />
        </SettingRow>

        <SettingRow label="Fact Check" description="Verify claims with AI fact-checking">
          <Toggle value={p.factCheck} onChange={(v) => onUpdate('ai', { ...p, factCheck: v })} />
        </SettingRow>

        <SettingRow label="Decide Flow" description="AI-powered group decision making">
          <Toggle value={p.decideFlow} onChange={(v) => onUpdate('ai', { ...p, decideFlow: v })} />
        </SettingRow>

        <Divider />

        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Response Settings</p>

        <SettingRow label="Persona Creativity" description="AI creativity level for persona responses">
          <Slider value={p.personaCreativity} onChange={(v) => onUpdate('ai', { ...p, personaCreativity: v })} min={0} max={100} label="%" />
        </SettingRow>

        <SettingRow icon={FiEye} label="TruthSync Visibility" description="Who can see fact-check results">
          <Select value={p.truthSyncVisibility} onChange={(v) => onUpdate('ai', { ...p, truthSyncVisibility: v })} options={visibilityOptions} />
        </SettingRow>
      </div>
    </div>
  );
}

function GhostModeSettings({ pref, onUpdate }) {
  const p = pref.ghostMode || defaultPreferences.ghostMode;

  return (
    <div className="space-y-4">
      <SectionHeader title="Ghost Mode" description="Browse chats invisibly" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <SettingRow icon={FiEyeOff} label="Auto-Enable" description="Automatically enable ghost mode">
          <Toggle value={p.autoEnable} onChange={(v) => onUpdate('ghostMode', { ...p, autoEnable: v })} />
        </SettingRow>

        <SettingRow label="Default Duration" description="Minutes before ghost mode expires">
          <Slider value={p.defaultDuration} onChange={(v) => onUpdate('ghostMode', { ...p, defaultDuration: v })} min={1} max={60} label="m" />
        </SettingRow>

        <SettingRow label="Visibility" description="How you appear in ghost mode">
          <Select value={p.visibility} onChange={(v) => onUpdate('ghostMode', { ...p, visibility: v })} options={[
            { value: 'offline', label: 'Offline' },
            { value: 'online', label: 'Online (no typing)' },
            { value: 'typing', label: 'Typing hidden' },
          ]} />
        </SettingRow>

        <SettingRow label="Typing Disguise" description="Hide typing indicator">
          <Toggle value={p.typingDisguise} onChange={(v) => onUpdate('ghostMode', { ...p, typingDisguise: v })} />
        </SettingRow>
      </div>
    </div>
  );
}

function MediaSettings({ pref, onUpdate }) {
  const p = pref.media || defaultPreferences.media;

  return (
    <div className="space-y-4">
      <SectionHeader title="Media" description="Control media downloads and data usage" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Auto-Download</p>

        <SettingRow icon={FiImage} label="Photos" description="Automatically download photos">
          <Toggle value={p.autoDownloadPhotos} onChange={(v) => onUpdate('media', { ...p, autoDownloadPhotos: v })} />
        </SettingRow>

        <SettingRow icon={FiDownload} label="Videos" description="Automatically download videos">
          <Toggle value={p.autoDownloadVideo} onChange={(v) => onUpdate('media', { ...p, autoDownloadVideo: v })} />
        </SettingRow>

        <SettingRow label="Audio" description="Automatically download voice messages">
          <Toggle value={p.autoDownloadAudio} onChange={(v) => onUpdate('media', { ...p, autoDownloadAudio: v })} />
        </SettingRow>

        <Divider />

        <SettingRow label="Data Saver" description="Reduce data usage for media">
          <Toggle value={p.dataSaver} onChange={(v) => onUpdate('media', { ...p, dataSaver: v })} />
        </SettingRow>

        <SettingRow icon={FiGlobe} label="Default Wallpaper" description="Set chat background wallpaper">
          <input type="text" value={p.defaultWallpaper} onChange={(e) => onUpdate('media', { ...p, defaultWallpaper: e.target.value })} placeholder="Wallpaper URL" className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2 text-sm rounded-xl" />
        </SettingRow>
      </div>
    </div>
  );
}

function AccessibilitySettings({ pref, onUpdate }) {
  const p = pref.accessibility || defaultPreferences.accessibility;

  const handleChange = (key, value) => {
    onUpdate('accessibility', { ...p, [key]: value });
    if (key === 'fontSize') {
      document.documentElement.style.setProperty('--chat-font-size', value === 'small' ? '13px' : value === 'medium' ? '14px' : value === 'large' ? '16px' : '20px');
    }
    if (key === 'reduceMotion') {
      document.documentElement.style.setProperty('--reduce-motion', value ? 'reduce' : 'none');
    }
    if (key === 'highContrast') {
      document.documentElement.classList.toggle('high-contrast', value);
    }
    if (key === 'linkUnderline') {
      document.documentElement.classList.toggle('link-underline', value);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Accessibility" description="Make Emotume easier to use" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <SettingRow icon={FiHeart} label="Font Size" description="Adjust text size">
          <Select value={p.fontSize} onChange={(v) => handleChange('fontSize', v)} options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
            { value: 'x-large', label: 'Extra Large' },
          ]} />
        </SettingRow>

        <SettingRow label="Reduce Motion" description="Minimize animations and transitions">
          <Toggle value={p.reduceMotion} onChange={(v) => handleChange('reduceMotion', v)} />
        </SettingRow>

        <SettingRow label="High Contrast" description="Enhance color contrast">
          <Toggle value={p.highContrast} onChange={(v) => handleChange('highContrast', v)} />
        </SettingRow>

        <SettingRow label="Screen Reader" description="Optimize for screen readers">
          <Toggle value={p.screenReader} onChange={(v) => handleChange('screenReader', v)} />
        </SettingRow>

        <SettingRow label="Closed Captions" description="Show captions for voice messages">
          <Toggle value={p.closedCaptions} onChange={(v) => handleChange('closedCaptions', v)} />
        </SettingRow>

        <SettingRow label="Link Underline" description="Always underline links">
          <Toggle value={p.linkUnderline} onChange={(v) => handleChange('linkUnderline', v)} />
        </SettingRow>
      </div>
    </div>
  );
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'Quick search' },
  { keys: ['Ctrl', 'N'], desc: 'New chat' },
  { keys: ['Ctrl', 'Shift', 'M'], desc: 'Toggle mute' },
  { keys: ['Ctrl', 'B'], desc: 'Toggle sidebar' },
  { keys: ['Esc'], desc: 'Close current panel' },
  { keys: ['Ctrl', 'Enter'], desc: 'Send message' },
  { keys: ['Ctrl', 'E'], desc: 'Toggle emoji picker' },
  { keys: ['Ctrl', 'Shift', 'G'], desc: 'Toggle ghost mode' },
  { keys: ['Ctrl', 'Shift', 'S'], desc: 'Toggle silent send' },
  { keys: ['Ctrl', 'Shift', 'T'], desc: 'Toggle theme' },
  { keys: ['Ctrl', 'Shift', 'D'], desc: 'Open decide flow' },
  { keys: ['Ctrl', 'Shift', 'F'], desc: 'Toggle full screen' },
  { keys: ['Up Arrow'], desc: 'Edit last message' },
  { keys: ['Ctrl', 'P'], desc: 'Open profile' },
  { keys: ['Ctrl', 'Shift', 'K'], desc: 'Open keyboard shortcuts' },
];

function AdvancedSettings({ pref, onUpdate, onOpenDelete }) {
  const p = pref.advanced || defaultPreferences.advanced;

  const handleClearCache = () => {
    if (typeof caches !== 'undefined') {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
    localStorage.clear();
    toast.success('Cache cleared');
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Advanced" description="Advanced settings and data management" />

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl space-y-3">
        <SettingRow icon={FiClock} label="Message History" description="Keep messages for">
          <Select value={String(p.messageHistoryDays)} onChange={(v) => onUpdate('advanced', { ...p, messageHistoryDays: Number(v) })} options={[
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: '365', label: '1 year' },
            { value: '9999', label: 'Forever' },
          ]} />
        </SettingRow>

        <SettingRow icon={FiRefreshCw} label="Auto Backup" description="Automatically backup chat data">
          <Toggle value={p.autoBackup} onChange={(v) => onUpdate('advanced', { ...p, autoBackup: v })} />
        </SettingRow>

        {p.autoBackup && (
          <SettingRow label="Backup Frequency" description="How often to backup">
            <Select value={p.backupFrequency} onChange={(v) => onUpdate('advanced', { ...p, backupFrequency: v })} options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]} />
          </SettingRow>
        )}

        <SettingRow icon={FiDownload} label="Data Usage Warning" description="Warn before downloading large files">
          <Toggle value={p.dataUsageWarn} onChange={(v) => onUpdate('advanced', { ...p, dataUsageWarn: v })} />
        </SettingRow>

        <SettingRow label="Cache" description="Enable local caching for faster load">
          <Toggle value={p.cacheEnabled} onChange={(v) => onUpdate('advanced', { ...p, cacheEnabled: v })} />
        </SettingRow>

        <Button onClick={handleClearCache} variant="secondary" className="w-full">
          <FiTrash2 size={14} /> Clear Cache
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <SectionHeader title="Keyboard Shortcuts" />
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-xs text-text-secondary">{s.desc}</span>
              <div className="flex gap-1">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="px-1.5 py-0.5 text-[10px] font-mono bg-surface backdrop-blur-glass border border-border rounded border border-border text-text-primary">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="p-4 bg-surface backdrop-blur-glass border border-border rounded-xl border border-danger/30">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-danger mt-0.5" size={16} />
            <div>
              <p className="text-sm font-semibold text-danger">Delete Account</p>
              <p className="text-xs text-text-secondary mt-0.5">Permanently delete your account and all data</p>
            </div>
          </div>
          <Button onClick={onOpenDelete} variant="danger" size="sm">
            <FiTrash2 size={14} /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteAccountModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const { logout } = useAuth();

  const handleDelete = async () => {
    if (confirm !== 'DELETE') return toast.error('Type DELETE to confirm');
    if (!password) return toast.error('Password is required');
    setSaving(true);
    try {
      await userService.deleteAccount(password);
      toast.success('Account deleted');
      onClose();
      logout();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ }} animate={{ }} exit={{ }}
      role="dialog"
      aria-modal="true"
      aria-label="Delete account confirmation"
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ }} animate={{ }} onClick={onClose} aria-label="Close delete confirmation" role="button" tabIndex={0} />
      <motion.div
        className="bg-surface backdrop-blur-glass border border-border -card p-6 w-full max-w-md relative z-10 border border-danger/30"
        initial={{ }} animate={{ }} exit={{ }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
            <FiAlertTriangle className="text-danger" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Delete Account</h2>
            <p className="text-xs text-text-secondary">This action cannot be undone</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            All your data will be permanently deleted. This includes your messages, media, bookmarks, and account information.
          </p>
          <label htmlFor="delete-password" className="sr-only">Enter your password</label>
          <input
            id="delete-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2.5 text-sm rounded-xl"
            aria-required="true"
          />
          <label htmlFor="delete-confirm" className="sr-only">Type DELETE to confirm</label>
          <input
            id="delete-confirm"
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="bg-surface backdrop-blur-glass border border-border w-full px-3 py-2.5 text-sm rounded-xl"
            aria-required="true"
          />
          <div className="flex gap-2">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving || confirm !== 'DELETE'}
              variant="danger"
              className="flex-1"
            >
              {saving ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Settings({ onClose }) {
  const { user, updateUser, updatePreferences, updateSettings } = useAuth();
  const { theme, setTheme, themes, emotionThemeEnabled, toggleEmotionTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('account');
  const [pref, setPref] = useState(user?.preferences || defaultPreferences);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState({});
  const saveTimeouts = useRef({});

  useEffect(() => {
    if (user?.preferences) {
      setPref({ ...defaultPreferences, ...user.preferences });
    }
  }, [user?.preferences]);

  const handleCategoryUpdate = (category, values) => {
    const updated = { ...pref, [category]: { ...pref[category], ...values } };
    setPref(updated);
    updatePreferences(updated);

    if (category === 'appearance') {
      if (values.fontSize) {
        const sizeMap = { small: '13px', medium: '14px', large: '16px' };
        document.documentElement.style.setProperty('--chat-font-size', sizeMap[values.fontSize]);
      }
      if (values.reduceMotion !== undefined) {
        document.documentElement.style.setProperty('--reduce-motion', values.reduceMotion ? 'reduce' : 'none');
      }
      if (values.highContrast !== undefined) {
        document.documentElement.classList.toggle('high-contrast', values.highContrast);
      }
    }

    if (saveTimeouts.current[category]) clearTimeout(saveTimeouts.current[category]);
    saveTimeouts.current[category] = setTimeout(async () => {
      try {
        await userService.updatePreferences({ [category]: values });
      } catch {
        toast.error(`Failed to save ${category} settings`);
      }
    }, 500);
  };

  const handleProfileUpdate = (updatedUser) => {
    updateUser(updatedUser);
  };

  const renderCategory = () => {
    const props = {
      pref, onUpdate: handleCategoryUpdate, user,
      theme, setTheme, themes, emotionThemeEnabled, toggleEmotionTheme,
      onProfileUpdate: handleProfileUpdate,
      onOpenDelete: () => setShowDeleteModal(true),
    };

    switch (activeCategory) {
      case 'account': return <AccountSettings {...props} />;
      case 'appearance': return <AppearanceSettings {...props} />;
      case 'notifications': return <NotificationSettings {...props} />;
      case 'privacy': return <PrivacySecuritySettings {...props} />;
      case 'chat': return <ChatSettings {...props} />;
      case 'personas': return <PersonasSettings user={user} />;
      case 'ai': return <AISettings {...props} />;
      case 'ghost': return <GhostModeSettings {...props} />;
      case 'media': return <MediaSettings {...props} />;
      case 'accessibility': return <AccessibilitySettings {...props} />;
      case 'advanced': return <AdvancedSettings {...props} />;
      default: return null;
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center pt-0 sm:pt-6 md:pt-10 pb-0 sm:pb-6"
        initial={{ }}
        animate={{ }}
        exit={{ }}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ }}
          animate={{ }}
          onClick={onClose}
          aria-label="Close settings"
          role="button"
          tabIndex={0}
        />
        <motion.div
          className="glass-dialog relative z-10 flex h-full w-full flex-col overflow-hidden sm:h-auto sm:max-h-[85vh] sm:max-w-5xl sm:rounded-2xl"
          initial={{ }}
          animate={{ }}
          exit={{ }}
          transition={{ duration: 0.16 }}
        >
          <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FiSliders size={14} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Settings</h2>
                <p className="text-[11px] text-text-secondary">{CATEGORIES.find((c) => c.id === activeCategory)?.label}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-hover/[0.07] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-focus" aria-label="Close settings" type="button">
              <FiX size={18} />
            </button>
          </header>

          <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
            <nav
              className="sm:w-56 flex-shrink-0 overflow-y-auto border-b sm:border-b-0 sm:border-r border-border"
              aria-label="Settings categories"
            >
              <div className="p-3" role="tablist" aria-orientation="vertical">
                {GROUP_ORDER.map((group) => {
                  const groupCats = CATEGORIES_BY_GROUP[group] || [];
                  if (groupCats.length === 0) return null;
                  return (
                    <div key={group} className="mb-3 last:mb-0">
                      <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest px-3 mb-1">
                        {group}
                      </p>
                      {groupCats.map((cat) => {
                        const CatIcon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus ${
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-text-secondary hover:text-text-primary hover:bg-hover/[0.07]'
                            }`}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`settings-panel-${cat.id}`}
                            type="button"
                          >
                            <CatIcon size={15} />
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </nav>

            <ScrollArea className="flex-1">
              <div className="p-6" id={`settings-panel-${activeCategory}`} aria-label={`${activeCategory} settings`} role="tabpanel">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ }}
                    animate={{ }}
                    exit={{ }}
                    transition={{ duration: 0.15 }}
                  >
                    {renderCategory()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteAccountModal key="delete-account" onClose={() => setShowDeleteModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
