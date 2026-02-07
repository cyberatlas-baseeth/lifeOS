# LifeOS - Task Tracker

## Proje Özeti

**LifeOS**, kişisel hayat verilerini takip eden, analiz eden ve dinamik bir dijital avatar üreten modern bir Next.js web uygulamasıdır.

### Temel Özellikler
- **6 Çekirdek Metrik**: Health, Psychology, Net Worth, Income, Expenses, Investments
- **MetaMask Authentication**: Web3 tabanlı kimlik doğrulama
- **Supabase Backend**: PostgreSQL veritabanı ile RLS güvenliği
- **TRY/USD Döviz Desteği**: Canlı MoneyConvert API entegrasyonu
- **Dinamik Avatar**: Metriklere göre değişen görsel durum

---

## ✅ TAMAMLANAN GÖREVLER

### Health Module
- [x] Health score hesaplama sistemi (sleep 0.40, activity 0.30, nutrition 0.30)
- [x] Sleep dropdown seçenekleri (4.5-10.5 saat aralığı)
- [x] Activity level 1-5 skalası (Level 4 = ideal/100, Level 5 = yüksek stres/80)
- [x] Nutrition scoring (meal quality, water intake, processed food penalty)
- [x] Illness penalty sistemi (none/mild/severe)
- [x] Overtraining penalty (-15 puan, 3 gün üst üste level 5)
- [x] Active recovery bonus (+5 puan)
- [x] Recovery state tracking (normal/recovering/recovered)
- [x] Health entry düzenleme (edit) fonksiyonu
- [x] Health entry silme fonksiyonu
- [x] TimeSeriesChart ile görselleştirme

### Psychology Module
- [x] Mental score hesaplama sistemi
- [x] Stress level dropdown (calm/mild/high)
- [x] Motivation level dropdown (high/medium/low)
- [x] Mental fatigue dropdown (fresh/tired/exhausted)
- [x] Notes alanı kaldırıldı
- [x] Psychology entry edit/delete fonksiyonları
- [x] Mental state label fonksiyonu (Excellent/Good/Fair/Low/Critical)

### Finance Modules

#### Income
- [x] Regular/Additional kategorileri
- [x] Tag sistemi (salary, crypto)
- [x] Description alanı kaldırıldı
- [x] TRY/USD currency conversion
- [x] Exchange rate kaydı

#### Expenses
- [x] Fixed/Variable kategorileri
- [x] TRY/USD currency conversion
- [x] Exchange rate kaydı
- [x] LiveExchangeRate badge

#### Investments (Claim-Based Lifecycle - NEW!)
- [x] Claim-based investment model implementasyonu
- [x] Active/Claimed durum yönetimi
- [x] Active investments: Locked Capital olarak Net Worth'ten düşülür
- [x] Claimed investments: Principal + Realized P/L Net Worth'e eklenir
- [x] Notes alanı kaldırıldı
- [x] Claim modal ile realized P/L girişi
- [x] Active/Claimed tabs UI
- [x] Locked Capital istatistik kartı
- [x] Migration SQL script oluşturuldu

#### Net Worth
- [x] Read-only derived metric (artık manuel giriş yok)
- [x] Yeni formül: Income - Expenses - LockedCapital + RealizedReturns
- [x] Investment Effect on Net Worth bölümü
- [x] Locked Capital / Realized Returns ayrıştırması
- [x] Cumulative snapshots ile time-series
- [x] LiveExchangeRate badge entegrasyonu

### Currency System
- [x] MoneyConvert API entegrasyonu
- [x] 15 dakikalık cache sistemi
- [x] Fallback rate (36.5 TRY/USD)
- [x] LiveExchangeRate component
- [x] formatTRY, formatUSD helper fonksiyonları

### UI/UX
- [x] Dark mode desteği
- [x] Theme toggle
- [x] Turkish to English translation
- [x] Lucide React icons
- [x] Tailwind CSS styling
- [x] Responsive layout
- [x] Loading states (Loader2 spinner)
- [x] Tooltip/Info modals

### Infrastructure
- [x] Next.js 16 App Router
- [x] Supabase client configuration
- [x] MetaMask wallet authentication
- [x] Row Level Security (RLS)
- [x] TypeScript types (database.ts)

---

## 🔄 DEVAM EDEN GÖREVLER

### High Priority
- [ ] Avatar state hesaplama sisteminin tamamen implemente edilmesi
- [ ] Dashboard'da tüm metriklerin görselleştirilmesi
- [ ] Alert/notification sistemi

### Medium Priority
- [ ] Income/Expenses/Investments sayfalarına edit fonksiyonu ekleme
- [ ] Veri export/import özelliği
- [ ] Grafiklerde zaman aralığı filtreleme (7 gün, 30 gün, 90 gün)

### Low Priority
- [ ] Goal setting ve tracking modülü
- [ ] Mobile responsive iyileştirmeleri
- [ ] Performance optimizasyonları

---

## 📋 PLANLANAN ÖZELLİKLER (BACKLOG)

### Phase 1 - Core Improvements
- [ ] AI/LLM entegrasyonu (kişiselleştirilmiş öneriler)
- [ ] Trend analizi ve tahminleme
- [ ] Weekly/Monthly summary raporları

### Phase 2 - Integrations
- [ ] Fitness tracker entegrasyonları (Apple Health, Google Fit)
- [ ] Bank API entegrasyonu
- [ ] ENS support (display names)

### Phase 3 - Platform Expansion
- [ ] Mobile app (React Native)
- [ ] Notification sistemi (push/email)
- [ ] Social features (karşılaştırma, paylaşım)

---

## 🏗️ Teknik Notlar

### Database Schema
- `wallet_nonces` - MetaMask auth nonce
- `profiles` - User profiles
- `health_metrics` - Health data
- `psychology_metrics` - Mental state data
- `net_worth` - Legacy (artık derived)
- `income` - Income records
- `expenses` - Expense records
- `investments` - Investment records

### Key Files
- `src/lib/healthScore.ts` - Health scoring engine
- `src/lib/mentalScore.ts` - Mental scoring engine
- `src/lib/currency.ts` - Currency conversion
- `src/lib/networth-calculator.ts` - Net worth calculation
- `src/types/database.ts` - TypeScript type definitions

### API Endpoints
- MoneyConvert API: `https://cdn.moneyconvert.net/api/latest.json`

---

## 📝 Son Güncellemeler

**2026-02-07**
- Net Worth sayfası read-only derived metric olarak yeniden tasarlandı
- Income'dan description alanı kaldırıldı, tag sistemi zorunlu hale getirildi
- LiveExchangeRate component eklendi
- Package-lock.json eklendi

**2026-02-04**
- Health entry edit fonksiyonu eklendi

**2026-02-03**
- Health score ağırlıkları güncellendi (0.40/0.30/0.30)

**2026-02-01**
- Psychology modülü dropdown'lara geçirildi ve mental score hesaplama eklendi
