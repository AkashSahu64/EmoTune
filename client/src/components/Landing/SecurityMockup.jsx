import { memo } from 'react';
import { motion } from 'framer-motion';
import { DeviceFrame, Avatar } from './ChatPrimitives';

const devices = [
  { name: 'iPhone 15 Pro', icon: '📱', lastActive: 'Active now', type: 'phone' },
  { name: 'MacBook Air', icon: '💻', lastActive: '2 min ago', type: 'laptop' },
  { name: 'iPad Pro', icon: '📋', lastActive: '1 hour ago', type: 'tablet' },
];

export default memo(function SecurityMockup() {
  return (
    <DeviceFrame type="phone">
      <div className="p-4 min-h-[360px] space-y-4">
        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{ duration: 0.3 }}
          className="text-center p-4 rounded-2xl bg-primary dark:bg-primary-dark border border-success/20 dark:border-success-dark/20"
        >
          <div className="w-12 h-12 rounded-full bg-success/20 dark:bg-success-dark/20 flex items-center justify-center mx-auto mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#16A34A"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
          </div>
          <p className="text-[13px] font-semibold text-success dark:text-success-dark">End-to-End Encrypted</p>
          <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-0.5">Your conversations are private</p>
        </motion.div>

        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.3 }}
          className="p-3 rounded-xl bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center gap-3"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary dark:text-primary-dark"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          <div>
            <p className="text-[11px] font-medium text-text-primary dark:text-text-primary-dark">Account Verified</p>
            <p className="text-[9px] text-text-secondary dark:text-text-secondary-dark">Phone + Email verified</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.3 }}
          className="p-3 rounded-xl bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark"
        >
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#4B5563"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
            <span className="text-[11px] font-medium text-text-primary dark:text-text-primary-dark">Trusted Devices</span>
          </div>
          <div className="space-y-2">
            {devices.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-[10px]">
                <span>{d.icon}</span>
                <span className="text-text-primary dark:text-text-primary-dark flex-1">{d.name}</span>
                <span className="text-success dark:text-success-dark">{d.lastActive}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.3 }}
          className="flex items-center gap-2 px-1"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#16A34A"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
            <span className="text-[9px] text-text-secondary dark:text-text-secondary-dark">Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-primary dark:text-primary-dark"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <span className="text-[9px] text-text-secondary dark:text-text-secondary-dark">Verified</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark">
            <span className="text-[9px] text-warning dark:text-warning-dark">🛡️</span>
            <span className="text-[9px] text-text-secondary dark:text-text-secondary-dark">Secure</span>
          </div>
        </motion.div>
      </div>
    </DeviceFrame>
  );
});
