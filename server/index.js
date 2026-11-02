import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import pg from 'pg'
import QRCode from 'qrcode'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)
const allowedOrigin = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173')
const io = new Server(httpServer, { cors: { origin: allowedOrigin, credentials: true } })
const { Pool } = pg
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL ? true : (process.env.CLIENT_URL || 'http://localhost:5173'), credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(morgan('dev'))
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true }))

const uploadDirectory = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve(__dirname, 'uploads')
fs.mkdirSync(uploadDirectory, { recursive: true })
app.use('/uploads', express.static(uploadDirectory))
const paymentUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, ['image/jpeg','image/png','image/webp'].includes(file.mimetype))
})

const catalog = [
  { id: 1, name: 'Telor Gulung Sosis sapi', description: 'Telor gulung dengan sosis sapi', price: 2000, stock: 100, category: 'Kategori A', active: true },
  { id: 2, name: 'Telor Gulung Sosis ayam', description: 'Telor gulung dengan sosis ayam', price: 2000, stock: 100, category: 'Kategori A', active: true },
  { id: 3, name: 'Telor Gulung Otak-otak', description: 'Telor gulung isi otak-otak', price: 2000, stock: 100, category: 'Kategori A', active: true },
  { id: 4, name: 'Telor Gulung Basreng', description: 'Telor gulung isi basreng gurih', price: 2000, stock: 100, category: 'Kategori A', active: true },
  { id: 5, name: 'Telor Gulung Bakso', description: 'Telor gulung isi bakso', price: 2000, stock: 100, category: 'Kategori A', active: true },
  { id: 6, name: 'Telor Gulung Fishroll', description: 'Telor gulung isi fishroll', price: 2000, stock: 100, category: 'Kategori A', active: true },
  { id: 7, name: 'Telor Gulung Original', description: 'Telur segar, gurih, dan renyah', price: 2000, stock: 100, category: 'Kategori A', active: true },
  { id: 8, name: 'Paket Hemat A (5 tusuk original)', description: '5 tusuk telor gulung original', price: 10000, stock: 50, category: 'Kategori B', active: true },
  { id: 9, name: 'Paket Hemat B (10 tusuk original)', description: '10 tusuk telor gulung original', price: 20000, stock: 50, category: 'Kategori B', active: true },
  { id: 10, name: 'Paket Pedas (5 tusuk pedas)', description: '5 tusuk telor gulung pedas', price: 10000, stock: 50, category: 'Kategori B', active: true },
  { id: 11, name: 'Paket Mix (5 tusuk campur)', description: '5 tusuk telor gulung campuran', price: 10000, stock: 50, category: 'Kategori B', active: true },
  { id: 12, name: 'Paket Rame-Rame (20 tusuk campur)', description: '20 tusuk telor gulung campuran', price: 40000, stock: 50, category: 'Kategori B', active: true }
]
let orders = []
let lastOrderSequence = 0
function nextOrderNumber() {
  lastOrderSequence = Math.max(lastOrderSequence, ...orders.map(order => /^\d+$/.test(order.number || '') ? Number(order.number) : 0)) + 1
  return String(lastOrderSequence).padStart(3, '0')
}
let vouchers = []
let admins = new Map()
let customerUsers = new Map()
let verificationCodes = new Map()
let storeOpen = true
const stateFile = path.join(__dirname, 'store-data.json')
function saveFallbackState() {
  if (pool) return
  fs.writeFileSync(stateFile, JSON.stringify({ orders, vouchers, storeOpen, customers:Array.from(customerUsers.entries()) }, null, 2))
}
try {
  if (!pool && fs.existsSync(stateFile)) {
    const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
    orders = Array.isArray(saved.orders) ? saved.orders : []
    vouchers = Array.isArray(saved.vouchers) ? saved.vouchers : []
    storeOpen = saved.storeOpen !== false
    customerUsers = new Map(Array.isArray(saved.customers) ? saved.customers : [])
    lastOrderSequence = orders.reduce((max, order) => /^\d+$/.test(order.number || '') ? Math.max(max, Number(order.number)) : max, 0)
  }
} catch (error) { console.error('Gagal memuat data lokal:', error.message) }
const mailTransport = process.env.GMAIL_APP_EMAIL && process.env.GMAIL_APP_PASSWORD ? nodemailer.createTransport({service:'gmail',auth:{user:process.env.GMAIL_APP_EMAIL,pass:process.env.GMAIL_APP_PASSWORD}}) : null
async function sendVerificationEmail(email, code) {
  if(!mailTransport)return {developmentCode:code}
  await mailTransport.sendMail({from:process.env.GMAIL_APP_EMAIL,to:email,subject:'Kode Verifikasi Telor Gulung Bang Bewok',html:`<div style="font-family:Arial"><h2>Verifikasi akun kamu</h2><p>Kode verifikasi:</p><h1 style="letter-spacing:6px">${code}</h1><p>Kode berlaku 10 menit.</p></div>`})
  return {sent:true}
}
const rupiah = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0)

