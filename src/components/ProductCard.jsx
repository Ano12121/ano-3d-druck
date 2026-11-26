import React from 'react';
import { Heart, ShoppingBag, Clock, Layers, Eye, Box } from 'lucide-react';
import { formatEUR, getFilamentById } from '../data/filaments';

export default function ProductCard({
  product,
  liked,
  onLike,
  onSelect,
  onQuickAdd,
}) {
  const defaultColor = getFilamentById(product.colors?.[0] || 'matt-schwarz');
  const isOutOfStock = product.stockMode === 'in-stock' && product.stockCount <= 0;

  return (
    <article className="cad-card group flex flex-col rounded-2xl bg-[#111318] border border-white/[0.08] hover:border-[#FF5500]/50 overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg">
      {/* Photo Stage */}
      <div
        onClick={() => onSelect(product)}
        className="relative aspect-[4/3] overflow-hidden bg-[#0B0C10] cursor-pointer"
      >
        <img
          src={product.images?.[0]}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Laser Layer Scan on Hover */}
        <div className="scan-beam pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-transparent via-[#FF5500]/35 to-transparent opacity-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/90 via-transparent to-black/25" />

        {/* Top Left Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {product.badge && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#FF5500] text-white shadow-md">
              {product.badge}
            </span>
          )}
          {(product.modelUrl || product.demoModel) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-semibold bg-black/70 backdrop-blur-md text-[#38BDF8] border border-[#38BDF8]/40">
              <Box className="w-3 h-3" />
              3D
            </span>
          )}
          {product.images?.length > 1 && (
            <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-black/65 backdrop-blur-md text-white/85 border border-white/10">
              +{product.images.length - 1} Fotos
            </span>
          )}
        </div>

        {/* Top Right Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike(product.id);
          }}
          className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-md border text-xs font-mono transition-all cursor-pointer ${
            liked
              ? 'bg-[#FF5500]/25 border-[#FF5500] text-[#FF8547]'
              : 'bg-black/60 border-white/[0.12] text-white/80 hover:border-white/30'
          }`}
          aria-label="Gefällt mir"
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-[#FF5500] text-[#FF5500]' : ''}`} />
          <span>{product.likes || 0}</span>
        </button>

        {/* Bottom Left Technical Spec Pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/[0.1] font-mono text-[11px] text-[#D7DCE6]">
            <Layers className="w-3 h-3 text-[#FF5500]" />
            {product.material} • {product.specs?.layerHeight || '0.16 mm'}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/[0.1] font-mono text-[10px] text-[#9DA4B4]">
            <Clock className="w-3 h-3 text-[#38BDF8]" />
            {product.specs?.printTime || '3h'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 flex flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#7D8596] mb-1.5">
          <span>{product.category}</span>
          <span
            className={
              isOutOfStock
                ? 'text-red-400'
                : product.stockMode === 'in-stock'
                ? 'text-emerald-400'
                : 'text-[#38BDF8]'
            }
          >
            {isOutOfStock
              ? 'Ausverkauft'
              : product.stockMode === 'in-stock'
              ? `${product.stockCount}x auf Lager`
              : product.leadTime || 'Auf Bestellung'}
          </span>
        </div>

        <h3
          onClick={() => onSelect(product)}
          className="font-display text-lg font-bold text-white group-hover:text-[#FF7326] transition-colors cursor-pointer leading-snug"
        >
          {product.title}
        </h3>

        <p className="text-xs sm:text-sm text-[#8E95A5] mt-1.5 line-clamp-2 flex-1">
          {product.subtitle || product.description}
        </p>

        {/* Filament Swatches Preview */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3.5 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            {(product.colors || ['matt-schwarz']).slice(0, 5).map((cid) => {
              const f = getFilamentById(cid);
              return (
                <span
                  key={cid}
                  title={`${f.name} (${f.finish})`}
                  className="w-4 h-4 rounded-full border border-white/25 shadow-inner"
                  style={{ background: f.swatch || f.hex }}
                />
              );
            })}
            <span className="text-[11px] font-mono text-[#7D8596] ml-1">
              {(product.colors || []).length} Farben
            </span>
          </div>
          <div className="text-right">
            {product.compareAtPrice && (
              <span className="text-xs font-mono text-[#687082] line-through mr-1.5">
                {formatEUR(product.compareAtPrice)}
              </span>
            )}
            <span className="font-mono text-lg font-bold text-white">
              {formatEUR(product.price)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => onSelect(product)}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#181C26] hover:bg-[#222736] text-xs font-semibold text-white border border-white/[0.08] transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#8E95A5]" />
            <span>Details & Farben</span>
          </button>
          <button
            disabled={isOutOfStock}
            onClick={() => onQuickAdd(product, defaultColor)}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>In den Korb</span>
          </button>
        </div>
      </div>
    </article>
  );
}
