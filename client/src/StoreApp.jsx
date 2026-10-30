import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MapPin, ShoppingBag, UserRound, Home, Tag, ReceiptText, Plus, Minus, Star, Clock3, ChevronRight, Menu, X } from 'lucide-react'
import AdminApp from './AdminApp.jsx'
import './Store.css'
import './StoreRedesign.css'

const products = [
  { id: 1, name: 'Telor Gulung Sosis sapi', desc: 'Telor gulung dengan sosis sapi', price: 2000, oldPrice: null, category: 'Kategori A', rating: 4.9, badge: 'Populer', color: '#ef7d32' },
  { id: 2, name: 'Telor Gulung Sosis ayam', desc: 'Telor gulung dengan sosis ayam', price: 2000, oldPrice: null, category: 'Kategori A', rating: 4.8, badge: 'Favorit', color: '#f6b83a' },
  { id: 3, name: 'Telor Gulung Otak-otak', desc: 'Telor gulung isi otak-otak', price: 2000, oldPrice: null, category: 'Kategori A', rating: 4.8, badge: 'Favorit', color: '#e79a39' },
  { id: 4, name: 'Telor Gulung Basreng', desc: 'Telor gulung isi basreng gurih', price: 2000, oldPrice: null, category: 'Kategori A', rating: 4.7, badge: 'Baru', color: '#e9562a' },
  { id: 5, name: 'Telor Gulung Bakso', desc: 'Telor gulung isi bakso', price: 2000, oldPrice: null, category: 'Kategori A', rating: 4.8, badge: 'Favorit', color: '#ef7d32' },
  { id: 6, name: 'Telor Gulung Fishroll', desc: 'Telor gulung isi fishroll', price: 2000, oldPrice: null, category: 'Kategori A', rating: 4.7, badge: 'Baru', color: '#f3c94d' },
  { id: 7, name: 'Telor Gulung Original', desc: 'Telur segar, gurih, dan renyah', price: 2000, oldPrice: null, category: 'Kategori A', rating: 4.9, badge: 'Klasik', color: '#f6b83a' },
  { id: 8, name: 'Paket Hemat A (5 tusuk original)', desc: '5 tusuk telor gulung original', price: 10000, oldPrice: null, category: 'Kategori B', rating: 4.9, badge: 'HemAt', color: '#f0b643' },
  { id: 9, name: 'Paket Hemat B (10 tusuk original)', desc: '10 tusuk telor gulung original', price: 20000, oldPrice: null, category: 'Kategori B', rating: 4.9, badge: 'Paling Hemat', color: '#dd982f' },
  { id: 10, name: 'Paket Pedas (5 tusuk pedas)', desc: '5 tusuk telor gulung pedas', price: 10000, oldPrice: null, category: 'Kategori B', rating: 4.8, badge: 'Pedas', color: '#e9562a' },
  { id: 11, name: 'Paket Mix (5 tusuk campur)', desc: '5 tusuk telor gulung campuran', price: 10000, oldPrice: null, category: 'Kategori B', rating: 4.9, badge: 'Mix Favorit', color: '#ef7d32' },
  { id: 12, name: 'Paket Rame-Rame (20 tusuk campur)', desc: '20 tusuk telor gulung campuran', price: 40000, oldPrice: null, category: 'Kategori B', rating: 4.9, badge: 'Paket Besar', color: '#d98b2b' },
]

const categories = [
  ['⭐', 'Semua'], ['🥚', 'Kategori A'], ['📦', 'Kategori B']
]

function rupiah(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) }

