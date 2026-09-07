import { useRef, useCallback } from 'react';

interface Use3DCardTiltOptions {
  maxTilt?: number; // Maximum tilt angle in degrees (e.g., 10)
  perspective?: number; // CSS perspective value in px (e.g., 1000)
  scale?: number; // Scale on hover (e.g., 1.02)
  glare?: boolean; // Whether to compute glare overlay position
  speed?: number; // Transition speed in ms
}

export function use3DCardTilt<T extends HTMLElement = HTMLDivElement>({
  maxTilt = 8,
  perspective = 1000,
  scale = 1.02,
  glare = true,
  speed = 400,
}: Use3DCardTiltOptions = {}) {
  const cardRef = useRef<T | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<T>) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt angles (-maxTilt to +maxTilt)
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      card.style.transform = `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      card.style.transition = 'transform 80ms ease-out';

      if (glare) {
        const glarePercentX = (x / rect.width) * 100;
        const glarePercentY = (y / rect.height) * 100;
        card.style.setProperty('--glare-x', `${glarePercentX.toFixed(1)}%`);
        card.style.setProperty('--glare-y', `${glarePercentY.toFixed(1)}%`);
        card.style.setProperty('--glare-opacity', '0.18');
      }
    },
    [maxTilt, perspective, scale, glare]
  );

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.willChange = 'transform';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;

    card.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.transition = `transform ${speed}ms cubic-bezier(0.23, 1, 0.32, 1)`;
    card.style.willChange = 'auto';

    if (glare) {
      card.style.setProperty('--glare-opacity', '0');
    }
  }, [perspective, speed, glare]);

  return {
    cardRef,
    tiltProps: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}
