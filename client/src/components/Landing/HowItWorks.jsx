import { useState, useRef, useEffect, memo } from 'react';
import { motion, useInView } from 'framer-motion';

function PhoneFrame({ children }) {
  return (
    <div className="w-full max-w-[260px] mx-auto rounded-[24px] border-[2px] border-border overflow-hidden bg-surface backdrop-blur-glass shadow-floating">
      {children}
    </div>
  );
}

const SignupPreview = memo(function SignupPreview() {
  return (
    <PhoneFrame>
      <div className="p-4 min-h-[300px]">
        <div className="text-center mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold mx-auto mb-2">E</div>
          <p className="text-[13px] font-bold text-text-primary">Create your account</p>
        </div>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border text-text-primary text-[11px] font-medium" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="var(--theme-danger)" d="M5.27 12c0-.82.14-1.61.38-2.35L2.2 7.09A11.95 11.95 0 0 0 0 12c0 1.97.48 3.84 1.32 5.48l3.45-2.56A7.16 7.16 0 0 1 5.27 12"/><path fill="#4285F4" d="M12 4.91c1.77 0 3.37.61 4.63 1.8l3.48-3.48A11.95 11.95 0 0 0 12 0C7.64 0 3.85 2.55 1.95 6.33l3.7 2.32A7.16 7.16 0 0 1 12 4.91"/><path fill="var(--theme-warning)" d="M5.27 12c0-.82.14-1.61.38-2.35l-3.7-2.32A11.9 11.9 0 0 0 .8 12c0 1.97.48 3.84 1.32 5.48l3.45-2.56A7.16 7.16 0 0 1 5.27 12"/><path fill="var(--theme-success)" d="M12 19.09c-1.77 0-3.37-.61-4.63-1.8l-3.48 3.48A11.95 11.95 0 0 0 12 24c3.3 0 6.27-1.34 8.44-3.48l-3.6-2.64C13.6 18.13 12.87 19.09 12 19.09"/><path fill="#4285F4" d="M20.44 20.52c1.86-2.04 3.01-4.76 3.36-7.7H12v-3.5h11.84c.1.64.16 1.29.16 1.95 0 3.23-1.02 6.22-2.72 8.63l-3.65-2.64c.55-.82.91-1.78 1.08-2.84H12v-2.3h8.17c-.16.56-.42 1.1-.77 1.6l-3.6-2.64z"/></svg>
            Continue with Google
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border text-text-primary text-[11px] font-medium" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--theme-text-secondary)"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            Continue with Email
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[9px] text-text-secondary">
          <div className="flex-1 h-px bg-[var(--theme-border)]" />
          <span>or continue with</span>
          <div className="flex-1 h-px bg-[var(--theme-border)]" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-8 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border flex items-center px-2.5">
            <span className="text-[10px] text-text-secondary">Username</span>
          </div>
          <div className="h-8 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border flex items-center px-2.5">
            <span className="text-[10px] text-text-secondary">Email</span>
          </div>
          <button className="w-full py-2 rounded-lg bg-primary text-white text-[11px] font-medium" type="button">Continue</button>
        </div>
      </div>
    </PhoneFrame>
  );
});

