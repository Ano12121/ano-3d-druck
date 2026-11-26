import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Circle, PackageSearch } from 'lucide-react';
import { ORDER_STEPS, formatEUR } from '../data/filaments';
import { lookupOrder } from '../api';

export default function OrderTrackerModal({ open, initialCode, onClose }) {
  const [code, setCode] = useState(initialCode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const runLookup = async (targetCode) => {
    const clean = (targetCode || '').trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      const data = await lookupOrder(clean);
      setOrder(data);
    } catch (err) {
      setOrder(null);
      setError(err.message || 'Bestellung nicht gefunden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && initialCode) {
      setCode(initialCode);
      runLookup(initialCode);
    }
  }, [open, initialCode]);

  if (!open) return null;

  const currentIdx = order
    ? ORDER_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#111318] border border-white/[0.12] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#0C0E13] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PackageSearch className="w-5 h-5 text-[#38BDF8]" />
            <h2 className="font-display text-lg font-bold text-white">
              Live 3D-Druck Status tracken
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E95A5] hover:text-white hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
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

          <p className="text-xs text-[#8E95A5]">
            Gib einfach deinen Bestell-Code (z. B. <span className="font-mono text-white">ANO-2026-…</span>) ein, um den aktuellen Druckstatus zu sehen.
          </p>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/35 text-red-300 text-xs">
              {error}
            </div>
          )}

          {order && (
            <div className="space-y-5 pt-2">
              <div className="p-4 rounded-xl bg-[#0C0E13] border border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-[#7D8596]">AUFTRAGSNUMMER</div>
                  <div className="font-mono text-lg font-bold text-[#FF7326]">{order.id}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-[#7D8596]">SUMME</div>
                  <div className="font-mono text-base font-bold text-white">
                    {formatEUR(order.total)}
                  </div>
                </div>
              </div>

              {/* 5-Stage Print Pipeline */}
              <div className="space-y-3">
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
