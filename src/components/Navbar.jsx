import React from 'react';
import {
  ShoppingBag,
  Upload,
  PackageSearch,
  Sparkles,
  Box,
  Lock,
} from 'lucide-react';

export default function Navbar({
  studio,
  authenticated,
  cartCount,
  pendingAdminCount,
  onOpenCart,
  onOpenStudio,
  onOpenTracker,
}) {
  return (
    <header className="sticky top-0 z-40">
      {/* Top Studio Announcement Ticker */}
      <div className="bg-[#0E1015] border-b border-white/[0.07] px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-[#A5ACB8]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF5500] nozzle-pulse shrink-0" />
            <span className="font-mono tracking-tight text-[11px] sm:text-xs">
              {studio?.announcement ||
                'Kostenloser Versand ab 50€ • Jede Kreation wird frisch auf dem Druckbett gefertigt'}
            </span>
          </div>
          <button
            onClick={onOpenTracker}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#38BDF8] hover:text-white transition-colors cursor-pointer"
          >
            <PackageSearch className="w-3.5 h-3.5" />
            <span>Druckstatus tracken</span>
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="backdrop-blur-xl bg-[#090A0D]/85 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <a href="#top" className="flex items-center gap-3 group shrink-0">
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF5500] to-[#C83B00] flex items-center justify-center shadow-[0_0_24px_rgba(255,85,0,0.3)] group-hover:scale-105 transition-transform">
              <Box className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="leading-none">
              <div className="font-display font-bold text-lg tracking-wider text-white flex items-center gap-1.5 whitespace-nowrap">
                {studio?.brandName || 'LAYERLAB'}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[#FF7326] border border-[#FF5500]/30">
                  3D
                </span>
              </div>
              <div className="text-[10px] font-mono tracking-[0.16em] text-[#7D8596] mt-0.5 hidden xl:block whitespace-nowrap">
                {studio?.tagline || '3D-DRUCK STUDIO // CUSTOM DROPS'}
              </div>
            </div>
          </a>

          {/* Center Links */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#A5ACB8] whitespace-nowrap">
            <a href="#shop" className="hover:text-white transition-colors">
              Kreationen
            </a>
            <a href="#filaments" className="hover:text-white transition-colors">
              Filament-Bar
            </a>
            <a href="#custom-print" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5500]" />
              Wunschdruck
            </a>
            <button
              onClick={onOpenTracker}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Auftrag tracken
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
            <button
              onClick={onOpenStudio}
              className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-[#151821] hover:bg-[#1D212E] text-white border border-white/[0.12] hover:border-[#FF5500]/60 transition-all cursor-pointer"
              title="Kreationen hochladen & Bestellungen verwalten"
            >
              {authenticated ? (
                <Upload className="w-4 h-4 text-[#FF5500]" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#FF5500]" />
              )}
              <span>Creator Studio</span>
              {authenticated && pendingAdminCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#FF5500] text-white leading-none">
                  {pendingAdminCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenCart}
              className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#FF5500] hover:bg-[#FF6A1A] text-white shadow-[0_0_20px_rgba(255,85,0,0.28)] transition-all cursor-pointer"
              aria-label="Warenkorb öffnen"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Warenkorb</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-black/35 text-white leading-none">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
