import React from 'react';

interface CameraCanvasOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  zoomLevel: number;
}

export const CameraCanvasOverlay: React.FC<CameraCanvasOverlayProps> = ({
  canvasRef,
  zoomLevel,
}) => {
  return (
    <canvas
      ref={canvasRef}
      style={{ transform: `scale(${zoomLevel})` }}
      className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-transform duration-200"
    />
  );
};
