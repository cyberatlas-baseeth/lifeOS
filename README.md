# LifeOS — Digital Life Tracker 🧬

A modern, full-stack web application that tracks your personal life metrics across health, finance, and goals — generating a dynamic digital avatar that reflects your real-life state.

## ✨ Features

### 🏥 Health Tracking (7-Category Scoring System)
Comprehensive health monitoring with a weighted score out of 100:

| Category | Weight | Metrics |
|----------|--------|---------|
| Sleep Duration | 10% | Hours slept (4.5h – 10.5h) |
| Sleep Timing & Regularity | 15% | Bedtime (21:00–02:00+), consistency |
| Physical Activity | 20% | 5-level activity scale |
| Nutrition | 20% | Meal quality, processed food level |
| Hydration | 10% | Water intake level |
| Mental State | 15% | Stress, motivation, fatigue |
| Extras | 10% | Alcohol, smoking, screen time |

- **Illness penalty** applied as a modifier after weighted calculation (mild: -10, severe: -25)
- Health states: **Excellent** (85+), **Good** (70+), **Fair** (50+), **Low** (30+), **Critical** (<30)

### 💰 Financial Tracking (Dual Currency: TRY / USD)
All financial data is stored in both **TRY** (primary) and **USD** (secondary) with live exchange rates from MoneyConvert API.

- **Income**: Regular (salary) and additional (crypto) income tracking with tag-based categorization
- **Expenses**: Tag-based system — Rent, Bills, Food, Transportation, Entertainment, Subscriptions, Shopping, Lifestyle, Family Support
- **Investments**: Claim-based portfolio tracking — Crypto, Gold, Stocks, Forex, Real Estate, Funds, Bonds, Other
  - Active investments: locked capital tracked as outflow
  - Claimed investments: capital + realized P/L added back
- **Net Worth**: Auto-calculated from `Income - Expenses - Active Investments + Claimed Returns`

### 🎯 Target Assets
Goal tracking with category-based organization:
- **Categories**: Tech, House, Car, Travel, Other
- **Progress**: Calculated against current net worth
- **Formatting**: Dot-separated thousand formatting for easy reading

### 🤖 Dynamic Avatar
- Visual state that changes based on your metrics
- Energy, morale, and balance scores
- 6 different states: **Thriving**, **Energetic**, **Stable**, **Tired**, **Stressed**, **Critical**

### 📈 Analysis & Visualization
- Time-series charts (Recharts)
- Automatic alerts and recommendations
- Trend analysis across all metric categories

### ✏️ Full CRUD Operations
- **Add / Edit / Delete** entries across all modules (Health, Income, Expenses, Investments, Targets)
- Inline editing with form pre-population
- Error handling and user feedback on all operations

### 🔐 Security
- Web3 authentication with **MetaMask**
- Wallet-based identity (no passwords)
- Row Level Security (RLS) on Supabase — each user can only see their own data

---

## 🚀 Setup

### 1. Clone the Repository

```bash
git clone https://github.com/cyberatlas-baseeth/lifeOS.git
cd lifeOS
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run:
   - `supabase/schema.sql` — Base schema
   - `supabase/migration_health_restructure.sql` — Extended health fields
   - `supabase/migration_expenses_tag_based.sql` — Tag-based expenses
   - `supabase/migration_investments_claim_based.sql` — Claim-based investments
   - `supabase/migration_target_assets.sql` — Target assets
   - `supabase/migration_add_shopping_tag.sql` — Shopping tag

### 3. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
lifeos/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout
│   │   ├── login/                  # MetaMask login page
│   │   └── dashboard/
│   │       ├── page.tsx            # Main dashboard (overview)
│   │       ├── layout.tsx          # Dashboard sidebar & navigation
│   │       ├── health/             # Health metrics (7-category scoring)
│   │       ├── income/             # Income tracking (regular + additional)
│   │       ├── expenses/           # Expense tracking (tag-based)
│   │       ├── investments/        # Investment portfolio (claim-based)
│   │       ├── networth/           # Net worth calculator
│   │       └── targets/            # Target assets & goals
│   ├── components/
│   │   ├── avatar/                 # Dynamic avatar component
│   │   ├── charts/                 # TimeSeriesChart (Recharts)
│   │   └── ui/                     # AlertBanner, shared UI
│   ├── lib/
│   │   ├── supabase/               # Supabase client setup
│   │   ├── wallet/                 # WalletContext (MetaMask auth)
│   │   ├── avatar/                 # Avatar state calculation
│   │   ├── theme/                  # Theme configuration
│   │   ├── healthScore.ts          # 7-category weighted health scoring
│   │   ├── mentalScore.ts          # Mental state calculation
│   │   ├── networth-calculator.ts  # Net worth from all financial sources
│   │   ├── currency.ts             # TRY/USD conversion & formatting
│   │   ├── clsx.ts                 # Conditional class names utility
│   │   └── utils.ts                # General helpers
│   └── types/
│       └── database.ts             # All TypeScript interfaces & types
├── supabase/
│   ├── schema.sql                  # Base database schema
│   ├── migration_health_restructure.sql
│   ├── migration_expenses_tag_based.sql
│   ├── migration_investments_claim_based.sql
│   ├── migration_target_assets.sql
│   └── migration_add_shopping_tag.sql
├── tailwind.config.ts              # Custom green/white theme
├── package.json
└── tsconfig.json
```

---

## 🎨 Technical Details

### Tech Stack
| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5.7 |
| **UI** | React 19 |
| **Styling** | Tailwind CSS 3.4 + Custom CSS (white & green theme) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | MetaMask (Web3) via ethers.js |
| **Charts** | Recharts 2.15 |
| **Icons** | Lucide React |
| **Date Utils** | date-fns |
| **Exchange Rates** | MoneyConvert API (live, cached 15 min) |

### Design System
- **Theme**: White & green color palette with glassmorphism effects
- **Animations**: Float, pulse-slow, glow keyframe animations
- **Layout**: Responsive sidebar navigation with 7 dashboard modules

### Health Score Calculation

```
Final Score = Σ(Category Score × Weight) - Illness Penalty

Categories:
  Sleep Duration (10%) + Sleep Timing (15%) + Activity (20%)
  + Nutrition (20%) + Hydration (10%) + Mental State (15%)
  + Extras (10%) = 100%

Illness Penalty: None (0), Mild (-10), Severe (-25)
```

### Net Worth Calculation

```
Net Worth = Total Income
          - Total Expenses
          - Σ(Active Investments.invested_try)
          + Σ(Claimed Investments.invested_try + realized_pl_try)
```

---

## 🚢 Deploy to Vercel

1. Sign in to [Vercel](https://vercel.com) with your account
2. **New Project** → Select your GitHub repository
3. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**

---

## 🔮 Future Development

- [ ] AI/LLM integration for personalized recommendations
- [ ] Mobile app (React Native)
- [ ] Data export/import
- [ ] Notification system
- [ ] Fitness tracker integrations (Apple Health, Google Fit)
- [ ] Bank API integration
- [ ] ENS support for display names
- [ ] Psychology tab (standalone analysis)

---

## 📄 License

MIT License

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

Made with ❤️ using Next.js, Supabase & Web3
