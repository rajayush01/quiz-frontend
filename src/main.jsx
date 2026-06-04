import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css"

const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "http://localhost:5000/api";

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
  registerUser: (name) => apiRequest("/users/register", { method: "POST", body: JSON.stringify({ name }) }),
  getActiveQuiz: () => apiRequest("/quizzes/active"),
  startQuiz: (userId) => apiRequest("/quizzes/start", { method: "POST", body: JSON.stringify({ userId }) }),
  submitQuiz: (payload) => apiRequest("/submissions/submit", { method: "POST", body: JSON.stringify(payload) }),
  getResult: (attemptId) => apiRequest(`/submissions/result/${attemptId}`),
  loginAdmin: (payload) => apiRequest("/admin/login", { method: "POST", body: JSON.stringify(payload) }),
  getQuestions: () => apiRequest("/admin/questions"),
  createQuestion: (payload) => apiRequest("/admin/questions", { method: "POST", body: JSON.stringify(payload) }),
  updateQuestion: (id, payload) => apiRequest(`/admin/questions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteQuestion: (id) => apiRequest(`/admin/questions/${id}`, { method: "DELETE" }),
  getQuizzes: () => apiRequest("/quizzes"),
  createQuiz: (payload) => apiRequest("/quizzes", { method: "POST", body: JSON.stringify(payload) }),
  updateQuiz: (id, payload) => apiRequest(`/quizzes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteQuiz: (id) => apiRequest(`/quizzes/${id}`, { method: "DELETE" }),
  activateQuiz: (id) => apiRequest(`/quizzes/${id}/activate`, { method: "PATCH" }),
  getAdminResults: () => apiRequest("/admin/results"),
  getAdminLeaderboard: () => apiRequest("/admin/results/leaderboard"),
  getAdminStats: () => apiRequest("/admin/results/stats"),
};

// ── Sarcastic correct/wrong messages ───────────────────────────
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

// ── Sarcastic loading messages ──────────────────────────────────
const LOADING_QUIPS = [
  "Summoning your questions from the void...",
  "Preparing humiliation in 3, 2, 1...",
  "Loading... just like your brain.",
  "Making the quiz harder just for you...",
];

// ── Correct Reaction GIFs (safe public giphy) ──────────────────
const CORRECT_GIFS = [
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif",
  "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif",
];
const WRONG_GIFS = [
  "https://media.giphy.com/media/l2JehQ2GitHGdVG9y/giphy.gif",
  "https://media.giphy.com/media/3o7TKtyuPNnECsMalq/giphy.gif",
];

// ── Floating sticker emojis for background ─────────────────────
const BG_STICKERS = ["🧠","💀","🤡","🎯","🦆","🍕","😅","🧸","🎪","🌮","🤓","🫠","💫","🎲","🥴"];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Confetti (warmer colors) ────────────────────────────────────
function Confetti({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
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
      shape: Math.random() > 0.5 ? "circle" : "star",
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
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }} />;
}

// ── Floating Stickers Background ───────────────────────────────
function FloatingStickers() {
  return (
    <div className="stickers-bg" aria-hidden="true">
      {BG_STICKERS.map((s, i) => (
        <div key={i} className={`bg-sticker sticker-${i}`}>{s}</div>
      ))}
    </div>
  );
}

// ── Wobbly blob background ──────────────────────────────────────
function BlobBg() {
  return (
    <div className="blob-bg">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />
    </div>
  );
}

