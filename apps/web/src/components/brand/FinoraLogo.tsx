interface FinoraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'full' | 'icon';
  className?: string;
}

export function FinoraLogo({
  size = 'md',
  showTagline = true,
  variant = 'full',
  className = '',
}: FinoraLogoProps) {
  const dimensions = {
    sm: { icon: 38, text: 'text-xl', tagline: 'text-[8.5px] mt-0.5 tracking-[0.12em]', line: 'w-2.5', container: 'gap-3' },
    md: { icon: 48, text: 'text-2xl sm:text-3xl', tagline: 'text-[9.5px] mt-1 tracking-[0.14em]', line: 'w-3', container: 'gap-3.5' },
    lg: { icon: 72, text: 'text-4xl sm:text-5xl', tagline: 'text-[12px] mt-2 tracking-[0.16em]', line: 'w-4.5', container: 'gap-4.5' },
  }[size];

  return (
    <div className={`flex flex-col select-none ${variant === 'icon' ? 'items-center' : 'items-start'} ${className}`}>
      <div className={`flex items-center ${dimensions.container}`}>
        {/* Emblem SVG with Zero External Padding */}
        <svg
          width={dimensions.icon}
          height={dimensions.icon}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Finora AI emblem"
          className="shrink-0 drop-shadow-md"
        >
          {/* Gold Outer Ring */}
          <circle cx="50" cy="50" r="44" stroke="url(#goldGradMain)" strokeWidth="3.5" />

          {/* Monogram "F" Serif Stem and Top Arm */}
          <path
            d="M 22 22 H 62 V 26 M 32 22 V 66 C 32 78 20 84 10 70"
            stroke="url(#goldGradMain)"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Decorative Curved Middle Bar of F */}
          <path
            d="M 32 44 C 42 44 48 40 56 42"
            stroke="url(#goldGradMain)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* 3 Ascending White Financial Chart Columns */}
          <rect x="52" y="66" width="5" height="12" rx="1.5" fill="#FFFFFF" />
          <rect x="60" y="58" width="5" height="20" rx="1.5" fill="#FFFFFF" />
          <rect x="68" y="48" width="5" height="30" rx="1.5" fill="#FFFFFF" />

          {/* Golden Growth Arrow Swoop over Chart Bars */}
          <path
            d="M 34 68 C 46 68 60 60 72 46"
            stroke="url(#goldGradMain)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Arrow Head */}
          <path
            d="M 65 46 L 73 45 L 71 53"
            stroke="url(#goldGradMain)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 4-Point AI Sparkle Star */}
          <path
            d="M 78 31 C 78 34 79.5 35.5 82.5 35.5 C 79.5 35.5 78 37 78 40 C 78 37 76.5 35.5 73.5 35.5 C 76.5 35.5 78 34 78 31 Z"
            fill="url(#goldGradMain)"
          />

          {/* Metallic Gold Gradient */}
          <defs>
            <linearGradient id="goldGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="35%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#B8860B" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
          </defs>
        </svg>

        {/* Brand Typography & Tagline */}
        {variant === 'full' && (
          <div className="flex flex-col">
            <div className="flex items-baseline font-serif tracking-tight leading-none">
              <span className={`font-bold text-white ${dimensions.text}`}>Finora</span>
              <span className={`ml-2 font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent ${dimensions.text}`}>
                AI
              </span>
            </div>

            {/* Shorter Tagline strictly bounded underneath the title */}
            {showTagline && (
              <div className={`flex items-center gap-1 font-serif font-semibold uppercase text-amber-300/90 whitespace-nowrap ${dimensions.tagline}`}>
                <span className={`h-[1.5px] ${dimensions.line} bg-amber-400/70`} />
                <span>SMART FINANCES. BETTER FUTURE.</span>
                <span className={`h-[1.5px] ${dimensions.line} bg-amber-400/70`} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
