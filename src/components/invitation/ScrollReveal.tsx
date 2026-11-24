import React, { useEffect, useRef, useState } from 'react';

type RevealDirection = 'up' | 'down' | 'fade' | 'scale';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: RevealDirection;
  delayMs?: number;
  className?: string;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delayMs = 0,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
            break;
          }
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -15px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform =
    direction === 'up'
      ? 'translate3d(0, 28px, 0)'
      : direction === 'down'
      ? 'translate3d(0, -28px, 0)'
      : direction === 'scale'
      ? 'scale3d(0.96, 0.96, 1)'
      : 'translate3d(0, 0, 0)';

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0, 0, 0)' : hiddenTransform,
        transitionProperty: 'transform, opacity',
        transitionDuration: '700ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        transitionDelay: `${delayMs}ms`,
        willChange: 'transform, opacity',
      }}
      className={className}
    >
      {children}
    </div>
  );
};