# Mythic World: Dragons vs Unicorns

A cute, chaotic 2–8 player online card game in the spirit of *Unstable
Unicorns*: pledge to the **Dragon Clan**, the **Unicorn Herd** or the
**Llama Caravan**, build a stable of 7 creatures, and stop your friends from
doing the same. Original
card set (all names, rules text and illustrations are original to this
project) over classic take-that card-game mechanics.

## Dragons vs Unicorns — the faction rules

- **Pledge** in the lobby: every keeper is a Dragon, a Unicorn or a Llama
  (seats rotate through the factions by default; bots can be assigned or
  auto-balanced).
- **Loyal vs wild.** Every creature card belongs to a faction. In a stable of
  its own faction it is *loyal*; in a rival stable it is *wild*. Wild creatures
  still count toward the goal, but **Magical creatures only use their
  abilities while loyal** — a stolen unicorn won't sparkle for a dragon.
  Stealing, swapping or taming a creature into a stable of its own faction
  wakes it up (its entrance ability fires).
- **Taming.** *Taming Bond* and *Whisperhorn Unicorn* make a wild creature
  loyal to you. *Wild Heart* (downgrade) makes every creature in a stable wild.
- **Pegasi** (winged unicorns) are *Flying*: they can never be stolen or
  swapped away. *Wyverns* and *Hydras* are the dragon sub-kinds. *Alpacas*
  are the llama sub-kind and are *Woolly*: Magic cards cannot destroy them,
  loyal or wild.
- **Faction passives** (once per turn each):
  - 🐉 **Ember** — the first time each turn a Dragon keeper DESTROYS another
    player's card, they DRAW a card.
  - 🦄 **Sparkle** — the first time each turn another player destroys one of
    a Unicorn keeper's loyal creatures, the Unicorn keeper DRAWS a card.
  - 🦙 **Cud** — the first time each turn a Llama keeper DISCARDS a card by
    choice or effect, they DRAW a card. End-of-turn hand-limit discards do not
    count.
- **Instants:** dragons *Roar!*, unicorns *Neigh!*, llamas *Spit!* — all
  stop a card. *Primordial Roar* / *Super Neigh* / *Great Spit* cannot be
  stopped.
- **The Nest** holds 8 Baby Dragons, 8 Baby Unicorns and 8 Baby Llamas; you
  always hatch a baby of your own faction when one is available.
- **Even factions.** Because Magical abilities only work while loyal, the deck
  is balanced per faction-sensitive type — equal magicals, upgrades,
  downgrades, magic and instants on each side (302 cards in all) — so no
  faction draws a live ability more often than another. `engine.test.js`
  asserts the split, so an unbalanced addition fails the build.
- **Harmony.** *Harmony Unicorn*, *Hearthbound Wyrm* and *Braided Alpaca* count as **two**
  creatures while another **loyal** creature shares their stable — a stolen wild
  creature fills a slot but keeps nobody company. *Discord*, *Snarlwind* and
  *Matted Wool* (downgrades) switch Harmony off for the stable they sit in.
- **Faction War** (host toggle): when any keeper reaches the goal, their whole
  faction shares the victory.
- **Draw pile** (host setting): *Shared deck* is the default, one mixed pile.
  *Faction decks* gives every faction at the table its own pile built only
  from that faction’s cards; neutral Magic is dealt round-robin between the
  piles, the discard pile stays shared, and when a pile runs dry only that
  faction’s cards (plus neutrals) are reshuffled back into it. Cards of
  factions nobody pledged to are left out entirely. The two-reshuffle
  deck-out rule counts reshuffles of any pile.

- **Frontend:** React (plain JavaScript), static site → Cloudflare Pages
- **Backend:** Cloudflare Worker + one **Durable Object per room** (keyed by
  room code) acting as the authoritative game engine
- **Realtime:** WebSockets via the **Hibernation API** — idle rooms cost ~no
  compute while connections stay alive
- **Persistence:** game state is written to Durable Object storage after every
  action, so Worker restarts/hibernation never lose a game

```
├── shared/cards.js         # full card database (used by server + client)
├── worker/                 # Cloudflare Worker + Durable Object
│   ├── wrangler.toml       # DO binding + SQLite migration
│   └── src/
│       ├── index.js        # HTTP routes + WS routing to DOs (idFromName(code))
│       ├── GameRoom.js     # Durable Object (hibernating WebSockets, storage)
│       └── engine.js       # authoritative rules engine (turns, chain, effects)
└── client/                 # React app (Vite)
    ├── public/cards/       # drop card art here later (see README.txt inside)
    └── src/
```

### Earlier design: Deck Duel

