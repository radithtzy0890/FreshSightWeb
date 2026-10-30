import React, { useId } from 'react';
import { FruitType, InspectionViewMode } from '../types';
import { FRUIT_NAMES } from '../services/cvEngine';

interface FruitSvgProps {
  fruit: FruitType;
  isRotten: 0 | 1;
  spotCount?: number;
  viewMode?: InspectionViewMode;
  isBare?: boolean;
  className?: string;
}

const SPOT_COORDINATES = [
  [105, 125, 13],
  [135, 100, 8],
  [150, 150, 10],
  [90, 150, 6],
  [120, 170, 7]
];

export const FruitSvg: React.FC<FruitSvgProps> = ({
  fruit,
  isRotten,
  spotCount = 0,
  viewMode = 'asli',
  isBare = false,
  className = 'w-full h-full block object-contain select-none',
}) => {
  const rawId = useId();
  const gid = 'fsvg_' + rawId.replace(/[^a-zA-Z0-9]/g, '_');
  const u = (x: string) => `url(#${gid}${x})`;

  const spots = isRotten ? SPOT_COORDINATES.slice(0, Math.max(spotCount, 1)) : [];
  const isBanana = fruit === 'banana';

  const palettes = {
    apple: isRotten ? ['#A8683E', '#6B3821', '#2C160B'] : ['#EC4B3F', '#B9151C', '#5F0910'],
    orange: isRotten ? ['#D8B669', '#9E7A34', '#593F15'] : ['#FFA834', '#F47F10', '#B74F03'],
    banana: isRotten ? ['#B69248', '#785923', '#34210D'] : ['#FDE769', '#F1C42B', '#B7850E'],
  }[fruit];

  const hx = isRotten && spotCount ? SPOT_COORDINATES[0][0] : 125;
  const hy = isRotten && spotCount ? SPOT_COORDINATES[0][1] : 140;

  return (
    <svg
      viewBox="0 0 250 250"
      data-view={viewMode}
      className={className}
      role="img"
      aria-label={isBare ? 'Peta analisis' : `Ilustrasi ${FRUIT_NAMES[fruit]}`}
    >
      {!isBare && (
        <defs>
          <linearGradient id={`${gid}bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F7F3EA" />
            <stop offset="1" stopColor="#DDD5C2" />
          </linearGradient>

          {isBanana ? (
            <linearGradient id={`${gid}fill`} x1=".05" y1=".1" x2=".95" y2=".9">
              <stop offset="0" stopColor={palettes[0]} />
              <stop offset=".55" stopColor={palettes[1]} />
              <stop offset="1" stopColor={palettes[2]} />
            </linearGradient>
          ) : (
            <radialGradient id={`${gid}fill`} cx=".36" cy=".3" r=".9">
              <stop offset="0" stopColor={palettes[0]} />
              <stop offset=".55" stopColor={palettes[1]} />
              <stop offset="1" stopColor={palettes[2]} />
            </radialGradient>
          )}

          <radialGradient id={`${gid}vignette`} cx=".5" cy=".42" r=".62">
            <stop offset=".55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".42" />
          </radialGradient>

          <filter id={`${gid}blur`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id={`${gid}sharp`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>

          <filter id={`${gid}G`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 .1 0 0 0 0 .06 0 0 0 0 .03 0 0 0 .9 -.3" />
          </filter>
          <filter id={`${gid}R`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".5 .03" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 .96 0 0 0 0 .66 0 0 0 0 .22 0 0 0 1.8 -.72" />
          </filter>
          <filter id={`${gid}K2`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="2" seed="11" />
            <feColorMatrix values="0 0 0 0 .14 0 0 0 0 .08 0 0 0 0 .03 0 0 0 12 -6.6" />
          </filter>

          <filter id={`${gid}bump`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="4" result="n" />
            <feDiffuseLighting in="n" lightingColor="#fff" surfaceScale="1.8" diffuseConstant="1.75" result="l">
              <feDistantLight azimuth="235" elevation="55" />
            </feDiffuseLighting>
            <feComposite in="l" in2="SourceGraphic" operator="in" result="m" />
            <feBlend in="SourceGraphic" in2="m" mode="multiply" />
          </filter>

          <filter id={`${gid}disp`} x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="t" />
            <feDisplacementMap in="SourceGraphic" in2="t" scale="22" />
            <feGaussianBlur stdDeviation="1.6" />
          </filter>

          {fruit === 'apple' && (
            <path
              id={`${gid}Shape`}
              d="M125 72C100 50 52 62 46 114c-5 46 26 102 59 104 9 .5 14-4 20-4s11 4.5 20 4c33-2 64-58 59-104C198 62 150 50 125 72Z"
            />
          )}
          {fruit === 'orange' && <circle id={`${gid}Shape`} cx="125" cy="130" r="72" />}
          {fruit === 'banana' && (
            <path
              id={`${gid}Shape`}
              d="M72 46C58 62 52 98 70 138c22 48 82 76 136 52 4-2 6-8 1-10-47 6-95-20-109-58-8-24-6-48 0-68C92 40 80 38 72 46Z"
            />
          )}

          <clipPath id={`${gid}Clip`}>
            <use href={`#${gid}Shape`} />
          </clipPath>
        </defs>
      )}

      {!isBare && (
        <>
          <rect width="250" height="250" fill={u('bg')} />
          <ellipse cx="125" cy="214" rx="76" ry="10" fill="#000" opacity=".32" filter={u('blur')} />
          <use
            href={`#${gid}Shape`}
            fill={u('fill')}
            filter={fruit === 'orange' ? u('bump') : undefined}
          />
          <g clipPath={u('Clip')}>
            <rect width="250" height="250" filter={u('G')} opacity={fruit === 'orange' ? 0.3 : 0.5} />
            {fruit === 'apple' && !isRotten && (
              <rect width="250" height="250" filter={u('R')} opacity={0.2} />
            )}
            {isBanana && (
              <g fill="none" strokeLinecap="round">
                <path
                  d="M80.6 48.6C69.2 66 64.5 98 79.2 132.7 98.6 177.4 154.6 204.8 206.3 186.7"
                  stroke="#6B4A00"
                  opacity=".3"
                  strokeWidth="1.4"
                />
                <path
                  d="M89.2 51.3C80.4 69.9 77.1 98 88.5 127.4 105.2 168.8 157.3 195.5 206.7 183.4"
                  stroke="#6B4A00"
                  opacity=".3"
                  strokeWidth="1.4"
                />
                <path
                  d="M75 54C64 72 60 100 75 135 96 178 150 204 198 190"
                  stroke="#FFF7B8"
                  opacity={isRotten ? 0.18 : 0.5}
                  strokeWidth="3.5"
                  filter={u('sharp')}
                />
              </g>
            )}
            <use href={`#${gid}Shape`} fill={u('vignette')} />
            {isRotten ? (
              <>
                <g filter={u('disp')} fill={fruit === 'orange' ? '#4A3314' : '#22110A'} opacity=".8">
                  {spots.map((s, idx) => (
                    <circle key={idx} cx={s[0]} cy={s[1]} r={s[2] * 1.45} />
                  ))}
                </g>
                {isBanana ? (
                  <rect width="250" height="250" filter={u('K2')} opacity=".85" />
                ) : fruit === 'apple' ? (
                  <rect width="250" height="250" filter={u('K2')} opacity=".3" />
                ) : (
                  <>
                    <g filter={u('disp')} fill="#E4ECD8" opacity=".85">
                      {spots.slice(0, 3).map((s, idx) => (
                        <circle key={idx} cx={s[0] + 6} cy={s[1] - 4} r={s[2] * 0.8} />
                      ))}
                    </g>
                    <g filter={u('sharp')} fill="#5E9A86" opacity=".8">
                      {spots.slice(0, 3).map((s, idx) => (
                        <circle key={idx} cx={s[0] - 3} cy={s[1] + 3} r={s[2] * 0.35} />
                      ))}
                    </g>
                  </>
                )}
              </>
            ) : isBanana ? null : (
              <ellipse
                cx="96"
                cy="100"
                rx="15"
                ry="30"
                transform="rotate(32 96 100)"
                fill="#fff"
                opacity=".5"
                filter={u('sharp')}
              />
            )}
          </g>

          {/* Stems & Caps */}
          {fruit === 'apple' && (
            <>
              <ellipse cx="125" cy="76" rx="10" ry="4" fill="#2A140A" opacity=".45" />
              <path
                d="M124 78C122 60 127 46 138 34"
                stroke={isRotten ? '#2E2014' : '#5A3A22'}
                strokeWidth="5.5"
                fill="none"
                strokeLinecap="round"
              />
              {!isRotten && (
                <>
                  <path
                    d="M139 42C150 24 176 26 182 40 168 52 150 54 139 42Z"
                    fill="#4C9A3A"
                  />
                  <path d="M141 43C156 40 168 38 178 40" stroke="#2E6B26" strokeWidth="1.2" fill="none" />
                </>
              )}
            </>
          )}

          {fruit === 'banana' && (
            <>
              <path d="M82 54L85 27Q92 22 99 28L99 56Z" fill={isRotten ? '#3E3318' : '#7C8A3A'} />
              <ellipse cx="92" cy="27" rx="7" ry="3" fill="#3A3315" />
              <ellipse
                cx="205"
                cy="185"
                rx="6"
                ry="4"
                transform="rotate(-35 205 185)"
                fill="#2B1C0C"
              />
            </>
          )}

          {fruit === 'orange' && (
            <>
              <circle cx="125" cy="61" r="5.5" fill={isRotten ? '#3E3418' : '#5E8A25'} />
              {!isRotten && (
                <path d="M128 58c6-8 16-9 22-5-6 7-16 9-22 5z" fill="#5E9A32" />
              )}
            </>
          )}
        </>
      )}

      {/* Grad-CAM Layer */}
      <g
        className={`layer-cam ${
          viewMode === 'cam' ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-500 pointer-events-none`}
      >
        <defs>
          <radialGradient id={`${gid}heat`}>
            <stop offset="0" stopColor="#FF1744" stopOpacity={isRotten ? 0.88 : 0.4} />
            <stop offset=".5" stopColor="#FFC400" stopOpacity={0.5} />
            <stop offset="1" stopColor="#00B0FF" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={hx} cy={hy} r={isRotten ? 85 : 100} fill={`url(#${gid}heat)`} />
      </g>

      {/* Defect Mask Layer */}
      <g
        className={`layer-mask ${
          viewMode === 'mask' ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-500 pointer-events-none`}
      >
        <rect width="250" height="250" fill="#000" opacity=".6" />
        <g fill="#FF453A">
          {spots.map((s, idx) => (
            <circle key={idx} cx={s[0]} cy={s[1]} r={s[2]} />
          ))}
        </g>
      </g>
    </svg>
  );
};

