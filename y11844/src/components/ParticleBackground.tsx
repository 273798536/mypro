import React, { useEffect, useRef } from 'react';
interface Particle {
 x: number;
 y: number;
 vx: number;
 vy: number;
 radius: number;
 opacity: number;
 color: string;
}
interface ParticleBackgroundProps {
 intensity?: number;
 carbonReduction?: number;
}
export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ intensity = 1, carbonReduction = 0, }) => {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const particlesRef = useRef<Particle[]>([]);
 const animationRef = useRef<number>();
 useEffect(() => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;
 const resizeCanvas = () => {
 canvas.width = window.innerWidth;
 canvas.height = window.innerHeight;
 };
 resizeCanvas();
 window.addEventListener('resize', resizeCanvas);
 const particleCount = Math.floor(80 * intensity);
 const colors = carbonReduction > 1000
 ? ['#93B1A6', '#529d7f', '#318261']
 : ['#454545', '#6d6d6d', '#888888'];
 particlesRef.current = Array.from({ length: particleCount }, () => ({
 x: Math.random() * canvas.width,
 y: Math.random() * canvas.height,
 vx: (Math.random() - 0.5) * 0.3,
 vy: (Math.random() - 0.5) * 0.3,
 radius: Math.random() * 2 + 1,
 opacity: Math.random() * 0.5 + 0.2,
 color: colors[Math.floor(Math.random() * colors.length)],
 }));
 const animate = () => {
 ctx.clearRect(0, 0, canvas.width, canvas.height);
 particlesRef.current.forEach((particle, i) => {
 particle.x += particle.vx;
 particle.y += particle.vy;
 if (particle.x < 0) particle.x = canvas.width;
 if (particle.x > canvas.width) particle.x = 0;
 if (particle.y < 0) particle.y = canvas.height;
 if (particle.y > canvas.height) particle.y = 0;
 ctx.beginPath();
 ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
 ctx.fillStyle = particle.color;
 ctx.globalAlpha = particle.opacity;
 ctx.fill();
 ctx.globalAlpha = 1;
 particlesRef.current.forEach((other, j) => {
 if (i === j) return;
 const dx = particle.x - other.x;
 const dy = particle.y - other.y;
 const distance = Math.sqrt(dx * dx + dy * dy);
 if (distance < 120) {
 ctx.beginPath();
 ctx.moveTo(particle.x, particle.y);
 ctx.lineTo(other.x, other.y);
 ctx.strokeStyle = particle.color;
 ctx.globalAlpha = (1 - distance / 120) * 0.15;
 ctx.lineWidth = 0.5;
 ctx.stroke();
 ctx.globalAlpha = 1;
 }
 });
 });
 animationRef.current = requestAnimationFrame(animate);
 };
 animate();
 return () => {
 window.removeEventListener('resize', resizeCanvas);
 if (animationRef.current) {
 cancelAnimationFrame(animationRef.current);
 }
 };
 }, [intensity, carbonReduction]);
 return (<canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.6 }}/>);
};
