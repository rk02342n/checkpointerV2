import { useState, type CSSProperties } from "react";

const COLORS = {
  bg: "#FFFBEB",
  paper: "#FFFFFF",
  card: "#FFF7ED",
  border: "#1C1917",
  text: "#1C1917",
  textMuted: "#78716C",
  accent: "#EA580C",
  accentLight: "#FB923C",
  sky: "#38BDF8",
  skyLight: "#BAE6FD",
  amber: "#F59E0B",
  amberLight: "#FDE68A",
  green: "#22C55E",
  greenLight: "#BBF7D0",
  shadow: "#1C1917",
};

const shadow = (size = 3) =>
  `${size}px ${size}px 0px ${COLORS.shadow}`;

const styles = {
  phone: {
    width: 390,
    height: 844,
    background: COLORS.bg,
    border: `3px solid ${COLORS.border}`,
    boxShadow: shadow(6),
    overflow: "hidden",
    position: "relative" as const,
    fontFamily: "'DM Serif Display', Georgia, serif",
  },
  statusBar: {
    height: 44,
    background: COLORS.border,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    color: COLORS.bg,
    fontSize: 12,
    fontFamily: "'DM Mono', monospace",
    flexShrink: 0,
  },
  screen: {
    height: "calc(844px - 44px - 64px)",
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
  },
  navBar: {
    height: 64,
    background: COLORS.border,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    borderTop: `3px solid ${COLORS.border}`,
  },
  navItem: (active: boolean): CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    cursor: "pointer",
    color: active ? COLORS.accentLight : "#78716C",
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    fontWeight: active ? "700" : "400",
  }),
  header: {
    padding: "18px 20px 10px",
    borderBottom: `3px solid ${COLORS.border}`,
    background: COLORS.paper,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tag: (bg = COLORS.amberLight) => ({
    display: "inline-block",
    padding: "2px 8px",
    background: bg,
    border: `2px solid ${COLORS.border}`,
    boxShadow: "2px 2px 0 #1C1917",
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    fontWeight: "700",
    color: COLORS.border,
    textTransform: "uppercase",
    letterSpacing: 1,
  }),
  card: {
    background: COLORS.paper,
    border: `2px solid ${COLORS.border}`,
    boxShadow: shadow(4),
    margin: "0 16px 16px",
  },
  btn: (bg = COLORS.accent, color = "#fff") => ({
    background: bg,
    color,
    border: `2px solid ${COLORS.border}`,
    boxShadow: shadow(3),
    padding: "10px 18px",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    cursor: "pointer",
    display: "inline-block",
  }),
  avatar: (size = 36) => ({
    width: size,
    height: size,
    background: COLORS.amberLight,
    border: `2px solid ${COLORS.border}`,
    boxShadow: "2px 2px 0 #1C1917",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size * 0.38,
    fontWeight: "700",
    color: COLORS.border,
    flexShrink: 0,
  }),
  sectionLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.textMuted,
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  coverArt: (bg = "#FED7AA") => ({
    width: "100%",
    aspectRatio: "3/4",
    background: bg,
    border: `2px solid ${COLORS.border}`,
    boxShadow: "3px 3px 0 #1C1917",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
  }),
};

const Stars = ({ rating, size = 12 }: { rating: number; size?: number }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ fontSize: size, color: COLORS.amber, letterSpacing: 1 }}>
      {"★".repeat(full)}
      {half && "½"}
      {"☆".repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
};

