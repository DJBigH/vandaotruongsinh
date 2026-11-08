import React from 'react';

interface BrandIconProps {
  className?: string;
  size?: number;
}

export const BrandIcon: React.FC<BrandIconProps> = ({
  className = 'brand-icon-img',
  size = 40,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-label="Vạn Đạo Trường Sinh Logo"
      role="img"
    >
      <defs>
        {/* Radial aura background gradient */}
        <radialGradient id="headerNavyAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f2b48" />
          <stop offset="60%" stopColor="#081426" />
          <stop offset="100%" stopColor="#040914" />
        </radialGradient>

        {/* Celestial sword blade glow gradient */}
        <linearGradient id="headerBladeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>

        {/* Warm talisman gold gradient */}
        <linearGradient id="headerGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Spiritual cyan glow filter */}
        <filter id="headerCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Circular Medallion Base (Deep Celestial Navy) */}
      <circle cx="256" cy="256" r="236" fill="url(#headerNavyAura)" stroke="url(#headerGoldGrad)" strokeWidth="8" />

      {/* 2. Concentric Dao Spiritual Rings & Bagua Trigram Accents */}
      <circle cx="256" cy="256" r="212" fill="none" stroke="#00f2fe" strokeWidth="2.5" opacity="0.6" strokeDasharray="12 6" />
      <circle cx="256" cy="256" r="190" fill="none" stroke="url(#headerGoldGrad)" strokeWidth="3" opacity="0.85" />
      <circle cx="256" cy="256" r="140" fill="none" stroke="#00f2fe" strokeWidth="2" opacity="0.5" filter="url(#headerCyanGlow)" />

      {/* 3. Four Cardinal Daoist Rune Marks */}
      <g stroke="url(#headerGoldGrad)" strokeWidth="4" strokeLinecap="round">
        <line x1="256" y1="28" x2="256" y2="44" />
        <line x1="256" y1="468" x2="256" y2="484" />
        <line x1="28" y1="256" x2="44" y2="256" />
        <line x1="468" y1="256" x2="484" y2="256" />
      </g>

      {/* 4. Celestial Flying Sword (Phi Kiếm) Motif */}
      <path d="M 256,52 L 286,280 L 256,330 L 226,280 Z" fill="#00f2fe" opacity="0.3" filter="url(#headerCyanGlow)" />
      <path d="M 256,58 L 278,285 L 256,310 L 234,285 Z" fill="url(#headerBladeGrad)" stroke="#00f2fe" strokeWidth="2" />
      <line x1="256" y1="72" x2="256" y2="295" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />

      {/* Golden Winged Dragon Crossguard */}
      <path
        d="M 256,310 C 285,310 320,320 334,338 C 305,338 275,328 256,336 C 237,328 207,338 178,338 C 192,320 227,310 256,310 Z"
        fill="url(#headerGoldGrad)"
        stroke="#78350f"
        strokeWidth="2"
      />

      {/* Sword Hilt (Grip) wrapped in spiritual silk */}
      <rect x="250" y="336" width="12" height="64" rx="3" fill="#1e293b" stroke="url(#headerGoldGrad)" strokeWidth="2" />
      <line x1="250" y1="350" x2="262" y2="350" stroke="#fbbf24" strokeWidth="2" />
      <line x1="250" y1="365" x2="262" y2="365" stroke="#fbbf24" strokeWidth="2" />
      <line x1="250" y1="380" x2="262" y2="380" stroke="#fbbf24" strokeWidth="2" />

      {/* Golden Pommel with Cyan Spiritual Gem */}
      <circle cx="256" cy="412" r="16" fill="url(#headerGoldGrad)" stroke="#78350f" strokeWidth="2" />
      <circle cx="256" cy="412" r="7" fill="#00f2fe" filter="url(#headerCyanGlow)" />
      <circle cx="256" cy="412" r="3" fill="#ffffff" />
    </svg>
  );
};
