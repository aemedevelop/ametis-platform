export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ametis-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1c4fa5" />
          <stop offset="55%" stopColor="#0f2f74" />
          <stop offset="100%" stopColor="#0b225d" />
        </linearGradient>
        <linearGradient id="ametis-wave" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5ba9ee" />
          <stop offset="100%" stopColor="#143f98" />
        </linearGradient>
        <linearGradient id="ametis-fan-1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#245fc9" />
          <stop offset="100%" stopColor="#3176df" />
        </linearGradient>
        <linearGradient id="ametis-fan-2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3f90e9" />
          <stop offset="100%" stopColor="#4ba2f3" />
        </linearGradient>
        <linearGradient id="ametis-fan-3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6bc8ec" />
          <stop offset="100%" stopColor="#98e2dd" />
        </linearGradient>
        <clipPath id="ametis-circle-clip">
          <circle cx="32" cy="32" r="31" />
        </clipPath>
      </defs>

      <circle cx="32" cy="32" r="31" fill="url(#ametis-bg)" />
      <g clipPath="url(#ametis-circle-clip)">
        <path
          d="M8 50 L31 25 L63 52 L63 63 L8 63 Z"
          fill="url(#ametis-fan-1)"
          opacity="0.55"
        />
        <path
          d="M8 50 L47 16 L63 27 L63 50 L8 50 Z"
          fill="url(#ametis-fan-2)"
          opacity="0.72"
        />
        <path
          d="M8 50 L63 31 L63 56 L8 50 Z"
          fill="url(#ametis-fan-3)"
          opacity="0.85"
        />
        <path
          d="M8 50 C24 48 44 49 63 57 L63 63 L8 63 Z"
          fill="url(#ametis-wave)"
        />
      </g>
    </svg>
  );
}