// ─── HOME SCREEN ────────────────────────────────────────────────────────────
function HomeScreen() {
  const currentlyPlaying = [
    { title: "Hollow Knight", hours: "12h 34m", emoji: "🦋", bg: "#DBEAFE" },
    { title: "Hades II", hours: "3h 10m", emoji: "🔥", bg: "#FECACA" },
  ];

  const trending = [
    { title: "Celeste", emoji: "⛰️", bg: "#E0E7FF" },
    { title: "Elden Ring", emoji: "⚔️", bg: "#FDE68A" },
    { title: "Balatro", emoji: "🃏", bg: "#D1FAE5" },
    { title: "Outer Wilds", emoji: "🌌", bg: "#DDD6FE" },
    { title: "Tunic", emoji: "🦊", bg: "#FFEDD5" },
  ];

  const activity = [
    { user: "Marta", initials: "MK", bg: "#BBF7D0", action: "rated", game: "Celeste", rating: 4.5, time: "2h ago" },
    { user: "Theo", initials: "TR", bg: "#FDE68A", action: "finished", game: "Hades II", rating: 5, time: "4h ago" },
    { user: "Suki", initials: "SB", bg: "#DDD6FE", action: "started playing", game: "Outer Wilds", rating: null, time: "6h ago" },
    { user: "Dev", initials: "DK", bg: "#FECACA", action: "reviewed", game: "Balatro", rating: 4, time: "Yesterday" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ fontSize: 24, fontWeight: "700", color: COLORS.text, lineHeight: 1 }}>
            Checkpointer
          </div>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: COLORS.textMuted, marginTop: 2 }}>
            Your gaming journal
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...styles.avatar(34), background: COLORS.skyLight }}>🔔</div>
          <div style={{ ...styles.avatar(34), background: COLORS.card }}>+</div>
        </div>
      </div>

      {/* Currently Playing */}
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={styles.sectionLabel}>
          <div style={{ height: 3, width: 20, background: COLORS.accent }} />
          Currently Playing
        </div>
        {currentlyPlaying.map((g, i) => (
          <div key={i} style={{ ...styles.card, margin: "0 0 10px", display: "flex", alignItems: "center", padding: "12px 14px", gap: 12 }}>
            <div style={{ width: 48, height: 48, background: g.bg, border: `2px solid ${COLORS.border}`, boxShadow: "2px 2px 0 #1C1917", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
              {g.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: "700", color: COLORS.text }}>{g.title}</div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: COLORS.textMuted }}>Session: {g.hours}</div>
            </div>
            <span style={styles.tag("#D1FAE5")}>PLAYING</span>
          </div>
        ))}
      </div>

      {/* Trending */}
      <div style={{ padding: "8px 16px" }}>
        <div style={styles.sectionLabel}>
          <div style={{ height: 3, width: 20, background: COLORS.amber }} />
          Trending
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
          {trending.map((g, i) => (
            <div key={i} style={{ flexShrink: 0, width: 90 }}>
              <div style={{ width: 90, height: 120, background: g.bg, border: `2px solid ${COLORS.border}`, boxShadow: "3px 3px 0 #1C1917", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 6 }}>
                {g.emoji}
              </div>
              <div style={{ fontSize: 11, fontWeight: "700", color: COLORS.text, textAlign: "center" }}>{g.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ padding: "8px 16px 16px" }}>
        <div style={styles.sectionLabel}>
          <div style={{ height: 3, width: 20, background: COLORS.sky }} />
          Recent Activity
        </div>
        {activity.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < activity.length - 1 ? `1px solid #E7E5E4` : "none" }}>
            <div style={{ ...styles.avatar(32), background: a.bg }}>{a.initials}</div>
            <div style={{ flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 1.4 }}>
              <strong>{a.user}</strong> {a.action} <strong>{a.game}</strong>
              {a.rating && <> <Stars rating={a.rating} size={11} /></>}
            </div>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: COLORS.textMuted, flexShrink: 0 }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BROWSE SCREEN ──────────────────────────────────────────────────────────
