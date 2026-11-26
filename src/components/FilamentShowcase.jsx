import React from 'react';
import { Flame, Disc3 } from 'lucide-react';
import { FILAMENTS } from '../data/filaments';

export default function FilamentShowcase({ activeColorFilter, onSelectColorFilter }) {
  return (
    <section id="filaments" className="py-18 border-y border-white/[0.07] bg-[#0C0E13]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-xs text-[#FF7326] uppercase tracking-widest mb-2">
              <Disc3 className="w-4 h-4" />
              <span>DEINE FILAMENT-BAR // AKTUELL AUF LAGER</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Deine Kreation. Deine Farbe.
            </h2>
            <p className="text-sm sm:text-base text-[#9DA4B4] mt-2 max-w-2xl">
              Wähle aus unseren 5 Studio-Filamenten — von cleanem Matt-Schwarz & Matt-Weiß über
              Rot-Schwarz Dual-Mix bis hin zu schimmerndem Galaxy Blau-Lila und kräftigem Pink.
              Klicke auf eine Spule, um passende Drucke zu filtern.
            </p>
          </div>
          {activeColorFilter && (
            <button
              onClick={() => onSelectColorFilter(null)}
              className="self-start md:self-auto px-3.5 py-2 rounded-lg bg-[#1A1E29] hover:bg-[#232837] text-xs font-mono text-[#FF7326] border border-[#FF5500]/40 cursor-pointer"
            >
              Farbfilter zurücksetzen ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {FILAMENTS.map((f) => {
            const isSelected = activeColorFilter === f.id;
            const isGradient = (f.swatch || '').startsWith('linear-gradient');
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectColorFilter(isSelected ? null : f.id)}
                className={`group text-left p-5 rounded-2xl border transition-all flex flex-col items-start gap-4 cursor-pointer ${
                  isSelected
                    ? 'bg-[#171B26] border-[#FF5500] shadow-[0_0_24px_rgba(255,85,0,0.22)]'
                    : 'bg-[#111318] border-white/[0.08] hover:border-white/[0.25] hover:-translate-y-0.5'
                }`}
              >
                {/* Stylized Filament Spool */}
                <div className="w-full flex items-center justify-between">
                  <div
                    className="relative w-15 h-15 rounded-full shrink-0 flex items-center justify-center shadow-inner transition-transform group-hover:rotate-45 duration-500"
                    style={{
                      background: isGradient
                        ? f.swatch
                        : `radial-gradient(circle at 35% 35%, ${f.ring}, ${f.hex} 72%)`,
                      boxShadow: `inset 0 0 0 3px rgba(255,255,255,0.16), 0 8px 20px rgba(0,0,0,0.45)`,
                    }}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#0C0E13] border border-white/25" />
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] text-[#C4CAD6]">
                    {f.finish}
                  </span>
                </div>

                <div className="w-full flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display font-bold text-base text-white">
                      {f.name}
                    </h3>
                    <p className="text-xs text-[#8E95A5] mt-1 leading-relaxed">
                      {f.note}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/[0.06] font-mono text-[11px] text-[#7D8596]">
                    <span>{f.material}</span>
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#FF5500]" />
                      {f.temp}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
