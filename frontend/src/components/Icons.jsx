// Small stroke icon set (24px grid, inherits currentColor).
const Icon = ({ children, size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const IconMail = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 6.5 8.5 6 8.5-6" /></Icon>;
export const IconLock = (p) => <Icon {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></Icon>;
export const IconUser = (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></Icon>;
export const IconAt = (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" /></Icon>;
export const IconEye = (p) => <Icon {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const IconEyeOff = (p) => <Icon {...p}><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.7 3.6M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></Icon>;
export const IconCheck = (p) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const IconClose = (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const IconAlert = (p) => <Icon {...p}><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5M12 16.5h.01" /></Icon>;
export const IconArrowLeft = (p) => <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Icon>;
export const IconArrowRight = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const IconChevronLeft = (p) => <Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>;
export const IconChevronRight = (p) => <Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>;
export const IconDownload = (p) => <Icon {...p}><path d="M12 3.5v12M7 11l5 5 5-5M4.5 20.5h15" /></Icon>;
export const IconCopy = (p) => <Icon {...p}><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5v-2a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6.5V13A2.5 2.5 0 0 0 6 15.5h2.5" /></Icon>;
export const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.5-4.5" /></Icon>;
export const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconShield = (p) => <Icon {...p}><path d="M12 2.5 4 5.5v6c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10v-6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></Icon>;
export const IconLogout = (p) => <Icon {...p}><path d="M15 4.5h3A2.5 2.5 0 0 1 20.5 7v10a2.5 2.5 0 0 1-2.5 2.5h-3M10 16.5 5.5 12 10 7.5M5.5 12H15" /></Icon>;
export const IconImage = (p) => <Icon {...p}><rect x="3" y="3.5" width="18" height="17" rx="3" /><circle cx="9" cy="9.5" r="1.8" /><path d="m21 15.5-5-5-11 10" /></Icon>;
export const IconScan = (p) => <Icon {...p}><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" /></Icon>;
export const IconFingerprint = (p) => <Icon {...p}><path d="M12 11v3.5a8 8 0 0 1-1.5 4.7M8.5 21a12 12 0 0 0 1.5-6.5V11a2 2 0 0 1 4 0v1.5M17.8 19.5c.2-1.2.2-2.4.2-3.5v-5a6 6 0 0 0-10.5-4M4.5 15v-4a7.5 7.5 0 0 1 .6-3M14 17.5c0 .8-.1 1.7-.3 2.5" /></Icon>;
export const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
export const IconSparkle = (p) => <Icon {...p}><path d="M12 3c.5 4.5 2.5 6.5 7 7-4.5.5-6.5 2.5-7 7-.5-4.5-2.5-6.5-7-7 4.5-.5 6.5-2.5 7-7Z" /><path d="M19 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z" /></Icon>;
export const IconGrid = (p) => <Icon {...p}><rect x="3.5" y="3.5" width="7" height="9" rx="2" /><rect x="13.5" y="3.5" width="7" height="5" rx="2" /><rect x="13.5" y="11.5" width="7" height="9" rx="2" /><rect x="3.5" y="15.5" width="7" height="5" rx="2" /></Icon>;
export const IconHash = (p) => <Icon {...p}><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" /></Icon>;

export const Logo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6366f1" />
        <stop offset="1" stopColor="#c026d3" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#logo-g)" />
    <path d="M10 22V10h6.5a4.5 4.5 0 0 1 0 9H13" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="22.5" cy="22.5" r="2" fill="#fff" />
  </svg>
);
