import React, { useState } from 'react';
import {
  ArrowRight,
  Flame,
  Layers,
  Sparkles,
  Thermometer,
  Clock,
  Cpu,
  Upload,
} from 'lucide-react';
import { formatEUR } from '../data/filaments';

export default function Hero({ studio, featuredProducts, onSelectProduct, onOpenStudio }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const spotlightList = featuredProducts.length > 0 ? featuredProducts : [];
  const activeProduct = spotlightList[activeIdx % Math.max(1, spotlightList.length)];
  const printer = studio?.printerStatus;

  return (
    <section id="top" className="relative overflow-hidden buildplate-grid border-b border-white/[0.07]">
      {/* Subtle Ambient Nozzle Glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/4 w-[520px] h-[520px] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #FF5500 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/6 w-[420px] h-[420px] rounded-full opacity-15 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16 lg:pt-14 lg:pb-22 relative">
        {/* Top CAD Coordinate Telemetry Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-10 pb-4 border-b border-white/[0.06] font-mono text-[11px] text-[#7D8596]">
          <div className="flex items-center gap-4">
            <span className="text-[#FF7326]">● STUDIO ONLINE</span>
            <span>X:256.0 Y:256.0 Z:256.0 MM</span>
            <span className="hidden sm:inline">TOLERANZ ±0.05 MM</span>
          </div>
          <div className="flex items-center gap-4">
            <span>FDM / MULTI-COLOR / CARBON-CF</span>
            <span className="hidden md:inline text-white/60">MADE ON PRINTBED</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Copy Column */}
          <div className="lg:col-span-6 space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#151822] border border-white/[0.1] text-xs font-mono text-[#D0D5DF]">
              <Layers className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Original 3D-Druck Kreationen • Limitiert & Custom</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[58px] font-bold tracking-tight leading-[1.04] text-white">
              Schicht für Schicht.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5500] via-[#FF8547] to-[#FFC099]">
                Direkt vom Druckbett
              </span>
              <br />
              auf deinen Desk.
            </h1>

            <p className="text-base sm:text-lg text-[#9DA4B4] leading-relaxed max-w-xl">
              Entdecke moderne Lampen, modulare Desk-Gadgets, Sammlerfiguren und funktionale
              Unikate aus unserem 3D-Druck-Studio. Jedes Teil wird in deiner Wunschfarbe aus
              hochwertigen Spezial-Filamenten gefertigt.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <a
                href="#shop"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white font-semibold text-sm shadow-[0_10px_35px_rgba(255,85,0,0.32)] transition-all hover:-translate-y-0.5"
              >
                <span>Kreationen entdecken</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#custom-print"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#141720] hover:bg-[#1C202D] text-white font-medium text-sm border border-white/[0.11] transition-all"
              >
                <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                <span>Wunschdruck anfragen</span>
              </a>
              <button
                onClick={onOpenStudio}
                className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl text-[#9DA4B4] hover:text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#FF5500]" />
                <span>Eigenes Werk hochladen</span>
              </button>
            </div>

            {/* Key Studio Specs */}
            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/[0.08] max-w-lg">
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white">0.12 mm</div>
                <div className="text-xs text-[#7D8596] mt-0.5">Feine Layer-Präzision</div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white">5</div>
                <div className="text-xs text-[#7D8596] mt-0.5">Studio-Filamentfarben</div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white">2–3 Tage</div>
                <div className="text-xs text-[#7D8596] mt-0.5">Frisch gedruckt & versendet</div>
              </div>
            </div>
          </div>

          {/* Right Interactive Spotlight & Live Printer Telemetry */}
          <div className="lg:col-span-6 space-y-4">
            {activeProduct && (
              <div className="cad-card group rounded-2xl bg-[#111318] border border-white/[0.1] overflow-hidden shadow-2xl">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#0B0C10]">
                  <img
                    src={activeProduct.images?.[0]}
                    alt={activeProduct.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  {/* Scan line animation */}
                  <div className="scan-beam pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-[#FF5500]/30 to-transparent opacity-0" />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090A0D] via-[#090A0D]/20 to-transparent" />

                  {/* Top Tags */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-md border border-white/[0.12] font-mono text-[11px] text-white uppercase tracking-wider">
                      FEATURED DROP // {activeProduct.material}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#FF5500] text-white font-mono text-xs font-bold shadow-lg">
                      {formatEUR(activeProduct.price)}
                    </span>
                  </div>

                  {/* Bottom Product Info Bar */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">
                        {activeProduct.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#C4CAD6] mt-1 line-clamp-1">
                        {activeProduct.subtitle}
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectProduct(activeProduct)}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-white text-[#090A0D] hover:bg-[#FF5500] hover:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      Ansehen & Kaufen
                    </button>
                  </div>
                </div>

                {/* Spotlight Switcher Pills */}
                {spotlightList.length > 1 && (
                  <div className="px-4 py-3 bg-[#0E1015] border-t border-white/[0.07] flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-[#7D8596] uppercase">
                      Studio Highlights
                    </span>
                    <div className="flex items-center gap-1.5">
                      {spotlightList.slice(0, 4).map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveIdx(idx)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                            idx === activeIdx % spotlightList.length
                              ? 'bg-[#FF5500]/20 text-[#FF7326] border border-[#FF5500]/50'
                              : 'bg-white/[0.04] text-[#8E95A5] hover:text-white border border-transparent'
                          }`}
                        >
                          0{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Printer Bed Telemetry Card */}
            {printer?.active && (
              <div className="rounded-xl bg-[#111318]/95 border border-white/[0.09] p-4 layer-lines">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] nozzle-pulse" />
                    <span className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
                      Gerade auf dem Druckbett
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8E95A5]">
                    <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>{printer.printer}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm mb-2">
                  <div className="font-medium text-white">
                    {printer.modelName}{' '}
                    <span className="text-xs font-mono text-[#8E95A5]">({printer.material})</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#FF7326]">
                    {printer.progress}%
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-white/[0.07] overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF5500] via-[#FF7326] to-[#38BDF8] transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, Number(printer.progress) || 0))}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-[#8E95A5]">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#FF5500]" />
                      Düse {printer.nozzleTemp}°C
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-[#38BDF8]" />
                      Bett {printer.bedTemp}°C
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-white/80">
                    <Clock className="w-3.5 h-3.5 text-[#8E95A5]" />
                    Restzeit: {printer.remaining}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