async function initDatabase() {
  const adminPasswordHash = await bcrypt.hash('Restu123.', 12)
  admins.set('restunurbahri01@gmail.com', { name:'Restu Nurbahri', passwordHash:adminPasswordHash, role:'SUPER_ADMIN' })
  if (!pool) return
  await pool.query(`CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, phone VARCHAR(30), email VARCHAR(160) UNIQUE NOT NULL, password_hash TEXT NOT NULL, verified BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(160) UNIQUE NOT NULL, password_hash TEXT NOT NULL, role VARCHAR(30) NOT NULL DEFAULT 'STAFF', created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, description TEXT, price INTEGER NOT NULL CHECK (price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), category VARCHAR(80), active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, number VARCHAR(40) UNIQUE NOT NULL, customer_name VARCHAR(120) NOT NULL, phone VARCHAR(30) NOT NULL, address TEXT NOT NULL, fulfillment VARCHAR(30) NOT NULL DEFAULT 'DELIVERY', payment_method VARCHAR(30) NOT NULL, subtotal INTEGER NOT NULL, shipping_fee INTEGER NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'WAITING_CONFIRMATION', created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id), quantity INTEGER NOT NULL CHECK (quantity > 0), unit_price INTEGER NOT NULL, subtotal INTEGER NOT NULL);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_path TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(160);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(160);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo_path TEXT;
    CREATE TABLE IF NOT EXISTS vouchers (id SERIAL PRIMARY KEY, code VARCHAR(50) UNIQUE NOT NULL, description TEXT, discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('FIXED','PERCENT')), discount_value INTEGER NOT NULL CHECK (discount_value > 0), minimum_subtotal INTEGER NOT NULL DEFAULT 0, starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL, usage_limit INTEGER NOT NULL CHECK (usage_limit > 0), used_count INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS store_settings (id SMALLINT PRIMARY KEY DEFAULT 1, is_open BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ DEFAULT NOW());
    INSERT INTO store_settings(id,is_open) VALUES(1,TRUE) ON CONFLICT(id) DO NOTHING;
    UPDATE orders SET fulfillment='PICKUP', address='Ambil di lokasi penjualan', shipping_fee=0;
    UPDATE products SET name='Telor Gulung Sosis sapi',description='Telor gulung dengan sosis sapi',price=2000,stock=100,category='Kategori A',active=TRUE WHERE id=1;
    UPDATE products SET name='Telor Gulung Sosis ayam',description='Telor gulung dengan sosis ayam',price=2000,stock=100,category='Kategori A',active=TRUE WHERE id=2;
    UPDATE products SET name='Telor Gulung Otak-otak',description='Telor gulung isi otak-otak',price=2000,stock=100,category='Kategori A',active=TRUE WHERE id=3;
    UPDATE products SET name='Telor Gulung Basreng',description='Telor gulung isi basreng gurih',price=2000,stock=100,category='Kategori A',active=TRUE WHERE id=4;
    INSERT INTO products(name,description,price,stock,category)
      SELECT v.name,v.description,v.price,v.stock,v.category FROM (VALUES
      ('Telor Gulung Bakso','Telor gulung isi bakso',2000,100,'Kategori A'),
      ('Telor Gulung Fishroll','Telor gulung isi fishroll',2000,100,'Kategori A'),
      ('Telor Gulung Original','Telur segar, gurih, dan renyah',2000,100,'Kategori A'),
      ('Paket Hemat A (5 tusuk original)','5 tusuk telor gulung original',10000,50,'Kategori B'),
      ('Paket Hemat B (10 tusuk original)','10 tusuk telor gulung original',20000,50,'Kategori B'),
      ('Paket Pedas (5 tusuk pedas)','5 tusuk telor gulung pedas',10000,50,'Kategori B'),
      ('Paket Mix (5 tusuk campur)','5 tusuk telor gulung campuran',10000,50,'Kategori B'),
      ('Paket Rame-Rame (20 tusuk campur)','20 tusuk telor gulung campuran',40000,50,'Kategori B')
      ) AS v(name,description,price,stock,category)
      WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name=v.name);
    UPDATE products SET active=FALSE WHERE id>12;`)
  await pool.query(`INSERT INTO admins(name,email,password_hash,role) VALUES('Restu Nurbahri',$1,$2,'SUPER_ADMIN') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash, name=EXCLUDED.name, role='SUPER_ADMIN'`, ['restunurbahri01@gmail.com', adminPasswordHash])
  const { rows: settings } = await pool.query('SELECT is_open FROM store_settings WHERE id=1')
  storeOpen = settings[0]?.is_open ?? true
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: pool ? 'configured' : 'not_configured' }))
app.get('/api/products', async (_req, res) => {
  if (pool) { const { rows } = await pool.query('SELECT * FROM products WHERE active = TRUE ORDER BY id'); return res.json(rows) }
  res.json(catalog)
})
app.get('/api/vouchers', async (_req, res) => {
  const now = new Date()
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM vouchers WHERE active=TRUE AND starts_at<=NOW() AND expires_at>=NOW() AND used_count<usage_limit ORDER BY created_at DESC')
    return res.json(rows)
  }
  res.json(vouchers.filter(v => v.active && new Date(v.startsAt) <= now && new Date(v.expiresAt) >= now && (v.usedCount || 0) < v.usageLimit).map(v => ({code:v.code,description:v.description,discount_type:v.discountType,discount_value:v.discountValue,minimum_subtotal:v.minimumSubtotal,starts_at:v.startsAt,expires_at:v.expiresAt,usage_limit:v.usageLimit,used_count:v.usedCount || 0})))
})
app.get('/api/vouchers/:code', async (req, res) => {
  const code = String(req.params.code || '').toUpperCase().trim()
  if (pool) { const { rows } = await pool.query('SELECT * FROM vouchers WHERE upper(code)=upper($1)', [code]); const voucher=rows[0]; if (!voucher || !voucher.active || new Date(voucher.starts_at)>new Date() || new Date(voucher.expires_at)<new Date() || voucher.used_count>=voucher.usage_limit) return res.status(404).json({message:'Voucher tidak tersedia'}); return res.json(voucher) }
  const voucher=vouchers.find(v=>v.code.toUpperCase()===code); if(!voucher || !voucher.active || new Date(voucher.startsAt)>new Date() || new Date(voucher.expiresAt)<new Date() || (voucher.usedCount||0)>=voucher.usageLimit) return res.status(404).json({message:'Voucher tidak tersedia'}); res.json({code:voucher.code,description:voucher.description,discount_type:voucher.discountType,discount_value:voucher.discountValue,minimum_subtotal:voucher.minimumSubtotal,starts_at:voucher.startsAt,expires_at:voucher.expiresAt,usage_limit:voucher.usageLimit,used_count:voucher.usedCount||0,active:voucher.active})
})
app.get('/api/admin/vouchers', requireAdmin, async (_req,res) => { if(pool){const {rows}=await pool.query('SELECT * FROM vouchers ORDER BY created_at DESC');return res.json(rows)} res.json(vouchers) })
app.post('/api/admin/vouchers', requireAdmin, async (req,res) => {
  const {code,description='',discountType,discountValue,minimumSubtotal=0,startsAt,expiresAt,usageLimit=1,active=true}=req.body||{}
  const normalized=String(code||'').trim().toUpperCase()
  if(!normalized || !['FIXED','PERCENT'].includes(discountType) || Number(discountValue)<=0 || !startsAt || !expiresAt || Number(usageLimit)<=0) return res.status(400).json({message:'Data voucher tidak lengkap atau tidak valid'})
  if(discountType==='PERCENT' && Number(discountValue)>100) return res.status(400).json({message:'Persentase diskon maksimal 100%'})
  if(new Date(expiresAt)<=new Date(startsAt)) return res.status(400).json({message:'Tanggal berakhir harus setelah tanggal mulai'})
  if(pool){try{const {rows}=await pool.query(`INSERT INTO vouchers(code,description,discount_type,discount_value,minimum_subtotal,starts_at,expires_at,usage_limit,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[normalized,description,discountType,Number(discountValue),Number(minimumSubtotal),startsAt,expiresAt,Number(usageLimit),Boolean(active)]);return res.status(201).json(rows[0])}catch(error){if(error.code==='23505')return res.status(409).json({message:'Kode voucher sudah digunakan'});throw error}}
  if(vouchers.some(v=>v.code.toUpperCase()===normalized))return res.status(409).json({message:'Kode voucher sudah digunakan'})
  const voucher={id:Date.now(),code:normalized,description,discountType,discountValue:Number(discountValue),minimumSubtotal:Number(minimumSubtotal),startsAt,expiresAt,usageLimit:Number(usageLimit),usedCount:0,active:Boolean(active)};vouchers.push(voucher);saveFallbackState();res.status(201).json(voucher)
})
app.delete('/api/admin/vouchers/:id',requireAdmin,async(req,res)=>{
  const id=String(req.params.id)
  if(pool){const {rowCount}=await pool.query('DELETE FROM vouchers WHERE id=$1',[id]);if(!rowCount)return res.status(404).json({message:'Voucher tidak ditemukan'})}
  else{const before=vouchers.length;vouchers=vouchers.filter(v=>String(v.id)!==id&&v.code!==id.toUpperCase());if(vouchers.length===before)return res.status(404).json({message:'Voucher tidak ditemukan'})}
  if(!pool)saveFallbackState()
  res.json({message:'Voucher berhasil dihapus'})
})
app.get('/api/store/status',async(_req,res)=>{if(pool){const {rows}=await pool.query('SELECT is_open FROM store_settings WHERE id=1');storeOpen=rows[0]?.is_open??true}res.json({isOpen:Boolean(storeOpen)})})
app.patch('/api/admin/store/status',requireAdmin,async(req,res)=>{const isOpen=Boolean(req.body?.isOpen);if(pool)await pool.query('UPDATE store_settings SET is_open=$1,updated_at=NOW() WHERE id=1',[isOpen]);storeOpen=isOpen;if(!pool)saveFallbackState();io.emit('store:status',{isOpen:storeOpen});res.json({isOpen:storeOpen})})
app.post('/api/auth/register/request-code', async (req, res) => {
  const { name, phone='', email='', password='' } = req.body || {}
  const normalizedEmail=String(email).trim().toLowerCase()
  if(!name || !/^628\d{8,12}$/.test(String(phone||'')) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail) || String(password).length<8) return res.status(400).json({message:'Nama, nomor WhatsApp, Gmail, dan password 8+ karakter wajib diisi'})
  if(pool){const {rows}=await pool.query('SELECT id FROM customers WHERE lower(email)=lower($1) LIMIT 1',[normalizedEmail]);if(rows[0])return res.status(409).json({message:'Email sudah terdaftar'})}
  else if(customerUsers.has(normalizedEmail))return res.status(409).json({message:'Email sudah terdaftar'})
  const passwordHash=await bcrypt.hash(password,12)
  const code=String(Math.floor(100000+Math.random()*900000))
  verificationCodes.set(normalizedEmail,{name,phone,email:normalizedEmail,passwordHash,code,expiresAt:Date.now()+10*60*1000})
  try { const delivery=await sendVerificationEmail(normalizedEmail,code); res.status(200).json({message:'Kode verifikasi dikirim ke Gmail',...delivery}) } catch(error){res.status(500).json({message:'Kode belum dapat dikirim. Periksa konfigurasi Gmail pengirim.'})}
})
app.post('/api/auth/register/verify', async (req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(), code=String(req.body?.code||'').trim()
  const pending=verificationCodes.get(email)
  if(!pending || pending.expiresAt<Date.now())return res.status(400).json({message:'Kode verifikasi tidak valid atau sudah kedaluwarsa'})
  if(pending.code!==code)return res.status(400).json({message:'Kode verifikasi salah'})
  let customer
  if(pool){try{const {rows}=await pool.query(`INSERT INTO customers(name,phone,email,password_hash,verified) VALUES($1,$2,$3,$4,TRUE) RETURNING id,name,phone,email,verified`,[pending.name,pending.phone,pending.email,pending.passwordHash]);customer=rows[0]}catch(error){if(error.code==='23505')return res.status(409).json({message:'Email atau nomor WhatsApp sudah terdaftar'});throw error}}
  else{customer={id:Date.now(),name:pending.name,phone:pending.phone,email:pending.email,verified:true,passwordHash:pending.passwordHash};customerUsers.set(email,customer);saveFallbackState()}
  verificationCodes.delete(email)
  const publicCustomer={id:customer.id,name:customer.name,email:customer.email||email,phone:customer.phone,verified:true}
  const token=jwt.sign(publicCustomer,process.env.JWT_SECRET||'development-change-me',{expiresIn:'30d'})
  res.cookie('customer_token',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*24*60*60*1000}).json(publicCustomer)
})
app.post('/api/auth/login', async(req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(), password=String(req.body?.password||'')
  if(!email||!password)return res.status(400).json({message:'Email dan password wajib diisi'})
  let customer
  if(pool){const {rows}=await pool.query('SELECT id,name,phone,email,password_hash,verified,photo_path FROM customers WHERE lower(email)=lower($1) LIMIT 1',[email]);customer=rows[0]}
  else customer=customerUsers.get(email)
  if(!customer)return res.status(401).json({message:'Email atau password salah'})
  if(pool&&!customer.verified)return res.status(403).json({message:'Akun belum terverifikasi'})
  const hash=pool?customer.password_hash:customer.passwordHash
  if(!hash||!(await bcrypt.compare(password,hash)))return res.status(401).json({message:'Email atau password salah'})
  const user={id:customer.id,name:customer.name,email:customer.email||email,phone:customer.phone,photoPath:pool?(customer.photo_path||null):(customer.photoPath||null)}
  const token=jwt.sign(user,process.env.JWT_SECRET||'development-change-me',{expiresIn:'30d'})
  res.cookie('customer_token',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*24*60*60*1000}).json(user)
})
function requireCustomer(req,res,next){try{const token=req.cookies?.customer_token;if(!token)return res.status(401).json({message:'Belum login'});req.customer=jwt.verify(token,process.env.JWT_SECRET||'development-change-me');next()}catch{return res.status(401).json({message:'Sesi login kedaluwarsa'})}}
app.get('/api/auth/session',requireCustomer,(req,res)=>res.json(req.customer))
app.patch('/api/account/profile',requireCustomer,paymentUpload.single('photo'),async(req,res)=>{
  const name=String(req.body?.name||req.customer.name||'').trim()
  const phone=String(req.body?.phone||req.customer.phone||'').trim()
  if(!name||!/^628\d{8,12}$/.test(phone))return res.status(400).json({message:'Nama dan nomor WhatsApp 628... wajib diisi'})
  const photoPath=req.file?`/uploads/${req.file.filename}`:(req.customer.photoPath||null)
  if(pool){await pool.query('UPDATE customers SET name=$1,phone=$2,photo_path=$3 WHERE lower(email)=lower($4)',[name,phone,photoPath,req.customer.email])}
  else{const customer=customerUsers.get(req.customer.email.toLowerCase());if(customer){customer.name=name;customer.phone=phone;customer.photoPath=photoPath;saveFallbackState()}}
  const customer={id:req.customer.id,name,email:req.customer.email,phone,photoPath}
  const token=jwt.sign(customer,process.env.JWT_SECRET||'development-change-me',{expiresIn:'30d'})
  res.cookie('customer_token',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*24*60*60*1000}).json(customer)
})
app.post('/api/auth/logout',(_req,res)=>res.clearCookie('customer_token').json({message:'Logout berhasil'}))
function requireAdmin(req,res,next){
  try{const token=req.cookies?.admin_token; if(!token)return res.status(401).json({message:'Silakan login admin'}); const admin=jwt.verify(token,process.env.JWT_SECRET||'development-change-me'); if(admin.email!=='restunurbahri01@gmail.com')return res.status(403).json({message:'Akses ditolak'}); req.admin=admin; next()}catch{return res.status(401).json({message:'Sesi admin kedaluwarsa'})}
}
app.post('/api/auth/admin/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi' })
  if(String(email).trim().toLowerCase()!=='restunurbahri01@gmail.com'||password!=='Restu123.') return res.status(401).json({message:'Email atau password salah'})
  let admin={id:1,name:'Restu Nurbahri',email:'restunurbahri01@gmail.com',role:'SUPER_ADMIN'}
  if(pool){const {rows}=await pool.query('SELECT id,name,email,role FROM admins WHERE lower(email)=lower($1) LIMIT 1',['restunurbahri01@gmail.com']);if(rows[0])admin=rows[0]}
  const token=jwt.sign(admin,process.env.JWT_SECRET||'development-change-me',{expiresIn:'8h'})
  res.cookie('admin_token',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000}).json(admin)
})
app.get('/api/auth/admin/session',requireAdmin,(req,res)=>res.json(req.admin))
app.post('/api/auth/admin/logout',(_req,res)=>{res.clearCookie('admin_token').json({message:'Logout berhasil'})})
app.post('/api/admin/setup', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ADMIN_SETUP_ENABLED !== 'true') return res.status(403).json({ message: 'Setup admin dinonaktifkan' })
  const { name, email, password } = req.body || {}
  if (!name || !email || String(password || '').length < 10) return res.status(400).json({ message: 'Nama, email, dan password 10+ karakter wajib diisi' })
  const passwordHash = await bcrypt.hash(password, 12)
  if (pool) { try { const { rows } = await pool.query(`INSERT INTO admins(name,email,password_hash,role) VALUES($1,$2,$3,'SUPER_ADMIN') RETURNING id,name,email,role`, [name,email,passwordHash]); return res.status(201).json(rows[0]) } catch (error) { if (error.code === '23505') return res.status(409).json({ message: 'Admin sudah terdaftar' }); throw error } }
  if (admins.size) return res.status(409).json({ message: 'Admin sudah terdaftar' }); admins.set(email, { name, passwordHash, role: 'SUPER_ADMIN' }); res.status(201).json({ name, email, role: 'SUPER_ADMIN' })
})
app.post('/api/checkout', async (req, res) => {
  const { customer, items, paymentMethod, voucherCode } = req.body || {}
  let loggedCustomer=null
  try{if(req.cookies?.customer_token)loggedCustomer=jwt.verify(req.cookies.customer_token,process.env.JWT_SECRET||'development-change-me')}catch{}
  if(!customer) return res.status(400).json({message:'Data pelanggan tidak valid'})
  if(loggedCustomer){customer.name=customer.name||loggedCustomer.name;customer.phone=customer.phone||loggedCustomer.phone}
  const customerEmail=loggedCustomer?.email||String(customer.email||'').trim().toLowerCase()||null
  if(!storeOpen)return res.status(403).json({message:'Maaf, toko sedang tutup dan belum menerima pesanan'})
  if (!customer?.name || !/^628\d{8,12}$/.test(customer.phone || '') || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Data pelanggan atau item pesanan tidak valid' })
  const catalogMap = new Map(catalog.map(p => [p.id, p]))
  let subtotal = 0
  for (const item of items) { const product = catalogMap.get(Number(item.productId)); if (!product || !Number.isInteger(item.quantity) || item.quantity < 1) return res.status(400).json({ message: 'Produk atau jumlah tidak valid' }); subtotal += product.price * item.quantity }
  let safeDiscount = 0
  let appliedVoucher = null
  const code = String(voucherCode || '').trim().toUpperCase()
  if (code) {
    let voucher
    if (pool) { const { rows } = await pool.query('SELECT * FROM vouchers WHERE upper(code)=upper($1) FOR UPDATE', [code]); voucher = rows[0] }
    else voucher = vouchers.find(v => v.code.toUpperCase() === code)
    if (!voucher || !voucher.active) return res.status(400).json({ message: 'Kode voucher tidak valid atau tidak aktif' })
    if (new Date(voucher.starts_at || voucher.startsAt) > new Date() || new Date(voucher.expires_at || voucher.expiresAt) < new Date()) return res.status(400).json({ message: 'Voucher belum berlaku atau sudah kedaluwarsa' })
    if (subtotal < Number(voucher.minimum_subtotal ?? voucher.minimumSubtotal ?? 0)) return res.status(400).json({ message: `Minimum belanja voucher ${rupiah(Number(voucher.minimum_subtotal ?? voucher.minimumSubtotal ?? 0))}` })
    if (Number(voucher.used_count ?? voucher.usedCount) >= Number(voucher.usage_limit ?? voucher.usageLimit)) return res.status(400).json({ message: 'Voucher sudah mencapai batas penggunaan' })
    safeDiscount = voucher.discount_type === 'PERCENT' || voucher.discountType === 'PERCENT' ? Math.floor(subtotal * Number(voucher.discount_value ?? voucher.discountValue) / 100) : Number(voucher.discount_value ?? voucher.discountValue)
    safeDiscount = Math.min(safeDiscount, subtotal)
    appliedVoucher = voucher.code || voucherCode
  }
  const total = subtotal - safeDiscount
  if (!['QRIS','COD'].includes(paymentMethod)) return res.status(400).json({ message: 'Metode pembayaran tidak valid' })
  const namedItems = items.map(item=>{const product=catalogMap.get(Number(item.productId));return{productId:Number(item.productId),name:product?.name||`Produk #${item.productId}`,quantity:item.quantity}})
  const order = { id: Date.now(), number: '', customer: customer.name, phone: customer.phone, customerEmail: customerEmail, address: 'Ambil di lokasi penjualan', fulfillment: 'PICKUP', paymentMethod, subtotal, shippingFee: 0, discount: safeDiscount, voucherCode: appliedVoucher, total, status: 'WAITING_CONFIRMATION', items:namedItems, createdAt: new Date().toISOString() }
  if (pool) { const client = await pool.connect(); try { await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ'); await client.query('SELECT pg_advisory_xact_lock(7312026)'); const sequence=await client.query(`SELECT COALESCE(MAX(CASE WHEN number ~ '^\\d+$' THEN CAST(number AS INTEGER) ELSE 0 END),0) AS max FROM orders`); order.number=String(Number(sequence.rows[0].max)+1).padStart(3,'0'); const created = await client.query(`INSERT INTO orders(number,customer_name,phone,address,fulfillment,payment_method,subtotal,shipping_fee,discount,voucher_code,total,customer_email) VALUES($1,$2,$3,$4,'PICKUP',$5,$6,0,$7,$8,$9,$10) RETURNING *`, [order.number,order.customer,order.phone,order.address,order.paymentMethod,subtotal,safeDiscount,appliedVoucher,total,customerEmail]); if (appliedVoucher) await client.query('UPDATE vouchers SET used_count=used_count+1 WHERE upper(code)=upper($1) AND used_count<usage_limit AND active=TRUE',[appliedVoucher]); for (const item of items) { const product = await client.query('SELECT id,price,stock FROM products WHERE id=$1 AND active=TRUE FOR UPDATE',[item.productId]); if (!product.rows[0] || product.rows[0].stock < item.quantity) throw Object.assign(new Error('Stok tidak mencukupi'), { status: 409 }); await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2',[item.quantity,item.productId]); await client.query('INSERT INTO order_items(order_id,product_id,quantity,unit_price,subtotal) VALUES($1,$2,$3,$4,$5)',[created.rows[0].id,item.productId,item.quantity,product.rows[0].price,product.rows[0].price*item.quantity]) } await client.query('COMMIT'); order.id=created.rows[0].id } catch (error) { await client.query('ROLLBACK'); if (error.status) return res.status(error.status).json({ message: error.message }); throw error } finally { client.release() }     } else { order.number=nextOrderNumber(); if (appliedVoucher) { const voucher=vouchers.find(v=>v.code.toUpperCase()===appliedVoucher.toUpperCase()); if(voucher)voucher.usedCount=(voucher.usedCount||0)+1 } orders.push(order);saveFallbackState() }
  if (paymentMethod === 'QRIS') { order.qrCode = '/qris-bang-bewok.png'; order.expiresAt = Date.now() + 5 * 60 * 1000 }
  io.emit('order:new', order); io.emit('order:status', order); res.status(201).json(order)
})
app.post('/api/orders/:number/payment-proof', paymentUpload.single('proof'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Foto bukti pembayaran wajib JPG, PNG, atau WebP maksimal 5 MB' })
  const proofUrl = `/uploads/${req.file.filename}`
  let order
  if (pool) {
    const { rows } = await pool.query(`UPDATE orders SET payment_proof_path=$1,payment_proof_uploaded_at=NOW() WHERE number=$2 RETURNING id,number,customer_name AS customer,phone,address,payment_method AS "paymentMethod",total,status,payment_proof_path AS "paymentProof"`, [proofUrl, req.params.number])
    if (!rows[0]) return res.status(404).json({ message: 'Pesanan tidak ditemukan' })
    order = rows[0]
  } else {
    order = orders.find(item => item.number === req.params.number)
    if (!order) return res.status(404).json({ message: 'Pesanan tidak ditemukan' })
    order.paymentProof = proofUrl
    saveFallbackState()
  }
  io.emit('order:payment-proof', { ...order, paymentProof: proofUrl })
  res.status(201).json({ message: 'Bukti pembayaran berhasil diunggah', paymentProof: proofUrl, order })
})

app.get('/api/account/orders', requireCustomer, async (req,res)=>{
  if(!pool)return res.json(orders.filter(o=>o.customerEmail===req.customer.email).map(o=>({...o,queueNumber:o.status==='COMPLETED'||o.status==='CANCELLED'?0:orders.filter(x=>x.status!=='COMPLETED'&&x.status!=='CANCELLED'&&new Date(x.createdAt)<=new Date(o.createdAt)).length})))
  const {rows}=await pool.query(`SELECT o.number,o.customer_name AS customer,o.phone,o.address,o.fulfillment,o.payment_method AS "paymentMethod",o.subtotal,o.shipping_fee AS "shippingFee",o.discount,o.voucher_code AS "voucherCode",o.total,o.status,o.payment_proof_path AS "paymentProof",o.created_at AS "createdAt", (SELECT COUNT(*)::int FROM orders active WHERE active.status NOT IN ('COMPLETED','CANCELLED') AND active.created_at <= o.created_at) AS "queueNumber", COALESCE(json_agg(json_build_object('productId',oi.product_id,'name',COALESCE(p.name,'Produk #' || oi.product_id),'quantity',oi.quantity,'unitPrice',oi.unit_price,'subtotal',oi.subtotal)) FILTER (WHERE oi.id IS NOT NULL),'[]') AS items FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id WHERE lower(o.customer_email)=lower($1) GROUP BY o.id ORDER BY o.created_at DESC`,[req.customer.email])
  res.json(rows)
})
app.get('/api/orders/:phone', async (req, res) => {
  if (!pool) return res.json(orders.filter(o => o.phone === req.params.phone).map(o=>({...o,queueNumber:o.status==='COMPLETED'||o.status==='CANCELLED'?0:orders.filter(x=>x.status!=='COMPLETED'&&x.status!=='CANCELLED'&&new Date(x.createdAt)<=new Date(o.createdAt)).length})))
  const { rows } = await pool.query(`SELECT o.number,o.customer_name AS customer,o.phone,o.address,o.fulfillment,o.payment_method AS "paymentMethod",o.subtotal,o.shipping_fee AS "shippingFee",o.discount,o.voucher_code AS "voucherCode",o.total,o.status,o.payment_proof_path AS "paymentProof",o.created_at AS "createdAt", (SELECT COUNT(*)::int FROM orders active WHERE active.status NOT IN ('COMPLETED','CANCELLED') AND active.created_at <= o.created_at) AS "queueNumber", COALESCE(json_agg(json_build_object('productId',oi.product_id,'name',COALESCE(p.name,'Produk #' || oi.product_id),'quantity',oi.quantity,'unitPrice',oi.unit_price,'subtotal',oi.subtotal)) FILTER (WHERE oi.id IS NOT NULL),'[]') AS items FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id WHERE o.phone=$1 GROUP BY o.id ORDER BY o.created_at DESC`, [req.params.phone])
  res.json(rows)
})
app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  if (!pool) return res.json([...orders].reverse().map(o=>({...o,queueNumber:orders.filter(x=>x.status!=='COMPLETED'&&x.status!=='CANCELLED'&&new Date(x.createdAt)<=new Date(o.createdAt)).length})))
  const { rows } = await pool.query(`SELECT o.id,o.number,o.customer_name AS customer,o.phone,o.address,o.fulfillment,o.payment_method AS "paymentMethod",o.subtotal,o.shipping_fee AS "shippingFee",o.discount,o.voucher_code AS "voucherCode",o.total,o.status,o.payment_proof_path AS "paymentProof",o.created_at AS "createdAt",(SELECT COUNT(*)::int FROM orders active WHERE active.status NOT IN ('COMPLETED','CANCELLED') AND active.created_at <= o.created_at) AS "queueNumber",COALESCE(json_agg(json_build_object('productId',oi.product_id,'name',COALESCE(p.name,'Produk #' || oi.product_id),'quantity',oi.quantity,'unitPrice',oi.unit_price,'subtotal',oi.subtotal)) FILTER (WHERE oi.id IS NOT NULL),'[]') AS items FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id GROUP BY o.id ORDER BY o.created_at DESC`)
  res.json(rows)
})
app.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
  let source = orders
  if (pool) {
    const { rows } = await pool.query('SELECT number,total,status FROM orders')
    source = rows.map(row => ({ total: Number(row.total), status: row.status }))
  }
  res.json({ revenueToday: source.reduce((sum,o) => sum + Number(o.total),0), revenueMonth: source.reduce((sum,o) => sum + Number(o.total),0), transactions: source.length, newOrders: source.filter(o => o.status === 'WAITING_CONFIRMATION').length, processingOrders: source.filter(o => ['ACCEPTED','PROCESSING','PREPARING'].includes(o.status)).length, customers: new Set(source.map(o => o.phone)).size, topProducts: catalog.slice(0,4).map(p => ({ name:p.name, sold:0 })), sales: [{name:'Sen',total:0},{name:'Sel',total:0},{name:'Rab',total:0},{name:'Kam',total:0},{name:'Jum',total:0},{name:'Sab',total:0},{name:'Min',total:0}] })
})
app.patch('/api/orders/:number/status', requireAdmin, async (req, res) => {
  const statuses=['WAITING_CONFIRMATION','ACCEPTED','PROCESSING','PREPARING','READY','COMPLETED','CANCELLED']
  const { status }=req.body||{}
  if(!statuses.includes(status)) return res.status(400).json({message:'Status tidak valid'})
  if (pool) {
    const { rows }=await pool.query('UPDATE orders SET status=$1 WHERE number=$2 RETURNING number,status', [status,req.params.number])
    if (!rows[0]) return res.status(404).json({message:'Pesanan tidak ditemukan'})
    io.emit('order:status',rows[0])
    return res.json(rows[0])
  }
  const order=orders.find(o=>o.number===req.params.number)
  if(!order)return res.status(404).json({message:'Pesanan tidak ditemukan'})
  order.status=status; if(!pool)saveFallbackState(); io.emit('order:status',order); res.json(order)
})

const clientDistDirectory = path.resolve(__dirname, '..', 'client', 'dist')
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistDirectory)) {
  app.use(express.static(clientDistDirectory, {
    maxAge: '1h',
    index: false
  }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/socket.io/')) {
      return next()
    }
    if (req.accepts('html')) {
      return res.sendFile(path.join(clientDistDirectory, 'index.html'))
    }
    return next()
  })
}

io.on('connection', socket => socket.emit('connected', { message: 'Realtime aktif' }))
const port = Number(process.env.PORT || 4000)
initDatabase().then(() => httpServer.listen(port, '0.0.0.0', () => console.log(`Server aktif di http://0.0.0.0:${port}`))).catch(error => { console.error('Database gagal dimuat:', error.message); httpServer.listen(port, '0.0.0.0', () => console.log(`Server aktif tanpa database di http://0.0.0.0:${port}`)) })
