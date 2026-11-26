import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  X,
  ShoppingBag,
  Layers,
  Clock,
  Ruler,
  Scale,
  Grid3x3,
  Heart,
  Check,
  Truck,
  ShieldCheck,
  Minus,
  Plus,
  Box,
  Image as ImageIcon,
} from 'lucide-react';
import { formatEUR, getFilamentById } from '../data/filaments';

const ModelViewer3D = lazy(() => import('./ModelViewer3D'));

export default function ProductModal({
  product,
  liked,
  onLike,
  onClose,
  onAddToCart,
}) {
  const [viewMode, setViewMode] = useState('photos'); // photos | 3d
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColorId, setSelectedColorId] = useState(
    product?.colors?.[0] || 'matt-schwarz'
  );
  const [sizeOption, setSizeOption] = useState('Standard (100%)');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      setViewMode('photos');
      setSelectedImage(0);
      setSelectedColorId(product.colors?.[0] || 'matt-schwarz');
      setSizeOption('Standard (100%)');
      setQuantity(1);
    }
  }, [product]);

  if (!product) return null;

  const has3D = Boolean(product.modelUrl || product.demoModel);
  const canScale = Boolean(product.allowScaling);
  const effectiveSizeOption = canScale ? sizeOption : 'Standard (100%)';
  const selectedFilament = getFilamentById(selectedColorId);
  const scaleMultiplier = effectiveSizeOption === 'Large (+25%)' ? 1.25 : 1;
  const finalPrice = Math.round(product.price * scaleMultiplier * 100) / 100;
  const isOutOfStock = product.stockMode === 'in-stock' && product.stockCount <= 0;

  const handleAdd = () => {
    onAddToCart({
      productId: product.id,
      title: product.title,
      image: product.images?.[0] || '',
      colorId: selectedFilament.id,
      colorName: selectedFilament.name,
      colorHex: selectedFilament.swatch || selectedFilament.hex,
      sizeOption: effectiveSizeOption,
      quantity,
      unitPrice: finalPrice,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl bg-[#111318] border border-white/[0.12] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0C0E13] border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 font-mono text-xs text-[#8E95A5]">
            <span className="text-[#FF5500] font-semibold">SPECS //</span>
            <span>{product.category}</span>
            <span>•</span>
            <span>{product.material}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E95A5] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="overflow-y-auto grid lg:grid-cols-12 gap-6 p-5 sm:p-7">
          {/* Left Gallery / Live 3D Viewer + Technical Print Specs */}
          <div className="lg:col-span-6 space-y-4">
            {has3D && (
              <div className="inline-flex items-center p-1 rounded-xl bg-[#0C0E13] border border-white/[0.09] gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('photos')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === 'photos'
                      ? 'bg-[#1D2230] text-white'
                      : 'text-[#8E95A5] hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Studio-Fotos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === '3d'
                      ? 'bg-[#FF5500] text-white shadow'
                      : 'text-[#38BDF8] hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D-Viewer (Live-Farbe)</span>
                </button>
              </div>
            )}

            {viewMode === '3d' && has3D ? (
              <Suspense
                fallback={
                  <div className="h-[300px] sm:h-[340px] rounded-xl bg-[#090B10] border border-white/[0.1] flex items-center justify-center font-mono text-xs text-[#38BDF8]">
                    3D-Viewer wird geladen...
                  </div>
                }
              >
                <ModelViewer3D
                  modelUrl={product.modelUrl}
                  demoModel={product.demoModel}
                  colorHex={selectedFilament.hex}
                  secondaryHex={selectedFilament.secondaryHex}
                  finish={selectedFilament.finish}
                  scaleFactor={effectiveSizeOption === 'Large (+25%)' ? 1.15 : 1}
                  heightClass="h-[300px] sm:h-[340px]"
                  label={
                    product.modelUrl
                      ? `STL 3D-MODELL // ${selectedFilament.name.toUpperCase()}`
                      : `INTERAKTIVES 3D-MESH // ${selectedFilament.name.toUpperCase()}`
                  }
                />
              </Suspense>
            ) : (
              <>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#090A0D] border border-white/[0.08]">
                  <img
                    src={product.images?.[selectedImage] || product.images?.[0]}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  {product.badge && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#FF5500] text-white font-mono text-xs font-bold uppercase">
                      {product.badge}
                    </span>
                  )}
                  {has3D && (
                    <button
                      type="button"
                      onClick={() => setViewMode('3d')}
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-[#FF5500] backdrop-blur-md border border-white/[0.15] text-xs font-mono text-white transition-colors cursor-pointer"
                    >
                      <Box className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span>In 3D drehen</span>
                    </button>
                  )}
                </div>

                {product.images?.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                          idx === selectedImage
                            ? 'border-[#FF5500] opacity-100'
                            : 'border-white/[0.08] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Technical Print-Bed Spec Sheet */}
            <div className="rounded-xl bg-[#0C0E13] border border-white/[0.08] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="font-mono text-[11px] text-[#7D8596] uppercase tracking-wider">
                  Technische Druckdaten
                </div>
                {product.slicerMeta?.slicerName && (
                  <span className="px-2 py-0.5 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/30 font-mono text-[10px] text-[#38BDF8]">
                    SLICER: {product.slicerMeta.slicerName}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[#141720] border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-[#7D8596] mb-1">
                    <Layers className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>Schichthöhe</span>
                  </div>
                  <div className="font-mono font-semibold text-white">
                    {product.specs?.layerHeight || '0.16 mm'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141720] border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-[#7D8596] mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Druckzeit</span>
                  </div>
                  <div className="font-mono font-semibold text-white">
                    {product.specs?.printTime || '4h 15m'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141720] border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-[#7D8596] mb-1">
                    <Scale className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>Gewicht</span>
                  </div>
                  <div className="font-mono font-semibold text-white">
                    {product.specs?.weight || '140 g'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141720] border border-white/[0.05] col-span-2">
                  <div className="flex items-center gap-1.5 text-[#7D8596] mb-1">
                    <Ruler className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Maße (B × T × H)</span>
                  </div>
                  <div className="font-mono font-semibold text-white">
                    {product.specs?.dimensions || '120 × 120 × 120 mm'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141720] border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-[#7D8596] mb-1">
                    <Grid3x3 className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>Infill</span>
                  </div>
                  <div className="font-mono font-semibold text-white">
                    {product.specs?.infill || '15% Gyroid'}
                  </div>
                </div>
              </div>
              {product.slicerMeta && (
                <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-white/[0.06] font-mono text-[10px] text-[#8E95A5]">
                  {product.slicerMeta.nozzleDiameter && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                      Düse {product.slicerMeta.nozzleDiameter}
                    </span>
                  )}
                  {product.slicerMeta.totalLayers && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                      {product.slicerMeta.totalLayers} Layer
                    </span>
                  )}
                  {product.slicerMeta.filamentMeters > 0 && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                      {product.slicerMeta.filamentMeters} m PLA
                    </span>
                  )}
                  {product.slicerMeta.printerModel && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                      {product.slicerMeta.printerModel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Configuration & Buy Column */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                    {product.title}
                  </h2>
                  {product.subtitle && (
                    <p className="text-sm text-[#9DA4B4] mt-1">{product.subtitle}</p>
                  )}
                </div>
                <button
                  onClick={() => onLike(product.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
                    liked
                      ? 'bg-[#FF5500]/20 border-[#FF5500] text-[#FF8547]'
                      : 'bg-[#171B24] border-white/[0.1] text-[#A5ACB8] hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-[#FF5500] text-[#FF5500]' : ''}`} />
                  {product.likes || 0}
                </button>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="font-mono text-3xl font-bold text-white">
                  {formatEUR(finalPrice)}
                </span>
                {product.compareAtPrice && effectiveSizeOption === 'Standard (100%)' && (
                  <span className="font-mono text-base text-[#6E7687] line-through">
                    {formatEUR(product.compareAtPrice)}
                  </span>
                )}
                <span className="text-xs font-mono text-[#7D8596]">100% PLA</span>
              </div>

              <p className="text-sm text-[#B8BFCE] leading-relaxed">
                {product.description}
              </p>

              {/* Filament Color Selector */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-2.5">
                  <span className="font-mono uppercase tracking-wider text-[#8E95A5]">
                    Wunsch-Filament wählen {viewMode === '3d' && '• Live im 3D-Modell'}
                  </span>
                  <span className="font-mono text-white font-medium">
                    {selectedFilament.name}{' '}
                    <span className="text-[#7D8596]">({selectedFilament.finish})</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {(product.colors || ['matt-schwarz']).map((cid) => {
                    const f = getFilamentById(cid);
                    const active = cid === selectedColorId;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => setSelectedColorId(cid)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1B202C] border-[#FF5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.22)]'
                            : 'bg-[#141720] border-white/[0.08] text-[#A5ACB8] hover:border-white/25'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center shrink-0"
                          style={{ background: f.swatch || f.hex }}
                        >
                          {active && (
                            <Check
                              className={`w-2.5 h-2.5 drop-shadow ${
                                f.id === 'matt-weiss' ? 'text-black' : 'text-white'
                              }`}
                            />
                          )}
                        </span>
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scale / Size Option (only shown when enabled per product in Creator Studio) */}
              {canScale && (
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-[#8E95A5] mb-2">
                    Skalierung / Größe
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {['Standard (100%)', 'Large (+25%)'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSizeOption(opt)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          sizeOption === opt
                            ? 'bg-[#1B202C] border-[#FF5500] text-white'
                            : 'bg-[#141720] border-white/[0.08] text-[#9DA4B4] hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-semibold">{opt}</div>
                        <div className="font-mono text-[11px] text-[#7D8596] mt-0.5">
                          {opt === 'Standard (100%)'
                            ? formatEUR(product.price)
                            : formatEUR(Math.round(product.price * 1.25 * 100) / 100)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Add to Cart Action */}
            <div className="space-y-3 pt-4 border-t border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center rounded-xl bg-[#161922] border border-white/[0.1]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-3 text-[#9DA4B4] hover:text-white cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-9 text-center font-mono text-sm font-semibold text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-3 text-[#9DA4B4] hover:text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAdd}
                  className="flex-1 inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] disabled:opacity-40 text-white font-semibold text-sm shadow-[0_10px_30px_rgba(255,85,0,0.3)] transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isOutOfStock
                      ? 'Aktuell ausverkauft'
                      : `In den Warenkorb • ${formatEUR(finalPrice * quantity)}`}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8E95A5]">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#38BDF8]" />
                  {product.stockMode === 'in-stock'
                    ? `Direkt fertig (${product.stockCount}x da)`
                    : `Wird frisch in PLA gedruckt (${product.leadTime || '2–3 Tage'})`}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Übergabe oder Versand
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