Until September 2026 the game used a different faction model, preserved on the
`archive/deck-duel` branch: each player chose Dragons or Unicorns in the lobby
and drew from their own faction's pile, with mirrored card packs. It was
replaced by the shared-deck model above, which makes faction matter on every
card rather than only at the lobby. Harmony is ported from it. Saved rooms from
that engine are not readable here — see `SCHEMA` in `worker/src/engine.js`.

---

## Local development

Two terminals:

```bash
# 1) the Worker + Durable Object on http://127.0.0.1:8787
cd worker
npm install
npm run dev          # = wrangler dev

# 2) the React client on http://localhost:5173
cd client
npm install
npm run dev
```

The Vite dev server proxies `/api/*` (including WebSocket upgrades) to
`127.0.0.1:8787`, so just open **http://localhost:5173**, create a room in one
tab and join with the code from another tab (2+ players needed to start).

## Deployment

> **Deploy both halves from the same checkout.** `shared/cards.js` is bundled
> into the Worker *and* the client, so shipping only one leaves the server and
> the browser disagreeing about the deck. Deploy from a fresh clone of the
> branch you mean to ship — deploying from a stale working copy is the easiest
> way to put an old build into production without noticing.

### 0. Or let CI do it

`.github/workflows/deploy.yml` deploys both halves on every push to the
development branch, then asks the deployed Worker for its fingerprint and fails
the run if it does not match the commit. Pull requests run the tests only.
It needs three values under **Settings → Secrets and variables → Actions**:

| | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | A token scoped to *Workers Scripts: Edit* and *Cloudflare Pages: Edit* on this account — nothing broader |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | From the Cloudflare dashboard sidebar |
| Variable | `WORKER_URL` | e.g. `https://unstable-dragons.<you>.workers.dev`, no trailing slash |

`WORKER_URL` is a *variable*, not a secret: it is a public URL, and CI needs to
print it when a deploy does not match.

The Pages project has to exist before the first CI run. Wrangler only offers to
create one when it is attached to a TTY, and CI is not, so run this once from a
machine where you are logged in:

```bash
npx wrangler pages project create unstable-dragons \
  --production-branch claude/gallant-wozniak-ftxskm
```

The Worker needs no equivalent step — `wrangler deploy` creates it if missing
and updates it otherwise, and the `v1` Durable Object migration is a no-op once
it has been applied.

Deliberately, only the development branch deploys. `main` still holds the
archived Deck Duel engine, and deploying it would overwrite production with an
older, incompatible design.

### 1. Worker + Durable Object

```bash
cd worker
npx wrangler login          # once
npm run deploy              # = wrangler deploy
```

`wrangler.toml` already contains the Durable Object binding and the
`new_sqlite_classes` migration:

```toml
[[durable_objects.bindings]]
name = "GAME_ROOM"
class_name = "GameRoom"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["GameRoom"]
```

Note the deployed URL, e.g. `https://unstable-dragons.<you>.workers.dev`.

### 2. Frontend on Cloudflare Pages

```bash
cd client
cp .env.production.example .env.production   # then edit the URL in it, once
npm run build
npm run deploy                               # = wrangler pages deploy dist
```

Vite reads `.env.production` automatically for production builds, so the URL
lives in one gitignored file instead of your shell history. If you would rather
pass it inline, the syntax differs per shell: bash/zsh
`VITE_API_BASE=https://... npm run build`, PowerShell
`$env:VITE_API_BASE="https://..."; npm run build`, cmd.exe
`set VITE_API_BASE=https://... && npm run build`.

### 3. Confirm what is actually live

`GET /api/version` returns a fingerprint of the card database:

```bash
curl https://unstable-dragons.<you>.workers.dev/api/version
# {"cards":189,"deck":302,"hash":"3467a402"}
```

Compare it with `npm run fingerprint` in `worker/` from the checkout you meant
to ship. Identical values mean the deployed Worker carries that exact card
database; a mismatch means the deploy did not come from this commit.

`VITE_API_BASE` tells the client where the Worker lives; the WebSocket URL is
derived from it (`wss://…/api/rooms/<CODE>/ws`). The Worker sends permissive
CORS headers for the two small HTTP endpoints; WebSockets are unaffected by
CORS. If you use the Pages dashboard instead of the CLI, set `VITE_API_BASE`
as a build-time environment variable there.

---

## How rooms & reconnection work

1. **Create:** the client `POST /api/rooms` → the Worker picks a 5-letter code
   and initializes the Durable Object at `idFromName(code)`.
2. **Join:** the client checks `GET /api/rooms/:code`, then opens
   `GET /api/rooms/:code/ws` (WebSocket). The Worker forwards the upgrade to
   the room's DO, which accepts it with `state.acceptWebSocket()` (Hibernation
   API) and tags the socket with a serialized attachment (`playerId`).
