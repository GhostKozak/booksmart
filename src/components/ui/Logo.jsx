import React from 'react';

export function Logo({ className = "h-6 w-6" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 192 192"
            width="192"
            height="192"
            className={className}
        >
            <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#41D1FF" />
                    <stop offset="100%" stopColor="#BD34FE" />
                </linearGradient>
                <linearGradient id="logo-pageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e8eaff" />
                    <stop offset="100%" stopColor="#c7caff" />
                </linearGradient>
            </defs>
            {/* Background shape removed to match icon behavior in headers, 
          using only the core book icon for cleaner look */}
            <g transform="translate(96,100)">
                <path d="M-8,-40 Q-8,-44 -12,-44 L-52,-44 Q-56,-44 -56,-40 L-56,32 Q-56,36 -52,36 L-12,36 Q-8,36 -8,32 Z" fill="url(#logo-pageGrad)" opacity="0.9" />
                <path d="M8,-40 Q8,-44 12,-44 L52,-44 Q56,-44 56,-40 L56,32 Q56,36 52,36 L12,36 Q8,36 8,32 Z" fill="url(#logo-pageGrad)" opacity="0.95" />
                <rect x="-8" y="-44" width="16" height="80" rx="2" fill="url(#logo-grad)" opacity="0.85" />
                <line x1="-46" y1="-28" x2="-18" y2="-28" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="-46" y1="-18" x2="-22" y2="-18" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="-46" y1="-8" x2="-26" y2="-8" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="-46" y1="2" x2="-20" y2="2" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="-46" y1="12" x2="-24" y2="12" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="-28" x2="46" y2="-28" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="-18" x2="42" y2="-18" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="-8" x2="38" y2="-8" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="2" x2="44" y2="2" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="12" x2="40" y2="12" stroke="#8b8fb0" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M30,-44 L30,-58 L38,-50 L46,-58 L46,-44" fill="url(#logo-grad)" opacity="0.95" />
            </g>
            <g transform="translate(138,42)">
                <path d="M0,-12 L3,-3 L12,0 L3,3 L0,12 L-3,3 L-12,0 L-3,-3 Z" fill="url(#logo-grad)" opacity="0.9" />
            </g>
            <g transform="translate(52,52)">
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#41D1FF" opacity="0.6" />
            </g>
        </svg>
    );
}
