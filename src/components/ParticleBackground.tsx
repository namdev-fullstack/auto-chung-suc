'use client';

import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Tắt hoàn toàn trên màn hình di động/máy tính bảng (< 768px) hoặc thiết bị cảm ứng
    // Tránh quá tải GPU / nghẽn compositor trên iOS ProMotion 120Hz
    const isMobile =
      window.innerWidth < 768 ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isMobile) {
      return;
    }

    setShouldRender(true);
  }, []);

  useEffect(() => {
    if (!shouldRender) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = [
      'rgba(59, 130, 246,', // blue-500
      'rgba(99, 102, 241,', // indigo-500
      'rgba(147, 51, 234,', // purple-600
    ];

    // Chỉ dùng tối đa 16 hạt nhẹ trên màn hình lớn
    const particleCount = 16;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.25 + 0.1,
        color,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    let isVisible = true;
    const handleVisibility = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let lastTime = 0;
    const frameInterval = 1000 / 30; // Giới hạn cố định 30 FPS trên desktop

    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);

      if (!isVisible) return;

      const elapsed = time - lastTime;
      if (elapsed < frameInterval) return;

      lastTime = time - (elapsed % frameInterval);

      ctx.clearRect(0, 0, width, height);

      // Cập nhật và vẽ các đốm sáng trôi nhẹ nhàng (không chạy O(N^2) nối đường)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.alpha})`;
        ctx.fill();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-60 transform-gpu"
      aria-hidden="true"
    />
  );
}
