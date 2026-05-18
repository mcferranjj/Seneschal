# Seneschal

A personal GM assistant web app for **Pathfinder 2E**. Seneschal gives you a searchable monster and hazard database, a full encounter builder, and an in-app dice roller — all running locally in the browser with no backend or account required.

---

## Features

### ⚔ Real-Time Encounter Tracking
Build encounters from the creature database and run them turn-by-turn. Tracks initiative, HP, and conditions for each creature, with auto-reduction of valued conditions (Frightened, Stunned, Slowed, etc.) at end of turn. XP budget and difficulty rating update live as you add creatures, adjusted for party size.

### 📖 Creature Database & Filtering
Syncs thousands of creatures and hazards from the PF2E dataset (Remaster, Legacy, and Starfinder 2E). Filter by name, level range, size, rarity, traits (include and exclude), entity type, and source book. Source packs are organized into a three-level tree: era → category → individual book.

### 🐉 Custom Creature Creation
A guided wizard for building persistent custom creatures from GM Core stat tables. Choose stat tiers (Low / Moderate / High / Extreme) for HP, AC, saves, attack bonus, and damage — the correct values are filled in automatically per level. Custom creatures are saved to IndexedDB and appear alongside official creatures in search results.

### 📈 Creature Scaling
Scale any official creature up or down by level directly from its statblock. All stats (HP, AC, saves, attacks, damage expressions) are recalculated to the target level using the GM Core tables, including elite/weak adjustments.

### 🎲 Integrated Dice Roller
Attack rolls and damage expressions in statblocks are clickable. Clicking an attack opens a floating roller that auto-rolls the attack and damage together, detects natural 20s (triggering crit math including Fatal and Deadly traits), and logs every roll to a session history. Panels are draggable and dismissable with `Escape` or by clicking outside.

---

## Stack

- **React 19 + Vite + TypeScript** — pure frontend, no backend
- **Dexie.js** — IndexedDB wrapper for local creature and encounter storage
- **CSS Modules** — scoped styles, no utility framework
- **GitHub raw content** — creature data synced from [`mcferranjj/pf2e-for-seneschal`](https://github.com/mcferranjj/pf2e-for-seneschal)

## Try It

**[mcferranjj.github.io/Seneschal](https://mcferranjj.github.io/Seneschal/)** — hosted on GitHub Pages, no install required.

## Running Locally

```
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). On first load, use the sync button to pull the creature database from GitHub (~60 req against the unauthenticated rate limit; subsequent syncs are incremental).
