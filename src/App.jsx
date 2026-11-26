import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Box,
  Upload,
  Sparkles,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { CATEGORIES, getFilamentById } from './data/filaments';
import {
  fetchBootstrap,
  fetchAdminDashboard,
  likeProduct,
  verifyStripeOrder,
} from './api';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CartDrawer from './components/CartDrawer';
import FilamentShowcase from './components/FilamentShowcase';
import CustomPrintSection from './components/CustomPrintSection';
import OrderTrackerModal from './components/OrderTrackerModal';
import CreatorStudioModal from './components/CreatorStudioModal';
import LegalModal from './components/LegalModal';

export default function App() {
  const [studio, setStudio] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [emailLog, setEmailLog] = useState([]);
  const [studioPhotos, setStudioPhotos] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [isDefaultPin, setIsDefaultPin] = useState(true);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [lanUrls, setLanUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState('Alle');
  const [activeColorFilter, setActiveColorFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerCode, setTrackerCode] = useState('');
  const [legalTab, setLegalTab] = useState(null);

  // Persisted Local State (Cart & Likes)
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('layerlab_cart') || '[]');
    } catch {
      return [];
    }
  });
  const [likedIds, setLikedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('layerlab_likes') || '[]');
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  };

  const loadData = async () => {
    try {
      const data = await fetchBootstrap();
      setStudio(data.studio);
      setProducts(data.products || []);
      setAuthenticated(Boolean(data.authenticated));
      setIsDefaultPin(Boolean(data.isDefaultPin));
      setStripeConfigured(Boolean(data.stripeConfigured));
      setSmtpConfigured(Boolean(data.smtpConfigured));
      setGeminiConfigured(Boolean(data.geminiConfigured));
      setLanUrls(data.lanUrls || []);
      setOrders(data.orders || []);
      setInquiries(data.inquiries || []);
      setEmailLog(data.emailLog || []);
      setStudioPhotos(data.studioPhotos || []);
    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthChange = async (isAuthed) => {
    setAuthenticated(isAuthed);
    if (isAuthed) {
      try {
        const dash = await fetchAdminDashboard();
        setStudio(dash.studio);
        setProducts(dash.products || []);
        setOrders(dash.orders || []);
        setInquiries(dash.inquiries || []);
        setEmailLog(dash.emailLog || []);
        setStudioPhotos(dash.studioPhotos || []);
        setGeminiConfigured(Boolean(dash.geminiConfigured));
        setLanUrls(dash.lanUrls || []);
        setIsDefaultPin(Boolean(dash.isDefaultPin));
      } catch {
        setAuthenticated(false);
      }
    } else {
      setOrders([]);
      setInquiries([]);
      setEmailLog([]);
      setStudioPhotos([]);
      setLanUrls([]);
    }
  };

  useEffect(() => {
    loadData();

    // Handle Stripe redirect return
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') === '1' && params.get('order_id')) {
      const orderId = params.get('order_id');
      const sessionId = params.get('session_id');
      verifyStripeOrder(orderId, sessionId)
        .then(() => {
          showToast(`Stripe-Zahlung erfolgreich! Auftrag ${orderId} ist bestätigt.`);
          setTrackerCode(orderId);
          setTrackerOpen(true);
        })
        .catch(() => {})
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname);
        });
    } else if (params.get('stripe_cancel') === '1') {
      showToast('Stripe-Zahlung abgebrochen.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('layerlab_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('layerlab_likes', JSON.stringify(likedIds));
  }, [likedIds]);

  const handleAddToCart = (item) => {
    const cartKey = `${item.productId}__${item.colorId}__${item.sizeOption}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.cartKey === cartKey);
      if (existing) {
        return prev.map((c) =>
          c.cartKey === cartKey
            ? { ...c, quantity: c.quantity + (item.quantity || 1) }
            : c
        );
      }
      return [...prev, { ...item, cartKey, quantity: item.quantity || 1 }];
    });
    showToast(`"${item.title}" (${item.colorName}) in den Warenkorb gelegt!`);
    setCartOpen(true);
  };

  const handleQuickAdd = (product, filament) => {
    handleAddToCart({
      productId: product.id,
      title: product.title,
      image: product.images?.[0] || '',
      colorId: filament.id,
      colorName: filament.name,
      colorHex: filament.swatch || filament.hex,
      sizeOption: 'Standard (100%)',
      quantity: 1,
      unitPrice: product.price,
    });
  };

  const handleUpdateQty = (cartKey, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.cartKey !== cartKey));
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.cartKey === cartKey ? { ...c, quantity: qty } : c))
    );
  };

  const handleRemoveFromCart = (cartKey) => {
    setCart((prev) => prev.filter((c) => c.cartKey !== cartKey));
  };

  const handleLike = async (productId) => {
    if (likedIds.includes(productId)) return;
    setLikedIds((prev) => [...prev, productId]);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, likes: (p.likes || 0) + 1 } : p
      )
    );
    if (selectedProduct?.id === productId) {
      setSelectedProduct((prev) => ({ ...prev, likes: (prev.likes || 0) + 1 }));
    }
    try {
      await likeProduct(productId);
    } catch {
      // optimistic UI stays intact
    }
  };

  const featuredProducts = useMemo(
    () => products.filter((p) => p.published !== false && p.featured),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.published !== false);

    if (activeCategory !== 'Alle') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (activeColorFilter) {
      list = list.filter((p) => (p.colors || []).includes(activeColorFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.subtitle || '').toLowerCase().includes(q) ||
          (p.material || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'popular') {
      list = [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    return list;
  }, [products, activeCategory, activeColorFilter, searchQuery, sortBy]);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const pendingAdminCount =
    orders.filter((o) => o.status !== 'versendet').length +
    inquiries.filter((i) => i.status === 'offen').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#090A0D] text-[#F4F4F0]">
      <Navbar
        studio={studio}
        authenticated={authenticated}
        cartCount={cartCount}
        pendingAdminCount={pendingAdminCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenStudio={() => setStudioOpen(true)}
        onOpenTracker={() => {
          setTrackerCode('');
          setTrackerOpen(true);
        }}
      />

      <main className="flex-1">
        <Hero
          studio={studio}
          featuredProducts={featuredProducts.length ? featuredProducts : products.slice(0, 3)}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onOpenStudio={() => setStudioOpen(true)}
        />

        {/* SHOP / CREATIONS GALLERY */}
        <section id="shop" className="py-18 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-9">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-xs text-[#FF7326] uppercase tracking-widest mb-2">
                <Layers className="w-4 h-4" />
                <span>STUDIO KATALOG // KREATIONEN</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                Frisch vom Druckbett
              </h2>
              <p className="text-sm sm:text-base text-[#9DA4B4] mt-1.5">
                Entdecke jedes Design in 3D, wähle dein Lieblings-Filament & bestelle direkt vom Drucker.
              </p>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="w-4 h-4 text-[#7D8596] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suche z.B. Lampe, Carbon, Drache..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#12151D] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-xs sm:text-sm text-white"
                />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#12151D] border border-white/[0.1]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#8E95A5]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="featured" className="bg-[#12151D]">
                    Empfohlen
                  </option>
                  <option value="popular" className="bg-[#12151D]">
                    Beliebteste
                  </option>
                  <option value="price-asc" className="bg-[#12151D]">
                    Preis aufsteigend
                  </option>
                  <option value="price-desc" className="bg-[#12151D]">
                    Preis absteigend
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filter Pills + Active Color Filter Tag */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-[#FF5500] text-white shadow-[0_6px_20px_rgba(255,85,0,0.3)]'
                      : 'bg-[#12151D] text-[#A5ACB8] hover:text-white border border-white/[0.08]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {activeColorFilter && (
              <button
                onClick={() => setActiveColorFilter(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A1F2B] border border-[#FF5500]/50 text-xs font-mono text-white cursor-pointer"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    background:
                      getFilamentById(activeColorFilter).swatch ||
                      getFilamentById(activeColorFilter).hex,
                  }}
                />
                <span>Farbe: {getFilamentById(activeColorFilter).name}</span>
                <span className="text-[#FF7326]">✕</span>
              </button>
            )}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-96 rounded-2xl bg-[#111318] border border-white/[0.06] animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-14 text-center rounded-2xl bg-[#111318] border border-white/[0.08] space-y-3">
              <p className="font-display text-xl font-semibold text-white">
                Keine passende 3D-Kreation gefunden
              </p>
              <p className="text-sm text-[#8E95A5]">
                Setze die Filter zurück oder lade deine eigene neue Kreation im Creator Studio hoch!
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveCategory('Alle');
                    setActiveColorFilter(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white cursor-pointer"
                >
                  Filter zurücksetzen
                </button>
                <button
                  onClick={() => setStudioOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF5500] text-xs font-semibold text-white cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Neue Kreation hochladen</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  liked={likedIds.includes(product.id)}
                  onLike={handleLike}
                  onSelect={(p) => setSelectedProduct(p)}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          )}

          {/* Trust & Quality Strip */}
          <div className="grid sm:grid-cols-3 gap-4 mt-14">
            {[
              {
                icon: Box,
                title: 'Interaktive 3D-Vorschau',
                desc: 'Drehe Kreationen & eigene .STL-Dateien direkt im Browser und teste alle Filament-Farben live.',
              },
              {
                icon: Sparkles,
                title: 'Wunschfarben & Custom-Sizes',
                desc: 'Wähle aus Matt-Schwarz, Matt-Weiß, Rot-Schwarz Mix, Galaxy Blau-Lila & Pink oder skaliere auf Large (+25%).',
              },
              {
                icon: Truck,
                title: 'Bruchsicher & Schnell versendet',
                desc: 'Live-Druckstatus per Code, automatische Status-E-Mails & kostenloser Versand ab 50€.',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-5 rounded-2xl bg-[#111318] border border-white/[0.08] flex gap-4 items-start"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FF5500]/12 border border-[#FF5500]/30 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#FF5500]" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white text-sm">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-[#8E95A5] mt-1 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FILAMENT SHOWCASE */}
        <FilamentShowcase
          activeColorFilter={activeColorFilter}
          onSelectColorFilter={(cid) => {
            setActiveColorFilter(cid);
            if (cid) {
              document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* LIVE STL CALCULATOR & WUNSCHDRUCK SECTION */}
        <CustomPrintSection
          onInquiryCreated={(inq) => {
            if (authenticated) {
              setInquiries((prev) => [inq, ...prev]);
            }
            showToast(`Wunschdruck-Anfrage ${inq.id} erfolgreich gesendet!`);
          }}
        />
      </main>

      {/* FOOTER WITH LEGAL LINKS */}
      <footer className="bg-[#0B0C10] border-t border-white/[0.08] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FF5500] flex items-center justify-center">
                <Box className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-lg tracking-wider text-white">
                {studio?.brandName || 'LAYERLAB'}
              </span>
            </div>
            <p className="text-xs text-[#7D8596] max-w-md">
              Unabhängiges 3D-Druck Studio. Jedes Produkt wird Schicht für Schicht mit Liebe zum
              Detail gefertigt — lokal, individuell & direkt vom Druckbett.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-[#8E95A5]">
            <button
              onClick={() => setLegalTab('impressum')}
              className="hover:text-white cursor-pointer"
            >
              Impressum
            </button>
            <button
              onClick={() => setLegalTab('agb')}
              className="hover:text-white cursor-pointer"
            >
              AGB
            </button>
            <button
              onClick={() => setLegalTab('widerruf')}
              className="hover:text-white cursor-pointer"
            >
              Widerruf
            </button>
            <button
              onClick={() => setLegalTab('datenschutz')}
              className="hover:text-white cursor-pointer"
            >
              Datenschutz
            </button>
            <button
              onClick={() => setTrackerOpen(true)}
              className="hover:text-white cursor-pointer"
            >
              Auftrag tracken
            </button>
            <button
              onClick={() => setStudioOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:text-white border border-white/[0.08] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Creator Studio</span>
            </button>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Stripe & SSL ready
            </span>
          </div>
        </div>
      </footer>

      {/* MODALS & DRAWERS */}
      <ProductModal
        product={selectedProduct}
        liked={selectedProduct ? likedIds.includes(selectedProduct.id) : false}
        onLike={handleLike}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        stripeConfigured={stripeConfigured}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemove={handleRemoveFromCart}
        onClearCart={() => setCart([])}
        onOrderCreated={(newOrder) => {
          if (authenticated) {
            setOrders((prev) => [newOrder, ...prev]);
          }
          loadData();
        }}
        onTrackOrder={(code) => {
          setTrackerCode(code);
          setTrackerOpen(true);
        }}
        onOpenLegal={(tab) => setLegalTab(tab)}
      />

      <OrderTrackerModal
        open={trackerOpen}
        initialCode={trackerCode}
        onClose={() => setTrackerOpen(false)}
      />

      <CreatorStudioModal
        open={studioOpen}
        authenticated={authenticated}
        isDefaultPin={isDefaultPin}
        stripeConfigured={stripeConfigured}
        smtpConfigured={smtpConfigured}
        geminiConfigured={geminiConfigured}
        lanUrls={lanUrls}
        studio={studio}
        products={products}
        orders={orders}
        inquiries={inquiries}
        emailLog={emailLog}
        studioPhotos={studioPhotos}
        onClose={() => setStudioOpen(false)}
        onAuthChange={handleAuthChange}
        onRefresh={loadData}
        onShowToast={showToast}
      />

      <LegalModal
        activeTab={legalTab}
        studio={studio}
        onChangeTab={(t) => setLegalTab(t)}
        onClose={() => setLegalTab(null)}
      />

      {/* Floating Toast Notification (bottom-left so it never overlaps right Cart Drawer) */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#161A24] border border-[#FF5500]/60 text-white text-sm shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-[#FF5500] shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
