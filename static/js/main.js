/* ═══════════════════════════════════════════════════════════
   2026 FIFA World Cup — Frontend Logic
   Fetches data from Flask backend, renders all panels, auto-refreshes.
   Features: team crests, form badges, GF/GA/GD, assists leaderboard
═══════════════════════════════════════════════════════════ */

// ── Utilities ──────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

/** Flag emoji fallback map */
const FLAGS = {
  "Brazil":"🇧🇷","Argentina":"🇦🇷","France":"🇫🇷","England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Germany":"🇩🇪","Spain":"🇪🇸","Portugal":"🇵🇹","Netherlands":"🇳🇱",
  "Belgium":"🇧🇪","Croatia":"🇭🇷","Uruguay":"🇺🇾","Mexico":"🇲🇽",
  "USA":"🇺🇸","United States":"🇺🇸","Canada":"🇨🇦","Japan":"🇯🇵",
  "South Korea":"🇰🇷","Korea Republic":"🇰🇷","Australia":"🇦🇺",
  "Morocco":"🇲🇦","Senegal":"🇸🇳","Ghana":"🇬🇭","Nigeria":"🇳🇬",
  "Cameroon":"🇨🇲","Saudi Arabia":"🇸🇦","Iran":"🇮🇷","Qatar":"🇶🇦",
  "Switzerland":"🇨🇭","Denmark":"🇩🇰","Sweden":"🇸🇪","Poland":"🇵🇱",
  "Serbia":"🇷🇸","Ecuador":"🇪🇨","Colombia":"🇨🇴","Chile":"🇨🇱",
  "Peru":"🇵🇪","Venezuela":"🇻🇪","Bolivia":"🇧🇴","Paraguay":"🇵🇾",
  "Italy":"🇮🇹","Austria":"🇦🇹","Hungary":"🇭🇺","Wales":"🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Turkey":"🇹🇷","Ukraine":"🇺🇦","Greece":"🇬🇷",
  "Tunisia":"🇹🇳","Algeria":"🇩🇿","Egypt":"🇪🇬","Ivory Coast":"🇨🇮",
  "Costa Rica":"🇨🇷","Panama":"🇵🇦","Honduras":"🇭🇳","Guatemala":"🇬🇹",
  "South Africa":"🇿🇦","Curaçao":"🇨🇼","Jamaica":"🇯🇲","Trinidad and Tobago":"🇹🇹",
  "New Zealand":"🇳🇿","Fiji":"🇫🇯","Tahiti":"🇵🇫","Cuba":"🇨🇺",
  "El Salvador":"🇸🇻","Belize":"🇧🇿","Suriname":"🇸🇷","Guyana":"🇬🇾",
  "China PR":"🇨🇳","Indonesia":"🇮🇩","Philippines":"🇵🇭","Vietnam":"🇻🇳",
  "Iraq":"🇮🇶","Bahrain":"🇧🇭","Oman":"🇴🇲","Kuwait":"🇰🇼",
  "Jordan":"🇯🇴","UAE":"🇦🇪","United Arab Emirates":"🇦🇪",
  "Uzbekistan":"🇺🇿","Kyrgyzstan":"🇰🇬","Tajikistan":"🇹🇯",
  "Rwanda":"🇷🇼","Zimbabwe":"🇿🇼","Tanzania":"🇹🇿","Uganda":"🇺🇬",
  "Zambia":"🇿🇲","Guinea":"🇬🇳","Mali":"🇲🇱","Burkina Faso":"🇧🇫",
};

function getFlag(name) { return FLAGS[name] || "🏳"; }

/**
 * Render a team crest <img> tag. Falls back to flag emoji if no crest URL.
 * On load error the img is hidden (team name still shows).
 */
