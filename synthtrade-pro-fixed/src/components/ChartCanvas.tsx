import { useRef, useEffect, useCallback } from 'react';
import type { Tick, IndicatorSettings } from '@/types';

interface ChartCanvasProps {
  ticks: Tick[];
  indicators: IndicatorSettings;
  showEma: boolean;
  showBollinger: boolean;
  showVwap: boolean;
  currentPrice: number;
}

function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sum += prices[i];
      ema.push(prices[i]);
    } else if (i === period - 1) {
      sum += prices[i];
      ema.push(sum / period);
    } else {
      ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
  }
  return ema;
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(prices[i]);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

function calculateStdDev(prices: number[], period: number): number[] {
  const stdDev: number[] = [];
  const sma = calculateSMA(prices, period);
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      stdDev.push(0);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.pow(prices[i - j] - sma[i], 2);
      }
      stdDev.push(Math.sqrt(sum / period));
    }
  }
  return stdDev;
}

function calculateVWAP(prices: number[]): number[] {
  const vwap: number[] = [];
  let cumTP = 0;
  let cumVol = 0;
  for (let i = 0; i < prices.length; i++) {
    const tp = prices[i];
    const vol = 1 + Math.random() * 2;
    cumTP += tp * vol;
    cumVol += vol;
    vwap.push(cumTP / cumVol);
  }
  return vwap;
}

export default function ChartCanvas({ ticks, indicators, showEma, showBollinger, showVwap, currentPrice }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dprRef = useRef(1);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || ticks.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = dprRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#0b0e11';
    ctx.fillRect(0, 0, width, height);

    const prices = ticks.map(t => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.1;
    const yMin = minPrice - padding;
    const yMax = maxPrice + padding;

    const xStep = width / (ticks.length - 1);
    const getY = (price: number) => height - ((price - yMin) / (yMax - yMin)) * (height - 40) - 20;
    const getX = (i: number) => i * xStep;

    // Draw grid
    ctx.strokeStyle = 'rgba(42, 47, 54, 0.6)';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 8; i++) {
      const y = 20 + (i / 8) * (height - 40);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      const priceLabel = (yMax - (i / 8) * (yMax - yMin)).toFixed(2);
      ctx.fillStyle = '#475569';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceLabel, 8, y - 4);
    }

    // Vertical grid lines
    for (let i = 0; i < ticks.length; i += 30) {
      const x = getX(i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Calculate indicators
    const emaShortData = showEma ? calculateEMA(prices, indicators.emaShort) : [];
    const emaLongData = showEma ? calculateEMA(prices, indicators.emaLong) : [];
    const smaData = showBollinger ? calculateSMA(prices, indicators.bbPeriod) : [];
    const stdDevData = showBollinger ? calculateStdDev(prices, indicators.bbPeriod) : [];
    const vwapData = showVwap ? calculateVWAP(prices) : [];

    // Draw Bollinger Bands
    if (showBollinger && smaData.length > 0) {
      const upper: [number, number][] = [];
      const lower: [number, number][] = [];
      for (let i = 0; i < prices.length; i++) {
        if (i >= indicators.bbPeriod - 1) {
          const up = smaData[i] + indicators.bbDeviation * stdDevData[i];
          const low = smaData[i] - indicators.bbDeviation * stdDevData[i];
          upper.push([getX(i), getY(up)]);
          lower.push([getX(i), getY(low)]);
        }
      }

      // Fill between bands
      if (upper.length > 1) {
        ctx.beginPath();
        ctx.moveTo(upper[0][0], upper[0][1]);
        for (let i = 1; i < upper.length; i++) {
          ctx.lineTo(upper[i][0], upper[i][1]);
        }
        for (let i = lower.length - 1; i >= 0; i--) {
          ctx.lineTo(lower[i][0], lower[i][1]);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(167, 113, 247, 0.06)';
        ctx.fill();
      }

      // Upper band line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(167, 113, 247, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i < upper.length; i++) {
        if (i === 0) ctx.moveTo(upper[i][0], upper[i][1]);
        else ctx.lineTo(upper[i][0], upper[i][1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Lower band line
      ctx.beginPath();
      for (let i = 0; i < lower.length; i++) {
        if (i === 0) ctx.moveTo(lower[i][0], lower[i][1]);
        else ctx.lineTo(lower[i][0], lower[i][1]);
      }
      ctx.stroke();
    }

    // Draw VWAP
    if (showVwap && vwapData.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < vwapData.length; i++) {
        const x = getX(i);
        const y = getY(vwapData[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw EMA Long
    if (showEma && emaLongData.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(240, 136, 62, 0.8)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < emaLongData.length; i++) {
        const x = getX(i);
        const y = getY(emaLongData[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw EMA Short
    if (showEma && emaShortData.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(63, 185, 80, 0.9)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < emaShortData.length; i++) {
        const x = getX(i);
        const y = getY(emaShortData[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw price line
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    for (let i = 0; i < prices.length; i++) {
      const x = getX(i);
      const y = getY(prices[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw gradient fill under price line
    ctx.beginPath();
    for (let i = 0; i < prices.length; i++) {
      const x = getX(i);
      const y = getY(prices[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.08)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw live tick dot
    const lastIdx = prices.length - 1;
    const lastX = getX(lastIdx);
    const lastY = getY(prices[lastIdx]);

    ctx.shadowColor = '#2563eb';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw crosshair at last price
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(width, lastY);
    ctx.stroke();

  }, [ticks, indicators, showEma, showBollinger, showVwap]);

  useEffect(() => {
    const handleResize = () => {
      dprRef.current = window.devicePixelRatio || 1;
      draw();
    };

    dprRef.current = window.devicePixelRatio || 1;
    draw();

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      draw();
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[300px]">
      {/* Floating Price Header */}
      <div className="absolute top-4 left-4 z-10 bg-[#151a21]/80 backdrop-blur-sm border border-[#2a2f36] rounded-lg px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">R_75</span>
          <span className="font-mono text-lg font-semibold text-white">{currentPrice.toFixed(2)}</span>
          <span className="text-xs font-mono text-emerald-400">+0.42%</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 bg-[#151a21]/80 backdrop-blur-sm border border-[#2a2f36] rounded-lg px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-0.5 bg-emerald-400 rounded-full" />
          <span className="text-[10px] text-[#94a3b8]">EMA Short</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-0.5 bg-orange-400 rounded-full" />
          <span className="text-[10px] text-[#94a3b8]">EMA Long</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-0.5 bg-purple-400 rounded-full" />
          <span className="text-[10px] text-[#94a3b8]">BBands</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-0.5 bg-amber-400 rounded-full" />
          <span className="text-[10px] text-[#94a3b8]">VWAP</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
