import { useEffect, useRef } from 'react';

interface WaveformProps {
  className?: string;
}

export function Waveform({ className = '' }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Read accent color from CSS custom property
      const style = getComputedStyle(canvas);
      const accent = style.getPropertyValue('--w-accent').trim() || '#3b82f6';
      const faint = style.getPropertyValue('--w-fg-faint').trim() || '#94a3b8';
      const border = style.getPropertyValue('--w-border-soft').trim() || '#e2e8f0';

      // Grid lines
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.5;
      const gridY = 6;
      const gridX = 10;
      for (let i = 0; i <= gridY; i++) {
        const y = (h / gridY) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let i = 0; i <= gridX; i++) {
        const x = (w / gridX) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Main waveform
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const mid = h * 0.5;
      const amp = h * 0.32;
      for (let x = 0; x <= w; x++) {
        const progress = x / w;
        const y = mid
          + Math.sin(progress * Math.PI * 4 + t * 0.8) * amp * 0.6
          + Math.sin(progress * Math.PI * 7 + t * 1.2) * amp * 0.3
          + Math.sin(progress * Math.PI * 13 + t * 0.5) * amp * 0.1;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary waveform (faded)
      ctx.strokeStyle = faint;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      for (let x = 0; x <= w; x++) {
        const progress = x / w;
        const y = mid
          + Math.sin(progress * Math.PI * 3 + t * 0.4 + 1) * amp * 0.7
          + Math.sin(progress * Math.PI * 9 + t * 0.9 + 2) * amp * 0.2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Dashed center line
      ctx.strokeStyle = faint;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      t += 0.015;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
}
