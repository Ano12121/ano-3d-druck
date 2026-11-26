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
  Truck,
  PackageSearch,
  Copy,
  Check,
  CreditCard,
  Mail,
} from 'lucide-react';
import { formatEUR } from '../data/filaments';
import { createOrder } from '../api';

export default function CartDrawer({
  open,
  cart,
  stripeConfigured,
  onClose,
  onUpdateQty,
  onRemove,
  onClearCart,
  onOrderCreated,
  onTrackOrder,
  onOpenLegal,
}) {
  const [step, setStep] = useState('cart'); // cart | checkout | success
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    street: '',
    postalCode: '',
    city: '',
    notes: '',
    paymentMethod: 'Stripe (Karte / Apple Pay)',
  });

  if (!open) return null;

  const subtotal =
    Math.round(
      cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100
    ) / 100;
  const freeShippingThreshold = 50;
  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 4.9;
  const total = Math.round((subtotal + shipping) * 100) / 100;
  const remainingForFree = Math.max(0, freeShippingThreshold - subtotal);

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
          email: form.email,
          street: form.street,
          postalCode: form.postalCode,
          city: form.city,
          notes: form.notes,
        },
        paymentMethod: form.paymentMethod,
        items: cart,
      });

      const createdOrder = result.order || result;
      onOrderCreated(createdOrder);

      if (result.checkoutUrl) {
        onClearCart();
        window.location.href = result.checkoutUrl;
        return;
      }

      setConfirmedOrder(createdOrder);
      onClearCart();
      setStep('success');
    } catch (err) {
      setError(err.message || 'Bestellung konnte nicht abgeschlossen werden.');
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
              {step === 'checkout' && 'Bestellung abschließen'}
              {step === 'success' && 'Druckauftrag erhalten!'}
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
            {cart.length > 0 && (
              <div className="px-5 py-3 bg-[#141720] border-b border-white/[0.07]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[#D0D5DF]">
                    <Truck className="w-3.5 h-3.5 text-[#38BDF8]" />
                    {remainingForFree > 0 ? (
                      <>
                        Noch{' '}
                        <strong className="font-mono text-white">
                          {formatEUR(remainingForFree)}
                        </strong>{' '}
                        bis kostenloser Versand
                      </>
                    ) : (
                      <span className="text-emerald-400 font-medium">
                        Kostenloser Versand freigeschaltet!
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF5500] to-emerald-400 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-[#151822] border border-white/[0.08] flex items-center justify-center mb-4">
                    <ShoppingBag className="w-7 h-7 text-[#6E7687]" />
                  </div>
                  <p className="font-display text-lg font-semibold text-white">
                    Noch nichts auf dem Druckbett
                  </p>
                  <p className="text-sm text-[#8E95A5] mt-1 max-w-xs">
                    Stöbere durch die 3D-Kreationen, wähle deine Lieblingsfarbe und pack sie in den Korb.
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
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#9DA4B4]">
                    <span>Zwischensumme</span>
                    <span className="font-mono text-white">{formatEUR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#9DA4B4]">
                    <span>Versand (DHL Paket)</span>
                    <span className="font-mono text-white">
                      {shipping === 0 ? 'Kostenlos' : formatEUR(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/[0.08]">
                    <span>Gesamt</span>
                    <span className="font-mono text-[#FF7326]">{formatEUR(total)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setStep('checkout')}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white font-semibold text-sm shadow-[0_8px_28px_rgba(255,85,0,0.28)] transition-all cursor-pointer"
                >
                  <span>Weiter zur Kasse</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: CHECKOUT FORM */}
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
                  Vor- und Nachname *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Max Mustermann"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  E-Mail-Adresse (für Bestellbestätigung & Updates) *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="max@beispiel.de"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Straße & Hausnummer *
                </label>
                <input
                  required
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  placeholder="Musterstraße 42"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">PLZ *</label>
                  <input
                    required
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    placeholder="50674"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">Stadt *</label>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Köln"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-[#9DA4B4]">Zahlungsart</label>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      stripeConfigured
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-[#38BDF8]/15 text-[#38BDF8]'
                    }`}
                  >
                    {stripeConfigured ? 'Stripe Live aktiv' : 'Stripe-Ready Modus'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Stripe (Karte / Apple Pay)',
                    'PayPal',
                    'Überweisung / SEPA',
                    'Bar bei Abholung',
                  ].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: method })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        form.paymentMethod === method
                          ? 'bg-[#1D2230] border-[#FF5500] text-white'
                          : 'bg-[#151822] border-white/[0.08] text-[#9DA4B4]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Notiz ans 3D-Druck Studio (optional)
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="z.B. Farbkombination, Namensgravur oder Geschenk-Hinweis..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#151822] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white resize-none"
                />
              </div>
            </div>

            <div className="p-5 bg-[#12151D] border-t border-white/[0.08] space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#9DA4B4]">Gesamtsumme ({cart.length} Positionen)</span>
                <span className="font-mono text-lg font-bold text-[#FF7326]">
                  {formatEUR(total)}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_8px_28px_rgba(255,85,0,0.3)] transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Wird übermittelt...'
                    : stripeConfigured && form.paymentMethod.includes('Stripe')
                    ? `Weiter zu Stripe • ${formatEUR(total)}`
                    : `Verbindlich bestellen • ${formatEUR(total)}`}
                </span>
              </button>
              <p className="text-[11px] text-center text-[#7D8596]">
                Mit deiner Bestellung akzeptierst du unsere{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal?.('agb')}
                  className="underline hover:text-white cursor-pointer"
                >
                  AGB
                </button>{' '}
                &{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal?.('widerruf')}
                  className="underline hover:text-white cursor-pointer"
                >
                  Widerrufs-Infos
                </button>
                .
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
                Deine Bestellung ist im Studio eingegangen und wartet jetzt auf das Slicing.
              </p>
            </div>

            <div className="w-full p-4 rounded-xl bg-[#141720] border border-white/[0.1] space-y-2">
              <div className="font-mono text-[11px] text-[#7D8596] uppercase">
                Dein Live-Tracking-Code
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
                Gesamtbetrag:{' '}
                <strong className="font-mono text-white">{formatEUR(confirmedOrder.total)}</strong> •{' '}
                {confirmedOrder.paymentMethod}
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-[#38BDF8] pt-1">
                <Mail className="w-3.5 h-3.5" />
                <span>Bestätigungs-E-Mail an {confirmedOrder.customer?.email} erstellt</span>
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
                <span>Druckstatus live verfolgen</span>
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
