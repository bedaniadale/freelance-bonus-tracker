# 📊 Freelance Performance & Bonus Tracker

A smart, gamified tracker for freelance social media work. Track Instagram post performance, automatically calculate bonuses, and see your total expected pay — converted live to Philippine Peso.

## Features

- **Smart Link Normalization** — Paste any Instagram URL (`/p/`, `/reel/`, with or without `?img_index`). The app extracts the unique shortcode and prevents double-counting.
- **Bonus Qualification Logic** — Posts with **320+ comments** or **25,000+ views** automatically earn a **$100 bonus**.
- **Live USD → PHP Conversion** — Powered by [Frankfurter API](https://frankfurter.dev) (no API key needed). Rate is cached for 1 hour and refreshable on demand.
- **The Vault** — Active list of tracked posts for the current pay period, with visual bonus badges.
- **Snapshot & History** — Finalize a period to save a timestamped payout snapshot. Browse all previous periods.
- **100% Local** — All data stored in `localStorage`. No backend, no database, no login.

## Tech Stack

- [React](https://react.dev) + [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Lucide React](https://lucide.dev) icons
- [Frankfurter API](https://frankfurter.dev) for live exchange rates

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deploy to Vercel

Push this repo to GitHub, then import it in [Vercel](https://vercel.com). No environment variables needed — the exchange rate API requires no API key.

## Bonus Rules

| Condition | Bonus |
|-----------|-------|
| Comments ≥ 320 | +$100 |
| Views ≥ 25,000 | +$100 |

Posts meeting **either** condition qualify. The bonus is not stacked — it's $100 per qualified post.