function teamCrest(team, size = 22) {
  if (!team?.crest) return `<span class="crest-emoji">${getFlag(team?.name)}</span>`;
  const safe = (team?.shortName || team?.name || "").replace(/"/g, "");
  return `<img class="team-crest" src="${team.crest}" width="${size}" height="${size}"
    alt="${safe}" loading="lazy" onerror="this.style.display='none'">`;
}

/**
 * Render form string "W,D,L,W,W" as coloured badges.
 * Shows last 5 results.
 */
function renderForm(form) {
  if (!form) return `<span style="color:var(--text-muted);font-size:0.7rem">—</span>`;
  return `<div class="form-badges">${
    form.split(",").slice(-5).map(r => {
      const cls = r === "W" ? "win" : r === "D" ? "draw" : "loss";
      const label = r === "W" ? "Win" : r === "D" ? "Draw" : "Loss";
      return `<span class="form-badge ${cls}" title="${label}">${r}</span>`;
    }).join("")
  }</div>`;
}

/** Goal difference with colour coding */
function gdText(gd) {
  if (gd === undefined || gd === null) return "-";
  const sign = gd > 0 ? "+" : "";
  const color = gd > 0 ? "var(--green)" : gd < 0 ? "var(--live-red)" : "var(--text-secondary)";
  return `<span style="color:${color};font-weight:700">${sign}${gd}</span>`;
}

/** Format date in user's local timezone */
function fmtDate(isoStr) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format time in user's local timezone */
function fmtTime(isoStr) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/** Translate API stage codes to readable labels */
function fmtStage(stage) {
  const map = {
    GROUP_STAGE:"Group Stage", ROUND_OF_16:"Round of 16",
    QUARTER_FINALS:"Quarter-Finals", SEMI_FINALS:"Semi-Finals",
    FINAL:"Final", THIRD_PLACE:"Third Place",
    ROUND_1:"Round 1", ROUND_2:"Round 2", ROUND_3:"Round 3",
  };
  return map[stage] || stage || "";
}

/**
 * Free-tier workaround: API keeps status=TIMED during live matches.
 * Infer "likely live" from kickoff time (90 min + 40 min buffer).
 */
function isLikelyLive(match) {
  if (["IN_PLAY","PAUSED","LIVE"].includes(match.status)) return true;
  if (match.status === "FINISHED") return false;
  const now  = Date.now();
  const start = new Date(match.utcDate).getTime();
  return now >= start && now <= start + 130 * 60 * 1000;
}

/** True if the API has returned an actual score (free tier: only after FT) */
function hasScore(match) {
  const ft = match.score?.fullTime;
  const ht = match.score?.halfTime;
  return (ft?.home !== null && ft?.away !== null) ||
         (ht?.home !== null && ht?.away !== null);
}

/** Render a coloured status badge */
function statusBadge(match) {
  const s = match.status;
  if (["IN_PLAY","PAUSED","LIVE"].includes(s)) {
    const min = match.minute || "";
    return `<span class="match-time-badge live">⏱ ${min ? min + "'" : "LIVE"}</span>`;
  }
  if (s === "FINISHED") return `<span class="match-time-badge done">Full Time</span>`;
  // Free-tier: infer live from time
  if (isLikelyLive(match))
    return `<span class="match-time-badge live">⚡ LIVE</span>`;
  if (["TIMED","SCHEDULED"].includes(s))
    return `<span class="match-time-badge soon">${fmtTime(match.utcDate)}</span>`;
  return `<span class="match-time-badge done">${s}</span>`;
}

/** Extract score string "H : A" */
function scoreDisplay(match) {
  const s = match.score;
  if (!s) return "- : -";
  const h = s.fullTime?.home ?? s.halfTime?.home ?? null;
  const a = s.fullTime?.away ?? s.halfTime?.away ?? null;
  return (h === null || a === null) ? "- : -" : `${h} : ${a}`;
}

// ── Tab switching ──────────────────────────────────────────────

const TABS = ["overview", "matches", "standings", "scorers"];
TABS.forEach(t =>
  document.querySelector(`[data-tab="${t}"]`)
    ?.addEventListener("click", () => switchTab(t))
);

function switchTab(id) {
  TABS.forEach(t => {
    document.querySelector(`[data-tab="${t}"]`)?.classList.toggle("active", t === id);
    $(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`)?.classList.toggle("active", t === id);
  });
}

// ── Particle background ────────────────────────────────────────

function initParticles() {
  const c = $("particles");
  if (!c) return;
  for (let i = 0; i < 25; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.cssText = `left:${Math.random()*100}%;width:${Math.random()*3+1}px;` +
      `height:${Math.random()*3+1}px;animation-duration:${Math.random()*15+10}s;` +
      `animation-delay:${Math.random()*10}s;opacity:${Math.random()*0.4}`;
    c.appendChild(p);
  }
}

// ── Data store ────────────────────────────────────────────────

let allMatches    = [];
let allScorersData = null;

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`[Fetch Error] ${url}:`, e.message);
    return null;
  }
}

// ── RENDER: Live matches ───────────────────────────────────────

function renderLiveMatches(matches) {
  // Use time-based inference so free-tier delayed status still shows live matches
  const live = matches.filter(isLikelyLive);
  const container = $("liveMatchesContainer");
  const liveCount = $("liveCount");
  if (liveCount) liveCount.textContent = live.length;
  if (!container) return;

  if (!live.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📡</span>
        <p>No matches in progress right now</p>
      </div>`;
    return;
  }

  // True API live vs time-inferred
  const apiLive = ["IN_PLAY","PAUSED","LIVE"];
  container.innerHTML = live.map(m => {
    const home    = m.homeTeam?.shortName || m.homeTeam?.name || "Home";
    const away    = m.awayTeam?.shortName || m.awayTeam?.name || "Away";
    const score   = scoreDisplay(m);
    const min     = m.minute || "";
    const isReal  = apiLive.includes(m.status);
    const timeLabel = isReal ? (min ? min + "'" : "In Progress") : "In Progress";
    const delayed = !isReal
      ? `<div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px">⚡ Scores update after FT (free tier)</div>`
      : "";
    return `
      <div class="live-match-card">
        <div class="live-match-header">
          <div class="live-tag"><span class="live-dot"></span>LIVE</div>
          <span class="match-stage">${fmtStage(m.stage)}</span>
        </div>
        <div class="match-score-row">
          <div class="team-block">
            <div class="team-crest-lg">${teamCrest(m.homeTeam, 48)}</div>
            <div class="team-name">${home}</div>
          </div>
          <div class="score-center">
            <div class="score-numbers">${hasScore(m) ? score : "? : ?"}</div>
            <div class="match-time">${timeLabel}</div>
            ${delayed}
          </div>
          <div class="team-block">
            <div class="team-crest-lg">${teamCrest(m.awayTeam, 48)}</div>
            <div class="team-name">${away}</div>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ── RENDER: Recent matches (overview centre) ───────────────────

function renderRecentMatches(matches) {
  const finished = [...matches]
    .filter(m => m.status === "FINISHED")
    .sort((a,b) => new Date(b.utcDate) - new Date(a.utcDate))
    .slice(0, 5)
    .reverse();
  // Time-inferred live matches (free tier: status stays TIMED during game)
  const liveNow = matches.filter(m =>
    isLikelyLive(m) && m.status !== "FINISHED"
  );
  const upcoming = [...matches]
    .filter(m => ["SCHEDULED","TIMED"].includes(m.status) && !isLikelyLive(m))
    .sort((a,b) => new Date(a.utcDate) - new Date(b.utcDate))
    .slice(0, 5);

  // Order: live first, then recent finished, then upcoming
  const combined = [...liveNow, ...finished, ...upcoming];
  const container = $("recentMatchesContainer");
  if (!container) return;

  if (!combined.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📅</span><p>No match data available</p></div>`;
    return;
  }
  container.innerHTML = combined.map(renderMatchCard).join("");
}

function renderMatchCard(m) {
  const home       = m.homeTeam?.shortName || m.homeTeam?.name || "Home";
  const away       = m.awayTeam?.shortName || m.awayTeam?.name || "Away";
  const live       = isLikelyLive(m) && m.status !== "FINISHED";
  const isFinished = m.status === "FINISHED";
  // Show score if: truly finished, live with score, or API returned score
  const showScore  = isFinished || hasScore(m);

  return `
    <div class="match-card ${live?"is-live":""} ${isFinished?"is-finished":""}">
      <div class="team-cell">
        ${teamCrest(m.homeTeam, 26)}
        <span class="name">${home}</span>
      </div>
      <div class="match-center">
        ${showScore
          ? `<div class="score-box">${scoreDisplay(m)}</div>`
          : live
            ? `<div class="score-box vs" style="font-size:0.8rem">? : ?</div>`
            : `<div class="score-box vs">VS</div>`}
        ${statusBadge(m)}
        <div class="match-date-small">${fmtDate(m.utcDate)}</div>
      </div>
      <div class="team-cell right">
        <span class="name">${away}</span>
        ${teamCrest(m.awayTeam, 26)}
      </div>
    </div>`;
}

// ── RENDER: Full schedule ──────────────────────────────────────

let currentFilter = "all";

function renderFullMatches(matches) {
  const container = $("matchesFullList");
  if (!container) return;

  const filtered = currentFilter === "all"
    ? matches
    : matches.filter(m => currentFilter === "LIVE"
        ? isLikelyLive(m)          // free-tier: use time inference for LIVE filter
        : m.status === currentFilter);

  const sorted = [...filtered].sort((a,b) => new Date(a.utcDate) - new Date(b.utcDate));

  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>No matches found for this filter</p></div>`;
    return;
  }

  container.innerHTML = sorted.map(m => {
    const home      = m.homeTeam?.name || "Home";
    const away      = m.awayTeam?.name || "Away";
    const isLive    = ["IN_PLAY","PAUSED"].includes(m.status);
    const isFinished = m.status === "FINISHED";
    const showScore = isLive || isFinished;
    const referee   = m.referees?.[0]?.name;
    const groupLabel = m.group ? " · " + m.group.replace("GROUP_","Group ") : "";

    return `
      <div class="match-full-card ${isLive ? "is-live" : ""}">
        <div class="match-datetime">
          <strong>${fmtDate(m.utcDate)}</strong>
          ${fmtTime(m.utcDate)} <span style="color:var(--text-muted);font-size:0.65rem">(local)</span>
          <br/><small style="color:var(--text-muted)">${fmtStage(m.stage)}${groupLabel}</small>
          ${referee ? `<br/><small style="color:var(--text-muted)">🏁 ${referee}</small>` : ""}
        </div>
        <div class="mfc-team">
          ${teamCrest(m.homeTeam, 24)}
          <span>${home}</span>
        </div>
        <div class="mfc-score">${showScore ? scoreDisplay(m) : "VS"}</div>
        <div class="mfc-team right">
          <span>${away}</span>
          ${teamCrest(m.awayTeam, 24)}
        </div>
        <div class="mfc-status">${statusBadge(m)}</div>
      </div>`;
  }).join("");
}

document.querySelectorAll("#matchFilterGroup .filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#matchFilterGroup .filter-btn")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.status;
    renderFullMatches(allMatches);
  });
});

// ── RENDER: Standings (mini sidebar) ──────────────────────────

function renderStandingsMini(standings) {
  const container = $("standingsMini");
  if (!container || !standings?.standings) return;
  const group = standings.standings[0];
  if (!group) return;

  container.innerHTML = `
    <div class="standings-list">
      <div class="standing-row header">
        <span class="pos">#</span>
        <span class="team-info">Team</span>
        <span class="stat">P</span>
        <span class="stat">W</span>
        <span class="stat">D</span>
        <span class="stat">L</span>
        <span class="stat">GD</span>
        <span class="pts">Pts</span>
      </div>
      ${group.table.slice(0, 6).map((r, i) => `
        <div class="standing-row ${i < 2 ? "top-2" : ""}">
          <span class="pos">${r.position}</span>
          <div class="team-info">
            ${teamCrest(r.team, 18)}
            <span class="tname">${r.team?.shortName || r.team?.name || "-"}</span>
          </div>
          <span class="stat">${r.playedGames}</span>
          <span class="stat">${r.won}</span>
          <span class="stat">${r.draw}</span>
          <span class="stat">${r.lost}</span>
          <span class="stat">${gdText(r.goalDifference)}</span>
          <span class="pts">${r.points}</span>
        </div>`).join("")}
    </div>`;
}

// ── RENDER: Full standings ─────────────────────────────────────

function renderStandingsFull(standings) {
  const container = $("standingsFull");
  if (!container) return;
  if (!standings?.standings?.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📊</span><p>Standings not available yet</p></div>`;
    return;
  }

  container.innerHTML = standings.standings.map(group => {
    const groupName = group.group
      ? group.group.replace("GROUP_", "Group ")
      : (group.stage || "Group");
    return `
      <div class="group-block">
        <div class="group-title">${groupName}</div>
        <div class="panel-card" style="padding:1rem;overflow-x:auto;">
          <div class="standings-list">
            <div class="standing-row standing-row--full header">
              <span class="pos">#</span>
              <span class="team-info">Team</span>
              <span class="stat">P</span>
              <span class="stat">W</span>
              <span class="stat">D</span>
              <span class="stat">L</span>
              <span class="stat">GF</span>
              <span class="stat">GA</span>
              <span class="stat">GD</span>
              <span class="stat form-header">Form</span>
            </div>
            ${group.table.map((r, i) => `
              <div class="standing-row standing-row--full ${i < 2 ? "top-2" : ""}">
                <span class="pos">${r.position}</span>
                <div class="team-info">
                  ${teamCrest(r.team, 20)}
                  <span class="tname">${r.team?.shortName || r.team?.name || "-"}</span>
                </div>
                <span class="stat">${r.playedGames}</span>
                <span class="stat">${r.won}</span>
                <span class="stat">${r.draw}</span>
                <span class="stat">${r.lost}</span>
                <span class="stat">${r.goalsFor ?? "-"}</span>
                <span class="stat">${r.goalsAgainst ?? "-"}</span>
                <span class="stat">${gdText(r.goalDifference)}</span>
                <span class="pts">${r.points}</span>
                <span class="stat form-cell">${renderForm(r.form)}</span>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  }).join("");
}

// ── RENDER: Scorers (mini sidebar) ────────────────────────────

const RANK_COLORS = ["gold","silver","bronze"];

function renderScorersMini(scorersData) {
  const container = $("scorersMini");
  if (!container || !scorersData?.scorers) return;

  container.innerHTML = scorersData.scorers.slice(0, 8).map((s, i) => `
    <div class="scorer-row">
      <span class="scorer-rank ${RANK_COLORS[i]||""}">${i+1}</span>
      <div class="scorer-info">
        <div class="scorer-name">${s.player?.name || "-"}</div>
        <div class="scorer-team">
          ${teamCrest(s.team, 14)}
          ${s.team?.shortName || s.team?.name || ""}
        </div>
      </div>
      <div class="scorer-goals">${s.goals ?? 0}</div>
    </div>`).join("");
}

// ── RENDER: Dual independent leaderboards ─────────────────────

/**
 * Build one leaderboard row.
 * primaryStat: 'goals' | 'assists'
 */
function renderLeaderboardRow(s, rank, primaryStat, primaryIcon) {
  const val    = s[primaryStat] ?? 0;
  const secStat = primaryStat === "goals" ? "assists" : "goals";
  const secVal  = s[secStat] ?? 0;
  const secLbl  = primaryStat === "goals" ? "Assists" : "Goals";
  const nat     = s.player?.nationality ? ` · ${s.player.nationality}` : "";
  const penNote = (primaryStat === "goals" && s.penalties)
    ? `<span class="penalty-note">(${s.penalties} pen)</span>` : "";

  return `
    <div class="lb-row">
      <div class="lb-rank ${RANK_COLORS[rank] || ""}">${rank + 1}</div>
      <div class="lb-crest">${teamCrest(s.team, 30)}</div>
      <div class="lb-info">
        <div class="lb-name">${s.player?.name || "-"}</div>
        <div class="lb-meta">${s.team?.shortName || s.team?.name || ""}${nat}</div>
      </div>
      <div class="lb-primary">
        <span class="lb-primary-val">${val}</span>
        <span class="lb-primary-icon">${primaryIcon}</span>
        ${penNote}
      </div>
      <div class="lb-secondary">
        <span class="lb-sec-val">${secVal}</span>
        <span class="lb-sec-lbl">${secLbl}</span>
      </div>
    </div>`;
}

function renderGoalScorers(scorersData) {
  const container = $("goalScorersList");
  if (!container) return;
  if (!scorersData?.scorers?.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">⚽</span><p>No goals scored yet</p></div>`;
    return;
  }
  const sorted = [...scorersData.scorers]
    .filter(s => (s.goals ?? 0) > 0)
    .sort((a,b) => (b.goals ?? 0) - (a.goals ?? 0));
  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">⚽</span><p>No goals scored yet</p></div>`;
    return;
  }
  container.innerHTML = `<div class="lb-list">${
    sorted.map((s, i) => renderLeaderboardRow(s, i, "goals", "⚽")).join("")
  }</div>`;
}

function renderAssistLeaders(scorersData) {
  const container = $("assistLeadersList");
  if (!container) return;
  if (!scorersData?.scorers?.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🎯</span><p>No assists recorded yet</p></div>`;
    return;
  }
  const sorted = [...scorersData.scorers]
    .filter(s => (s.assists ?? 0) > 0)
    .sort((a,b) => (b.assists ?? 0) - (a.assists ?? 0));
  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🎯</span><p>No assists recorded yet</p></div>`;
    return;
  }
  container.innerHTML = `<div class="lb-list">${
    sorted.map((s, i) => renderLeaderboardRow(s, i, "assists", "🎯")).join("")
  }</div>`;
}


// ── Main refresh ──────────────────────────────────────────────

async function refreshAll() {
  const [matchesData, standingsData, scorersData] = await Promise.all([
    fetchJSON("/api/matches"),
    fetchJSON("/api/standings"),
    fetchJSON("/api/scorers"),
  ]);

  // Timestamp
  const lu = $("lastUpdate");
  if (lu) lu.textContent = `Updated ${new Date().toLocaleTimeString("en-US",
    {hour:"2-digit",minute:"2-digit",second:"2-digit"})}`;

  // Matches
  if (matchesData?.matches) {
    allMatches = matchesData.matches;
    renderLiveMatches(allMatches);
    renderRecentMatches(allMatches);
    renderFullMatches(allMatches);
  }

  // Standings
  if (standingsData) {
    renderStandingsMini(standingsData);
    renderStandingsFull(standingsData);
  }

  // Scorers — render both independent leaderboards
  if (scorersData) {
    allScorersData = scorersData;
    renderScorersMini(scorersData);
    renderGoalScorers(scorersData);
    renderAssistLeaders(scorersData);
  }
}

// ── Init ──────────────────────────────────────────────────────

(async function init() {
  initParticles();
  await refreshAll();
  setInterval(refreshAll, 30_000);
})();