3. **Play:** every action is a small JSON intent (`play`, `pass`, `choose`,
   `drawAction`, …). The DO validates it against the authoritative state,
   mutates, persists to `storage`, and broadcasts each player a personalized
   view (your hand is yours; other hands are counts — unless a Scrying Orb
   says otherwise).
4. **Reconnect:** the client keeps a random **player token** in
   `localStorage` (`ud_token`) plus the last room code. Refreshing the tab or
   reopening the browser reconnects to the same seat automatically — hand,
   stable and turn state are all untouched. Seats are held indefinitely
   during a game; rooms self-delete after ~24h of nobody being connected.
5. **Disconnected players:** their turns are auto-skipped at the next turn
   boundary, and the host gets **Host tools** (bottom bar) to pass/auto-resolve
   anything a vanished player was holding up.

## Game rules (implemented server-side)

- Everyone starts with 1 Baby of their faction (from the 16-card Nest) and 5 cards.
- **Turn:** Beginning phase (start-of-turn effects fire) → Draw 1 →
  **one action** (play a card *or* draw a card; some cards grant extra
  actions) → End phase (discard down to 7).
- **Win:** 7 creatures in your stable (2–5 players) or 6 (6–8 players).
  Toad-cursed creatures don't count. If the deck empties, the discard pile is
  reshuffled in; the second time that happens, most dragons wins immediately.
- **Instants:** when any card is played, every other player holding an
  Instant gets a response window ("Roar"). Roars can Roar each other; the
  chain resolves top-down and stopped cards go to the discard pile.
- **Upgrades/Downgrades:** attach to any stable, max one copy of a name per
  stable. **Magic** resolves once and is discarded. Targeting choices are
  made when a card *resolves* (after the Roar window), exactly like the
  tabletop flow.

The full 278-card deck (+24 babies) with quantities lives in
[shared/cards.js](shared/cards.js) — every mechanic (steal, sacrifice,
destroy-protection, ability suppression, hand-reveal, forced discards, deck
searches, resurrection, the wandering whelp, guardians, phoenix saves, …) is
handled by the effect VM in [worker/src/engine.js](worker/src/engine.js).

## Bots

The host can add bot opponents in the lobby (up to 7, so 1v1 or a mixed
table). Three difficulties:

- **easy** — mostly random; rarely Roars. About even with a random player.
- **medium** — greedy heuristics with some noise; targets the leader.
- **hard** — full heuristics; hoards Instants and spends them to deny
  winning plays, protects its own plays with counter-Roars.

Bots run **inside the Durable Object** on DO alarms (~0.7s per decision), so
they keep playing through hibernation and Worker restarts, and they decide
from the same redacted view a human client gets — no peeking at hands or the
deck. If a bot decision ever errors, the room falls back to a safe default
action instead of stalling.

## Notes

- **Story and lore:** the setting lives in [shared/lore.js](shared/lore.js):
  the legend of the Hollow, both faction origin stories, the Nest and one
  description per battlefield. Every card in `shared/cards.js` carries a
  one-line `flavor`. The client shows the legend on the home screen and in
  the Codex, faction mottos and stories in the lobby, and battlefield
  taglines in Settings. Russian copy for all of it is in
  `client/src/i18n/ru-cards.js` and `client/src/i18n/ru-lore.js`.
- **Animated battlefields:** all seven battlefields are 10-second looping
  videos (generated with Higgsfield from a painted still used as both first
  and last frame). Each ships in two tiers, AV1 with an H.264 fallback:
  1080p (or 1440p for *The Hollow*) for large screens and 720p for narrow
  viewports and slow or Save-Data connections. `battlefield-<id>.webp` and
  `-sm.webp` are the poster and still fallback. `SceneVideo.jsx` plays the
  chosen field behind the game table and *The Hollow* behind the home screen
  and lobby, skips video entirely under "Reduced visual effects" or
  `prefers-reduced-motion`, and pauses while the tab is hidden.
- **Card art:** every card has an illustration at `/cards/<defId>.webp`
  (generated with Higgsfield in one consistent cute storybook style); a
  tinted procedural placeholder appears if a file is ever missing. Card
  frames are drawn in CSS — one silhouette per card type (egg, plain, sparkly,
  shield, thorns, scroll, lightning) tinted per faction.
- **Sound:** all audio is synthesized in the browser (WebAudio) — ambience,
  draws, roars, destruction, victory. Toggle with the "Sound" button; the
  choice persists.
- **Animations:** cards glide between zones (hand → chain → stable →
  discard, steals, returns; draws fly out of the deck) via a FLIP pass over
  `data-iid` elements after each state update. It is self-healing (a
  backgrounded tab can never leave a card stuck mid-flight) and disabled
  under `prefers-reduced-motion`.
- **Fairness:** the client never computes game outcomes. It renders the state
  it is sent and offers only the actions the server said are legal.
