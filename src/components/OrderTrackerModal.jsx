import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Circle,
  PackageSearch,
  RefreshCw,
  Clock,
  Scale,
  Layers,
  Cpu,
} from 'lucide-react';
import { ORDER_STEPS, formatEUR } from '../data/filaments';
import { lookupOrder } from '../api';

export default function OrderTrackerModal({ open, initialCode, onClose }) {
  const [code, setCode] = useState(initialCode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const runLookup = useCallback(async (targetCode, silent = false) => {
    const clean = (targetCode || '').trim();
    if (!clean) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await lookupOrder(clean);
      setOrder(data);
    } catch (err) {
      if (!silent) {
        setOrder(null);
        setError(err.message || 'Bestellung nicht gefunden.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && initialCode) {
      setCode(initialCode);
      runLookup(initialCode);
    }
  }, [open, initialCode, runLookup]);

  // Live auto-refresh every 8 seconds while watching an order
  useEffect(() => {
    if (!open || !order?.id) return;
    const timer = setInterval(() => {
      runLookup(order.id, true);
    }, 8000);
    return () => clearInterval(timer);
  }, [open, order?.id, runLookup]);

  if (!open) return null;

  const currentIdx = order
    ? ORDER_STEPS.findIndex((s) => s.key === order.status)
    : -1;
  const progress =
    order?.status === 'finish' || order?.status === 'versendet'
      ? 100
      : Math.max(0, Math.min(100, Number(order?.progress ?? 0)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#111318] border border-white/[0.12] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#0C0E13] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PackageSearch className="w-5 h-5 text-[#38BDF8]" />
            <h2 className="font-display text-lg font-bold text-white">
              Live 3D-Druck Status
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E95A5] hover:text-white hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runLookup(code);
            }}
            className="flex gap-2"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Bestellnummer eingeben (z.B. ANO-2026-4819)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.12] focus:border-[#FF5500] focus:outline-none font-mono text-sm text-white uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white font-semibold text-sm cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Suchen</span>
            </button>
          </form>

          {!order && (
            <p className="text-xs text-[#8E95A5]">
              Gib einfach deinen Bestell-Code (z. B. <span className="font-mono text-white">ANO-2026-…</span>) ein, um den aktuellen Druckstatus live zu sehen.
            </p>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/35 text-red-300 text-xs">
              {error}
            </div>
          )}

          {order && (
            <div className="space-y-5 pt-1">
              <div className="p-4 rounded-xl bg-[#0C0E13] border border-white/[0.08] flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] text-[#7D8596] flex items-center gap-2">
                    <span>AUFTRAGSNUMMER</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <div className="font-mono text-lg font-bold text-[#FF7326]">{order.id}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => runLookup(order.id)}
                    className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-[#9DA4B4] hover:text-white cursor-pointer"
                    title="Jetzt aktualisieren"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <div className="text-right">
                    <div className="font-mono text-[10px] text-[#7D8596]">GESAMT</div>
                    <div className="font-mono text-base font-bold text-white">
                      {formatEUR(order.total)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Print Progress Bar */}
              {(order.status === 'im_druck' || progress > 0) && (
                <div className="p-4 rounded-xl bg-[#141720] border border-[#FF5500]/35 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#D0D5DF] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FF5500] nozzle-pulse" />
                      Druckfortschritt
                    </span>
                    <span className="text-[#FF7326] font-bold text-sm">{progress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF5500] via-[#FF7A26] to-[#38BDF8] transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Exact Slicer Print Info (when attached by Creator) */}
              {order.slicerMeta && (
                <div className="p-3.5 rounded-xl bg-[#0C0E13] border border-[#38BDF8]/30 space-y-2">
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[#38BDF8] uppercase">
                    <span>Druckdaten aus Slicer</span>
                    {order.slicerMeta.slicerName && <span>{order.slicerMeta.slicerName}</span>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    {order.slicerMeta.printTimeLabel && (
                      <div className="p-2 rounded-lg bg-[#141720]">
                        <div className="text-[10px] text-[#7D8596] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#38BDF8]" /> Druckdauer
                        </div>
                        <div className="text-white font-semibold mt-0.5">
                          {order.slicerMeta.printTimeLabel}
                        </div>
                      </div>
                    )}
                    {order.slicerMeta.weightGrams > 0 && (
                      <div className="p-2 rounded-lg bg-[#141720]">
                        <div className="text-[10px] text-[#7D8596] flex items-center gap-1">
                          <Scale className="w-3 h-3 text-[#FF5500]" /> Filament
                        </div>
                        <div className="text-white font-semibold mt-0.5">
                          {Math.round(order.slicerMeta.weightGrams)} g PLA
                        </div>
                      </div>
                    )}
                    {order.slicerMeta.layerHeight && (
                      <div className="p-2 rounded-lg bg-[#141720]">
                        <div className="text-[10px] text-[#7D8596] flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[#FF5500]" /> Schicht
                        </div>
                        <div className="text-white font-semibold mt-0.5">
                          {order.slicerMeta.layerHeight}
                        </div>
                      </div>
                    )}
                    {order.slicerMeta.printerModel && (
                      <div className="p-2 rounded-lg bg-[#141720]">
                        <div className="text-[10px] text-[#7D8596] flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-[#38BDF8]" /> Drucker
                        </div>
                        <div className="text-white font-semibold mt-0.5 truncate">
                          {order.slicerMeta.printerModel}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5-Stage Print Pipeline */}
              <div className="space-y-2.5">
                {ORDER_STEPS.map((st, idx) => {
                  const done = idx <= currentIdx;
                  const active = idx === currentIdx;
                  return (
                    <div
                      key={st.key}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all ${
                        active
                          ? 'bg-[#FF5500]/12 border-[#FF5500]/60'
                          : done
                          ? 'bg-[#141822] border-white/[0.08]'
                          : 'bg-[#0C0E13] border-white/[0.04] opacity-50'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2
                          className={`w-5 h-5 shrink-0 ${
                            active ? 'text-[#FF5500]' : 'text-emerald-400'
                          }`}
                        />
                      ) : (
                        <Circle className="w-5 h-5 shrink-0 text-[#525A6B]" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>{st.label}</span>
                          {active && (
                            <span className="px-2 py-0.5 rounded bg-[#FF5500] text-[10px] font-mono uppercase">
                              Aktuell
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#8E95A5]">{st.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ordered Items */}
              <div className="space-y-2">
                <div className="font-mono text-[11px] uppercase text-[#7D8596]">
                  Enthaltene 3D-Drucke
                </div>
                {order.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.06]"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-11 h-11 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {item.quantity}× {item.title}
                      </div>
                      <div className="text-xs text-[#8E95A5] flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ background: item.colorHex }}
                        />
                        {item.colorName} • {item.sizeOption}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
