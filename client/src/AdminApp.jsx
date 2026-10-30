import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { Bell, Clock3, PackageCheck, RefreshCw, Store, WalletCards } from 'lucide-react'
import './Admin.css'

const statuses = ['WAITING_CONFIRMATION','ACCEPTED','PROCESSING','PREPARING','READY','COMPLETED','CANCELLED']
const rupiah = value => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(value) || 0)
const paymentProofUrl = value => value ? (value.startsWith('http://') || value.startsWith('https://') ? value : value.startsWith('/') ? value : `/${value}`) : ''

export default function AdminApp({ onExit }) {
  const [orders, setOrders] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newOrder, setNewOrder] = useState(null)
  const [vouchers, setVouchers] = useState([])
  const [voucherMessage, setVoucherMessage] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [storeOpen, setStoreOpen] = useState(true)

  async function loadOrders() {
    setLoading(true)
    try {
      const session=await fetch('/api/auth/admin/session',{credentials:'include'})
      if(!session.ok){setAuthenticated(false);return}
      setAuthenticated(true)
      const statusResponse=await fetch('/api/store/status')
      if(statusResponse.ok)setStoreOpen((await statusResponse.json()).isOpen)
      const [orderResponse, dashboardResponse, voucherResponse] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/vouchers')
      ])
      if (orderResponse.ok) setOrders(await orderResponse.json())
      if (dashboardResponse.ok) setDashboard(await dashboardResponse.json())
      if (voucherResponse.ok) setVouchers(await voucherResponse.json())
    } finally { setLoading(false) }
  }

  async function createVoucher(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/admin/vouchers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:form.get('code'),description:form.get('description'),discountType:form.get('discountType'),discountValue:Number(form.get('discountValue')),minimumSubtotal:Number(form.get('minimumSubtotal')||0),startsAt:form.get('startsAt'),expiresAt:form.get('expiresAt'),usageLimit:Number(form.get('usageLimit')),active:true})})
    const data=await response.json().catch(()=>({}))
    if(response.ok){event.currentTarget.reset();setVoucherMessage(`Voucher ${data.code} berhasil ditambahkan`);loadOrders()}else{setVoucherMessage(data.message||'Voucher gagal dibuat')}
    window.setTimeout(()=>setVoucherMessage(''),3000)
  }

  async function loginAdmin(event){
    event.preventDefault();const form=new FormData(event.currentTarget)
    const response=await fetch('/api/auth/admin/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})})
    const data=await response.json().catch(()=>({}))
    if(response.ok){setAuthenticated(true);setLoginError('');loadOrders()}else setLoginError(data.message||'Login gagal')
  }
  async function logoutAdmin(){await fetch('/api/auth/admin/logout',{method:'POST',credentials:'include'});setAuthenticated(false)}
  async function deleteVoucher(voucher){if(!window.confirm(`Hapus voucher ${voucher.code}?`))return;const id=voucher.id||voucher.code;const response=await fetch(`/api/admin/vouchers/${encodeURIComponent(id)}`,{method:'DELETE',credentials:'include'});if(response.ok)loadOrders();else{const data=await response.json().catch(()=>({}));setVoucherMessage(data.message||'Voucher gagal dihapus')}}
  async function toggleStore(){const response=await fetch('/api/admin/store/status',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({isOpen:!storeOpen})});if(response.ok){const data=await response.json();setStoreOpen(data.isOpen)}}

  async function changeStatus(order, status) {
    const response = await fetch(`/api/orders/${encodeURIComponent(order.number)}/status`, {
      method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status })
    })
    if (response.ok) {
      const updated = await response.json()
      setOrders(items => items.map(item => item.number === updated.number ? {...item, status:updated.status} : item))
      loadOrders()
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(loadOrders, 0)
    const socket = io()
    socket.on('order:new', order => { setNewOrder(order); loadOrders() })
    socket.on('order:status', updated => setOrders(items => items.map(item => item.number === updated.number ? {...item, status:updated.status} : item)))
    socket.on('order:payment-proof', updated => { setOrders(items => items.map(item => item.number === updated.number ? {...item, paymentProof:updated.paymentProof} : item)); loadOrders() })
    const interval = window.setInterval(loadOrders, 15000)
    return () => { window.clearTimeout(initialLoad); socket.disconnect(); window.clearInterval(interval) }
  }, [])

  if(!authenticated) return <div className="admin-login-shell"><form className="admin-login-card" onSubmit={loginAdmin}><div className="admin-mark">BG</div><h1>Login Dashboard Admin</h1><p>Area terbatas untuk pengelola toko</p><label>Email<input name="email" type="email" required autoComplete="username" defaultValue="restunurbahri01@gmail.com"/></label><label>Password<input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"/></label>{loginError&&<div className="login-error">{loginError}</div>}<button type="submit">Masuk Dashboard</button>{onExit && <button className="admin-back-store" type="button" onClick={onExit}>Kembali ke Website Utama</button>}</form></div>

  return <div className="admin-shell">
    <header className="admin-header"><div className="admin-brand"><div className="admin-mark">BG</div><div><strong>TELOR GULUNG</strong><span>ADMIN PESANAN</span></div></div><div className="admin-actions"><button onClick={loadOrders}><RefreshCw size={17}/> Muat Ulang</button><button onClick={logoutAdmin}>Keluar</button><button type="button" onClick={()=>onExit?.()}>Website Utama</button><button className={storeOpen?'store-open store-status-top':'store-closed store-status-top'} onClick={toggleStore}>{storeOpen?'Toko Buka':'Toko Tutup'}</button></div></header>
    <main className="admin-main">
      {newOrder && <div className="new-order-alert"><Bell/><div><strong>Pesanan baru masuk: {newOrder.number}</strong><span>{newOrder.customer} • {rupiah(newOrder.total)}</span></div><button onClick={() => setNewOrder(null)}>Tutup</button></div>}
      <div className="admin-stats">
        <article><Store/><div><span>Total pesanan</span><strong>{dashboard?.transactions ?? orders.length}</strong></div></article>
        <article><Clock3/><div><span>Menunggu</span><strong>{dashboard?.newOrders ?? orders.filter(o => o.status === 'WAITING_CONFIRMATION').length}</strong></div></article>
        <article><PackageCheck/><div><span>Diproses</span><strong>{dashboard?.processingOrders ?? 0}</strong></div></article>
        <article><WalletCards/><div><span>Total pendapatan</span><strong>{rupiah(dashboard?.revenueToday ?? 0)}</strong></div></article>
      </div>
      <section className="voucher-panel"><div className="orders-heading"><div><small>VOUCHER</small><h1>Kelola Voucher</h1></div><span>{vouchers.length} voucher</span></div><form className="voucher-admin-form" onSubmit={createVoucher}><input name="code" required placeholder="Kode voucher"/><input name="description" required placeholder="Syarat voucher / cara mendapatkannya"/><select name="discountType"><option value="FIXED">Potongan nominal</option><option value="PERCENT">Persentase</option></select><input name="discountValue" required type="number" min="1" placeholder="Nilai diskon"/><input name="minimumSubtotal" type="number" min="0" defaultValue="0" placeholder="Minimum belanja"/><label>Mulai<input name="startsAt" required type="datetime-local"/></label><label>Berakhir<input name="expiresAt" required type="datetime-local"/></label><input name="usageLimit" required type="number" min="1" defaultValue="1" placeholder="Jumlah penggunaan"/><button type="submit">Tambah Voucher</button></form>{voucherMessage && <div className="voucher-message">{voucherMessage}</div>}<div className="voucher-list">{vouchers.map(v => <article key={v.id || v.code}><strong>{v.code}</strong><small>{v.description||'Tanpa syarat khusus'}</small><span>{v.discount_type==='PERCENT'||v.discountType==='PERCENT'?`${v.discount_value||v.discountValue}%` : rupiah(v.discount_value||v.discountValue)}</span><small>{v.used_count||v.usedCount||0}/{v.usage_limit||v.usageLimit} digunakan</small><button type="button" className="delete-voucher" onClick={()=>deleteVoucher(v)}>Hapus</button></article>)}</div></section>
      <section className="orders-panel"><div className="orders-heading"><div><small>PESANAN MASUK</small><h1>Kelola Pesanan</h1></div><span>{loading ? 'Memuat...' : `${orders.length} pesanan`}</span></div>
        {orders.length === 0 ? <div className="admin-empty"><Bell/><h2>Belum ada pesanan masuk</h2><p>Pesanan baru akan muncul otomatis di halaman ini.</p></div> : <div className="admin-orders">{orders.map(order => <article className="admin-order" key={order.number}><div className="order-top"><div><small>{order.number}</small><h3>{order.customer}</h3>{order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && <b>Antrean #{order.queueNumber || '-'}</b>}</div><strong>{rupiah(order.total)}</strong></div><div className="order-details"><span>📞 {order.phone}</span><a className="admin-map-link" href="https://maps.app.goo.gl/SZ4H9ufTZskW1ngo7" target="_blank" rel="noopener">📍 Lokasi penjualan di Google Maps</a><span>💳 {order.paymentMethod}</span></div>{order.paymentProof && <div className="payment-proof"><small>BUKTI PEMBAYARAN</small><a href={paymentProofUrl(order.paymentProof)} target="_blank" rel="noopener"><img src={paymentProofUrl(order.paymentProof)} alt={`Bukti pembayaran ${order.number}`} /></a></div>}{order.items && <div className="order-items">{order.items.map((item,index) => <span key={index}>{item.name || `Produk #${item.productId}`} × {item.quantity}</span>)}</div>}<label>Status pesanan<select value={order.status || 'WAITING_CONFIRMATION'} onChange={e => changeStatus(order,e.target.value)}>{statuses.map(status => <option value={status} key={status}>{status.replaceAll('_',' ')}</option>)}</select></label></article>)}</div>}
      </section>
    </main>
  </div>
}
