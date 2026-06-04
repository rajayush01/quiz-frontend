import React, {
  useEffect, useMemo, useState, useRef, useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL)
  || "http://localhost:5000/api";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("quiz_admin_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || "Request failed");
  return data;
}

const api = {
  // ── Existing ──────────────────────────────────────────────────────────
  registerUser:      (name)    => apiRequest("/users/register", { method: "POST", body: JSON.stringify({ name }) }),
  loginAdmin:        (payload) => apiRequest("/admin/login",    { method: "POST", body: JSON.stringify(payload) }),
  getQuestions:      ()        => apiRequest("/admin/questions"),
  createQuestion:    (payload) => apiRequest("/admin/questions", { method: "POST", body: JSON.stringify(payload) }),
  updateQuestion:    (id, p)   => apiRequest(`/admin/questions/${id}`, { method: "PUT",  body: JSON.stringify(p) }),
  deleteQuestion:    (id)      => apiRequest(`/admin/questions/${id}`, { method: "DELETE" }),
  getQuizzes:        ()        => apiRequest("/quizzes"),
  createQuiz:        (payload) => apiRequest("/quizzes", { method: "POST", body: JSON.stringify(payload) }),
  updateQuiz:        (id, p)   => apiRequest(`/quizzes/${id}`, { method: "PUT",  body: JSON.stringify(p) }),
  deleteQuiz:        (id)      => apiRequest(`/quizzes/${id}`, { method: "DELETE" }),
  activateQuiz:      (id)      => apiRequest(`/quizzes/${id}/activate`, { method: "PATCH" }),
  getAdminResults:   ()        => apiRequest("/admin/results"),
  getAdminLeaderboard: ()      => apiRequest("/admin/results/leaderboard"),
  getAdminStats:     ()        => apiRequest("/admin/results/stats"),

  // ── Live session ──────────────────────────────────────────────────────
  liveStart:         (quizId)  => apiRequest("/live/start",        { method: "POST", body: JSON.stringify({ quizId }) }),
  liveNext:          ()        => apiRequest("/live/next",          { method: "POST" }),
  liveEndQuestion:   ()        => apiRequest("/live/end-question",  { method: "POST" }),
  liveLeaderboard:   ()        => apiRequest("/live/leaderboard"),
  liveState:         ()        => apiRequest("/live/state"),

  liveJoin:   (userId) => apiRequest("/live/join",   { method: "POST", body: JSON.stringify({ userId }) }),
  liveAnswer: (payload)=> apiRequest("/live/answer", { method: "POST", body: JSON.stringify(payload) }),
};

// ── Sarcastic messages ─────────────────────────────────────────────────────
const CORRECT_MSGS = [
  "Oh wow, you actually got one right 🤯",
  "Even a broken clock is right twice a day!",
  "Did you... cheat? No? Impressive.",
  "Your neurons fired! Alert the press!",
  "Correct! Frame this moment. Truly historic.",
];
const WRONG_MSGS = [
  "Yikes. Just... yikes.",
  "Wrong! But hey, participation trophy?",
  "Have you tried reading the question?",
  "Your ancestors are crying somewhere.",
  "Wow. That was a choice. A very wrong choice.",
];
const CORRECT_GIFS = [
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif",
  "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif",
];
const WRONG_GIFS = [
  "https://media.giphy.com/media/l2JehQ2GitHGdVG9y/giphy.gif",
  "https://media.giphy.com/media/3o7TKtyuPNnECsMalq/giphy.gif",
];
const LOADING_QUIPS = [
  "Summoning your questions from the void...",
  "Preparing humiliation in 3, 2, 1...",
  "Loading... just like your brain.",
  "Making the quiz harder just for you...",
];
const BG_STICKERS = ["🧠","💀","🤡","🎯","🦆","🍕","😅","🧸","🎪","🌮","🤓","🫠","💫","🎲","🥴"];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Confetti ────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#ff9f7f","#ffc4a0","#b5ead7","#ffdac1","#e2f0cb","#c7ceea","#ffb7b2","#f8e1b4"];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 10 + 4,
      d: Math.random() * 6 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltIncrement: Math.random() * 0.05 + 0.02,
    }));
    let frame;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.tiltAngle += p.tiltIncrement;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) * 0.8;
        p.x += Math.sin(p.d) * 1.5;
        p.tilt = Math.sin(p.tiltAngle) * 12;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r / 2, p.tilt, 0, 2 * Math.PI);
        ctx.fill();
      });
      frame = requestAnimationFrame(draw);
    }
    draw();
    const t = setTimeout(() => cancelAnimationFrame(frame), 4000);
    return () => { cancelAnimationFrame(frame); clearTimeout(t); };
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999 }} />;
}

function ParticleBurst({ active, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const colors = ["#ff9f7f","#ffc4a0","#ffb347","#f4a261","#ffd700","#ff6b6b","#b5ead7","#c3b1e1"];
    const particles = Array.from({ length: 120 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 18 + 6;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 10 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        shape: Math.random() > 0.5 ? "circle" : "star",
      };
    });
    // Big emoji burst text
    const emojis = ["✨","⭐","💥","🎉","🌟"];
    let frame;
    let tick = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45; // gravity
        p.vx *= 0.97;
        p.alpha -= 0.022;
        if (p.alpha <= 0) return;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(tick * 0.05);
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const ia = a + (2 * Math.PI) / 10;
            ctx.lineTo(Math.cos(a) * p.r, Math.sin(a) * p.r);
            ctx.lineTo(Math.cos(ia) * (p.r * 0.4), Math.sin(ia) * (p.r * 0.4));
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      });
      // Center flash ring
      if (tick < 12) {
        const ringR = tick * 22;
        ctx.globalAlpha = Math.max(0, 0.6 - tick * 0.05);
        ctx.strokeStyle = "#ffb347";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      tick++;
      frame = requestAnimationFrame(draw);
    }
    draw();
    const t = setTimeout(() => { cancelAnimationFrame(frame); onDone?.(); }, 1800);
    return () => { cancelAnimationFrame(frame); clearTimeout(t); };
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9998 }} />;
}

