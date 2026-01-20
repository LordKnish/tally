# Tally ✈️

A daily aircraft guessing game for aviation enthusiasts. Identify famous aircraft from their silhouettes and clues in 5 guesses or fewer.

> **"Tally-ho!"** — Fighter pilot brevity code meaning "target in sight"

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vitejs.dev/)

---

## 🎮 How to Play

1. **Examine the Silhouette** — Each day presents a mystery aircraft shown only as a silhouette
2. **Make Your Guess** — Search and select from a comprehensive aircraft database
3. **Receive Clues** — Each incorrect guess reveals more information:
   - **Turn 1:** Silhouette only
   - **Turn 2:** Specifications (role, manufacturer, wingspan, first flight)
   - **Turn 3:** Context (country of origin, notable conflicts, status)
   - **Turn 4:** Trivia fact
   - **Turn 5:** Photograph revealed
4. **Identify or Learn** — Name the aircraft within 5 guesses, or discover what it was!

---

## ✈️ Game Modes

Tally offers multiple themed modes to test your aviation knowledge:

| Mode | Description | Aircraft | Icon |
|------|-------------|----------|------|
| **Daily Tally** | Modern military aircraft (1980–present) | 263 | ✈️ |
| **Commercial** | Airliners & business jets (1970–present) | 157 | 🛫 |
| **WW2** | World War 2 military aircraft (1935–1950) | 411 | 🎖️ |
| **Golden Age** | Early aviation pioneers (pre-1940) | 566 | 🔴 |

---

## ✨ Features

- 🎯 **Daily Challenge** — New aircraft every day, same puzzle for all players worldwide
- 🔍 **Smart Search** — Fuzzy matching across designations, names, and NATO codenames
- 📊 **Progressive Clues** — Carefully balanced hints that escalate with each guess
- 🎉 **Share Results** — Copy your spoiler-free score to share with friends
- 📱 **Responsive Design** — Optimized for desktop, tablet, and mobile
- ⚡ **Fast & Lightweight** — Static site architecture with no backend required
- 🌍 **Open Data** — Aircraft data sourced from Wikidata

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript 5.9 |
| **Build Tool** | Vite 7 |
| **Styling** | TailwindCSS 4, Custom CSS |
| **UI Components** | Radix UI primitives |
| **Search** | Fuse.js fuzzy matching |
| **Testing** | Vitest, React Testing Library |
| **Data Source** | Wikidata SPARQL |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tally.git
cd tally

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build optimized production bundle |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code for linting issues |
| `npm run lint:fix` | Automatically fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |

---

## 📁 Project Structure

```
tally/
├── public/
│   ├── game-data-*.json      # Daily game data for each mode
│   └── aircraft-list.json    # Searchable aircraft database
├── src/
│   ├── components/
│   │   ├── Clues/            # Clue display components
│   │   ├── Game/             # Main game layout
│   │   ├── GuessHistory/     # Guess tracking display
│   │   ├── ShipSearch/       # Aircraft search interface
│   │   ├── Silhouette/       # Silhouette display
│   │   ├── TurnIndicator/    # Turn progress indicator
│   │   ├── WinModal/         # Victory screen & sharing
│   │   ├── HelpModal/        # How to play instructions
│   │   ├── ModeMenu/         # Game mode selector
│   │   └── ui/               # Reusable UI primitives
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript type definitions
│   ├── styles/               # Global styles & animations
│   └── App.tsx               # Main application component
├── scripts/
│   ├── data-pipeline/        # Wikidata fetching scripts
│   └── game-generator/       # Daily puzzle generation
└── package.json
```

---

## 🎨 Game Data Format

Daily games are fetched from the API (`/api/game/today?mode=MODE`):

```json
{
  "date": "2026-01-20",
  "aircraft": {
    "id": "Q12345",
    "name": "F-16 Fighting Falcon",
    "aliases": ["F-16", "Viper", "Fighting Falcon"]
  },
  "silhouette": "data:image/png;base64,...",
  "clues": {
    "specs": {
      "class": "multirole combat aircraft",
      "manufacturer": "General Dynamics",
      "wingspan": "10m",
      "firstFlight": "1974"
    },
    "context": {
      "nation": "United States",
      "conflicts": ["Gulf War", "Iraq War", "War in Afghanistan"],
      "status": "In service"
    },
    "trivia": "Over 4,600 built, making it one of the most numerous fighters in history.",
    "photo": "https://commons.wikimedia.org/..."
  }
}
```

---

## 🔧 API Endpoints

### Fetch Today's Game
```bash
# Get today's game for a specific mode
curl "https://your-domain.vercel.app/api/game/today?mode=main"
curl "https://your-domain.vercel.app/api/game/today?mode=commercial"
curl "https://your-domain.vercel.app/api/game/today?mode=ww2"
curl "https://your-domain.vercel.app/api/game/today?mode=goldenage"

# List all available modes
curl "https://your-domain.vercel.app/api/game/today?all"
```

### Generate Games (Manual Trigger)
```bash
# Generate for a specific mode
curl "https://your-domain.vercel.app/api/cron/generate-game?manual=true&secret=YOUR_CRON_SECRET&mode=main"

# Generate for all modes
curl "https://your-domain.vercel.app/api/cron/generate-game?manual=true&secret=YOUR_CRON_SECRET&all=everything"
```

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Yes | Neon PostgreSQL connection string |
| `CRON_SECRET` | Yes | Secret for manual game generation |
| `REMOVEBG_API_KEY` | No | For better silhouette quality |

---

## 🔧 Data Pipeline

### Generate Aircraft List
```bash
npx tsx scripts/generate-aircraft-list.ts
```
This queries Wikidata for aircraft with images and generates `public/aircraft-list.json`.

### Test Mode Coverage
```bash
npx tsx scripts/test-game-generation.ts
```
Reports eligible aircraft count for each game mode.

---

## 🌐 Deployment

Tally is designed for static hosting. Build and deploy to any static host:

```bash
npm run build
# Deploy the `dist/` folder to your hosting provider
```

### Recommended Hosts

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [Cloudflare Pages](https://pages.cloudflare.com)
- [GitHub Pages](https://pages.github.com)

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or improvements to the aircraft database.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test`)
5. Commit with a descriptive message (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Areas for Contribution

- 🎨 UI/UX improvements
- 🌍 Internationalization support
- ✈️ Aircraft database expansion
- 🧪 Test coverage
- 📖 Documentation improvements
- 🐛 Bug fixes

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Aircraft Data** — Sourced from [Wikidata](https://www.wikidata.org/), the free knowledge base
- **Aircraft Images** — From [Wikimedia Commons](https://commons.wikimedia.org/), the free media repository
- **Inspiration** — [Wordle](https://www.nytimes.com/games/wordle/index.html) by Josh Wardle

---

## 📬 Contact

Questions or feedback? Open an issue on GitHub or reach out on [Twitter/X](https://x.com/Mr_Knish).

---

<p align="center">
  <strong>Play today's challenge!</strong> ✈️
  <br>
  <em>Tally-ho!</em>
</p>
