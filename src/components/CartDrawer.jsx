import React, { useState } from 'react';
import {
  X,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  PackageSearch,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { formatEUR } from '../data/filaments';
import { createOrder } from '../api';

export default function CartDrawer({
  open,
  cart,
  onClose,
  onUpdateQty,
  onRemove,
  onClearCart,
  onOrderCreated,
  onTrackOrder,
}) {
  const [step, setStep] = useState('cart'); // cart | checkout | success
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: '',
    contact: '',
    deliveryMode: 'Abholung / Übergabe',
    street: '',
    postalCode: '',
    city: '',
    notes: '',
  });

  if (!open) return null;

  const subtotal =
    Math.round(
      cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100
    ) / 100;
  const wantsShipping = form.deliveryMode === 'Versand';
  const shipping = wantsShipping ? (subtotal >= 50 ? 0 : 4.9) : 0;
  const total = Math.round((subtotal + shipping) * 100) / 100;

  const handleClose = () => {
    if (step === 'success') {
      setStep('cart');
      setConfirmedOrder(null);
    }
    setError('');
    onClose();
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await createOrder({
        customer: {
          name: form.name,
          contact: form.contact,
          email: form.contact.includes('@') ? form.contact : '',
          deliveryMode: form.deliveryMode,
          street: form.street,
          postalCode: form.postalCode,
          city: form.city,
          notes: form.notes,
        },
        paymentMethod: 'PayPal / Bar',
        items: cart,
      });

      const createdOrder = result.order || result;
      onOrderCreated(createdOrder);
      setConfirmedOrder(createdOrder);
      onClearCart();
      setStep('success');
    } catch (err) {
      setError(err.message || 'Konnte nicht abgeschickt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyOrderCode = () => {
    if (!confirmedOrder?.id) return;
    navigator.clipboard?.writeText(confirmedOrder.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
      onClick={handleClose}
    >
      <aside
        className="w-full max-w-md bg-[#0E1015] border-l border-white/[0.1] h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                onClick={() => setStep('cart')}
                className="p-1.5 rounded-lg text-[#9DA4B4] hover:text-white hover:bg-white/[0.07] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <ShoppingBag className="w-5 h-5 text-[#FF5500]" />
            <h2 className="font-display text-lg font-bold text-white">
              {step === 'cart' && 'Dein Warenkorb'}
              {step === 'checkout' && 'Kurz absenden'}
              {step === 'success' && 'Alles klar!'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#8E95A5] hover:text-white hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: CART */}
        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-[#151822] border border-white/[0.08] flex items-center justify-center mb-4">
                    <ShoppingBag className="w-7 h-7 text-[#6E7687]" />
                  </div>
                  <p className="font-display text-lg font-semibold text-white">
                    Noch nichts im Korb
                  </p>
                  <p className="text-sm text-[#8E95A5] mt-1 max-w-xs">
                    Such dir einfach ein cooles Teil aus und wähle deine PLA-Farbe!
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.cartKey}
                    className="flex gap-3.5 p-3 rounded-xl bg-[#141720] border border-white/[0.07]"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-20 h-20 rounded-lg object-cover bg-[#090A0D] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-semibold text-white truncate">
                          {item.title}
                        </h3>
                        <button
                          onClick={() => onRemove(item.cartKey)}
                          className="text-[#6E7687] hover:text-red-400 transition-colors cursor-pointer"
                          aria-label="Entfernen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 text-xs text-[#9DA4B4]">
                        <span
                          className="w-3 h-3 rounded-full border border-white/30"
                          style={{ background: item.colorHex }}
                        />
                        <span>{item.colorName}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{item.sizeOption}</span>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="inline-flex items-center rounded-lg bg-[#0D0F14] border border-white/[0.08]">
                          <button
                            onClick={() => onUpdateQty(item.cartKey, item.quantity - 1)}
                            className="p-1.5 text-[#9DA4B4] hover:text-white cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQty(item.cartKey, item.quantity + 1)}
                            className="p-1.5 text-[#9DA4B4] hover:text-white cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-bold text-white">
                          {formatEUR(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 bg-[#12151D] border-t border-white/[0.08] space-y-3">
                <div className="flex justify-between text-base font-bold text-white">
                  <span>Gesamt</span>
                  <span className="font-mono text-[#FF7326]">{formatEUR(subtotal)}</span>
                </div>
                <button
                  onClick={() => setStep('checkout')}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white font-semibold text-sm shadow-[0_8px_28px_rgba(255,85,0,0.28)] transition-all cursor-pointer"
                >
                  <span>Weiter</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: SUPER SIMPLE CHECKOUT FOR FRIENDS */}
        {step === 'checkout' && (
          <form onSubmit={handleCheckoutSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Dein Name *
                </label>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="z.B. Max"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  WhatsApp / Insta / E-Mail (optional)
                </label>
                <input
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  placeholder="damit ich Bescheid sagen kann"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Übergabe oder Versand?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Abholung / Übergabe', 'Versand'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm({ ...form, deliveryMode: mode })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                        form.deliveryMode === mode
                          ? 'bg-[#1D2230] border-[#FF5500] text-white'
                          : 'bg-[#151822] border-white/[0.08] text-[#9DA4B4]'
                      }`}
                    >
                      {mode === 'Versand' ? 'Versand (+4,90 €)' : 'Übergabe / Abholen'}
                    </button>
                  ))}
                </div>
              </div>

              {wantsShipping && (
                <div className="space-y-3 p-3.5 rounded-xl bg-[#13161F] border border-white/[0.08]">
                  <input
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    placeholder="Straße & Hausnummer"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] text-sm text-white"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={form.postalCode}
                      onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      placeholder="PLZ"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] text-sm text-white"
                    />
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Stadt"
                      className="col-span-2 w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] text-sm text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Kurze Notiz (optional)
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="z.B. Bring einfach am Wochenende mit!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white resize-none"
                />
              </div>
            </div>

            <div className="p-5 bg-[#12151D] border-t border-white/[0.08] space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#9DA4B4]">
                  Gesamt ({wantsShipping ? 'inkl. Versand' : 'Übergabe'})
                </span>
                <span className="font-mono text-lg font-bold text-[#FF7326]">
                  {formatEUR(total)}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_8px_28px_rgba(255,85,0,0.3)] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting ? 'Wird gesendet...' : `Bestellen • ${formatEUR(total)}`}
                </span>
              </button>
              <p className="text-[11px] text-center text-[#7D8596]">
                Bezahlung klären wir ganz entspannt per PayPal oder bar.
              </p>
            </div>
          </form>
        )}

        {/* STEP 3: ORDER CONFIRMED */}
        {step === 'success' && confirmedOrder && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-white">
                Danke, {confirmedOrder.customer?.name}!
              </h3>
              <p className="text-sm text-[#9DA4B4] mt-1.5">
                Deine Bestellung ist bei mir gelandet — ich werf den Drucker an!
              </p>
            </div>

            <div className="w-full p-4 rounded-xl bg-[#141720] border border-white/[0.1] space-y-2">
              <div className="font-mono text-[11px] text-[#7D8596] uppercase">
                Dein Druck-Status-Code
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xl font-bold text-[#FF7326] tracking-wider">
                  {confirmedOrder.id}
                </span>
                <button
                  onClick={copyOrderCode}
                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white cursor-pointer"
                  title="Code kopieren"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-xs text-[#8E95A5]">
                Gesamt: <strong className="font-mono text-white">{formatEUR(confirmedOrder.total)}</strong>
              </div>
            </div>

            <div className="w-full space-y-2.5 pt-2">
              <button
                onClick={() => {
                  const id = confirmedOrder.id;
                  handleClose();
                  onTrackOrder(id);
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white font-semibold text-sm cursor-pointer"
              >
                <PackageSearch className="w-4 h-4" />
                <span>Druckstatus checken</span>
              </button>
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 rounded-xl bg-[#161A24] hover:bg-[#1E2330] text-sm font-medium text-white border border-white/[0.08] cursor-pointer"
              >
                Zurück zum Shop
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