const ProfilePreview = memo(function ProfilePreview() {
  const colors = ['var(--theme-primary)', 'var(--theme-success)', 'var(--theme-warning)', 'var(--color-ai)'];
  return (
    <PhoneFrame>
      <div className="p-4 min-h-[300px]">
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold mx-auto mb-2">A</div>
          <p className="text-[10px] text-text-secondary">Tap to change avatar</p>
        </div>
        <div className="space-y-2.5">
          <div>
            <p className="text-[9px] text-text-secondary mb-1">Username</p>
            <div className="h-8 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border flex items-center px-2.5">
              <span className="text-[11px] text-text-primary">Alex</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] text-text-secondary mb-1">Bio</p>
            <div className="h-14 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border p-2.5">
              <span className="text-[10px] text-text-secondary">Software developer &amp; photography enthusiast 📸</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] text-text-secondary mb-1.5">Theme</p>
            <div className="flex gap-1.5">
              {colors.map((c) => (
                <div key={c} className="w-6 h-6 rounded-full border-2 border-border" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <button className="w-full mt-3 py-2 rounded-lg bg-primary text-white text-[11px] font-medium" type="button">Save Profile</button>
      </div>
    </PhoneFrame>
  );
});

const ChatStartPreview = memo(function ChatStartPreview() {
  return (
    <PhoneFrame>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center text-white text-[8px] font-bold">S</div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-text-primary truncate">Sarah Chen</p>
          <p className="text-[8px] text-success">Online</p>
        </div>
      </div>
      <div className="p-3 min-h-[260px]">
        <div className="flex justify-start mb-1.5">
          <div className="max-w-[80%] px-2.5 py-1.5 rounded-2xl rounded-bl-sm bg-surface-elevated backdrop-blur-glass border border-border">
            <p className="text-[11px] text-text-primary">Hey! Welcome to Emotune 🎉</p>
            <span className="text-[8px] text-text-secondary">11:02 AM</span>
          </div>
        </div>
        <div className="flex justify-end mb-1.5">
          <div className="max-w-[80%] px-2.5 py-1.5 rounded-2xl rounded-br-sm bg-primary text-white">
            <p className="text-[11px]">Thanks! Happy to be here 😊</p>
            <div className="flex items-center justify-end gap-0.5">
              <span className="text-[8px] text-text-secondary">11:03 AM</span>
              <svg width="12" height="8" viewBox="0 0 14 10" fill="none"><path d="M1 5L4 8L9 2" stroke="var(--theme-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 5L11 8L16 2" stroke="var(--theme-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>
        <div className="flex justify-start mb-1.5">
          <div className="max-w-[80%] px-2.5 py-1.5 rounded-2xl rounded-bl-sm bg-surface-elevated backdrop-blur-glass border border-border">
            <div className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--theme-text-secondary)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="text-[11px] text-text-primary">photo_2024.jpg</span>
            </div>
            <span className="text-[8px] text-text-secondary">11:05 AM</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-secondary)]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-secondary)]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-secondary)]" />
          <span className="text-[8px] text-text-secondary">Sarah is typing...</span>
        </div>
      </div>
    </PhoneFrame>
  );
});

const AIFeaturesPreview = memo(function AIFeaturesPreview() {
  return (
    <PhoneFrame>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="w-6 h-6 rounded-full bg-[var(--color-ai)] flex items-center justify-center text-white text-[8px] font-bold">E</div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-text-primary truncate">Emotune AI</p>
          <p className="text-[8px] text-primary">✨ AI Assistant</p>
        </div>
      </div>
      <div className="p-3 min-h-[260px]">
        <div className="flex justify-start mb-1.5">
          <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-bl-sm bg-surface-elevated backdrop-blur-glass border border-border">
            <p className="text-[11px] text-text-primary">I&apos;m feeling really stressed about my presentation tomorrow 😰</p>
            <span className="text-[8px] text-text-secondary">2:30 PM</span>
          </div>
        </div>
        <div className="flex justify-start mb-1.5">
          <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-bl-sm bg-surface-elevated backdrop-blur-glass border border-border">
            <div className="flex items-center gap-1 mb-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--theme-primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
              <span className="text-[9px] font-semibold text-primary">AI Detected: Anxiety 😰</span>
            </div>
            <div className="p-2 rounded-lg bg-primary border border-primary/20">
              <p className="text-[10px] text-text-secondary mb-1.5">Suggested responses</p>
              <div className="flex flex-wrap gap-1">
                {['You got this! 💪', 'Take a deep breath 🌿', 'I believe in you! ⭐'].map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-surface-elevated backdrop-blur-glass border border-border text-[9px] text-text-primary">{s}</span>
                ))}
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--theme-success)"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                <span className="text-[8px] text-success">Would you like me to suggest a calming song? 🎵</span>
              </div>
            </div>
            <span className="text-[8px] text-text-secondary mt-1 block">Just now</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-1 mb-1">
          <span className="text-[9px]">😊</span>
          <span className="text-[9px]">👍</span>
          <span className="text-[9px]">❤️</span>
        </div>
      </div>
    </PhoneFrame>
  );
});

const STEP_DATA = [
  {
    number: '01',
    title: 'Create Your Account',
    desc: 'Sign up in seconds with Google or email. No credit card required. Your privacy is protected from the start.',
    benefits: ['Secure signup', 'Takes less than 30 seconds', 'No credit card required'],
    Preview: SignupPreview,
  },
  {
    number: '02',
    title: 'Set Up Your Profile',
    desc: 'Customize your avatar, username, and bio. Choose your favorite theme and make Emotune feel like home.',
    benefits: ['Custom avatar', 'Personal bio', '6 unique themes'],
    Preview: ProfilePreview,
  },
  {
    number: '03',
    title: 'Start Chatting Instantly',
    desc: 'Connect with friends and start real-time conversations. Messages, images, voice notes — everything works instantly.',
    benefits: ['Real-time delivery', 'File & image sharing', 'Voice messages'],
    Preview: ChatStartPreview,
  },
  {
    number: '04',
    title: 'Unlock AI Conversations',
    desc: 'Experience emotion analysis, smart replies, music suggestions, and AI-powered conversation summaries.',
    benefits: ['Emotion detection', 'Smart replies', 'AI song suggestions'],
    Preview: AIFeaturesPreview,
  },
];

