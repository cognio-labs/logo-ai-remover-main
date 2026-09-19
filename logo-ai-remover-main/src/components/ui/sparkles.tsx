"use client";
import React, { useId, useEffect, useRef } from "react";

export interface SparklesCoreProps {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
}

export const SparklesCore: React.FC<SparklesCoreProps> = ({
  id,
  className = "",
  background = "transparent",
  minSize = 0.4,
  maxSize = 1.2,
  speed = 1,
  particleColor = "#FFFFFF",
  particleDensity = 800,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generatedId = useId();
  const canvasId = id || generatedId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      initParticles();
    };

    window.addEventListener("resize", handleResize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      opacitySpeed: number;
    }

    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      const count = Math.floor((width * height * particleDensity) / 100000);
      const actualCount = Math.min(Math.max(count, 60), 600);

      for (let i = 0; i < actualCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * (maxSize - minSize) + minSize,
          speedX: (Math.random() - 0.5) * 0.4 * speed,
          speedY: (Math.random() - 0.5) * 0.4 * speed,
          opacity: Math.random() * 0.8 + 0.2,
          opacitySpeed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        });
      }
    };

    initParticles();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around borders
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulse opacity
        p.opacity += p.opacitySpeed;
        if (p.opacity > 1 || p.opacity < 0.1) {
          p.opacitySpeed = -p.opacitySpeed;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [minSize, maxSize, speed, particleColor, particleDensity]);

  return (
    <canvas
      id={canvasId}
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
      style={{ background }}
    />
  );
};
