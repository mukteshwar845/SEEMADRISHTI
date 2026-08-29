import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Clock, AlertTriangle, ShieldAlert, Zap, Info } from 'lucide-react';

interface D3DwellTimeDataPoint {
  hour: string;
  hourIndex: number;
  unauthorizedAvgDwell: number; // in seconds
  peakDwell: number;
  threatLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  primaryZone: string;
  sampleCount: number;
}

export const D3DwellTimeChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<D3DwellTimeDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Generate realistic 24-hour unauthorized object dwell time profile
  const data: D3DwellTimeDataPoint[] = React.useMemo(() => {
    const hours = [
      '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
      '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
    ];

    return hours.map((hour, idx) => {
      // Midnight & 02:00-04:00 have high loitering dwell times (60s-85s)
      // Daytime (08:00-17:00) has faster unauthorized transit / brief halts (15s-32s)
      // Evening (19:00-23:00) ramps up from 35s to 65s
      let unauthorizedAvgDwell = 22;
      let threatLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL' = 'NORMAL';
      let primaryZone = 'Gate 1 Access Road';

      if (idx >= 0 && idx <= 5) {
        unauthorizedAvgDwell = 58 + Math.sin(idx * 0.8) * 22;
        threatLevel = unauthorizedAvgDwell > 60 ? 'CRITICAL' : 'ELEVATED';
        primaryZone = idx === 3 ? 'Perimeter Fence East (Sector 4)' : 'Buffer Zone Bravo';
      } else if (idx >= 6 && idx <= 17) {
        unauthorizedAvgDwell = 16 + Math.sin(idx * 0.5) * 12;
        threatLevel = unauthorizedAvgDwell > 25 ? 'ELEVATED' : 'NORMAL';
        primaryZone = 'Main Logistics Entrance';
      } else {
        unauthorizedAvgDwell = 38 + Math.sin((idx - 18) * 0.7) * 26;
        threatLevel = unauthorizedAvgDwell > 50 ? 'CRITICAL' : 'ELEVATED';
        primaryZone = 'South Perimeter Fence';
      }

      unauthorizedAvgDwell = Math.round(unauthorizedAvgDwell * 10) / 10;
      const peakDwell = Math.round(unauthorizedAvgDwell * 1.6 + 8);
      const sampleCount = Math.floor(12 + ((idx * 7) % 28));

      return {
        hour,
        hourIndex: idx,
        unauthorizedAvgDwell,
        peakDwell,
        threatLevel,
        primaryZone,
        sampleCount,
      };
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear prior render

    const width = containerRef.current.clientWidth || 600;
    const height = 260;
    const margin = { top: 25, right: 30, bottom: 35, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Defs: Gradients and Glow Filters
    const defs = svg.append('defs');

    // Area fill gradient
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-dwell-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.55);
    areaGradient.append('stop').attr('offset', '50%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.25);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.02);

    // Line stroke gradient
    const strokeGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-line-stroke-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    strokeGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e');
    strokeGradient.append('stop').attr('offset', '30%').attr('stop-color', '#f59e0b');
    strokeGradient.append('stop').attr('offset', '70%').attr('stop-color', '#06b6d4');
    strokeGradient.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'd3-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 23])
      .range([0, innerWidth]);

    const maxVal = d3.max(data, (d) => d.unauthorizedAvgDwell) || 80;
    const yScale = d3
      .scaleLinear()
      .domain([0, Math.ceil((maxVal + 15) / 10) * 10])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines (Horizontal)
    const yTicks = yScale.ticks(5);
    g.selectAll('.y-grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-width', 1);

    // Critical Dwell Threshold Line (45s)
    const thresholdSec = 45;
    const thresholdY = yScale(thresholdSec);
    if (thresholdY >= 0 && thresholdY <= innerHeight) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', thresholdY)
        .attr('y2', thresholdY)
        .attr('stroke', '#f43f5e')
        .attr('stroke-dasharray', '5 4')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85);

      g.append('text')
        .attr('x', innerWidth - 5)
        .attr('y', thresholdY - 5)
        .attr('text-anchor', 'end')
        .attr('fill', '#f43f5e')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .text('LOITERING THRESHOLD: 45 SECONDS');
    }

    // Line & Area Generators
    const areaGenerator = d3
      .area<D3DwellTimeDataPoint>()
      .x((d) => xScale(d.hourIndex))
      .y0(innerHeight)
      .y1((d) => yScale(d.unauthorizedAvgDwell))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const lineGenerator = d3
      .line<D3DwellTimeDataPoint>()
      .x((d) => xScale(d.hourIndex))
      .y((d) => yScale(d.unauthorizedAvgDwell))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Draw Area Fill
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#d3-dwell-gradient)')
      .attr('d', areaGenerator);

    // Draw Main Curve Line with Animation
    const path = g
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'url(#d3-line-stroke-grad)')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#d3-glow)')
      .attr('d', lineGenerator);

    const totalLength = path.node()?.getTotalLength() || 1000;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Circles for data points
    g.selectAll('.data-circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.hourIndex))
      .attr('cy', (d) => yScale(d.unauthorizedAvgDwell))
      .attr('r', (d) => (d.unauthorizedAvgDwell >= 45 ? 4 : 2.5))
      .attr('fill', (d) => (d.unauthorizedAvgDwell >= 45 ? '#f43f5e' : '#06b6d4'))
      .attr('stroke', '#0a0f1d')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    // Axes
    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(12)
      .tickFormat((d) => {
        const val = Number(d);
        return val < 10 ? `0${val}:00` : `${val}:00`;
      });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((ax) => ax.select('.domain').attr('stroke', '#334155'))
      .call((ax) => ax.selectAll('.tick line').attr('stroke', '#334155'))
      .call((ax) =>
        ax
          .selectAll('.tick text')
          .attr('fill', '#94a3b8')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
      );

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d}s`);

    g.append('g')
      .call(yAxis)
      .call((ax) => ax.select('.domain').attr('stroke', '#334155'))
      .call((ax) => ax.selectAll('.tick line').attr('stroke', '#334155'))
      .call((ax) =>
        ax
          .selectAll('.tick text')
          .attr('fill', '#94a3b8')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
      );

    // Interactive Overlay & Hover Tracking
    const trackingLine = g
      .append('line')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0);

    const trackingCircle = g
      .append('circle')
      .attr('r', 6)
      .attr('fill', '#f43f5e')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#d3-glow)')
      .style('opacity', 0);

    // Bisector for hover
    const bisect = d3.bisector<D3DwellTimeDataPoint, number>((d) => d.hourIndex).center;

    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, g.node());
        const clampedX = Math.max(0, Math.min(innerWidth, mx));
        const hourIdx = xScale.invert(clampedX);
        const pointIdx = bisect(data, hourIdx);
        const d = data[pointIdx];

        if (d) {
          const cx = xScale(d.hourIndex);
          const cy = yScale(d.unauthorizedAvgDwell);

          trackingLine.attr('x1', cx).attr('x2', cx).style('opacity', 1);
          trackingCircle.attr('cx', cx).attr('cy', cy).style('opacity', 1);

          setHoveredPoint(d);
          setTooltipPos({ x: event.clientX, y: event.clientY });
        }
      })
      .on('mouseleave', () => {
        trackingLine.style('opacity', 0);
        trackingCircle.style('opacity', 0);
        setHoveredPoint(null);
      });
  }, [data]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Chart Header Tag */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Clock size={14} />
          </span>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              D3.JS UNAUTHORIZED DWELL TIME 24-HOUR PROFILE
              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                D3 ENGINE
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              Temporal analysis of unauthorized object residency &amp; stationary loitering durations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <span className="text-slate-300">&gt;45s Loitering</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">&lt;30s Transit</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="w-full bg-[#0a0f1d]/90 border border-slate-800 rounded-xl p-2 relative overflow-hidden shadow-inner">
        <svg ref={svgRef} className="w-full" style={{ minHeight: '260px' }} />

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute top-4 right-4 pointer-events-none z-30 p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,0,0,0.8)] text-[10px] font-mono text-slate-200 min-w-[200px] animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-cyan-300">{hoveredPoint.hour} UTC HOUR</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                  hoveredPoint.threatLevel === 'CRITICAL'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                    : hoveredPoint.threatLevel === 'ELEVATED'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                }`}
              >
                {hoveredPoint.threatLevel}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">AVG DWELL TIME:</span>
                <span className="font-bold text-white">{hoveredPoint.unauthorizedAvgDwell}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PEAK RESIDENCY:</span>
                <span className="font-bold text-rose-400">{hoveredPoint.peakDwell}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SAMPLE DETECTIONS:</span>
                <span className="font-bold text-slate-300">{hoveredPoint.sampleCount} objects</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1">
                <span className="text-slate-400">HOTSPOT:</span>
                <span className="font-bold text-cyan-400 truncate max-w-[110px]" title={hoveredPoint.primaryZone}>
                  {hoveredPoint.primaryZone}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
