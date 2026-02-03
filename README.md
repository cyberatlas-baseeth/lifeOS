# LifeOS - Digital Avatar 🧬

A modern web application that tracks your personal life data, analyzes it, and generates a dynamic digital avatar.

![LifeOS Dashboard](https://via.placeholder.com/800x400/0b0e15/0ea5e9?text=LifeOS+Dashboard)

## ✨ Features

### 📊 6 Core Metrics Tracking
- **Health**: Sleep duration, activity level, health score
- **Psychology**: Mood, stress, motivation
- **Net Worth**: Total assets, cash
- **Income**: Regular and additional income
- **Expenses**: Fixed and variable expenses
- **Investments**: Portfolio tracking, profit/loss analysis

### 🤖 Dynamic Avatar
- Visual state that changes based on your metrics
- Energy, morale, and balance scores
- 6 different states: Thriving, Energetic, Stable, Tired, Stressed, Critical

### 📈 Analysis and Visualization
- Time-based charts (Recharts)
- Automatic alerts and recommendations
- Trend analysis

### 🔐 Security
- Web3 authentication with MetaMask
- Wallet-based identity (no passwords)
- Row Level Security (RLS) for data isolation
- Each user can only see their own data

## 🚀 Setup

### 1. Clone the repository

```bash
git clone https://github.com/cyberatlas-baseeth/lifeOS.git
cd lifeOS
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the SQL from `supabase/schema.sql`

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

## 📁 Project Structure

```
lifeos/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── health/         # Health metrics
│   │   │   ├── psychology/     # Psychology metrics
│   │   │   ├── networth/       # Net worth
│   │   │   ├── income/         # Income
│   │   │   ├── expenses/       # Expenses
│   │   │   └── investments/    # Investments
│   │   └── login/              # Login page (MetaMask)
│   ├── components/
│   │   ├── avatar/             # Avatar components
│   │   ├── charts/             # Chart components
│   │   └── ui/                 # UI components
│   ├── lib/
│   │   ├── supabase/           # Supabase client
│   │   ├── wallet/             # Wallet authentication
│   │   ├── avatar/             # Avatar calculation
│   │   └── utils.ts            # Utility functions
│   └── types/
│       └── database.ts         # TypeScript types
├── supabase/
│   └── schema.sql              # Database schema
└── public/
```

## 🎨 Technical Details

### Technologies Used
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + Custom CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: MetaMask (Web3)
- **Web3**: ethers.js
- **Charts**: Recharts
- **Icons**: Lucide React

### Avatar State Calculation

Avatar state is calculated based on the following rules:

```typescript
// Example rules:
- Health < 40 and Psychology < 50 → Tired
- Stress > 7 → Stressed
- Income increasing and expenses under control → Energetic
- All metrics positive → Thriving
```

## 🚢 Deploy to Vercel

1. Sign in to [Vercel](https://vercel.com) with your account
2. "New Project" → Select your GitHub repository
3. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click "Deploy"

## 🔮 Future Development

- [ ] AI/LLM integration for personalized recommendations
- [ ] Mobile app (React Native)
- [ ] Data export/import
- [ ] Goal setting and tracking
- [ ] Notification system
- [ ] Fitness tracker integrations
- [ ] Bank API integration
- [ ] ENS support for display names

## 📄 License

MIT License

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

Made with ❤️ using Next.js, Supabase & Web3
