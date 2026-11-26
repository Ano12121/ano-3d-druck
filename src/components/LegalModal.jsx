import React from 'react';
import { X, Scale, FileText, RotateCcw, Shield } from 'lucide-react';

export default function LegalModal({ activeTab, studio, onChangeTab, onClose }) {
  if (!activeTab) return null;

  const legal = studio?.legal || {};
  const brand = studio?.brandName || 'LAYERLAB';

  const tabs = [
    { id: 'impressum', label: 'Impressum', icon: Scale },
    { id: 'agb', label: 'AGB', icon: FileText },
    { id: 'widerruf', label: 'Widerruf', icon: RotateCcw },
    { id: 'datenschutz', label: 'Datenschutz', icon: Shield },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl bg-[#111318] border border-white/[0.12] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#0C0E13] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => onChangeTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-[#FF5500] text-white'
                      : 'bg-white/[0.05] text-[#9DA4B4] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E95A5] hover:text-white hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-[#B8BFCE] leading-relaxed">
          <div className="p-3 rounded-xl bg-[#FF5500]/10 border border-[#FF5500]/30 text-xs text-[#FFB38A]">
            Hinweis für Shop-Betreiber: Alle Betreiberdaten kannst du direkt im{' '}
            <strong>Creator Studio → Rechtliches & Drucker</strong> anpassen. Vor dem öffentlichen
            Live-Gang solltest du deine individuellen Rechtstexte kurz rechtlich prüfen lassen.
          </div>

          {activeTab === 'impressum' && (
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-white">Impressum</h2>
              <p>
                <strong className="text-white">Verantwortlicher Anbieter:</strong>
                <br />
                {legal.ownerName || brand}
                <br />
                {legal.street || 'Musterstraße 12'}
                <br />
                {legal.postalCity || '50674 Köln'}
                <br />
                {legal.country || 'Deutschland'}
              </p>
              <p>
                <strong className="text-white">Kontakt:</strong>
                <br />
                E-Mail: {legal.email || 'studio@beispiel.de'}
                <br />
                Telefon: {legal.phone || '+49 170 0000000'}
              </p>
              <p>
                <strong className="text-white">Steuerhinweis:</strong>
                <br />
                {legal.taxNotice || 'Kleinunternehmer-Status gemäß § 19 UStG.'}
              </p>
            </div>
          )}

          {activeTab === 'agb' && (
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-white">
                Allgemeine Geschäftsbedingungen (Kurzübersicht)
              </h2>
              <p>
                <strong className="text-white">1. Geltungsbereich:</strong> Diese Bedingungen gelten
                für alle Bestellungen und individuellen 3D-Druck-Aufträge über den Online-Shop von{' '}
                {brand}.
              </p>
              <p>
                <strong className="text-white">2. Besonderheiten bei 3D-Druck-Erzeugnissen:</strong>{' '}
                Alle Artikel werden im additiven Fertigungsverfahren (FDM / Resin) schichtweise
                hergestellt. Feine, herstellungsbedingte Schichtstrukturen sind ein typisches
                Merkmal echter 3D-Drucke und stellen keinen Mangel dar.
              </p>
              <p>
                <strong className="text-white">3. Preise & Versand:</strong> Versandkostenfreie
                Lieferung ab 50,00 € Bestellwert innerhalb Deutschlands, darunter 4,90 €. Typische
                Fertigungs- und Lieferzeit: {legal.shippingTime || '2–4 Werktage'}.
              </p>
              <p>
                <strong className="text-white">4. Zahlung:</strong> Die Bezahlung erfolgt wahlweise
                über die im Checkout angebotenen Zahlungsmethoden (z. B. Stripe, PayPal oder
                Überweisung).
              </p>
            </div>
          )}

          {activeTab === 'widerruf' && (
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-white">
                Informationen zum Widerrufsrecht
              </h2>
              <p>
                Verbraucher haben bei Standard-Lagerartikeln grundsätzlich ein 14-tägiges
                Widerrufsrecht ab Erhalt der Ware. Zur Ausübung genügt eine kurze Mitteilung per
                E-Mail an <span className="text-white font-mono">{legal.email}</span>.
              </p>
              <p>
                <strong className="text-white">Wichtig bei individuellen Wunschdrucken:</strong> Bei
                Produkten, die speziell nach Kundenvorgabe, eigener hochgeladener 3D-Datei (`.STL`)
                oder persönlicher Individualisierung gefertigt werden, gelten die gesetzlichen
                Ausnahmen für kundenspezifische Anfertigungen.
              </p>
            </div>
          )}

          {activeTab === 'datenschutz' && (
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-white">Datenschutzhinweis</h2>
              <p>
                Wir verarbeiten deine angegebenen Bestell- und Kontaktdaten (Name, Lieferadresse,
                E-Mail-Adresse sowie optional hochgeladene 3D-Dateien und Referenzbilder)
                ausschließlich zur Abwicklung deiner Bestellung, zur Erstellung deines Wunschdrucks
                und für Status-Benachrichtigungen.
              </p>
              <p>
                Bei Wahl von Stripe als Zahlungsdienstleister werden die Zahlungsdaten direkt über
                die verschlüsselte Checkout-Seite von Stripe verarbeitet. Verantwortliche Stelle:
                {' '}
                {legal.ownerName || brand}, {legal.email}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
