import React, { useRef, useState, useCallback } from 'react';

interface Tactical3DCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees (e.g., 12)
  scale?: number; // scale on hover (e.g., 1.02)
  glare?: boolean;
  perspective?: number;
}

export const Tactical3DCard: React.FC<Tactical3DCardProps> = ({
  children,
  className = '',
  maxTilt = 12,
  scale = 1.025,
  glare = true,
  perspective = 1000,
  style,
  ...rest
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt angles
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      // Calculate dynamic 3D shadow offset based on light source from top-left
      const shadowX = (-rotateY * 1.6).toFixed(1);
      const shadowY = (rotateX * 1.6 + 12).toFixed(1);

      card.style.transform = `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      card.style.boxShadow = `${shadowX}px ${shadowY}px 32px -4px rgba(0, 0, 0, 0.75), 0 0 20px rgba(0, 240, 255, 0.18)`;
      card.style.transition = 'transform 50ms ease-out, box-shadow 50ms ease-out';

      if (glare) {
        setGlarePos({
          x: (x / rect.width) * 100,
          y: (y / rect.height) * 100,
          opacity: 0.35,
        });
      }
    },
    [maxTilt, scale, glare, perspective]
  );

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.willChange = 'transform, box-shadow';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;

    card.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.boxShadow = '';
    card.style.transition = 'transform 450ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 450ms cubic-bezier(0.23, 1, 0.32, 1)';
    card.style.willChange = 'auto';

    if (glare) {
      setGlarePos((p) => ({ ...p, opacity: 0 }));
    }
  }, [glare, perspective]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transform-gpu preserve-3d ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        ...style,
      }}
      {...rest}
    >
      {children}
      {glare && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300 z-30"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.28) 0%, rgba(0,240,255,0.15) 35%, transparent 65%)`,
            opacity: glarePos.opacity,
          }}
        />
      )}
    </div>
  );
};