// ── Progress Ring ───────────────────────────────────────────────
function ProgressRing({ value, max, size = 56 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (value / max);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(180,100,80,0.15)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#rg)" strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }} />
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff9f7f" />
          <stop offset="100%" stopColor="#ffb347" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── XP Bar ──────────────────────────────────────────────────────
function XPBar({ xp, maxXp = 100 }) {
  return (
    <div className="xp-bar-wrap">
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${Math.min((xp / maxXp) * 100, 100)}%` }} />
      </div>
      <span className="xp-label">⭐ {xp} pts</span>
    </div>
  );
}

// ── Streak Badge ────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (!streak) return null;
  return (
    <div className="streak-badge">
      🔥 {streak}x streak {streak >= 3 ? "— ok genius calm down" : ""}
    </div>
  );
}

// ── Sarcastic Timer Label ───────────────────────────────────────
const TIMER_QUIPS = {
  15: "Still thinking? Adorable.",
  10: "Tick tock, genius.",
  5: "Oh no. OH NO.",
  3: "PANICKING IS VALID",
};

// ── Timer ───────────────────────────────────────────────────────
function Timer({ seconds, total }) {
  const pct = seconds / total;
  const color = pct > 0.5 ? "#52b788" : pct > 0.25 ? "#f4a261" : "#e63946";
  const quip = TIMER_QUIPS[seconds] || null;
  return (
    <div className="timer-wrap">
      <svg width={52} height={52} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
        <circle cx={26} cy={26} r={22} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${138.2 * pct} 138.2`} strokeLinecap="round"
          style={{ transition: "all 1s linear" }} />
      </svg>
      <span className="timer-num" style={{ color }}>{seconds}</span>
      {quip && <div className="timer-quip">{quip}</div>}
    </div>
  );
}

// ── Feedback Overlay (sarcastic + GIF) ─────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// CANDIDATE FLOW
// ─────────────────────────────────────────────────────────────────
function CandidateExperience() {
  const [stage, setStage] = useState("register");
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ show: false, correct: false, gif: "", msg: "" });
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const [timerSec, setTimerSec] = useState(20);
  const timerRef = useRef(null);
  const currentQ = questions[qIndex];

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setTimerSec(20);
    timerRef.current = setInterval(() => {
      setTimerSec((s) => {
        if (s <= 1) { clearInterval(timerRef.current); handleTimeUp(); return 0; }
        return s - 1;
      });
    }, 1000);
  }, [qIndex]);

  useEffect(() => {
    if (stage === "question") startTimer();
    return () => clearInterval(timerRef.current);
  }, [stage, qIndex]);

  const handleTimeUp = () => {
    if (!currentQ) return;
    setAnswers((a) => ({ ...a, [currentQ._id]: "" }));
    showFeedback(false);
  };

  const showFeedback = (correct) => {
    clearInterval(timerRef.current);
    const gif = correct ? randomFrom(CORRECT_GIFS) : randomFrom(WRONG_GIFS);
    const msg = correct ? randomFrom(CORRECT_MSGS) : randomFrom(WRONG_MSGS);
    if (correct) {
      const pts = (currentQ?.marks || 1) * 10;
      setXp((x) => x + pts);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
    setFeedback({ show: true, correct, gif, msg });
    setStage("feedback");
  };

  const afterFeedback = () => {
    setFeedback({ show: false, correct: false, gif: "", msg: "" });
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
      setStage("question");
    } else {
      doSubmit();
    }
  };

  const loadActiveQuiz = async () => {
    setLoading(true);
    try { setQuiz(await api.getActiveQuiz()); setError(""); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadActiveQuiz(); }, []);

  const registerAndStart = async () => {
    if (!name.trim()) return;
    setLoading(true); setError("");
    try {
      const reg = await api.registerUser(name.trim());
      setUser(reg.user);
      const started = await api.startQuiz(reg.user._id);
      setAttempt(started);
      setQuestions(started.questions || []);
      setStage("question");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleAnswer = (val) => {
    if (!currentQ || stage !== "question") return;
    setAnswers((a) => ({ ...a, [currentQ._id]: val }));
    const correct = val === currentQ.correctAnswer ||
      val?.trim().toLowerCase() === currentQ.correctAnswer?.trim().toLowerCase();
    showFeedback(correct);
  };

  const doSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        attemptId: attempt.attemptId,
        answers: questions.map((q) => ({ questionId: q._id, answer: answers[q._id] || "" })),
      };
      await api.submitQuiz(payload);
      const r = await api.getResult(attempt.attemptId);
      setResult(r);
      setStage("result");
      if (r.percentage >= 70) setConfetti(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const restart = () => {
    setStage("register"); setName(""); setUser(null); setAttempt(null);
    setQuestions([]); setQIndex(0); setAnswers({}); setResult(null);
    setXp(0); setStreak(0); setConfetti(false); loadActiveQuiz();
  };

  return (
    <div className="candidate-root">
      <Confetti active={confetti} />
      <FeedbackOverlay show={feedback.show} correct={feedback.correct} gif={feedback.gif} msg={feedback.msg} onDone={afterFeedback} />
      {stage === "register" && (
        <RegisterScreen name={name} setName={setName} quiz={quiz} loading={loading} error={error} onStart={registerAndStart} />
      )}
      {stage === "question" && currentQ && (
        <QuestionScreen question={currentQ} index={qIndex} total={questions.length}
          xp={xp} streak={streak} timerSec={timerSec} onAnswer={handleAnswer} />
      )}
      {stage === "result" && result && (
        <ResultScreen result={result} xp={xp} streak={streak} onRestart={restart} />
      )}
      {loading && stage !== "register" && <FullscreenLoader />}
    </div>
  );
}

// ── Register Screen ─────────────────────────────────────────────
const ENTRY_QUIPS = [
  "Warning: May cause temporary feelings of intelligence.",
  "Side effects include: sweating, googling, crying.",
  "Rated E for 'Even you can try this'",
  "No refunds. No mercy. Just vibes.",
];

function RegisterScreen({ name, setName, quiz, loading, error, onStart }) {
  const quip = useMemo(() => randomFrom(ENTRY_QUIPS), []);
  return (
    <div className="screen register-screen">
      <div className="register-card">

        {/* Hero */}
        <div className="register-hero">
          <div className="hero-sticker-ring">
            <span className="hs hs-1">🧠</span>
            <span className="hs hs-2">💡</span>
            <span className="hs hs-3">🎯</span>
            <span className="hs hs-4">🤯</span>
          </div>
          <div className="hero-mascot">🤖</div>
          <h1 className="hero-title">BrainRot<br/>Quiz</h1>
          <p className="hero-tagline">Test your knowledge.<br/>Embarrass yourself. Grow.</p>
          <div className="hero-quip">⚠️ {quip}</div>
        </div>

        {/* Quiz Preview */}
        {quiz && (
          <div className="quiz-preview-card">
            <div className="qp-top">
              <span className="qp-badge">🔴 LIVE NOW</span>
              <span className="qp-meta-right">{quiz.questions?.length || 0} questions of pure chaos</span>
            </div>
            <div className="qp-title">{quiz.title}</div>
            <div className="qp-footer">
              <span>⏱ {quiz.durationMinutes} min (not enough time, lol)</span>
            </div>
          </div>
        )}

        {!quiz && !loading && (
          <div className="no-quiz-card">
            <div className="nq-emoji">😴</div>
            <div className="nq-text">No quiz active right now.</div>
            <div className="nq-sub">The admin is probably napping. Very relatable.</div>
          </div>
        )}

        {error && <div className="error-pill">😬 {error}</div>}

        {/* Form */}
        <div className="register-form">
          <div className="input-group">
            <span className="input-emoji">👤</span>
            <input className="glass-input" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name (or your villain alias)" onKeyDown={(e) => e.key === "Enter" && onStart()} />
          </div>
          <button className="cta-button" onClick={onStart} disabled={loading || !name.trim()}>
            {loading ? <Spinner /> : <><span>🚀 I'm Ready to Fail</span><span className="btn-sub">( touch the button )</span></>}
          </button>
          <p className="form-disclaimer">By clicking, you agree to not blame us when you get everything wrong.</p>
        </div>

        {/* Social proof parody */}
        <div className="fake-social-proof">
          <div className="fsp-avatars">{"😤😩🤡😅😭".split("").map((e,i) => <span key={i}>{e}</span>)}</div>
          <span>2,847 people embarrassed themselves today. Join them.</span>
        </div>
      </div>
    </div>
  );
}

// ── Question Screen ─────────────────────────────────────────────
const Q_ENCOURAGEMENTS = [
  "You got this! (maybe)",
  "Think hard. Or don't. We'll see.",
  "No pressure... okay some pressure.",
  "Your ancestors are watching.",
];

function QuestionScreen({ question, index, total, xp, streak, timerSec, onAnswer }) {
  const [textVal, setTextVal] = useState("");
  const [entered, setEntered] = useState(false);
  const options = question.options || [];
  const enc = useMemo(() => randomFrom(Q_ENCOURAGEMENTS), [question._id]);

  useEffect(() => { setTextVal(""); setEntered(false); }, [question._id]);

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
          <XPBar xp={xp} maxXp={total * 10} />
          <StreakBadge streak={streak} />
        </div>
        <div className="hud-right">
          <Timer seconds={timerSec} total={20} />
        </div>
      </div>

      {/* Card */}
      <div className="question-card-wrap">
        <div className="question-card">
          <div className="q-header">
            <span className="q-marks-badge">💎 {question.marks} {question.marks === 1 ? "pt" : "pts"}</span>
            <span className="q-type-badge">{question.type === "mcq" ? "🧩 Multiple Choice" : "✍️ Short Answer"}</span>
            <span className="q-enc">{enc}</span>
          </div>
          <h2 className="q-text">{question.question}</h2>

          {question.type === "mcq" ? (
            <div className="options-grid">
              {options.map((opt, i) => (
                <button key={opt} className="option-btn" onClick={() => { if (!entered) { setEntered(true); onAnswer(opt); } }}>
                  <span className="option-key">{["A","B","C","D"][i]}</span>
                  <span className="option-text">{opt}</span>
                  <span className="option-hover-emoji">{["🤔","🤨","🧐","😬"][i]}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-answer-wrap">
              <div className="textarea-hint">💬 Type your masterpiece below:</div>
              <textarea className="glass-textarea" value={textVal} onChange={(e) => setTextVal(e.target.value)}
                placeholder="Your answer here (no, 'idk' is not an answer)..." rows={3} />
              <button className="cta-button" onClick={() => { if (!entered) { setEntered(true); onAnswer(textVal); } }} disabled={!textVal.trim()}>
                🎲 Lock it in (no take-backs)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Result Screen ───────────────────────────────────────────────
const GRADE_DATA = {
  S: { label: "Actual Genius", emoji: "👑", color: "#f4a261", sub: "Okay fine, you're kind of impressive.", gif: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" },
  A: { label: "Pretty Smart", emoji: "🥇", color: "#52b788", sub: "Not bad at all! Go touch grass to celebrate.", gif: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif" },
  B: { label: "Average Human", emoji: "🥈", color: "#74b3ce", sub: "Solidly mediocre. We respect it.", gif: "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif" },
  C: { label: "Tried Hard Maybe?", emoji: "🏅", color: "#e9c46a", sub: "Participation energy. We see you.", gif: "https://media.giphy.com/media/3o7TKtyuPNnECsMalq/giphy.gif" },
  F: { label: "Magnificently Wrong", emoji: "🤡", color: "#e63946", sub: "Statistically impressive. You got so few right.", gif: "https://media.giphy.com/media/l2JehQ2GitHGdVG9y/giphy.gif" },
};

function ResultScreen({ result, xp, streak, onRestart }) {
  const pct = parseFloat(result.percentage);
  const grade = pct >= 90 ? GRADE_DATA.S : pct >= 75 ? GRADE_DATA.A : pct >= 60 ? GRADE_DATA.B : pct >= 40 ? GRADE_DATA.C : GRADE_DATA.F;

  return (
    <div className="screen result-screen">
      <div className="result-card">
        <div className="result-grade-badge" style={{ background: `${grade.color}22`, borderColor: `${grade.color}44` }}>
          <span className="result-emoji">{grade.emoji}</span>
          <div>
            <div className="result-rank-label" style={{ color: grade.color }}>{grade.label}</div>
            <div className="result-sub">{grade.sub}</div>
          </div>
        </div>

        <div className="result-gif-wrap">
          <img src={grade.gif} alt="result reaction" className="result-gif" />
        </div>

        <div className="result-score-big">
          {result.score}<span>/{result.totalMarks}</span>
        </div>
        <div className="result-pct">{result.percentage}% correct • {pct >= 50 ? "You passed! Barely counts but sure." : "You did not pass. Character building!"}</div>

        <div className="result-stats">
          <div className="rstat"><span className="rstat-val">⭐ {xp}</span><span className="rstat-lbl">Points Earned</span></div>
          <div className="rstat"><span className="rstat-val">🔥 {streak}</span><span className="rstat-lbl">Best Streak</span></div>
          <div className="rstat"><span className="rstat-val" style={{ color: "#52b788" }}>{result.status}</span><span className="rstat-lbl">Status</span></div>
        </div>

        <div className="result-cta-group">
          <button className="cta-button" onClick={onRestart}>🔄 Go Again (glutton for punishment)</button>
          <p className="result-disclaimer">Results not guaranteed to improve with repetition. Or maybe they will. Who knows.</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN FLOW
// ─────────────────────────────────────────────────────────────────
function AdminExperience() {
  const [token, setToken] = useState(() => localStorage.getItem("quiz_admin_token") || "");
  if (!token) return <AdminLogin onLogin={setToken} />;
  return <AdminDashboard onLogout={() => { localStorage.removeItem("quiz_admin_token"); setToken(""); }} />;
}

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const submit = async () => {
    setLoading(true); setError("");
    try { const d = await api.loginAdmin({ email, password: pw }); localStorage.setItem("quiz_admin_token", d.token); onLogin(d.token); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
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
        <button className="cta-button" onClick={submit} disabled={loading || !email || !pw}>{loading ? <Spinner /> : "🔐 Enter the Vault"}</button>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [questions, setQuestions] = useState([]); const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]); const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [q, qz, r, lb, s] = await Promise.all([api.getQuestions(), api.getQuizzes(), api.getAdminResults(), api.getAdminLeaderboard(), api.getAdminStats()]);
      setQuestions(q || []); setQuizzes(qz || []); setResults(r || []); setLeaderboard(lb || []); setStats(s || null);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
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
        {["dashboard", "questions", "quizzes"].map((t) => (
          <button key={t} className={tab === t ? "admin-tab active" : "admin-tab"} onClick={() => setTab(t)}>
            {{ dashboard: "📊 Dashboard", questions: "📝 Questions", quizzes: "🎮 Quizzes" }[t]}
          </button>
        ))}
      </div>
      {tab === "dashboard" && <AdminDash stats={stats} results={results} leaderboard={leaderboard} />}
      {tab === "questions" && <QuestionManager questions={questions} onChanged={load} />}
      {tab === "quizzes" && <QuizManager questions={questions} quizzes={quizzes} onChanged={load} />}
    </div>
  );
}

function AdminDash({ stats, results, leaderboard }) {
  return (
    <div className="admin-dash">
      <div className="stat-cards">
        {[["👥 Players", stats?.totalUsers ?? 0, "People who tried"], ["🏆 Highest", stats?.highestScore ?? 0, "Peak human performance"], ["📊 Average", stats?.averageScore ?? 0, "The median disaster"], ["📉 Lowest", stats?.lowestScore ?? 0, "Someone needs a hug"]].map(([l, v, s]) => (
          <div key={l} className="stat-card"><span className="sc-label">{l}</span><strong className="sc-val">{v}</strong><span className="sc-sub">{s}</span></div>
        ))}
      </div>
      <div className="admin-grid-2">
        <div className="admin-panel">
          <h3>🏆 Hall of Fame (and Shame)</h3>
          {leaderboard.slice(0, 8).map((a, i) => (
            <div key={a._id} className="lb-row">
              <span className="lb-rank">{["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][i] || i+1}</span>
              <div><strong>{a.user?.name || "???"}</strong><small>{a.score}/{a.totalMarks} · {a.percentage}%</small></div>
            </div>
          ))}
          {!leaderboard.length && <div className="empty-note">No players yet 😴</div>}
        </div>
        <div className="admin-panel">
          <h3>📋 Recent Carnage</h3>
          <div className="results-mini-table">
            <div className="rmt-head"><span>Name</span><span>Quiz</span><span>Score</span><span>Status</span></div>
            {results.slice(0, 8).map((a) => (
              <div key={a._id} className="rmt-row"><span>{a.user?.name}</span><span>{a.quiz?.title}</span><span>{a.score}/{a.totalMarks}</span><span className="status-badge">{a.status}</span></div>
            ))}
            {!results.length && <div className="empty-note">No results yet 👀</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const emptyQ = { question: "", type: "mcq", options: ["", "", "", ""], correctAnswer: "", marks: 1 };
function QuestionManager({ questions, onChanged }) {
  const [form, setForm] = useState(emptyQ); const [editId, setEditId] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const reset = () => { setForm(emptyQ); setEditId(""); };
  const save = async () => {
    setBusy(true); setErr("");
    try {
      const p = { ...form, marks: Number(form.marks), options: form.type === "mcq" ? form.options.filter(Boolean) : [] };
      editId ? await api.updateQuestion(editId, p) : await api.createQuestion(p);
      reset(); await onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="admin-grid-2">
      <div className="admin-panel">
        <h3>{editId ? "✏️ Edit" : "➕ New"} Question</h3>
        {err && <div className="error-pill">{err}</div>}
        <label className="field-label">Question<textarea className="glass-input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></label>
        <div className="two-col">
          <label className="field-label">Type
            <select className="glass-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="mcq">MCQ</option><option value="text">Text</option>
            </select>
          </label>
          <label className="field-label">Marks<input className="glass-input" type="number" min="1" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} /></label>
        </div>
        {form.type === "mcq" && <div className="options-2col">{form.options.map((o, i) => <input key={i} className="glass-input" value={o} placeholder={`Option ${i + 1}`} onChange={(e) => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }); }} />)}</div>}
        <label className="field-label">Correct Answer<input className="glass-input" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} /></label>
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
                <button className="icon-btn" onClick={() => { setEditId(q._id); setForm({ question: q.question, type: q.type, options: q.options?.length ? [...q.options, "", "", "", ""].slice(0, 4) : ["", "", "", ""], correctAnswer: q.correctAnswer, marks: q.marks }); }}>✏️</button>
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
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState(""); const [dur, setDur] = useState(10); const [sel, setSel] = useState([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const create = async () => {
    setBusy(true); setErr("");
    try { await api.createQuiz({ title, description: desc, durationMinutes: Number(dur), questionIds: sel }); setTitle(""); setDesc(""); setDur(10); setSel([]); onChanged(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
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
        <button className="cta-button" onClick={create} disabled={busy || !title || !sel.length}>{busy ? <Spinner /> : "🚀 Launch Quiz"}</button>
      </div>
      <div className="admin-panel">
        <h3>🎮 Active Quizzes</h3>
        {quizzes.map((q) => (
          <div key={q._id} className="q-list-item">
            <div><strong>{q.title}</strong><small>{q.durationMinutes} min · {q.questions?.length || 0} questions</small></div>
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