export default function StoreApp() {
  const [category, setCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('bewok-cart') || '[]'))
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [toast, setToast] = useState('')
  const [activeNav, setActiveNav] = useState('Beranda')
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [accountPhone, setAccountPhone] = useState(localStorage.getItem('bewok-phone') || '')
  const [profileName, setProfileName] = useState(localStorage.getItem('bewok-name') || '')
  const [accountMode, setAccountMode] = useState('login')
  const [verificationStep, setVerificationStep] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [loggedCustomer, setLoggedCustomer] = useState(null)
  const [profileEditing, setProfileEditing] = useState(false)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('')
  const [qrPayment, setQrPayment] = useState(null)
  const [paymentSeconds, setPaymentSeconds] = useState(300)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherDiscount, setVoucherDiscount] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [storeOpen, setStoreOpen] = useState(true)
  const [orderConfirmation, setOrderConfirmation] = useState(null)
  const [promoOpen, setPromoOpen] = useState(false)
  const [publicVouchers, setPublicVouchers] = useState([])
  const [adminCodeStep, setAdminCodeStep] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [adminAuthorized, setAdminAuthorized] = useState(false)

  useEffect(() => localStorage.setItem('bewok-cart', JSON.stringify(cart)), [cart])
  useEffect(()=>{let active=true;const load=async()=>{try{const r=await fetch('/api/store/status');if(r.ok&&active)setStoreOpen((await r.json()).isOpen)}catch{}};load();const interval=window.setInterval(load,15000);return()=>{active=false;window.clearInterval(interval)}},[])
  useEffect(()=>{fetch('/api/auth/session',{credentials:'include'}).then(async r=>{if(r.ok){const user=await r.json();setLoggedCustomer(user);setProfileName(user.name||'');setAccountPhone(user.phone||localStorage.getItem('bewok-phone')||'');setProfilePhotoPreview(user.photoPath||'')}})},[])
  useEffect(()=>{fetch('/api/vouchers').then(async r=>{if(r.ok)setPublicVouchers(await r.json())}).catch(()=>setPublicVouchers([]))},[])
  useEffect(() => {
    if (!qrPayment) return undefined
    const interval = window.setInterval(() => setPaymentSeconds(seconds => {
      if (seconds <= 1) { window.clearInterval(interval); return 0 }
      return seconds - 1
    }), 1000)
    return () => window.clearInterval(interval)
  }, [qrPayment])
  const filtered = useMemo(() => products.filter(p => (category === 'Semua' || category === p.category || (category === 'Promo' && p.oldPrice)) && p.name.toLowerCase().includes(search.toLowerCase())), [category, search])
  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  function add(product) { setCart(items => { const found = items.find(i => i.id === product.id); return found ? items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) : [...items, { ...product, qty: 1 }] }); setToast(`${product.name} ditambahkan`) ; setTimeout(() => setToast(''), 1800) }
  function change(id, amount) { setCart(items => items.map(i => i.id === id ? { ...i, qty: i.qty + amount } : i).filter(i => i.qty > 0)) }
  async function applyVoucher() {
    const code = voucherCode.trim().toUpperCase()
    if (!code) return
    try {
      const response = await fetch(`/api/vouchers/${encodeURIComponent(code)}`)
      const voucher = await response.json()
      if (!response.ok) throw new Error(voucher.message || 'Voucher tidak tersedia')
      if (subtotal < Number(voucher.minimum_subtotal || 0)) throw new Error(`Minimum belanja ${rupiah(voucher.minimum_subtotal || 0)}`)
      const discount = voucher.discount_type === 'PERCENT' ? Math.floor(subtotal * Number(voucher.discount_value) / 100) : Number(voucher.discount_value)
      setVoucherDiscount(Math.min(discount, subtotal))
      setVoucherCode(voucher.code)
      setToast('Voucher berhasil diterapkan')
    } catch (error) { setVoucherDiscount(0); setToast(error.message) }
    setTimeout(() => setToast(''), 2200)
  }

  async function openOrders() {
    setMenuOpen(false)
    setActiveNav('Pesanan')
    setOrdersOpen(true)
    if (!loggedCustomer && !accountPhone) { setOrders([]); return }
    try {
      const response = await fetch(loggedCustomer ? '/api/account/orders' : `/api/orders/${encodeURIComponent(accountPhone)}`, loggedCustomer ? {credentials:'include'} : {})
      if (response.ok) setOrders(await response.json())
    } catch {
      setOrders([])
    }
  }

  function navigate(label) {
    setMenuOpen(false)
    setActiveNav(label)
    if (label === 'Beranda') document.getElementById('beranda')?.scrollIntoView({ behavior: 'smooth' })
    if (label === 'Menu') document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })
    if (label === 'Promo') { setPromoOpen(true); fetch('/api/vouchers').then(async r=>{if(r.ok)setPublicVouchers(await r.json())}).catch(()=>{}) }
    if (label === 'Pesanan') openOrders()
    if (label === 'Pesanan Saya') openOrders()
    if (label === 'Akun') setAccountOpen(true)
  }

  async function uploadPaymentProof(event) {
    event.preventDefault()
    const file = event.currentTarget.elements.proof.files[0]
    if (!file || !qrPayment) return
    setUploadingProof(true)
    const formData = new FormData()
    formData.append('proof', file)
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(qrPayment.number)}/payment-proof`, { method:'POST', body:formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Upload bukti gagal')
      setToast('Bukti pembayaran berhasil dikirim ke admin')
      setQrPayment(null)
      setToast('Bukti pembayaran dikirim dan transaksi ditutup')
    } catch (error) { setToast(error.message) }
    finally { setUploadingProof(false); setTimeout(() => setToast(''), 2200) }
  }

  async function loginCustomer(event) {
    event.preventDefault();const form=new FormData(event.currentTarget)
    const response=await fetch('/api/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})})
    const data=await response.json().catch(()=>({}))
    if(!response.ok){setToast(data.message||'Login gagal');setTimeout(()=>setToast(''),2200);return}
    setLoggedCustomer(data);setProfileName(data.name||'');setAccountPhone(data.phone||'');localStorage.setItem('bewok-name',data.name||'');localStorage.setItem('bewok-phone',data.phone||'');setAccountOpen(false);setToast('Login berhasil');setTimeout(()=>setToast(''),1800)
  }
  async function requestVerification(event){
    event.preventDefault();const form=new FormData(event.currentTarget);const email=String(form.get('email')).trim().toLowerCase()
    const response=await fetch('/api/auth/register/request-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.get('name'),phone:form.get('phone'),email,password:form.get('password')})})
    const data=await response.json().catch(()=>({}))
    if(!response.ok){setToast(data.message||'Pendaftaran gagal');setTimeout(()=>setToast(''),2200);return}
    setVerificationEmail(email);setVerificationStep(true);setToast(data.developmentCode?`Kode sementara (SMTP belum disetel): ${data.developmentCode}`:'Kode verifikasi telah dikirim ke Gmail');setTimeout(()=>setToast(''),6000)
  }
  async function verifyCustomer(event){
    event.preventDefault();const form=new FormData(event.currentTarget)
    const response=await fetch('/api/auth/register/verify',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:verificationEmail,code:form.get('code')})})
    const data=await response.json().catch(()=>({}))
    if(!response.ok){setToast(data.message||'Verifikasi gagal');setTimeout(()=>setToast(''),2200);return}
    setLoggedCustomer(data);setProfileName(data.name||'');setAccountPhone(data.phone||'');localStorage.setItem('bewok-name',data.name||'');localStorage.setItem('bewok-phone',data.phone||'');setVerificationStep(false);setAccountMode('login');setAccountOpen(false);setToast('Akun berhasil dibuat dan diverifikasi');setTimeout(()=>setToast(''),2200)
  }
  async function logoutCustomer(){await fetch('/api/auth/logout',{method:'POST',credentials:'include'});setLoggedCustomer(null);setProfilePhotoPreview('');setProfileEditing(false);setToast('Berhasil keluar');setTimeout(()=>setToast(''),1800)}
  async function updateProfile(event){
    event.preventDefault();const form=new FormData(event.currentTarget)
    const response=await fetch('/api/account/profile',{method:'PATCH',credentials:'include',body:form})
    const data=await response.json().catch(()=>({}))
    if(!response.ok){setToast(data.message||'Profil gagal diperbarui');setTimeout(()=>setToast(''),2200);return}
    setLoggedCustomer(data);setProfileName(data.name||'');setAccountPhone(data.phone||'');setProfilePhotoPreview(data.photoPath||'');localStorage.setItem('bewok-name',data.name||'');localStorage.setItem('bewok-phone',data.phone||'');setProfileEditing(false);setToast('Profil berhasil diperbarui');setTimeout(()=>setToast(''),1800)
  }

  if (adminAuthorized) return <AdminApp onExit={() => setAdminAuthorized(false)} />

  return <div className="store-shell">
    {toast && <motion.div className="toast" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{toast}</motion.div>}
    <header className="topbar">
      <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Menu"><Menu /></button>
      <div className="brand"><div>{loggedCustomer ? <strong>{loggedCustomer.name}</strong> : <><strong>TELOR GULUNG</strong><span>BANG BEWOK</span></>}</div></div>
      <nav className="desktop-nav"><button className={activeNav==='Beranda'?'active':''} onClick={()=>navigate('Beranda')}>Beranda</button><button onClick={()=>navigate('Menu')}>Menu</button><button className={activeNav==='Promo'?'active':''} onClick={()=>navigate('Promo')}>Promo</button><button onClick={()=>navigate('Pesanan')}>Pesanan</button></nav>
      <div className="searchbox"><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari telor gulung favorit..." /></div>
      <a className="location" href="https://maps.app.goo.gl/SZ4H9ufTZskW1ngo7" target="_blank" rel="noopener"><MapPin size={18}/><span><small>Buka Google Maps</small><b>Lokasi penjualan</b></span></a>
      <button className="icon-button account" onClick={() => navigate('Akun')} aria-label="Akun"><UserRound /></button>
      <button className="icon-button cart-button" onClick={() => setCartOpen(true)}><ShoppingBag /><span>{count}</span></button>
      <div className={`store-status-topbar ${storeOpen?'open':'closed'}`} title="Status toko"><span></span>{storeOpen?'Toko Buka':'Toko Tutup'}</div>
    </header>

    {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}><aside className="side-drawer" onClick={e => e.stopPropagation()}><button className="drawer-close" onClick={() => setMenuOpen(false)}><X /></button><div className="brand"><div><strong>TELOR GULUNG</strong><span>BANG BEWOK</span></div></div><nav>{['Beranda','Menu','Promo','Pesanan Saya','Akun'].map(x => <button key={x} onClick={() => navigate(x)}>{x}<ChevronRight /></button>)}</nav></aside></div>}

    <main>
      <section id="beranda" className="hero-section">
        <motion.div className="hero-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="hero-photo" role="img" aria-label="Banner Telor Gulung Bang Bewok"></div>
        </motion.div>
        <div className="hero-features"><div><b>🛡️</b><span><strong>Bahan Berkualitas</strong><small>Dari telur pilihan terbaik</small></span></div><div><b>🍳</b><span><strong>Rasa Lezat</strong><small>Gurih, renyah, bikin nagih</small></span></div><div><b>⚡</b><span><strong>Proses Cepat</strong><small>Pesanan langsung dimasak</small></span></div><div><b>💳</b><span><strong>Pembayaran Mudah</strong><small>QRIS &amp; tunai</small></span></div></div>
      </section>

      <section id="menu" className="content-section">
        <div className="section-heading"><div><span>JELAJAHI MENU</span><h2>Pilih Kategori</h2></div><button>Lihat semua <ChevronRight size={17}/></button></div>
        <div className="category-grid">{categories.map(([icon, label]) => <button key={label} className={category === label ? 'active' : ''} onClick={() => setCategory(label)}><span>{icon}</span><b>{label}</b></button>)}</div>

        <div className="section-heading product-heading"><div><span>MENU FAVORIT</span><h2>Yang Lagi Hits!</h2></div><button>Lihat semua <ChevronRight size={17}/></button></div>
        <div className="product-grid">{filtered.map(product => <motion.article className="product-card" key={product.id} whileHover={{ y: -5 }}><div className="product-image" style={{ '--product': product.color }}><span className="badge">{product.badge}</span><div className="mini-roll"></div></div><div className="product-info"><div className="rating"><Star size={14} fill="currentColor"/> {product.rating}</div><h3>{product.name}</h3><p>{product.desc}</p><div className="product-bottom"><div><strong>{rupiah(product.price)}</strong>{product.oldPrice && <small>{rupiah(product.oldPrice)}</small>}</div><button onClick={() => add(product)} aria-label={`Tambah ${product.name}`}><Plus /></button></div></div></motion.article>)}</div>
      </section>

      <section id="promo" className="promo-strip"><div><span className="promo-icon">🎁</span><div><small>VOUCHER PENJUAL</small><strong>Masukkan kode saat checkout</strong></div></div><button onClick={() => { setCartOpen(true); setCheckout(true) }}>Gunakan Voucher</button></section>
    </main>

    {count > 0 && <div className="shopping-bar"><button className="shopping-cart-summary" type="button" onClick={() => setCartOpen(true)}><ShoppingBag/><span><small>Keranjang • {count} item</small><strong>{rupiah(subtotal-voucherDiscount)}</strong></span></button><button className="shopping-order-button" type="button" disabled={!storeOpen} onClick={() => {setCartOpen(false);setCheckout(true)}}>{storeOpen ? 'Pesan Sekarang' : 'Toko Tutup'}<ChevronRight size={18}/></button></div>}

    <nav className="mobile-nav">{[{n:'Beranda',i:Home},{n:'Menu',i:ReceiptText},{n:'Promo',i:Tag},{n:'Pesanan',i:ShoppingBag},{n:'Akun',i:UserRound}].map(({n,i:Icon}) => <button key={n} className={activeNav === n ? 'active' : ''} onClick={() => navigate(n)}><Icon/><span>{n}</span></button>)}</nav>

    {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={e => e.stopPropagation()}><div className="drawer-header"><div><small>PESANANMU</small><h2>Keranjang</h2></div><button onClick={() => setCartOpen(false)}><X /></button></div>{cart.length === 0 ? <div className="empty-cart"><ShoppingBag/><h3>Keranjang masih kosong</h3><p>Yuk pilih menu favoritmu!</p></div> : <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><div className="cart-thumb"></div><div className="cart-detail"><h4>{item.name}</h4><strong>{rupiah(item.price)}</strong><div className="qty"><button onClick={() => change(item.id,-1)}><Minus /></button><b>{item.qty}</b><button onClick={() => change(item.id,1)}><Plus /></button></div></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><b>{rupiah(subtotal)}</b></div><div><span>Pengambilan</span><b>Ambil ke lokasi jualan</b></div><button disabled={!storeOpen} onClick={() => { if(!storeOpen){setToast('Toko sedang tutup');return} setCartOpen(false); setCheckout(true) }}>{storeOpen ? `Beli Sekarang • ${rupiah(subtotal)}` : 'Toko Sedang Tutup'}</button></div></>}</aside></div>}

    {checkout && <div className="modal-backdrop"><motion.form className="checkout-modal" initial={{scale:.96,opacity:0}} animate={{scale:1,opacity:1}} onSubmit={async e => { e.preventDefault(); if(!storeOpen){setToast('Toko sedang tutup. Pesanan belum dapat dibuat.');setTimeout(()=>setToast(''),2200);return} const form = new FormData(e.currentTarget); const buyerName=String(form.get('name')||'').trim(); const buyerPhone=String(form.get('phone')||'').trim(); if(!buyerName){setToast('Nama pemesan wajib diisi');setTimeout(()=>setToast(''),2200);return} if(!/^628\d{8,12}$/.test(buyerPhone)){setToast('Masukkan nomor WhatsApp aktif diawali 628');setTimeout(()=>setToast(''),2200);return} try { const response = await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer:{name:form.get('name'),phone:form.get('phone')},items:cart.map(i=>({productId:i.id,quantity:i.qty})),paymentMethod:form.get('payment'),voucherCode:form.get('voucher'),fulfillment:'PICKUP'})}); const data=await response.json(); if(!response.ok) throw new Error(data.message||'Checkout gagal'); localStorage.setItem('bewok-name', form.get('name')); localStorage.setItem('bewok-phone', form.get('phone')); setProfileName(form.get('name')); setAccountPhone(form.get('phone')); setCart([]); setVoucherDiscount(0); setVoucherCode(''); setCheckout(false); setCartOpen(false); if (data.qrCode) { setQrPayment(data); setPaymentSeconds(300) } else { setOrderConfirmation(data) } setToast(`Pesanan ${data.number} berhasil dibuat`); setTimeout(() => setToast(''), 2200); } catch(error){ setToast(error.message) } }}><div className="drawer-header"><div><small>CHECKOUT</small><h2>Pesan untuk diambil</h2></div><button type="button" onClick={() => setCheckout(false)}><X /></button></div><div className="pickup-box"><MapPin size={18}/><div><small>Lokasi pengambilan</small><a href="https://maps.app.goo.gl/SZ4H9ufTZskW1ngo7" target="_blank" rel="noopener"><strong>Ambil langsung di lokasi — Buka Google Maps</strong></a></div></div><label>Nama pemesan<input name="name" required autoComplete="name" placeholder="Nama lengkap" defaultValue={profileName}/></label><label>Nomor WhatsApp<input name="phone" required type="tel" inputMode="numeric" pattern="628[0-9]{8,12}" title="Gunakan format diawali 628, contoh 6281234567890" autoComplete="tel" placeholder="6281234567890" defaultValue={accountPhone}/></label><label>Metode pembayaran<select name="payment"><option value="QRIS">QRIS</option><option value="COD">Tunai saat ambil</option></select></label><div className="voucher-form"><input name="voucher" value={voucherCode} onChange={e=>setVoucherCode(e.target.value.toUpperCase())} placeholder="Masukkan kode voucher"/><button type="button" onClick={applyVoucher}>Pakai</button></div><div className="checkout-total"><span>Subtotal</span><b>{rupiah(subtotal)}</b></div>{voucherDiscount > 0 && <div className="checkout-total discount"><span>Potongan voucher</span><b>-{rupiah(voucherDiscount)}</b></div>}<div className="checkout-total"><span>Total pembayaran</span><b>{rupiah(Math.max(0,subtotal-voucherDiscount))}</b></div><button className="order-button" type="submit">Buat Pesanan</button></motion.form></div>}

    {qrPayment && <div className="modal-backdrop"><motion.div className="qris-modal" initial={{scale:.96,opacity:0}} animate={{scale:1,opacity:1}}><div className="drawer-header"><div><small>PEMBAYARAN QRIS</small><h2>Selesaikan pembayaran</h2></div><button onClick={() => setQrPayment(null)} aria-label="Tutup"><X /></button></div><div className="qris-order"><div><small>NOMOR PESANAN</small><strong className="order-number">{qrPayment.number}</strong></div><b>{rupiah(qrPayment.total)}</b></div><div className="pickup-number-note">Saat mengambil pesanan, ucapkan nomor pesanan <strong>{qrPayment.number}</strong> kepada penjual.</div><div className="payment-countdown">{paymentSeconds > 0 ? <><Clock3 size={18}/> Waktu pembayaran <strong>{String(Math.floor(paymentSeconds/60)).padStart(2,'0')}:{String(paymentSeconds%60).padStart(2,'0')}</strong></> : <strong className="expired">Waktu pembayaran habis</strong>}</div>{paymentSeconds > 0 ? <><img className="qris-code" src={qrPayment.qrCode} alt="Kode QR pembayaran"/><p className="qris-help">Pindai QR menggunakan aplikasi pembayaran QRIS.</p><form className="proof-form" onSubmit={uploadPaymentProof}><label htmlFor="proof">Upload bukti pembayaran</label><input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required/><button className="order-button" type="submit" disabled={uploadingProof || qrPayment.uploaded}>{qrPayment.uploaded ? 'Lanjutkan' : uploadingProof ? 'Mengunggah...' : 'Lanjutkan'}</button></form></> : <div className="payment-expired"><p>Pesanan QRIS ini tidak berlaku lagi.</p><button className="order-button" onClick={() => setQrPayment(null)}>Tutup</button></div>}</motion.div></div>}

    {ordersOpen && <div className="drawer-backdrop" onClick={() => setOrdersOpen(false)}><aside className="side-drawer order-history-drawer" onClick={e => e.stopPropagation()}><div className="drawer-header"><div><small>RIWAYAT</small><h2>Pesanan Saya</h2></div><button onClick={() => setOrdersOpen(false)}><X /></button></div>{!accountPhone ? <div className="empty-cart"><ShoppingBag/><h3>Belum ada akun</h3><p>Lengkapi akun agar pesanan dapat dilacak.</p><button className="profile-button" onClick={() => { setOrdersOpen(false); setAccountOpen(true) }}>Isi Profil</button></div> : orders.length === 0 ? <div className="empty-cart"><ReceiptText/><h3>Belum ada pesanan</h3><p>Pesananmu akan tampil di sini.</p></div> : <div className="order-list">{orders.map(order => <article className="order-card" key={order.number} onClick={() => setSelectedOrder(order)} role="button" tabIndex={0}><div><small>{order.number}</small><strong>{rupiah(order.total)}</strong></div><span>{order.status.replaceAll('_',' ')}</span><p>{order.paymentMethod} • Ambil ke lokasi</p><b className="pickup-order-note">Saat mengambil, sebutkan nomor <strong>{order.number}</strong></b>{order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && <b className="queue-badge">Nomor antrean #{order.queueNumber || '-'}</b>}</article>)}</div>}</aside></div>}

    {selectedOrder && <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}><motion.div className="checkout-modal order-detail-modal" initial={{scale:.96,opacity:0}} animate={{scale:1,opacity:1}} onClick={e=>e.stopPropagation()}><div className="drawer-header"><div><small>DETAIL PESANAN</small><h2>{selectedOrder.number}</h2></div><button onClick={() => setSelectedOrder(null)}><X /></button></div><div className="detail-status"><span>{selectedOrder.status.replaceAll('_',' ')}</span>{selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && <strong>Nomor antrean #{selectedOrder.queueNumber || '-'}</strong>}</div><div className="pickup-box"><MapPin size={18}/><div><small>Pengambilan</small><a href="https://maps.app.goo.gl/SZ4H9ufTZskW1ngo7" target="_blank" rel="noopener"><strong>Ambil ke lokasi jualan — Buka Maps</strong></a></div></div><div className="detail-row"><span>Pembayaran</span><b>{selectedOrder.paymentMethod}</b></div><div className="detail-row"><span>Subtotal</span><b>{rupiah(selectedOrder.subtotal)}</b></div>{Number(selectedOrder.discount)>0 && <div className="detail-row"><span>Voucher {selectedOrder.voucherCode || ''}</span><b>-{rupiah(selectedOrder.discount)}</b></div>}<div className="detail-row total"><span>Total</span><b>{rupiah(selectedOrder.total)}</b></div></motion.div></div>}

    {orderConfirmation && <div className="modal-backdrop"><motion.div className="checkout-modal confirmation-modal" initial={{scale:.96,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}><div className="confirmation-icon">✓</div><small>PESANAN BERHASIL</small><h2>Pesananmu sudah diterima</h2><div className="confirmation-number"><span>Nomor Pesanan</span><strong>{orderConfirmation.number}</strong></div><p>Simpan nomor ini. Saat ingin mengambil pesanan, <b>ucapkan nomor pesanan {orderConfirmation.number}</b> kepada penjual.</p><div className="confirmation-pickup"><MapPin size={18}/><a href="https://maps.app.goo.gl/SZ4H9ufTZskW1ngo7" target="_blank" rel="noopener">Buka lokasi pengambilan di Google Maps</a></div><button className="order-button" type="button" onClick={() => setOrderConfirmation(null)}>Selesai</button></motion.div></div>}

    {adminCodeStep && <div className="modal-backdrop"><motion.form className="checkout-modal admin-code-modal" initial={{scale:.96,opacity:0}} animate={{scale:1,opacity:1}} onSubmit={e=>{e.preventDefault();if(adminCode==='2007'){setAdminAuthorized(true);setAdminCodeStep(false);setAdminCode('')}else{setToast('Kode akses admin salah');setTimeout(()=>setToast(''),2200)}}}><div className="drawer-header"><div><small>AKSES TERBATAS</small><h2>Masuk Dashboard Admin</h2></div><button type="button" onClick={()=>setAdminCodeStep(false)}><X/></button></div><label>Kode akses admin<input type="password" inputMode="numeric" value={adminCode} onChange={e=>setAdminCode(e.target.value)} placeholder="Masukkan kode" required/></label><button className="order-button profile-button" type="submit">Masuk Login Admin</button></motion.form></div>}

    {promoOpen && <div className="modal-backdrop promo-modal-backdrop" onClick={()=>setPromoOpen(false)}><motion.div className="checkout-modal promo-modal" initial={{scale:.96,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} onClick={e=>e.stopPropagation()}><div className="drawer-header"><div><small>PROMO & VOUCHER</small><h2>Voucher Penjual</h2></div><button onClick={()=>setPromoOpen(false)}><X/></button></div>{publicVouchers.length===0 ? <div className="empty-cart"><Tag/><h3>Belum ada voucher aktif</h3><p>Voucher baru dari penjual akan tampil di sini.</p></div> : <div className="promo-voucher-list">{publicVouchers.map(v=><article key={v.id||v.code}><div><small>{v.description||'Voucher belanja'}</small><strong>{v.code}</strong></div><b>{v.discount_type==='PERCENT'||v.discountType==='PERCENT'?`${v.discount_value||v.discountValue}%`:`${rupiah(v.discount_value||v.discountValue)}`}</b><p>Minimum belanja {rupiah(v.minimum_subtotal||v.minimumSubtotal||0)} • Maksimal {v.usage_limit||v.usageLimit} kali penggunaan</p><p>Berlaku {new Date(v.starts_at||v.startsAt).toLocaleString('id-ID')} s/d {new Date(v.expires_at||v.expiresAt).toLocaleString('id-ID')}</p></article>)}</div>}<div className="promo-howto"><h3>Cara mendapatkan voucher</h3><p>Voucher diberikan langsung oleh penjual saat promo aktif. Masukkan kode voucher pada halaman checkout untuk potongan harga. Klaim voucher tidak diperlukan.</p></div></motion.div></div>}

    {accountOpen && <div className="modal-backdrop" onClick={() => setAccountOpen(false)}><motion.div className="checkout-modal account-modal" initial={{scale:.96,opacity:0}} animate={{scale:1,opacity:1}} onClick={e=>e.stopPropagation()}><div className="drawer-header"><div><small>AKUN</small><h2>Akun Saya</h2></div><button type="button" onClick={() => setAccountOpen(false)}><X /></button></div>{loggedCustomer ? <>{profileEditing ? <form className="account-form" onSubmit={updateProfile}><div className="profile-photo-edit">{profilePhotoPreview?<img src={profilePhotoPreview} alt="Foto profil"/>:<div><UserRound/></div>}<label>Foto profil<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.currentTarget.files?.[0];if(file)setProfilePhotoPreview(URL.createObjectURL(file))}}/></label></div><label>Nama pengguna<input name="name" required defaultValue={loggedCustomer.name}/></label><label>Nomor WhatsApp<input name="phone" required type="tel" pattern="628[0-9]{8,12}" defaultValue={loggedCustomer.phone}/></label><button className="order-button profile-button" type="submit">Simpan Perubahan</button><button className="account-text-button" type="button" onClick={()=>setProfileEditing(false)}>Batal</button></form> : <><div className="account-avatar">{loggedCustomer.photoPath?<img src={loggedCustomer.photoPath} alt="Foto profil"/>:<UserRound/>}<div><strong>{loggedCustomer.name}</strong><span>{loggedCustomer.email}</span><small>{loggedCustomer.phone}</small></div></div><button className="order-button profile-button" type="button" onClick={()=>setProfileEditing(true)}>Edit Profil</button><button className="order-button profile-button" type="button" onClick={()=>{setAccountOpen(false);openOrders()}}>Lihat Riwayat Akun</button><button className="account-logout" type="button" onClick={logoutCustomer}>Keluar</button></>}</> : verificationStep ? <form className="account-form" onSubmit={verifyCustomer}><p>Kode verifikasi dikirim ke <b>{verificationEmail}</b></p><label>Kode 6 digit<input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" placeholder="123456"/></label><button className="order-button profile-button" type="submit">Verifikasi Akun</button><button className="account-text-button" type="button" onClick={()=>setVerificationStep(false)}>Kembali</button></form> : <><div className="account-tabs"><button className={accountMode==='login'?'active':''} type="button" onClick={()=>setAccountMode('login')}>Masuk</button><button className={accountMode==='register'?'active':''} type="button" onClick={()=>setAccountMode('register')}>Buat Akun</button></div>{accountMode==='login' ? <form className="account-form" onSubmit={loginCustomer}><label>Email<input name="email" required type="email" placeholder="nama@gmail.com"/></label><label>Password<input name="password" required type="password"/></label><button className="order-button profile-button" type="submit">Masuk</button></form> : <form className="account-form" onSubmit={requestVerification}><label>Nama lengkap<input name="name" required/></label><label>Nomor WhatsApp<input name="phone" required type="tel" pattern="628[0-9]{8,12}" placeholder="628..."/></label><label>Gmail<input name="email" required type="email" placeholder="nama@gmail.com"/></label><label>Password<input name="password" required minLength="8" type="password"/></label><button className="order-button profile-button" type="submit">Kirim Kode Verifikasi</button></form>}</>}<p className="guest-note">Pesanan tetap bisa dibuat tanpa login.</p><button className="admin-access-button" type="button" onClick={()=>{setAccountOpen(false);setAdminCodeStep(true)}}>Login Dashboard Admin</button></motion.div></div>}
  </div>
}
