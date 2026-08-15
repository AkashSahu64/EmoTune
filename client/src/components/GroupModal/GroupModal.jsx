import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSearch, FiUserPlus, FiCheck, FiChevronRight, FiChevronLeft, FiUsers, FiShield, FiInfo } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../../services/api';
import { Modal, ModalHeader, Button, Avatar, SearchInput, Chip, Badge, ScrollArea, Divider } from '../ui';

const STEPS = [
  { id: 'details', label: 'Details', icon: FiInfo },
  { id: 'members', label: 'Members', icon: FiUsers },
  { id: 'permissions', label: 'Permissions', icon: FiShield },
];

function GroupModal({ onClose, onCreate }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [permissions, setPermissions] = useState({
    anyoneCanSend: true,
    onlyAdminsCanSend: false,
    joinRequests: false,
  });

  useEffect(() => { fetchUsers(); }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users/search', { params: { q: searchQuery } }).catch(() => ({ data: { users: [] } }));
      setUsers(data.users || []);
    } catch { setUsers([]); }
  };

  const toggleUser = (userId) => {
    setSelectedUsers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Group name is required'); return; }
    if (selectedUsers.length < 1) { toast.error('Add at least 1 member'); return; }
    try {
      setCreating(true);
      const { data } = await api.post('/groups', { name: name.trim(), description: description.trim(), participants: selectedUsers });
      onCreate(data.chat);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create group'); } finally { setCreating(false); }
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return selectedUsers.length >= 1;
    return true;
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader
        title="Create Group"
        subtitle={`Step ${step + 1} of ${STEPS.length}`}
        onClose={onClose}
        actions={
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'w-6 bg-primary' : i < step ? 'bg-primary/50' : 'bg-[var(--theme-border)]'}`} />
            ))}
          </div>
        }
      />

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="details" initial={{ }} animate={{ }} exit={{ }} className="p-4 space-y-4">
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-bold">
                {name ? name[0].toUpperCase() : 'G'}
              </div>
              <p className="text-xs text-text-secondary">Group Icon</p>
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Group Name *</label>
              <input id="group-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter group name" className="w-full px-4 py-3 text-sm rounded-2xl bg-surface backdrop-blur-glass border border-border text-text-primary placeholder:text-placeholder focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus transition-colors" aria-required="true" />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Description</label>
              <textarea id="group-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this group about?" rows={3} className="w-full px-4 py-3 text-sm rounded-2xl bg-surface backdrop-blur-glass border border-border text-text-primary placeholder:text-placeholder focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus transition-colors resize-none" />
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="members" initial={{ }} animate={{ }} exit={{ }} className="p-4 space-y-3">
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search users..." />

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5" role="list" aria-label="Selected members">
                {selectedUsers.map((userId) => {
                  const user = users.find((u) => u._id === userId);
                  return (
                    <Chip key={userId} size="sm" variant="default" onClick={() => toggleUser(userId)}>
                      {user?.username || 'User'} <FiX size={10} className="ml-1" />
                    </Chip>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-text-secondary font-medium">{selectedUsers.length} selected</p>

            <ScrollArea className="max-h-48 space-y-1">
              {users.filter((u) => !selectedUsers.includes(u._id)).map((user) => (
                <motion.button key={user._id} onClick={() => toggleUser(user._id)} className="w-full flex items-center gap-3 p-2.5 bg-surface backdrop-blur-glass border border-border rounded-xl hover:bg-hover/[0.07] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus" type="button">
                  <Avatar src={user.avatar} name={user.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{user.username}</p>
                    <p className="text-[10px] text-text-secondary">{user.email || ''}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-surface backdrop-blur-glass border border-border flex items-center justify-center text-primary"><FiUserPlus size={14} /></div>
                </motion.button>
              ))}
              {users.length === 0 && <p className="text-xs text-text-secondary text-center py-4">No users found</p>}
            </ScrollArea>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="permissions" initial={{ }} animate={{ }} exit={{ }} className="p-4 space-y-3">
            <div className="flex items-center justify-between py-3 px-4 bg-surface backdrop-blur-glass border border-border rounded-xl">
              <div><p className="text-sm font-medium text-text-primary">Anyone can send</p><p className="text-xs text-text-secondary">All members can send messages</p></div>
              <button onClick={() => setPermissions({ ...permissions, anyoneCanSend: !permissions.anyoneCanSend, onlyAdminsCanSend: false })} className={`relative w-11 h-[22px] rounded-full transition-colors ${permissions.anyoneCanSend ? 'bg-primary' : 'bg-[var(--theme-border)]'}`} type="button">
                <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-colors ${permissions.anyoneCanSend ? 'right-[2px]' : 'left-[2px]'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-surface backdrop-blur-glass border border-border rounded-xl">
              <div><p className="text-sm font-medium text-text-primary">Admins only</p><p className="text-xs text-text-secondary">Only admins can send messages</p></div>
              <button onClick={() => setPermissions({ ...permissions, onlyAdminsCanSend: !permissions.onlyAdminsCanSend, anyoneCanSend: false })} className={`relative w-11 h-[22px] rounded-full transition-colors ${permissions.onlyAdminsCanSend ? 'bg-primary' : 'bg-[var(--theme-border)]'}`} type="button">
                <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-colors ${permissions.onlyAdminsCanSend ? 'right-[2px]' : 'left-[2px]'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-surface backdrop-blur-glass border border-border rounded-xl">
              <div><p className="text-sm font-medium text-text-primary">Join Requests</p><p className="text-xs text-text-secondary">Require admin approval to join</p></div>
              <button onClick={() => setPermissions({ ...permissions, joinRequests: !permissions.joinRequests })} className={`relative w-11 h-[22px] rounded-full transition-colors ${permissions.joinRequests ? 'bg-primary' : 'bg-[var(--theme-border)]'}`} type="button">
                <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-colors ${permissions.joinRequests ? 'right-[2px]' : 'left-[2px]'}`} />
              </button>
            </div>

            <Divider />

            <div className="bg-surface backdrop-blur-glass border border-border rounded-xl p-3">
              <p className="text-xs font-medium text-text-primary mb-2">Summary</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-text-secondary">Group name</span><span className="text-text-primary">{name}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-secondary">Members</span><span className="text-text-primary">{selectedUsers.length + 1} (including you)</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-secondary">Description</span><span className="text-text-primary truncate max-w-[200px]">{description || 'None'}</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <Button variant="ghost" size="sm" onClick={() => step > 0 ? setStep(step - 1) : onClose()} icon={FiChevronLeft}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button variant="primary" size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()} icon={FiChevronRight} iconPosition="right">
            Continue
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleCreate} loading={creating} disabled={creating || !canProceed()}>
            Create Group
          </Button>
        )}
      </div>
    </Modal>
  );
}

export default memo(GroupModal);
