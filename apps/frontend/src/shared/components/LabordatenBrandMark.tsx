type LabordatenBrandMarkProps = {
  className?: string;
  title?: string;
};

export function LabordatenBrandMark({
  className,
  title = "Labordaten Markenbild"
}: LabordatenBrandMarkProps) {
  return (
    <svg
      viewBox="0 0 88 88"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="brand-bg" x1="12" y1="10" x2="76" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff8ee" />
          <stop offset="1" stopColor="#dcece5" />
        </linearGradient>
        <linearGradient id="brand-glass" x1="54" y1="18" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#d4e4df" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="brand-screen" x1="18" y1="46" x2="54" y2="73" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#204f42" />
          <stop offset="1" stopColor="#2d7a62" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="80" height="80" rx="24" fill="url(#brand-bg)" />
      <path
        d="M17 21C24 15 34 12 47 12C55 12 65 14 73 19"
        fill="none"
        stroke="#d8ba82"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M15 63C26 53 38 48 54 48C62 48 70 50 76 55"
        fill="none"
        stroke="#d8ba82"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />

      <rect x="14" y="42" width="38" height="24" rx="8" fill="url(#brand-screen)" />
      <rect x="18" y="47" width="4" height="13" rx="2" fill="#edf6f2" opacity="0.9" />
      <rect x="25" y="44" width="4" height="16" rx="2" fill="#edf6f2" opacity="0.82" />
      <rect x="32" y="50" width="4" height="10" rx="2" fill="#edf6f2" opacity="0.75" />
      <rect x="39" y="46" width="4" height="14" rx="2" fill="#edf6f2" opacity="0.9" />
      <path d="M19 63H47" stroke="#edf6f2" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

      <path
        d="M58 20H68L65 30V37L73 49C74.9 51.8 72.9 56 69.5 56H56.5C53.1 56 51.1 51.8 53 49L61 37V30L58 20Z"
        fill="url(#brand-glass)"
        stroke="#8ca59c"
        strokeWidth="2"
      />
      <path d="M57 47H69" stroke="#88b2a0" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M58.5 34H67.5" stroke="#c7dad3" strokeWidth="2" strokeLinecap="round" />
      <circle cx="68.5" cy="20.5" r="4" fill="#c99c56" opacity="0.95" />
    </svg>
  );
}