function BrowseScreen() {
  const filters = ["All", "RPG", "Indie", "Action", "Puzzle", "Strategy"];
  const [activeFilter, setActiveFilter] = useState("All");

  const games = [
    { title: "Celeste", rating: 4.5, emoji: "⛰️", bg: "#E0E7FF", genre: "Indie" },
    { title: "Elden Ring", rating: 4.8, emoji: "⚔️", bg: "#FDE68A", genre: "RPG" },
    { title: "Balatro", rating: 4.3, emoji: "🃏", bg: "#D1FAE5", genre: "Strategy" },
    { title: "Outer Wilds", rating: 4.7, emoji: "🌌", bg: "#DDD6FE", genre: "Puzzle" },
    { title: "Hades", rating: 4.6, emoji: "🔥", bg: "#FECACA", genre: "Action" },
    { title: "Tunic", rating: 4.2, emoji: "🦊", bg: "#FFEDD5", genre: "Indie" },
  ];

  const topRated = [
    { title: "Disco Elysium", rating: 4.9, emoji: "🕵️", bg: "#E0E7FF" },
    { title: "Baldur's Gate 3", rating: 4.8, emoji: "🐉", bg: "#FDE68A" },
    { title: "Outer Wilds", rating: 4.7, emoji: "🌌", bg: "#DDD6FE" },
  ];

  const filtered = activeFilter === "All" ? games : games.filter(g => g.genre === activeFilter);

  return (
    <div>
      <div style={styles.header}>
        <div style={{ fontSize: 22, fontWeight: "700", color: COLORS.text }}>Browse</div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px", borderBottom: `2px solid ${COLORS.border}` }}>
        <div style={{ background: COLORS.paper, border: `2px solid ${COLORS.border}`, boxShadow: "2px 2px 0 #1C1917", padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>
          🔍 Search games...
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "12px 16px", display: "flex", gap: 6, overflowX: "auto", borderBottom: `2px solid ${COLORS.border}` }}>
        {filters.map(f => (
          <div
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              ...styles.tag(activeFilter === f ? COLORS.accent : COLORS.amberLight),
              color: activeFilter === f ? "#fff" : COLORS.border,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {f}
          </div>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {/* Game Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {filtered.map((g, i) => (
            <div key={i} style={{ background: COLORS.paper, border: `2px solid ${COLORS.border}`, boxShadow: "3px 3px 0 #1C1917" }}>
              <div style={{ height: 100, background: g.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, borderBottom: `2px solid ${COLORS.border}` }}>
                {g.emoji}
              </div>
              <div style={{ padding: "10px 10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 4 }}>{g.title}</div>
                <Stars rating={g.rating} size={11} />
                <div style={{ marginTop: 6 }}>
                  <span style={styles.tag(COLORS.card)}>{g.genre}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Rated */}
        <div style={styles.sectionLabel}>
          <div style={{ height: 3, width: 20, background: COLORS.amber }} />
          Top Rated
        </div>
        {topRated.map((g, i) => (
          <div key={i} style={{ ...styles.card, margin: "0 0 10px", display: "flex", alignItems: "center", padding: "12px 14px", gap: 12 }}>
            <div style={{ width: 44, height: 44, background: g.bg, border: `2px solid ${COLORS.border}`, boxShadow: "2px 2px 0 #1C1917", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              {g.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}>{g.title}</div>
              <Stars rating={g.rating} size={11} />
            </div>
            <span style={styles.tag(COLORS.amberLight)}>{g.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ACTIVITY SCREEN ────────────────────────────────────────────────────────
function ActivityScreen() {
  type NotifType = "follow" | "like" | "review" | "comment" | "list";

  const notifications: { type: NotifType; user: string; initials: string; bg: string; text: string; time: string; rating?: number }[] = [
    { type: "follow", user: "Marta K.", initials: "MK", bg: "#BBF7D0", text: "started following you", time: "10m ago" },
    { type: "like", user: "Theo R.", initials: "TR", bg: "#FDE68A", text: "liked your review of Hades", time: "1h ago" },
    { type: "review", user: "Suki B.", initials: "SB", bg: "#DDD6FE", text: "reviewed Outer Wilds", time: "2h ago", rating: 5 },
    { type: "follow", user: "Dev K.", initials: "DK", bg: "#FECACA", text: "started following you", time: "3h ago" },
    { type: "like", user: "Priya M.", initials: "PM", bg: "#BAE6FD", text: "liked your list 'Best of 2024'", time: "5h ago" },
    { type: "review", user: "Marta K.", initials: "MK", bg: "#BBF7D0", text: "reviewed Celeste", time: "6h ago", rating: 4.5 },
    { type: "comment", user: "Theo R.", initials: "TR", bg: "#FDE68A", text: "commented on your Balatro review", time: "Yesterday" },
    { type: "list", user: "Suki B.", initials: "SB", bg: "#DDD6FE", text: "added Hollow Knight to 'Must Play'", time: "Yesterday" },
  ];

  const typeIcons: Record<NotifType, string> = {
    follow: "👤",
    like: "♥",
    review: "★",
    comment: "💬",
    list: "📋",
  };

  const typeColors: Record<NotifType, string> = {
    follow: COLORS.sky,
    like: COLORS.accent,
    review: COLORS.amber,
    comment: COLORS.greenLight,
    list: COLORS.skyLight,
  };

  return (
    <div>
      <div style={styles.header}>
        <div style={{ fontSize: 22, fontWeight: "700", color: COLORS.text }}>Activity</div>
        <span style={styles.tag(COLORS.accent)} >
          <span style={{ color: "#fff" }}>5 NEW</span>
        </span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", borderBottom: `2px solid ${COLORS.border}` }}>
        {["All", "Reviews", "Follows", "Likes"].map((f, i) => (
          <div key={f} style={{
            flex: 1,
            textAlign: "center",
            padding: "10px 0",
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            fontWeight: i === 0 ? "700" : "400",
            color: i === 0 ? COLORS.accent : COLORS.textMuted,
            borderBottom: i === 0 ? `3px solid ${COLORS.accent}` : "none",
            cursor: "pointer",
          }}>
            {f}
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div>
        {notifications.map((n, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderBottom: `1px solid #E7E5E4`,
              background: i < 2 ? "#FFF7ED" : "transparent",
            }}
          >
            <div style={{ position: "relative" }}>
              <div style={{ ...styles.avatar(40), background: n.bg }}>{n.initials}</div>
              <div style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 18,
                height: 18,
                background: typeColors[n.type],
                border: `2px solid ${COLORS.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
              }}>
                {typeIcons[n.type]}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.4 }}>
                <strong>{n.user}</strong> {n.text}
                {n.rating && <> <Stars rating={n.rating} size={11} /></>}
              </div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: COLORS.textMuted, marginTop: 2 }}>{n.time}</div>
            </div>
            {i < 2 && <div style={{ width: 8, height: 8, background: COLORS.accent, border: `1px solid ${COLORS.border}`, borderRadius: "50%", flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROFILE SCREEN ─────────────────────────────────────────────────────────
function ProfileScreen() {
  const stats = [
    { label: "Played", value: 127 },
    { label: "Reviews", value: 43 },
    { label: "Lists", value: 8 },
    { label: "Following", value: 64 },
  ];

  const badges = [
    { label: "Completionist", emoji: "🏆", bg: COLORS.amberLight },
    { label: "Indie Fan", emoji: "🎮", bg: "#DDD6FE" },
    { label: "Speed Runner", emoji: "⚡", bg: COLORS.skyLight },
    { label: "Critic", emoji: "✍️", bg: "#FECACA" },
  ];

  const [activeTab, setActiveTab] = useState("reviews");
  const tabs = ["Reviews", "History", "Wishlist", "Lists"];

  const reviews = [
    { game: "Hades", rating: 5, emoji: "🔥", bg: "#FECACA", text: "A masterpiece of roguelike design. Every run feels fresh and rewarding.", date: "2 days ago" },
    { game: "Celeste", rating: 4.5, emoji: "⛰️", bg: "#E0E7FF", text: "Beautiful, brutally hard, and deeply personal. The assist mode is a stroke of genius.", date: "1 week ago" },
    { game: "Balatro", rating: 4, emoji: "🃏", bg: "#D1FAE5", text: "Endlessly replayable. The joker combos are so satisfying to discover.", date: "2 weeks ago" },
  ];

  return (
    <div>
      {/* Profile header */}
      <div style={{ background: COLORS.border, padding: "20px 20px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 80, height: 80, background: COLORS.amberLight, border: `3px solid ${COLORS.accentLight}`, boxShadow: "4px 4px 0 #78716C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: "700", color: COLORS.border, marginBottom: 12 }}>
          JS
        </div>
        <div style={{ fontSize: 22, fontWeight: "700", color: COLORS.bg, marginBottom: 2 }}>Jamie S.</div>
        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#A8A29E", marginBottom: 6 }}>@jamies · Joined 2023</div>
        <div style={{ fontSize: 12, color: "#D6D3D1", marginBottom: 14, textAlign: "center", padding: "0 20px", lineHeight: 1.4, fontFamily: "'DM Mono', monospace" }}>
          Indie enthusiast. Roguelike addict. Backlog denier.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button style={{ ...styles.btn(COLORS.accent), padding: "8px 16px", fontSize: 11 }}>Edit Profile</button>
          <button style={{ ...styles.btn(COLORS.bg, COLORS.border), padding: "8px 14px", fontSize: 11 }}>Share</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", borderBottom: `3px solid ${COLORS.border}` }}>
        {stats.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRight: i < stats.length - 1 ? `2px solid ${COLORS.border}` : "none", background: COLORS.paper }}>
            <div style={{ fontSize: 22, fontWeight: "700", color: COLORS.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: COLORS.textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {/* Badges */}
        <div style={{ marginBottom: 16 }}>
          <div style={styles.sectionLabel}>
            <div style={{ height: 3, width: 16, background: COLORS.amber }} /> Badges
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {badges.map((b, i) => (
              <div key={i} style={{ background: b.bg, border: `2px solid ${COLORS.border}`, boxShadow: "2px 2px 0 #1C1917", padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>{b.emoji}</span>
                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: "700", color: COLORS.border }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
          {tabs.map(t => (
            <div
              key={t}
              onClick={() => setActiveTab(t.toLowerCase())}
              style={{
                ...styles.tag(activeTab === t.toLowerCase() ? COLORS.accent : COLORS.card),
                color: activeTab === t.toLowerCase() ? "#fff" : COLORS.border,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {t}
            </div>
          ))}
        </div>

        {/* Reviews list */}
        {activeTab === "reviews" && reviews.map((r, i) => (
          <div key={i} style={{ ...styles.card, margin: "0 0 12px" }}>
            <div style={{ padding: "12px 14px", borderBottom: `2px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, background: r.bg, border: `2px solid ${COLORS.border}`, boxShadow: "2px 2px 0 #1C1917", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {r.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: "700", color: COLORS.text }}>{r.game}</div>
                <Stars rating={r.rating} size={12} />
              </div>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: COLORS.textMuted }}>{r.date}</span>
            </div>
            <div style={{ padding: "12px 14px", fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>
              {r.text}
            </div>
          </div>
        ))}

        {activeTab === "history" && (
          <div style={{ padding: "20px 0", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>
            127 games played · View full history
          </div>
        )}
        {activeTab === "wishlist" && (
          <div style={{ padding: "20px 0", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>
            24 games wishlisted · Browse wishlist
          </div>
        )}
        {activeTab === "lists" && (
          <div style={{ padding: "20px 0", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>
            8 lists created · View all lists
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP SHELL ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "browse", label: "Browse", emoji: "🔍" },
  { id: "activity", label: "Activity", emoji: "🔔" },
  { id: "profile", label: "Profile", emoji: "👤" },
];

export default function App() {
  const [tab, setTab] = useState("home");

  return (
    <div style={{ minHeight: "100vh", background: "#292524", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, fontFamily: "Georgia, serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2, color: "#A8A29E" }}>
          Checkpointer · Mobile App
        </div>
        <div style={styles.phone}>
          {/* Status Bar */}
          <div style={styles.statusBar}>
            <span>9:41</span>
            <span style={{ fontWeight: "700", letterSpacing: 1 }}>CHECKPOINTER</span>
            <span>◼ ◼ ◼</span>
          </div>

          {/* Screen */}
          <div style={styles.screen}>
            {tab === "home" && <HomeScreen />}
            {tab === "browse" && <BrowseScreen />}
            {tab === "activity" && <ActivityScreen />}
            {tab === "profile" && <ProfileScreen />}
          </div>

          {/* Nav */}
          <div style={styles.navBar}>
            {TABS.map((t) => (
              <div key={t.id} style={styles.navItem(tab === t.id)} onClick={() => setTab(t.id)}>
                <span style={{ fontSize: 20 }}>{t.emoji}</span>
                <span>{t.label}</span>
                {tab === t.id && <div style={{ width: 20, height: 2, background: COLORS.accentLight, marginTop: 1 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {TABS.map(t => (
            <div
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 14px",
                background: tab === t.id ? COLORS.accent : "#44403C",
                color: tab === t.id ? "#fff" : "#A8A29E",
                border: `2px solid ${tab === t.id ? COLORS.accent : "#57534E"}`,
                boxShadow: "2px 2px 0 #0C0A09",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              {t.emoji} {t.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