function StepCard({ step, side }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const isFilled = isInView;

  return (
    <div ref={ref} className={`flex items-center gap-4 ${side === 'right' ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Connector line */}
      <div className={`hidden lg:block w-8 h-px transition-colors duration-700 ${isFilled ? 'bg-primary' : 'bg-[var(--theme-border)]'}`} />

      {/* Card */}
      <motion.div
        initial={{ }}
        whileInView={{ }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, }}
        className="p-5 rounded-2xl bg-surface backdrop-blur-glass border border-border w-full max-w-[420px]"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold ${isFilled ? 'text-primary' : 'text-text-secondary'}`}>Step {step.number}</span>
          <span className={`h-px flex-1 transition-colors duration-700 ${isFilled ? 'bg-primary' : 'bg-[var(--theme-border)]'}`} />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-2">{step.title}</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed mb-3">{step.desc}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {step.benefits.map((b) => (
            <span key={b} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated backdrop-blur-glass border border-border text-[9px] text-text-secondary">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="var(--theme-success)"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
              {b}
            </span>
          ))}
        </div>
        <motion.div
          initial={{ }}
          whileInView={{ }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, }}
        >
          <step.Preview />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-light-surface relative z-10 py-24 bg-landing-how" aria-labelledby="how-title">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">How It Works</p>
          <h2 id="how-title" className="text-[36px] md:text-[42px] font-bold text-text-primary mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-[17px] text-text-secondary max-w-xl mx-auto">
            From sign-up to your first AI-powered conversation — it&apos;s quick and seamless.
          </p>
        </div>

        {/* Desktop: CSS Grid alternating layout */}
        <div className="hidden lg:grid relative" style={{ gridTemplateColumns: '1fr 80px 1fr' }}>
          {/* Persistent vertical line behind the center column */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[3px] bg-[var(--theme-border)] -translate-x-1/2 rounded-full" aria-hidden="true" />

          {STEP_DATA.map((step, i) => {
            const isEven = i % 2 === 0;
            return (
              <div key={step.number} className="contents">
                {/* Left column */}
                <div className="flex items-center justify-start py-10">
                  {isEven && <StepCard step={step} side="left" />}
                </div>

                {/* Center column — timeline */}
                <div className="flex flex-col items-center justify-center relative z-10">
                  <motion.div
                    initial={{}}
                    whileInView={{}}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-5 h-5 rounded-full border-[3px] bg-background border-primary shadow-lg shadow-[var(--theme-primary)]/20"
                  >
                    <motion.div
                      initial={{}}
                      whileInView={{}}
                      viewport={{ once: true }}
                      transition={{ }}
                      className="w-2 h-2 rounded-full bg-primary m-auto mt-[3px]"
                    />
                  </motion.div>
                </div>

                {/* Right column */}
                <div className="flex items-center justify-end py-10">
                  {!isEven && <StepCard step={step} side="right" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: stacked vertical layout */}
        <MobileSteps />
      </div>
    </section>
  );
}

function MobileSteps() {
  return (
    <div className="lg:hidden space-y-12">
      {STEP_DATA.map((step, i) => (
        <MobileStep key={step.number} step={step} index={i} isLast={i === STEP_DATA.length - 1} />
      ))}
    </div>
  );
}

function MobileStep({ step, index, isLast }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const Preview = step.Preview;

  return (
    <div ref={ref} className="flex items-start gap-4">
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <div className={`w-4 h-4 rounded-full border-2 ${isInView ? 'border-primary bg-primary' : 'border-border'} transition-colors duration-normal`} />
        {!isLast && <div className="w-px flex-1 bg-[var(--theme-border)] min-h-[24px] mt-1" />}
      </div>
      <div className="flex-1 pb-8">
        <motion.div
          initial={{ }}
          whileInView={{ }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.4 }}
          className="p-4 rounded-2xl bg-surface backdrop-blur-glass border border-border"
        >
          <span className={`text-[9px] font-bold ${isInView ? 'text-primary' : 'text-text-secondary'}`}>Step {step.number}</span>
          <h3 className="text-base font-bold text-text-primary mt-1 mb-1.5">{step.title}</h3>
          <p className="text-[11px] text-text-secondary leading-relaxed mb-3">{step.desc}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {step.benefits.map((b) => (
              <span key={b} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated backdrop-blur-glass border border-border text-[8px] text-text-secondary">
                <svg width="6" height="6" viewBox="0 0 24 24" fill="var(--theme-success)"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                {b}
              </span>
            ))}
          </div>
          <Preview />
        </motion.div>
      </div>
    </div>
  );
}
