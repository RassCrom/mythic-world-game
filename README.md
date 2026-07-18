# Unstable Dragons

A chaotic 2–8 player online card game: build a stable of dragons before your
friends stop you. Original dragon-themed card set (all names, rules text and
art slots are original to this project) over classic take-that card-game
mechanics.

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
VITE_API_BASE=https://unstable-dragons.<you>.workers.dev npm run build
npx wrangler pages deploy dist --project-name unstable-dragons
```

(On Windows PowerShell: `$env:VITE_API_BASE = "https://..."; npm run build`.)

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

- Everyone starts with 1 Baby Dragon (from the shared 13-card Nest) and 5 cards.
- **Turn:** Beginning phase (start-of-turn effects fire) → Draw 1 →
  **one action** (play a card *or* draw a card; some cards grant extra
  actions) → End phase (discard down to 7).
- **Win:** 7 dragons in your stable (2–5 players) or 6 (6–8 players).
  Toad-cursed dragons don't count. If the deck empties, the discard pile is
  reshuffled in; the second time that happens, most dragons wins immediately.
- **Instants:** when any card is played, every other player holding an
  Instant gets a response window ("Roar"). Roars can Roar each other; the
  chain resolves top-down and stopped cards go to the discard pile.
- **Upgrades/Downgrades:** attach to any stable, max one copy of a name per
  stable. **Magic** resolves once and is discarded. Targeting choices are
  made when a card *resolves* (after the Roar window), exactly like the
  tabletop flow.

The full 109-card deck (+13 babies) with quantities lives in
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

- **Card art:** the client looks for `/cards/<defId>.jpg` and falls back to a
  tinted procedural placeholder — drop images into `client/public/cards/`
  whenever they're ready (naming guide in that folder's README.txt).
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
