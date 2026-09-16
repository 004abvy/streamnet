import { useRef, useEffect, useState, useCallback, CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { gsap } from 'gsap';

import './AccordianGallery.css';
import GlareHover from './GlareHover';

export interface AccordionGalleryItem {
  image: string;
  label?: string;
  link?: string;
  alt?: string;
  fontFamily?: string;
  labelStyle?: CSSProperties;
}

export interface AccordionGalleryProps {
  items?: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: 'horizontal' | 'vertical';
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: 'hover' | 'click';
  showLabels?: boolean;
  grayscale?: boolean;
  className?: string;
}

const DEFAULT_ITEMS: AccordionGalleryItem[] = [
  { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#' },
  { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#' },
  { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#' },
  { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#' },
  { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#' }
];

const AccordionGallery = ({
  items = DEFAULT_ITEMS,
  defaultIndex = 2,
  accentColor = '#ffffff',
  overlayColor = 'transparent',
  textColor = '#ffffff',
  height = 460,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  orientation = 'horizontal',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = false,
  className = ''
}: AccordionGalleryProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLElement | null)[]>([]);
  const verticalTagRefs = useRef<(HTMLElement | null)[]>([]);
  const activeBadgeRefs = useRef<(HTMLElement | null)[]>([]);
  const charRefs = useRef<(HTMLElement | null)[][]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);

  const vertical = orientation === 'vertical';
  const count = items.length;
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), count - 1));

  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const applyLayout = useCallback(
    (animate: boolean) => {
      const panels = panelRefs.current;
      if (!panels.length) return;

      const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
      const mediaSize = mediaSizeRef.current;

      tlRef.current?.kill();
      const dur = animate && !prefersReduced ? duration : 0;
      const tl = gsap.timeline();

      panels.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === active;
        const media = mediaRefs.current[i];

        const rot = isActive ? 0 : i < active ? tilt : -tilt;
        const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot };

        tl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease }, 0);

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i));
          const shift = drift * parallax * mediaSize * 0.06;
          const gray = isActive ? 0 : 1;
          const dim = isActive ? 0 : 0.12;
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: vertical ? 0 : isActive ? 0 : shift,
              y: vertical ? (isActive ? 0 : shift) : 0,
              '--ag-gray': gray,
              '--ag-dim': dim,
              duration: animate && !prefersReduced ? 0.15 : 0,
              ease: 'power2.out'
            },
            0
          );
        }

        if (showLabels) {
          const vTag = verticalTagRefs.current[i];
          const badge = activeBadgeRefs.current[i];
          const chars = charRefs.current[i] || [];

          if (isActive) {
            if (vTag) tl.to(vTag, { opacity: 0, scale: 0.85, duration: dur * 0.4, ease: 'power2.in' }, 0);
            if (badge) {
              tl.to(
                badge,
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: dur,
                  ease: 'back.out(1.4)'
                },
                0
              );
            }
            if (chars.length > 0 && animate && !prefersReduced) {
              tl.fromTo(
                chars,
                { opacity: 0, y: 16, rotateX: -60, filter: 'blur(4px)' },
                {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  filter: 'blur(0px)',
                  duration: 0.4,
                  stagger: 0.03,
                  ease: 'power3.out'
                },
                0.06
              );
            }
          } else {
            if (vTag) tl.to(vTag, { opacity: 0.85, scale: 1, duration: dur, ease: 'power2.out' }, 0);
            if (badge) {
              tl.to(
                badge,
                {
                  opacity: 0,
                  y: 12,
                  scale: 0.9,
                  duration: dur * 0.5,
                  ease: 'power2.in'
                },
                0
              );
            }
          }
        }
      });

      tlRef.current = tl;
    },
    [
      active,
      count,
      expandRatio,
      duration,
      ease,
      vertical,
      tilt,
      parallax,
      grayscale,
      showLabels,
      stagger,
      prefersReduced
    ]
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const total = vertical ? rect.height : rect.width;
      const usable = Math.max(total - gap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      el.style.setProperty('--ag-media-size', `${size}px`);
      applyLayout(!firstRunRef.current);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyLayout, gap, count, expandRatio, vertical]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
    },
    []
  );

  const handleEnter = (i: number) => {
    if (trigger === 'hover') setActive(i);
  };

  const handleClick = (i: number, e: MouseEvent) => {
    if (i !== active) {
      e.preventDefault();
      setActive(i);
    }
  };

  const handleKeyDown = (i: number, e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i + 1) % count);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i - 1 + count) % count);
    }
  };

  const rootStyle = {
    '--ag-accent': accentColor,
    '--ag-overlay': overlayColor,
    '--ag-text': textColor,
    '--ag-gap': `${gap}px`,
    '--ag-radius': `${radius}px`,
    height: vertical ? `${Math.round(height * 1.6)}px` : `${height}px`
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${className ? ` ${className}` : ''}`}
      style={rootStyle}
      role="list"
      aria-label="Image accordion gallery"
    >
      {items.map((item, i) => {
        const isActive = i === active;
        const Tag = (item.link ? 'a' : 'div') as 'a';
        return (
          <Tag
            key={i}
            ref={(el: HTMLElement | null) => {
              panelRefs.current[i] = el;
            }}
            className={`ag-panel${isActive ? ' ag-panel--active' : ''}`}
            style={{ borderRadius: `${radius}px` }}
            href={item.link || undefined}
            onClick={e => handleClick(i, e)}
            onMouseEnter={() => handleEnter(i)}
            onFocus={() => setActive(i)}
            onKeyDown={e => handleKeyDown(i, e)}
            role="listitem"
            tabIndex={0}
            aria-current={isActive ? 'true' : undefined}
            aria-label={item.label}
          >
            <span className="ag-panel__frame">
              <span
                className="ag-panel__media"
                ref={(el: HTMLElement | null) => {
                  mediaRefs.current[i] = el;
                }}
              >
                <img src={item.image} alt={item.alt || item.label || ''} draggable={false} />
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>
            {showLabels && (
              <>
                {/* Inactive Vertical Tag */}
                <span
                  className="ag-panel__vertical-tag"
                  ref={(el) => {
                    verticalTagRefs.current[i] = el;
                  }}
                  aria-hidden="true"
                >
                  {item.label}
                </span>

                {/* Active Glassmorphic Floating Badge with Staggered Character Reveal */}
                <span
                  className="ag-panel__active-badge"
                  ref={(el) => {
                    activeBadgeRefs.current[i] = el;
                  }}
                  aria-hidden="true"
                >
                  <span className="ag-panel__text-wrapper">
                    {(item.label || '').split('').map((char, charIdx) => (
                      <span
                        key={charIdx}
                        className="ag-panel__char"
                        ref={(el) => {
                          if (!charRefs.current[i]) charRefs.current[i] = [];
                          charRefs.current[i][charIdx] = el;
                        }}
                        style={{
                          fontFamily: item.fontFamily,
                          ...item.labelStyle
                        }}
                      >
                        {char === ' ' ? '\u00A0' : char}
                      </span>
                    ))}
                  </span>
                </span>
              </>
            )}
          </Tag>
        );
      })}
    </div>
  );
};

export default AccordionGallery;
