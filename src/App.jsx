import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  LayoutList,
  Grid,
  Play,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { getImageUrl, getMediaUrl } from './lib/githubMedia.jsx';
import iconoUrl from './icono.png?url';

const App = () => {
  const [peces, setPeces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [cliente, setCliente] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [viewMode, setViewMode] = useState('grid');
  const [selectedPez, setSelectedPez] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    fetchPeces();
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem('ecopia-cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('ecopia-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setVisibleCount((prev) => prev + 8);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loading]);

  const fetchPeces = async () => {
    setLoading(true);
    try {
      const [{ data: pecesData, error: pecesError }, { data: catalogoData, error: catalogoError }] = await Promise.all([
        supabase
          .from('peces')
          .select('id, nombre_comun, nombre_cientifico, clasificacion, descripcion, imagen_url, video_url, estado, eliminado, created_at')
          .eq('eliminado', false)
          .eq('estado', 'Activo')
          .order('nombre_comun'),
        supabase
          .from('catalogo_productos_proveedor')
          .select('*, pez:peces(nombre_comun), proveedor:proveedores(nombre_completo)')
          .eq('eliminado', false)
          .eq('disponibilidad', 'Disponible')
      ]);
      
      if (pecesError) throw pecesError;
      if (catalogoError) throw catalogoError;
      
      const pecesWithPrices = (pecesData || []).map(pez => {
        const catalogoItem = catalogoData?.find(c => c.pez?.nombre_comun === pez.nombre_comun && c.proveedor?.nombre_completo === 'Ecopia');
        return {
          ...pez,
          precio: catalogoItem?.precio_unitario || null,
          imagen_url: pez.imagen_url || '',
          video_url: pez.video_url || ''
        };
      });
      
      setPeces(pecesWithPrices);
    } catch (err) {
      console.error('Error fetching peces:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPeces = peces.filter(p => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = p.nombre_comun?.toLowerCase().includes(search) || 
                      p.nombre_cientifico?.toLowerCase().includes(search) ||
                      p.clasificacion?.toLowerCase().includes(search);
    const matchesCategory = selectedCategory === 'all' || p.clasificacion === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(peces.map(p => p.clasificacion).filter(Boolean))];

  const addToCart = (pez) => {
    const existing = cart.find(item => item.id === pez.id);
    if (existing) {
      setCart(cart.map(item => item.id === pez.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...pez, quantity: 1, price: getPrice(pez) }]);
    }
  };

  const getPrice = (pez) => {
    return parseFloat(pez.precio) || 50;
  };

  const removeFromCart = (pezId) => {
    setCart(cart.filter(item => item.id !== pezId));
  };

  const updateQuantity = (pezId, delta) => {
    setCart(cart.map(item => {
      if (item.id === pezId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = async () => {
    try {
      const numeroPedido = `PED-${Date.now()}`;
      const { data: pedido, error: pedidoErr } = await supabase
        .from('pedidos')
        .insert([{
          numero_pedido: numeroPedido,
          tipo_pedido: 'Especial',
          estado: 'Pendiente',
          total: cartTotal,
          notas: `Pedido desde Ecopia - Cliente: ${cliente.nombre}`
        }])
        .select()
        .single();
      if (pedidoErr) throw pedidoErr;

      setOrderPlaced(numeroPedido);
      setCheckoutStep('success');
      setCart([]);
      localStorage.removeItem('ecopia-cart');
    } catch (err) {
      console.error('Error placing order:', err);
    }
  };

  const Carousel = ({ pez }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const imagenUrl = (pez && pez.imagen_url) || '';
    const videoUrl = (pez && pez.video_url) || '';
    const images = imagenUrl ? imagenUrl.split(',').map(s => s.trim()).filter(Boolean) : [];
    const hasVideo = videoUrl && videoUrl.length > 0;
    const allMedia = hasVideo 
      ? [{ type: 'video', url: videoUrl }, ...images.map(url => ({ type: 'image', url }))]
      : images.map(url => ({ type: 'image', url }));
    
    const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % allMedia.length);
    const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);

    if (allMedia.length === 0 || !allMedia[0]?.url) {
      return (
        <div className="h-64 sm:h-96 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
          <div className="text-center">
            <img src={iconoUrl} alt="Ecopia" className="w-16 h-16 mx-auto mb-4" />
            <p className="text-slate-400">Sin imágenes disponibles</p>
          </div>
        </div>
      );
    }

    const currentMedia = allMedia[currentImageIndex];
    const rawUrl = currentMedia?.url || '';
    const mediaSrc = getMediaUrl(rawUrl);

    return (
      <div className="relative">
        <div className="h-64 sm:h-96 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden">
          {currentMedia?.type === 'video' ? (
            <video width="100%" height="auto" controls className="max-h-full max-w-full" src={mediaSrc}>
              Tu navegador no soporta el elemento de video.
            </video>
          ) : (
            <img
              src={mediaSrc}
              alt={pez.nombre_comun}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
              onError={(e) => { 
                e.target.style.display = 'none'; 
              }}
            />
          )}
          
          {allMedia.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                <ChevronLeft size={24} className="text-white" />
              </button>
              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                <ChevronRight size={24} className="text-white" />
              </button>
            </>
          )}
        </div>
        
        {allMedia.length > 1 && (
          <div className="flex gap-2 p-2 overflow-x-auto bg-slate-900">
            {allMedia.map((media, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                  idx === currentImageIndex ? 'border-emerald-500' : 'border-transparent hover:border-slate-600'
                }`}
              >
                {media.type === 'video' ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Play size={16} className="text-white" />
                  </div>
                ) : (
                  <img
                    src={media.url ? getMediaUrl(media.url) : ''}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ProductCard = ({ pez, onClick }) => {
    const imagenUrl = pez?.imagen_url || '';
    const images = imagenUrl ? imagenUrl.split(',').map(s => s.trim()).filter(Boolean) : [];
    const firstImage = images?.[0];
    const thumbnail = firstImage ? getImageUrl(firstImage) : null;
    
    return (
      <div onClick={onClick} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer flex flex-col">
        <div className="h-36 sm:h-40 md:h-44 bg-gradient-to-br from-emerald-50 to-teal-100 overflow-hidden">
          {thumbnail && firstImage ? (
            <img src={thumbnail} alt={pez?.nombre_comun} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img src={iconoUrl} alt="Ecopia" className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>
          )}
        </div>
        <div className="p-2 sm:p-3 md:p-4 flex-1 flex flex-col">
          <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 sm:mt-1 line-clamp-1">{pez.nombre_comun}</h3>
          <p className="text-xs sm:text-xs text-slate-400 italic line-clamp-1">{pez.nombre_cientifico}</p>
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-base sm:text-lg font-bold text-emerald-600">${getPrice(pez)}</span>
            <button
              onClick={(e) => { e.stopPropagation(); addToCart(pez); }}
              className="p-1.5 sm:p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProductTableRow = ({ pez, onClick }) => {
    const imagenUrl = pez?.imagen_url || '';
    const images = imagenUrl ? imagenUrl.split(',').map(s => s.trim()).filter(Boolean) : [];
    const thumbnail = images[0] ? getImageUrl(images[0]) : null;
    
    return (
      <div onClick={onClick} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all cursor-pointer">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
          {thumbnail && images.length > 0 ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <img src={iconoUrl} alt="Ecopia" className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800">{pez.nombre_comun}</h4>
          <p className="text-xs text-slate-400 italic truncate">{pez.nombre_cientifico}</p>
          <span className="text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-emerald-600">${getPrice(pez)}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); addToCart(pez); }}
          className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
    );
  };

  const ProductModal = () => (
    selectedPez && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl overflow-hidden overflow-y-auto relative">
          <Carousel pez={selectedPez} />
          
          <div className="p-6">
            <button onClick={() => setSelectedPez(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full">
              <X size={24} className="text-white" />
            </button>
            
            <span className="text-[10px] font-bold text-emerald-600 uppercase">{selectedPez.clasificacion}</span>
            <h2 className="text-2xl font-bold text-slate-800 mt-1">{selectedPez.nombre_comun}</h2>
            <p className="text-sm text-slate-400 italic">{selectedPez.nombre_cientifico}</p>
            
            <p className="mt-4 text-slate-600">{selectedPez.descripcion}</p>
            
            <div className="flex items-center justify-between mt-6">
              <span className="text-2xl font-bold text-emerald-600">${getPrice(selectedPez)}</span>
              <button
                onClick={() => addToCart(selectedPez)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                <ShoppingCart size={20} /> Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const CartDrawer = () => (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${showCart ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-emerald-600">Carrito ({cartCount})</h2>
          <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ShoppingCart size={48} className="mx-auto mb-2 opacity-30" />
              <p>Tu carrito está vacío</p>
            </div>
          ) : checkoutStep === 'cart' ? (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img src={iconoUrl} alt="Ecopia" className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 text-sm">{item.nombre_comun}</h4>
                    <p className="text-emerald-600 font-bold">${item.price}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-slate-200 rounded hover:bg-slate-300">
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-slate-200 rounded hover:bg-slate-300">
                        <Plus size={14} />
                      </button>
                      <button onClick={() => removeFromCart(item.id)} className="ml-auto p-1 text-red-400 hover:bg-red-50 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : checkoutStep === 'checkout' ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-600">Nombre completo</label>
                <input
                  type="text"
                  value={cliente.nombre}
                  onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                  className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-600">Email</label>
                <input
                  type="email"
                  value={cliente.email}
                  onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                  className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="juan@email.com"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-600">Teléfono</label>
                <input
                  type="tel"
                  value={cliente.telefono}
                  onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                  className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="555-1234-5678"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-600">Dirección de entrega</label>
                <textarea
                  value={cliente.direccion}
                  onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
                  className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-20"
                  placeholder="Calle, número, colonia, ciudad..."
                />
              </div>
              <button
                onClick={placeOrder}
                disabled={!cliente.nombre || !cliente.email}
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Completar Pedido - ${cartTotal}
              </button>
            </div>
          ) : (
            <div className="text-center py-10">
              <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">¡Pedido Confirmado!</h3>
              <p className="text-slate-400 text-sm">Número de pedido:</p>
              <p className="text-lg font-bold text-emerald-600">{orderPlaced}</p>
              <p className="text-slate-400 text-sm mt-4">Te contactaremos pronto para confirmar la entrega.</p>
              <button onClick={() => { setShowCart(false); setCheckoutStep('cart'); }} className="mt-6 px-6 py-3 bg-emerald-500 text-white rounded-xl">
                Cerrar
              </button>
            </div>
          )}
        </div>

        {cart.length > 0 && checkoutStep === 'cart' && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold text-slate-800">Total</span>
              <span className="text-2xl font-bold text-emerald-600">${cartTotal}</span>
            </div>
            <button
              onClick={() => setCheckoutStep('checkout')}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600"
            >
              Proceder al Pago
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {showCart && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowCart(false)} />
      )}
      <CartDrawer />

      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
            <img src={iconoUrl} alt="Ecopia" className="w-5 h-5" />
          </button>
        </div>
        <h1 className="text-xl font-bold text-emerald-600">Ecopia - Lista de peces</h1>
        <button onClick={() => setShowCart(true)} className="relative p-2 bg-emerald-500 text-white rounded-lg">
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar peces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {viewMode === 'grid' ? <Grid size={16} /> : <LayoutList size={16} />}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400">Cargando...</div>
          ) : filteredPeces.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <img src={iconoUrl} alt="Ecopia" className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay peces disponibles</p>
            </div>
          ) : filteredPeces.length > visibleCount ? (
            viewMode === 'grid' ? (
              <div id="product-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                {filteredPeces.slice(0, visibleCount).map(pez => (
                  <ProductCard key={pez.id} pez={pez} onClick={() => setSelectedPez(pez)} />
                ))}
              </div>
            ) : (
              <div id="product-list" className="space-y-3">
                {filteredPeces.slice(0, visibleCount).map(pez => (
                  <ProductTableRow key={pez.id} pez={pez} onClick={() => setSelectedPez(pez)} />
                ))}
              </div>
            )
          ) : (
            viewMode === 'grid' ? (
              <div id="product-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                {filteredPeces.slice(0, visibleCount).map(pez => (
                  <ProductCard key={pez.id} pez={pez} onClick={() => setSelectedPez(pez)} />
                ))}
              </div>
            ) : (
              <div id="product-list" className="space-y-3">
                {filteredPeces.slice(0, visibleCount).map(pez => (
                  <ProductTableRow key={pez.id} pez={pez} onClick={() => setSelectedPez(pez)} />
                ))}
              </div>
            )
          )}

          {filteredPeces.length > visibleCount && (
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
              <span className="text-slate-400 text-sm">Cargando más...</span>
            </div>
          )}
          
          <ProductModal />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-30 flex items-center justify-around">
        <button className="flex flex-col items-center py-2 text-emerald-600">
          <img src={iconoUrl} alt="Catálogo" className="w-6 h-6" />
          <span className="text-[10px] font-bold">Catálogo</span>
        </button>
        <button onClick={() => setShowCart(true)} className={`flex flex-col items-center py-2 ${showCart ? 'text-emerald-600' : 'text-slate-400'}`}>
          <ShoppingCart size={22} />
          <span className="text-[10px] font-bold">Carrito ({cartCount})</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