function FireworksBurst({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#ff9f7f","#ffc4a0","#ffb347","#f4a261","#ffd700","#ff6b6b","#b5ead7","#c3b1e1","#52b788","#74b3ce"];
    let rockets = [];
    let frame;
    function makeRocket() {
      const x = Math.random() * canvas.width;
      const y = canvas.height + 20;
      const targetY = Math.random() * canvas.height * 0.55 + 60;
      const color = colors[Math.floor(Math.random() * colors.length)];
      rockets.push({ x, y, targetY, vy: -(Math.abs(targetY - y) / 28), exploded: false, particles: [], color, trail: [] });
    }
    // Stagger rockets
    const timers = [0,400,700,1100,1400,1800,2100,2500].map(d => setTimeout(makeRocket, d));
    function explode(r) {
      r.exploded = true;
      for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 2;
        r.particles.push({
          x: r.x, y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * 5 + 2,
          color: r.color,
          alpha: 1,
        });
      }
    }
    function draw() {
      ctx.fillStyle = "rgba(254,246,236,0.13)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      rockets.forEach(r => {
        if (!r.exploded) {
          r.y += r.vy;
          r.trail.push({ x: r.x, y: r.y });
          if (r.trail.length > 14) r.trail.shift();
          r.trail.forEach((t, i) => {
            ctx.globalAlpha = (i / r.trail.length) * 0.5;
            ctx.fillStyle = r.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
          if (r.y <= r.targetY) explode(r);
        } else {
          r.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.18;
            p.vx *= 0.97;
            p.alpha -= 0.018;
            if (p.alpha <= 0) return;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
      });
      frame = requestAnimationFrame(draw);
    }
    draw();
    const stopT = setTimeout(() => cancelAnimationFrame(frame), 5000);
    return () => { cancelAnimationFrame(frame); clearTimeout(stopT); timers.forEach(clearTimeout); };
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9997 }} />;
}

function FloatingStickers() {
  return (
    <div className="stickers-bg" aria-hidden="true">
      {BG_STICKERS.map((s, i) => (
        <div key={i} className={`bg-sticker sticker-${i}`}>{s}</div>
      ))}
    </div>
  );
}

function BlobBg() {
  return (
    <div className="blob-bg">
      <div className="blob blob-1" /><div className="blob blob-2" />
      <div className="blob blob-3" /><div className="blob blob-4" />
    </div>
  );
}

function ProgressRing({ value, max, size = 56 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (value / max);
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(180,100,80,0.15)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#rg)" strokeWidth="5"
        strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
        style={{ transition:"stroke-dasharray 0.5s ease" }} />
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff9f7f" /><stop offset="100%" stopColor="#ffb347" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function XPBar({ xp, maxXp = 100 }) {
  return (
    <div className="xp-bar-wrap">
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width:`${Math.min((xp/maxXp)*100,100)}%` }} />
      </div>
      <span className="xp-label">⭐ {xp} pts</span>
    </div>
  );
}

function StreakBadge({ streak }) {
  if (!streak) return null;
  return (
    <div className="streak-badge">
      🔥 {streak}x streak {streak >= 3 ? "— ok genius calm down" : ""}
    </div>
  );
}

