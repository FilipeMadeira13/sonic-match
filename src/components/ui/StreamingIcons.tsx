interface IconProps {
  size?: number;
  className?: string;
}

export function SpotifyIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path
        d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75a1.12 1.12 0 0 0 .65 2.15c2.55-.77 7.27-.62 9.98.87a1.12 1.12 0 0 0 .97-2.02zm-.14 3.75a.94.94 0 0 0-1.29-.31c-2.65-1.61-6.7-2.08-9.83-1.14a.94.94 0 1 0 .54 1.8c2.69-.82 6.33-.35 8.6 1.02a.94.94 0 0 0 1.28-.31c.21-.34.15-.79-.3-1.06zm-1.18 3.6a.75.75 0 0 0-1.03-.25C13.29 16.75 10.5 16.5 8 17.19a.75.75 0 0 0 .43 1.44c2.8-.82 5.87-.58 8.16.83a.75.75 0 0 0 1.03-.26.74.74 0 0 0-.04-1.05z"
        fill="white"
      />
    </svg>
  );
}

export function AppleMusicIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="am-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FA233B" />
          <stop offset="100%" stopColor="#FB5C74" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5.5" fill="url(#am-grad)" />
      <path
        d="M16.5 5.5v8.75a2.25 2.25 0 1 1-1.5-2.12V7.5l-5 1.25V16a2.25 2.25 0 1 1-1.5-2.12V6.75L16.5 5.5z"
        fill="white"
      />
    </svg>
  );
}

export function DeezerIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#A238FF" />
      <g fill="white">
        <rect x="3.5" y="14" width="2.5" height="6" rx="1" opacity="0.6" />
        <rect x="7.5" y="11" width="2.5" height="9" rx="1" opacity="0.75" />
        <rect x="11.5" y="8" width="2.5" height="12" rx="1" opacity="0.88" />
        <rect x="15.5" y="4" width="2.5" height="16" rx="1" />
        <rect x="3.5" y="4" width="2.5" height="5" rx="1" opacity="0.3" />
        <rect x="7.5" y="4" width="2.5" height="5" rx="1" opacity="0.4" />
        <rect x="11.5" y="4" width="2.5" height="3" rx="1" opacity="0.5" />
      </g>
    </svg>
  );
}

export function YouTubeMusicIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#FF0000" />
      <circle cx="12" cy="12" r="5" fill="white" />
      <polygon points="10.5,9.5 10.5,14.5 15,12" fill="#FF0000" />
    </svg>
  );
}

export function TidalIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#000000" />
      <path
        d="M6 8h2v8H6zm4-2h2v10h-2zm4-2h2v12h-2zm4 2h2v8h-2z"
        fill="#00D9FF"
      />
    </svg>
  );
}