const TIMER_QUIPS = { 15:"Still thinking? Adorable.", 10:"Tick tock, genius.", 5:"Oh no. OH NO.", 3:"PANICKING IS VALID" };
function Timer({ seconds, total }) {
  const pct   = seconds / total;
  const color = pct > 0.5 ? "#52b788" : pct > 0.25 ? "#f4a261" : "#e63946";
  const quip  = TIMER_QUIPS[seconds] || null;
  return (
    <div className="timer-wrap">
      <svg width={52} height={52} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
        <circle cx={26} cy={26} r={22} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${138.2*pct} 138.2`} strokeLinecap="round"
          style={{ transition:"all 1s linear" }} />
      </svg>
      <span className="timer-num" style={{ color }}>{seconds}</span>
      {quip && <div className="timer-quip">{quip}</div>}
    </div>
  );
}

function FeedbackOverlay({ show, correct, gif, msg, onDone }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return (
    <div className={`feedback-overlay ${correct ? "correct" : "wrong"}`}>
      <div className="feedback-card">
        <div className="feedback-top">
          <span className="feedback-emoji">{correct ? "🎉" : "💀"}</span>
          <div className="feedback-label">{correct ? "CORRECT!" : "WRONG!"}</div>
        </div>
        <div className="feedback-msg">{msg}</div>
        <div className="feedback-gif-wrap">
          <img src={gif} alt="reaction gif" className="feedback-gif" loading="lazy" />
          <div className="gif-caption">{correct ? "ur brain works! wild!" : "rip. F in chat."}</div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [view, setView] = useState("take");
  return (
    <div className="app-root">
      <BlobBg />
      <FloatingStickers />
      <nav className="top-nav">
        <div className="nav-brand">
          <span className="brand-emoji">🧠</span>
          <span className="brand-text">BrainRot<span className="brand-accent">Quiz</span></span>
          <span className="brand-tag">™️ not FDA approved</span>
        </div>
        <div className="nav-tabs">
          <button className={view === "take" ? "nav-tab active" : "nav-tab"} onClick={() => setView("take")}>🎮 Suffer</button>
          <button className={view === "admin" ? "nav-tab active" : "nav-tab"} onClick={() => setView("admin")}>🛡 Admin (serious)</button>
        </div>
      </nav>
      <div className="app-body">
        {view === "take" ? <CandidateExperience /> : <AdminExperience />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CANDIDATE FLOW  (SSE-driven, Mentimeter-style)
// ════════════════════════════════════════════════════════════════════════════
function CandidateExperience() {
  // Registration
  const [stage,    setStage]    = useState("register"); // register | lobby | question | waiting | leaderboard | finished
  const [name,     setName]     = useState("");
  const [user,     setUser]     = useState(null);
  const [attemptId,setAttemptId]= useState(null);
  const [sessionInfo, setSessionInfo] = useState(null); // { quizTitle, totalQuestions }
  const [particleBurst, setParticleBurst] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [liveTotal,     setLiveTotal]     = useState(0);

  // Live question state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex,   setQuestionIndex]   = useState(0);
  const [totalQuestions,  setTotalQuestions]  = useState(0);
  const [timeLimitSecs,   setTimeLimitSecs]   = useState(20);
  const [questionStartedAt, setQuestionStartedAt] = useState(null);

  // Answer state
  const [answered,  setAnswered]  = useState(false);
  const [feedback,  setFeedback]  = useState({ show:false, correct:false, gif:"", msg:"" });
  const [myScore,   setMyScore]   = useState(0);
  const [streak,    setStreak]    = useState(0);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);

  // Timer (client-side countdown mirrored from server)
  const [timerSec, setTimerSec] = useState(20);
  const timerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [confetti,setConfetti]= useState(false);

  const sseRef = useRef(null);

  // ── Client-side timer (cosmetic, server is authoritative) ─────────────
  const startClientTimer = useCallback((secs) => {
    clearInterval(timerRef.current);
    setTimerSec(secs);
    timerRef.current = setInterval(() => {
      setTimerSec(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  // ── SSE connection ─────────────────────────────────────────────────────
  const connectSSE = useCallback((uid) => {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`${API_BASE_URL}/live/stream?userId=${uid}`);
    sseRef.current = es;

    es.addEventListener("sync", (e) => {
      const d = JSON.parse(e.data);
      handleSyncEvent(d);
    });

    es.addEventListener("session_started", (e) => {
      const d = JSON.parse(e.data);
      setSessionInfo({ quizTitle: d.quizTitle, totalQuestions: d.totalQuestions });
      setTotalQuestions(d.totalQuestions);
      setStage("lobby");
    });

    es.addEventListener("question", (e) => {
      const d = JSON.parse(e.data);
      clearInterval(timerRef.current);
      setCurrentQuestion(d.question);
      setQuestionIndex(d.questionIndex);
      setTotalQuestions(d.totalQuestions);
      setTimeLimitSecs(d.timeLimitSecs);
      setQuestionStartedAt(new Date(d.startedAt));
      setAnswered(false);
      setFeedback({ show:false, correct:false, gif:"", msg:"" });
      setStage("question");
      startClientTimer(d.timeLimitSecs);
    });

    es.addEventListener("leaderboard", (e) => {
      const d = JSON.parse(e.data);
      clearInterval(timerRef.current);
      setLeaderboard(d.leaderboard || []);
      setStage("leaderboard");
    });

    es.addEventListener("session_finished", (e) => {
      const d = JSON.parse(e.data);
      clearInterval(timerRef.current);
      setLeaderboard(d.leaderboard || []);
      if (d.leaderboard?.[0]?.userId === user?._id) setConfetti(true);
      setStage("finished");
    });

    es.addEventListener("live_leaderboard", (e) => {
      const d = JSON.parse(e.data);
      // Update leaderboard in real time while question is in progress
      setLeaderboard(d.leaderboard || []);
      setAnsweredCount(d.answeredCount || 0);
      setLiveTotal(d.total || 0);
    });

    es.onerror = () => {
      // will auto-reconnect
    };
  }, [user, startClientTimer]);

  function handleSyncEvent(d) {
    setTotalQuestions(d.totalQuestions || 0);
    if (d.quizTitle) setSessionInfo(s => ({ ...s, quizTitle: d.quizTitle, totalQuestions: d.totalQuestions }));

    if (d.phase === "lobby") {
      setStage("lobby");
    } else if (d.phase === "question" && d.question) {
      setCurrentQuestion(d.question);
      setQuestionIndex(d.currentIndex);
      setTimeLimitSecs(d.timeLimitSecs || 20);
      const start = new Date(d.questionStartedAt);
      setQuestionStartedAt(start);
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(0, (d.timeLimitSecs || 20) - elapsed);
      startClientTimer(remaining);
      setStage("question");
    } else if (d.phase === "leaderboard") {
      setLeaderboard(d.leaderboard || []);
      setStage("leaderboard");
    } else if (d.phase === "finished") {
      setLeaderboard(d.leaderboard || []);
      setStage("finished");
    } else {
      setStage("lobby");
    }
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (sseRef.current) sseRef.current.close();
    };
  }, []);

  // ── Register & join ───────────────────────────────────────────────────
  const registerAndJoin = async () => {
    if (!name.trim()) return;
    setLoading(true); setError("");
    try {
      const reg = await api.registerUser(name.trim());
      setUser(reg.user);
      const joined = await api.liveJoin(reg.user._id);
      setAttemptId(joined.attemptId);
      setSessionInfo({ quizTitle: joined.quizTitle, totalQuestions: joined.totalQuestions });
      setTotalQuestions(joined.totalQuestions);
      connectSSE(reg.user._id);

      // Sync to current server state
      const state = await api.liveState();
      handleSyncEvent(state);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Answer a question ─────────────────────────────────────────────────
  const handleAnswer = async (val) => {
    if (answered || stage !== "question" || !currentQuestion) return;
    setAnswered(true);
    clearInterval(timerRef.current);
    try {
      const result = await api.liveAnswer({
        userId:     user._id,
        questionId: currentQuestion._id,
        answer:     val,
      });
      const isCorrect = result.isCorrect;
      setMyScore(result.totalScore);
      if (isCorrect){
        setStreak(s => s + 1);
        setParticleBurst(true);
      }  
      else           setStreak(0);

      const gif = isCorrect ? randomFrom(CORRECT_GIFS) : randomFrom(WRONG_GIFS);
      const msg = isCorrect ? randomFrom(CORRECT_MSGS)  : randomFrom(WRONG_MSGS);
      setFeedback({ show:true, correct:isCorrect, gif, msg });
    } catch (e) {
      // If answer submission fails, still show "answered" state
    }
  };

  const afterFeedback = () => {
    setFeedback({ show:false, correct:false, gif:"", msg:"" });
    setStage("waiting"); // wait for admin to push leaderboard / next question
  };

  const restart = () => {
    setStage("register"); setName(""); setUser(null); setAttemptId(null);
    setCurrentQuestion(null); setAnswered(false); setFeedback({ show:false, correct:false, gif:"", msg:"" });
    setMyScore(0); setStreak(0); setConfetti(false); setLeaderboard([]);
    clearInterval(timerRef.current);
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
  };

  return (
    <div className="candidate-root">
      <Confetti active={confetti} />
      <ParticleBurst active={particleBurst} onDone={() => setParticleBurst(false)} />
      <FeedbackOverlay
        show={feedback.show} correct={feedback.correct} gif={feedback.gif} msg={feedback.msg}
        onDone={afterFeedback}
      />

      {stage === "register" && (
        <RegisterScreen name={name} setName={setName} loading={loading} error={error} onStart={registerAndJoin} />
      )}
      {stage === "lobby" && (
        <LobbyScreen sessionInfo={sessionInfo} />
      )}
      {stage === "question" && currentQuestion && (
        <QuestionScreen
          question={currentQuestion} index={questionIndex} total={totalQuestions}
          myScore={myScore} streak={streak} timerSec={timerSec}
          answered={answered} onAnswer={handleAnswer}
        />
      )}
      {stage === "waiting" && (
        <WaitingScreen
          myScore={myScore} streak={streak} userId={user?._id}
          leaderboard={leaderboard} answeredCount={answeredCount} liveTotal={liveTotal}
        />
      )}
      {stage === "leaderboard" && (
        <CandidateLeaderboardScreen
          leaderboard={leaderboard} userId={user?._id}
          myScore={myScore} questionIndex={questionIndex} totalQuestions={totalQuestions}
        />
      )}
      {stage === "finished" && (
        <FinishedScreen leaderboard={leaderboard} userId={user?._id} myScore={myScore} onRestart={restart} />
      )}
    </div>
  );
}

// ── Lobby (waiting for admin to start) ───────────────────────────────────
function LobbyScreen({ sessionInfo }) {
  return (
    <div className="screen" style={{ flexDirection:"column", gap:20, textAlign:"center" }}>
      <div className="register-card" style={{ alignItems:"center" }}>
        <div style={{ fontSize:"4rem", animation:"mascotBounce 2s ease-in-out infinite" }}>⏳</div>
        <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"2rem" }}>
          Waiting for the quiz to start…
        </h2>
        {sessionInfo && (
          <div className="quiz-preview-card" style={{ width:"100%" }}>
            <div className="qp-top">
              <span className="qp-badge">🟡 LOBBY</span>
              <span className="qp-meta-right">{sessionInfo.totalQuestions} questions</span>
            </div>
            <div className="qp-title">{sessionInfo.quizTitle}</div>
            <div className="qp-footer">Admin will push questions one at a time. Stay sharp. 👀</div>
          </div>
        )}
        <div className="hero-quip">The admin is preparing your humiliation… please stand by.</div>
      </div>
    </div>
  );
}

// ── Waiting between questions ─────────────────────────────────────────────
function WaitingScreen({ myScore, streak }) {
  const quips = [
    "Your answer has been locked in. No take-backs.",
    "Waiting for others to finish embarrassing themselves…",
    "Admin is judging everyone. Including you.",
    "Results incoming. Brace yourself. 🫣",
  ];
  const quip = useMemo(() => randomFrom(quips), []);
  const medals = ["🥇","🥈","🥉"];

  return (
    <div className="screen" style={{ flexDirection:"column", gap:16, alignItems:"center" }}>
      <div className="register-card" style={{ alignItems:"center", gap:14, width:"min(520px,100%)" }}>
        <div style={{ fontSize:"3rem", animation:"mascotBounce 2s ease-in-out infinite" }}>🔒</div>
        <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.6rem" }}>Answer locked in!</h2>
        <div className="hero-quip">{quip}</div>

        <div className="result-stats" style={{ width:"100%" }}>
          <div className="rstat">
            <span className="rstat-val">⭐ {myScore}</span>
            <span className="rstat-lbl">Your Score</span>
          </div>
          <div className="rstat">
            <span className="rstat-val">🔥 {streak}</span>
            <span className="rstat-lbl">Streak</span>
          </div>
          <div className="rstat">
            <span className="rstat-val">✅ {answeredCount}/{liveTotal}</span>
            <span className="rstat-lbl">Answered</span>
          </div>
        </div>

        {/* Live leaderboard */}
        {leaderboard.length > 0 && (
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{
              fontFamily:"'Fredoka One',cursive", fontSize:"0.95rem",
              color:"var(--text)", display:"flex", alignItems:"center", gap:6
            }}>
              📊 Live Standings
              <span style={{
                fontSize:"0.65rem", background:"rgba(230,57,70,0.1)",
                border:"1.5px solid rgba(230,57,70,0.25)", color:"#c0392b",
                padding:"2px 8px", borderRadius:"999px", fontFamily:"'Nunito',sans-serif",
                fontWeight:900, animation:"pulseBadge 1.5s ease-in-out infinite"
              }}>● LIVE</span>
            </div>
            {leaderboard.slice(0, 8).map((row, i) => {
              const isMe = row.userId === userId;
              const prevRank = i; // rank is always sorted, animate color only
              return (
                <div key={row.userId}
                  style={{
                    display:"grid", gridTemplateColumns:"36px 1fr auto",
                    alignItems:"center", gap:8,
                    padding:"9px 12px", borderRadius:12,
                    background: isMe ? "rgba(244,132,95,0.12)" : "var(--warm1)",
                    border: isMe ? "2px solid rgba(244,132,95,0.4)" : "1.5px solid var(--border)",
                    transition:"all 0.4s ease",
                  }}
                >
                  <span style={{ fontSize:"1.2rem", textAlign:"center" }}>{medals[i] || `${i+1}`}</span>
                  <div>
                    <strong style={{ fontSize:"0.88rem", color:"var(--text)", display:"block" }}>
                      {row.name}{isMe ? " (you)" : ""}
                    </strong>
                    {row.lastAnsweredAt && (
                      <span style={{ fontSize:"0.68rem", color:"var(--text-3)", fontWeight:700 }}>
                        ⏱ {new Date(row.lastAnsweredAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily:"'Fredoka One',cursive", fontSize:"1rem",
                    color:"var(--coral)", minWidth:60, textAlign:"right"
                  }}>
                    {row.totalScore} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ fontSize:"0.8rem", color:"var(--text-3)", fontWeight:700 }}>
          ⏳ Waiting for admin to advance to next question…
        </p>
      </div>
    </div>
  );
}

// ── Candidate leaderboard between questions ───────────────────────────────
function CandidateLeaderboardScreen({ leaderboard, userId, myScore, questionIndex, totalQuestions }) {
  const myRank = leaderboard.findIndex(r => r.userId === userId) + 1;
  const medals = ["🥇","🥈","🥉"];
  return (
    <div className="screen" style={{ flexDirection:"column", alignItems:"center" }}>
      <div className="register-card" style={{ alignItems:"center", gap:16 }}>
        <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.8rem" }}>
          🏆 Leaderboard — Q{questionIndex + 1}/{totalQuestions}
        </h2>
        {myRank > 0 && (
          <div className="hero-quip">
            You're #{myRank} — {myRank === 1 ? "Top of the class! Suspicious." : myRank <= 3 ? "Podium! Don't get cocky." : "Room to grow! (a lot of room)"}
          </div>
        )}
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
          {leaderboard.slice(0,10).map((row, i) => (
            <div key={row.userId} className="lb-row"
              style={row.userId === userId ? { background:"rgba(244,132,95,0.12)", borderColor:"rgba(244,132,95,0.4)" } : {}}
            >
              <span className="lb-rank">{medals[i] || `${i+1}`}</span>
              <div>
                <strong>{row.name}{row.userId === userId ? " (you)" : ""}</strong>
                <small>{row.totalScore} pts</small>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize:"0.8rem", color:"var(--text-3)", fontWeight:700 }}>
          ⏳ Waiting for admin to push next question…
        </p>
      </div>
    </div>
  );
}

// ── Finished screen ───────────────────────────────────────────────────────
const GRADE_DATA = {
  S: { label:"Actual Genius",       emoji:"👑", color:"#f4a261", sub:"Okay fine, you're kind of impressive.",             gif:"https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" },
  A: { label:"Pretty Smart",        emoji:"🥇", color:"#52b788", sub:"Not bad at all! Go touch grass to celebrate.",      gif:"https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif" },
  B: { label:"Average Human",       emoji:"🥈", color:"#74b3ce", sub:"Solidly mediocre. We respect it.",                  gif:"https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif" },
  C: { label:"Tried Hard Maybe?",   emoji:"🏅", color:"#e9c46a", sub:"Participation energy. We see you.",                 gif:"https://media.giphy.com/media/3o7TKtyuPNnECsMalq/giphy.gif" },
  F: { label:"Magnificently Wrong", emoji:"🤡", color:"#e63946", sub:"Statistically impressive. You got so few right.", gif:"https://media.giphy.com/media/l2JehQ2GitHGdVG9y/giphy.gif" },
};

function FinishedScreen({ leaderboard, userId, myScore, onRestart }) {
  const myRank = leaderboard.findIndex(r => r.userId === userId) + 1;
  const topScore = leaderboard[0]?.totalScore || 1;
  const pct  = Math.round((myScore / topScore) * 100);
  const grade = pct >= 90 ? GRADE_DATA.S : pct >= 75 ? GRADE_DATA.A : pct >= 60 ? GRADE_DATA.B : pct >= 40 ? GRADE_DATA.C : GRADE_DATA.F;
  const medals = ["🥇","🥈","🥉"];

  const [fireworks, setFireworks] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFireworks(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="screen result-screen">
      <FireworksBurst active={fireworks} />
      <div className="result-card">
        <div className="result-grade-badge" style={{ background:`${grade.color}22`, borderColor:`${grade.color}44` }}>
          <span className="result-emoji">{grade.emoji}</span>
          <div>
            <div className="result-rank-label" style={{ color:grade.color }}>{grade.label}</div>
            <div className="result-sub">{grade.sub}</div>
          </div>
        </div>
        <div className="result-gif-wrap">
          <img src={grade.gif} alt="result reaction" className="result-gif" />
        </div>
        <div className="result-score-big">{myScore}<span> pts</span></div>
        <div className="result-pct">
          Rank #{myRank > 0 ? myRank : "?"} of {leaderboard.length} • {myRank === 1 ? "Undisputed champion! Somehow." : "Better luck next time 💀"}
        </div>

        {/* Top 5 final leaderboard */}
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1rem", color:"var(--text)" }}>🏆 Final Standings</div>
          {leaderboard.slice(0,5).map((row, i) => (
            <div key={row.userId} className="lb-row"
              style={row.userId === userId ? { background:"rgba(244,132,95,0.12)", borderColor:"rgba(244,132,95,0.4)" } : {}}
            >
              <span className="lb-rank">{medals[i] || `${i+1}`}</span>
              <div>
                <strong>{row.name}{row.userId === userId ? " (you)" : ""}</strong>
                <small>{row.totalScore} pts</small>
              </div>
            </div>
          ))}
        </div>

        <div className="result-cta-group">
          <button className="cta-button" onClick={onRestart}>🔄 Go Again (glutton for punishment)</button>
          <p className="result-disclaimer">Results not guaranteed to improve with repetition.</p>
        </div>
      </div>
    </div>
  );
}

// ── Register Screen ────────────────────────────────────────────────────────
const ENTRY_QUIPS = [
  "Warning: May cause temporary feelings of intelligence.",
  "Side effects include: sweating, googling, crying.",
  "Rated E for 'Even you can try this'",
  "No refunds. No mercy. Just vibes.",
];

function RegisterScreen({ name, setName, loading, error, onStart }) {
  const quip = useMemo(() => randomFrom(ENTRY_QUIPS), []);
  return (
    <div className="screen register-screen">
      <div className="register-card">
        <div className="register-hero">
          <div className="hero-sticker-ring">
            <span className="hs hs-1">🧠</span><span className="hs hs-2">💡</span>
            <span className="hs hs-3">🎯</span><span className="hs hs-4">🤯</span>
          </div>
          <div className="hero-mascot">🤖</div>
          <h1 className="hero-title">BrainRot<br/>Quiz</h1>
          <p className="hero-tagline">Test your knowledge.<br/>Embarrass yourself. Grow.</p>
          <div className="hero-quip">⚠️ {quip}</div>
        </div>

        <div className="quiz-preview-card">
          <div className="qp-top">
            <span className="qp-badge">🎯 LIVE MODE</span>
            <span className="qp-meta-right">Questions pushed by admin</span>
          </div>
          <div className="qp-title">Speed-based scoring!</div>
          <div className="qp-footer">⚡ Answer faster = more bonus points. Don't overthink it.</div>
        </div>

        {error && <div className="error-pill">😬 {error}</div>}

        <div className="register-form">
          <div className="input-group">
            <span className="input-emoji">👤</span>
            <input className="glass-input" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name (or your villain alias)"
              onKeyDown={(e) => e.key === "Enter" && onStart()} />
          </div>
          <button className="cta-button" onClick={onStart} disabled={loading || !name.trim()}>
            {loading ? <Spinner /> : <><span>🚀 I'm Ready to Fail</span><span className="btn-sub">( touch the button )</span></>}
          </button>
          <p className="form-disclaimer">By clicking, you agree to not blame us when you get everything wrong.</p>
        </div>

        <div className="fake-social-proof">
          <div className="fsp-avatars">{"😤😩🤡😅😭".split("").map((e,i) => <span key={i}>{e}</span>)}</div>
          <span>2,847 people embarrassed themselves today. Join them.</span>
        </div>
      </div>
    </div>
  );
}

// ── Question Screen (live, one question at a time) ────────────────────────
const Q_ENCOURAGEMENTS = [
  "You got this! (maybe)",
  "Think hard. Or don't. We'll see.",
  "No pressure... okay some pressure.",
  "Your ancestors are watching.",
];

function QuestionScreen({ question, index, total, myScore, streak, timerSec, answered, onAnswer }) {
  const [textVal,  setTextVal]  = useState("");
  const [locked,   setLocked]   = useState(false);
  const options = question.options || [];
  const enc     = useMemo(() => randomFrom(Q_ENCOURAGEMENTS), [question._id]);

  useEffect(() => { setTextVal(""); setLocked(false); }, [question._id]);

  const submit = (val) => {
    if (locked || answered) return;
    setLocked(true);
    onAnswer(val);
  };

  return (
    <div className="screen question-screen">
      {/* HUD */}
      <div className="hud">
        <div className="hud-left">
          <ProgressRing value={index} max={total} />
          <div className="hud-info">
            <span className="hud-label">Question</span>
            <span className="hud-val">{index + 1}<span className="hud-of">/{total}</span></span>
          </div>
        </div>
        <div className="hud-center">
          <XPBar xp={myScore} maxXp={total * 20} />
          <StreakBadge streak={streak} />
        </div>
        <div className="hud-right">
          <Timer seconds={timerSec} total={question.marks ? 20 : 20} />
        </div>
      </div>

      {/* Card */}
      <div className="question-card-wrap">
        <div className="question-card">
          <div className="q-header">
            <span className="q-marks-badge">💎 {question.marks} pts base + ⚡ speed bonus</span>
            <span className="q-type-badge">{question.type === "mcq" ? "🧩 Multiple Choice" : "✍️ Short Answer"}</span>
            <span className="q-enc">{enc}</span>
          </div>
          <h2 className="q-text">{question.question}</h2>

          {answered ? (
            <div className="answered-waiting">
              <span style={{ fontSize:"2rem" }}>✅</span>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem" }}>Answer locked in! Waiting for others…</span>
            </div>
          ) : question.type === "mcq" ? (
            <div className="options-grid">
              {options.map((opt, i) => (
                <button key={opt} className="option-btn" onClick={() => submit(opt)} disabled={locked}>
                  <span className="option-key">{["A","B","C","D"][i]}</span>
                  <span className="option-text">{opt}</span>
                  <span className="option-hover-emoji">{["🤔","🤨","🧐","😬"][i]}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-answer-wrap">
              <div className="textarea-hint">💬 Type your masterpiece below:</div>
              <textarea className="glass-textarea" value={textVal}
                onChange={(e) => setTextVal(e.target.value)}
                placeholder="Your answer here (no, 'idk' is not an answer)..." rows={3} />
              <button className="cta-button" onClick={() => submit(textVal)}
                disabled={locked || !textVal.trim()}>
                🎲 Lock it in (no take-backs)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN FLOW
// ════════════════════════════════════════════════════════════════════════════
function AdminExperience() {
  const [token, setToken] = useState(() => localStorage.getItem("quiz_admin_token") || "");
  if (!token) return <AdminLogin onLogin={setToken} />;
  return <AdminDashboard onLogout={() => { localStorage.removeItem("quiz_admin_token"); setToken(""); }} />;
}

function AdminLogin({ onLogin }) {
  const [email,   setEmail]   = useState("");
  const [pw,      setPw]      = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const submit = async () => {
    setLoading(true); setError("");
    try {
      const d = await api.loginAdmin({ email, password: pw });
      localStorage.setItem("quiz_admin_token", d.token);
      onLogin(d.token);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="screen admin-login-screen">
      <div className="admin-login-card">
        <div className="admin-login-icon">🛡️</div>
        <h2>Admin Only</h2>
        <p className="admin-login-sub">Serious people only past this point. 😤</p>
        {error && <div className="error-pill">😬 {error}</div>}
        <input className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="glass-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" />
        <button className="cta-button" onClick={submit} disabled={loading || !email || !pw}>
          {loading ? <Spinner /> : "🔐 Enter the Vault"}
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState("live");
  const [questions,   setQuestions]   = useState([]);
  const [quizzes,     setQuizzes]     = useState([]);
  const [results,     setResults]     = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [q, qz, r, lb, s] = await Promise.all([
        api.getQuestions(), api.getQuizzes(), api.getAdminResults(),
        api.getAdminLeaderboard(), api.getAdminStats(),
      ]);
      setQuestions(q||[]); setQuizzes(qz||[]); setResults(r||[]);
      setLeaderboard(lb||[]); setStats(s||null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="admin-root">
      <div className="admin-header">
        <h1 className="admin-title">⚡ Mission Control</h1>
        <div className="admin-header-actions">
          <button className="icon-btn" onClick={load} title="Refresh">{loading ? <Spinner /> : "↻"}</button>
          <button className="ghost-btn" onClick={onLogout}>👋 Logout</button>
        </div>
      </div>
      {error && <div className="error-pill">😬 {error}</div>}
      <div className="admin-tabs">
        {["live","dashboard","questions","quizzes"].map((t) => (
          <button key={t} className={tab===t ? "admin-tab active" : "admin-tab"} onClick={() => setTab(t)}>
            {{ live:"🎙 Live Mode", dashboard:"📊 Dashboard", questions:"📝 Questions", quizzes:"🎮 Quizzes" }[t]}
          </button>
        ))}
      </div>
      {tab === "live"      && <AdminLiveMode quizzes={quizzes} />}
      {tab === "dashboard" && <AdminDash stats={stats} results={results} leaderboard={leaderboard} />}
      {tab === "questions" && <QuestionManager questions={questions} onChanged={load} />}
      {tab === "quizzes"   && <QuizManager questions={questions} quizzes={quizzes} onChanged={load} />}
    </div>
  );
}

// ── Admin Live Mode ────────────────────────────────────────────────────────
function AdminLiveMode({ quizzes }) {
  const [selectedQuizId, setSelectedQuizId]     = useState("");
  const [sessionActive,  setSessionActive]      = useState(false);
  const [phase,          setPhase]              = useState("idle"); // idle|lobby|question|leaderboard|finished
  const [currentIndex,   setCurrentIndex]       = useState(-1);
  const [totalQuestions, setTotalQuestions]     = useState(0);
  const [currentQuestion, setCurrentQuestion]   = useState(null);
  const [leaderboard,    setLeaderboard]        = useState([]);
  const [answeredCount,  setAnsweredCount]      = useState(0);
  const [totalPlayers,   setTotalPlayers]       = useState(0);
  const [timerSec,       setTimerSec]           = useState(20);
  const [busy,           setBusy]               = useState(false);
  const [error,          setError]              = useState("");
  const timerRef = useRef(null);
  const sseRef   = useRef(null);

  const activeQuizzes = quizzes.filter(q => q.isActive);

  // ── Connect to SSE so admin sees real-time answer counts ─────────────
  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/live/stream`);
    sseRef.current = es;

    es.addEventListener("answer_count", (e) => {
      const d = JSON.parse(e.data);
      setAnsweredCount(d.answeredCount);
      setTotalPlayers(d.total);
    });
    es.addEventListener("live_leaderboard", (e) => {
      const d = JSON.parse(e.data);
      setLeaderboard(d.leaderboard || []);
      setAnsweredCount(d.answeredCount || 0);
      setTotalPlayers(d.total || 0);
    });
    es.addEventListener("leaderboard", (e) => {
      const d = JSON.parse(e.data);
      setLeaderboard(d.leaderboard || []);
      setPhase("leaderboard");
      clearInterval(timerRef.current);
    });
    es.addEventListener("session_finished", (e) => {
      const d = JSON.parse(e.data);
      setLeaderboard(d.leaderboard || []);
      setPhase("finished");
    });
    es.addEventListener("sync", (e) => {
      const d = JSON.parse(e.data);
      if (d.phase && d.phase !== "idle") {
        setPhase(d.phase);
        setCurrentIndex(d.currentIndex ?? -1);
        setTotalQuestions(d.totalQuestions || 0);
        if (d.question) setCurrentQuestion(d.question);
        if (d.leaderboard) setLeaderboard(d.leaderboard);
        if (d.phase === "question" && d.questionStartedAt) {
          const elapsed  = Math.floor((Date.now() - new Date(d.questionStartedAt)) / 1000);
          const remaining = Math.max(0, 20 - elapsed);
          startAdminTimer(remaining);
        }
        setSessionActive(d.phase !== "idle" && d.phase !== "finished");
      }
    });

    return () => { es.close(); clearInterval(timerRef.current); };
  }, []);

  const startAdminTimer = (secs) => {
    clearInterval(timerRef.current);
    setTimerSec(secs);
    timerRef.current = setInterval(() => {
      setTimerSec(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleStartSession = async () => {
    if (!selectedQuizId) return;
    setBusy(true); setError("");
    try {
      const res = await api.liveStart(selectedQuizId);
      setTotalQuestions(res.totalQuestions);
      setCurrentIndex(-1);
      setPhase("lobby");
      setSessionActive(true);
      setAnsweredCount(0);
      setLeaderboard([]);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleNextQuestion = async () => {
    setBusy(true); setError(""); setAnsweredCount(0);
    try {
      const res = await api.liveNext();
      if (res.message === "Quiz finished") {
        setPhase("finished");
        setLeaderboard(res.leaderboard || []);
        setSessionActive(false);
      } else {
        setCurrentIndex(res.questionIndex);
        setPhase("question");
        startAdminTimer(20);

        // Fetch current state to get question details
        const state = await api.liveState();
        if (state.question) setCurrentQuestion(state.question);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleEndQuestion = async () => {
    setBusy(true); setError("");
    try {
      const res = await api.liveEndQuestion();
      setLeaderboard(res.leaderboard || []);
      setPhase("leaderboard");
      clearInterval(timerRef.current);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const medals = ["🥇","🥈","🥉"];

  return (
    <div className="admin-live-mode">
      {error && <div className="error-pill" style={{ marginBottom:12 }}>😬 {error}</div>}

      {/* ── Session not started ── */}
      {!sessionActive && phase !== "finished" && (
        <div className="live-setup-card">
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.4rem", marginBottom:8 }}>
            🎙 Start a Live Session
          </div>
          <p style={{ color:"var(--text-3)", fontSize:"0.88rem", fontWeight:700, marginBottom:16 }}>
            Pick an active quiz. Questions are pushed one at a time — you control the pace.
          </p>
          {activeQuizzes.length === 0 ? (
            <div className="no-quiz-card">
              <div className="nq-emoji">😴</div>
              <div className="nq-text">No active quiz.</div>
              <div className="nq-sub">Go to Quizzes tab → activate one first.</div>
            </div>
          ) : (
            <>
              <select className="glass-input" value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                style={{ marginBottom:12 }}>
                <option value="">— select a quiz —</option>
                {activeQuizzes.map(q => (
                  <option key={q._id} value={q._id}>
                    {q.title} ({q.questions?.length||0} questions)
                  </option>
                ))}
              </select>
              <button className="cta-button" onClick={handleStartSession}
                disabled={busy || !selectedQuizId} style={{ width:"auto", padding:"12px 32px" }}>
                {busy ? <Spinner /> : "🚀 Start Session"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Lobby / waiting for first push ── */}
      {sessionActive && phase === "lobby" && (
        <div className="live-control-card">
          <div className="live-phase-badge lobby">🟡 LOBBY — waiting for players</div>
          <p style={{ color:"var(--text-2)", fontWeight:700, margin:"10px 0 20px" }}>
            Players are joining. Hit the button when ready to push Question 1.
          </p>
          <div className="live-player-count">
            👥 {totalPlayers} player{totalPlayers !== 1 ? "s" : ""} in the lobby
          </div>
          <button className="cta-button" onClick={handleNextQuestion} disabled={busy}
            style={{ marginTop:16, width:"auto", padding:"13px 36px" }}>
            {busy ? <Spinner /> : "▶ Push Question 1"}
          </button>
        </div>
      )}

      {/* ── Question live ── */}
      {sessionActive && phase === "question" && (
        <div className="admin-grid-2" style={{ gap:16 }}>
          {/* Left: current question card */}
          <div className="live-control-card">
            <div className="live-phase-badge question">🔴 LIVE — Question {currentIndex+1}/{totalQuestions}</div>

            {currentQuestion && (
              <div className="admin-q-preview">
                <div className="q-header" style={{ marginBottom:8 }}>
                  <span className="q-marks-badge">💎 {currentQuestion.marks} pts</span>
                  <span className="q-type-badge">{currentQuestion.type === "mcq" ? "🧩 MCQ" : "✍️ Text"}</span>
                </div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.15rem", color:"var(--text)", lineHeight:1.45, marginBottom:12 }}>
                  {currentQuestion.question}
                </div>
                {currentQuestion.type === "mcq" && currentQuestion.options?.map((opt,i) => (
                  <div key={opt} className="admin-option-row">
                    <span className="option-key" style={{ minWidth:28, height:28, fontSize:"0.8rem" }}>{["A","B","C","D"][i]}</span>
                    <span style={{ fontSize:"0.9rem" }}>{opt}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="live-timer-row">
              <Timer seconds={timerSec} total={20} />
              <div className="live-answer-pill">
                ✅ {answeredCount} / {totalPlayers} answered
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:14 }}>
              <button className="ghost-btn" onClick={handleEndQuestion} disabled={busy}>
                ⏭ End Question Now
              </button>
            </div>
          </div>

          {/* Right: live mini leaderboard */}
          <div className="admin-panel">
            <h3>📊 Live Standings</h3>
            {leaderboard.length === 0 ? (
              <div className="empty-note">Waiting for answers… 🕐</div>
            ) : (
              leaderboard.slice(0,8).map((row, i) => (
                <div key={row.userId} className="lb-row">
                  <span className="lb-rank">{medals[i] || `${i+1}`}</span>
                  <div><strong>{row.name}</strong><small>{row.totalScore} pts</small></div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Leaderboard between questions ── */}
      {sessionActive && phase === "leaderboard" && (
        <div className="admin-grid-2" style={{ gap:16 }}>
          <div className="live-control-card">
            <div className="live-phase-badge leaderboard">📊 LEADERBOARD — Q{currentIndex+1}/{totalQuestions}</div>
            <p style={{ color:"var(--text-2)", fontWeight:700, margin:"10px 0 16px" }}>
              Candidates can see the leaderboard now. Ready to push the next question?
            </p>

            {currentIndex + 1 < totalQuestions ? (
              <button className="cta-button" onClick={handleNextQuestion} disabled={busy}
                style={{ width:"auto", padding:"13px 36px" }}>
                {busy ? <Spinner /> : `▶ Push Question ${currentIndex + 2}`}
              </button>
            ) : (
              <button className="cta-button" onClick={handleNextQuestion} disabled={busy}
                style={{ width:"auto", padding:"13px 36px" }}>
                {busy ? <Spinner /> : "🏁 Finish Session"}
              </button>
            )}
          </div>

          <div className="admin-panel">
            <h3>🏆 Current Leaderboard</h3>
            {leaderboard.slice(0,8).map((row, i) => (
              <div key={row.userId} className="lb-row">
                <span className="lb-rank">{medals[i] || `${i+1}`}</span>
                <div><strong>{row.name}</strong><small>{row.totalScore} pts</small></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Finished ── */}
      {phase === "finished" && (
        <div className="admin-grid-2" style={{ gap:16 }}>
          <div className="live-control-card">
            <div className="live-phase-badge finished">🏁 SESSION FINISHED</div>
            <p style={{ color:"var(--text-2)", fontWeight:700, margin:"10px 0 16px" }}>
              All questions done! Final standings below. Start a new session anytime.
            </p>
            <button className="ghost-btn" onClick={() => { setPhase("idle"); setSessionActive(false); setSelectedQuizId(""); }}>
              🔄 New Session
            </button>
          </div>
          <div className="admin-panel">
            <h3>🏆 Final Leaderboard</h3>
            {leaderboard.slice(0,10).map((row, i) => (
              <div key={row.userId} className="lb-row">
                <span className="lb-rank">{medals[i] || `${i+1}`}</span>
                <div><strong>{row.name}</strong><small>{row.totalScore} pts</small></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Dashboard, QuestionManager, QuizManager (unchanged) ─────────────
function AdminDash({ stats, results, leaderboard }) {
  return (
    <div className="admin-dash">
      <div className="stat-cards">
        {[
          ["👥 Players", stats?.totalUsers??0, "People who tried"],
          ["🏆 Highest", stats?.highestScore??0, "Peak human performance"],
          ["📊 Average", stats?.averageScore??0, "The median disaster"],
          ["📉 Lowest",  stats?.lowestScore??0,  "Someone needs a hug"],
        ].map(([l,v,s]) => (
          <div key={l} className="stat-card">
            <span className="sc-label">{l}</span>
            <strong className="sc-val">{v}</strong>
            <span className="sc-sub">{s}</span>
          </div>
        ))}
      </div>
      <div className="admin-grid-2">
        <div className="admin-panel">
          <h3>🏆 Hall of Fame (and Shame)</h3>
          {leaderboard.slice(0,8).map((a,i) => (
            <div key={a._id} className="lb-row">
              <span className="lb-rank">{["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][i]||i+1}</span>
              <div><strong>{a.user?.name||"???"}</strong><small>{a.score}/{a.totalMarks} · {a.percentage}%</small></div>
            </div>
          ))}
          {!leaderboard.length && <div className="empty-note">No players yet 😴</div>}
        </div>
        <div className="admin-panel">
          <h3>📋 Recent Carnage</h3>
          <div className="results-mini-table">
            <div className="rmt-head"><span>Name</span><span>Quiz</span><span>Score</span><span>Status</span></div>
            {results.slice(0,8).map((a) => (
              <div key={a._id} className="rmt-row">
                <span>{a.user?.name}</span><span>{a.quiz?.title}</span>
                <span>{a.score}/{a.totalMarks}</span>
                <span className="status-badge">{a.status}</span>
              </div>
            ))}
            {!results.length && <div className="empty-note">No results yet 👀</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const emptyQ = { question:"", type:"mcq", options:["","","",""], correctAnswer:"", marks:1 };
function QuestionManager({ questions, onChanged }) {
  const [form,   setForm]   = useState(emptyQ);
  const [editId, setEditId] = useState("");
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState("");
  const reset = () => { setForm(emptyQ); setEditId(""); };
  const save = async () => {
    setBusy(true); setErr("");
    try {
      const p = { ...form, marks:Number(form.marks), options: form.type==="mcq" ? form.options.filter(Boolean) : [] };
      editId ? await api.updateQuestion(editId, p) : await api.createQuestion(p);
      reset(); await onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="admin-grid-2">
      <div className="admin-panel">
        <h3>{editId ? "✏️ Edit" : "➕ New"} Question</h3>
        {err && <div className="error-pill">{err}</div>}
        <label className="field-label">Question
          <textarea className="glass-input" value={form.question} onChange={(e) => setForm({...form, question:e.target.value})} />
        </label>
        <div className="two-col">
          <label className="field-label">Type
            <select className="glass-input" value={form.type} onChange={(e) => setForm({...form, type:e.target.value})}>
              <option value="mcq">MCQ</option><option value="text">Text</option>
            </select>
          </label>
          <label className="field-label">Marks
            <input className="glass-input" type="number" min="1" value={form.marks} onChange={(e) => setForm({...form, marks:e.target.value})} />
          </label>
        </div>
        {form.type === "mcq" && (
          <div className="options-2col">
            {form.options.map((o,i) => (
              <input key={i} className="glass-input" value={o} placeholder={`Option ${i+1}`}
                onChange={(e) => { const opts=[...form.options]; opts[i]=e.target.value; setForm({...form, options:opts}); }} />
            ))}
          </div>
        )}
        <label className="field-label">Correct Answer
          <input className="glass-input" value={form.correctAnswer} onChange={(e) => setForm({...form, correctAnswer:e.target.value})} />
        </label>
        <div className="form-row">
          <button className="ghost-btn" onClick={reset}>Reset</button>
          <button className="cta-button small" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Save"}</button>
        </div>
      </div>
      <div className="admin-panel">
        <h3>📚 Question Bank ({questions.length})</h3>
        <div className="q-list">
          {questions.map((q) => (
            <div key={q._id} className="q-list-item">
              <div><strong>{q.question}</strong><small>{q.type.toUpperCase()} · {q.marks} pt</small></div>
              <div className="q-actions">
                <button className="icon-btn" onClick={() => {
                  setEditId(q._id);
                  setForm({ question:q.question, type:q.type, options:q.options?.length ? [...q.options,"","","",""].slice(0,4) : ["","","",""], correctAnswer:q.correctAnswer, marks:q.marks });
                }}>✏️</button>
                <button className="icon-btn danger" onClick={async () => { await api.deleteQuestion(q._id); onChanged(); }}>🗑</button>
              </div>
            </div>
          ))}
          {!questions.length && <div className="empty-note">No questions yet. The void is empty.</div>}
        </div>
      </div>
    </div>
  );
}

function QuizManager({ questions, quizzes, onChanged }) {
  const [title, setTitle]   = useState("");
  const [desc,  setDesc]    = useState("");
  const [dur,   setDur]     = useState(10);
  const [sel,   setSel]     = useState([]);
  const [busy,  setBusy]    = useState(false);
  const [err,   setErr]     = useState("");
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  const create = async () => {
    setBusy(true); setErr("");
    try {
      await api.createQuiz({ title, description:desc, durationMinutes:Number(dur), questionIds:sel });
      setTitle(""); setDesc(""); setDur(10); setSel([]); onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="admin-grid-2">
      <div className="admin-panel">
        <h3>➕ New Quiz</h3>
        {err && <div className="error-pill">{err}</div>}
        <label className="field-label">Title<input className="glass-input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field-label">Description<textarea className="glass-input" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <label className="field-label">Duration (min)<input className="glass-input" type="number" min="1" value={dur} onChange={(e) => setDur(e.target.value)} /></label>
        <div className="pick-list">
          {questions.map((q) => (
            <label key={q._id} className={sel.includes(q._id) ? "pick-item active" : "pick-item"}>
              <input type="checkbox" checked={sel.includes(q._id)} onChange={() => toggle(q._id)} />
              <span>{q.question}</span>
            </label>
          ))}
        </div>
        <button className="cta-button" onClick={create} disabled={busy||!title||!sel.length}>
          {busy ? <Spinner /> : "🚀 Launch Quiz"}
        </button>
      </div>
      <div className="admin-panel">
        <h3>🎮 Active Quizzes</h3>
        {quizzes.map((q) => (
          <div key={q._id} className="q-list-item">
            <div><strong>{q.title}</strong><small>{q.durationMinutes} min · {q.questions?.length||0} questions</small></div>
            <div className="q-actions">
              {q.isActive && <span className="active-pill">🟢 Live</span>}
              <button className="ghost-btn small" onClick={async () => { await api.activateQuiz(q._id); onChanged(); }}>Activate</button>
              <button className="icon-btn danger" onClick={async () => { await api.deleteQuiz(q._id); onChanged(); }}>🗑</button>
            </div>
          </div>
        ))}
        {!quizzes.length && <div className="empty-note">No quizzes. Create one above 👆</div>}
      </div>
    </div>
  );
}

function Spinner() { return <span className="spinner">⟳</span>; }
function FullscreenLoader() {
  const quip = useMemo(() => randomFrom(LOADING_QUIPS), []);
  return (
    <div className="fullscreen-loader">
      <div className="loader-ring" />
      <span>{quip}</span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);