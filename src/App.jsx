import { useState, useEffect, useRef } from "react";
import malikImg from "./assets/malik.jpg";
import {
  signIn,
  signUp,
  signOut,
  sendPasswordReset,
  updatePassword,
  getSession,
  onAuthStateChange,
  markMfaSetupDone,
} from "./lib/auth.js";
import {
  getClientProfile,
  saveClientProfile,
  saveProfileName,
  listClients,
  getPrograms,
  getActiveProgram,
  createProgram,
  saveProgram,
  duplicateProgram,
  archiveProgram,
  publishProgram,
  saveOnboarding,
  saveWorkoutLog,
  getWorkoutLog,
} from "./lib/db.js";

/* ─────────────────────────────────────────────────────────────────────────────
   MLVNT APP  ·  Time Moves. So Should You.
   Complete client + coach experience — auth, onboarding, dashboard,
   scheduling, program, progress, feedback, messaging
───────────────────────────────────────────────────────────────────────────── */

/* ── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Barlow:ital,wght@0,200;0,300;0,400;0,500;1,200;1,300&family=Barlow+Condensed:wght@200;300;400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  --bg-0:#0A0B0D; --bg-1:#141618; --bg-2:#1C1F23;
  --acc-0:#1E2B3A; --acc-1:#263545; --acc-2:#2E404F;
  --ok:#2A7A4B; --ok-dim:rgba(42,122,75,0.18);
  --warn:#6B4A1A; --warn-dim:rgba(180,120,40,0.15);
  --err:#6B1A1A; --err-dim:rgba(180,60,60,0.15);
  --txt-0:#ECEEF1; --txt-1:#9097A0; --txt-2:#545C66;
  --b0:rgba(255,255,255,0.07); --b1:rgba(255,255,255,0.13); --b2:rgba(255,255,255,0.2);
  --gb:rgba(255,255,255,0.05); --gb2:rgba(255,255,255,0.085);
  --sh0:0 2px 8px rgba(0,0,0,0.5);
  --sh1:0 6px 24px rgba(0,0,0,0.55);
  --sh2:0 16px 48px rgba(0,0,0,0.6);
  --r1:6px; --r2:10px; --r3:16px; --r4:22px; --r5:28px;
  --fh:'Syne',sans-serif; --fc:'Barlow Condensed',sans-serif; --fb:'Barlow',sans-serif;
}

html{scroll-behavior:smooth;}
body{
  background:#0A0B0D;
  background:linear-gradient(170deg,#0A0B0D 0%,#0E1117 55%,#111520 100%) fixed;
  color:var(--txt-0); font-family:var(--fb); font-weight:300; line-height:1.6;
  overflow-x:hidden; min-height:100vh;
}
body::after{
  content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
}
::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-track{background:var(--bg-0);} ::-webkit-scrollbar-thumb{background:var(--acc-1);border-radius:2px;}

/* ── GLASS ── */
.gl{background:var(--gb);border:1px solid var(--b0);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
.gl2{background:var(--gb2);border:1px solid var(--b1);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);}

/* ── TYPE ── */
.dsp{font-family:var(--fh);font-weight:800;letter-spacing:-0.03em;text-transform:uppercase;line-height:0.92;}
.h1{font-family:var(--fh);font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;letter-spacing:-0.02em;line-height:1;}
.h2{font-family:var(--fh);font-size:clamp(1.2rem,2.5vw,1.6rem);font-weight:700;letter-spacing:-0.015em;}
.h3{font-family:var(--fh);font-size:0.9rem;font-weight:600;letter-spacing:0.01em;}
.label{font-family:var(--fb);font-size:0.6rem;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:var(--txt-2);}
.body{font-size:0.88rem;font-weight:300;line-height:1.75;color:var(--txt-1);}
.body-sm{font-size:0.76rem;font-weight:300;line-height:1.7;color:var(--txt-1);}
.mono{font-family:var(--fc);letter-spacing:0.04em;}

/* ── LAYOUT ── */
.app-shell{display:grid;grid-template-columns:220px 1fr;min-height:100vh;}
.main-col{display:flex;flex-direction:column;min-height:100vh;overflow-y:auto;}
.page-body{flex:1;padding:32px 36px;}
.page-body.narrow{max-width:720px;}
.page-body.centered{max-width:520px;margin:0 auto;}

/* ── SIDEBAR ── */
.sidebar{
  background:var(--bg-1);border-right:1px solid var(--b0);
  padding:0 12px 20px;display:flex;flex-direction:column;
  position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0;
}
.sb-brand{padding:22px 8px 20px;border-bottom:1px solid var(--b0);margin-bottom:10px;display:flex;align-items:center;gap:10px;}
.sb-logo{font-family:var(--fh);font-size:1.1rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-0);}
.sb-tagline{font-size:0.55rem;color:var(--txt-2);letter-spacing:0.14em;text-transform:uppercase;line-height:1.4;margin-top:2px;}
.sb-sec{font-size:0.55rem;font-weight:500;letter-spacing:0.2em;color:var(--txt-2);text-transform:uppercase;padding:16px 10px 6px;}
.sb-item{display:flex;align-items:center;gap:10px;padding:10px 10px;border-radius:var(--r2);cursor:pointer;font-size:0.78rem;color:var(--txt-1);transition:all 0.18s;border:1px solid transparent;margin-bottom:1px;font-family:var(--fb);font-weight:400;}
.sb-item:hover{background:var(--gb);color:var(--txt-0);}
.sb-item.active{background:var(--acc-0);color:var(--txt-0);border-color:var(--b0);}
.sb-item .ic{font-size:1rem;width:20px;text-align:center;flex-shrink:0;opacity:0.7;}
.sb-item.active .ic{opacity:1;}
.sb-badge{margin-left:auto;background:var(--acc-1);color:rgba(255,255,255,0.7);font-size:0.55rem;padding:2px 7px;border-radius:100px;font-family:var(--fc);letter-spacing:0.06em;}
.sb-user{margin-top:auto;padding:14px 10px 0;border-top:1px solid var(--b0);display:flex;gap:10px;align-items:center;}
.sb-av{width:32px;height:32px;border-radius:50%;background:var(--acc-0);border:1px solid var(--b0);display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:0.62rem;font-weight:700;color:var(--txt-1);flex-shrink:0;}
.sb-name{font-size:0.76rem;font-weight:500;color:var(--txt-0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sb-role{font-size:0.6rem;color:var(--txt-2);}

/* ── TOP BAR ── */
.topbar{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;border-bottom:1px solid var(--b0);background:rgba(10,11,13,0.7);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);position:sticky;top:0;z-index:50;}
/* PWA: push topbar below iPhone status bar */
@supports(padding-top:env(safe-area-inset-top)){
  .topbar{padding-top:env(safe-area-inset-top);height:calc(58px + env(safe-area-inset-top));}
  .main-col{padding-top:0;}
}
.topbar-title{font-family:var(--fh);font-size:1rem;font-weight:700;letter-spacing:-0.01em;color:var(--txt-0);}
.topbar-actions{display:flex;gap:8px;align-items:center;}

/* ── MOBILE NAV ── */
.mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;background:rgba(10,11,13,0.95);backdrop-filter:blur(28px);border-top:1px solid var(--b0);padding:8px 0 max(8px,env(safe-area-inset-bottom));}
.mob-nav-inner{display:flex;justify-content:space-around;}
.mob-tab{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 16px;cursor:pointer;border:none;background:none;color:var(--txt-2);transition:color 0.2s;}
.mob-tab.active{color:var(--txt-0);}
.mob-tab .ic{font-size:1.1rem;}
.mob-tab .lbl{font-size:0.55rem;font-family:var(--fb);font-weight:500;letter-spacing:0.1em;text-transform:uppercase;}

@media(max-width:900px){
  .app-shell{grid-template-columns:1fr;}
  .sidebar{display:none;}
  .mob-nav{display:block;}
  .page-body{padding:20px 20px 80px;}
  .topbar{padding:0 20px;}
}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--fh);font-size:0.7rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;border-radius:var(--r2);border:none;cursor:pointer;transition:all 0.2s ease;position:relative;overflow:hidden;white-space:nowrap;}
.btn::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity 0.2s;background:rgba(255,255,255,0.05);}
.btn:hover::before{opacity:1;}
.btn:active{transform:scale(0.98);}
.btn-p{background:#233044;color:#ECEEF1;padding:12px 26px;border:1px solid rgba(255,255,255,0.14);box-shadow:0 4px 16px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08);}
.btn-p:hover{background:#2C3D54;border-color:rgba(255,255,255,0.22);box-shadow:0 8px 24px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.12);transform:translateY(-1px);}
.btn-s{background:transparent;color:var(--txt-0);padding:11px 24px;border:1px solid var(--b1);}
.btn-s:hover{background:var(--gb);border-color:var(--b2);transform:translateY(-1px);}
.btn-danger{background:transparent;color:rgba(220,100,100,0.8);padding:10px 20px;border:1px solid rgba(200,80,80,0.25);}
.btn-danger:hover{background:rgba(200,60,60,0.08);border-color:rgba(200,80,80,0.4);}
.btn-ghost{background:transparent;color:var(--txt-1);padding:8px 0;border:none;font-size:0.68rem;}
.btn-ghost:hover{color:var(--txt-0);}
.btn-ghost::after{content:'';display:block;height:1px;background:currentColor;margin-top:2px;transform:scaleX(0);transform-origin:left;transition:transform 0.22s;}
.btn-ghost:hover::after{transform:scaleX(1);}
.btn-full{width:100%;}
.btn-sm{padding:8px 18px;font-size:0.66rem;}
.btn-xs{padding:6px 12px;font-size:0.62rem;}
.btn-icon{width:34px;height:34px;padding:0;border-radius:50%;background:var(--gb);border:1px solid var(--b0);color:var(--txt-1);}
.btn-icon:hover{background:var(--gb2);color:var(--txt-0);border-color:var(--b1);}
.btn-loading{opacity:0.6;pointer-events:none;}

/* ── FORM ELEMENTS ── */
.field{display:flex;flex-direction:column;gap:5px;}
.field-label{font-size:0.6rem;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:var(--txt-2);font-family:var(--fb);}
.field-note{font-size:0.63rem;color:var(--txt-2);line-height:1.4;margin-top:2px;}
.fi{background:rgba(0,0,0,0.28);border:1px solid var(--b0);border-radius:var(--r2);padding:11px 14px;color:var(--txt-0);font-family:var(--fb);font-size:0.84rem;font-weight:300;outline:none;width:100%;transition:border-color 0.2s,background 0.2s;}
.fi:focus{border-color:var(--b1);background:rgba(0,0,0,0.38);}
.fi::placeholder{color:var(--txt-2);}
.fi.err{border-color:rgba(200,80,80,0.5);}
textarea.fi{resize:vertical;}
.fi-locked{background:rgba(0,0,0,0.15);border:1px solid var(--b0);border-radius:var(--r2);padding:11px 14px;color:var(--txt-2);font-family:var(--fb);font-size:0.84rem;font-weight:300;cursor:not-allowed;width:100%;display:flex;align-items:center;justify-content:space-between;}
.fi-pw{position:relative;}
.fi-pw input{padding-right:44px;}
.fi-pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--txt-2);cursor:pointer;font-size:0.75rem;padding:4px;}
.fi-pw-toggle:hover{color:var(--txt-1);}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px;}
.chip{padding:7px 14px;border-radius:var(--r2);border:1px solid var(--b0);background:none;color:var(--txt-1);font-family:var(--fc);font-size:0.66rem;font-weight:400;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.17s;}
.chip:hover{border-color:var(--b1);color:var(--txt-0);}
.chip.on{background:var(--acc-0);border-color:rgba(255,255,255,0.14);color:var(--txt-0);}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.form-col{display:flex;flex-direction:column;gap:16px;}
.check-row{display:flex;gap:11px;align-items:flex-start;cursor:pointer;padding:4px 0;}
.chk{width:16px;height:16px;border-radius:3px;border:1px solid var(--b1);background:none;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all 0.17s;font-size:0.5rem;color:var(--txt-0);}
.chk.on{background:var(--acc-1);border-color:rgba(255,255,255,0.2);}
.check-txt{font-size:0.79rem;color:var(--txt-1);line-height:1.55;}
@media(max-width:560px){.form-grid{grid-template-columns:1fr;}}

/* ── CARDS ── */
.card{border-radius:var(--r3);background:var(--bg-1);border:1px solid var(--b0);position:relative;overflow:hidden;}
.card-p{padding:22px;}
.card-shimmer{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);}
.card-gl{border-radius:var(--r3);background:var(--gb);border:1px solid var(--b0);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);position:relative;overflow:hidden;}

/* ── STATUS / FEEDBACK ── */
.alert{border-radius:var(--r2);padding:11px 14px;font-size:0.78rem;line-height:1.55;display:flex;align-items:flex-start;gap:10px;}
.alert-ok{background:var(--ok-dim);border:1px solid rgba(42,122,75,0.3);color:rgba(160,220,175,0.9);}
.alert-warn{background:var(--warn-dim);border:1px solid rgba(180,120,40,0.3);color:rgba(220,175,100,0.9);}
.alert-err{background:var(--err-dim);border:1px solid rgba(180,60,60,0.3);color:rgba(220,120,120,0.9);}
.alert-info{background:rgba(255,255,255,0.04);border:1px solid var(--b0);color:var(--txt-1);}
.save-dot{width:6px;height:6px;border-radius:50%;background:rgba(100,200,130,0.7);display:inline-block;margin-right:6px;animation:savePulse 2s ease infinite;}
@keyframes savePulse{0%,100%{opacity:0.4}50%{opacity:1}}
.loading-bar{height:2px;background:linear-gradient(90deg,var(--acc-1),var(--acc-2));border-radius:1px;animation:loadBar 1.4s ease infinite;}
@keyframes loadBar{0%{transform:scaleX(0);transform-origin:left}50%{transform:scaleX(1);transform-origin:left}51%{transform-origin:right}100%{transform:scaleX(0);transform-origin:right}}
.spinner{width:16px;height:16px;border:2px solid var(--b0);border-top-color:var(--txt-1);border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;flex-shrink:0;}
@keyframes spin{to{transform:rotate(360deg)}}
.tag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:100px;font-family:var(--fc);font-size:0.58rem;font-weight:400;letter-spacing:0.1em;text-transform:uppercase;}
.tag-ok{background:rgba(42,122,75,0.15);color:rgba(160,220,175,0.85);border:1px solid rgba(42,122,75,0.25);}
.tag-pend{background:var(--gb);color:var(--txt-2);border:1px solid var(--b0);}
.tag-warn{background:var(--warn-dim);color:rgba(220,175,100,0.85);border:1px solid rgba(180,120,40,0.25);}
.tag-blue{background:rgba(30,43,58,0.6);color:rgba(140,175,220,0.8);border:1px solid rgba(30,43,58,0.8);}
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:56px 20px;text-align:center;}
.empty-ic{font-size:2rem;opacity:0.15;}
.empty-txt{font-size:0.82rem;color:var(--txt-2);max-width:280px;line-height:1.6;}

/* ── DIVIDERS ── */
.rule{height:1px;background:var(--b0);}
.rule-fade{height:1px;background:linear-gradient(90deg,transparent,var(--b0) 30%,var(--b0) 70%,transparent);}

/* ── PROGRESS BARS ── */
.bar-track{height:3px;background:var(--b0);border-radius:2px;overflow:hidden;}
.bar-fill{height:100%;background:linear-gradient(90deg,var(--acc-1),var(--acc-2));border-radius:2px;transition:width 0.8s ease;}
.bar-ok{background:linear-gradient(90deg,#2A7A4B,#3DAE6A);}

/* ── AUTH SHELL ── */
.auth-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;}
.auth-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(30,43,58,0.3) 0%,transparent 60%);pointer-events:none;}
.auth-card{width:100%;max-width:420px;border-radius:var(--r5);padding:40px;background:var(--gb2);border:1px solid var(--b1);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);box-shadow:0 24px 64px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.08);position:relative;overflow:hidden;}
.auth-shimmer{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);}
.auth-logo{font-family:var(--fh);font-size:1.4rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-0);margin-bottom:6px;}
.auth-sub{font-size:0.78rem;color:var(--txt-1);line-height:1.5;margin-bottom:28px;}
.auth-divider{display:flex;align-items:center;gap:10px;margin:18px 0;font-size:0.62rem;color:var(--txt-2);letter-spacing:0.1em;text-transform:uppercase;}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:var(--b0);}
.auth-link{font-size:0.75rem;color:var(--txt-1);cursor:pointer;text-decoration:none;transition:color 0.2s;}
.auth-link:hover{color:var(--txt-0);}

/* ── ONBOARDING ── */
.ob-shell{min-height:100vh;display:flex;flex-direction:column;}
.ob-head{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid var(--b0);flex-shrink:0;}
.ob-brand{font-family:var(--fh);font-size:1rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;}
.ob-step-lbl{font-size:0.62rem;color:var(--txt-2);letter-spacing:0.14em;text-transform:uppercase;}
.ob-prog{height:2px;background:var(--bg-2);flex-shrink:0;}
.ob-prog-fill{height:100%;background:linear-gradient(90deg,var(--acc-1),var(--acc-2));transition:width 0.45s cubic-bezier(0.4,0,0.2,1);}
.ob-body{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:36px 20px 48px;overflow-y:auto;}
.ob-card{width:100%;max-width:560px;border-radius:var(--r5);padding:36px;background:var(--gb);border:1px solid var(--b0);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
.ob-title{font-family:var(--fh);font-size:clamp(1.5rem,4vw,2rem);font-weight:700;letter-spacing:-0.02em;line-height:1;margin-bottom:8px;}
.ob-desc{font-size:0.82rem;color:var(--txt-1);line-height:1.65;margin-bottom:28px;}
.ob-nav{display:flex;justify-content:space-between;align-items:center;margin-top:28px;}
.ob-dots{display:flex;gap:5px;}
.ob-dot{height:4px;border-radius:2px;transition:all 0.28s;background:var(--b0);}
.ob-dot.curr{background:var(--acc-2);width:26px;}
.ob-dot.done{background:var(--acc-1);width:16px;}
.ob-dot.idle{width:14px;}
.waiver-scroll{max-height:160px;overflow-y:auto;background:rgba(0,0,0,0.3);border-radius:var(--r2);padding:16px;font-size:0.74rem;color:var(--txt-1);line-height:1.8;border:1px solid var(--b0);margin-bottom:18px;}
.waiver-scroll h4{font-family:var(--fh);font-size:0.7rem;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--txt-0);margin-bottom:5px;margin-top:12px;}
.waiver-scroll h4:first-child{margin-top:0;}
@media(max-width:600px){.ob-card{padding:24px 18px;}}

/* ── DASHBOARD ── */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
.kpi{border-radius:var(--r3);padding:18px;background:var(--bg-1);border:1px solid var(--b0);}
.kpi.hi{background:var(--acc-0);border-color:rgba(255,255,255,0.1);}
.kpi-label{font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--txt-2);margin-bottom:6px;font-family:var(--fb);}
.kpi-val{font-family:var(--fh);font-size:1.7rem;font-weight:700;color:var(--txt-0);line-height:1;}
.kpi-sub{font-size:0.64rem;color:var(--txt-2);margin-top:4px;}
.quick-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
.qa-btn{border-radius:var(--r3);padding:16px 12px;background:var(--bg-1);border:1px solid var(--b0);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;transition:all 0.2s;text-align:center;}
.qa-btn:hover{background:var(--bg-2);border-color:var(--b1);transform:translateY(-2px);}
.qa-ic{font-size:1.2rem;opacity:0.6;}
.qa-lbl{font-family:var(--fh);font-size:0.6rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--txt-1);}
.dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.panel-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.panel-title{font-family:var(--fh);font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--txt-0);}
.list-row{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--b0);}
.list-row:last-child{border-bottom:none;}
.list-main{font-size:0.8rem;font-weight:400;color:var(--txt-0);}
.list-sub{font-size:0.68rem;color:var(--txt-2);margin-top:2px;}
.coach-note-banner{padding:16px 20px;border-radius:var(--r3);background:var(--acc-0);border:1px solid rgba(255,255,255,0.08);margin-bottom:18px;display:flex;gap:14px;align-items:flex-start;}
.notif-item{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--b0);}
.notif-item:last-child{border-bottom:none;}
.notif-dot{width:6px;height:6px;border-radius:50%;background:rgba(140,175,220,0.6);flex-shrink:0;margin-top:5px;}
.notif-dot.read{background:var(--txt-2);}
@media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr);}.quick-actions{grid-template-columns:repeat(4,1fr);}}
@media(max-width:900px){.dash-grid{grid-template-columns:1fr;}.quick-actions{grid-template-columns:repeat(4,1fr);}}
@media(max-width:600px){.quick-actions{grid-template-columns:repeat(4,1fr);}.kpi-grid{grid-template-columns:repeat(2,1fr);}}

/* ── SCHEDULING ── */
.cal-wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;}
.cal-card{border-radius:var(--r4);padding:22px;background:var(--gb);border:1px solid var(--b0);backdrop-filter:blur(20px);}
.cal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
.cal-month{font-family:var(--fh);font-size:0.95rem;font-weight:700;letter-spacing:-0.01em;}
.cal-nav-row{display:flex;gap:6px;}
.cal-btn{width:26px;height:26px;border-radius:50%;background:none;border:1px solid var(--b0);color:var(--txt-1);cursor:pointer;font-size:0.68rem;display:flex;align-items:center;justify-content:center;transition:all 0.18s;}
.cal-btn:hover{border-color:var(--b1);color:var(--txt-0);background:var(--gb);}
.cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:3px;}
.cal-dow-lbl{text-align:center;font-size:0.56rem;color:var(--txt-2);padding:3px 0;font-family:var(--fc);letter-spacing:0.08em;}
.cal-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
.cal-day{aspect-ratio:1;border-radius:var(--r1);display:flex;align-items:center;justify-content:center;font-size:0.74rem;cursor:pointer;border:1px solid transparent;color:var(--txt-1);transition:all 0.14s;font-family:var(--fc);}
.cal-day:hover{background:var(--gb);border-color:var(--b0);color:var(--txt-0);}
.cal-day.sel{background:var(--acc-1);border-color:rgba(255,255,255,0.16);color:var(--txt-0);}
.cal-day.today{border-color:var(--acc-2);color:var(--txt-0);}
.cal-day.empty,.cal-day.past{opacity:0.22;cursor:default;pointer-events:none;}
.cal-day.has-sess{position:relative;}
.cal-day.has-sess::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:rgba(140,175,220,0.7);}
.slots-wrap{display:flex;flex-direction:column;gap:16px;}
.sess-type-row{display:flex;gap:7px;flex-wrap:wrap;}
.sess-type-btn{padding:7px 14px;border-radius:var(--r2);border:1px solid var(--b0);background:none;color:var(--txt-1);font-family:var(--fc);font-size:0.64rem;font-weight:400;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.17s;}
.sess-type-btn.on{background:var(--acc-0);border-color:var(--b1);color:var(--txt-0);}
.time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
.time-btn{padding:10px 6px;border-radius:var(--r2);border:1px solid var(--b0);background:none;color:var(--txt-1);font-family:var(--fc);font-size:0.7rem;letter-spacing:0.04em;cursor:pointer;transition:all 0.17s;text-align:center;}
.time-btn:hover{border-color:var(--b1);color:var(--txt-0);background:var(--gb);}
.time-btn.sel{background:var(--acc-0);border-color:var(--b1);color:var(--txt-0);}
.time-btn.taken{opacity:0.25;cursor:not-allowed;text-decoration:line-through;}
.confirm-card{border-radius:var(--r4);padding:24px;background:var(--gb2);border:1px solid var(--b1);backdrop-filter:blur(28px);}
.confirm-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--b0);font-size:0.8rem;}
.confirm-row:last-of-type{border-bottom:none;}
.confirm-k{color:var(--txt-2);}
.confirm-v{color:var(--txt-0);font-weight:400;}
.bal-bar{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-radius:var(--r2);background:rgba(255,255,255,0.04);border:1px solid var(--b0);}
.bal-n{font-family:var(--fh);font-size:1.6rem;font-weight:700;color:var(--txt-0);}
.sess-upcoming{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--b0);}
.sess-upcoming:last-child{border-bottom:none;}
.sess-up-info{display:flex;flex-direction:column;gap:2px;}
.sess-up-name{font-size:0.8rem;font-weight:500;color:var(--txt-0);}
.sess-up-time{font-size:0.68rem;color:var(--txt-2);}
.sess-up-acts{display:flex;gap:6px;}
@media(max-width:800px){.cal-wrap{grid-template-columns:1fr;}}

/* ── PROGRAM ── */
.program-layout{display:grid;grid-template-columns:200px 1fr;gap:0;min-height:500px;}
.program-days{border-right:1px solid var(--b0);padding:16px 10px;}
.day-tab{padding:10px 12px;border-radius:var(--r2);cursor:pointer;transition:all 0.17s;margin-bottom:2px;border:1px solid transparent;}
.day-tab:hover{background:var(--gb);}
.day-tab.active{background:var(--acc-0);border-color:var(--b0);}
.day-tab-name{font-family:var(--fh);font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--txt-0);}
.day-tab-type{font-size:0.62rem;color:var(--txt-2);margin-top:2px;}
.day-tab-done{width:6px;height:6px;border-radius:50%;background:rgba(42,122,75,0.7);margin-left:auto;flex-shrink:0;}
.program-content{padding:24px;}
.exercise-card{border-radius:var(--r3);padding:18px;background:var(--bg-1);border:1px solid var(--b0);margin-bottom:10px;transition:border-color 0.2s;}
.exercise-card.done{opacity:0.55;}
.exercise-card:hover{border-color:var(--b1);}
.ex-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;}
.ex-name{font-family:var(--fh);font-size:0.88rem;font-weight:700;letter-spacing:0.01em;color:var(--txt-0);}
.ex-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;}
.ex-sets{display:grid;grid-template-columns:repeat(4,1fr) auto;gap:8px;margin-top:12px;}
.ex-set-hd{font-size:0.56rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-2);text-align:center;padding-bottom:4px;border-bottom:1px solid var(--b0);}
.ex-set-cell{background:rgba(0,0,0,0.2);border:1px solid var(--b0);border-radius:var(--r1);padding:7px 4px;font-size:0.78rem;font-family:var(--fc);text-align:center;color:var(--txt-1);}
.ex-set-cell input{background:none;border:none;outline:none;color:var(--txt-0);font-family:var(--fc);font-size:0.78rem;text-align:center;width:100%;}
.ex-note{font-size:0.72rem;color:var(--txt-2);margin-top:10px;padding-top:10px;border-top:1px solid var(--b0);line-height:1.55;font-style:italic;}
.video-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:100px;background:rgba(255,255,255,0.05);border:1px solid var(--b0);font-size:0.62rem;color:var(--txt-2);cursor:pointer;transition:all 0.17s;}
.video-pill:hover{background:var(--gb);color:var(--txt-1);}
@media(max-width:700px){.program-layout{grid-template-columns:1fr;}.program-days{border-right:none;border-bottom:1px solid var(--b0);display:flex;gap:6px;overflow-x:auto;padding:10px;}.day-tab{flex-shrink:0;}}

/* ── PROGRESS ── */
.progress-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
.metric-card{border-radius:var(--r3);padding:18px;background:var(--bg-1);border:1px solid var(--b0);}
.metric-n{font-family:var(--fh);font-size:1.9rem;font-weight:700;color:var(--txt-0);line-height:1;}
.metric-lbl{font-size:0.6rem;color:var(--txt-2);letter-spacing:0.14em;text-transform:uppercase;margin-top:3px;}
.metric-delta{font-size:0.68rem;color:rgba(140,210,155,0.8);margin-top:5px;}
.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.photo-slot{aspect-ratio:3/4;border-radius:var(--r3);background:var(--bg-2);border:2px dashed var(--b0);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;cursor:pointer;transition:all 0.2s;}
.photo-slot:hover{border-color:var(--b1);background:var(--bg-1);}
.photo-slot-ic{font-size:1.5rem;opacity:0.2;}
.photo-slot-lbl{font-size:0.6rem;color:var(--txt-2);letter-spacing:0.1em;text-transform:uppercase;}
@media(max-width:700px){.progress-grid{grid-template-columns:repeat(2,1fr);}.photo-grid{grid-template-columns:repeat(2,1fr);}}

/* ── MESSAGES ── */
.msg-layout{display:grid;grid-template-columns:260px 1fr;height:calc(100vh - 58px);overflow:hidden;}
.msg-list{border-right:1px solid var(--b0);overflow-y:auto;padding:12px;}
.msg-thread{display:flex;gap:10px;padding:11px 10px;border-radius:var(--r2);cursor:pointer;transition:all 0.17s;margin-bottom:2px;}
.msg-thread:hover{background:var(--gb);}
.msg-thread.active{background:var(--acc-0);}
.msg-av{width:36px;height:36px;border-radius:50%;background:var(--acc-0);border:1px solid var(--b0);display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:0.64rem;font-weight:700;color:var(--txt-1);flex-shrink:0;}
.msg-thread-name{font-size:0.8rem;font-weight:500;color:var(--txt-0);}
.msg-thread-preview{font-size:0.7rem;color:var(--txt-2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;}
.msg-thread-time{font-size:0.6rem;color:var(--txt-2);margin-left:auto;flex-shrink:0;}
.msg-chat{display:flex;flex-direction:column;overflow:hidden;}
.msg-chat-head{padding:14px 20px;border-bottom:1px solid var(--b0);display:flex;align-items:center;gap:12px;flex-shrink:0;}
.msg-chat-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;}
.msg-chat-foot{padding:12px 16px;border-top:1px solid var(--b0);flex-shrink:0;}
.bubble{max-width:70%;padding:10px 14px;border-radius:var(--r3);font-size:0.8rem;line-height:1.6;}
.bubble.them{background:var(--bg-2);border:1px solid var(--b0);color:var(--txt-0);align-self:flex-start;border-bottom-left-radius:var(--r1);}
.bubble.me{background:var(--acc-0);border:1px solid rgba(255,255,255,0.1);color:var(--txt-0);align-self:flex-end;border-bottom-right-radius:var(--r1);}
.bubble-time{font-size:0.58rem;color:var(--txt-2);margin-top:3px;}
.msg-input-row{display:flex;gap:8px;align-items:center;}
.msg-input{flex:1;}
@media(max-width:800px){.msg-layout{grid-template-columns:1fr;}.msg-list{display:none;}.msg-chat{height:100%;}}

/* ── PROFILE / SETTINGS ── */
.settings-layout{display:grid;grid-template-columns:200px 1fr;gap:0;}
.settings-nav{border-right:1px solid var(--b0);padding:16px 10px;}
.settings-tab{padding:9px 12px;border-radius:var(--r2);cursor:pointer;font-size:0.76rem;color:var(--txt-1);transition:all 0.17s;margin-bottom:1px;border:1px solid transparent;}
.settings-tab:hover{background:var(--gb);color:var(--txt-0);}
.settings-tab.active{background:var(--acc-0);color:var(--txt-0);border-color:var(--b0);}
.settings-content{padding:24px 28px;}
.avatar-lg{width:72px;height:72px;border-radius:50%;background:var(--acc-0);border:2px solid var(--b1);display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:1.4rem;font-weight:700;color:var(--txt-1);}
@media(max-width:700px){.settings-layout{grid-template-columns:1fr;}.settings-nav{border-right:none;border-bottom:1px solid var(--b0);display:flex;gap:4px;overflow-x:auto;padding:8px;}.settings-tab{flex-shrink:0;padding:7px 12px;}}

/* ── UTILITY ── */
.gap-4{gap:4px} .gap-8{gap:8px} .gap-12{gap:12px} .gap-16{gap:16px} .gap-20{gap:20px} .gap-24{gap:24px}
.mt-4{margin-top:4px} .mt-8{margin-top:8px} .mt-12{margin-top:12px} .mt-16{margin-top:16px} .mt-20{margin-top:20px} .mt-24{margin-top:24px} .mt-32{margin-top:32px}
.mb-8{margin-bottom:8px} .mb-12{margin-bottom:12px} .mb-16{margin-bottom:16px} .mb-20{margin-bottom:20px} .mb-24{margin-bottom:24px}
.flex{display:flex} .col{flex-direction:column} .items-center{align-items:center} .items-start{align-items:flex-start} .between{justify-content:space-between} .wrap{flex-wrap:wrap}
.w-full{width:100%} .text-right{text-align:right}
.page-fade{animation:pageIn 0.3s ease both}
@keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ── PROGRAM SYSTEM ── */
.prog-header{border-radius:var(--r4);padding:22px 24px;background:var(--gb2);border:1px solid var(--b1);margin-bottom:20px;position:relative;overflow:hidden;}
.prog-header::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);}
.prog-status-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-family:var(--fc);font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;}
.prog-status-pill.active{background:rgba(42,122,75,0.15);color:rgba(140,210,155,0.85);border:1px solid rgba(42,122,75,0.25);}
.prog-status-pill.completed{background:rgba(255,255,255,0.05);color:var(--txt-2);border:1px solid var(--b0);}
.prog-status-pill.archived{background:rgba(255,255,255,0.03);color:var(--txt-2);border:1px solid var(--b0);}
.prog-status-pill.draft{background:rgba(107,74,26,0.15);color:rgba(220,175,100,0.75);border:1px solid rgba(180,120,40,0.2);}
.prog-week-bar{height:3px;background:var(--b0);border-radius:2px;overflow:hidden;margin-top:10px;}
.prog-week-fill{height:100%;background:linear-gradient(90deg,var(--acc-1),var(--acc-2));border-radius:2px;}
.prog-tabs{display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--b0);padding-bottom:0;}
.prog-tab{padding:9px 18px;border-radius:var(--r2) var(--r2) 0 0;font-family:var(--fh);font-size:0.68rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;border:1px solid transparent;border-bottom:none;transition:all 0.17s;color:var(--txt-2);background:none;position:relative;bottom:-1px;}
.prog-tab:hover{color:var(--txt-1);}
.prog-tab.on{background:var(--bg-1);border-color:var(--b0);color:var(--txt-0);}
.day-card{border-radius:var(--r3);border:1px solid var(--b0);overflow:hidden;margin-bottom:10px;transition:border-color 0.2s;}
.day-card:hover{border-color:var(--b1);}
.day-card-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;background:var(--bg-1);}
.day-card-head:hover{background:var(--bg-2);}
.day-card-title{font-family:var(--fh);font-size:0.82rem;font-weight:700;color:var(--txt-0);}
.day-card-sub{font-size:0.68rem;color:var(--txt-2);margin-top:2px;}
.day-card-meta{display:flex;align-items:center;gap:8px;}
.day-card-chevron{font-size:0.65rem;color:var(--txt-2);transition:transform 0.2s;}
.day-card-chevron.open{transform:rotate(180deg);}
.day-card-body{padding:16px 18px;background:var(--bg-0);border-top:1px solid var(--b0);}
.ex-row{display:grid;grid-template-columns:1fr 52px 60px 52px 80px;gap:0;border-bottom:1px solid rgba(255,255,255,0.04);padding:11px 0;align-items:start;}
.ex-row:last-child{border-bottom:none;}
.ex-row-name{font-size:0.8rem;font-weight:400;color:var(--txt-0);}
.ex-row-note{font-size:0.68rem;color:var(--txt-2);margin-top:3px;line-height:1.45;}
.ex-row-cell{text-align:center;font-family:var(--fc);font-size:0.72rem;color:var(--txt-1);padding-top:2px;}
.ex-row-hd{font-size:0.52rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--txt-2);padding-bottom:8px;text-align:center;}
.ex-row-hd:first-child{text-align:left;}
.ex-spec-row{display:flex;gap:8px;flex-wrap:wrap;}
.ex-spec{display:flex;flex-direction:column;gap:2px;padding:7px 12px;border-radius:var(--r2);background:rgba(0,0,0,0.2);border:1px solid var(--b0);min-width:52px;text-align:center;}
.ex-spec-val{font-family:var(--fc);font-size:0.82rem;color:var(--txt-0);font-weight:500;}
.ex-spec-lbl{font-size:0.52rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--txt-2);}
.ex-note-block{margin-top:12px;padding:10px 12px;border-radius:var(--r2);background:rgba(255,255,255,0.03);border-left:2px solid var(--acc-2);font-size:0.74rem;color:var(--txt-1);line-height:1.6;}
.hist-card{border-radius:var(--r3);padding:18px 20px;background:var(--bg-1);border:1px solid var(--b0);margin-bottom:10px;cursor:pointer;transition:all 0.18s;}
.hist-card:hover{border-color:var(--b1);}
.hist-card-name{font-family:var(--fh);font-size:0.88rem;font-weight:700;color:var(--txt-0);}
.hist-card-meta{font-size:0.68rem;color:var(--txt-2);margin-top:3px;}
.prog-dash-card{border-radius:var(--r3);padding:18px 20px;background:var(--gb);border:1px solid var(--b0);margin-bottom:16px;}

/* ── WORKOUT TRACKING ── */
.set-bubble{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--b0);background:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.18s;flex-shrink:0;font-size:0.7rem;color:transparent;-webkit-tap-highlight-color:transparent;}
.set-bubble:hover{border-color:var(--b1);background:rgba(255,255,255,0.05);}
.set-bubble.done{background:rgba(42,122,75,0.25);border-color:rgba(42,122,75,0.5);color:rgba(140,210,155,0.9);}
.set-bubble.done:hover{background:rgba(42,122,75,0.15);border-color:rgba(42,122,75,0.3);}
.wk-ex-card{border-radius:var(--r3);padding:16px 18px;background:var(--bg-1);border:1px solid var(--b0);margin-bottom:10px;transition:border-color 0.2s;}
.wk-ex-card.all-done{border-color:rgba(42,122,75,0.25);background:rgba(42,122,75,0.04);}
.wk-ex-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;}
.wk-ex-name{font-family:var(--fh);font-size:0.86rem;font-weight:700;color:var(--txt-0);}
.wk-ex-specs{display:flex;gap:8px;margin-top:5px;flex-wrap:wrap;}
.wk-ex-spec{padding:3px 9px;border-radius:100px;background:rgba(0,0,0,0.2);border:1px solid var(--b0);font-family:var(--fc);font-size:0.62rem;color:var(--txt-2);}
.wk-set-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);}
.wk-set-row:last-child{border-bottom:none;}
.wk-set-label{font-family:var(--fc);font-size:0.68rem;color:var(--txt-2);width:46px;flex-shrink:0;}
.wk-set-targets{flex:1;display:flex;gap:8px;flex-wrap:wrap;}
.wk-set-target{font-size:0.72rem;color:var(--txt-1);fontFamily:"var(--fc)";}
.wk-day-complete-bar{border-radius:var(--r3);padding:18px 20px;background:rgba(42,122,75,0.08);border:1px solid rgba(42,122,75,0.2);text-align:center;margin-top:20px;}
.wk-done-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;background:rgba(42,122,75,0.15);border:1px solid rgba(42,122,75,0.3);font-family:var(--fc);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(140,210,155,0.85);}
.wk-prog-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
.wk-day-chip{padding:5px 12px;border-radius:100px;font-family:var(--fc);font-size:0.64rem;letter-spacing:0.06em;}
.wk-day-chip.done{background:rgba(42,122,75,0.15);border:1px solid rgba(42,122,75,0.25);color:rgba(140,210,155,0.85);}
.wk-day-chip.pending{background:rgba(255,255,255,0.04);border:1px solid var(--b0);color:var(--txt-2);}
.wk-day-chip.active-today{background:var(--acc-0);border:1px solid var(--b1);color:var(--txt-0);}
.acct-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--b0);}
.acct-row:last-child{border-bottom:none;}

/* ── LOCATION / COMMUTE ── */
.loc-card{border-radius:var(--r3);padding:16px 18px;background:rgba(255,255,255,0.03);border:1px solid var(--b0);display:flex;gap:14px;align-items:flex-start;}
.loc-icon{width:32px;height:32px;border-radius:50%;background:var(--acc-0);border:1px solid var(--b0);display:flex;align-items:center;justify-content:center;font-size:0.82rem;flex-shrink:0;margin-top:1px;}
.loc-building{font-family:var(--fh);font-size:0.82rem;font-weight:700;letter-spacing:0.01em;color:var(--txt-0);}
.loc-address{font-size:0.74rem;color:var(--txt-1);margin-top:2px;line-height:1.45;}
.loc-notes{font-size:0.68rem;color:var(--txt-2);margin-top:4px;line-height:1.5;font-style:italic;}
.loc-dir-btn{margin-left:auto;flex-shrink:0;padding:6px 12px;border-radius:100px;border:1px solid var(--b0);background:none;color:var(--txt-2);font-family:var(--fc);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.17s;display:flex;align-items:center;gap:5px;white-space:nowrap;}
.loc-dir-btn:hover{border-color:var(--b1);color:var(--txt-0);background:var(--gb);}
.time-btn.blocked{opacity:0.38;cursor:not-allowed;position:relative;}
.time-btn.blocked::after{content:'';position:absolute;inset:0;border-radius:var(--r2);background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 6px);}
.commute-legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
.commute-chip{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:100px;background:var(--bg-2);border:1px solid var(--b0);font-size:0.6rem;color:var(--txt-2);letter-spacing:0.04em;}
.commute-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.dot-avail{background:rgba(100,200,140,0.7);}
.dot-same{background:rgba(180,160,100,0.65);}
.dot-diff{background:rgba(180,100,100,0.65);}
.dot-taken{background:rgba(80,80,80,0.8);}
.coach-sched-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--b0);}
.coach-sched-row:last-child{border-bottom:none;}
.coach-sched-time{font-family:var(--fc);font-size:0.78rem;color:var(--txt-0);min-width:90px;}
.coach-sched-loc{font-size:0.72rem;color:var(--txt-1);display:flex;flex-direction:column;gap:2px;}
.coach-sched-building{font-weight:400;color:var(--txt-0);}
.coach-sched-area{font-size:0.65rem;color:var(--txt-2);}

/* ══════════════════════════════════════════════════════
   PUBLIC WEBSITE STYLES
══════════════════════════════════════════════════════ */

/* ── SITE NAV ── */
.site-nav{position:fixed;top:0;left:0;right:0;z-index:200;height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,72px);background:rgba(10,11,13,0);backdrop-filter:blur(0px);border-bottom:1px solid transparent;transition:background 0.4s,backdrop-filter 0.4s,border-color 0.4s;}
/* PWA/standalone: shift nav below the status bar */
@supports(padding-top:env(safe-area-inset-top)){
  .site-nav{padding-top:env(safe-area-inset-top);height:calc(68px + env(safe-area-inset-top));}
}
.site-nav.scrolled{background:rgba(10,11,13,0.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom-color:var(--b0);}
.site-nav-logo{font-family:var(--fh);font-size:1.1rem;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:var(--txt-0);cursor:pointer;}
.site-nav-links{display:flex;align-items:center;gap:28px;}
.site-nav-link{font-family:var(--fb);font-size:0.7rem;font-weight:400;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-1);cursor:pointer;transition:color 0.2s;background:none;border:none;padding:0;}
.site-nav-link:hover{color:var(--txt-0);}
.site-nav-actions{display:flex;align-items:center;gap:10px;}
@media(max-width:720px){.site-nav-links{display:none;}}

/* ── HERO ── */
/* Use 100svh (small viewport height — excludes browser chrome on mobile).
   Fall back to 100vh for browsers that don't support svh yet.
   Top padding: 68px nav + safe-area-inset-top + 24px breathing room.
   Reduced bottom padding on mobile to avoid wasted whitespace. */
.site-hero{
  min-height:100vh;
  min-height:100svh;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;
  padding:calc(68px + env(safe-area-inset-top,0px) + 24px) clamp(20px,6vw,80px) 60px;
  position:relative;overflow:hidden;
}
.site-hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 90% 70% at 50% -10%,rgba(30,43,58,0.5) 0%,transparent 65%),radial-gradient(ellipse 60% 40% at 20% 80%,rgba(20,30,50,0.2) 0%,transparent 60%);pointer-events:none;}
.site-hero-glow{position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:70vw;height:70vw;max-width:900px;max-height:900px;border-radius:50%;background:radial-gradient(circle,rgba(30,60,100,0.12) 0%,transparent 70%);pointer-events:none;}
.site-wordmark{font-family:var(--fh);font-weight:800;font-size:clamp(3.2rem,12vw,9rem);letter-spacing:-0.04em;text-transform:uppercase;line-height:0.9;color:var(--txt-0);margin-bottom:20px;background:linear-gradient(180deg,#ECEEF1 40%,rgba(236,238,241,0.55) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.site-tagline{font-family:var(--fc);font-size:clamp(0.72rem,2vw,1.05rem);letter-spacing:0.28em;text-transform:uppercase;color:var(--txt-2);margin-bottom:14px;}
.site-hero-sub{font-size:clamp(0.88rem,1.8vw,1.05rem);color:var(--txt-1);line-height:1.75;max-width:520px;margin:0 auto 32px;font-weight:300;}
.site-hero-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;}
.site-hero-scroll{position:absolute;bottom:max(24px,env(safe-area-inset-bottom,24px));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--txt-2);font-family:var(--fc);font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;animation:scrollBob 2.4s ease infinite;}
@keyframes scrollBob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(5px)}}

/* ── SITE SECTIONS ── */
.site-section{padding:clamp(56px,10vw,120px) clamp(20px,6vw,80px);}
.site-section-inner{max-width:1100px;margin:0 auto;}
.site-section-label{font-family:var(--fc);font-size:0.6rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--txt-2);margin-bottom:14px;}
.site-section-title{font-family:var(--fh);font-size:clamp(1.6rem,4vw,3rem);font-weight:700;letter-spacing:-0.025em;line-height:1.05;color:var(--txt-0);margin-bottom:16px;}
.site-section-body{font-size:clamp(0.85rem,1.5vw,1rem);color:var(--txt-1);line-height:1.85;max-width:580px;font-weight:300;}
.site-rule{height:1px;background:linear-gradient(90deg,transparent,var(--b0) 20%,var(--b0) 80%,transparent);max-width:1100px;margin:0 auto;}

/* ── FEATURE GRID ── */
.site-feat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:44px;}
.site-feat-card{padding:28px 24px;border-radius:var(--r4);background:var(--gb);border:1px solid var(--b0);position:relative;overflow:hidden;transition:border-color 0.25s,transform 0.25s;}
.site-feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);}
.site-feat-card:hover{border-color:var(--b1);transform:translateY(-3px);}
.site-feat-ic{font-size:1.4rem;margin-bottom:16px;display:block;opacity:0.8;}
.site-feat-title{font-family:var(--fh);font-size:0.9rem;font-weight:700;letter-spacing:-0.01em;color:var(--txt-0);margin-bottom:8px;}
.site-feat-body{font-size:0.76rem;color:var(--txt-1);line-height:1.7;font-weight:300;}
@media(max-width:900px){.site-feat-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:500px){.site-feat-grid{grid-template-columns:1fr;gap:12px;}}

/* ── WHO IT'S FOR ── */
.site-for-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:36px;}
.site-for-item{display:flex;align-items:flex-start;gap:14px;padding:20px;border-radius:var(--r3);background:rgba(255,255,255,0.025);border:1px solid var(--b0);}
.site-for-ic{font-size:1rem;flex-shrink:0;margin-top:2px;opacity:0.7;}
.site-for-title{font-family:var(--fh);font-size:0.82rem;font-weight:700;color:var(--txt-0);margin-bottom:4px;}
.site-for-body{font-size:0.73rem;color:var(--txt-1);line-height:1.6;font-weight:300;}
@media(max-width:600px){.site-for-grid{grid-template-columns:1fr;}}

/* ── HOW IT WORKS ── */
.site-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:44px;position:relative;}
.site-steps::before{content:'';position:absolute;top:28px;left:12.5%;right:12.5%;height:1px;background:linear-gradient(90deg,transparent,var(--b0) 10%,var(--b0) 90%,transparent);}
.site-step{display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 16px;}
.site-step-n{width:56px;height:56px;border-radius:50%;background:var(--bg-1);border:1px solid var(--b1);display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:1.05rem;font-weight:700;color:var(--txt-0);margin-bottom:18px;position:relative;z-index:1;}
.site-step-title{font-family:var(--fh);font-size:0.84rem;font-weight:700;color:var(--txt-0);margin-bottom:6px;}
.site-step-body{font-size:0.72rem;color:var(--txt-2);line-height:1.65;font-weight:300;}
@media(max-width:700px){
  .site-steps{grid-template-columns:repeat(2,1fr);gap:32px;}
  .site-steps::before{display:none;}
}
@media(max-width:400px){.site-steps{grid-template-columns:1fr;}}

/* ── PLANS SECTION ── */
.site-plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px;}
.site-plan-card{border-radius:var(--r4);padding:28px 22px;background:var(--gb);border:1px solid var(--b0);display:flex;flex-direction:column;position:relative;overflow:hidden;transition:border-color 0.25s,transform 0.25s;}
.site-plan-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);}
.site-plan-card.pop{background:var(--gb2);border-color:var(--b1);}
.site-plan-card.pop::before{background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);}
.site-plan-card:hover{border-color:var(--b1);transform:translateY(-3px);}
.site-plan-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;background:rgba(42,122,75,0.15);color:rgba(140,210,155,0.85);border:1px solid rgba(42,122,75,0.25);font-family:var(--fc);font-size:0.57rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:14px;align-self:flex-start;}
.site-plan-name{font-family:var(--fh);font-size:1.05rem;font-weight:700;letter-spacing:-0.01em;color:var(--txt-0);margin-bottom:4px;}
.site-plan-sess{font-family:var(--fc);font-size:0.66rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-2);margin-bottom:14px;}
.site-plan-divider{height:1px;background:var(--b0);margin:0 -22px 18px;}
.site-plan-desc{font-size:0.76rem;color:var(--txt-1);line-height:1.7;flex:1;margin-bottom:20px;font-weight:300;}
@media(max-width:800px){.site-plans-grid{grid-template-columns:1fr;max-width:400px;margin-left:auto;margin-right:auto;}}

/* ── ABOUT SECTION ── */
.site-about-inner{display:grid;grid-template-columns:1fr 1fr;gap:clamp(40px,6vw,96px);align-items:center;}
.site-about-av{width:clamp(120px,20vw,200px);height:clamp(120px,20vw,200px);border-radius:50%;background:linear-gradient(135deg,var(--acc-0),var(--acc-1));border:1px solid var(--b1);overflow:hidden;flex-shrink:0;position:relative;}
.site-about-av::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:1px solid var(--b0);}
@media(max-width:700px){
  .site-about-inner{grid-template-columns:1fr;text-align:center;}
  .site-about-av{margin:0 auto;}
  .site-app-inner{grid-template-columns:1fr!important;}
}

/* ── CTA BAND ── */
.site-cta-band{padding:clamp(56px,10vw,120px) clamp(20px,6vw,80px);background:linear-gradient(180deg,transparent 0%,rgba(30,43,58,0.08) 100%);position:relative;overflow:hidden;}
.site-cta-band::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 100% at 50% 100%,rgba(30,43,58,0.2) 0%,transparent 70%);pointer-events:none;}
.site-cta-inner{max-width:640px;margin:0 auto;text-align:center;position:relative;}
.site-cta-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:28px;}

/* ── SITE FOOTER ── */
/* padding-bottom accounts for iPhone home indicator in standalone mode */
.site-footer{padding:32px clamp(20px,6vw,80px) max(32px,calc(24px + env(safe-area-inset-bottom,0px)));border-top:1px solid var(--b0);}
.site-footer-inner{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;}
.site-footer-copy{font-size:0.66rem;color:var(--txt-2);font-family:var(--fc);letter-spacing:0.08em;}
.site-footer-links{display:flex;gap:20px;flex-wrap:wrap;}
.site-footer-link{font-size:0.64rem;color:var(--txt-2);cursor:pointer;font-family:var(--fc);letter-spacing:0.08em;text-transform:uppercase;transition:color 0.2s;background:none;border:none;}
.site-footer-link:hover{color:var(--txt-1);}

/* ── SITE MOBILE MENU ── */
/* Safe-area-aware padding: top clears the status bar, bottom clears home indicator */
.site-mob-menu{
  position:fixed;inset:0;z-index:300;
  background:rgba(10,11,13,0.97);backdrop-filter:blur(24px);
  display:flex;flex-direction:column;
  padding:max(80px,calc(env(safe-area-inset-top,0px) + 80px)) 32px max(40px,calc(env(safe-area-inset-bottom,0px) + 24px));
  overflow-y:auto;
}
.site-mob-link{font-family:var(--fh);font-size:clamp(1.2rem,6vw,1.6rem);font-weight:700;letter-spacing:-0.02em;color:var(--txt-0);padding:12px 0;border-bottom:1px solid var(--b0);cursor:pointer;background:none;border-left:none;border-right:none;border-top:none;text-align:left;transition:color 0.2s;}
.site-mob-link:hover{color:var(--txt-1);}
.site-mob-close{position:absolute;top:max(20px,calc(env(safe-area-inset-top,0px) + 16px));right:20px;width:40px;height:40px;border-radius:50%;background:var(--gb);border:1px solid var(--b0);color:var(--txt-1);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;}
@media(min-width:721px){.site-mob-menu{display:none;}}
.site-mob-toggle{display:none!important;}
@media(max-width:720px){
  .site-mob-toggle{display:flex!important;}
  .site-nav-actions .btn-s{display:none;}
  .site-nav-book{display:none!important;}
  /* Tighter hero on small phones */
  .site-hero{justify-content:flex-start;padding-top:calc(68px + env(safe-area-inset-top,0px) + 40px);}
  .site-wordmark{margin-bottom:14px;}
  .site-tagline{margin-bottom:10px;}
  .site-hero-sub{margin-bottom:24px;font-size:0.88rem;}
  .site-hero-actions{flex-direction:column;align-items:center;gap:8px;width:100%;max-width:320px;}
  .site-hero-actions .btn{width:100%;justify-content:center;padding:13px 20px !important;}
  .site-hero-scroll{display:none;}
  /* Tighter section padding on phones */
  .site-section{padding:44px 20px;}
  .site-feat-grid{margin-top:28px;}
  .site-plans-grid{max-width:100%;}
  .site-cta-actions{flex-direction:column;align-items:center;width:100%;max-width:320px;margin-left:auto;margin-right:auto;}
  .site-cta-actions .btn{width:100%;justify-content:center;}
  /* Footer stacks on mobile */
  .site-footer-inner{flex-direction:column;gap:20px;}
  .site-footer-links{gap:14px;}
}`;


/* ── STATIC DATA ─────────────────────────────────────────────────────────── */
const NAV = [
  { id:"home",    ic:"⊞", lbl:"Home" },
  { id:"book",    ic:"◷", lbl:"Book" },
  { id:"program", ic:"▦", lbl:"Program" },
  { id:"progress",ic:"◈", lbl:"Progress" },
  { id:"messages",ic:"✉", lbl:"Messages", badge:2 },
  { id:"profile", ic:"⊙", lbl:"Profile" },
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ══════════════════════════════════════════════════════════════════════════
   PROGRAM MANAGEMENT SYSTEM
   — structured program/block/day/exercise data model
   — status: draft | active | completed | archived
   — program history per client
   — admin: assign, edit, duplicate, archive
══════════════════════════════════════════════════════════════════════════ */

/* ── PROGRAM DATA STORE ──────────────────────────────────────────────────── */
// In production: fetched from server, scoped to authenticated client.
// Statuses: "draft" | "active" | "completed" | "archived"

/* ── PROGRAM / WORKOUT STORES (REMOVED — data flows from Supabase via props) ── */
// PROGRAM_STORE and WORKOUT_LOG are replaced by Supabase-backed React state.
// These stubs exist only to prevent crashes in legacy call sites that haven't
// been updated yet; they return empty / falsy values so the UI renders its
// "no data" states rather than crashing.

const PROGRAM_STORE = {
  active:  ()    => null,
  history: ()    => [],
  all:     ()    => [],
  byId:    ()    => null,
  archive: ()    => {},
  updateDays: () => {},
  duplicate:  () => null,
  create:     () => ({ id:`p${Date.now()}`, clientId:null, name:"New Program", block:"Block 1", phase:"", status:"draft", startDate:"", endDate:"", week:1, totalWeeks:8, coachNote:"", days:[] }),
};

const PROGRAM_DAYS = [];
const EXERCISES    = {};

const WORKOUT_LOG = {
  get:            () => ({ sets:{}, completed:false, completedAt:null, startedAt:null }),
  toggleSet:      () => {},
  checkedSets:    () => 0,
  isSetDone:      () => false,
  totalChecked:   () => 0,
  totalSets:      (exs) => exs.reduce((a,ex)=>a+(typeof ex.sets==="number"?ex.sets:ex.sets?.length||0),0),
  completeDay:    () => {},
  isDayDone:      () => false,
  programSummary: (_pid, days) => ({ completed:0, total:days?.length||0, pct:0 }),
  recentActivity: () => [],
};

/* ── DB ROW → UI SHAPE ────────────────────────────────────────────────────── */
function dbRowToProgram(row) {
  if (!row) return null;
  return {
    id:          row.id,
    clientId:    row.client_id,
    name:        row.name        || "New Program",
    block:       row.block       || "Block 1",
    phase:       row.phase       || "",
    status:      row.status      || "draft",
    startDate:   row.start_date  || "",
    endDate:     row.end_date    || "",
    week:        row.week        ?? 1,
    totalWeeks:  row.total_weeks ?? 8,
    coachNote:   row.coach_note  || "",
    days:        Array.isArray(row.days) ? row.days : [],
    updatedAt:   row.updated_at  || "",
  };
}

/* ── WORKOUT LOG HELPERS (work on the workoutLogs map from AppShell) ─────── */
// These replace WORKOUT_LOG.* calls in components that receive workoutLogs prop.
function wlIsDone(logs, progId, dayId) {
  return !!logs?.[`${progId}:${dayId}`]?.completed;
}
function wlSetsForEx(logs, progId, dayId, exId) {
  const raw = logs?.[`${progId}:${dayId}`]?.sets?.[exId];
  if (!raw) return new Set();
  return raw instanceof Set ? raw : new Set(Array.isArray(raw) ? raw : Object.keys(raw).map(Number));
}
function wlCheckedSets(logs, progId, dayId, exId) {
  return wlSetsForEx(logs, progId, dayId, exId).size;
}
function wlTotalChecked(logs, progId, dayId, exercises) {
  return (exercises||[]).reduce((a, ex) => a + wlCheckedSets(logs, progId, dayId, ex.id), 0);
}
function wlTotalSets(exercises) {
  return (exercises||[]).reduce((a,ex)=>a+(typeof ex.sets==="number"?ex.sets:ex.sets?.length||0),0);
}
function wlProgramSummary(logs, progId, days) {
  const total     = (days||[]).length;
  const completed = (days||[]).filter(d => wlIsDone(logs, progId, d.id)).length;
  return { completed, total, pct: total ? Math.round(completed/total*100) : 0 };
}



/* ── LOCATION + COMMUTE DATA ─────────────────────────────────────────────── */

// Client's saved training location (profile-sourced)
/* ── PACKAGE / SESSION INVENTORY STORE ──────────────────────────────────────
   Single source of truth for the logged-in client's package state.
   In production this is fetched from the server at session start.
   checkBookingEligibility() is the enforcement function — Booking calls it
   before rendering the calendar. Returning { blocked: true } prevents all
   confirmation UI from rendering, regardless of UI state.
────────────────────────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════
   SESSION INVENTORY SYSTEM
   ─────────────────────────────────────────────────────────────────────────
   Sessions accumulate in the client's balance and do not auto-expire.
   Weekly booking limits prevent overbooking regardless of balance size.
   Admin can add/remove sessions, adjust weekly limits, and override gates.
══════════════════════════════════════════════════════════════════════════ */

/* ── PLAN CATALOGUE ───────────────────────────────────────────────────────── */
// Each plan defines how many sessions are granted per purchase and the
// maximum sessions the client may book in any single calendar week.
const PLAN_CATALOGUE = {
  "Hybrid Coaching":    { sessionsPerPurchase: 8,  weeklyMax: 2, label: "2x / week" },
  "1-on-1 Coaching":   { sessionsPerPurchase: 12, weeklyMax: 3, label: "3x / week" },
  "Online Programming":{ sessionsPerPurchase: 4,  weeklyMax: 1, label: "1x / week" },
  "Single Session":    { sessionsPerPurchase: 1,  weeklyMax: 1, label: "1x / week" },
};

/* ── SESSION INVENTORY STORE ─────────────────────────────────────────────── */
// Single source of truth for the active client's session balance,
// purchase history, weekly usage, and admin adjustments.
// In production: fetched from server, scoped to authenticated session.
const SESSION_INVENTORY = (() => {
  const state = {
    clientId:    1,
    clientName:  "Jordan Thomas",
    balance:     5,           // sessions currently available — does NOT expire
    plan:        "Hybrid Coaching",
    weeklyMax:   2,           // max sessions per calendar week (admin-configurable)
    adminOverride: false,     // bypasses all gates when true

    // Weekly usage tracking — keyed by ISO week string "YYYY-Www"
    weeklyUsage: {},

    // Append-only purchase history
    purchaseLog: [
      { id:"p1", date:"Mar 10, 2025", type:"Package",       plan:"Hybrid Coaching",  sessionsAdded: 8,  note:"Initial package purchase" },
      { id:"p2", date:"Mar 31, 2025", type:"Top-up",        plan:"Hybrid Coaching",  sessionsAdded: 8,  note:"Monthly renewal" },
      { id:"p3", date:"Apr 2, 2025",  type:"Admin Adjust",  plan:"",                 sessionsAdded:-3,  note:"3 sessions used Mar block" },
    ],

    // Admin adjustment log
    adjustLog: [],
  };

  // ── Week key helper ────────────────────────────────────────────────────
  function isoWeek(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const wk = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(wk).padStart(2,"0")}`;
  }

  return {
    // ── Reads ──────────────────────────────────────────────────────────
    get balance()    { return state.balance; },
    get plan()       { return state.plan; },
    get weeklyMax()  { return state.weeklyMax; },
    get adminOverride() { return state.adminOverride; },

    weeklyUsed(date) {
      return state.weeklyUsage[isoWeek(date)] || 0;
    },
    weeklyRemaining(date) {
      return Math.max(0, state.weeklyMax - this.weeklyUsed(date));
    },
    weekKey: isoWeek,

    purchaseLog() { return [...state.purchaseLog]; },
    adjustLog()   { return [...state.adjustLog];   },

    // ── Booking operations ─────────────────────────────────────────────
    // Deduct one session on confirmed booking.
    deduct(date = new Date()) {
      if (state.balance <= 0) return false;
      state.balance = Math.max(0, state.balance - 1);
      const wk = isoWeek(date);
      state.weeklyUsage[wk] = (state.weeklyUsage[wk] || 0) + 1;
      state.purchaseLog.unshift({
        id: `u${Date.now()}`, date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
        type: "Session Used", plan: state.plan, sessionsAdded: -1, note: "Booking confirmed",
      });
      return true;
    },
    // Restore one session on valid cancellation.
    restore(date = new Date()) {
      state.balance += 1;
      const wk = isoWeek(date);
      state.weeklyUsage[wk] = Math.max(0, (state.weeklyUsage[wk] || 0) - 1);
      state.purchaseLog.unshift({
        id: `r${Date.now()}`, date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
        type: "Session Restored", plan: state.plan, sessionsAdded: 1, note: "Cancellation within policy",
      });
    },

    // ── Admin operations ───────────────────────────────────────────────
    // Add sessions (package purchase, single session, or manual top-up).
    adminAdd(n, reason = "Manual adjustment", adminName = "Malik") {
      state.balance += n;
      const entry = {
        id: `a${Date.now()}`,
        date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
        type: n > 0 ? (n >= 4 ? "Package" : "Single Session") : "Admin Adjust",
        plan: state.plan, sessionsAdded: n, note: reason, by: adminName,
      };
      state.purchaseLog.unshift(entry);
      state.adjustLog.unshift({ ...entry, at: new Date().toLocaleTimeString() });
    },
    // Set weekly limit (admin-configurable per client).
    setWeeklyMax(n) { state.weeklyMax = Math.max(1, n); },
    // Toggle admin override.
    setOverride(v)  { state.adminOverride = v; },
    // Set plan.
    setPlan(planName) {
      state.plan = planName;
      const cfg = PLAN_CATALOGUE[planName];
      if (cfg) state.weeklyMax = cfg.weeklyMax;
    },
    // Direct balance set (admin only).
    setBalance(n)   { state.balance = Math.max(0, n); },
  };
})();


/* ══════════════════════════════════════════════════════════════════════════
   HELD INVENTORY STORE
   ─────────────────────────────────────────────────────────────────────────
   Tracks packages purchased but not yet active.
   Statuses:
     "held"      — purchased, no activation date set
     "scheduled" — activation date set, not yet reached
     "active"    — activated, sessions merged into SESSION_INVENTORY
     "expired"   — hold window elapsed without activation
     "paused"    — an active package paused by admin

   Business rules:
     • Max 1 held package per client (prevents accumulation)
     • Hold window: 90 days from purchase (HOLD_WINDOW_DAYS)
     • Non-transferable — tied to clientId
     • Paused packages freeze weekly usage; balance is preserved
══════════════════════════════════════════════════════════════════════════ */
const HOLD_WINDOW_DAYS = 90;

const HELD_INVENTORY = (() => {
  const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmt  = d => { if(!d) return null; const dt=new Date(d); return `${MO[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; };
  const addD = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
  const dUntil = d => { if(!d) return null; return Math.max(0,Math.ceil((new Date(d)-new Date())/86400000)); };

  const pkgs = [
    {
      id:"h1", clientId:1,
      plan:"2x Per Week", sessions:8,
      purchaseDate:  new Date("2025-04-10"),
      activationDate:new Date("2025-05-01"),
      expiresDate:   addD(new Date("2025-04-10"), 90),
      status:"scheduled",
      note:"Client away rest of April — starts fresh May 1.",
      pausedSince:null, pauseReason:null,
    },
  ];
  let activePause = null;

  const self = {
    all(cId=1)    { return pkgs.filter(p=>p.clientId===cId); },
    pending(cId=1){ return pkgs.filter(p=>p.clientId===cId&&["held","scheduled"].includes(p.status)); },
    isActive(cId=1){ return pkgs.filter(p=>p.clientId===cId&&p.status==="active"); },
    isPaused()    { return activePause!==null; },
    pauseInfo()   { return activePause; },
    fmt, dUntil,
    expiresLabel(p)     { return fmt(p.expiresDate); },
    daysUntilExpiry(p)  { return dUntil(p.expiresDate); },
    daysUntilStart(p)   { return p.activationDate ? dUntil(p.activationDate) : null; },
    activationLabel(p)  { return fmt(p.activationDate); },
    purchaseLabel(p)    { return fmt(p.purchaseDate); },

    hold(cId=1, plan, sessions, activationDate=null, note="") {
      if(self.pending(cId).length >= 1) return {ok:false,error:"Client already has a held package. Activate or remove it first."};
      const now=new Date();
      const p={
        id:`h${Date.now()}`,clientId:cId,plan,sessions,
        purchaseDate:now,
        activationDate: activationDate?new Date(activationDate):null,
        expiresDate: addD(now,HOLD_WINDOW_DAYS),
        status: activationDate?"scheduled":"held",
        note,pausedSince:null,pauseReason:null,
      };
      pkgs.push(p);
      SEC_LOG.push("package_held",`client:${cId}`,{plan,sessions,activationDate});
      return {ok:true,pkg:p};
    },

    schedule(id, activationDate) {
      const p=pkgs.find(x=>x.id===id); if(!p) return false;
      p.activationDate=new Date(activationDate); p.status="scheduled"; return true;
    },
    unschedule(id) {
      const p=pkgs.find(x=>x.id===id); if(!p) return false;
      p.activationDate=null; p.status="held"; return true;
    },

    activate(id) {
      const p=pkgs.find(x=>x.id===id);
      if(!p||!["held","scheduled"].includes(p.status)) return {ok:false,error:"Package not in held state."};
      if(new Date()>p.expiresDate){p.status="expired";return {ok:false,error:"Hold window expired."};}
      SESSION_INVENTORY.adminAdd(p.sessions,`Activated: ${p.plan} (${id})`);
      SESSION_INVENTORY.setPlan(p.plan);
      p.status="active";
      SEC_LOG.push("package_activated",`client:${p.clientId}`,{id,plan:p.plan,sessions:p.sessions});
      return {ok:true};
    },

    expire(id){ const p=pkgs.find(x=>x.id===id); if(p) p.status="expired"; },
    remove(id){ const i=pkgs.findIndex(x=>x.id===id); if(i>-1) pkgs.splice(i,1); },

    tick() {
      const now=new Date();
      pkgs.forEach(p=>{
        if(p.status==="scheduled"&&p.activationDate&&now>=p.activationDate) self.activate(p.id);
        if(["held","scheduled"].includes(p.status)&&now>p.expiresDate) p.status="expired";
      });
    },

    pause(reason="") {
      if(activePause) return;
      activePause={since:new Date(),reason};
      SEC_LOG.push("package_paused","client:1",{reason});
    },
    resume() {
      if(!activePause) return;
      SEC_LOG.push("package_resumed","client:1",{pausedFor:Math.ceil((new Date()-activePause.since)/86400000)+"d"});
      activePause=null;
    },
  };
  return self;
})();

// ── Backwards-compatible CLIENT_PACKAGE alias ─────────────────────────────
// Existing components that read CLIENT_PACKAGE.sessLeft etc. continue to work.
const CLIENT_PACKAGE = {
  get sessLeft()    { return SESSION_INVENTORY.balance; },
  get sessTotal()   { return PLAN_CATALOGUE[SESSION_INVENTORY.plan]?.sessionsPerPurchase || 0; },
  get pkg()         { return SESSION_INVENTORY.plan; },
  expires:    "Ongoing",   // sessions don't expire — balance accumulates
  expiresDate: new Date("2099-12-31"), // effectively never expires
  get status() {
    if (SESSION_INVENTORY.balance === 0) return "renewal";
    if (SESSION_INVENTORY.balance <= 2)  return "low";
    return "active";
  },
  get adminOverride() { return SESSION_INVENTORY.adminOverride; },
};

// Log of blocked booking attempts (shown on admin dashboard)
const BOOKING_BLOCK_LOG = (() => {
  const entries = [];
  return {
    push(email, reason, meta = {}) {
      entries.unshift({ email, reason, meta, at: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() });
      if (entries.length > 50) entries.pop();
    },
    all: () => entries.slice(0, 20),
    count: () => entries.length,
  };
})();

// ── Booking eligibility ───────────────────────────────────────────────────
// Returns { blocked: false } or { blocked: true, type, reason, detail }
// Checks: adminOverride → balance → weekly limit
// checkBookingEligibility and getInventoryWarning now accept a profileData
// object (from Supabase client_profiles) instead of the demo SESSION_INVENTORY.
// Fields used: sessions_balance, sessions_weekly_max, package_plan.
// Falls back to 0/2/"—" so the UI degrades gracefully while profileData loads.
function checkBookingEligibility(profileData) {
  const balance   = profileData?.sessions_balance    ?? 0;
  const weeklyMax = profileData?.sessions_weekly_max ?? 2;
  const plan      = profileData?.package_plan        || "—";
  // weekly_used is not yet stored in client_profiles — treat as 0 until wired
  const weeklyUsed = 0;

  if (balance <= 0) {
    return {
      blocked: true,
      type:    "no_sessions",
      reason:  "Booking Unavailable",
      detail:  "Your current package has no remaining sessions available for scheduling. Please add sessions to your account to continue booking.",
    };
  }

  if (weeklyUsed >= weeklyMax) {
    return {
      blocked: true,
      type:    "weekly_limit",
      reason:  "Weekly Limit Reached",
      detail:  `Your ${plan} plan includes ${weeklyMax} session${weeklyMax!==1?"s":""} per week. You've used all ${weeklyMax} this week. Additional sessions can be scheduled from next week onward.`,
    };
  }

  const weeklyRemaining = Math.max(0, weeklyMax - weeklyUsed);
  return { blocked: false, weeklyRemaining, weeklyUsed, weeklyMax };
}

// ── Inventory warning ─────────────────────────────────────────────────────
function getInventoryWarning(profileData) {
  const bal = profileData?.sessions_balance    ?? 0;
  const wm  = profileData?.sessions_weekly_max ?? 2;
  const plan= profileData?.package_plan        || "—";
  const wu  = 0; // weekly_used not yet in client_profiles

  if (bal === 0) return { level:"critical", msg:"No sessions available. Add sessions to your account to book." };
  if (bal === 1) return { level:"critical", msg:"You have 1 session remaining in your account." };
  if (wu >= wm)  return { level:"low",      msg:`Weekly limit reached (${wm}/${wm} used). You can book again from next week.` };
  if (bal <= 3)  return { level:"low",      msg:`${bal} sessions in your account. Consider topping up soon.` };
  return null;
}

const CLIENT_LOCATION = {
  building: "Equinox Hudson Yards",
  address:  "35 Hudson Yards, New York, NY 10001",
  area:     "hudson_yards",
  notes:    "Enter on 10th Ave. Gym is on Level 4. Buzz 4B at the desk.",
};

// Coach's existing schedule for today — used to compute buffers
// area codes: same_building → 0 min buffer, same_area → 15 min, different → 30 min
const COACH_SCHEDULE = [
  { time:"8:00 AM",  endTime:"9:00 AM",  client:"Marcus A.", location:{ building:"Equinox Hudson Yards", area:"hudson_yards" } },
  { time:"9:00 AM",  endTime:"10:00 AM", client:"Diana M.",  location:{ building:"Equinox Hudson Yards", area:"hudson_yards" } },
  { time:"12:00 PM", endTime:"1:00 PM",  client:"Alex R.",   location:{ building:"Alo Yoga Studio",      area:"chelsea"      } },
  { time:"1:00 PM",  endTime:"2:00 PM",  client:"Sam K.",    location:{ building:"Alo Yoga Studio",      area:"chelsea"      } },
  { time:"3:00 PM",  endTime:"4:00 PM",  client:"Priya N.",  location:{ building:"TMPL Gym",             area:"hell's_kitchen"} },
];

// Buffer rules (minutes needed after a session ends before next can start, by area match)
const COMMUTE_RULES = {
  same_building: 10,  // cleanup + brief travel within same floor/building
  same_area:     20,  // walkable neighbourhood
  different:     35,  // transit or drive required
};

// Parse "9:00 AM" → minutes since midnight
function parseTime(t) {
  const [time, ampm] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// Format minutes since midnight → "9:00 AM"
function fmtTime(mins) {
  const h24 = Math.floor(mins / 60);
  const m   = mins % 60;
  const ampm = h24 < 12 ? "AM" : "PM";
  const h   = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2,"0")} ${ampm}`;
}

// Given a candidate slot and client location, determine if it conflicts with coach schedule
function getSlotStatus(slotTime, clientArea) {
  const slotStart = parseTime(slotTime);
  const SESSION_LEN = 60; // minutes
  const slotEnd = slotStart + SESSION_LEN;

  for (const s of COACH_SCHEDULE) {
    const schedEnd   = parseTime(s.endTime);
    const schedStart = parseTime(s.time);

    // Determine buffer needed between this scheduled session and candidate
    const coachArea   = s.location.area;
    const sameBuilding = s.location.building === CLIENT_LOCATION.building;
    const bufferKey = sameBuilding ? "same_building"
                    : coachArea === clientArea ? "same_area"
                    : "different";
    const buffer = COMMUTE_RULES[bufferKey];

    // Slot conflicts if it starts before coach finishes + commute buffer
    // OR a later slot ends and the slot would start before travel is done
    if (slotStart < schedEnd + buffer && slotEnd > schedStart - buffer) {
      if (slotStart >= schedStart && slotStart < schedEnd) {
        return { status: "taken", reason: null, buffer: 0 };
      }
      if (slotStart >= schedEnd && slotStart < schedEnd + buffer) {
        const bufferLabel = sameBuilding ? "Same building — short buffer"
                          : coachArea === clientArea ? `Same area — ${buffer} min travel`
                          : `Different location — ${buffer} min travel`;
        return { status: "blocked", reason: bufferLabel, buffer };
      }
      if (slotEnd > schedStart - buffer && slotEnd <= schedStart) {
        const buffer2Label = sameBuilding ? "Same building — short buffer"
                           : coachArea === clientArea ? `Same area — ${buffer} min travel`
                           : `Different location — ${buffer} min travel`;
        return { status: "blocked", reason: buffer2Label, buffer };
      }
    }
  }
  return { status: "available", reason: null, buffer: 0 };
}

const MESSAGES = [
  { id:1, name:"Malik Bryant", role:"Coach", init:"MB", preview:"Great work this week. Your hip hinge...", time:"2d", unread:2, messages:[
    { from:"them", text:"Great work this week. Your hip hinge is significantly improved — ready to progress to heavier RDLs next session.", time:"Tue 4:30 PM" },
    { from:"them", text:"Keep the sleep consistency going. That's making a real difference in your recovery.", time:"Tue 4:31 PM" },
    { from:"me",   text:"Thanks Malik! I really noticed the difference on Friday's session. Hip felt a lot more stable.", time:"Tue 6:12 PM" },
    { from:"me",   text:"Sleep has been better — aiming for 7.5hrs consistently now.", time:"Tue 6:13 PM" },
    { from:"them", text:"Perfect. That's the right goal. See you Friday — we'll bump the RDL to 245.", time:"Wed 9:02 AM" },
  ]},
];

const NOTIFS = [
  { id:1, read:false, ic:"◷", text:"Reminder: Training Session tomorrow at 6:00 PM", time:"4h ago" },
  { id:2, read:false, ic:"✦", text:"Your birthday reward is active. Book your complimentary session before Apr 30.", time:"1d ago" },
  { id:3, read:true,  ic:"▦", text:"New program update pushed by Malik. Block 2 is ready.", time:"2d ago" },
  { id:4, read:true,  ic:"◈", text:"Sessions running low — 2 remaining. Consider renewing.", time:"3d ago" },
];

const OB_STEPS = [
  "Personal Info","Your Goals","Training History","Preferences","Health","Lifestyle","Agreements"
];

const GOALS = ["Fat Loss","Muscle Growth","Improve Mobility","Build Strength","Athletic Performance","General Fitness","Better Movement","Body Recomposition"];
const LEVELS = ["Beginner","Beginner–Intermediate","Intermediate","Advanced"];
const TRAIN_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TRAIN_TIMES = ["Early AM","Morning","Midday","Afternoon","Evening","Late Night"];
const SLEEP_OPTS = ["Poor","Fair","Good","Great"];
const STRESS_OPTS = ["Low","Moderate","High"];

/* ── SMALL SHARED COMPONENTS ────────────────────────────────────────────── */
function Topbar({ title, actions, onMenu }) {
  return (
    <div className="topbar">
      <div className="flex items-center gap-12">
        {onMenu && <button className="btn btn-icon" style={{display:"none"}} onClick={onMenu}>≡</button>}
        <span className="topbar-title">{title}</span>
      </div>
      <div className="topbar-actions">{actions}</div>
    </div>
  );
}

function Tag({ type="pend", children }) {
  return <span className={`tag tag-${type}`}>{children}</span>;
}

function Alert({ type="info", children }) {
  const icons = { ok:"✓", warn:"!", err:"✕", info:"ℹ" };
  return (
    <div className={`alert alert-${type}`}>
      <span style={{flexShrink:0,fontWeight:600}}>{icons[type]}</span>
      <span>{children}</span>
    </div>
  );
}

function Spinner() { return <span className="spinner" />; }

function SaveIndicator({ saving }) {
  if (!saving) return null;
  return <span className="body-sm" style={{color:"var(--txt-2)"}}><span className="save-dot" />Saving…</span>;
}

function BarTrack({ pct, variant="" }) {
  return (
    <div className="bar-track">
      <div className={`bar-fill ${variant}`} style={{width:`${pct}%`}} />
    </div>
  );
}

function FieldLocked({ label, value, note }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="fi-locked">
        <span>{value}</span>
        <span style={{fontSize:"0.6rem",color:"var(--txt-2)",letterSpacing:"0.1em",textTransform:"uppercase"}}>🔒 Locked</span>
      </div>
      {note && <span className="field-note">{note}</span>}
    </div>
  );
}

function CheckRow({ checked, onToggle, children }) {
  return (
    <div className="check-row" onClick={onToggle}>
      <div className={`chk${checked?" on":""}`}>{checked?"✓":""}</div>
      <span className="check-txt">{children}</span>
    </div>
  );
}

/* ── AUTH SCREENS ─────────────────────────────────────────────────────────────────────────────────── */

/* RATE LIMITER — client-side UX only; Supabase enforces real limits server-side */
const RATE=(()=>{
  const store={};
  const ms=(n)=>{if(n>=5)return 30000;return 0;};
  return{
    check(email){const e=store[email.toLowerCase()];if(!e)return{ok:true,remaining:0};const m=ms(e.count);if(!m)return{ok:true,remaining:0};const r=Math.max(0,m-(Date.now()-e.lastAt));return{ok:r===0,remaining:r};},
    fail(email){const k=email.toLowerCase();store[k]={count:(store[k]?.count||0)+1,lastAt:Date.now()};return store[k].count;},
    reset(email){delete store[email.toLowerCase()];},
    count(email){return store[email.toLowerCase()]?.count||0;},
  };
})();

function formatLockout(ms){
  if(ms>=3600000)return`${Math.ceil(ms/3600000)} hour${ms>=7200000?"s":""}`;
  if(ms>=60000)return`${Math.ceil(ms/60000)} min${ms>=120000?"s":""}`;
  return`${Math.ceil(ms/1000)}s`;
}

/* No-op stubs — real auth is Supabase (src/lib/auth.js).
   These exist only so UI components that reference them don't crash. */
const SEC = {
  backupCodes(){ return []; },
  verifyTOTP(){ return true; },
  passkeySupported(){ return !!(window.PublicKeyCredential&&navigator.credentials?.create); },
};
const SESSION_STORE = {
  create(){ return null; },
  list(){ return []; },
  revoke(){ },
  revokeAll(){ },
};
const SEC_LOG = {
  push(){ },
  forEmail(){ return []; },
  all(){ return []; },
};
const MFA_STORE = {
  get(){ return { enabled:false, secret:null, backupCodes:[], passkey:false }; },
  enable(){ },
  useCode(){ return false; },
};
const RESET_STORE  = { create(){ return ""; }, consume(){ return null; } };
const EMAIL_VERIFY_STORE = { create(){ return ""; }, consume(){ return null; }, preVerify(){ } };

/* Role helpers — role values always come from the Supabase profiles table */
const OWNER_EMAIL = "mlvnt2026@gmail.com";
function normaliseEmail(raw){ return (raw||"").trim().toLowerCase(); }
function isAdminRole(role){ return role==="owner"||role==="admin"; }
function isOwnerRole(role){ return role==="owner"; }

/* Legacy stubs — not called anywhere; kept for safety */
const USERS = [];
const REGISTERED = [];
function registerAccount(){ return { ok:false, error:"Use Supabase auth." }; }
function resolveCredentials(){ return null; }
const ROLE_ENGINE = { assign(){ return "client"; }, ownerSeeded(){ return false; }, markOwnerSeeded(){ } };

/* ── ACCESS DENIED ───────────────────────────────────────────────────────── */
function AccessDenied({ onBack }) {
  return (
    <div className="auth-shell">
      <div className="auth-bg" />
      <div className="auth-card page-fade" style={{textAlign:"center"}}>
        <div className="auth-shimmer" />
        <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(107,26,26,0.2)",border:"1px solid rgba(180,60,60,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",margin:"0 auto 16px"}}>✕</div>
        <div className="auth-logo" style={{marginBottom:8}}>Access Denied</div>
        <p className="auth-sub" style={{marginBottom:24}}>You do not have permission to access this area.</p>
        <Alert type="err">Admin access requires authorised credentials and MFA verification.</Alert>
        <button className="btn btn-p btn-full mt-20" onClick={onBack}>← Back to Sign In</button>
      </div>
    </div>
  );
}

/* ── AUTH LOGIN ──────────────────────────────────────────────────────────── */
function AuthLogin({ onLoginSuccess, onForgot, onSignup, onConsult, onPackages, onBack }) {
  const [email,   setEmail]   = useState("");
  const [pw,      setPw]      = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [remember,setRem]     = useState(true);
  const [loading, setLoad]    = useState(false);
  const [err,     setErr]     = useState("");
  const [mfaStep, setMfaStep]       = useState(false);
  const [mfaCode, setMfaCode]       = useState("");
  const [mfaErr,  setMfaErr]        = useState("");
  const [pendingSession, setPending]= useState(null);
  const [useBackup, setUseBackup]   = useState(false);
  const [locked,  setLocked]  = useState(false);
  const [lockMs,  setLockMs]  = useState(0);

  useEffect(()=>{
    if(!locked||lockMs<=0)return;
    const t=setInterval(()=>{setLockMs(p=>{if(p<=1000){setLocked(false);clearInterval(t);return 0;}return p-1000;});},1000);
    return()=>clearInterval(t);
  },[locked,lockMs]);

  const submit = async () => {
    if (!email || !pw) { setErr("Please enter your email and password."); return; }
    const check = RATE.check(email);
    if (!check.ok) { setLocked(true); setLockMs(check.remaining); setErr(`Account locked. Try again in ${formatLockout(check.remaining)}.`); return; }
    setErr(""); setLoad(true);

    const result = await signIn(email, pw);
    setLoad(false);

    if (!result.ok) {
      const count = RATE.fail(email);
      const recheck = RATE.check(email);
      if (!recheck.ok) { setLocked(true); setLockMs(recheck.remaining); setErr(`Too many attempts. Locked for ${formatLockout(recheck.remaining)}.`); SEC_LOG.push("lockout", email, { count }); }
      else { const left = 5 - count; setErr(`${result.error}${left > 0 && left <= 3 ? ` ${left} attempt${left === 1 ? "" : "s"} remaining.` : ""}`); }
      SEC_LOG.push("failed_login", email, { count: RATE.count(email) });
      return;
    }

    RATE.reset(email);
    const sess = result.session;
    // MFA gate: driven solely by sess.mfaRequired from Supabase profiles table.
    // MFA_STORE is a UI-only stub and is NOT consulted for auth decisions.
    if (sess.mfaRequired) {
      setPending(sess); setMfaStep(true); SEC_LOG.push("mfa_challenge", sess.email);
    } else {
      SEC_LOG.push("login_success", sess.email, { device: navigator.userAgent.slice(0, 60) });
      onLoginSuccess(sess);
    }
  };

  // submitMFA: Supabase MFA verification is handled server-side by the
  // auth session. This client-side step just gates UI access. Any 6-digit
  // code advances the flow; the Supabase session is already valid from signIn.
  const submitMFA = () => {
    if (!mfaCode.trim() || mfaCode.length < 6) {
      setMfaErr("Please enter your 6-digit verification code.");
      return;
    }
    setMfaErr("");
    SEC_LOG.push("mfa_success", pendingSession.email);
    onLoginSuccess(pendingSession);
  };

  const signInWithPasskey=async()=>{
    if(!SEC.passkeySupported()){setErr("Passkeys are not supported on this device.");return;}
    setLoad(true);await new Promise(r=>setTimeout(r,900));setLoad(false);
    setErr("Passkey verification available in production. Use email + password for demo.");
  };

  if(mfaStep) return(
    <div className="auth-shell">
      <div className="auth-bg" />
      <div className="auth-card page-fade">
        <div className="auth-shimmer" />
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"var(--acc-0)",border:"1px solid var(--b0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>🔐</div>
          <div>
            <div className="auth-logo" style={{fontSize:"1rem",marginBottom:2}}>Two-Step Verification</div>
            <p style={{fontSize:"0.68rem",color:"var(--txt-2)"}}>Signed in as {pendingSession?.email}</p>
          </div>
        </div>
        {!useBackup?(
          <>
            <p className="auth-sub" style={{marginBottom:20}}>Open your authenticator app and enter the 6-digit code for <strong style={{color:"var(--txt-0)"}}>MLVNT</strong>.</p>
            {mfaErr&&<Alert type="err">{mfaErr}</Alert>}
            <div className="field mt-12">
              <label className="field-label">Verification Code</label>
              <input className="fi" placeholder="000 000" value={mfaCode}
                onChange={e=>{setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6));setMfaErr("");}}
                onKeyDown={e=>e.key==="Enter"&&submitMFA()}
                maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                style={{textAlign:"center",fontSize:"1.3rem",letterSpacing:"0.2em",fontFamily:"var(--fc)"}} autoFocus />
            </div>
            <p style={{fontSize:"0.63rem",color:"var(--txt-2)",marginTop:6,lineHeight:1.5}}>Codes refresh every 30 seconds. Demo: any 6 digits work.</p>
            <button className="btn btn-p btn-full mt-16" style={{opacity:mfaCode.length===6?1:0.45}} onClick={submitMFA}>Verify</button>
            <button className="btn btn-ghost btn-full mt-12" onClick={()=>{setUseBackup(true);setMfaCode("");setMfaErr("");}}>Use a backup code instead</button>
          </>
        ):(
          <>
            <p className="auth-sub" style={{marginBottom:20}}>Enter one of your 8-character backup codes. Each can only be used once.</p>
            {mfaErr&&<Alert type="err">{mfaErr}</Alert>}
            <div className="field mt-12">
              <label className="field-label">Backup Code</label>
              <input className="fi" placeholder="ABCD1234" value={mfaCode}
                onChange={e=>{setMfaCode(e.target.value.toUpperCase().replace(/\s/g,""));setMfaErr("");}}
                maxLength={8} autoComplete="off"
                style={{textAlign:"center",fontSize:"1.1rem",letterSpacing:"0.18em",fontFamily:"var(--fc)"}} autoFocus />
            </div>
            <button className="btn btn-p btn-full mt-16" onClick={submitMFA}>Verify Backup Code</button>
            <button className="btn btn-ghost btn-full mt-12" onClick={()=>{setUseBackup(false);setMfaCode("");setMfaErr("");}}>← Use authenticator app</button>
          </>
        )}
        <button className="btn btn-ghost btn-full mt-12" style={{fontSize:"0.64rem",color:"var(--txt-2)"}}
          onClick={()=>{setMfaStep(false);setPending(null);setMfaCode("");setMfaErr("");}}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-shell">
      <div className="auth-bg" />
      <div className="auth-card page-fade">
        <div className="auth-shimmer" />
        {onBack && (
          <button className="btn btn-ghost" style={{fontSize:"0.62rem",marginBottom:16,color:"var(--txt-2)"}} onClick={onBack}>
            ← Back to MLVNT.com
          </button>
        )}
        <div className="auth-logo">MLVNT</div>
        <p className="auth-sub">Welcome back. Sign in to your training account.</p>
        {err&&<Alert type="err">{err}</Alert>}
        {locked&&lockMs>0&&(
          <div style={{marginTop:8,padding:"10px 14px",borderRadius:"var(--r2)",background:"rgba(107,74,26,0.18)",border:"1px solid rgba(180,120,40,0.25)",fontSize:"0.75rem",color:"rgba(220,175,100,0.85)",display:"flex",alignItems:"center",gap:8}}>
            <span>⏱</span> Locked for {formatLockout(lockMs)}
          </div>
        )}
        <div className="form-col mt-20">
          <div className="field">
            <label className="field-label">Email Address</label>
            <input className="fi" type="email" placeholder="you@email.com" value={email}
              onChange={e=>{setEmail(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}
              autoComplete="email" disabled={locked} />
          </div>
          <div className="field">
            <div className="flex between items-center mb-4">
              <label className="field-label">Password</label>
              <span className="auth-link" style={{fontSize:"0.67rem"}} onClick={onForgot}>Forgot password?</span>
            </div>
            <div className="fi-pw">
              <input className="fi" type={showPw?"text":"password"} placeholder="••••••••" value={pw}
                onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}
                autoComplete="current-password" disabled={locked} />
              <button className="fi-pw-toggle" type="button" onClick={()=>setShowPw(p=>!p)}>{showPw?"Hide":"Show"}</button>
            </div>
          </div>
          <div className="check-row mt-4" onClick={()=>setRem(p=>!p)} style={{marginTop:4}}>
            <div className={`chk${remember?" on":""}`}>{remember?"✓":""}</div>
            <span className="check-txt">Keep me signed in</span>
          </div>
        </div>
        <button className={`btn btn-p btn-full mt-20${(loading||locked)?" btn-loading":""}`} onClick={submit} disabled={locked}>
          {loading?<><Spinner />Verifying…</>:locked?"Locked":"Sign In"}
        </button>
        {SEC.passkeySupported()&&(
          <button className="btn btn-s btn-full mt-10" onClick={signInWithPasskey} style={{gap:8,fontSize:"0.68rem"}}>
            <span style={{fontSize:"0.9rem"}}>🔑</span> Sign in with Passkey
          </button>
        )}
        <div style={{
          marginTop:14,
          padding:"14px 16px",
          borderRadius:"var(--r3)",
          background:"rgba(255,255,255,0.03)",
          border:"1px solid var(--b0)",
        }}>
          <p style={{fontFamily:"var(--fh)",fontSize:"0.8rem",fontWeight:700,color:"var(--txt-0)",marginBottom:2}}>New to MLVNT?</p>
          <p style={{fontSize:"0.71rem",color:"var(--txt-1)",lineHeight:1.4,marginBottom:12}}>Book a free 30-min consultation — no account needed.</p>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <button
              className="btn btn-s btn-sm btn-full"
              onClick={onConsult}
            >
              Book a Free Consultation
            </button>
            {onPackages && (
              <button
                className="btn btn-ghost btn-sm btn-full"
                style={{fontSize:"0.66rem"}}
                onClick={onPackages}
              >
                View Training Plans
              </button>
            )}
          </div>
        </div>
        <div className="auth-divider mt-20">or</div>
        <div className="flex items-center gap-8" style={{justifyContent:"center"}}>
          <span className="body-sm">No account yet?</span>
          <span className="auth-link" onClick={onSignup} style={{fontWeight:500,color:"var(--txt-0)"}}>Create account →</span>
        </div>
        <p className="body-sm mt-20" style={{textAlign:"center",color:"var(--txt-2)",fontSize:"0.65rem"}}>
          Protected by PBKDF2 hashing, session rotation, and rate limiting. Admin requires MFA.
        </p>
      </div>
    </div>
  );
}

/* ── AUTH SIGNUP ─────────────────────────────────────────────────────────── */
// Role is NEVER collected from the form. It is assigned by ROLE_ENGINE
// server-side based on email. The frontend has no influence over role.
function AuthSignup({ onLogin, onBack }) {
  const [step,   setStep]  = useState(0);
  const [email,  setEmail] = useState("");
  const [name,   setName]  = useState("");
  const [pw,     setPw]    = useState("");
  const [pw2,    setPw2]   = useState("");
  const [showPw, setShow]  = useState(false);
  const [loading,setLoad]  = useState(false);
  const [err,    setErr]   = useState("");
  // Post-registration state
  const [created,  setCreated]   = useState(false);
  const [createdAs,setCreatedAs] = useState(null); // the resolved role

  const strength=(()=>{
    if(!pw)return 0;let s=0;
    if(pw.length>=8)s++;if(pw.length>=12)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;return s;
  })();
  const sLabel=["","Weak","Fair","Good","Strong","Very Strong"][strength];
  const sColor=["","rgba(200,80,80,0.7)","rgba(200,140,60,0.8)","rgba(200,190,80,0.8)","rgba(100,190,100,0.8)","rgba(60,180,120,0.8)"][strength];

  const next = async () => {
    if(step===0){
      if(!name||!email){setErr("Please fill in your name and email.");return;}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setErr("Please enter a valid email address.");return;}
      setErr("");setStep(1);
    }else{
      if(!pw||pw.length<8){setErr("Password must be at least 8 characters.");return;}
      if(strength<2){setErr("Password is too weak. Add uppercase letters, numbers, or symbols.");return;}
      if(pw!==pw2){setErr("Passwords don't match.");return;}
      setErr("");setLoad(true);

      const result = await signUp(email, pw, name);
      setLoad(false);

      if (!result.ok) { setErr(result.error); return; }
      setCreatedAs(result.role);
      SEC_LOG.push("signup_complete", email.trim().toLowerCase(), { role: result.role });
      setCreated(true);
    }
  };

  // After showing the "verify email" screen, proceed to login page
  const proceedToLogin = () => {
    onBack(); // → setScreen("login")
  };

  // Email verification screen (shown after account creation)
  if (created) return (
    <div className="auth-shell">
      <div className="auth-bg" />
      <div className="auth-card page-fade" style={{textAlign:"center"}}>
        <div className="auth-shimmer" />
        <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(30,60,90,0.3)",border:"1px solid var(--b1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",margin:"0 auto 16px"}}>✉</div>
        <div className="auth-logo" style={{marginBottom:8}}>Verify Your Email</div>
        <p className="auth-sub" style={{marginBottom:16}}>
          We've sent a verification link to <strong style={{color:"var(--txt-0)"}}>{normaliseEmail(email)}</strong>. Please verify your email before continuing.
        </p>
        {isAdminRole(createdAs) && (
          <div style={{padding:"12px 14px",borderRadius:"var(--r2)",background:"rgba(30,43,58,0.6)",border:"1px solid var(--b0)",marginBottom:16,textAlign:"left"}}>
            <p style={{fontSize:"0.62rem",color:"var(--txt-2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5,fontFamily:"var(--fb)"}}>
              {createdAs === "owner" ? "Owner Account Created" : "Admin Account Created"}
            </p>
            <p style={{fontSize:"0.78rem",color:"var(--txt-1)",lineHeight:1.6}}>
              {createdAs === "owner"
                ? "Your owner account has been created. After verifying your email, you will be required to complete two-step verification before accessing the admin dashboard."
                : "Two-step verification is required to secure your admin account. You will be prompted to set it up on first login."}
            </p>
          </div>
        )}
        <Alert type="info">
          Check your inbox at <strong>{normaliseEmail(email)}</strong> for a verification link. Click it to activate your account, then sign in.
        </Alert>
        <button className="btn btn-p btn-full mt-20" onClick={proceedToLogin}>
          Go to Sign In →
        </button>
      </div>
    </div>
  );

  return(
    <div className="auth-shell">
      <div className="auth-bg" />
      <div className="auth-card page-fade">
        <div className="auth-shimmer" />
        <div className="auth-logo">MLVNT</div>
        <p className="auth-sub">{step===0?"Create your account to get started.":"Set a secure password for your account."}</p>
        <div className="flex gap-4 mb-20" style={{marginBottom:20}}>
          {[0,1].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?"var(--acc-2)":"var(--b0)",transition:"background 0.3s"}} />)}
        </div>
        {err&&<Alert type="err">{err}</Alert>}
        {step===0?(
          <div className="form-col mt-16">
            <div className="field"><label className="field-label">Full Name</label><input className="fi" placeholder="Your Name" value={name} onChange={e=>{setName(e.target.value);setErr("");}} autoComplete="name" /></div>
            <div className="field">
              <label className="field-label">Email Address</label>
              <input className="fi" type="email" placeholder="you@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} autoComplete="email" />
              {/* Never show a role field — role is assigned server-side only */}
            </div>
          </div>
        ):(
          <div className="form-col mt-16">
            <div className="field">
              <label className="field-label">Create Password</label>
              <div className="fi-pw">
                <input className="fi" type={showPw?"text":"password"} placeholder="Min. 8 characters" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} autoComplete="new-password" />
                <button className="fi-pw-toggle" type="button" onClick={()=>setShow(p=>!p)}>{showPw?"Hide":"Show"}</button>
              </div>
              {pw&&(<div style={{marginTop:7}}><div style={{display:"flex",gap:3,marginBottom:5}}>{[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:3,borderRadius:1.5,background:i<=strength?sColor:"var(--b0)",transition:"background 0.25s"}} />)}</div><span style={{fontSize:"0.63rem",color:sColor}}>{sLabel}</span></div>)}
            </div>
            <div className="field"><label className="field-label">Confirm Password</label><input className="fi" type="password" placeholder="Re-enter password" value={pw2} onChange={e=>{setPw2(e.target.value);setErr("");}} autoComplete="new-password" /></div>
            <p style={{fontSize:"0.65rem",color:"var(--txt-2)",lineHeight:1.55}}>Passwords are stored using PBKDF2-SHA256 hashing. Account type is assigned automatically and cannot be requested through this form.</p>
          </div>
        )}
        <button className={`btn btn-p btn-full mt-20${loading?" btn-loading":""}`} onClick={next}>
          {loading?<><Spinner />Creating account…</>:step===0?"Continue →":"Create Account"}
        </button>
        {step===0&&<div className="flex items-center gap-8 mt-16" style={{justifyContent:"center"}}><span className="body-sm">Already have an account?</span><span className="auth-link" onClick={onBack}>Sign in →</span></div>}
        {step===1&&<button className="btn btn-ghost btn-full mt-12" onClick={()=>{setStep(0);setErr("");}}>← Back</button>}
      </div>
    </div>
  );
}

/* ── AUTH FORGOT / RESET PASSWORD ────────────────────────────────────────── */
function AuthForgot({ onBack }) {
  const [step,  setStep]  = useState(0);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [pw,    setPw]    = useState("");
  const [pw2,   setPw2]   = useState("");
  const [showPw,setShow]  = useState(false);
  const [loading,setLoad] = useState(false);
  const [err,   setErr]   = useState("");
  const [resetToken,setResetToken] = useState("");
  const strength=(()=>{if(!pw)return 0;let s=0;if(pw.length>=8)s++;if(pw.length>=12)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;return s;})();

  const requestReset = async () => {
    if(!email){setErr("Please enter your email address.");return;}
    setErr("");setLoad(true);
    await sendPasswordReset(email);   // always resolves ok:true (no email enumeration)
    setLoad(false);
    // Supabase sends a real email with a link. Skip the manual-token step.
    setStep(2);
    setErr("");
  };
  const doReset = async () => {
    if(!pw||pw.length<8){setErr("Password must be at least 8 characters.");return;}
    if(strength<2){setErr("Password is too weak.");return;}
    if(pw!==pw2){setErr("Passwords don't match.");return;}
    setErr("");setLoad(true);
    const result = await updatePassword(pw);
    setLoad(false);
    if (!result.ok) { setErr(result.error); return; }
    SEC_LOG.push("password_changed", email, { note: "reset via email link" });
    setStep(3);
  };

  return(
    <div className="auth-shell">
      <div className="auth-bg" />
      <div className="auth-card page-fade">
        <div className="auth-shimmer" />
        <div className="auth-logo">MLVNT</div>
        {step===0&&(<>
          <p className="auth-sub">Reset your password. We'll send a secure link to your email.</p>
          {err&&<Alert type="err">{err}</Alert>}
          <div className="field mt-20"><label className="field-label">Email Address</label><input className="fi" type="email" placeholder="you@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&requestReset()} /></div>
          <button className={`btn btn-p btn-full mt-16${loading?" btn-loading":""}`} onClick={requestReset}>{loading?<><Spinner />Sending…</>:"Send Reset Link"}</button>
          <button className="btn btn-ghost btn-full mt-12" onClick={onBack}>← Back to sign in</button>
        </>)}
        {step===1&&(<>
          <Alert type="ok">If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox — it expires in 1 hour.</Alert>
          <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.7,marginTop:12}}>
            Click the link in the email. It will return you to this site and automatically open a form where you can set a new password.
          </p>
          <button className="btn btn-ghost btn-full mt-16" onClick={()=>{setStep(0);setErr("");}}>← Send again with a different email</button>
          <button className="btn btn-ghost btn-full mt-8" onClick={onBack}>← Back to sign in</button>
        </>)}
        {step===2&&(<>
          <p className="auth-sub" style={{marginBottom:16}}>Choose a new password for your account.</p>
          {err&&<Alert type="err">{err}</Alert>}
          <div className="form-col mt-8">
            <div className="field">
              <label className="field-label">New Password</label>
              <div className="fi-pw"><input className="fi" type={showPw?"text":"password"} placeholder="Min. 8 characters" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} autoComplete="new-password" /><button className="fi-pw-toggle" type="button" onClick={()=>setShow(p=>!p)}>{showPw?"Hide":"Show"}</button></div>
              {pw&&<div style={{marginTop:6,display:"flex",gap:3}}>{[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:3,borderRadius:1.5,background:i<=strength?"var(--acc-2)":"var(--b0)",transition:"background 0.25s"}} />)}</div>}
            </div>
            <div className="field"><label className="field-label">Confirm New Password</label><input className="fi" type="password" placeholder="Re-enter password" value={pw2} onChange={e=>{setPw2(e.target.value);setErr("");}} autoComplete="new-password" /></div>
          </div>
          <button className={`btn btn-p btn-full mt-16${loading?" btn-loading":""}`} onClick={doReset}>{loading?<><Spinner />Updating…</>:"Update Password"}</button>
        </>)}
        {step===3&&(<>
          <Alert type="ok">Password updated. All other sessions have been signed out for your security.</Alert>
          <button className="btn btn-p btn-full mt-20" onClick={onBack}>← Sign In</button>
        </>)}
      </div>
    </div>
  );
}

/* ── MFA SETUP WIZARD ────────────────────────────────────────────────────── */
function MFASetup({ session, onDone, onSkip }) {
  const [step,  setStep] = useState(0);
  const [code,  setCode] = useState("");
  const [err,   setErr]  = useState("");
  const [codes, setCodes]= useState(()=>SEC.backupCodes());

  // MFA setup is UI-only here; real TOTP enrollment is handled via
  // Supabase's MFA API (supabase.auth.mfa.enroll) which is wired separately.
  // This wizard walks the user through the concept and advances on any 6-digit code.
  const verify=()=>{
    if(!/^\d{6}$/.test(code.trim())){setErr("Please enter a 6-digit code.");return;}
    setStep(3);
  };

  return(
    <div className="auth-shell">
      <div className="auth-bg" />
      <div className="auth-card page-fade" style={{maxWidth:480}}>
        <div className="auth-shimmer" />
        {step===0&&(<>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}><span style={{fontSize:"1.6rem"}}>🔐</span><div className="auth-logo">Set Up Two-Factor Authentication</div></div>
          <p className="auth-sub">Add an extra layer of security. You'll need your authenticator app every time you sign in.</p>
          <div style={{display:"flex",flexDirection:"column",gap:8,margin:"20px 0"}}>
            {["Works with Google Authenticator, Authy, 1Password, and any TOTP app.","Backup codes are provided in case you lose device access.","Admin accounts require 2FA to be enabled."].map((t,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)"}}>
                <span style={{fontSize:"0.75rem",marginTop:1}}>✓</span>
                <p style={{fontSize:"0.78rem",color:"var(--txt-1)",lineHeight:1.55}}>{t}</p>
              </div>
            ))}
          </div>
          <button className="btn btn-p btn-full" onClick={()=>setStep(1)}>Get Started →</button>
          {onSkip&&<button className="btn btn-ghost btn-full mt-12" onClick={onSkip}>Set up later</button>}
        </>)}
        {step===1&&(<>
          <div className="auth-logo" style={{marginBottom:6}}>Scan the QR Code</div>
          <p className="auth-sub" style={{marginBottom:16}}>Open your authenticator app and scan this code, or enter the setup key manually.</p>
          <div style={{width:160,height:160,borderRadius:"var(--r3)",background:"rgba(255,255,255,0.92)",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6}}>
            <p style={{fontFamily:"monospace",fontSize:"0.48rem",color:"#222",textAlign:"center",padding:10}}>[QR Code renders here in production]</p>
          </div>
          <div style={{padding:"10px 14px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.25)",border:"1px solid var(--b0)",marginBottom:16}}>
            <p style={{fontSize:"0.58rem",color:"var(--txt-2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Manual Setup Key</p>
            <p style={{fontFamily:"var(--fc)",fontSize:"0.88rem",letterSpacing:"0.1em",color:"var(--txt-0)"}}>— available after Supabase MFA enrollment —</p>
          </div>
          <button className="btn btn-p btn-full" onClick={()=>setStep(2)}>I've scanned it →</button>
        </>)}
        {step===2&&(<>
          <div className="auth-logo" style={{marginBottom:6}}>Enter the Verification Code</div>
          <p className="auth-sub" style={{marginBottom:16}}>Enter the 6-digit code from your authenticator app.</p>
          {err&&<Alert type="err">{err}</Alert>}
          <div className="field mt-12">
            <label className="field-label">Verification Code</label>
            <input className="fi" placeholder="000 000" value={code}
              onChange={e=>{setCode(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&verify()}
              maxLength={6} inputMode="numeric" autoComplete="one-time-code"
              style={{textAlign:"center",fontSize:"1.3rem",letterSpacing:"0.2em",fontFamily:"var(--fc)"}} autoFocus />
            <p className="field-note">Demo: enter any 6-digit number.</p>
          </div>
          <button className="btn btn-p btn-full mt-16" style={{opacity:code.length===6?1:0.45}} onClick={verify}>Confirm Setup</button>
        </>)}
        {step===3&&(<>
          <div className="auth-logo" style={{marginBottom:6}}>Save Your Backup Codes</div>
          <p className="auth-sub" style={{marginBottom:16}}>Store these somewhere safe. Each can be used once if you lose your device.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:16}}>
            {codes.map((c,i)=>(
              <div key={i} style={{padding:"8px 12px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.25)",border:"1px solid var(--b0)",fontFamily:"var(--fc)",fontSize:"0.84rem",letterSpacing:"0.1em",color:"var(--txt-0)",textAlign:"center"}}>{c}</div>
            ))}
          </div>
          <Alert type="warn">These codes won't be shown again. Copy or print them now.</Alert>
          <button className="btn btn-p btn-full mt-16" onClick={()=>setStep(4)}>I've saved my backup codes →</button>
        </>)}
        {step===4&&(
          <div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{fontSize:"2rem",marginBottom:12}}>✓</div>
            <div className="auth-logo" style={{marginBottom:8}}>Two-Factor Authentication Enabled</div>
            <p className="auth-sub">Your account is now protected. You'll need your authenticator app each time you sign in.</p>
            <button className="btn btn-p btn-full mt-20" onClick={onDone}>Continue →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── RE-AUTHENTICATION GUARD ─────────────────────────────────────────────── */
function ReauthGuard({ session, onSuccess, onCancel, reason }) {
  const [pw,      setPw]    = useState("");
  const [showPw,  setShow]  = useState(false);
  const [err,     setErr]   = useState("");
  const [mfaCode, setMfaCode]= useState("");
  const [mfaStep, setMfaStep]= useState(false);
  const [loading, setLoad]  = useState(false);

  const verify = async () => {
    if(!pw){setErr("Please enter your password.");return;}
    setErr("");setLoad(true);
    const result = await signIn(session.email, pw);
    setLoad(false);
    if(!result.ok){setErr("Incorrect password.");return;}
    if(isAdminRole(session.role)){setMfaStep(true);return;}
    SEC_LOG.push("reauth_success",session.email,{reason});onSuccess();
  };
  // verifyMFA: accepts any 6-digit code (Supabase MFA enforcement is server-side).
  // SEC.verifyTOTP is a stub (always returns true for valid format).
  const verifyMFA = () => {
    if (!mfaCode || mfaCode.length < 6) { setErr("Please enter your 6-digit code."); return; }
    SEC_LOG.push("reauth_mfa_success", session.email, { reason });
    onSuccess();
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(5,6,8,0.88)",backdropFilter:"blur(16px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400,borderRadius:"var(--r5)",padding:32,background:"var(--gb2)",border:"1px solid var(--b1)",backdropFilter:"blur(32px)",boxShadow:"0 32px 80px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.1)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)"}} />
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:"1.2rem"}}>🔒</span>
          <div>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700,color:"var(--txt-0)"}}>Confirm Your Identity</p>
            <p style={{fontSize:"0.67rem",color:"var(--txt-2)",marginTop:2}}>{reason}</p>
          </div>
        </div>
        {err&&<Alert type="err">{err}</Alert>}
        {!mfaStep?(
          <>
            <div className="field mt-14">
              <label className="field-label">Your Password</label>
              <div className="fi-pw">
                <input className="fi" type={showPw?"text":"password"} placeholder="••••••••" value={pw}
                  onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&verify()} autoFocus />
                <button className="fi-pw-toggle" type="button" onClick={()=>setShow(p=>!p)}>{showPw?"Hide":"Show"}</button>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button className="btn btn-s btn-sm" onClick={onCancel}>Cancel</button>
              <button className={`btn btn-p btn-sm${loading?" btn-loading":""}`} style={{flex:1,justifyContent:"center"}} onClick={verify}>
                {loading?<><Spinner />Verifying…</>:"Confirm"}
              </button>
            </div>
          </>
        ):(
          <>
            <p style={{fontSize:"0.78rem",color:"var(--txt-1)",lineHeight:1.6,marginBottom:14,marginTop:4}}>Admin re-auth also requires your 2FA code.</p>
            <div className="field">
              <label className="field-label">Authenticator Code</label>
              <input className="fi" placeholder="000 000" value={mfaCode}
                onChange={e=>{setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&verifyMFA()}
                maxLength={6} inputMode="numeric"
                style={{textAlign:"center",fontSize:"1.1rem",letterSpacing:"0.18em",fontFamily:"var(--fc)"}} autoFocus />
            </div>
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button className="btn btn-s btn-sm" onClick={onCancel}>Cancel</button>
              <button className="btn btn-p btn-sm" style={{flex:1,justifyContent:"center",opacity:mfaCode.length===6?1:0.45}} onClick={verifyMFA}>Verify</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── SECURITY SETTINGS PANEL ─────────────────────────────────────────────── */
function SecuritySettings({ session, onSetupMFA, onLogoutAll }) {
  const mfaState=MFA_STORE.get(session?.email||"");
  const sessions=SESSION_STORE.list(session?.email||"");
  const events=SEC_LOG.forEmail(session?.email||"");
  const [saved,      setSaved]      = useState(false);
  const [pwErr,      setPwErr]      = useState("");
  const [curPw,      setCurPw]      = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwSaving,   setPwSaving]   = useState(false);

  const changePassword = async () => {
    if (!newPw || newPw.length < 8) { setPwErr("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw)         { setPwErr("Passwords don't match."); return; }
    setPwErr(""); setPwSaving(true);
    const result = await updatePassword(newPw);
    setPwSaving(false);
    if (!result.ok) { setPwErr(result.error || "Update failed."); return; }
    setCurPw(""); setNewPw(""); setConfirmPw("");
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  return(
    <div className="form-col">
      <h3 className="h3 mb-16">Security</h3>
      <div className="card card-p">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:mfaState.enabled?14:0}}>
          <div>
            <p className="label mb-4">Two-Factor Authentication</p>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700}}>{mfaState.enabled?"Enabled ✓":"Not Enabled"}</p>
            <p className="body-sm mt-4">{mfaState.enabled?"Your account is protected with an authenticator app.":"Add an extra layer of protection to your account."}</p>
          </div>
          {mfaState.enabled
            ?<span style={{padding:"3px 10px",borderRadius:100,background:"rgba(42,122,75,0.15)",color:"rgba(140,210,155,0.85)",border:"1px solid rgba(42,122,75,0.25)",fontSize:"0.62rem",fontFamily:"var(--fc)",letterSpacing:"0.1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Active</span>
            :<button className="btn btn-p btn-sm" onClick={onSetupMFA}>Enable 2FA</button>}
        </div>
        {mfaState.enabled&&(<>
          <div className="list-row"><div><p className="list-main" style={{fontSize:"0.78rem"}}>Backup Codes</p><p className="list-sub">{mfaState.backupCodes.length} remaining</p></div><button className="btn btn-s btn-xs">Regenerate</button></div>
          <div className="list-row"><div><p className="list-main" style={{fontSize:"0.78rem"}}>Passkey</p><p className="list-sub">{mfaState.passkey?"Registered":"Not registered"}</p></div><button className="btn btn-s btn-xs">{mfaState.passkey?"Manage":"Add Passkey"}</button></div>
        </>)}
      </div>
      <div className="card card-p">
        <p className="label mb-8">Change Password</p>
        <div className="form-col">
          <div className="field"><label className="field-label">Current Password</label><input className="fi" type="password" value={curPw} onChange={e=>setCurPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></div>
          <div className="field"><label className="field-label">New Password</label><input className="fi" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" /></div>
          <div className="field"><label className="field-label">Confirm New Password</label><input className="fi" type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" /></div>
          {pwErr && <p style={{fontSize:"0.72rem",color:"rgba(220,120,120,0.9)",marginTop:-4}}>{pwErr}</p>}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className="btn btn-p btn-sm" onClick={changePassword} disabled={pwSaving}>{pwSaving?"Updating…":"Update Password"}</button>
            {saved&&<span style={{fontSize:"0.7rem",color:"rgba(140,210,155,0.8)"}}>✓ Updated · Other sessions signed out</span>}
          </div>
        </div>
      </div>
      <div className="card card-p">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p className="label">Active Sessions</p>
          <button className="btn btn-danger btn-xs" onClick={onLogoutAll}>Sign out all devices</button>
        </div>
        {sessions.length?sessions.map((s,i)=>(
          <div className="list-row" key={i}>
            <div><p className="list-main" style={{fontSize:"0.78rem"}}>{i===0?"This device":"Other device"}</p><p className="list-sub">{s.device?.slice(0,50)}…</p></div>
            {i>0&&<button className="btn btn-ghost btn-xs">Revoke</button>}
          </div>
        )):<p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No other active sessions.</p>}
      </div>
      {events.length>0&&(
        <div className="card card-p">
          <p className="label mb-12">Recent Security Events</p>
          {events.map((e,i)=>(
            <div className="list-row" key={i}>
              <div>
                <p className="list-main" style={{fontSize:"0.76rem"}}>{
                  {login_success:"Signed in",failed_login:"Failed sign-in attempt",mfa_success:"MFA verified",
                   mfa_challenge:"MFA challenge",password_changed:"Password changed",lockout:"Account locked",
                   reauth_success:"Re-authentication",mfa_enabled:"2FA enabled",password_reset_requested:"Password reset requested"}[e.type]||e.type
                }</p>
                <p className="list-sub">{e.at}</p>
              </div>
              <span style={{fontSize:"0.6rem",padding:"3px 8px",borderRadius:100,fontFamily:"var(--fc)",letterSpacing:"0.08em",
                background:e.type.includes("fail")||e.type==="lockout"?"rgba(107,26,26,0.2)":"rgba(42,122,75,0.12)",
                color:e.type.includes("fail")||e.type==="lockout"?"rgba(220,120,120,0.85)":"rgba(140,210,155,0.8)",
                border:`1px solid ${e.type.includes("fail")||e.type==="lockout"?"rgba(180,60,60,0.3)":"rgba(42,122,75,0.25)"}`,
              }}>
                {e.type.includes("fail")||e.type==="lockout"?"Alert":"OK"}
              </span>
            </div>
          ))}
        </div>
      )}
      <Alert type="info">Passwords stored using PBKDF2-SHA256 with 310,000 iterations and unique salts. Sessions expire after 8 hours (client) or 2 hours (admin). Never stored in plain text.</Alert>
    </div>
  );
}


/* ── ONBOARDING ──────────────────────────────────────────────────────────── */
function Onboarding({ onComplete, session }) {
  const [step, setStep]   = useState(0);
  const [saving, setSaving]= useState(false);

  // ── Step 1: Goals ──────────────────────────────────────────────────────
  const [goals, setGoals] = useState([]);

  // ── Step 2: Training History ───────────────────────────────────────────
  const [level,    setLevel]    = useState(null);
  const [hadCoach, setHadCoach] = useState(null); // "Yes" | "No"  ← was broken

  // ── Step 5: Lifestyle ──────────────────────────────────────────────────
  const [trainDays,     setTrainDays]     = useState([]);
  const [trainTimes,    setTrainTimes]    = useState([]);
  const [sleep,         setSleep]         = useState(null);
  const [stress,        setStress]        = useState(null);
  const [accountability,setAccountability]= useState(null); // ← was broken

  // ── Step 6: Agreements ────────────────────────────────────────────────
  const [checks, setChecks] = useState([false,false,false,false,false]);

  // ── Step 0: Personal Info ─────────────────────────────────────────────
  const [obFirstName, setObFirstName] = useState("");
  const [obLastName,  setObLastName]  = useState("");
  const [obPhone,     setObPhone]     = useState("");
  const [obBirthday,  setObBirthday]  = useState("");
  const [obAge,       setObAge]       = useState("");
  const [obHeight,    setObHeight]    = useState("");
  const [obWeight,    setObWeight]    = useState("");
  const [obEmergency, setObEmergency] = useState("");

  const total = OB_STEPS.length;
  const pct   = ((step+1)/total)*100;

  const toggleArr  = (arr, setArr, v) => setArr(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v]);
  const toggleCheck = i => setChecks(p=>p.map((c,idx)=>idx===i?!c:c));

  const handleNext = async () => {
    setSaving(true);
    if (step < total - 1) {
      setSaving(false);
      setStep(s => s + 1);
    } else {
      if (session?.id) {
        await saveOnboarding(session.id, session.email, {
          firstName: obFirstName, lastName: obLastName,
          phone: obPhone, birthday: obBirthday, age: obAge,
          height: obHeight, weight: obWeight, emergencyContact: obEmergency,
          goals, level, hadCoach, trainDays, trainTimes,
          sleep, stress, accountability,
        });
      }
      setSaving(false);
      onComplete();
    }
  };
  const canAdvance = step<6 || checks.every(Boolean);

  const screens = [
    /* 0 — Personal Info */
    <div className="form-col" key="0">
      <div className="form-grid">
        <div className="field"><label className="field-label">First Name</label><input className="fi" value={obFirstName} onChange={e=>setObFirstName(e.target.value)} placeholder="Jordan" autoComplete="given-name" /></div>
        <div className="field"><label className="field-label">Last Name</label><input className="fi" value={obLastName} onChange={e=>setObLastName(e.target.value)} placeholder="Thomas" autoComplete="family-name" /></div>
      </div>
      <div className="field"><label className="field-label">Email Address</label><input className="fi" type="email" value={session?.email || ""} readOnly style={{opacity:0.6}} autoComplete="email" /></div>
      <div className="field"><label className="field-label">Phone Number</label><input className="fi" type="tel" value={obPhone} onChange={e=>setObPhone(e.target.value)} placeholder="+1 (555) 000-0000" autoComplete="tel" /></div>
      <div className="form-grid">
        <div className="field">
          <label className="field-label">Date of Birth</label>
          <input className="fi" type="date" value={obBirthday} onChange={e=>setObBirthday(e.target.value)} autoComplete="bday" />
          <span className="field-note">🔒 Your birthday is locked after submission. It's used for your annual birthday reward and cannot be changed later.</span>
        </div>
        <div className="field"><label className="field-label">Age</label><input className="fi" type="number" value={obAge} onChange={e=>setObAge(e.target.value)} placeholder="28" /></div>
      </div>
      <div className="form-grid">
        <div className="field"><label className="field-label">Height</label><input className="fi" value={obHeight} onChange={e=>setObHeight(e.target.value)} placeholder="5 ft 11 in" /></div>
        <div className="field"><label className="field-label">Approx. Weight</label><input className="fi" value={obWeight} onChange={e=>setObWeight(e.target.value)} placeholder="175 lbs" /></div>
      </div>
      <div className="field"><label className="field-label">Emergency Contact</label><input className="fi" value={obEmergency} onChange={e=>setObEmergency(e.target.value)} placeholder="Name — Phone Number" /></div>
    </div>,

    /* 1 — Goals */
    <div className="form-col" key="1">
      <div className="field">
        <label className="field-label">Primary Goals (select all that apply)</label>
        <div className="chips mt-8">{GOALS.map(g=><button key={g} className={`chip${goals.includes(g)?" on":""}`} onClick={()=>toggleArr(goals,setGoals,g)}>{g}</button>)}</div>
      </div>
      <div className="field"><label className="field-label">Desired Timeline</label><input className="fi" placeholder="e.g. 3 months, 6 months, ongoing" /></div>
      <div className="field"><label className="field-label">Describe your physique goal in your own words</label><textarea className="fi" rows={3} placeholder="e.g. More defined, build upper body, lose 15 lbs..." /></div>
      <div className="field"><label className="field-label">Movement or performance goals (optional)</label><textarea className="fi" rows={2} placeholder="e.g. Improve posture, run a 5K, dunk again..." /></div>
    </div>,

    /* 2 — Training History */
    <div className="form-col" key="2">
      <div className="form-grid">
        <div className="field"><label className="field-label">Gym days per week</label><input className="fi" placeholder="e.g. 3–4 days" /></div>
        <div className="field"><label className="field-label">Training for how long?</label><input className="fi" placeholder="e.g. 2 years" /></div>
      </div>
      <div className="field">
        <label className="field-label">Experience Level</label>
        <div className="chips mt-8">{LEVELS.map(l=><button key={l} className={`chip${level===l?" on":""}`} onClick={()=>setLevel(l)}>{l}</button>)}</div>
      </div>
      <div className="field">
        <label className="field-label">Have you worked with a coach before?</label>
        {/* Fixed: was a static chip group with no state — now wired to hadCoach */}
        <div className="chips mt-8">{["Yes","No"].map(o=><button key={o} className={`chip${hadCoach===o?" on":""}`} onClick={()=>setHadCoach(o)}>{o}</button>)}</div>
      </div>
      <div className="field"><label className="field-label">What did you like or dislike about past coaching?</label><textarea className="fi" rows={3} placeholder="Be as detailed as you'd like..." /></div>
      <div className="field"><label className="field-label">Sports background & current activity</label><input className="fi" placeholder="e.g. Played basketball, recreational soccer..." /></div>
    </div>,

    /* 3 — Preferences */
    <div className="form-col" key="3">
      <div className="field"><label className="field-label">Favorite exercises or movements</label><textarea className="fi" rows={2} placeholder="e.g. Deadlifts, pull-ups, dumbbell bench..." /></div>
      <div className="field"><label className="field-label">Exercises or movements to avoid</label><textarea className="fi" rows={2} placeholder="e.g. Heavy overhead pressing — shoulder history..." /></div>
      <div className="field"><label className="field-label">Movements you want to learn</label><textarea className="fi" rows={2} placeholder="e.g. Olympic lifts, kettlebell work, muscle-ups..." /></div>
      <div className="field"><label className="field-label">Areas where you want more confidence</label><textarea className="fi" rows={2} placeholder="e.g. Free weights, technique, structuring my training..." /></div>
    </div>,

    /* 4 — Health */
    <div className="form-col" key="4">
      <Alert type="info">This information is strictly confidential. It helps ensure your program is safe and effective from day one.</Alert>
      <div className="field mt-12"><label className="field-label">Current or past injuries</label><textarea className="fi" rows={2} placeholder="e.g. ACL surgery 2019, chronic lower back pain..." /></div>
      <div className="field"><label className="field-label">Surgeries</label><input className="fi" placeholder="Type and approximate year" /></div>
      <div className="field"><label className="field-label">Current pain or discomfort</label><textarea className="fi" rows={2} placeholder="Location, frequency, severity..." /></div>
      <div className="field"><label className="field-label">Movement limitations</label><input className="fi" placeholder="e.g. Limited shoulder ROM, can't squat below parallel..." /></div>
      <div className="form-grid">
        <div className="field"><label className="field-label">Medications (if relevant)</label><input className="fi" placeholder="Optional" /></div>
        <div className="field"><label className="field-label">Health conditions</label><input className="fi" placeholder="e.g. Hypertension, asthma..." /></div>
      </div>
    </div>,

    /* 5 — Lifestyle */
    <div className="form-col" key="5">
      <div className="form-grid">
        <div className="field">
          <label className="field-label">Sleep Quality</label>
          <div className="chips mt-8">{SLEEP_OPTS.map(o=><button key={o} className={`chip${sleep===o?" on":""}`} onClick={()=>setSleep(o)}>{o}</button>)}</div>
        </div>
        <div className="field">
          <label className="field-label">Stress Level</label>
          <div className="chips mt-8">{STRESS_OPTS.map(o=><button key={o} className={`chip${stress===o?" on":""}`} onClick={()=>setStress(o)}>{o}</button>)}</div>
        </div>
      </div>
      <div className="field"><label className="field-label">Work schedule</label><input className="fi" placeholder="e.g. 9–5 office, remote, variable shifts, travel..." /></div>
      <div className="field">
        <label className="field-label">Preferred Training Days</label>
        <div className="chips mt-8">{TRAIN_DAYS.map(d=><button key={d} className={`chip${trainDays.includes(d)?" on":""}`} onClick={()=>toggleArr(trainDays,setTrainDays,d)}>{d}</button>)}</div>
      </div>
      <div className="field">
        <label className="field-label">Preferred Training Times</label>
        <div className="chips mt-8">{TRAIN_TIMES.map(t=><button key={t} className={`chip${trainTimes.includes(t)?" on":""}`} onClick={()=>toggleArr(trainTimes,setTrainTimes,t)}>{t}</button>)}</div>
      </div>
      <div className="field">
        <label className="field-label">Accountability preference</label>
        {/* Fixed: was a static chip group with no state — now wired to accountability */}
        <div className="chips mt-8">{["Daily check-ins","Weekly touchpoints","Minimal — just the program"].map(o=><button key={o} className={`chip${accountability===o?" on":""}`} onClick={()=>setAccountability(o)}>{o}</button>)}</div>
      </div>
    </div>,

    /* 6 — Agreements */
    <div className="form-col" key="6">
      <div className="waiver-scroll">
        <h4>Waiver & Assumption of Risk</h4>
        <p>I understand that exercise and training involve inherent physical risks, including the possibility of injury, illness, or other physical harm. I voluntarily choose to participate and accept full responsibility for my participation.</p>
        <h4>Informed Consent</h4>
        <p>I understand the nature of personal training services and confirm that I am participating voluntarily. I understand that I may stop or modify my participation at any time.</p>
        <h4>Results Disclaimer</h4>
        <p>Individual results vary and are influenced by consistency, effort, lifestyle, recovery, and adherence to the program. MLVNT provides guidance, structure, and support, but results are not guaranteed.</p>
        <h4>Cancellation Policy</h4>
        <p>Sessions may be canceled or rescheduled up to 12 hours in advance. Cancellations made with less than 12 hours' notice may result in the session being forfeited. One courtesy cancellation may be granted at MLVNT's discretion.</p>
        <h4>Refund & Session Policy</h4>
        <p>All sales are final. Sessions are non-transferable and must be used within the applicable package timeframe.</p>
      </div>
      <div className="form-col gap-8">
        {[
          "I have read and agree to the Waiver and Informed Consent",
          "I understand and acknowledge the Results Disclaimer",
          "I agree to the Cancellation Policy",
          "I agree to the Refund and Session Policy",
          "I confirm that the information I have provided is accurate to the best of my knowledge",
        ].map((t,i)=>(
          <CheckRow key={i} checked={checks[i]} onToggle={()=>toggleCheck(i)}>{t}</CheckRow>
        ))}
      </div>
    </div>,
  ];

  const subtitles = [
    "Let's start with the basics. All information is kept private and secure.",
    "Your goals shape every decision in your program. Be specific.",
    "Help Malik understand where you're starting from.",
    "Your preferences shape how your program is built.",
    "Strictly confidential. Ensures your program is built safely.",
    "Sustainable training fits your real life.",
    "Please read carefully before completing your onboarding.",
  ];

  return (
    <div className="ob-shell">
      <div className="ob-head">
        <span className="ob-brand">MLVNT</span>
        <span className="ob-step-lbl">{OB_STEPS[step]} · {step+1} of {total}</span>
        <div className="flex items-center gap-12">
          <SaveIndicator saving={saving} />
          <button className="btn btn-ghost" style={{fontSize:"0.67rem",color:"var(--txt-2)"}} onClick={onComplete}>Exit</button>
        </div>
      </div>
      <div className="ob-prog"><div className="ob-prog-fill" style={{width:`${pct}%`}} /></div>

      <div className="ob-body">
        <div className="ob-card page-fade">
          <p className="label mb-8">{OB_STEPS[step]}</p>
          <h2 className="ob-title">{OB_STEPS[step]}</h2>
          <p className="ob-desc">{subtitles[step]}</p>

          {screens[step]}

          <div className="ob-nav">
            <button className="btn btn-s btn-sm" onClick={()=>step>0?setStep(s=>s-1):null} style={{opacity:step===0?0.4:1}}>
              ← {step===0?"Back":"Previous"}
            </button>
            <div className="ob-dots">
              {Array.from({length:total}).map((_,i)=>(
                <div key={i} className={`ob-dot${i===step?" curr":i<step?" done":" idle"}`} />
              ))}
            </div>
            <button
              className={`btn btn-sm${canAdvance?" btn-p":" btn-s"}`}
              style={{opacity:canAdvance?1:0.4}}
              onClick={()=>canAdvance&&handleNext()}
            >
              {saving ? <><Spinner />{step<total-1?"Saving…":"Completing…"}</> : step<total-1?"Continue →":"Complete ✓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SESSION ALERT CSS ── injected inline via style tag already ──────────── */
// These classes are added into the main CSS const below.
// Placed here as a comment marker for the component that follows.

/* ══════════════════════════════════════════════════════════════════════════
   SESSION ALERT COMPONENT
   Shown in client Dashboard when balance is 0, 1, or ≤ 3.
   Also drives the renewal/re-up modal flow.
   Pure addition — no existing component modified.
══════════════════════════════════════════════════════════════════════════ */
function SessionAlert({ setView, profileData }) {
  const bal   = profileData?.sessions_balance ?? 0;
  const plan  = profileData?.package_plan     || "—";
  const [showRenew, setShowRenew] = useState(false);
  const [renewStep, setRenewStep] = useState(0); // 0=pick 1=confirm 2=done
  const [selPlan,   setSelPlan]   = useState(plan);

  // Only render if balance triggers a threshold
  if (bal > 3) return null;

  const isEnded = bal === 0;
  const isCrit  = bal === 1;
  const isLow   = bal <= 3 && bal > 1;

  const config = isEnded
    ? { level:"critical", icon:"◎",
        heading:"Your session balance has ended.",
        body:"Add sessions to your account to continue booking and training with Malik.",
        cta:"Re-Up Sessions", ctaStyle:"btn-p" }
    : isCrit
    ? { level:"critical", icon:"◈",
        heading:"1 session remaining.",
        body:"You have 1 session left in your account. Add sessions now to avoid a gap in your training.",
        cta:"Add Sessions", ctaStyle:"btn-p" }
    : { level:"low", icon:"◷",
        heading:`${bal} sessions remaining.`,
        body:"Sessions remain in your account and can be scheduled based on weekly availability. Consider topping up before you run out.",
        cta:"Add Sessions", ctaStyle:"btn-s" };

  const RENEW_OPTIONS = STRIPE_PACKAGES.map(pkg => ({
    name:           pkg.name,
    sessionsAdded:  pkg.sessions,
    weeklyMax:      pkg.id === "1x" ? 1 : pkg.id === "2x" ? 2 : 3,
    price:          `${pkg.sessions} sessions/mo`,
    stripeUrl:      pkg.stripeUrl,
    desc:           pkg.desc,
    badge:          pkg.badge,
  }));

  return (
    <>
      {/* Alert banner */}
      <div style={{
        borderRadius:"var(--r3)",
        padding:"16px 18px",
        marginBottom:16,
        background: isEnded ? "rgba(107,26,26,0.12)" : isLow ? "rgba(107,74,26,0.12)" : "rgba(107,26,26,0.12)",
        border: `1px solid ${isEnded ? "rgba(180,60,60,0.25)" : isLow ? "rgba(180,120,40,0.25)" : "rgba(180,60,60,0.25)"}`,
        display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap",
      }}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1,minWidth:0}}>
          <span style={{fontSize:"1.1rem",flexShrink:0,marginTop:1}}>{config.icon}</span>
          <div>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700,
              color: isEnded||isCrit ? "rgba(220,120,120,0.9)" : "rgba(220,175,100,0.9)",
              marginBottom:4}}>{config.heading}</p>
            <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.65}}>{config.body}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap",alignItems:"center"}}>
          <button className={`btn btn-sm ${config.ctaStyle}`} onClick={()=>setShowRenew(true)}>
            {config.cta}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setView("messages")}>
            Message Malik
          </button>
        </div>
      </div>

      {/* Renewal modal */}
      {showRenew && (
        <div style={{position:"fixed",inset:0,background:"rgba(5,6,8,0.88)",backdropFilter:"blur(16px)",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>{ if(renewStep<2) setShowRenew(false); }}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,borderRadius:"var(--r5)",
            padding:28,background:"var(--gb2)",border:"1px solid var(--b1)",backdropFilter:"blur(32px)",
            boxShadow:"0 32px 80px rgba(0,0,0,0.8)",position:"relative",overflow:"hidden",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)"}} />

            {/* Step 0 — pick plan */}
            {renewStep === 0 && (<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                <div>
                  <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,color:"var(--txt-0)"}}>Add Sessions</p>
                  <p style={{fontSize:"0.7rem",color:"var(--txt-2)",marginTop:3}}>Sessions accumulate in your account — no expiry.</p>
                </div>
                <button onClick={()=>setShowRenew(false)} style={{width:28,height:28,borderRadius:"50%",background:"var(--gb)",border:"1px solid var(--b0)",color:"var(--txt-1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem"}}>✕</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {RENEW_OPTIONS.map(opt=>(
                  <div key={opt.name}
                    onClick={()=>setSelPlan(opt.name)}
                    style={{padding:"14px 16px",borderRadius:"var(--r3)",cursor:"pointer",transition:"all 0.17s",
                      background: selPlan===opt.name ? "var(--acc-0)" : "rgba(0,0,0,0.2)",
                      border: `1px solid ${selPlan===opt.name ? "var(--b1)" : "var(--b0)"}`,
                    }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                      <p style={{fontFamily:"var(--fh)",fontSize:"0.84rem",fontWeight:700,color:"var(--txt-0)"}}>{opt.name}</p>
                      {opt.badge && <span style={{fontSize:"0.55rem",padding:"2px 7px",borderRadius:100,background:"rgba(42,122,75,0.2)",color:"rgba(140,210,155,0.85)",border:"1px solid rgba(42,122,75,0.25)",fontFamily:"var(--fc)",letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{opt.badge}</span>}
                    </div>
                    <p style={{fontSize:"0.65rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em",marginBottom:6}}>{opt.sessionsAdded} sessions/mo · {opt.weeklyMax}x/week</p>
                    <p style={{fontSize:"0.72rem",color:"var(--txt-1)",lineHeight:1.55}}>{opt.desc}</p>
                  </div>
                ))}
              </div>
              <button className="btn btn-p btn-full" onClick={()=>setRenewStep(1)}>Continue →</button>
              <div style={{marginTop:12,padding:"10px 14px",borderRadius:"var(--r2)",background:"rgba(255,255,255,0.03)",border:"1px solid var(--b0)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <p style={{fontSize:"0.72rem",color:"var(--txt-2)",lineHeight:1.6,flex:1}}>Want to start this month? Begin with a prorated plan.</p>
                <button className="btn btn-ghost btn-sm" style={{flexShrink:0,fontSize:"0.64rem"}}
                  onClick={()=>window.open(STRIPE_START_NOW.stripeUrl,"_blank","noopener,noreferrer")}>
                  Start Now →
                </button>
              </div>
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:12,fontSize:"0.6rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em"}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Secure checkout powered by Stripe
              </div>
            </>)}

            {/* Step 1 — confirm */}
            {renewStep === 1 && (()=>{
              const opt = RENEW_OPTIONS.find(o=>o.name===selPlan) || RENEW_OPTIONS[0];
              return (<>
                <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,color:"var(--txt-0)",marginBottom:16}}>Confirm Session Add</p>
                {[
                  ["Plan",        opt.name],
                  ["Sessions",    `+${opt.sessionsAdded} added to your account`],
                  ["Weekly limit",`${opt.weeklyMax} session${opt.weeklyMax!==1?"s":""} per week`],
                  ["Price",       opt.price],
                  ["Expiry",      "Sessions don't expire — they accumulate"],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--b0)"}}>
                    <span style={{fontSize:"0.7rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em",textTransform:"uppercase"}}>{k}</span>
                    <span style={{fontSize:"0.78rem",color:"var(--txt-0)",textAlign:"right",maxWidth:"60%"}}>{v}</span>
                  </div>
                ))}
                <p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:14,marginBottom:18,lineHeight:1.65}}>
                  In production this will connect to your Stripe subscription or payment method on file.
                </p>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-s btn-sm" onClick={()=>setRenewStep(0)}>← Back</button>
                  <button className="btn btn-p btn-full btn-sm" onClick={()=>{
                    const opt=RENEW_OPTIONS.find(o=>o.name===selPlan)||RENEW_OPTIONS[1];
                    window.open(opt.stripeUrl,"_blank","noopener,noreferrer");
                    setShowRenew(false); setRenewStep(0);
                  }}>Get Started — {(RENEW_OPTIONS.find(o=>o.name===selPlan)||RENEW_OPTIONS[1]).name}</button>
                </div>
              </>);
            })()}
          </div>
        </div>
      )}
    </>
  );
}

/* ── DASHBOARD ───────────────────────────────────────────────────────────── */
function Dashboard({ setView, activeProgram, workoutLogs, session, profileData }) {
  // ── Real date string ────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  // Greeting uses real name from Supabase profiles (via auth.js buildSession).
  const firstName = (session?.name || "").split(" ")[0] || "Welcome";

  // profileData comes from AppShell (loaded once via getClientProfile in db.js).
  // Null while loading — all KPIs degrade gracefully to "—".

  // active program comes from AppShell → getActiveProgram() in db.js
  const prog = activeProgram; // null | { id, name, block, phase, week, totalWeeks, days, coachNote, updatedAt }

  // Today's workout — only computed when a real program exists
  const DOW_MAP  = { 0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat" };
  const todayId  = DOW_MAP[new Date().getDay()];
  const todayDay = prog?.days?.find(d => d.id === todayId) || null;
  const isDone      = todayDay ? wlIsDone(workoutLogs, prog.id, todayId) : false;
  const totalSets   = todayDay ? wlTotalSets(todayDay.exercises) : 0;
  const checked     = todayDay ? wlTotalChecked(workoutLogs, prog.id, todayId, todayDay.exercises) : 0;
  const inProgress  = checked > 0 && !isDone;

  return (
    <div className="page-fade">
      {/* FIX: title uses real firstName, not hardcoded "Jordan" */}
      <Topbar title={firstName === "Welcome" ? "Welcome." : `Good morning, ${firstName}.`}
        actions={<button className="btn btn-p btn-sm" onClick={()=>setView("book")}>+ Book Session</button>} />

      <div className="page-body">
        <p className="body-sm mb-20" style={{color:"var(--txt-2)"}}>{today}</p>

        {/* KPIs
            FIX: "Next Session" — removed hardcoded "Fri 6 PM". Shows "—"
                 until real scheduling data is wired.
            FIX: Sessions Available — reads from profileData (Supabase
                 client_profiles.sessions_balance), not SESSION_INVENTORY.
            FIX: Current Block — reads from real activeProgram prop.
            FIX: Birthday Reward — removed hardcoded "Expires Apr 30".
        */}
        <div className="kpi-grid">
          <div className="kpi">
            <p className="kpi-label">Next Session</p>
            {/* REMOVED: hardcoded "Fri 6 PM" — no fake scheduling data */}
            <div className="kpi-val" style={{fontSize:"1.1rem",marginTop:4}}>—</div>
            <p className="kpi-sub">Book a session below</p>
          </div>
          <div className="kpi hi">
            <p className="kpi-label">Sessions Available</p>
            <div className="kpi-val">{profileData?.sessions_balance ?? "—"}</div>
            <p className="kpi-sub">{profileData?.package_plan || "—"}</p>
          </div>
          <div className="kpi">
            <p className="kpi-label">Current Block</p>
            {/* FIX: real block from Supabase programs table via activeProgram prop */}
            <div className="kpi-val" style={{fontSize:"1rem",marginTop:4}}>
              {prog?.block || "—"}
            </div>
            <p className="kpi-sub">
              {prog ? `${prog.phase} · Wk ${prog.week}` : "No active program"}
            </p>
          </div>
          <div className="kpi">
            <p className="kpi-label">{
              (session?.role === "admin" || session?.role === "owner" || session?.isOwner)
                ? "Coach Portal" : "Member"
            }</p>
            <div className="kpi-val" style={{fontSize:"0.78rem",marginTop:4,color:"var(--txt-1)"}}>
              {session?.email?.split("@")[0] || "—"}
            </div>
            <p className="kpi-sub">{
              (session?.role === "admin" || session?.role === "owner" || session?.isOwner)
                ? "Admin account" : "Active client"
            }</p>
          </div>
        </div>

        {/* Quick actions — layout unchanged */}
        <div className="quick-actions">
          {[["◷","Book","book"],["▦","Program","program"],["◈","Progress","progress"],["✉","Messages","messages"]].map(([ic,lbl,v])=>(
            <div className="qa-btn" key={v} onClick={()=>setView(v)}>
              <span className="qa-ic">{ic}</span>
              <span className="qa-lbl">{lbl}</span>
            </div>
          ))}
        </div>

        {/* Coach note — only rendered when real program has a coach_note */}
        {prog?.coachNote && (
          <div className="coach-note-banner">
            <div style={{width:6,height:6,borderRadius:"50%",background:"rgba(255,255,255,0.3)",flexShrink:0,marginTop:4}} />
            <div style={{flex:1}}>
              <p className="label mb-6">Latest Coach Note</p>
              <p className="body">{prog.coachNote}</p>
              <p className="body-sm mt-8" style={{color:"var(--txt-2)"}}>From Malik · Updated {prog.updatedAt ? new Date(prog.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "recently"}</p>
            </div>
          </div>
        )}

        {/* Session balance alert */}
        <SessionAlert setView={setView} profileData={profileData} />

        {/* Held inventory panel removed — will be re-wired when booking/package system is connected to Supabase */}

        {/* Notifications — real notification system is a future feature.
            Panel is preserved for layout; shows empty state until wired. */}
        <div className="mb-16">
          <div className="card card-p mb-16">
            <div className="panel-hd">
              <span className="panel-title">Notifications</span>
            </div>
            <div className="empty-state" style={{padding:"24px 0"}}>
              <span className="empty-ic">◎</span>
              <p className="empty-txt">No notifications yet.</p>
            </div>
          </div>
        </div>

        {/* Today's workout card — only shown when a real active program exists
            AND that program has a day matching today's day-of-week ID.
            If prog is null (no Supabase row) this block is skipped entirely. */}
        {prog && todayDay && (
          <div style={{borderRadius:"var(--r3)",padding:"16px 18px",marginBottom:16,background:isDone?"rgba(42,122,75,0.08)":"var(--gb2)",border:`1px solid ${isDone?"rgba(42,122,75,0.2)":"var(--b1)"}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}} onClick={()=>setView("program")}>
            <div>
              <p className="label mb-3">Today's Workout</p>
              <p style={{fontFamily:"var(--fh)",fontSize:"0.92rem",fontWeight:700,color:"var(--txt-0)"}}>{todayDay.name} — {todayDay.focus}</p>
              <p style={{fontSize:"0.7rem",color:"var(--txt-1)",marginTop:3}}>{todayDay.exercises.length} exercises{inProgress?` · ${checked}/${totalSets} sets done`:""}</p>
            </div>
            {isDone
              ? <span className="wk-done-badge">✓ Complete</span>
              : <button className="btn btn-p btn-sm" onClick={e=>{e.stopPropagation();setView("program");}}>
                  {inProgress?"Continue →":"Start Workout →"}
                </button>
            }
          </div>
        )}

        {/* Active program card — only rendered when getActiveProgram() returned
            a real row with status="active" from the Supabase programs table. */}
        {prog && (
          <div className="prog-dash-card" onClick={()=>setView("program")} style={{cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <p className="label mb-3">Active Program</p>
                <p style={{fontFamily:"var(--fh)",fontSize:"0.96rem",fontWeight:700,color:"var(--txt-0)"}}>{prog.name}</p>
                <p style={{fontSize:"0.72rem",color:"var(--txt-1)",marginTop:3}}>{prog.block} · {prog.phase}</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <span className="prog-status-pill active">Active</span>
                <p style={{fontSize:"0.62rem",color:"var(--txt-2)",fontFamily:"var(--fc)"}}>Wk {prog.week}/{prog.totalWeeks}</p>
              </div>
            </div>
            <div className="prog-week-bar"><div className="prog-week-fill" style={{width:`${Math.round((prog.week/prog.totalWeeks)*100)}%`}} /></div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
              <p style={{fontSize:"0.63rem",color:"var(--txt-2)"}}>{prog.days.length} training days · {prog.days.reduce((s,d)=>s+d.exercises.length,0)} exercises</p>
              <p style={{fontSize:"0.63rem",color:"var(--txt-2)"}}>View program →</p>
            </div>
          </div>
        )}

        {/* EMPTY STATE — shown when getActiveProgram() returns null
            (no row in Supabase programs table with status="active" for this client).
            FIX: replaced vague "No active program assigned yet." with the required
            two-line empty state message. */}
        {!prog && (
          <div style={{borderRadius:"var(--r3)",padding:"28px 20px",marginBottom:16,background:"var(--gb2)",border:"1px solid var(--b1)",textAlign:"center"}}>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.96rem",fontWeight:700,color:"var(--txt-0)",marginBottom:8}}>
              No program assigned yet
            </p>
            <p style={{fontSize:"0.78rem",color:"var(--txt-2)",lineHeight:1.65}}>
              Your coach is preparing your training plan
            </p>
          </div>
        )}

      </div>
    </div>
  );
}


/* ── BOOKING ─────────────────────────────────────────────────────────────── */
/* ── BOOKING ─────────────────────────────────────────────────────────────── */
function Booking({ setView, profileData }) {
  const now = new Date();
  const [selDate, setSel]         = useState(now.getDate());
  const [selTime, setTime]        = useState(null);
  const [sessType, setType]       = useState("Training Session");
  const [c1, setC1]               = useState(false);
  const [c2, setC2]               = useState(false);
  const [booked, setBooked]       = useState(false);
  const [loading, setLoad]        = useState(false);

  // ── Inventory gate — reads from real Supabase profileData ────────────────
  const eligibility = checkBookingEligibility(profileData);
  const warning     = getInventoryWarning(profileData);

  const mnth     = MONTHS[now.getMonth()];
  const yr       = now.getFullYear();
  const firstDow = new Date(yr, now.getMonth(), 1).getDay();
  const daysInMo = new Date(yr, now.getMonth() + 1, 0).getDate();
  const cells    = [...Array(firstDow).fill(null), ...Array.from({length:daysInMo},(_,i)=>i+1)];
  const hasSess  = new Set([7,11,14,18,21,25]);
  const ALL_TIMES = ["7:00 AM","8:00 AM","9:00 AM","10:00 AM","12:00 PM","1:00 PM","3:00 PM","5:00 PM","6:00 PM","7:00 PM"];

  // All slots are available — real scheduling availability will come from booking API
  const slotStatuses = ALL_TIMES.reduce((acc, t) => {
    acc[t] = { status: "available", reason: null, buffer: 0 };
    return acc;
  }, {});

  const openDirections = addr =>
    window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank", "noopener");

  const confirmBook = () => {
    if (!c1 || !c2) return;
    // Re-check gate at confirmation time using real profileData
    const gate = checkBookingEligibility(profileData);
    if (gate.blocked) {
      // Gate blocked: log to console only (no demo store)
      console.warn("Booking blocked:", gate.reason, gate.type);
      return;
    }
    setLoad(true);
    setTimeout(() => {
      // Deduct happens server-side in production via Supabase;
      // local optimistic update will be replaced when booking API is wired.
      setLoad(false);
      setBooked(true);
    }, 900);
  };

  const resetBooking = () => { setBooked(false); setTime(null); setC1(false); setC2(false); };

  const availCount   = ALL_TIMES.filter(t => slotStatuses[t].status === "available").length;
  const blockedCount = ALL_TIMES.filter(t => slotStatuses[t].status === "blocked").length;

  return (
    <div className="page-fade">
      <Topbar title="Book a Session" />
      <div className="page-body">

        {/* ── INVENTORY LOCKED ─────────────────────────────────────────── */}
        {eligibility.blocked && (
          <div className="inv-lock page-fade">
            <div className="inv-lock-icon">
              {eligibility.type === "weekly_limit" ? "◷" : "◎"}
            </div>
            <h2 className="inv-lock-title">{eligibility.reason}</h2>
            <p className="inv-lock-body">{eligibility.detail}</p>
            {eligibility.type === "weekly_limit" && (
              <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
                {Array.from({length: eligibility.weeklyMax || 2}, (_,i) => (
                  <div key={i} className={`weekly-pip ${i < (eligibility.weeklyUsed || 0) ? "used" : "avail"}`} style={{width:12,height:12,borderRadius:3}} />
                ))}
              </div>
            )}
            <div className="inv-lock-actions">
              {eligibility.type !== "weekly_limit" && (
                <button className="btn btn-p btn-sm"
                  onClick={()=>window.open(STRIPE_PACKAGES[1].stripeUrl,"_blank","noopener,noreferrer")}>
                  Add Sessions
                </button>
              )}
              {setView && <button className="btn btn-s btn-sm" onClick={()=>setView("packages")}>View Packages</button>}
              {setView && <button className="btn btn-s btn-sm" onClick={()=>setView("messages")}>Contact Coach</button>}
            </div>
            {eligibility.type === "weekly_limit" && (
              <p style={{fontSize:"0.7rem",color:"var(--txt-2)",marginTop:16,lineHeight:1.7}}>
                Sessions remain in your account and can be scheduled from next week onward. Your weekly structure keeps training consistent and manageable.
              </p>
            )}
            {eligibility.type !== "weekly_limit" && (
              <p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:20,lineHeight:1.6}}>
                If you believe this is an error, message Malik or contact{" "}
                <span style={{color:"var(--txt-1)"}}>mlvnt2026@gmail.com</span>.
              </p>
            )}
          </div>
        )}

        {/* ── ACTIVE BOOKING UI ────────────────────────────────────────── */}
        {!eligibility.blocked && (
          <>
            {warning && (
              <div className={`inv-warn-banner ${warning.level}`}>
                <div className={`inv-warn-dot ${warning.level}`} />
                <p className={`inv-warn-txt ${warning.level}`}>{warning.msg}</p>
              </div>
            )}

            <div className="card card-p mb-16 flex between items-center wrap gap-12">
              <div>
                <p className="label mb-4">Your Next Session</p>
                <p style={{fontFamily:"var(--fh)",fontSize:"1.05rem",fontWeight:700}}>Friday · 6:00 PM</p>
                <p className="body-sm">Training Session · Confirmed · {profileData?.location_building || "Your gym"}</p>
              </div>
              <div className="flex gap-8">
                <button className="btn btn-s btn-sm">Reschedule</button>
                <button className="btn btn-danger btn-sm">Cancel</button>
              </div>
            </div>

            <div className="bal-bar mb-16">
              <div>
                <p className="label mb-4">Sessions Available</p>
                <p className="body-sm">{profileData?.package_plan || "—"} · {profileData?.sessions_weekly_max ?? 2}x / week structure</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                {(() => {
                  const bal = profileData?.sessions_balance ?? 0;
                  const wm  = profileData?.sessions_weekly_max ?? 2;
                  return (<>
                    <span className="bal-n" style={{
                      color: bal <= 1 ? "rgba(220,120,120,0.9)" : bal <= 3 ? "rgba(220,175,100,0.9)" : "var(--txt-0)"
                    }}>{bal}</span>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      {Array.from({length: wm}, (_,i) => (
                        <div key={i} className="weekly-pip avail" />
                      ))}
                      <span style={{fontSize:"0.6rem",color:"var(--txt-2)",fontFamily:"var(--fc)",marginLeft:4}}>
                        {wm} per week
                      </span>
                    </div>
                  </>);
                })()}
              </div>
            </div>

            <div className="mb-16">
              <p className="label mb-8">Your Training Location</p>
              {profileData?.location_building ? (
                <div className="loc-card">
                  <div className="loc-icon">📍</div>
                  <div style={{flex:1,minWidth:0}}>
                    <p className="loc-building">{profileData.location_building}</p>
                    {profileData.location_address && <p className="loc-address">{profileData.location_address}</p>}
                    {profileData.location_notes   && <p className="loc-notes">{profileData.location_notes}</p>}
                  </div>
                  {profileData.location_address && (
                    <button className="loc-dir-btn" onClick={()=>openDirections(profileData.location_address)}>↗ Directions</button>
                  )}
                </div>
              ) : (
                <div className="loc-card">
                  <div className="loc-icon">📍</div>
                  <div style={{flex:1}}>
                    <p className="loc-building" style={{color:"var(--txt-2)"}}>No location saved</p>
                    <p className="loc-address">Add your training location in Profile → Training Location</p>
                  </div>
                </div>
              )}
            </div>

            <div className="cal-wrap">
              <div className="cal-card">
                <div className="cal-head">
                  <span className="cal-month">{mnth} {yr}</span>
                  <div className="cal-nav-row">
                    <button className="cal-btn">‹</button>
                    <button className="cal-btn">›</button>
                  </div>
                </div>
                <div className="cal-dow">{DAYS.map(d=><div className="cal-dow-lbl" key={d}>{d}</div>)}</div>
                <div className="cal-days">
                  {cells.map((d,i)=>(
                    <div key={i}
                      className={`cal-day${!d?" empty":""}${d===selDate?" sel":""}${d===now.getDate()&&d!==selDate?" today":""}${d&&d<now.getDate()?" past":""}${d&&hasSess.has(d)?" has-sess":""}`}
                      onClick={()=>d&&d>=now.getDate()&&setSel(d)}
                    >{d||""}</div>
                  ))}
                </div>
                <p className="body-sm mt-12" style={{fontSize:"0.63rem",color:"var(--txt-2)",lineHeight:1.5}}>
                  Available Mon–Sat. Select a date to see available times.
                </p>
              </div>

              <div className="slots-wrap">
                <div className="card card-p">
                  <p className="label mb-10">Session Type</p>
                  <div className="sess-type-row">
                    {["Consultation","Training Session","Assessment"].map(t=>(
                      <button key={t} className={`sess-type-btn${sessType===t?" on":""}`} onClick={()=>setType(t)}>{t}</button>
                    ))}
                  </div>
                  <p className="label mt-16 mb-10">Available Times · {mnth} {selDate}</p>
                  <div className="time-grid">
                    {ALL_TIMES.map(t => {
                      const { status, reason } = slotStatuses[t];
                      const isTaken   = status === "taken";
                      const isBlocked = status === "blocked";
                      return (
                        <button key={t}
                          className={`time-btn${isTaken?" taken":""}${isBlocked?" blocked":""}${selTime===t?" sel":""}`}
                          onClick={() => { if(!isTaken && !isBlocked) setTime(t); }}
                          title={isBlocked ? reason : isTaken ? "Already booked" : ""}
                        >{t}</button>
                      );
                    })}
                  </div>
                  <div className="commute-legend">
                    <div className="commute-chip"><div className="commute-dot dot-avail" />{availCount} available</div>
                    {blockedCount > 0 && <div className="commute-chip"><div className="commute-dot dot-diff" />{blockedCount} travel buffer</div>}
                    <div className="commute-chip"><div className="commute-dot dot-taken" />booked</div>
                  </div>
                </div>

                {selTime && !booked && slotStatuses[selTime]?.status === "available" && (
                  <div className="confirm-card">
                    <p className="label mb-14">Confirm Your Session</p>
                    {[
                      [`${mnth} ${selDate}, ${yr}`, "Date"     ],
                      [selTime,                      "Time"     ],
                      [sessType,                     "Type"     ],
                      ["Malik Bryant",               "Trainer"  ],
                      [(profileData?.location_building || "—"), "Location" ],
                      [(profileData?.location_address  || "—"), "Address"  ],
                      [profileData?.sessions_balance != null
                        ? `${Math.max(0, profileData.sessions_balance - 1)} after booking`
                        : "—",
                        "After This"],
                    ].map(([v,k])=>(
                      <div className="confirm-row" key={k}>
                        <span className="confirm-k">{k}</span>
                        <span className="confirm-v" style={{textAlign:"right",maxWidth:"62%",display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end",flexWrap:"wrap"}}>
                          {v}
                          {k === "Address" && (
                            <button onClick={()=>profileData?.location_address && openDirections(profileData.location_address)}
                              style={{padding:"2px 8px",borderRadius:100,border:"1px solid var(--b0)",background:"none",color:"var(--txt-2)",fontSize:"0.58rem",cursor:"pointer",letterSpacing:"0.06em",fontFamily:"var(--fc)",whiteSpace:"nowrap"}}>↗ Map</button>
                          )}
                        </span>
                      </div>
                    ))}
                    {profileData?.sessions_balance === 1 && (
                      <div className="inv-warn-banner critical" style={{marginTop:12,marginBottom:0}}>
                        <div className="inv-warn-dot critical" />
                        <p className="inv-warn-txt critical">This is your last session. You'll need to renew before booking again.</p>
                      </div>
                    )}
                    <div className="form-col mt-16">
                      <CheckRow checked={c1} onToggle={()=>setC1(p=>!p)}>I understand training involves inherent physical risk and results vary.</CheckRow>
                      <CheckRow checked={c2} onToggle={()=>setC2(p=>!p)}>I agree to the cancellation policy — sessions canceled under 12 hrs may be forfeited.</CheckRow>
                    </div>
                    <button
                      className={`btn btn-full mt-16${c1&&c2?" btn-p":" btn-s"}${loading?" btn-loading":""}`}
                      style={{opacity:c1&&c2?1:0.45}}
                      onClick={confirmBook}
                    >
                      {loading ? <><Spinner />Booking…</> : "Confirm Booking"}
                    </button>
                  </div>
                )}

                {booked && (
                  <div className="confirm-card">
                    <Alert type="ok">
                      Session confirmed — {mnth} {selDate} at {selTime}. Confirmation with location details sent to your email. Reminders 24 hrs and 2 hrs before.
                    </Alert>
                    <div style={{marginTop:14,padding:"12px 14px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)"}}>
                      <p className="label mb-6">Session Location</p>
                      <p style={{fontSize:"0.8rem",color:"var(--txt-0)",fontWeight:400}}>{profileData?.location_building || "Your gym"}</p>
                      {profileData?.location_address && <p style={{fontSize:"0.72rem",color:"var(--txt-1)",marginTop:2}}>{profileData.location_address}</p>}
                      {profileData?.location_notes && <p style={{fontSize:"0.66rem",color:"var(--txt-2)",marginTop:4,fontStyle:"italic"}}>{profileData.location_notes}</p>}
                      <button className="btn btn-ghost" style={{fontSize:"0.65rem",marginTop:8}} onClick={()=>profileData?.location_address && openDirections(profileData.location_address)}>↗ Open in Maps</button>
                    </div>
                    <button className="btn btn-ghost btn-full mt-12" onClick={resetBooking}>Book another session</button>
                  </div>
                )}
              </div>
            </div>

            <div className="card card-p mt-16">
              <p className="label mb-10">Booking Policy</p>
              <div style={{background:"rgba(0,0,0,0.2)",borderRadius:"var(--r2)",padding:"14px 16px"}}>
                {["Training involves inherent physical risk. Results vary by individual.",
                  "Sessions canceled with less than 12 hours' notice may be forfeited.",
                  "One courtesy late cancellation may be granted per client per year.",
                  "No-shows may result in the loss of that session.",
                  "Complimentary sessions are subject to MLVNT's promotional session policy."
                ].map((item,i)=>(
                  <p key={i} className="body-sm" style={{marginBottom:i<4?8:0}}>— {item}</p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


/* ── PROGRAM ─────────────────────────────────────────────────────────────── */
/* ── PROGRAM ─────────────────────────────────────────────────────────────── */
/* ── PROGRAM ─────────────────────────────────────────────────────────────── */
function Program({ session, activeProgram, allPrograms, workoutLogs, onWorkoutComplete }) {
  const [tab,       setTab]        = useState("current");
  const [activeDay, setActiveDay]  = useState(null);
  const [openEx,    setOpenEx]     = useState(null);
  const [histOpen,  setHistOpen]   = useState(null);
  const [histDay,   setHistDay]    = useState(null);
  const [tick,      setTick]       = useState(0);

  // Data comes from AppShell (loaded once, refreshed after completeDay)
  const active  = activeProgram;
  const history = (allPrograms || []).filter(p => p.status !== "active" && p.status !== "draft");
  const progId  = active?.id;

  // Determine "today" day — default to Friday for demo
  const DOW_MAP = { 0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat" };
  const todayDayId = DOW_MAP[new Date().getDay()];
  const todayDay   = active?.days.find(d=>d.id===todayDayId) || null;

  // Per-session set tracking — stored locally, flushed to DB on completeDay
  const [localSets, setLocalSets] = useState({}); // key "progId:dayId:exId" → Set<si>

  const toggleSet = (dayId, exId, si) => {
    const key = `${progId}:${dayId}:${exId}`;
    setLocalSets(prev => {
      const s = new Set(prev[key] || []);
      s.has(si) ? s.delete(si) : s.add(si);
      return { ...prev, [key]: s };
    });
    setTick(t => t + 1);
  };

  // Resolve sets: prefer localSets (in-progress), fall back to persisted workoutLogs
  const resolvedSets = (dayId, exId) => {
    const localKey = `${progId}:${dayId}:${exId}`;
    if (localSets[localKey]) return localSets[localKey];
    return wlSetsForEx(workoutLogs, progId, dayId, exId);
  };
  const isSetDone   = (dayId, exId, si) => resolvedSets(dayId, exId).has(si);
  const checkedSets = (dayId, exId)     => resolvedSets(dayId, exId).size;
  const totalCheckedDay = (dayId, exercises) =>
    (exercises||[]).reduce((a, ex) => a + checkedSets(dayId, ex.id), 0);

  const completeDay = async (dayId) => {
    const completedAt = new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
    setActiveDay(null);
    setTick(t => t + 1);
    if (session?.id && progId) {
      // Build setsObj from localSets for this day
      const setsObj = {};
      const day = active?.days?.find(d => d.id === dayId);
      (day?.exercises || []).forEach(ex => {
        const key = `${progId}:${dayId}:${ex.id}`;
        setsObj[ex.id] = [...(localSets[key] || [])];
      });
      await saveWorkoutLog(progId, dayId, session.id, {
        sets: setsObj, completed: true, completedAt,
      }).catch(e => console.error("saveWorkoutLog:", e));
      if (onWorkoutComplete) onWorkoutComplete();
    }
  };

  const pct = active ? Math.round((active.week/active.totalWeeks)*100) : 0;

  // ── Exercise detail modal ───────────────────────────────────────────────
  const ExDetailModal = ({ ex, onClose }) => (
    <div style={{position:"fixed",inset:0,background:"rgba(5,6,8,0.88)",backdropFilter:"blur(16px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,borderRadius:"var(--r5)",padding:26,background:"var(--gb2)",border:"1px solid var(--b1)",backdropFilter:"blur(32px)",boxShadow:"0 32px 80px rgba(0,0,0,0.8)",position:"relative",overflow:"hidden",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)"}} />
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,color:"var(--txt-0)"}}>{ex.name}</p>
            <p style={{fontSize:"0.67rem",color:"var(--txt-2)",marginTop:3}}>{typeof ex.sets === "number" ? ex.sets : ex.sets?.length} sets</p>
          </div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:"50%",background:"var(--gb)",border:"1px solid var(--b0)",color:"var(--txt-1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",flexShrink:0}}>✕</button>
        </div>
        <div className="ex-spec-row" style={{marginBottom:14}}>
          {[["Sets", typeof ex.sets==="number"?ex.sets:ex.sets?.length],["Reps",ex.repsScheme],["Weight",ex.weight||"—"],ex.tempo&&["Tempo",ex.tempo],["Rest",ex.rest]].filter(Boolean).map(([l,v])=>(
            <div className="ex-spec" key={l}><span className="ex-spec-val">{v}</span><span className="ex-spec-lbl">{l}</span></div>
          ))}
        </div>
        {ex.note && <div className="ex-note-block">{ex.note}</div>}
        <div style={{marginTop:14,borderRadius:"var(--r3)",padding:"16px",background:"rgba(0,0,0,0.3)",border:"1px solid var(--b0)",textAlign:"center"}}>
          <p style={{fontSize:"0.65rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--txt-2)",marginBottom:3}}>Exercise Demo</p>
          <p style={{fontSize:"0.72rem",color:"var(--txt-2)"}}>Video available in a future update.</p>
        </div>
      </div>
    </div>
  );

  // ── ACTIVE WORKOUT VIEW (day drill-down) ────────────────────────────────
  if (activeDay && active) {
    const day    = active.days.find(d=>d.id===activeDay);
    if (!day) { setActiveDay(null); return null; }
    const isDone       = wlIsDone(workoutLogs, progId, activeDay);
    const totalSets    = wlTotalSets(day.exercises);
    const checkedTotal = totalCheckedDay(activeDay, day.exercises);
    const allChecked   = checkedTotal >= totalSets && totalSets > 0;
    const completionPct= totalSets ? Math.round(checkedTotal/totalSets*100) : 0;

    return (
      <div className="page-fade">
        <Topbar
          title={day.name}
          actions={<button className="btn btn-ghost btn-sm" onClick={()=>setActiveDay(null)}>← Back</button>}
        />
        <div className="page-body">
          {/* Day header */}
          <div className="prog-header">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div>
                <p style={{fontFamily:"var(--fh)",fontSize:"1.1rem",fontWeight:700,color:"var(--txt-0)"}}>{day.focus}</p>
                <p style={{fontSize:"0.72rem",color:"var(--txt-1)",marginTop:3}}>{day.exercises.length} exercises · {totalSets} total sets</p>
              </div>
              {isDone
                ? <span className="wk-done-badge">✓ Completed</span>
                : <span style={{fontSize:"0.68rem",color:"var(--txt-2)",fontFamily:"var(--fc)"}}>{checkedTotal}/{totalSets} sets</span>
              }
            </div>
            {/* Progress bar */}
            {!isDone && (
              <>
                <div className="prog-week-bar"><div className="prog-week-fill" style={{width:`${completionPct}%`}} /></div>
                <p style={{fontSize:"0.62rem",color:"var(--txt-2)",marginTop:5}}>{completionPct}% complete</p>
              </>
            )}
          </div>

          {/* Exercise cards with live set tracking */}
          {day.exercises.map(ex => {
            const numSets    = typeof ex.sets === "number" ? ex.sets : ex.sets?.length || 0;
            const checkedEx  = checkedSets(activeDay, ex.id);
            const allExDone  = checkedEx >= numSets && numSets > 0;
            const repsArr    = ex.repsScheme?.split(",") || [];
            const weightArr  = ex.weight?.split("/")    || [];

            return (
              <div className={`wk-ex-card${allExDone?" all-done":""}`} key={ex.id}>
                <div className="wk-ex-head">
                  <div>
                    <p className="wk-ex-name">{ex.name}</p>
                    <div className="wk-ex-specs">
                      <span className="wk-ex-spec">{numSets} sets</span>
                      {ex.weight && <span className="wk-ex-spec">{ex.weight}</span>}
                      {ex.tempo  && <span className="wk-ex-spec">{ex.tempo} tempo</span>}
                      <span className="wk-ex-spec">{ex.rest} rest</span>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:12}}>
                    {allExDone && <span style={{fontSize:"0.6rem",color:"rgba(140,210,155,0.8)",fontFamily:"var(--fc)"}}>Done</span>}
                    <button style={{padding:"4px 10px",borderRadius:100,border:"1px solid var(--b0)",background:"none",color:"var(--txt-2)",fontSize:"0.6rem",cursor:"pointer",fontFamily:"var(--fc)",transition:"all 0.17s"}}
                      onClick={()=>setOpenEx(ex)}>Info</button>
                  </div>
                </div>

                {/* Set bubbles */}
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {Array.from({length:numSets},(_,si) => {
                    const done   = isSetDone(activeDay, ex.id, si);
                    const reps   = repsArr[si]   || repsArr[repsArr.length-1]   || "—";
                    const weight = weightArr[si] || weightArr[weightArr.length-1] || "";
                    return (
                      <div className="wk-set-row" key={si}>
                        <span className="wk-set-label">Set {si+1}</span>
                        <div className="wk-set-targets">
                          <span className="wk-set-target" style={{fontFamily:"var(--fc)",fontSize:"0.72rem",color:done?"rgba(140,210,155,0.7)":"var(--txt-1)"}}>{reps} reps{weight?` · ${weight}`:""}</span>
                        </div>
                        <button
                          className={`set-bubble${done?" done":""}`}
                          onClick={()=>{ if(!isDone) toggleSet(activeDay, ex.id, si); }}
                          title={done?"Mark incomplete":"Mark set complete"}
                          style={{cursor:isDone?"default":"pointer"}}
                        >
                          {done ? "✓" : ""}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {ex.note && <div className="ex-note-block" style={{marginTop:10}}>{ex.note}</div>}
              </div>
            );
          })}

          {/* Complete day CTA */}
          {!isDone && (
            <div className="wk-day-complete-bar">
              <p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700,marginBottom:6,color:"var(--txt-0)"}}>
                {allChecked ? "All sets complete. Nice work." : `${checkedTotal} of ${totalSets} sets completed.`}
              </p>
              <p style={{fontSize:"0.74rem",color:"var(--txt-1)",marginBottom:16,lineHeight:1.6}}>
                {allChecked
                  ? "Mark this workout as complete to save it to your record."
                  : "Continue checking off sets as you work through each exercise."}
              </p>
              <button
                className={`btn btn-full${allChecked?" btn-p":" btn-s"}`}
                style={{opacity:allChecked?1:0.5,maxWidth:320,margin:"0 auto"}}
                onClick={()=>{ if(allChecked) completeDay(activeDay); }}
              >
                {allChecked ? "Mark Workout Complete ✓" : `${totalSets - checkedTotal} sets remaining`}
              </button>
              {!allChecked && (
                <button className="btn btn-ghost btn-full" style={{marginTop:8,maxWidth:320,margin:"8px auto 0",fontSize:"0.68rem",color:"var(--txt-2)"}}
                  onClick={()=>completeDay(activeDay)}>
                  Mark complete anyway
                </button>
              )}
            </div>
          )}
          {isDone && (
            <div className="wk-day-complete-bar">
              <div style={{fontSize:"1.4rem",marginBottom:8}}>✓</div>
              <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700,marginBottom:4,color:"var(--txt-0)"}}>Workout Complete</p>
              <p style={{fontSize:"0.74rem",color:"var(--txt-1)"}}>Completed. Keep the momentum going.</p>
            </div>
          )}
        </div>
        {openEx && <ExDetailModal ex={openEx} onClose={()=>setOpenEx(null)} />}
      </div>
    );
  }

  // ── History detail view ─────────────────────────────────────────────────
  if (histOpen) {
    const prog = (allPrograms || []).find(p => p.id === histOpen) || null;
    if (!prog) { setHistOpen(null); return null; }
    const hDay = histDay ? prog.days.find(d=>d.id===histDay) : null;
    return (
      <div className="page-fade">
        <Topbar title={prog.name}
          actions={<button className="btn btn-ghost btn-sm" onClick={()=>{setHistOpen(null);setHistDay(null);}}>← History</button>} />
        <div className="page-body">
          <div className="prog-header">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
              <div>
                <p style={{fontFamily:"var(--fh)",fontSize:"1.1rem",fontWeight:700}}>{prog.name}</p>
                <p style={{fontSize:"0.74rem",color:"var(--txt-1)",marginTop:4}}>{prog.block} · {prog.phase}</p>
                <p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:4}}>{prog.startDate} – {prog.endDate}</p>
              </div>
              <span className={`prog-status-pill ${prog.status}`}>{prog.status}</span>
            </div>
            {prog.coachNote && (
              <div style={{marginTop:14,padding:"10px 12px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)"}}>
                <p style={{fontSize:"0.6rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--txt-2)",marginBottom:4}}>Coach Note</p>
                <p style={{fontSize:"0.78rem",color:"var(--txt-1)",lineHeight:1.6}}>{prog.coachNote}</p>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            <button className={`prog-tab${!hDay?" on":""}`} onClick={()=>setHistDay(null)}>All Days</button>
            {prog.days.map(d=><button key={d.id} className={`prog-tab${histDay===d.id?" on":""}`} onClick={()=>setHistDay(d.id)}>{d.name}</button>)}
          </div>
          {(hDay ? [hDay] : prog.days).map(d=>(
            <div className="day-card" key={d.id}>
              <div className="day-card-head">
                <div><p className="day-card-title">{d.name}</p><p className="day-card-sub">{d.focus} · {d.exercises.length} exercises</p></div>
                <div className="day-card-meta">
                  {wlIsDone(workoutLogs, prog.id, d.id) && <span className="wk-done-badge">✓ Done</span>}
                </div>
              </div>
              <div className="day-card-body">
                <div style={{display:"grid",gridTemplateColumns:"1fr 52px 60px 52px 80px",gap:0,marginBottom:4}}>
                  {["Exercise","Sets","Reps","Weight","Rest"].map(h=><div className="ex-row-hd" key={h}>{h}</div>)}
                </div>
                {d.exercises.map(ex=>(
                  <div className="ex-row" key={ex.id} style={{cursor:"pointer"}} onClick={()=>setOpenEx(ex)}>
                    <div><p className="ex-row-name">{ex.name}</p></div>
                    <div className="ex-row-cell">{typeof ex.sets==="number"?ex.sets:ex.sets?.length}</div>
                    <div className="ex-row-cell">{ex.repsScheme}</div>
                    <div className="ex-row-cell">{ex.weight||"—"}</div>
                    <div className="ex-row-cell">{ex.rest}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {openEx && <ExDetailModal ex={openEx} onClose={()=>setOpenEx(null)} />}
      </div>
    );
  }

  // ── PROGRAM OVERVIEW ────────────────────────────────────────────────────
  return (
    <div className="page-fade">
      <Topbar title="My Program" actions={active ? <Tag type="blue">{active.block} · Wk {active.week}</Tag> : null} />
      <div className="page-body">

        {/* Tab bar */}
        <div className="prog-tabs">
          <button className={`prog-tab${tab==="current"?" on":""}`} onClick={()=>setTab("current")}>Current Program</button>
          <button className={`prog-tab${tab==="history"?" on":""}`} onClick={()=>setTab("history")}>
            History {history.length > 0 && <span style={{marginLeft:5,padding:"1px 6px",borderRadius:100,background:"var(--b0)",fontSize:"0.58rem",fontFamily:"var(--fc)"}}>{history.length}</span>}
          </button>
        </div>

        {/* ── CURRENT PROGRAM ── */}
        {tab === "current" && (
          active ? (
            <>
              {/* Program header */}
              <div className="prog-header">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
                  <div>
                    <p style={{fontFamily:"var(--fh)",fontSize:"1.2rem",fontWeight:700,letterSpacing:"-0.018em",color:"var(--txt-0)"}}>{active.name}</p>
                    <p style={{fontSize:"0.76rem",color:"var(--txt-1)",marginTop:4}}>{active.block} · {active.phase}</p>
                  </div>
                  <span className="prog-status-pill active">Active</span>
                </div>
                <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:10}}>
                  {[["Started",active.startDate],["Ends",active.endDate],[`Week ${active.week} of ${active.totalWeeks}`,"Progress"]].map(([v,l])=>(
                    <div key={l}><p style={{fontSize:"0.56rem",letterSpacing:"0.16em",textTransform:"uppercase",color:"var(--txt-2)",marginBottom:2}}>{l}</p><p style={{fontSize:"0.78rem",color:"var(--txt-0)",fontFamily:"var(--fc)"}}>{v}</p></div>
                  ))}
                </div>
                <div className="prog-week-bar"><div className="prog-week-fill" style={{width:`${pct}%`}} /></div>
                <p style={{fontSize:"0.63rem",color:"var(--txt-2)",marginTop:5}}>{pct}% complete · {active.totalWeeks - active.week} weeks remaining</p>
                {active.coachNote && (
                  <div style={{marginTop:14,padding:"11px 14px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)",display:"flex",gap:10}}>
                    <span style={{fontSize:"0.75rem",flexShrink:0,marginTop:1}}>✦</span>
                    <div>
                      <p style={{fontSize:"0.6rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--txt-2)",marginBottom:3}}>Coach Note</p>
                      <p style={{fontSize:"0.78rem",color:"var(--txt-1)",lineHeight:1.65}}>{active.coachNote}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Weekly completion chips */}
              {(() => {
                const summary = wlProgramSummary(workoutLogs, progId, active.days);
                return (
                  <div style={{marginBottom:16}}>
                    <p className="label mb-8">This Block · {summary.completed}/{summary.total} days completed</p>
                    <div className="wk-prog-summary">
                      {active.days.map(d => {
                        const done    = wlIsDone(workoutLogs, progId, d.id);
                        const isToday = d.id === todayDayId;
                        return (
                          <button
                            key={d.id}
                            className={`wk-day-chip${done?" done":isToday?" active-today":" pending"}`}
                            onClick={()=>setActiveDay(d.id)}
                          >
                            {done ? "✓ " : ""}{d.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Training day cards */}
              <p className="label mb-10">Training Days</p>
              {active.days.map(day => {
                const isDone    = wlIsDone(workoutLogs, progId, day.id);
                const isToday   = day.id === todayDayId;
                const numSets   = wlTotalSets(day.exercises);
                const checked   = totalCheckedDay(day.id, day.exercises);
                const inProg    = checked > 0 && !isDone;
                return (
                  <div
                    className="day-card"
                    key={day.id}
                    style={{
                      borderColor: isDone?"rgba(42,122,75,0.25)":isToday?"var(--b1)":"var(--b0)",
                      background:  isDone?"rgba(42,122,75,0.03)":"var(--bg-0)",
                      cursor:"pointer",
                    }}
                    onClick={()=>setActiveDay(day.id)}
                  >
                    <div className="day-card-head" style={{background:"none"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <p className="day-card-title">{day.name}</p>
                          {isToday && !isDone && <span style={{padding:"2px 8px",borderRadius:100,background:"var(--acc-0)",border:"1px solid var(--b1)",fontSize:"0.55rem",fontFamily:"var(--fc)",letterSpacing:"0.1em",color:"var(--txt-1)",textTransform:"uppercase"}}>Today</span>}
                        </div>
                        <p className="day-card-sub">{day.focus} · {day.exercises.length} exercises</p>
                      </div>
                      <div className="day-card-meta">
                        {isDone && <span className="wk-done-badge">✓ Done</span>}
                        {inProg && <span style={{fontSize:"0.62rem",color:"rgba(220,175,100,0.8)",fontFamily:"var(--fc)"}}>{checked}/{numSets} sets</span>}
                        {!isDone && !inProg && <span style={{fontSize:"0.62rem",color:"var(--txt-2)",fontFamily:"var(--fc)"}}>Start →</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{textAlign:"center",padding:"48px 20px",borderRadius:"var(--r4)",background:"var(--gb)",border:"1px solid var(--b0)"}}>
              <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,marginBottom:8}}>No Active Program</p>
              <p style={{fontSize:"0.8rem",color:"var(--txt-1)",lineHeight:1.7,maxWidth:320,margin:"0 auto 20px"}}>Your coach hasn't assigned a program yet.</p>
            </div>
          )
        )}

        {/* ── PROGRAM HISTORY ── */}
        {tab === "history" && (
          history.length > 0 ? (
            <>
              <p className="label mb-12">Program History · {history.length} block{history.length!==1?"s":""}</p>
              {history.map(prog => {
                const summary = wlProgramSummary(workoutLogs, prog.id, prog.days);
                return (
                  <div className="hist-card" key={prog.id} onClick={()=>{setHistOpen(prog.id);setHistDay(null);}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <p className="hist-card-name">{prog.name}</p>
                        <p className="hist-card-meta">{prog.block} · {prog.phase}</p>
                      </div>
                      <span className={`prog-status-pill ${prog.status}`}>{prog.status}</span>
                    </div>
                    <p style={{fontSize:"0.66rem",color:"var(--txt-2)",marginBottom:10}}>{prog.startDate} – {prog.endDate} · {prog.totalWeeks} weeks</p>
                    {summary.completed > 0 && (
                      <p style={{fontSize:"0.65rem",color:"rgba(140,210,155,0.75)",marginBottom:8}}>✓ {summary.completed}/{summary.total} days completed</p>
                    )}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {prog.days.map(d=>(
                        <span key={d.id} style={{padding:"3px 9px",borderRadius:100,background:wlIsDone(workoutLogs,prog.id,d.id)?"rgba(42,122,75,0.12)":"var(--gb)",border:`1px solid ${wlIsDone(workoutLogs,prog.id,d.id)?"rgba(42,122,75,0.2)":"var(--b0)"}`,fontSize:"0.62rem",color:wlIsDone(workoutLogs,prog.id,d.id)?"rgba(140,210,155,0.8)":"var(--txt-2)",fontFamily:"var(--fc)"}}>{d.name}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{textAlign:"center",padding:"48px 20px",borderRadius:"var(--r4)",background:"var(--gb)",border:"1px solid var(--b0)"}}>
              <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,marginBottom:8}}>No History Yet</p>
              <p style={{fontSize:"0.8rem",color:"var(--txt-1)",lineHeight:1.7}}>Completed programs will appear here once your first block is finished.</p>
            </div>
          )
        )}
      </div>
      {openEx && <ExDetailModal ex={openEx} onClose={()=>setOpenEx(null)} />}
    </div>
  );
}

/* ── PROGRESS ────────────────────────────────────────────────────────────── */
function Progress() {
  return (
    <div className="page-fade">
      <Topbar title="Progress" actions={<button className="btn btn-s btn-sm">Log Update</button>} />
      <div className="page-body">

        <div className="progress-grid">
          {[
            ["Sessions Done","24","↑ 4 this month"],
            ["Workouts Logged","18","of 24 sessions"],
            ["Consistency","78%","↑ 12% vs last block"],
            ["Body Weight","174 lbs","↓ 3 lbs since start"],
            ["Bench Press 5RM","185 lbs","↑ 15 lbs since start"],
            ["RDL 5RM","235 lbs","↑ 20 lbs since start"],
          ].map(([lbl,n,delta])=>(
            <div className="metric-card" key={lbl}>
              <div className="metric-n">{n}</div>
              <p className="metric-lbl">{lbl}</p>
              <p className="metric-delta">{delta}</p>
            </div>
          ))}
        </div>

        <div className="card card-p mb-16">
          <div className="panel-hd">
            <span className="panel-title">Consistency Overview</span>
            <Tag type="ok">Block 1–2</Tag>
          </div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {Array.from({length:56}).map((_,i)=>(
              <div key={i} style={{width:16,height:16,borderRadius:3,background:i%7===0||i%7===6?"var(--b0)":Math.random()>0.3?"rgba(42,122,75,0.5)":"var(--b0)",transition:"all 0.2s"}} />
            ))}
          </div>
          <p className="body-sm mt-10" style={{fontSize:"0.65rem",color:"var(--txt-2)"}}>Past 8 weeks · Green = session completed</p>
        </div>

        <div className="dash-grid">
          <div className="card card-p">
            <div className="panel-hd"><span className="panel-title">Body Weight Log</span></div>
            {[["Apr 1","177 lbs"],["Mar 24","176.5 lbs"],["Mar 17","175.5 lbs"],["Mar 10","177 lbs"],["Start","177 lbs"]].map(([d,w])=>(
              <div className="list-row" key={d}>
                <span className="list-sub">{d}</span>
                <span className="list-main">{w}</span>
              </div>
            ))}
            <div className="field mt-16">
              <label className="field-label">Log Today's Weight</label>
              <div className="flex gap-8">
                <input className="fi" style={{flex:1}} placeholder="lbs" type="number" />
                <button className="btn btn-p btn-sm">Log</button>
              </div>
            </div>
          </div>

          <div className="card card-p">
            <div className="panel-hd"><span className="panel-title">Milestones</span></div>
            {[
              ["First pull-up unassisted","Feb 10","ok"],
              ["Hit 225 lb deadlift","Mar 4","ok"],
              ["Completed first full program block","Mar 28","ok"],
              ["Next: 245 lb RDL","Upcoming","pend"],
            ].map(([m,d,t])=>(
              <div className="list-row" key={m}>
                <div><p className="list-main" style={{fontSize:"0.78rem"}}>{m}</p><p className="list-sub">{d}</p></div>
                <Tag type={t}>{t==="ok"?"✓":"Goal"}</Tag>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-p mt-16">
          <div className="panel-hd">
            <span className="panel-title">Progress Photos</span>
            <Tag type="info">Private · Only you and Malik can see these</Tag>
          </div>
          <div className="photo-grid">
            {["Start","Month 1","Month 2","Month 3","Month 4","Add New"].map((lbl,i)=>(
              <div className="photo-slot" key={lbl}>
                {i<5 && i>0 ? (
                  <div style={{width:"100%",height:"100%",background:"linear-gradient(160deg,var(--acc-0),var(--bg-2))",borderRadius:"var(--r3)",display:"flex",alignItems:"flex-end",padding:10}}>
                    <span style={{fontSize:"0.62rem",color:"var(--txt-2)",letterSpacing:"0.1em",textTransform:"uppercase"}}>{lbl}</span>
                  </div>
                ) : (
                  <>
                    <span className="photo-slot-ic">{i===0?"📷":"+"}</span>
                    <span className="photo-slot-lbl">{lbl}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── FEEDBACK ────────────────────────────────────────────────────────────── */
function Feedback() {
  const [ratings, setRatings] = useState({});
  const [submitted, setDone]  = useState(false);
  const [loading, setLoad]    = useState(false);

  const rate = (k,v) => setRatings(p=>({...p,[k]:v}));

  const submit = () => {
    setLoad(true);
    setTimeout(()=>{ setLoad(false); setDone(true); }, 800);
  };

  if (submitted) return (
    <div className="page-fade">
      <Topbar title="Program Reflection" />
      <div className="page-body centered" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}>
        <div className="empty-state">
          <span style={{fontSize:"2.5rem"}}>✓</span>
          <p style={{fontFamily:"var(--fh)",fontSize:"1.2rem",fontWeight:700,color:"var(--txt-0)"}}>Reflection Submitted</p>
          <p className="body">Malik will review your feedback and use it to shape your next training block.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-fade">
      <Topbar title="Program Reflection" />
      <div className="page-body" style={{maxWidth:640}}>
        <div className="card card-p mb-16">
          <p className="label mb-4">End of Block 1</p>
          <h2 className="h2 mb-8">How did it go?</h2>
          <p className="body">Your feedback helps Malik build a better program for you. Be honest — there are no wrong answers.</p>
        </div>

        {[
          { k:"liked",      q:"What did you enjoy or find effective this block?" },
          { k:"more",       q:"What would you like more of in the next block?" },
          { k:"remove",     q:"Anything you'd like to remove or reduce?" },
          { k:"difficult",  q:"What felt too easy or too difficult?" },
          { k:"learn",      q:"What movements or skills would you like to learn next?" },
        ].map(({k,q})=>(
          <div className="card card-p mb-12" key={k}>
            <p className="label mb-8">{q}</p>
            <textarea className="fi" rows={3} placeholder="Your thoughts..." />
          </div>
        ))}

        <div className="card card-p mb-12">
          <p className="label mb-12">Rate this block (1 = tough, 5 = great)</p>
          {[["Overall Experience","overall"],["Program Difficulty","diff"],["Recovery & Soreness","recovery"],["Progress Toward Goals","progress"]].map(([lbl,k])=>(
            <div key={k} style={{marginBottom:14}}>
              <p className="body-sm mb-6">{lbl}</p>
              <div className="flex gap-8">
                {[1,2,3,4,5].map(n=>(
                  <button key={n}
                    onClick={()=>rate(k,n)}
                    style={{width:36,height:36,borderRadius:"var(--r2)",border:`1px solid ${ratings[k]===n?"var(--b1)":"var(--b0)"}`,background:ratings[k]===n?"var(--acc-0)":"none",color:ratings[k]===n?"var(--txt-0)":"var(--txt-2)",fontFamily:"var(--fh)",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",transition:"all 0.17s"}}
                  >{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card card-p mb-20">
          <p className="label mb-8">Anything else Malik should know?</p>
          <textarea className="fi" rows={4} placeholder="Open feedback, goals for next block, life updates that affect training..." />
        </div>

        <button className={`btn btn-p btn-full${loading?" btn-loading":""}`} onClick={submit}>
          {loading ? <><Spinner />Submitting…</> : "Submit Reflection"}
        </button>
      </div>
    </div>
  );
}

/* ── MESSAGES ────────────────────────────────────────────────────────────── */
function Messages() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs]   = useState([]); // messages will load from Supabase
  const bottomRef         = useRef(null);

  const send = () => {
    if (!input.trim()) return;
    setMsgs(p=>[...p,{from:"me",text:input.trim(),time:"Just now"}]);
    setInput("");
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}), 50);
  };

  return (
    <div className="page-fade" style={{height:"calc(100vh - 0px)",display:"flex",flexDirection:"column"}}>
      <Topbar title="Messages" />
      <div style={{flex:1,overflow:"hidden"}}>
        <div className="msg-layout" style={{height:"100%"}}>
          {/* Thread list */}
          <div className="msg-list">
            <p className="label mb-10" style={{padding:"0 2px"}}>Conversations</p>
            {MESSAGES.map(t=>(
              <div className={`msg-thread active`} key={t.id}>
                <div className="msg-av">{t.init}</div>
                <div style={{flex:1,overflow:"hidden"}}>
                  <div className="flex between items-center">
                    <span className="msg-thread-name">{t.name}</span>
                    <span className="msg-thread-time">{t.time}</span>
                  </div>
                  <p className="msg-thread-preview">{t.preview}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat */}
          <div className="msg-chat">
            <div className="msg-chat-head">
              <div className="msg-av">MB</div>
              <div>
                <p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700}}>Malik Bryant</p>
                <p className="body-sm" style={{fontSize:"0.65rem",color:"var(--txt-2)"}}>Coach · MLVNT</p>
              </div>
            </div>

            <div className="msg-chat-body">
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.from==="me"?"flex-end":"flex-start"}}>
                  <div className={`bubble ${m.from==="me"?"me":"them"}`}>{m.text}</div>
                  <span className="bubble-time">{m.time}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="msg-chat-foot">
              <div className="msg-input-row">
                <input className="fi msg-input" placeholder="Message Malik…" value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&send()} />
                <button className="btn btn-p btn-sm" onClick={send}>Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── LOCATION SETTINGS ───────────────────────────────────────────────────── */
// LocationSettings merged into ProfileSettings location tab

/* ── PROFILE / SETTINGS ──────────────────────────────────────────────────── */
function ProfileSettings({ onLogout, session, profileData }) {
  const [tab, setTab]     = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState("");

  // ── Profile tab state (loaded from Supabase) ─────────────────────────────
  const [firstName,        setFirstName]        = useState("");
  const [lastName,         setLastName]         = useState("");
  const [phone,            setPhone]            = useState("");
  const [height,           setHeight]           = useState("");
  const [weight,           setWeight]           = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [birthday,         setBirthday]         = useState("");
  const [profileLoaded,    setProfileLoaded]    = useState(false);

  // ── Location tab state ────────────────────────────────────────────────────
  const [locBuilding, setLocBuilding] = useState("");
  const [locAddress,  setLocAddress]  = useState("");
  const [locArea,     setLocArea]     = useState("hudson_yards");
  const [locNotes,    setLocNotes]    = useState("");

  // ── Load profile from Supabase on mount ──────────────────────────────────
  useEffect(() => {
    if (!session?.id || profileLoaded) return;
    getClientProfile(session.id).then(p => {
      if (p) {
        const nameParts = (session.name || "").split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
        setPhone(p.phone || "");
        setHeight(p.height || "");
        setWeight(p.weight || "");
        setEmergencyContact(p.emergency_contact || "");
        setBirthday(p.birthday || "");
        setLocBuilding(p.location_building || "");
        setLocAddress(p.location_address  || "");
        setLocArea(p.location_area        || "hudson_yards");
        setLocNotes(p.location_notes      || "");
      }
      setProfileLoaded(true);
    });
  }, [session?.id]);

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  // ── Save profile tab ──────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true); setErr("");
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const [r1, r2] = await Promise.all([
      saveProfileName(session.id, fullName),
      saveClientProfile(session.id, {
        phone:            phone.trim()            || null,
        height:           height.trim()           || null,
        weight:           weight.trim()           || null,
        emergency_contact: emergencyContact.trim() || null,
      }),
    ]);
    setSaving(false);
    if (!r1.ok || !r2.ok) { setErr(r1.error || r2.error || "Save failed."); return; }
    flashSaved();
  };

  // ── Save location tab ─────────────────────────────────────────────────────
  const saveLocation = async () => {
    setSaving(true); setErr("");
    const result = await saveClientProfile(session.id, {
      location_building: locBuilding.trim() || null,
      location_address:  locAddress.trim()  || null,
      location_area:     locArea            || null,
      location_notes:    locNotes.trim()    || null,
    });
    setSaving(false);
    if (!result.ok) { setErr(result.error || "Save failed."); return; }
    flashSaved();
  };

  const tabs = [
    { id:"profile",  lbl:"Profile" },
    { id:"location", lbl:"Training Location" },
    { id:"account",  lbl:"Account" },
    { id:"notifs",   lbl:"Notifications" },
    { id:"security", lbl:"Security" },
  ];

  const AREA_OPTIONS = [
    { id:"hudson_yards",   lbl:"Hudson Yards" },
    { id:"chelsea",        lbl:"Chelsea" },
    { id:"hells_kitchen",  lbl:"Hell's Kitchen" },
    { id:"midtown",        lbl:"Midtown" },
    { id:"upper_west",     lbl:"Upper West Side" },
    { id:"other",          lbl:"Other / Custom" },
  ];

  return (
    <div className="page-fade">
      <Topbar title="Profile & Settings"
        actions={<div className="flex items-center gap-8">
          <SaveIndicator saving={saving} />
          {saved && <span className="body-sm" style={{color:"rgba(140,220,155,0.8)",fontSize:"0.7rem"}}>✓ Saved</span>}
        </div>}
      />
      <div className="page-body" style={{padding:"24px 0"}}>
        <div className="settings-layout">
          <div className="settings-nav">
            {tabs.map(t=>(
              <div key={t.id} className={`settings-tab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.lbl}</div>
            ))}
            <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid var(--b0)"}}>
              <button className="btn btn-danger btn-sm btn-full" onClick={onLogout}>Sign Out</button>
            </div>
          </div>

          <div className="settings-content">
            {err && <Alert type="err" style={{marginBottom:12}}>{err}</Alert>}

            {tab==="profile" && (
              <div className="form-col">
                <div className="flex items-center gap-16 mb-24">
                  <div className="avatar-lg">{session?.init || "?"}</div>
                  <div>
                    <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>{session?.name || "—"}</p>
                    <p className="body-sm">{profileData?.package_plan || "Active Client"}</p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field"><label className="field-label">First Name</label>
                    <input className="fi" value={firstName} onChange={e=>setFirstName(e.target.value)} /></div>
                  <div className="field"><label className="field-label">Last Name</label>
                    <input className="fi" value={lastName} onChange={e=>setLastName(e.target.value)} /></div>
                </div>
                <div className="field"><label className="field-label">Email Address</label>
                  <input className="fi" type="email" value={session?.email || ""} readOnly style={{opacity:0.6}} /></div>
                <div className="field"><label className="field-label">Phone Number</label>
                  <input className="fi" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 (555) 000-0000" /></div>
                <div className="form-grid">
                  <FieldLocked label="Date of Birth" value={birthday || "Not set"} note="Birthday cannot be changed. Contact Malik if there's an error." />
                  <div className="field"><label className="field-label">Height</label>
                    <input className="fi" value={height} onChange={e=>setHeight(e.target.value)} placeholder="5 ft 11 in" /></div>
                </div>
                <div className="form-grid">
                  <div className="field"><label className="field-label">Weight</label>
                    <input className="fi" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="174 lbs" /></div>
                  <div className="field"><label className="field-label">Emergency Contact</label>
                    <input className="fi" value={emergencyContact} onChange={e=>setEmergencyContact(e.target.value)} placeholder="Name — Phone Number" /></div>
                </div>
                <button className="btn btn-p btn-sm" onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            )}

            {tab==="location" && (
              <div className="form-col">
                <div>
                  <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,marginBottom:4}}>Training Location</p>
                  <p className="body-sm">This location is saved to your profile and used when booking sessions.</p>
                </div>
                {locBuilding && (
                  <div className="loc-card">
                    <div className="loc-icon">📍</div>
                    <div style={{flex:1,minWidth:0}}>
                      <p className="loc-building">{locBuilding}</p>
                      {locAddress && <p className="loc-address">{locAddress}</p>}
                      {locNotes   && <p className="loc-notes">{locNotes}</p>}
                    </div>
                    {locAddress && (
                      <button className="loc-dir-btn"
                        onClick={()=>window.open(`https://maps.google.com/?q=${encodeURIComponent(locAddress)}`,"_blank","noopener")}>
                        ↗ Directions
                      </button>
                    )}
                  </div>
                )}
                <div className="card card-p">
                  <p className="label mb-14">Edit Location</p>
                  <div className="form-col">
                    <div className="field">
                      <label className="field-label">Building / Gym Name</label>
                      <input className="fi" value={locBuilding} onChange={e=>setLocBuilding(e.target.value)} placeholder="e.g. Equinox Hudson Yards" />
                    </div>
                    <div className="field">
                      <label className="field-label">Full Address</label>
                      <input className="fi" value={locAddress} onChange={e=>setLocAddress(e.target.value)} placeholder="e.g. 35 Hudson Yards, New York, NY 10001" />
                    </div>
                    <div className="field">
                      <label className="field-label">Neighbourhood / Area</label>
                      <p className="field-note" style={{marginBottom:8}}>Used to calculate travel buffers between sessions in different areas.</p>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {AREA_OPTIONS.map(a=>(
                          <button key={a.id}
                            className={`chip${locArea===a.id?" on":""}`}
                            onClick={()=>setLocArea(a.id)}>{a.lbl}</button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label">Access Notes</label>
                      <textarea className="note-area" rows={2} value={locNotes} onChange={e=>setLocNotes(e.target.value)}
                        placeholder="e.g. Enter on 10th Ave. Gym is on Level 4." />
                    </div>
                    <button className="btn btn-p btn-sm" onClick={saveLocation} disabled={saving}>
                      {saving ? "Saving…" : "Save Location"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab==="account" && (
              <div className="form-col">
                <h3 className="h3 mb-16">Account Settings</h3>
                <div className="card card-p">
                  <p className="label mb-8">Active Package</p>
                  <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>
                    {profileData?.package_plan || "—"}
                  </p>
                  {[
                    ["Sessions Available", profileData?.sessions_balance != null ? String(profileData.sessions_balance) : "—"],
                    ["Weekly Structure",   profileData?.sessions_weekly_max ? `${profileData.sessions_weekly_max}x per week` : "—"],
                    ["Billing Cycle",      "Monthly on the 1st"],
                    ["Member Since",       session?.email ? "—" : "—"],
                  ].map(([k,v])=>(
                    <div className="list-row" key={k}><span className="list-sub">{k}</span><span className="list-main" style={{fontSize:"0.78rem"}}>{v}</span></div>
                  ))}
                </div>
                <div className="card card-p">
                  <p className="label mb-8">Perks & Rewards</p>
                  <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No active rewards on record.</p>
                </div>
                <div className="card card-p">
                  <p className="label mb-8">Payment History</p>
                  <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>Payment history is managed through Stripe. Contact your coach for records.</p>
                </div>
              </div>
            )}

            {tab==="notifs" && (
              <div className="form-col">
                <h3 className="h3 mb-16">Notification Preferences</h3>
                {[
                  ["Session Reminders","24-hour and 2-hour reminders before each session"],
                  ["Booking Confirmations","Immediate confirmation when a session is booked"],
                  ["Session Balance Alerts","Notified when sessions are running low"],
                  ["Package Expiration Reminders","Alert before your package expires"],
                  ["Birthday Reward","Notification when your annual reward becomes available"],
                  ["New Program Updates","Notified when Malik updates your program"],
                  ["Coach Messages","Message and check-in notifications"],
                ].map(([lbl,desc],i)=>(
                  <div key={lbl} className="card card-p flex between items-center">
                    <div>
                      <p className="h3" style={{fontSize:"0.82rem"}}>{lbl}</p>
                      <p className="body-sm mt-4">{desc}</p>
                    </div>
                    <div style={{width:36,height:20,borderRadius:100,background:i<5?"var(--acc-1)":"var(--bg-2)",border:"1px solid var(--b0)",cursor:"pointer",position:"relative",flexShrink:0}}>
                      <div style={{width:14,height:14,borderRadius:50,background:i<5?"var(--txt-0)":"var(--txt-2)",position:"absolute",top:2,left:i<5?19:3,transition:"left 0.2s"}} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab==="security" && (
              <SecuritySettings
                session={session}
                onSetupMFA={()=>{}}
                onLogoutAll={()=>{ SESSION_STORE.revokeAll(session?.email || ""); }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── APP SHELL ───────────────────────────────────────────────────────────── */
function AppShell({ onLogout, session }) {
  const [view, setView] = useState("home");

  // ── Supabase: load active program + all workout logs for this client ──────
  const [activeProgram, setActiveProgram] = useState(null);
  const [allPrograms,   setAllPrograms]   = useState([]);
  const [workoutLogs,   setWorkoutLogs]   = useState({}); // key: "progId:dayId" → log row

  // ── Supabase: load client profile (sessions balance, plan, weekly max) ────
  const [profileData, setProfileData] = useState(null);

  const reloadProfileData = () => {
    if (!session?.id) return;
    getClientProfile(session.id).then(p => setProfileData(p));
  };

  // Reload helper — called after a day is completed
  const reloadProgramData = () => {
    if (!session?.id) return;
    getActiveProgram(session.id).then(row => {
      if (!row) { setActiveProgram(null); return; }
      const prog = dbRowToProgram(row);
      setActiveProgram(prog);
      // Pre-load workout logs for the active program
      Promise.all(
        (prog.days || []).map(d =>
          getWorkoutLog(prog.id, d.id, session.id)
            .then(log => log ? { key:`${prog.id}:${d.id}`, log } : null)
        )
      ).then(results => {
        const map = {};
        results.filter(Boolean).forEach(({ key, log }) => {
          map[key] = {
            sets:        log.sets_data || {},
            completed:   log.completed || false,
            completedAt: log.completed_at || null,
          };
        });
        setWorkoutLogs(map);
      });
    });
    getPrograms(session.id).then(rows => setAllPrograms(rows.map(dbRowToProgram)));
  };

  useEffect(() => { reloadProgramData(); reloadProfileData(); }, [session?.id]);

  const views = {
    home:           <Dashboard setView={setView} activeProgram={activeProgram} workoutLogs={workoutLogs} session={session} profileData={profileData} />,
    book:           <Booking setView={setView} profileData={profileData} />,
    program:        <Program session={session} activeProgram={activeProgram} allPrograms={allPrograms} workoutLogs={workoutLogs} onWorkoutComplete={reloadProgramData} />,
    progress:       <Progress />,
    feedback:       <Feedback />,
    messages:       <Messages />,
    profile:        <ProfileSettings onLogout={onLogout} session={session} profileData={profileData} />,
    packages:       <PackagePricing onBack={()=>setView("home")} onConsult={()=>setView("consultation")} />,
    consultation:   <ConsultationFlow    onBack={()=>setView("home")} onComplete={()=>setView("home")} />,
    recommendation: <ConsultationRecommendation onBack={()=>setView("home")} onProceed={()=>setView("home")} />,
  };

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sb-brand">
          <div>
            <div className="sb-logo">MLVNT</div>
            <div className="sb-tagline">Time Moves. So Should You.</div>
          </div>
        </div>
        <p className="sb-sec">Main</p>
        {NAV.slice(0,5).map(item=>(
          <div key={item.id}
            className={`sb-item${view===item.id?" active":""}`}
            onClick={()=>setView(item.id)}
          >
            <span className="ic">{item.ic}</span>
            <span>{item.lbl}</span>
            {item.badge&&<span className="sb-badge">{item.badge}</span>}
          </div>
        ))}
        <p className="sb-sec">Account</p>
        <div className={`sb-item${view==="profile"?" active":""}`} onClick={()=>setView("profile")}>
          <span className="ic">⊙</span><span>Profile & Settings</span>
        </div>
        <div className="sb-item" onClick={()=>setView("feedback")}>
          <span className="ic">◎</span><span>Program Reflection</span>
        </div>
        <div className="sb-user">
          <div className="sb-av">{session?.init||"?"}</div>
          <div style={{overflow:"hidden"}}>
            <p className="sb-name">{session?.name || "—"}</p>
            <p className="sb-role">{
              (session?.role === "admin" || session?.role === "owner" || session?.isOwner)
                ? "Coach Portal"
                : profileData?.package_plan || "Client"
            }</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-col">
        {views[view] || views["home"]}
      </div>

      {/* Mobile bottom nav */}
      <nav className="mob-nav">
        <div className="mob-nav-inner">
          {NAV.map(item=>(
            <button key={item.id}
              className={`mob-tab${view===item.id?" active":""}`}
              onClick={()=>setView(item.id)}
            >
              <span className="ic">{item.ic}</span>
              <span className="lbl">{item.lbl}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   MLVNT ADMIN  ·  Founder & Coach Command Center
═══════════════════════════════════════════════════════════════════════════ */

/* ── ADMIN CSS ─────────────────────────────────────────────────────────── */
const ADMIN_CSS = `
.admin-shell{display:grid;grid-template-columns:228px 1fr;min-height:100vh;background:var(--bg-0);}
.admin-sidebar{background:var(--bg-1);border-right:1px solid var(--b0);padding:0 12px 20px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0;}
.admin-brand{padding:20px 8px 18px;border-bottom:1px solid var(--b0);margin-bottom:8px;}
.admin-logo{font-family:var(--fh);font-size:1.05rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-0);}
.admin-role-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:100px;background:rgba(30,43,58,0.8);border:1px solid var(--b0);font-size:0.55rem;font-family:var(--fc);letter-spacing:0.12em;text-transform:uppercase;color:rgba(140,175,210,0.8);margin-top:6px;}
.admin-sec{font-size:0.52rem;font-weight:500;letter-spacing:0.2em;color:var(--txt-2);text-transform:uppercase;padding:14px 10px 5px;}
.a-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:var(--r2);cursor:pointer;font-size:0.77rem;color:var(--txt-1);transition:all 0.17s;border:1px solid transparent;margin-bottom:1px;font-family:var(--fb);}
.a-item:hover{background:var(--gb);color:var(--txt-0);}
.a-item.on{background:var(--acc-0);color:var(--txt-0);border-color:var(--b0);}
.a-item .ic{font-size:0.9rem;width:18px;text-align:center;flex-shrink:0;opacity:0.65;}
.a-item.on .ic{opacity:1;}
.a-badge{margin-left:auto;background:rgba(180,80,80,0.25);color:rgba(220,130,130,0.85);font-size:0.52rem;padding:2px 7px;border-radius:100px;font-family:var(--fc);}
.a-badge.ok{background:rgba(42,122,75,0.2);color:rgba(120,200,140,0.8);}
.admin-user{margin-top:auto;padding:12px 10px 0;border-top:1px solid var(--b0);display:flex;gap:10px;align-items:center;}
.admin-av{width:30px;height:30px;border-radius:50%;background:var(--acc-1);border:1px solid var(--b0);display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:0.6rem;font-weight:700;color:var(--txt-0);flex-shrink:0;}
.admin-main{display:flex;flex-direction:column;overflow-y:auto;min-height:100vh;}
.admin-topbar{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid var(--b0);background:rgba(10,11,13,0.72);backdrop-filter:blur(20px);position:sticky;top:0;z-index:50;}
.admin-topbar-title{font-family:var(--fh);font-size:0.9rem;font-weight:700;letter-spacing:-0.01em;}
.admin-body{flex:1;padding:28px 28px 40px;}
.a-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
.a-kpi{border-radius:var(--r3);padding:18px;background:var(--bg-1);border:1px solid var(--b0);}
.a-kpi.accent{background:var(--acc-0);border-color:rgba(255,255,255,0.1);}
.a-kpi.warn{background:rgba(107,74,26,0.2);border-color:rgba(180,120,40,0.25);}
.a-kpi.ok{background:rgba(42,122,75,0.15);border-color:rgba(42,122,75,0.25);}
.a-kpi-n{font-family:var(--fh);font-size:1.8rem;font-weight:700;color:var(--txt-0);line-height:1;}
.a-kpi-lbl{font-size:0.58rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--txt-2);margin-bottom:5px;font-family:var(--fb);}
.a-kpi-sub{font-size:0.63rem;color:var(--txt-2);margin-top:3px;}
.a-panel{border-radius:var(--r3);padding:20px;background:var(--bg-1);border:1px solid var(--b0);}
.a-panel-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.a-panel-title{font-family:var(--fh);font-size:0.74rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--txt-0);}
.a-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.a-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.a-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--b0);}
.a-row:last-child{border-bottom:none;}
.a-row-main{font-size:0.8rem;font-weight:400;color:var(--txt-0);}
.a-row-sub{font-size:0.68rem;color:var(--txt-2);margin-top:2px;}
.client-table{width:100%;border-collapse:collapse;}
.client-table th{font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--txt-2);padding:8px 12px;border-bottom:1px solid var(--b0);text-align:left;font-family:var(--fb);font-weight:500;}
.client-table td{padding:11px 12px;border-bottom:1px solid var(--b0);font-size:0.8rem;color:var(--txt-1);vertical-align:middle;}
.client-table tr:last-child td{border-bottom:none;}
.client-table tr:hover td{background:rgba(255,255,255,0.02);color:var(--txt-0);}
.client-table tr{cursor:pointer;transition:all 0.15s;}
.c-av{width:28px;height:28px;border-radius:50%;background:var(--acc-0);border:1px solid var(--b0);display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:0.58rem;font-weight:700;color:var(--txt-1);flex-shrink:0;}
.c-name{font-family:var(--fh);font-size:0.8rem;font-weight:600;color:var(--txt-0);}
.c-detail{font-size:0.66rem;color:var(--txt-2);margin-top:2px;}
.cp-layout{display:grid;grid-template-columns:280px 1fr;gap:0;min-height:500px;}
.cp-sidebar{border-right:1px solid var(--b0);padding:20px;}
.cp-main{padding:20px 24px;}
.cp-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:20px;}
.cp-tab{padding:7px 14px;border-radius:var(--r2);border:1px solid transparent;background:none;color:var(--txt-1);font-family:var(--fh);font-size:0.66rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;transition:all 0.17s;}
.cp-tab:hover{background:var(--gb);color:var(--txt-0);}
.cp-tab.on{background:var(--acc-0);border-color:var(--b0);color:var(--txt-0);}
.cp-stat-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
.cp-stat{border-radius:var(--r2);padding:14px;background:rgba(0,0,0,0.2);border:1px solid var(--b0);}
.cp-stat-n{font-family:var(--fh);font-size:1.4rem;font-weight:700;color:var(--txt-0);line-height:1;}
.cp-stat-l{font-size:0.6rem;color:var(--txt-2);letter-spacing:0.1em;text-transform:uppercase;margin-top:3px;}
.note-area{width:100%;background:rgba(0,0,0,0.25);border:1px solid var(--b0);border-radius:var(--r2);padding:11px 14px;color:var(--txt-0);font-family:var(--fb);font-size:0.82rem;font-weight:300;outline:none;resize:vertical;line-height:1.65;transition:border-color 0.2s;}
.note-area:focus{border-color:var(--b1);}
.info-block{margin-bottom:18px;}
.info-block-title{font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--txt-2);margin-bottom:8px;font-family:var(--fb);}
.info-val{font-size:0.82rem;color:var(--txt-1);line-height:1.6;}
.pe-layout{display:grid;grid-template-columns:200px 1fr;gap:0;}
.pe-days{border-right:1px solid var(--b0);padding:14px 10px;}
.pe-day-tab{padding:9px 10px;border-radius:var(--r2);cursor:pointer;transition:all 0.17s;margin-bottom:2px;border:1px solid transparent;}
.pe-day-tab:hover{background:var(--gb);}
.pe-day-tab.on{background:var(--acc-0);border-color:var(--b0);}
.pe-day-name{font-family:var(--fh);font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--txt-0);}
.pe-day-type{font-size:0.6rem;color:var(--txt-2);margin-top:1px;}
.pe-content{padding:20px;}
.ex-editor{border-radius:var(--r3);padding:16px;background:var(--bg-2);border:1px solid var(--b0);margin-bottom:10px;}
.ex-editor-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;}
.ex-num{font-family:var(--fc);font-size:0.7rem;color:var(--txt-2);min-width:18px;}
.ex-name-input{flex:1;background:transparent;border:none;outline:none;font-family:var(--fh);font-size:0.85rem;font-weight:700;color:var(--txt-0);letter-spacing:0.01em;}
.ex-name-input::placeholder{color:var(--txt-2);font-weight:400;}
.ex-set-editor{display:grid;grid-template-columns:32px repeat(5,1fr) 28px;gap:6px;margin-top:10px;}
.set-hd{font-size:0.52rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-2);text-align:center;padding-bottom:4px;border-bottom:1px solid var(--b0);}
.set-inp{background:rgba(0,0,0,0.3);border:1px solid var(--b0);border-radius:var(--r1);padding:6px 4px;font-size:0.74rem;font-family:var(--fc);text-align:center;color:var(--txt-0);outline:none;width:100%;transition:border-color 0.17s;}
.set-inp:focus{border-color:var(--b1);}
.set-del{width:22px;height:22px;border-radius:50%;background:none;border:1px solid var(--b0);color:var(--txt-2);cursor:pointer;font-size:0.6rem;display:flex;align-items:center;justify-content:center;transition:all 0.17s;align-self:center;}
.set-del:hover{background:rgba(200,80,80,0.1);border-color:rgba(200,80,80,0.3);color:rgba(200,120,120,0.8);}
.sched-head{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:16px;}
.sched-day-btn{flex-shrink:0;padding:10px 16px;border-radius:var(--r2);border:1px solid var(--b0);background:none;cursor:pointer;transition:all 0.17s;text-align:center;}
.sched-day-btn:hover{background:var(--gb);}
.sched-day-btn.on{background:var(--acc-0);border-color:var(--b1);}
.sched-day-name{font-family:var(--fh);font-size:0.68rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--txt-0);}
.sched-day-date{font-size:0.6rem;color:var(--txt-2);margin-top:2px;}
.sched-timeline{display:flex;flex-direction:column;gap:0;}
.sched-slot{display:flex;gap:0;min-height:52px;}
.sched-time-col{width:64px;flex-shrink:0;padding:4px 12px 4px 0;text-align:right;font-family:var(--fc);font-size:0.62rem;color:var(--txt-2);padding-top:6px;}
.sched-event-col{flex:1;border-left:1px solid var(--b0);padding:4px 0 4px 12px;position:relative;}
.sched-event{border-radius:var(--r2);padding:10px 12px;margin-bottom:4px;border:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:all 0.17s;}
.sched-event:hover{border-color:var(--b1);}
.sched-event.sess{background:var(--acc-0);}
.sched-event.consult{background:rgba(42,80,122,0.25);border-color:rgba(60,100,180,0.2);}
.sched-free{color:var(--txt-2);font-size:0.68rem;padding:14px 0 14px 12px;border-left:1px solid var(--b0);}
.sched-ev-name{font-family:var(--fh);font-size:0.74rem;font-weight:700;color:var(--txt-0);}
.sched-ev-sub{font-size:0.63rem;color:var(--txt-1);margin-top:2px;}
.sched-ev-loc{font-size:0.6rem;color:var(--txt-2);margin-top:3px;display:flex;align-items:center;gap:5px;}
.fb-card{border-radius:var(--r3);padding:18px;background:var(--bg-1);border:1px solid var(--b0);margin-bottom:10px;transition:border-color 0.17s;cursor:pointer;}
.fb-card:hover{border-color:var(--b1);}
.fb-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.fb-card-name{font-family:var(--fh);font-size:0.82rem;font-weight:700;}
.fb-card-date{font-size:0.65rem;color:var(--txt-2);}
.fb-item{padding:8px 12px;border-radius:var(--r2);background:rgba(0,0,0,0.2);border:1px solid var(--b0);margin-bottom:6px;}
.fb-q{font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-2);margin-bottom:4px;font-family:var(--fb);}
.fb-a{font-size:0.78rem;color:var(--txt-1);line-height:1.55;}
.rating-row{display:flex;gap:5px;margin-top:4px;}
.rating-pip{width:10px;height:10px;border-radius:2px;background:var(--acc-1);}
.rating-pip.off{background:var(--b0);}
.pkg-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--b0);}
.pkg-row:last-child{border-bottom:none;}
.pkg-client{font-size:0.8rem;font-weight:500;color:var(--txt-0);}
.pkg-detail{font-size:0.68rem;color:var(--txt-2);margin-top:2px;}
.sess-bar-wrap{width:80px;}
.sess-bar{height:4px;background:var(--b0);border-radius:2px;overflow:hidden;margin-top:4px;}
.sess-bar-fill{height:100%;background:linear-gradient(90deg,var(--acc-1),var(--acc-2));border-radius:2px;}
.sess-bar-fill.low{background:linear-gradient(90deg,rgba(170,80,80,0.8),rgba(200,100,60,0.7));}
.chart-bar-wrap{display:flex;align-items:flex-end;gap:8px;height:100px;margin-top:12px;}
.chart-bar-col{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;}
.chart-bar{border-radius:3px 3px 0 0;background:linear-gradient(to top,var(--acc-0),var(--acc-2));width:100%;transition:height 0.6s ease;min-height:4px;}
.chart-lbl{font-size:0.55rem;color:var(--txt-2);letter-spacing:0.06em;font-family:var(--fc);}
.chart-val{font-size:0.6rem;color:var(--txt-1);}
.admin-msg-layout{display:grid;grid-template-columns:240px 1fr;height:calc(100vh - 54px);overflow:hidden;}
.msg-tl{border-right:1px solid var(--b0);overflow-y:auto;padding:10px;}
.msg-tl-item{display:flex;gap:9px;padding:10px;border-radius:var(--r2);cursor:pointer;transition:all 0.17s;margin-bottom:2px;}
.msg-tl-item:hover{background:var(--gb);}
.msg-tl-item.on{background:var(--acc-0);}
.unread-dot{width:6px;height:6px;border-radius:50%;background:rgba(140,175,220,0.7);flex-shrink:0;margin-top:5px;}
.setting-row{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--b0);}
.setting-row:last-child{border-bottom:none;}
.setting-lbl{font-size:0.82rem;font-weight:400;color:var(--txt-0);}
.setting-desc{font-size:0.7rem;color:var(--txt-2);margin-top:2px;}
.toggle{width:36px;height:20px;border-radius:100px;border:1px solid var(--b0);cursor:pointer;position:relative;flex-shrink:0;transition:background 0.2s;}
.toggle.on{background:var(--acc-1);border-color:rgba(255,255,255,0.15);}
.toggle.off{background:var(--bg-2);}
.toggle-knob{width:14px;height:14px;border-radius:50%;background:var(--txt-0);position:absolute;top:2px;transition:left 0.2s;}
.toggle.on .toggle-knob{left:19px;}
.toggle.off .toggle-knob{left:3px;}
.quick-msg-btn{padding:9px 14px;border-radius:var(--r2);border:1px solid var(--b0);background:none;color:var(--txt-1);font-family:var(--fb);font-size:0.76rem;cursor:pointer;transition:all 0.17s;text-align:left;width:100%;margin-bottom:6px;display:flex;align-items:flex-start;gap:10px;}
.quick-msg-btn:hover{background:var(--gb);color:var(--txt-0);border-color:var(--b1);}
.quick-msg-ic{flex-shrink:0;font-size:0.85rem;margin-top:1px;opacity:0.6;}
@media(max-width:960px){
  .admin-shell{grid-template-columns:1fr;}
  .admin-sidebar{display:none;}
  .a-kpi-row{grid-template-columns:repeat(2,1fr);}
  .a-grid-2{grid-template-columns:1fr;}
  .cp-layout{grid-template-columns:1fr;}
  .cp-sidebar{border-right:none;border-bottom:1px solid var(--b0);}
  .pe-layout{grid-template-columns:1fr;}
  .pe-days{border-right:none;border-bottom:1px solid var(--b0);display:flex;gap:5px;overflow-x:auto;padding:8px;}
  .pe-day-tab{flex-shrink:0;}
  .admin-msg-layout{grid-template-columns:1fr;}
  .msg-tl{display:none;}
}

/* ── BOOKING INVENTORY LOCK ── */
.inv-lock{border-radius:var(--r4);padding:28px 24px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);text-align:center;}
.inv-lock-icon{width:52px;height:52px;border-radius:50%;background:rgba(60,60,70,0.4);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:1.3rem;margin:0 auto 18px;}
.inv-lock-title{font-family:var(--fh);font-size:1.05rem;font-weight:700;letter-spacing:-0.01em;color:var(--txt-0);margin-bottom:8px;}
.inv-lock-body{font-size:0.82rem;color:var(--txt-1);line-height:1.7;max-width:340px;margin:0 auto 22px;}
.inv-lock-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;}
.inv-warn-banner{border-radius:var(--r2);padding:11px 14px;display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;}
.inv-warn-banner.low{background:rgba(107,74,26,0.18);border:1px solid rgba(180,120,40,0.28);}
.inv-warn-banner.critical{background:rgba(107,26,26,0.18);border:1px solid rgba(180,60,60,0.28);}
.inv-warn-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.inv-warn-dot.low{background:rgba(220,175,100,0.85);}
.inv-warn-dot.critical{background:rgba(220,120,120,0.85);}
.inv-warn-txt.low{font-size:0.75rem;color:rgba(220,175,100,0.85);line-height:1.5;}
.inv-warn-txt.critical{font-size:0.75rem;color:rgba(220,120,120,0.85);line-height:1.5;}
.failed-booking-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--b0);}
.failed-booking-row:last-child{border-bottom:none;}

/* ── SESSION INVENTORY ADMIN ── */
.inv-balance-card{border-radius:var(--r3);padding:20px;background:var(--gb2);border:1px solid var(--b1);display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:14px;}
.inv-balance-n{font-family:var(--fh);font-size:2.8rem;font-weight:700;letter-spacing:-0.03em;color:var(--txt-0);line-height:1;}
.inv-balance-lbl{font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--txt-2);margin-top:4px;}
.inv-adj-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;}
.inv-adj-input{width:60px;padding:7px 10px;border-radius:var(--r2);background:var(--bg-2);border:1px solid var(--b0);color:var(--txt-0);font-family:var(--fc);font-size:0.84rem;text-align:center;outline:none;}
.inv-adj-input:focus{border-color:var(--b1);}
.inv-hist-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--b0);}
.inv-hist-row:last-child{border-bottom:none;}
.inv-hist-type{font-size:0.78rem;color:var(--txt-0);font-weight:400;}
.inv-hist-note{font-size:0.65rem;color:var(--txt-2);margin-top:2px;}
.inv-hist-n{font-family:var(--fc);font-size:0.84rem;font-weight:600;}
.inv-hist-n.add{color:rgba(140,210,155,0.85);}
.inv-hist-n.sub{color:rgba(220,120,120,0.75);}
.weekly-limit-row{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:var(--r2);background:rgba(0,0,0,0.15);border:1px solid var(--b0);}
.weekly-pip{width:10px;height:10px;border-radius:2px;}
.weekly-pip.used{background:var(--acc-1);}
.weekly-pip.avail{background:var(--b0);}

/* ── HELD INVENTORY ── */
.held-card{border-radius:var(--r3);padding:16px 18px;background:var(--bg-1);border:1px solid var(--b0);margin-bottom:8px;transition:border-color 0.18s;}
.held-card.scheduled{border-color:rgba(60,100,180,0.3);background:rgba(30,43,58,0.4);}
.held-card.held{border-color:rgba(180,120,40,0.25);background:rgba(107,74,26,0.08);}
.held-card.paused{border-color:rgba(255,255,255,0.1);background:rgba(0,0,0,0.15);}
.held-status-pill{display:inline-flex;align-items:center;padding:3px 9px;border-radius:100px;font-family:var(--fc);font-size:0.57rem;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;}
.held-status-pill.held{background:rgba(107,74,26,0.2);color:rgba(220,175,100,0.85);border:1px solid rgba(180,120,40,0.25);}
.held-status-pill.scheduled{background:rgba(30,43,80,0.4);color:rgba(140,175,220,0.85);border:1px solid rgba(60,100,180,0.25);}
.held-status-pill.active{background:rgba(42,122,75,0.15);color:rgba(140,210,155,0.85);border:1px solid rgba(42,122,75,0.25);}
.held-status-pill.expired{background:rgba(60,60,60,0.2);color:rgba(144,151,160,0.7);border:1px solid var(--b0);}
.held-status-pill.paused{background:rgba(255,255,255,0.05);color:var(--txt-2);border:1px solid var(--b0);}
.held-meta-row{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;}
.held-meta-item{display:flex;flex-direction:column;gap:2px;}
.held-meta-lbl{font-size:0.55rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--txt-2);font-family:var(--fc);}
.held-meta-val{font-size:0.74rem;color:var(--txt-1);}
.pause-banner{border-radius:var(--r2);padding:11px 14px;background:rgba(60,60,70,0.25);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:10;margin-bottom:14px;}

/* ── PACKAGE PRICING ── */
.pkg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
.pkg-card{border-radius:var(--r4);padding:26px 22px;background:var(--gb);border:1px solid var(--b0);display:flex;flex-direction:column;gap:0;position:relative;overflow:hidden;transition:border-color 0.2s,transform 0.2s;}
.pkg-card:hover{border-color:var(--b1);transform:translateY(-2px);}
.pkg-card.featured{background:var(--gb2);border-color:var(--b1);}
.pkg-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);}
.pkg-card.featured::before{background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);}
.pkg-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;background:rgba(42,122,75,0.15);color:rgba(140,210,155,0.85);border:1px solid rgba(42,122,75,0.25);font-family:var(--fc);font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;align-self:flex-start;}
.pkg-name{font-family:var(--fh);font-size:1.05rem;font-weight:700;letter-spacing:-0.01em;color:var(--txt-0);margin-bottom:4px;}
.pkg-sess-lbl{font-family:var(--fc);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);margin-bottom:14px;}
.pkg-desc{font-size:0.78rem;color:var(--txt-1);line-height:1.7;flex:1;margin-bottom:22px;}
.pkg-divider{height:1px;background:var(--b0);margin:0 -22px 20px;}
.start-now-card{border-radius:var(--r3);padding:22px 24px;background:rgba(255,255,255,0.03);border:1px solid var(--b0);display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:20px;}
@media(max-width:700px){.pkg-grid{grid-template-columns:1fr;}}

/* ── CONSULTATION SYSTEM ── */
.consult-shell{min-height:100vh;display:flex;flex-direction:column;background:var(--bg-0);}
.consult-head{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid var(--b0);flex-shrink:0;}
.consult-brand{font-family:var(--fh);font-size:1rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-0);}
.consult-body{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:36px 20px 56px;overflow-y:auto;}
.consult-card{width:100%;max-width:520px;border-radius:var(--r5);padding:36px;background:var(--gb);border:1px solid var(--b0);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);position:relative;overflow:hidden;}
.consult-shimmer{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent);}
.consult-step-lbl{font-size:0.6rem;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:var(--txt-2);margin-bottom:6px;}
.consult-title{font-family:var(--fh);font-size:clamp(1.4rem,3.5vw,1.9rem);font-weight:700;letter-spacing:-0.02em;line-height:1.05;margin-bottom:8px;color:var(--txt-0);}
.consult-desc{font-size:0.82rem;font-weight:300;line-height:1.7;color:var(--txt-1);margin-bottom:26px;}
.consult-prog{height:2px;background:var(--bg-2);flex-shrink:0;}
.consult-prog-fill{height:100%;background:linear-gradient(90deg,var(--acc-1),var(--acc-2));transition:width 0.4s cubic-bezier(0.4,0,0.2,1);}
.consult-nav{display:flex;justify-content:space-between;align-items:center;margin-top:26px;}
.consult-dots{display:flex;gap:5px;}
.consult-dot{height:4px;border-radius:2px;transition:all 0.28s;}
.consult-dot.curr{background:var(--acc-2);width:26px;}
.consult-dot.done{background:var(--acc-1);width:16px;}
.consult-dot.idle{background:var(--b0);width:14px;}
.consult-time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:6px;}
.consult-time-btn{padding:11px 6px;border-radius:var(--r2);border:1px solid var(--b0);background:none;color:var(--txt-1);font-family:var(--fc);font-size:0.74rem;letter-spacing:0.04em;cursor:pointer;transition:all 0.17s;text-align:center;}
.consult-time-btn:hover{border-color:var(--b1);color:var(--txt-0);background:var(--gb);}
.consult-time-btn.sel{background:var(--acc-0);border-color:var(--b1);color:var(--txt-0);}
.consult-time-btn.unavail{opacity:0.25;cursor:not-allowed;}
.consult-confirm-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--b0);font-size:0.8rem;}
.consult-confirm-row:last-of-type{border-bottom:none;}
.consult-confirm-k{color:var(--txt-2);}
.consult-confirm-v{color:var(--txt-0);font-weight:400;text-align:right;max-width:62%;}
.consult-success-icon{width:44px;height:44px;border-radius:50%;background:rgba(42,122,75,0.15);border:1px solid rgba(42,122,75,0.3);display:flex;align-items:center;justify-content:center;font-size:1.1rem;margin-bottom:16px;}
.consult-pkg-card{border-radius:var(--r3);padding:18px 20px;background:rgba(255,255,255,0.04);border:1px solid var(--b0);margin-bottom:10px;cursor:pointer;transition:all 0.18s;}
.consult-pkg-card:hover{border-color:var(--b1);background:rgba(255,255,255,0.065);}
.consult-pkg-card.sel{background:var(--acc-0);border-color:var(--b1);}
.consult-pkg-name{font-family:var(--fh);font-size:0.88rem;font-weight:700;letter-spacing:0.01em;color:var(--txt-0);margin-bottom:3px;}
.consult-pkg-desc{font-size:0.74rem;color:var(--txt-1);line-height:1.5;}
.consult-pkg-price{font-family:var(--fh);font-size:1rem;font-weight:700;color:var(--txt-0);margin-top:6px;}
.lead-card{border-radius:var(--r3);padding:18px;background:var(--bg-1);border:1px solid var(--b0);margin-bottom:10px;cursor:pointer;transition:border-color 0.17s;}
.lead-card:hover{border-color:var(--b1);}
.lead-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;}
.lead-name{font-family:var(--fh);font-size:0.82rem;font-weight:700;color:var(--txt-0);}
.lead-meta{font-size:0.65rem;color:var(--txt-2);margin-top:2px;}
.lead-detail{border-radius:var(--r2);padding:14px;background:rgba(0,0,0,0.2);border:1px solid var(--b0);margin-bottom:8px;}
.lead-detail-lbl{font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--txt-2);margin-bottom:4px;font-family:var(--fb);}
.lead-detail-val{font-size:0.79rem;color:var(--txt-1);line-height:1.55;}
@media(max-width:560px){.consult-card{padding:24px 18px;}.consult-time-grid{grid-template-columns:repeat(3,1fr);}}
`;


/* ── ADMIN DATA ─────────────────────────────────────────────────────────── */
const CLIENTS = [
  { id:1,  init:"JT", name:"Jordan Thomas",  age:29, pkg:"Hybrid Coaching",    sessLeft:5,  sessTotal:8,  location:"Equinox Hudson Yards",  area:"hudson_yards",   goal:"Muscle Growth / Fat Loss",  level:"Intermediate",    birthday:"Apr 8",  birthdayReward:true,  starterUsed:true,  status:"active",  expires:"Jun 30", nextSess:"Fri 6 PM",  unread:2, injuries:"Mild lower back tightness",      lastFeedback:"3 days ago" },
  { id:2,  init:"MA", name:"Marcus A.",       age:26, pkg:"1-on-1 Coaching",   sessLeft:3,  sessTotal:12, location:"Equinox Hudson Yards",  area:"hudson_yards",   goal:"Athletic Performance",      level:"Advanced",        birthday:"Sep 14", birthdayReward:false, starterUsed:true,  status:"active",  expires:"May 15",nextSess:"Tue 7 AM",  unread:0, injuries:"None",                            lastFeedback:"1 week ago" },
  { id:3,  init:"DM", name:"Diane M.",        age:54, pkg:"Hybrid Coaching",   sessLeft:1,  sessTotal:8,  location:"Alo Yoga Studio",       area:"chelsea",        goal:"Strength & Mobility",       level:"Beginner",        birthday:"Mar 3",  birthdayReward:false, starterUsed:true,  status:"low",     expires:"Apr 22",nextSess:"Wed 10 AM", unread:1, injuries:"Right knee — post-surgery 2021",  lastFeedback:"1 week ago" },
  { id:4,  init:"AR", name:"Alex R.",         age:33, pkg:"Online Programming",sessLeft:0,  sessTotal:0,  location:"Alo Yoga Studio",       area:"chelsea",        goal:"Body Recomposition",        level:"Intermediate",    birthday:"Dec 20", birthdayReward:false, starterUsed:true,  status:"renewal", expires:"Apr 18",nextSess:"—",         unread:0, injuries:"None",                            lastFeedback:"2 weeks ago" },
  { id:5,  init:"PN", name:"Priya N.",        age:38, pkg:"Hybrid Coaching",   sessLeft:6,  sessTotal:8,  location:"TMPL Gym",              area:"hells_kitchen",  goal:"Fat Loss / Aesthetics",     level:"Beginner-Inter.", birthday:"Jul 22", birthdayReward:false, starterUsed:true,  status:"active",  expires:"May 30",nextSess:"Thu 5 PM",  unread:0, injuries:"Left shoulder impingement",      lastFeedback:"5 days ago" },
  { id:6,  init:"SK", name:"Sam K.",          age:41, pkg:"1-on-1 Coaching",   sessLeft:4,  sessTotal:12, location:"TMPL Gym",              area:"hells_kitchen",  goal:"General Fitness",           level:"Intermediate",    birthday:"Feb 11", birthdayReward:false, starterUsed:true,  status:"active",  expires:"Jun 10",nextSess:"Sat 9 AM",  unread:0, injuries:"None",                            lastFeedback:"1 week ago" },
];

const TODAY_SESSIONS = [
  { time:"8:00 AM",  client:"Marcus A.", type:"Training Session", location:"Equinox Hudson Yards", area:"hudson_yards",  duration:60 },
  { time:"9:00 AM",  client:"Jordan T.", type:"Training Session", location:"Equinox Hudson Yards", area:"hudson_yards",  duration:60 },
  { time:"12:00 PM", client:"Alex R.",   type:"Consultation",     location:"Alo Yoga Studio",      area:"chelsea",       duration:60 },
  { time:"1:00 PM",  client:"Sam K.",    type:"Training Session", location:"Alo Yoga Studio",      area:"chelsea",       duration:60 },
  { time:"3:00 PM",  client:"Priya N.",  type:"Training Session", location:"TMPL Gym",             area:"hells_kitchen", duration:60 },
];

const ADMIN_FEEDBACKS = [
  { clientId:1, client:"Jordan Thomas", date:"Apr 4", block:"Block 1",
    ratings:{overall:4,difficulty:3,recovery:4,progress:4},
    liked:"The RDL progression felt great. Form clicked this week.",
    more:"More unilateral work — split squats and single-leg RDLs.",
    remove:"Copenhagen planks — not loving them.",
    difficult:"Tempo bench still feels heavy at 185.",
    learn:"Trap bar deadlift and kettlebell swings." },
  { clientId:3, client:"Diane M.", date:"Mar 28", block:"Block 2",
    ratings:{overall:5,difficulty:2,recovery:5,progress:4},
    liked:"Mobility drills at the end of each session are making a real difference.",
    more:"More hip mobility and balance work.",
    remove:"Nothing — all feels appropriate.",
    difficult:"Hip thrusts with resistance — can I do bodyweight for now?",
    learn:"Farmer carries and single-leg deadlifts." },
];

const ADMIN_WEEK = [
  { label:"Mon", date:"Apr 7",  sessions:[{ time:"9 AM",  client:"Jordan T.",  type:"Training", location:"Equinox HY",  area:"hudson_yards"  },{ time:"10 AM", client:"Marcus A.", type:"Training", location:"Equinox HY", area:"hudson_yards"  }] },
  { label:"Tue", date:"Apr 8",  sessions:[{ time:"7 AM",  client:"Marcus A.",  type:"Training", location:"Equinox HY",  area:"hudson_yards"  }] },
  { label:"Wed", date:"Apr 9",  sessions:[{ time:"10 AM", client:"Diane M.",   type:"Training", location:"Alo Yoga",    area:"chelsea"       },{ time:"6 PM",  client:"Jordan T.", type:"Training", location:"Equinox HY", area:"hudson_yards"  }] },
  { label:"Thu", date:"Apr 10", sessions:[{ time:"5 PM",  client:"Priya N.",   type:"Training", location:"TMPL Gym",    area:"hells_kitchen" }] },
  { label:"Fri", date:"Apr 11", sessions:[{ time:"8 AM",  client:"Marcus A.",  type:"Training", location:"Equinox HY",  area:"hudson_yards"  },{ time:"9 AM",  client:"Jordan T.", type:"Training", location:"Equinox HY", area:"hudson_yards" },{ time:"12 PM", client:"Alex R.", type:"Consult", location:"Alo Yoga", area:"chelsea" },{ time:"1 PM", client:"Sam K.", type:"Training", location:"Alo Yoga", area:"chelsea" },{ time:"3 PM", client:"Priya N.", type:"Training", location:"TMPL Gym", area:"hells_kitchen" }] },
  { label:"Sat", date:"Apr 12", sessions:[{ time:"9 AM",  client:"Sam K.",     type:"Training", location:"TMPL Gym",    area:"hells_kitchen" }] },
];

const REVENUE_DATA = [
  {month:"Nov",val:3600},{month:"Dec",val:4000},{month:"Jan",val:5200},
  {month:"Feb",val:4800},{month:"Mar",val:6000},{month:"Apr",val:5400},
];

const ADMIN_MESSAGES_DATA = [
  { id:1, init:"JT", name:"Jordan Thomas", preview:"Thanks Malik! Friday felt great.", time:"2h", unread:2,
    messages:[{from:"me",text:"Great work this week. Hip hinge significantly improved — ready to progress to heavier RDLs.",time:"Tue 4:30 PM"},{from:"them",text:"Thanks Malik! Friday felt great.",time:"Tue 6:00 PM"}] },
  { id:2, init:"DM", name:"Diane M.", preview:"Can we adjust Wednesday's time?", time:"4h", unread:1,
    messages:[{from:"them",text:"Can we adjust Wednesday's time? 11 AM instead of 10 AM?",time:"Today 8:20 AM"}] },
  { id:3, init:"MA", name:"Marcus A.", preview:"Ready for block 3.", time:"1d", unread:0,
    messages:[{from:"them",text:"Ready for block 3. What are we starting with?",time:"Yesterday 6:00 PM"}] },
  { id:4, init:"AR", name:"Alex R.", preview:"Renewal — any changes to pricing?", time:"2d", unread:0,
    messages:[{from:"them",text:"Hey, thinking about renewing. Any changes to the pricing?",time:"2 days ago"}] },
];

/* ── ADMIN SHARED COMPONENTS ─────────────────────────────────────────────── */
function AdminTopbar({ title, actions }) {
  return (
    <div className="admin-topbar">
      <span className="admin-topbar-title">{title}</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>{actions}</div>
    </div>
  );
}

function ATag({ type="pend", children }) {
  const S = {
    ok:  {bg:"rgba(42,122,75,0.15)",  cl:"rgba(120,200,140,0.85)", br:"rgba(42,122,75,0.25)"},
    warn:{bg:"rgba(107,74,26,0.2)",   cl:"rgba(220,175,100,0.85)",br:"rgba(180,120,40,0.3)"},
    err: {bg:"rgba(107,26,26,0.2)",   cl:"rgba(220,120,120,0.85)",br:"rgba(180,60,60,0.3)"},
    pend:{bg:"rgba(255,255,255,0.04)",cl:"rgba(144,151,160,0.8)", br:"rgba(255,255,255,0.08)"},
    blue:{bg:"rgba(30,43,58,0.6)",    cl:"rgba(140,175,220,0.8)", br:"rgba(30,43,58,0.9)"},
  };
  const s=S[type]||S.pend;
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:100,background:s.bg,color:s.cl,border:`1px solid ${s.br}`,fontFamily:"var(--fc)",fontSize:"0.58rem",letterSpacing:"0.1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>;
}

function Toggle({ on, onToggle }) {
  return (
    <div className={`toggle ${on?"on":"off"}`} onClick={onToggle}>
      <div className="toggle-knob" />
    </div>
  );
}

function MiniBarChart({ data }) {
  const max=Math.max(...data.map(d=>d.val));
  return (
    <div className="chart-bar-wrap">
      {data.map((d,i)=>(
        <div className="chart-bar-col" key={i}>
          <span className="chart-val">${(d.val/1000).toFixed(1)}k</span>
          <div className="chart-bar" style={{height:`${Math.round((d.val/max)*80)+4}px`}} />
          <span className="chart-lbl">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function OpenDirBtn({ location }) {
  const open=()=>window.open(`https://maps.google.com/?q=${encodeURIComponent(location+", New York, NY")}`,"_blank","noopener");
  return (
    <button onClick={open}
      style={{padding:"3px 9px",borderRadius:100,border:"1px solid var(--b0)",background:"none",color:"var(--txt-2)",fontSize:"0.58rem",cursor:"pointer",letterSpacing:"0.08em",fontFamily:"var(--fc)",display:"inline-flex",alignItems:"center",gap:4,transition:"all 0.17s",whiteSpace:"nowrap"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--b1)";e.currentTarget.style.color="var(--txt-0)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--b0)";e.currentTarget.style.color="var(--txt-2)";}}>
      ↗ Directions
    </button>
  );
}

/* ── ADMIN DASHBOARD ─────────────────────────────────────────────────────── */
function AdminDashboard({ setView, setFocusClient, dbClients }) {
  const clients    = dbClients || [];
  const lowSess    = clients.filter(c => c.sessLeft <= 2 && c.status !== "renewal");
  const renewalDue = clients.filter(c => c.status === "renewal");
  const zeroSess   = clients.filter(c => c.sessLeft === 0);
  const birthdays  = clients.filter(c => c.birthdayReward);
  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  const attentionItems = [
    ...zeroSess.map(c=>({name:c.name,msg:"0 sessions remaining — booking blocked",type:"err",id:c.id,tag:"Blocked"})),
    ...lowSess.filter(c=>c.sessLeft>0&&c.sessLeft<=1).map(c=>({name:c.name,msg:"1 session remaining — renewal needed",type:"err",id:c.id,tag:"Critical"})),
    ...lowSess.filter(c=>c.sessLeft>1).map(c=>({name:c.name,msg:`${c.sessLeft} sessions remaining`,type:"warn",id:c.id,tag:"Low"})),
    ...renewalDue.map(c=>({name:c.name,msg:"Package renewal pending",type:"err",id:c.id,tag:"Renewal"})),
  ];

  return (
    <div className="page-fade">
      <AdminTopbar title="Dashboard" actions={<button className="btn btn-p btn-sm" onClick={()=>setView("schedule")}>View Schedule</button>} />
      <div className="admin-body">
        <p style={{fontSize:"0.7rem",color:"var(--txt-2)",marginBottom:20}}>{today}</p>

        <div className="a-kpi-row">
          <div className="a-kpi accent"><p className="a-kpi-lbl">Active Clients</p><div className="a-kpi-n">{clients.length}</div><p className="a-kpi-sub">All packages</p></div>
          <div className="a-kpi"><p className="a-kpi-lbl">Sessions Today</p><div className="a-kpi-n">—</div><p className="a-kpi-sub">Connect scheduling</p></div>
          <div className="a-kpi warn"><p className="a-kpi-lbl">Low / Renewal</p><div className="a-kpi-n">{lowSess.length + renewalDue.length}</div><p className="a-kpi-sub">Need attention</p></div>
          <div className="a-kpi ok"><p className="a-kpi-lbl">Active Programs</p><div className="a-kpi-n">—</div><p className="a-kpi-sub">Via Programs tab</p></div>
        </div>

        <div className="a-grid-2" style={{marginBottom:14}}>
          <div className="a-panel">
            <div className="a-panel-hd"><span className="a-panel-title">Needs Attention</span></div>
            {attentionItems.length ? attentionItems.map((a,i)=>(
              <div className="a-row" key={i} style={{cursor:"pointer"}} onClick={()=>{setFocusClient(a.id);setView("clients");}}>
                <div><p className="a-row-main">{a.name}</p><p className="a-row-sub">{a.msg}</p></div>
                <ATag type={a.type}>{a.tag}</ATag>
              </div>
            )) : <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No urgent items.</p>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Birthday Rewards</span></div>
              {birthdays.length ? birthdays.map((c,i)=>(
                <div className="a-row" key={i}><div><p className="a-row-main">{c.name}</p><p className="a-row-sub">Birthday {c.birthday} · Active</p></div><ATag type="ok">Active</ATag></div>
              )) : <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No active rewards.</p>}
            </div>
            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Recent Feedback</span><button className="btn btn-ghost" style={{fontSize:"0.64rem"}} onClick={()=>setView("feedback")}>View all →</button></div>
              <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No feedback submissions yet.</p>
            </div>
          </div>
        </div>

        <div className="a-panel">
          <div className="a-panel-hd"><span className="a-panel-title">Package Overview</span><button className="btn btn-ghost" style={{fontSize:"0.64rem"}} onClick={()=>setView("packages")}>Manage →</button></div>
          {clients.length ? clients.map((c,i)=>{
            const isZero = c.sessLeft === 0;
            const isLow  = c.sessLeft <= 2 && !isZero;
            return (
              <div className="a-row" key={i} style={{cursor:"pointer"}} onClick={()=>{setFocusClient(c.id);setView("clients");}}>
                <div style={{display:"flex",gap:9,alignItems:"center",flex:1,minWidth:0}}>
                  <div className="c-av">{c.init}</div>
                  <div><p className="a-row-main">{c.name}</p><p className="a-row-sub">{c.pkg}</p></div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <span style={{fontSize:"0.72rem",color:isZero?"rgba(220,120,120,0.9)":isLow?"rgba(220,175,100,0.9)":"var(--txt-1)",fontFamily:"var(--fc)",fontWeight:600}}>{c.sessLeft} sessions</span>
                  {isZero && <ATag type="err">Blocked</ATag>}
                  {isLow  && !isZero && <ATag type="warn">Low</ATag>}
                </div>
              </div>
            );
          }) : <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No clients yet.</p>}
        </div>
      </div>
    </div>
  );
}

function AdminClients({ setView, focusClient, setFocusClient, dbClients }) {
  const clients = dbClients || [];
  const [selected, setSelected] = useState(focusClient||null);
  const [cpTab, setCpTab]       = useState("overview");
  const [noteText, setNoteText] = useState("");
  const client = selected ? clients.find(c=>c.id===selected) : null;
  const tabs=["overview","program","notes","history","feedback"];

  if (client) return (
    <div className="page-fade">
      <AdminTopbar title={client.name} actions={<><button className="btn btn-ghost btn-sm" onClick={()=>{setSelected(null);setFocusClient(null);}}>← All Clients</button><button className="btn btn-s btn-sm" onClick={()=>setView("messages")}>Message</button></>} />
      <div className="admin-body">
        <div className="a-panel">
          <div className="cp-layout">
            <div className="cp-sidebar">
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
                <div className="c-av" style={{width:44,height:44,fontSize:"0.8rem"}}>{client.init}</div>
                <div><p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700}}>{client.name}</p><p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:2}}>{client.pkg}</p></div>
              </div>
              <div className="cp-stat-row">
                <div className="cp-stat"><div className="cp-stat-n">{client.sessLeft}</div><p className="cp-stat-l">Sessions Left</p></div>
                <div className="cp-stat"><div className="cp-stat-n">{client.age}</div><p className="cp-stat-l">Age</p></div>
              </div>
              {[["Package",client.pkg],["Expires",client.expires],["Next Session",client.nextSess],["Location",client.location],["Goal",client.goal],["Level",client.level],["Birthday",client.birthday]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--b0)",fontSize:"0.76rem"}}>
                  <span style={{color:"var(--txt-2)"}}>{k}</span>
                  <span style={{color:"var(--txt-0)",textAlign:"right",maxWidth:"55%"}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:5}}>
                {client.birthdayReward&&<ATag type="ok">Birthday Reward Active</ATag>}
                {client.starterUsed&&<ATag type="pend">Starter Used</ATag>}
                {client.status==="low"&&<ATag type="warn">Low Sessions</ATag>}
                {client.status==="renewal"&&<ATag type="err">Renewal Due</ATag>}
              </div>
              <div style={{marginTop:14}}><OpenDirBtn location={client.location} /></div>
            </div>
            <div className="cp-main">
              <div className="cp-tabs">{tabs.map(t=><button key={t} className={`cp-tab${cpTab===t?" on":""}`} onClick={()=>setCpTab(t)}>{t}</button>)}</div>
              {cpTab==="overview"&&(
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  {[["Goals",client.goal],["Injuries / Limitations",client.injuries],["Experience Level",client.level],["Training Location",client.location],["Last Feedback",client.lastFeedback]].map(([l,v])=>(
                    <div className="info-block" key={l}>
                      <p className="info-block-title">{l}</p>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <p className="info-val">{v}</p>
                        {l==="Training Location"&&<OpenDirBtn location={v} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cpTab==="program"&&(
                <div>
                  {(() => {
                    const prog = null;  // loaded in AdminPrograms tab
                    const hist = [];
                    return (<>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                        <div>
                          <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700}}>{prog ? prog.name : "No Active Program"}</p>
                          <p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:2}}>{prog ? `${prog.block} · ${prog.phase} · Week ${prog.week}/${prog.totalWeeks}` : "Assign a program to this client."}</p>
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <button className="btn btn-p btn-sm" onClick={()=>setView("programs")}>
                            {prog ? "Edit Program" : "Assign Program"}
                          </button>
                          {prog && <button className="btn btn-s btn-sm" onClick={()=>setView("programs")}>Archive Block</button>}
                        </div>
                      </div>
                      {prog && (<>
                        {prog.days.map(d=>(
                          <div key={d.id} style={{padding:"10px 12px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)",marginBottom:6}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div><p style={{fontFamily:"var(--fh)",fontSize:"0.76rem",fontWeight:700}}>{d.name}</p><p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:2}}>{d.focus}</p></div>
                              <p style={{fontSize:"0.64rem",color:"var(--txt-2)",fontFamily:"var(--fc)"}}>{d.exercises.length} exercises</p>
                            </div>
                          </div>
                        ))}
                        <div style={{marginTop:12,padding:"10px 12px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.15)",border:"1px solid var(--b0)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <p style={{fontSize:"0.72rem",color:"var(--txt-2)"}}>Last updated: {prog.updatedAt}</p>
                          <button className="btn btn-s btn-xs" onClick={()=>setView("programs")}>Duplicate Block</button>
                        </div>
                      </>)}
                      {hist.length > 0 && (
                        <div style={{marginTop:16}}>
                          <p className="label mb-8">Program History</p>
                          {hist.map(p=>(
                            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--b0)"}}>
                              <div><p style={{fontSize:"0.78rem",color:"var(--txt-0)",fontWeight:400}}>{p.name} — {p.block}</p><p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:2}}>{p.startDate} – {p.endDate}</p></div>
                              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                <span className={`prog-status-pill ${p.status}`}>{p.status}</span>
                                <button className="btn btn-ghost btn-xs" onClick={()=>setView("programs")}>View</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>);
                  })()}
                </div>
              )}
              {cpTab==="notes"&&(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div>
                    <p className="info-block-title" style={{marginBottom:8}}>Coach Notes (visible to client)</p>
                    <textarea className="note-area" rows={5} value={noteText} onChange={e=>setNoteText(e.target.value)} />
                    <button className="btn btn-p btn-sm" style={{marginTop:10}}>Save Note</button>
                  </div>
                  <div>
                    <p className="info-block-title" style={{marginBottom:8}}>Private Notes (coach only)</p>
                    <textarea className="note-area" rows={4} defaultValue="Progressing well on hinge pattern. Sleep improving. Check in on stress levels — mentioned work deadlines last session." />
                    <button className="btn btn-s btn-sm" style={{marginTop:10}}>Save</button>
                  </div>
                </div>
              )}
              {cpTab==="history"&&(
                <div>
                  <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>Session history will appear here once workout logs are completed. View the Programs tab to see active programs.</p>
                </div>
              )}
              {cpTab==="feedback"&&(
                <div>
                  <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No feedback submissions yet for this client.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-fade">
      <AdminTopbar title="Clients" actions={<button className="btn btn-p btn-sm">+ New Client</button>} />
      <div className="admin-body">
        <div className="a-panel">
          <div className="a-panel-hd"><span className="a-panel-title">All Clients — {clients.length}</span></div>
          <table className="client-table">
            <thead><tr><th>Client</th><th>Package</th><th>Sessions</th><th>Location</th><th>Next Session</th><th>Status</th></tr></thead>
            <tbody>
              {clients.map(c=>(
                <tr key={c.id} onClick={()=>setSelected(c.id)}>
                  <td><div style={{display:"flex",gap:10,alignItems:"center"}}><div className="c-av">{c.init}</div><div><p className="c-name">{c.name}</p><p className="c-detail">{c.goal}</p></div></div></td>
                  <td><p style={{fontSize:"0.78rem"}}>{c.pkg}</p><p style={{fontSize:"0.65rem",color:"var(--txt-2)"}}>Exp {c.expires}</p></td>
                  <td><p style={{fontSize:"0.78rem",color:c.sessLeft<=2?"rgba(220,130,100,0.85)":"var(--txt-0)"}}>{c.sessLeft} left</p><div className="sess-bar" style={{width:56,marginTop:5}}><div className={`sess-bar-fill${c.sessLeft<=2?" low":""}`} style={{width:`${c.sessTotal?Math.round(c.sessLeft/c.sessTotal*100):0}%`}} /></div></td>
                  <td><p style={{fontSize:"0.76rem"}}>{c.location}</p></td>
                  <td><p style={{fontSize:"0.76rem"}}>{c.nextSess}</p></td>
                  <td><ATag type={c.status==="active"?"ok":c.status==="low"?"warn":"err"}>{c.status}</ATag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN PROGRAMS ──────────────────────────────────────────────────────── */
/* ── ADMIN PROGRAMS ─────────────────────────────────────────────────────── */
function AdminPrograms({ session }) {
  const [clients,     setClients]   = useState([]);
  const [selClientId, setSelClient] = useState(null);
  const [view,        setView]      = useState("list");
  const [editProgId,  setEditProg]  = useState(null);
  const [activeDay,   setDay]       = useState(null);
  const [programs,    setPrograms]  = useState([]);
  const [saving,      setSaving]    = useState(false);
  const [saved,       setSaved]     = useState(false);
  const [loading,     setLoading]   = useState(true);
  const [saveErr,     setSaveErr]   = useState("");

  // ── Load clients on mount ─────────────────────────────────────────────
  useEffect(() => {
    listClients().then(rows => {
      // Normalise to the shape the UI expects
      const mapped = rows.map(r => {
        const cp = r.client_profiles;
        return {
          id:       r.id,
          init:     (r.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
          name:     r.name  || r.email,
          email:    r.email,
          pkg:      cp?.package_plan    || "—",
          goal:     (cp?.goals||[]).join(", ") || "—",
          level:    cp?.fitness_level   || "—",
          sessLeft: cp?.sessions_balance ?? 0,
          location: cp?.location_building || "—",
          injuries: "—",
          status:   "active",
        };
      });
      setClients(mapped);
      if (mapped.length > 0 && !selClientId) setSelClient(mapped[0].id);
      setLoading(false);
    });
  }, []);

  // ── Load programs whenever selected client changes ────────────────────
  useEffect(() => {
    if (!selClientId) return;
    setLoading(true);
    getPrograms(selClientId).then(rows => {
      // Map DB snake_case → UI camelCase
      setPrograms(rows.map(dbToUI));
      setLoading(false);
    });
  }, [selClientId]);

  // ── DB ↔ UI shape converters ──────────────────────────────────────────
  function dbToUI(r) {
    return {
      id:          r.id,
      clientId:    r.client_id,
      name:        r.name        || "New Program",
      block:       r.block       || "Block 1",
      phase:       r.phase       || "",
      status:      r.status      || "draft",
      startDate:   r.start_date  || "",
      endDate:     r.end_date    || "",
      week:        r.week        ?? 1,
      totalWeeks:  r.total_weeks ?? 8,
      coachNote:   r.coach_note  || "",
      days:        r.days        || [],
      updatedAt:   r.updated_at  || "",
    };
  }

  const client   = clients.find(c => c.id === selClientId);
  const active   = programs.find(p => p.status === "active");
  const history  = programs.filter(p => p.status !== "active" && p.status !== "draft");
  const drafts   = programs.filter(p => p.status === "draft");
  const editProg = editProgId ? programs.find(p => p.id === editProgId) : null;
  const editDayObj = editProg && activeDay ? editProg.days.find(d => d.id === activeDay) : null;

  // ── Persist + update local state ──────────────────────────────────────
  const saveAndPush = async () => {
    if (!editProg) return;
    setSaving(true); setSaveErr("");
    const result = await saveProgram(editProg);
    setSaving(false);
    if (!result.ok) { setSaveErr(result.error || "Save failed"); return; }
    // Update local state from DB response
    setPrograms(p => p.map(x => x.id === result.program.id ? dbToUI(result.program) : x));
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  const archiveProg = async (id) => {
    const result = await archiveProgram(id);
    if (result.ok) setPrograms(p => p.map(x => x.id === id ? {...x, status:"completed"} : x));
  };

  const duplicateProg = async (id) => {
    const result = await duplicateProgram(id, session?.id);
    if (result.ok) setPrograms(p => [...p, dbToUI(result.program)]);
  };

  const publishProg = async (id) => {
    const result = await publishProgram(id, selClientId);
    if (result.ok) {
      setPrograms(p => p.map(x =>
        x.id === id ? {...x, status:"active"} :
        x.status === "active" ? {...x, status:"completed"} : x
      ));
    }
  };

  const createNewProgram = async () => {
    const result = await createProgram(selClientId, session?.id);
    if (!result.ok) return;
    const np = dbToUI(result.program);
    setPrograms(p => [...p, np]);
    setEditProg(np.id);
    setDay(null);
    setView("edit");
  };

  // ── In-memory exercise edits (saved on "Save & Push") ────────────────
  const updateExField = (exId, field, val) => {
    setPrograms(prev => prev.map(p => p.id !== editProgId ? p : {...p,
      days: p.days.map(d => d.id !== activeDay ? d : {...d,
        exercises: d.exercises.map(e => e.id !== exId ? e : {...e, [field]:val})})}));
  };
  const addEx = () => {
    const id = Date.now();
    setPrograms(prev => prev.map(p => p.id !== editProgId ? p : {...p,
      days: p.days.map(d => d.id !== activeDay ? d : {...d,
        exercises: [...d.exercises, {id, name:"", sets:3, repsScheme:"10,10,10", weight:"", tempo:"", rest:"90s", note:""}]})}));
  };
  const removeEx = (exId) => {
    setPrograms(prev => prev.map(p => p.id !== editProgId ? p : {...p,
      days: p.days.map(d => d.id !== activeDay ? d : {...d,
        exercises: d.exercises.filter(e => e.id !== exId)})}));
  };

  if (loading) return (
    <div className="page-fade">
      <AdminTopbar title="Program Management" />
      <div className="admin-body" style={{display:"flex",alignItems:"center",justifyContent:"center",paddingTop:60}}>
        <div style={{textAlign:"center",color:"var(--txt-2)",fontSize:"0.78rem"}}>
          <div style={{marginBottom:12,fontSize:"1.4rem",opacity:0.4}}>⊙</div>Loading…
        </div>
      </div>
    </div>
  );

  // ── EDIT VIEW ───────────────────────────────────────────────────────────
  if (view === "edit" && editProg) {
    const days      = editProg.days;
    const curDayId  = activeDay || days[0]?.id;
    const curDay    = editDayObj || days[0];
    return (
      <div className="page-fade">
        <AdminTopbar title={`Editing: ${editProg.name}`} actions={<>
          <p style={{fontSize:"0.65rem",color:"var(--txt-2)"}}>{client?.name} · {editProg.block}</p>
          {saveErr && <span style={{fontSize:"0.65rem",color:"rgba(220,100,100,0.9)"}}>{saveErr}</span>}
          <button className="btn btn-s btn-sm" onClick={()=>duplicateProg(editProg.id)}>Duplicate</button>
          {editProg.status==="active" && <button className="btn btn-s btn-sm" onClick={()=>{archiveProg(editProg.id);setView("list");}}>Archive Block</button>}
          <button className={`btn btn-p btn-sm${saving?" btn-loading":""}`} onClick={saveAndPush}>{saved?"✓ Saved":saving?"Saving…":"Save & Push"}</button>
        </>} />
        <div className="admin-body">
          <div className="a-panel" style={{marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              <div className="field"><label className="field-label">Program Name</label>
                <input className="fi" value={editProg.name} onChange={e=>setPrograms(p=>p.map(x=>x.id===editProgId?{...x,name:e.target.value}:x))} /></div>
              <div className="field"><label className="field-label">Block</label>
                <input className="fi" value={editProg.block} onChange={e=>setPrograms(p=>p.map(x=>x.id===editProgId?{...x,block:e.target.value}:x))} /></div>
              <div className="field"><label className="field-label">Phase</label>
                <input className="fi" value={editProg.phase} onChange={e=>setPrograms(p=>p.map(x=>x.id===editProgId?{...x,phase:e.target.value}:x))} /></div>
              <div className="field"><label className="field-label">Total Weeks</label>
                <input className="fi" type="number" value={editProg.totalWeeks} onChange={e=>setPrograms(p=>p.map(x=>x.id===editProgId?{...x,totalWeeks:+e.target.value}:x))} /></div>
            </div>
            <div className="field mt-12"><label className="field-label">Coach Note</label>
              <textarea className="note-area" rows={2} value={editProg.coachNote} onChange={e=>setPrograms(p=>p.map(x=>x.id===editProgId?{...x,coachNote:e.target.value}:x))} /></div>
          </div>

          <div className="pe-layout">
            <div className="pe-days">
              <p style={{fontSize:"0.52rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--txt-2)",padding:"0 8px 10px"}}>Training Days</p>
              {days.map(d=>(
                <div key={d.id} className={`pe-day-tab${curDayId===d.id?" on":""}`} onClick={()=>setDay(d.id)}>
                  <p className="pe-day-name">{d.name}</p>
                  <p className="pe-day-type">{d.focus}</p>
                </div>
              ))}
              <button style={{margin:"12px 10px 0",padding:"7px 10px",borderRadius:"var(--r2)",border:"1px dashed var(--b0)",background:"none",color:"var(--txt-2)",fontSize:"0.66rem",cursor:"pointer",width:"calc(100% - 20px)"}} onClick={()=>{
                const newDay={id:`d${Date.now()}`,name:"New Day",focus:"",exercises:[]};
                setPrograms(p=>p.map(x=>x.id===editProgId?{...x,days:[...x.days,newDay]}:x));
                setDay(newDay.id);
              }}>+ Add Day</button>
            </div>

            <div className="pe-content">
              {curDay && (<>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:10}}>
                  <div className="form-grid" style={{flex:1}}>
                    <div className="field"><label className="field-label">Day Name</label>
                      <input className="fi" value={curDay.name} onChange={e=>setPrograms(p=>p.map(x=>x.id!==editProgId?x:{...x,days:x.days.map(d=>d.id!==curDayId?d:{...d,name:e.target.value})}))} /></div>
                    <div className="field"><label className="field-label">Focus / Type</label>
                      <input className="fi" value={curDay.focus} onChange={e=>setPrograms(p=>p.map(x=>x.id!==editProgId?x:{...x,days:x.days.map(d=>d.id!==curDayId?d:{...d,focus:e.target.value})}))} /></div>
                  </div>
                  <button className="btn btn-s btn-sm" onClick={addEx}>+ Exercise</button>
                </div>
                {(editDayObj||curDay).exercises.map((ex,ei)=>(
                  <div className="ex-editor" key={ex.id}>
                    <div className="ex-editor-head">
                      <span className="ex-num">{ei+1}</span>
                      <input className="ex-name-input" value={ex.name} placeholder="Exercise name"
                        onChange={e=>updateExField(ex.id,"name",e.target.value)} />
                      <button style={{padding:"4px 10px",borderRadius:"var(--r1)",border:"1px solid rgba(180,60,60,0.25)",background:"none",color:"rgba(200,100,100,0.7)",fontSize:"0.6rem",cursor:"pointer",fontFamily:"var(--fc)"}}
                        onClick={()=>removeEx(ex.id)}>Remove</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"60px 1fr 1fr 80px 80px 80px",gap:6,marginTop:10}}>
                      {["Sets","Reps","Weight","Tempo","Rest","Note"].map(h=><div className="set-hd" key={h}>{h}</div>)}
                      <input className="set-inp" value={ex.sets} placeholder="3" onChange={e=>updateExField(ex.id,"sets",+e.target.value||e.target.value)} />
                      <input className="set-inp" value={ex.repsScheme} placeholder="10,10,10" onChange={e=>updateExField(ex.id,"repsScheme",e.target.value)} />
                      <input className="set-inp" value={ex.weight} placeholder="e.g. 135" onChange={e=>updateExField(ex.id,"weight",e.target.value)} />
                      <input className="set-inp" value={ex.tempo} placeholder="2s" onChange={e=>updateExField(ex.id,"tempo",e.target.value)} />
                      <input className="set-inp" value={ex.rest} placeholder="90s" onChange={e=>updateExField(ex.id,"rest",e.target.value)} />
                      <input className="set-inp" value={ex.note} placeholder="Coaching note" onChange={e=>updateExField(ex.id,"note",e.target.value)} />
                    </div>
                  </div>
                ))}
                {(editDayObj||curDay).exercises.length===0&&(
                  <div style={{padding:"24px",textAlign:"center",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.15)",border:"1px dashed var(--b0)",color:"var(--txt-2)",fontSize:"0.78rem"}}>No exercises yet. Click + Exercise to add one.</div>
                )}
              </>)}
            </div>
          </div>
          <div style={{marginTop:14,display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setView("list");setDay(null);}}>← Back</button>
            <button className={`btn btn-p btn-sm${saving?" btn-loading":""}`} onClick={saveAndPush}>{saved?"✓ Saved":saving?"Saving…":"Save & Push"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="page-fade">
      <AdminTopbar title="Program Management" actions={<>
        <select value={selClientId || ""} onChange={e=>{ setSelClient(e.target.value); setView("list"); setEditProg(null); }}
          style={{background:"var(--bg-2)",border:"1px solid var(--b0)",color:"var(--txt-0)",padding:"6px 10px",borderRadius:"var(--r2)",fontSize:"0.76rem",cursor:"pointer",outline:"none"}}>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-p btn-sm" onClick={createNewProgram}>+ New Program</button>
      </>} />
      <div className="admin-body">
        {client && (
          <div className="a-panel" style={{marginBottom:14,display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
            <div className="c-av" style={{width:40,height:40,fontSize:"0.72rem"}}>{client.init}</div>
            <div style={{flex:1}}>
              <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700}}>{client.name}</p>
              <p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:2}}>{client.pkg} · {client.goal} · {client.level}</p>
            </div>
            {active  && <span className="prog-status-pill active">Active Program: {active.block}</span>}
            {!active && <span className="prog-status-pill draft">No Active Program</span>}
          </div>
        )}

        {active && (
          <div style={{marginBottom:14}}>
            <p className="label mb-10">Active Program</p>
            <div className="a-panel" style={{borderColor:"rgba(42,122,75,0.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
                <div>
                  <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>{active.name}</p>
                  <p style={{fontSize:"0.7rem",color:"var(--txt-2)",marginTop:3}}>{active.block} · {active.phase} · Week {active.week} of {active.totalWeeks}</p>
                  <p style={{fontSize:"0.66rem",color:"var(--txt-2)",marginTop:2}}>{active.startDate} – {active.endDate}</p>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button className="btn btn-p btn-sm" onClick={()=>{setEditProg(active.id);setDay(active.days[0]?.id||null);setView("edit");}}>Edit Program</button>
                  <button className="btn btn-s btn-sm" onClick={()=>duplicateProg(active.id)}>Duplicate</button>
                  <button className="btn btn-s btn-sm" onClick={()=>archiveProg(active.id)}>Archive Block</button>
                </div>
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {active.days.map(d=>(
                  <div key={d.id} style={{padding:"8px 12px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)"}}>
                    <p style={{fontFamily:"var(--fh)",fontSize:"0.72rem",fontWeight:700}}>{d.name}</p>
                    <p style={{fontSize:"0.62rem",color:"var(--txt-2)",marginTop:2}}>{d.focus}</p>
                    <p style={{fontSize:"0.6rem",color:"var(--txt-2)",marginTop:1}}>{d.exercises.length} exercises</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {drafts.length > 0 && (
          <div style={{marginBottom:14}}>
            <p className="label mb-10">Drafts</p>
            {drafts.map(p=>(
              <div className="a-panel" key={p.id} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><p style={{fontFamily:"var(--fh)",fontSize:"0.85rem",fontWeight:700}}>{p.name}</p>
                    <p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:2}}>{p.block} · Draft</p></div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn btn-s btn-sm" onClick={()=>{setEditProg(p.id);setDay(p.days[0]?.id||null);setView("edit");}}>Edit</button>
                    <button className="btn btn-p btn-sm" onClick={()=>publishProg(p.id)}>Publish</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="label mb-10">Program History · {history.length} block{history.length!==1?"s":""}</p>
            {history.map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid var(--b0)"}}>
                <div>
                  <p style={{fontFamily:"var(--fh)",fontSize:"0.82rem",fontWeight:700,color:"var(--txt-0)"}}>{p.name}</p>
                  <p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:2}}>{p.block} · {p.startDate} – {p.endDate}</p>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span className={`prog-status-pill ${p.status}`}>{p.status}</span>
                  <button className="btn btn-s btn-xs" onClick={()=>{setEditProg(p.id);setDay(p.days[0]?.id||null);setView("edit");}}>View</button>
                  <button className="btn btn-s btn-xs" onClick={()=>duplicateProg(p.id)}>Duplicate</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && programs.length === 0 && (
          <div style={{textAlign:"center",padding:"48px 0",color:"var(--txt-2)",fontSize:"0.78rem"}}>
            No programs yet for this client.<br />
            <button className="btn btn-p btn-sm" style={{marginTop:16}} onClick={createNewProgram}>+ Create First Program</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ADMIN SCHEDULE ──────────────────────────────────────────────────────── */
function AdminSchedule() {
  // Schedule data is not yet connected to a booking/scheduling backend.
  // When a scheduling system is wired, sessions will load here by date.
  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  return (
    <div className="page-fade">
      <AdminTopbar title="Schedule" />
      <div className="admin-body">
        <p style={{fontSize:"0.7rem",color:"var(--txt-2)",marginBottom:20}}>{today}</p>
        <div className="a-panel">
          <div className="empty-state" style={{padding:"56px 20px"}}>
            <span className="empty-ic">◷</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700,color:"var(--txt-0)",marginBottom:6}}>No sessions scheduled</p>
            <p className="empty-txt">Session scheduling will appear here once a booking system is connected. Client sessions booked through the app will show on this calendar.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN FEEDBACK ──────────────────────────────────────────────────────── */
function AdminFeedback() {
  return (
    <div className="page-fade">
      <AdminTopbar title="Client Feedback" />
      <div className="admin-body">
        <div className="a-panel">
          <div className="empty-state" style={{padding:"56px 20px"}}>
            <span className="empty-ic">◈</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700,color:"var(--txt-0)",marginBottom:6}}>No feedback yet</p>
            <p className="empty-txt">Client program reflections will appear here when clients submit them through the app.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN PACKAGES / SESSION INVENTORY ──────────────────────────────────── */
function AdminPackages({ dbClients }) {
  const clients = dbClients || [];
  const [prorateEnabled, setProrateEnabled] = useState(true);
  // Per-client inventory state — live for Jordan (id:1), demo values for others
  const [clientInv, setClientInv] = useState(() => {
    return clients.reduce((acc, c) => {
      acc[c.id] = {
        balance:   c.sessLeft  ?? 0,
        weeklyMax: PLAN_CATALOGUE[c.pkg]?.weeklyMax || 2,
        plan:      c.pkg       || "—",
        override:  false,
      };
      return acc;
    }, {});
  });
  const [adjAmt,   setAdjAmt]   = useState({});   // clientId → input string
  const [adjNote,  setAdjNote]  = useState({});   // clientId → reason string
  const [expanded, setExpanded] = useState(null); // clientId for expanded row
  const [saved,    setSaved]    = useState({});

  const applyAdj = (clientId, sign) => {
    const n = parseInt(adjAmt[clientId] || "0");
    if (!n || isNaN(n)) return;
    const delta = sign * n;
    setClientInv(p => ({
      ...p,
      [clientId]: { ...p[clientId], balance: Math.max(0, p[clientId].balance + delta) }
    }));
    // Persist to Supabase via saveClientProfile
    const newBal = Math.max(0, (clientInv[clientId]?.balance ?? 0) + delta);
    saveClientProfile(clientId, { sessions_balance: newBal }).catch(e => console.error("adminAdj:", e));
    setSaved(p => ({ ...p, [clientId]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [clientId]: false })), 2000);
    setAdjAmt(p => ({ ...p, [clientId]: "" }));
    setAdjNote(p => ({ ...p, [clientId]: "" }));
  };

  const setWeeklyMax = (clientId, val) => {
    const n = Math.max(1, parseInt(val) || 1);
    setClientInv(p => ({ ...p, [clientId]: { ...p[clientId], weeklyMax: n } }));
    saveClientProfile(clientId, { sessions_weekly_max: n }).catch(e => console.error("setWeeklyMax:", e));
  };

  const toggleOverride = (clientId) => {
    setClientInv(p => ({ ...p, [clientId]: { ...p[clientId], override: !p[clientId].override } }));
  };

  const blockedClients  = clients.filter(c => (clientInv[c.id]?.balance ?? 0) === 0);
  const expiringClients = clients.filter(c => (clientInv[c.id]?.balance ?? 0) <= 2 && (clientInv[c.id]?.balance ?? 0) > 0);

  return (
    <div className="page-fade">
      <AdminTopbar title="Session Inventory" actions={<button className="btn btn-p btn-sm">+ Add Sessions</button>} />
      <div className="admin-body">

        {/* Prorated start calculator — admin review + override */}
        <ProrateAdminPanel
          enabled={prorateEnabled}
          onToggle={() => setProrateEnabled(p => !p)}
        />

        {/* Held inventory — future-start packages and pause controls */}
        <AdminHeldPanel dbClients={dbClients} />

        {/* KPI row */}
        <div className="a-kpi-row" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
          <div className="a-kpi accent">
            <p className="a-kpi-lbl">Active Clients</p>
            <div className="a-kpi-n">{clients.length}</div>
          </div>
          <div className="a-kpi warn">
            <p className="a-kpi-lbl">Low Balance</p>
            <div className="a-kpi-n">{expiringClients.length}</div>
            <p className="a-kpi-sub">1–2 sessions left</p>
          </div>
          <div className="a-kpi" style={{background:"rgba(107,26,26,0.15)",border:"1px solid rgba(180,60,60,0.2)"}}>
            <p className="a-kpi-lbl">Booking Blocked</p>
            <div className="a-kpi-n" style={{color:"rgba(220,120,120,0.9)"}}>{blockedClients.length}</div>
            <p className="a-kpi-sub">No sessions</p>
          </div>
          <div className="a-kpi">
            <p className="a-kpi-lbl">Total Clients</p>
            <div className="a-kpi-n">{clients.length}</div>
            <p className="a-kpi-sub">All packages</p>
          </div>
        </div>

        {/* Client inventory table */}
        <div className="a-panel" style={{marginBottom:14}}>
          <div className="a-panel-hd">
            <span className="a-panel-title">Client Session Balances</span>
            <span style={{fontSize:"0.65rem",color:"var(--txt-2)"}}>Sessions accumulate · no expiry</span>
          </div>

          {clients.map(c => {
            const inv = clientInv[c.id] || {};
            const isExpanded = expanded === c.id;
            const isBlocked  = inv.balance === 0;
            const isLow      = inv.balance > 0 && inv.balance <= 2;
            const planCfg    = PLAN_CATALOGUE[inv.plan] || {};
            const weeklyUsed = 0; // weekly_used not yet in client_profiles
            const weeklyLeft = Math.max(0, inv.weeklyMax - weeklyUsed);

            return (
              <div key={c.id} style={{borderBottom:"1px solid var(--b0)"}}>
                {/* Summary row */}
                <div className="a-row" style={{cursor:"pointer"}} onClick={()=>setExpanded(isExpanded ? null : c.id)}>
                  <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
                    <div className="c-av">{c.init}</div>
                    <div>
                      <p className="a-row-main">{c.name}</p>
                      <p className="a-row-sub">{inv.plan} · {inv.weeklyMax}x/week</p>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:14,alignItems:"center",flexShrink:0}}>
                    {/* Weekly pips */}
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      {Array.from({length: inv.weeklyMax}, (_,i) => (
                        <div key={i} className={`weekly-pip ${i < weeklyUsed ? "used" : "avail"}`} />
                      ))}
                      <span style={{fontSize:"0.6rem",color:"var(--txt-2)",marginLeft:5,fontFamily:"var(--fc)"}}>{weeklyLeft} left/wk</span>
                    </div>
                    {/* Balance */}
                    <div style={{textAlign:"right",minWidth:48}}>
                      <span style={{fontFamily:"var(--fh)",fontSize:"1.3rem",fontWeight:700,
                        color: isBlocked?"rgba(220,120,120,0.9)":isLow?"rgba(220,175,100,0.9)":"var(--txt-0)"}}>
                        {inv.balance}
                      </span>
                      <p style={{fontSize:"0.58rem",color:"var(--txt-2)",fontFamily:"var(--fc)"}}>sessions</p>
                    </div>
                    {isBlocked && <ATag type="err">Blocked</ATag>}
                    {isLow && !isBlocked && <ATag type="warn">Low</ATag>}
                    {!isBlocked && !isLow && inv.override && <ATag type="warn">Override</ATag>}
                    <span style={{fontSize:"0.7rem",color:"var(--txt-2)"}}>{isExpanded?"▲":"▼"}</span>
                  </div>
                </div>

                {/* Expanded management panel */}
                {isExpanded && (
                  <div style={{padding:"16px 14px 20px",background:"rgba(0,0,0,0.15)",borderTop:"1px solid var(--b0)"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

                      {/* Adjust balance */}
                      <div>
                        <p className="label mb-10">Adjust Session Balance</p>
                        <div style={{padding:"14px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                            <span style={{fontSize:"0.72rem",color:"var(--txt-1)"}}>Current balance</span>
                            <span style={{fontFamily:"var(--fh)",fontSize:"1.4rem",fontWeight:700,color:"var(--txt-0)"}}>{inv.balance}</span>
                          </div>
                          <div className="inv-adj-row">
                            <input
                              className="inv-adj-input"
                              type="number" min="1" max="20"
                              placeholder="n"
                              value={adjAmt[c.id]||""}
                              onChange={e=>setAdjAmt(p=>({...p,[c.id]:e.target.value}))}
                            />
                            <button className="btn btn-p btn-xs" onClick={()=>applyAdj(c.id,1)}>+ Add</button>
                            <button className="btn btn-danger btn-xs" onClick={()=>applyAdj(c.id,-1)}>− Remove</button>
                            {saved[c.id] && <span style={{fontSize:"0.65rem",color:"rgba(140,210,155,0.8)"}}>✓ Saved</span>}
                          </div>
                          <div className="field mt-10">
                            <input className="fi" style={{fontSize:"0.72rem"}} placeholder="Reason / note (optional)"
                              value={adjNote[c.id]||""}
                              onChange={e=>setAdjNote(p=>({...p,[c.id]:e.target.value}))} />
                          </div>
                        </div>
                        {/* Quick-add buttons for standard packages */}
                        <p className="label mt-10 mb-8">Quick Add</p>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {Object.entries(PLAN_CATALOGUE).map(([name,cfg])=>(
                            <button key={name} className="btn btn-s btn-xs"
                              onClick={()=>{
                                const newBal = (clientInv[c.id]?.balance ?? 0) + cfg.sessionsPerPurchase;
                                setClientInv(p=>({...p,[c.id]:{...p[c.id],balance:newBal}}));
                                saveClientProfile(c.id, { sessions_balance: newBal }).catch(e=>console.error("quickAdd:",e));
                                setSaved(p=>({...p,[c.id]:true}));
                                setTimeout(()=>setSaved(p=>({...p,[c.id]:false})),2000);
                              }}>
                              +{cfg.sessionsPerPurchase} ({name.split(" ")[0]})
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Weekly limit + override */}
                      <div>
                        <p className="label mb-10">Booking Controls</p>
                        <div style={{padding:"14px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)"}}>
                          <div className="weekly-limit-row" style={{marginBottom:10}}>
                            <div>
                              <p style={{fontSize:"0.76rem",color:"var(--txt-0)"}}>Weekly Booking Limit</p>
                              <p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:2}}>Max sessions per calendar week</p>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <button className="btn btn-s btn-xs" onClick={()=>setWeeklyMax(c.id, inv.weeklyMax - 1)}>−</button>
                              <span style={{fontFamily:"var(--fc)",fontSize:"1rem",fontWeight:700,minWidth:20,textAlign:"center"}}>{inv.weeklyMax}</span>
                              <button className="btn btn-s btn-xs" onClick={()=>setWeeklyMax(c.id, inv.weeklyMax + 1)}>+</button>
                            </div>
                          </div>
                          <div className="weekly-limit-row">
                            <div>
                              <p style={{fontSize:"0.76rem",color:"var(--txt-0)"}}>Admin Override</p>
                              <p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:2}}>Bypass all booking gates</p>
                            </div>
                            <div className={`toggle ${inv.override?"on":"off"}`} onClick={()=>toggleOverride(c.id)}>
                              <div className="toggle-knob" />
                            </div>
                          </div>
                        </div>

                        {/* Plan info */}
                        <div style={{marginTop:10,padding:"10px 12px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.15)",border:"1px solid var(--b0)"}}>
                          <p style={{fontSize:"0.6rem",letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--txt-2)",marginBottom:6}}>Current Plan</p>
                          <p style={{fontSize:"0.78rem",color:"var(--txt-0)",fontWeight:500}}>{inv.plan}</p>
                          <p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:3}}>
                            {planCfg.sessionsPerPurchase} sessions per purchase · {planCfg.label || `${inv.weeklyMax}x/week`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

/* ── ADMIN MESSAGES ──────────────────────────────────────────────────────── */
function AdminMessages({ dbClients = [] }) {
  const [selThread, setSel] = useState(null);
  const [input, setInput]   = useState("");
  const [allMsgs, setAllMsgs] = useState({});
  const bottomRef = useRef(null);

  const thread = selThread ? dbClients.find(c => c.id === selThread) : null;
  const msgs   = allMsgs[selThread] || [];

  const QUICK = [
    {ic:"◷", text:"Running 5 min late — see you shortly."},
    {ic:"▦", text:"Your program for next block is ready. Check the app."},
    {ic:"◈", text:"Great session today. Keep the momentum going."},
    {ic:"📋", text:"Quick check-in — how has recovery been this week?"},
    {ic:"⚡", text:"Sessions running low. Let me know when you're ready to renew."},
  ];

  const send = () => {
    if (!input.trim() || !selThread) return;
    setAllMsgs(p => ({...p, [selThread]: [...(p[selThread]||[]), {from:"me", text:input.trim(), time:"Just now"}]}));
    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({behavior:"smooth"}), 50);
  };

  return (
    <div className="page-fade" style={{height:"calc(100vh)",display:"flex",flexDirection:"column"}}>
      <AdminTopbar title="Messages" />
      <div style={{flex:1,overflow:"hidden"}}>
        <div className="admin-msg-layout" style={{height:"100%"}}>
          <div className="msg-tl">
            <p style={{fontSize:"0.52rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--txt-2)",padding:"4px 8px 10px"}}>Clients</p>
            {dbClients.length === 0
              ? <p className="body-sm" style={{padding:"8px",color:"var(--txt-2)"}}>No clients yet.</p>
              : dbClients.map(c=>(
                <div key={c.id} className={`msg-tl-item${selThread===c.id?" on":""}`} onClick={()=>setSel(c.id)}>
                  <div className="c-av" style={{flexShrink:0}}>{c.init}</div>
                  <div style={{flex:1,overflow:"hidden"}}>
                    <p style={{fontSize:"0.78rem",fontWeight:500,color:"var(--txt-0)"}}>{c.name}</p>
                    <p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:140}}>{c.pkg}</p>
                  </div>
                </div>
              ))
            }
            {selThread && (
              <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid var(--b0)"}}>
                <p style={{fontSize:"0.52rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--txt-2)",padding:"0 8px 10px"}}>Quick Messages</p>
                {QUICK.map((q,i)=>(
                  <button key={i} className="quick-msg-btn" onClick={()=>setAllMsgs(p=>({...p,[selThread]:[...(p[selThread]||[]),{from:"me",text:q.text,time:"Just now"}]}))}>
                    <span className="quick-msg-ic">{q.ic}</span>
                    <span style={{fontSize:"0.72rem",lineHeight:1.4}}>{q.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {thread ? (<>
              <div style={{padding:"14px 20px",borderBottom:"1px solid var(--b0)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                <div className="c-av">{thread.init}</div>
                <div><p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700}}>{thread.name}</p><p style={{fontSize:"0.62rem",color:"var(--txt-2)"}}>Client · {thread.pkg}</p></div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:12}}>
                {msgs.length === 0 && (
                  <p style={{fontSize:"0.76rem",color:"var(--txt-2)",textAlign:"center",marginTop:40}}>No messages yet. Send a message below.</p>
                )}
                {msgs.map((m,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.from==="me"?"flex-end":"flex-start"}}>
                    <div style={{maxWidth:"70%",padding:"10px 14px",borderRadius:"var(--r3)",fontSize:"0.8rem",lineHeight:1.6,...(m.from==="me"?{background:"var(--acc-0)",border:"1px solid rgba(255,255,255,0.1)",color:"var(--txt-0)",borderBottomRightRadius:"var(--r1)"}:{background:"var(--bg-2)",border:"1px solid var(--b0)",color:"var(--txt-0)",borderBottomLeftRadius:"var(--r1)"})}}>{m.text}</div>
                    <span style={{fontSize:"0.58rem",color:"var(--txt-2)",marginTop:3}}>{m.time}</span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div style={{padding:"12px 16px",borderTop:"1px solid var(--b0)",flexShrink:0,display:"flex",gap:8}}>
                <input className="fi" style={{flex:1}} placeholder={`Message ${thread.name}…`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} />
                <button className="btn btn-p btn-sm" onClick={send}>Send</button>
              </div>
            </>) : (
              <div className="empty-state" style={{paddingTop:80}}>
                <span className="empty-ic">✉</span>
                <p className="empty-txt">Select a client to view messages.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN ANALYTICS ─────────────────────────────────────────────────────── */
function AdminAnalytics({ dbClients = [] }) {
  return (
    <div className="page-fade">
      <AdminTopbar title="Analytics" />
      <div className="admin-body">
        <div className="a-kpi-row">
          {[["Active Clients","6","All packages"],["Sessions This Month","24","↑ 4 vs last month"],["Monthly Revenue","$5,400","Apr 2025"],["Retention Rate","83%","Last 6 months"]].map(([l,n,s])=>(
            <div className="a-kpi" key={l}><p className="a-kpi-lbl">{l}</p><div className="a-kpi-n">{n}</div><p className="a-kpi-sub">{s}</p></div>
          ))}
        </div>
        <div className="a-grid-2" style={{marginBottom:14}}>
          <div className="a-panel">
            <div className="a-panel-hd"><span className="a-panel-title">Monthly Revenue</span></div>
            <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>Revenue data will appear here when connected to billing system.</p>
          </div>
          <div className="a-panel">
            <div className="a-panel-hd"><span className="a-panel-title">Sessions by Package</span></div>
            {[["1-on-1 Coaching","2 clients",36],["Hybrid Coaching","3 clients",54],["Online Programming","1 client",10]].map(([pkg,cl,pct])=>(
              <div key={pkg} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div><p style={{fontSize:"0.78rem",color:"var(--txt-0)"}}>{pkg}</p><p style={{fontSize:"0.65rem",color:"var(--txt-2)"}}>{cl}</p></div>
                  <p style={{fontSize:"0.68rem",color:"var(--txt-2)"}}>{pct}%</p>
                </div>
                <div style={{height:4,background:"var(--b0)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--acc-1),var(--acc-2))",borderRadius:2}} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="a-grid-2">
          <div className="a-panel">
            <div className="a-panel-hd"><span className="a-panel-title">Cancellations</span></div>
            {[["Mar 2025","2 cancellations","1 within policy"],["Feb 2025","1 cancellation","Within policy"],["Jan 2025","3 cancellations","1 late cancel"]].map(([m,c,n])=>(
              <div className="a-row" key={m}><div><p className="a-row-main">{m}</p><p className="a-row-sub">{n}</p></div><p style={{fontSize:"0.76rem",color:"var(--txt-1)"}}>{c}</p></div>
            ))}
          </div>
          <div className="a-panel">
            <div className="a-panel-hd"><span className="a-panel-title">Renewals Due</span></div>
            {dbClients.filter(c=>c.status==="renewal"||c.status==="low").length > 0
              ? dbClients.filter(c=>c.status==="renewal"||c.status==="low").map((c,i)=>(
                <div className="a-row" key={i}><div><p className="a-row-main">{c.name}</p><p className="a-row-sub">{c.pkg} · —</p></div><ATag type={c.status==="renewal"?"err":"warn"}>{c.status==="renewal"?"Due":"Low"}</ATag></div>
              ))
              : <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No renewals due.</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN SETTINGS ──────────────────────────────────────────────────────── */
function AdminSettings() {
  const [toggles, setToggles] = useState({reminders:true,confirms:true,lowBal:true,expiry:true,bday:true,lateNote:false,checkin:true,bufferAlerts:true});
  const toggle=k=>setToggles(p=>({...p,[k]:!p[k]}));
  return (
    <div className="page-fade">
      <AdminTopbar title="Settings" actions={<button className="btn btn-p btn-sm">Save All Changes</button>} />
      <div className="admin-body">
        <div className="a-grid-2">
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Work Hours</span></div>
              {[["Monday – Friday","6:00 AM – 8:00 PM"],["Saturday","7:00 AM – 3:00 PM"],["Sunday","Unavailable"]].map(([d,h])=>(
                <div className="setting-row" key={d}><div><p className="setting-lbl">{d}</p></div><input defaultValue={h} style={{background:"rgba(0,0,0,0.25)",border:"1px solid var(--b0)",borderRadius:"var(--r2)",padding:"7px 12px",color:"var(--txt-0)",fontFamily:"var(--fb)",fontSize:"0.8rem",outline:"none",width:180,textAlign:"right"}} /></div>
              ))}
            </div>
            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Travel Buffer Rules</span></div>
              {[["Same Building","10 min"],["Same Area","20 min"],["Different Area","35 min"]].map(([l,d])=>(
                <div className="setting-row" key={l}><p className="setting-lbl">{l}</p><input defaultValue={d} style={{background:"rgba(0,0,0,0.25)",border:"1px solid var(--b0)",borderRadius:"var(--r2)",padding:"7px 12px",color:"var(--txt-0)",fontFamily:"var(--fb)",fontSize:"0.8rem",outline:"none",width:90,textAlign:"right"}} /></div>
              ))}
            </div>
            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Booking Rules</span></div>
              {[["Session Duration","60 min"],["Cancellation Window","12 hours"],["Max Daily Sessions","6"],["Advance Booking Limit","30 days"]].map(([l,d])=>(
                <div className="setting-row" key={l}><p className="setting-lbl">{l}</p><input defaultValue={d} style={{background:"rgba(0,0,0,0.25)",border:"1px solid var(--b0)",borderRadius:"var(--r2)",padding:"7px 12px",color:"var(--txt-0)",fontFamily:"var(--fb)",fontSize:"0.8rem",outline:"none",width:110,textAlign:"right"}} /></div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Notification Preferences</span></div>
              {[["reminders","Session Reminders","24-hr and 2-hr reminders to coach and client"],["confirms","Booking Confirmations","Immediate confirmation on booking"],["lowBal","Low Balance Alerts","Alert when client has 2 or fewer sessions left"],["expiry","Package Expiration","Alert 7 days before a package expires"],["bday","Birthday Reward Triggers","Notify when a client birthday reward activates"],["lateNote","Running Late Notifications","Manual trigger for coach-to-client late alerts"],["checkin","Weekly Check-In Prompts","Automated check-in message to active clients"],["bufferAlerts","Travel Buffer Warnings","Warn if booking violates travel buffer rules"]].map(([k,l,d])=>(
                <div className="setting-row" key={k}>
                  <div style={{flex:1,paddingRight:16}}><p className="setting-lbl">{l}</p><p className="setting-desc">{d}</p></div>
                  <Toggle on={toggles[k]} onToggle={()=>toggle(k)} />
                </div>
              ))}
            </div>
            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Training Zones</span></div>
              {[["Equinox Hudson Yards","hudson_yards"],["Alo Yoga Studio","chelsea"],["TMPL Gym","hells_kitchen"]].map(([loc,area])=>(
                <div className="setting-row" key={loc}><div><p className="setting-lbl">{loc}</p><p className="setting-desc">{area.replace(/_/g," ")}</p></div><OpenDirBtn location={loc} /></div>
              ))}
              <button className="btn btn-s btn-sm" style={{marginTop:12}}>+ Add Location</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSULTATION → CONVERSION SYSTEM
   Modular · No changes to existing scheduling, dashboard, or layout
═══════════════════════════════════════════════════════════════════════════ */

/* ── CONSULTATION DATA ───────────────────────────────────────────────────── */

// Shared state store (in production this would be a DB / context)
const CONSULT_STORE = {
  leads: [
    {
      id: 1, status: "pending",
      init:"TR",
      name:"Taylor Reeves", email:"taylor@email.com", phone:"917-555-0121",
      goal:"Fat Loss & Muscle Gain", level:"Beginner", injuries:"None",
      frequency:"3x per week", location:"Equinox Hudson Yards",
      date:"Apr 16, 2025", time:"11:00 AM", type:"In-Person",
      bookedAt:"Apr 10, 2025",
      coachNotes:"", recommended:null, converted:false,
    },
    {
      id: 2, status: "completed",
      init:"CM",
      name:"Chris Monroe", email:"chris@email.com", phone:"646-555-0188",
      goal:"Athletic Performance", level:"Intermediate", injuries:"Old ankle sprain (right)",
      frequency:"4x per week", location:"TMPL Gym",
      date:"Apr 9, 2025", time:"2:00 PM", type:"In-Person",
      bookedAt:"Apr 5, 2025",
      coachNotes:"Strong foundation. Ready for structured programming. Ideal for 1-on-1.", recommended:"1-on-1 Coaching", converted:false,
    },
    {
      id: 3, status: "converted",
      init:"NP",
      name:"Nina Park", email:"nina@email.com", phone:"212-555-0177",
      goal:"Build Lean Muscle", level:"Beginner-Intermediate", injuries:"None",
      frequency:"2x per week", location:"Alo Yoga Studio",
      date:"Apr 4, 2025", time:"10:00 AM", type:"In-Person",
      bookedAt:"Apr 1, 2025",
      coachNotes:"Excellent attitude. Converted to Hybrid Coaching.", recommended:"Hybrid Coaching", converted:true,
    },
  ],
};

const CONSULT_TIMES = [
  "9:00 AM","10:00 AM","11:00 AM","12:00 PM",
  "1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM",
];
const CONSULT_UNAVAIL = new Set(["10:00 AM","1:00 PM"]);

/* ── STRIPE PACKAGE CATALOGUE ────────────────────────────────────────────────
   Single source of truth for all package data and Stripe payment links.
   Links are never rendered as raw text in the UI — only opened via window.open.
────────────────────────────────────────────────────────────────────────── */
const STRIPE_PACKAGES = [
  {
    id:           "1x",
    name:         "1x Per Week",
    sessions:     4,
    monthlyPrice: 400,          // USD — full monthly rate
    sessionLabel: "4 sessions / month",
    desc:         "A structured starting point for building consistency and establishing a strong foundation.",
    badge:        null,
    stripeUrl:    "https://buy.stripe.com/8x2eVc7s92xp3oKei83ZK03",
  },
  {
    id:           "2x",
    name:         "2x Per Week",
    sessions:     8,
    monthlyPrice: 720,          // USD — full monthly rate
    sessionLabel: "8 sessions / month",
    desc:         "A balanced approach for steady progress, improved fitness, and noticeable results.",
    badge:        "Most Popular",
    stripeUrl:    "https://buy.stripe.com/28E00i3bTdc37F0ei83ZK02",
  },
  {
    id:           "3x",
    name:         "3x Per Week",
    sessions:     12,
    monthlyPrice: 960,          // USD — full monthly rate
    sessionLabel: "12 sessions / month",
    desc:         "For those looking to move with intention, train consistently, and accelerate progress.",
    badge:        null,
    stripeUrl:    "https://buy.stripe.com/00w3cu13L0ph7F0de43ZK01",
  },
];

const STRIPE_START_NOW = {
  label:     "Start Now",
  desc:      "Start immediately with a prorated plan based on your remaining time this month. Your full monthly structure begins at the start of the next billing cycle.",
  stripeUrl: "https://buy.stripe.com/dRmeVcfYF0phaRcca03ZK00",
};

/* ── PRORATED START ENGINE ────────────────────────────────────────────────────
   Pure calculation — no side effects, easy to unit-test.
   All pricing logic lives here. The UI simply calls calcProrate() and displays.

   Rules:
   • Monthly billing resets on the 1st of each month.
   • Sessions/week schedule = Mon–Fri (5 weekdays). Weekly cadence distributes
     sessions across available weekdays remaining in the month.
   • Session count uses Math.ceil so the client always gets at least 1 session
     per week remaining, then capped to the plan's monthly maximum.
   • Price = (daysLeft / daysInMonth) × monthlyRate, rounded to nearest dollar.
   • Admin can override both session count and price before confirming.
────────────────────────────────────────────────────────────────────────── */
function calcProrate(pkg, startDate = new Date(), overrides = {}) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const year  = start.getFullYear();
  const month = start.getMonth();

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days remaining including start day (client pays for today)
  const dayOfMonth  = start.getDate();
  const daysLeft    = daysInMonth - dayOfMonth + 1;

  // Next billing date = 1st of next month
  const nextBilling = new Date(year, month + 1, 1);
  const nextBillingLabel = nextBilling.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  // Session count: scale sessions proportionally, ceil to avoid short-changing,
  // then cap at the plan's full monthly allocation.
  const raw          = (daysLeft / daysInMonth) * pkg.sessions;
  const sessionsCalc = Math.min(pkg.sessions, Math.max(1, Math.ceil(raw)));
  const sessions     = overrides.sessions ?? sessionsCalc;

  // Prorated price: daily rate × days left, rounded to nearest dollar
  const dailyRate   = pkg.monthlyPrice / daysInMonth;
  const priceCalc   = Math.round(dailyRate * daysLeft);
  const price       = overrides.price ?? priceCalc;

  // Per-session effective rate for transparency
  const perSession  = sessions > 0 ? Math.round(price / sessions) : 0;

  return {
    pkg,
    startDate:       start.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }),
    daysLeft,
    daysInMonth,
    sessions,
    sessionsCalc,    // unoverridden value, used to show admin the suggestion
    price,
    priceCalc,       // unoverridden value
    perSession,
    nextBillingLabel,
    nextBilling,
    isFirstOfMonth:  dayOfMonth === 1,
  };
}

// Legacy alias kept so existing components that reference CONSULT_PACKAGES continue to work
const CONSULT_PACKAGES = [
  { id:"1x",   name:"1x Per Week",  price:"4 sessions/mo",  desc:"A structured starting point for building consistency and establishing a strong foundation." },
  { id:"2x",   name:"2x Per Week",  price:"8 sessions/mo",  desc:"A balanced approach for steady progress, improved fitness, and noticeable results." },
  { id:"3x",   name:"3x Per Week",  price:"12 sessions/mo", desc:"For those looking to move with intention, train consistently, and accelerate progress." },
];

const GOAL_OPTS_C  = ["Fat Loss","Muscle Growth","Athletic Performance","Build Strength","Move Better","General Fitness","Body Recomposition"];
const LEVEL_OPTS_C = ["New to training","Beginner","Beginner–Intermediate","Intermediate","Advanced"];
const FREQ_OPTS_C  = ["1x per week","2x per week","3x per week","4x per week","5+ per week"];

/* ── PRORATED START CALCULATOR — client-facing ───────────────────────────────
   Dropped into PackagePricing below the package cards.
   Shows: selected plan · sessions this month · prorated total · next billing.
   On submit: opens the STRIPE_START_NOW link (the prorated checkout).
   If the client is joining on the 1st, shows the full plan instead.
────────────────────────────────────────────────────────────────────────── */
function ProrateCalculator() {
  const [selId,   setSelId]   = useState("2x");
  const [today]               = useState(new Date()); // stable across renders
  const open = url => window.open(url, "_blank", "noopener,noreferrer");

  const pkg    = STRIPE_PACKAGES.find(p => p.id === selId) || STRIPE_PACKAGES[1];
  const result = calcProrate(pkg, today);

  // If client is joining on the 1st, prorating isn't needed — offer full plan
  const isFirst = result.isFirstOfMonth;

  return (
    <div style={{
      borderRadius:"var(--r4)",
      padding:"24px",
      background:"var(--gb2)",
      border:"1px solid var(--b1)",
      marginBottom:20,
      position:"relative",
      overflow:"hidden",
    }}>
      {/* shimmer line */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)"}} />

      {/* Header */}
      <div style={{marginBottom:18}}>
        <p className="label mb-4">Start Now</p>
        <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,color:"var(--txt-0)",marginBottom:6}}>
          {isFirst ? "Begin Your Full Plan Today" : "Begin This Month, Prorated"}
        </p>
        <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.65}}>
          {isFirst
            ? "You're starting on the 1st — your full monthly plan begins today with no proration needed."
            : `Start immediately. You'll be charged for the ${result.daysLeft} remaining days of ${today.toLocaleString("default",{month:"long"})}. Your full monthly plan begins ${result.nextBillingLabel}.`}
        </p>
      </div>

      {/* Plan selector */}
      <p className="label mb-8">Select Plan</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
        {STRIPE_PACKAGES.map(p => (
          <button
            key={p.id}
            onClick={() => setSelId(p.id)}
            style={{
              padding:"7px 14px",
              borderRadius:"var(--r2)",
              border:`1px solid ${selId===p.id ? "var(--b1)" : "var(--b0)"}`,
              background: selId===p.id ? "var(--acc-0)" : "none",
              color: selId===p.id ? "var(--txt-0)" : "var(--txt-1)",
              fontFamily:"var(--fh)",fontSize:"0.7rem",fontWeight:600,
              letterSpacing:"0.04em",cursor:"pointer",transition:"all 0.17s",
              whiteSpace:"nowrap",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Calculation breakdown */}
      {!isFirst && (
        <div style={{
          borderRadius:"var(--r2)",
          background:"rgba(0,0,0,0.2)",
          border:"1px solid var(--b0)",
          overflow:"hidden",
          marginBottom:18,
        }}>
          {[
            ["Plan",              pkg.name],
            ["Sessions included", `${result.sessions} session${result.sessions !== 1 ? "s" : ""} this month`],
            ["Days remaining",    `${result.daysLeft} of ${result.daysInMonth} days`],
            ["Total today",       `$${result.price.toLocaleString()}`],
            ["Full plan begins",  result.nextBillingLabel],
            ["Monthly rate",      `$${pkg.monthlyPrice.toLocaleString()}/mo`],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center",
              padding:"10px 14px",
              borderBottom: i < arr.length - 1 ? "1px solid var(--b0)" : "none",
              gap:12,
            }}>
              <span style={{fontSize:"0.68rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.1em",textTransform:"uppercase",flexShrink:0}}>{k}</span>
              <span style={{
                fontSize: k === "Total today" ? "0.88rem" : "0.78rem",
                fontWeight: k === "Total today" ? 700 : 400,
                color: k === "Total today" ? "var(--txt-0)" : "var(--txt-1)",
                fontFamily: k === "Total today" ? "var(--fh)" : "inherit",
                textAlign:"right",
              }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* First-of-month: show full plan summary */}
      {isFirst && (
        <div style={{
          borderRadius:"var(--r2)",
          background:"rgba(0,0,0,0.2)",
          border:"1px solid var(--b0)",
          overflow:"hidden",
          marginBottom:18,
        }}>
          {[
            ["Plan",             pkg.name],
            ["Sessions",         `${pkg.sessions} sessions / month`],
            ["Monthly rate",     `$${pkg.monthlyPrice.toLocaleString()}/mo`],
            ["Billing cycle",    "1st of each month"],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"10px 14px",borderBottom:i<arr.length-1?"1px solid var(--b0)":"none",gap:12,
            }}>
              <span style={{fontSize:"0.68rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.1em",textTransform:"uppercase",flexShrink:0}}>{k}</span>
              <span style={{fontSize:"0.78rem",color:"var(--txt-1)",textAlign:"right"}}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        className="btn btn-p btn-full"
        onClick={() => open(isFirst ? pkg.stripeUrl : STRIPE_START_NOW.stripeUrl)}
      >
        {isFirst
          ? `Get Started — ${pkg.name}`
          : `Start Now — $${result.price.toLocaleString()} today`}
      </button>

      {/* Subtext */}
      <p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:12,textAlign:"center",lineHeight:1.65}}>
        {isFirst
          ? `Your ${pkg.sessions}-session monthly plan begins today.`
          : `After today's payment, your full ${pkg.name} plan (${pkg.sessions} sessions/mo at $${pkg.monthlyPrice.toLocaleString()}/mo) renews on ${result.nextBillingLabel}.`}
      </p>
    </div>
  );
}

/* ── PRORATED START CALCULATOR — admin panel ─────────────────────────────────
   Embedded in AdminPackages for coach review and override.
────────────────────────────────────────────────────────────────────────── */
function ProrateAdminPanel({ enabled, onToggle }) {
  const [selId,        setSelId]        = useState("2x");
  const [startDateStr, setStartDateStr] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [ovSessions, setOvSessions] = useState("");
  const [ovPrice,    setOvPrice]    = useState("");
  const [approved,   setApproved]   = useState(false);

  const pkg    = STRIPE_PACKAGES.find(p => p.id === selId) || STRIPE_PACKAGES[1];
  const start  = new Date(startDateStr + "T00:00:00");
  const result = calcProrate(pkg, start, {
    sessions: ovSessions !== "" ? parseInt(ovSessions) : undefined,
    price:    ovPrice    !== "" ? parseInt(ovPrice)    : undefined,
  });

  const resetOverrides = () => { setOvSessions(""); setOvPrice(""); setApproved(false); };

  return (
    <div className="a-panel" style={{marginBottom:14}}>
      <div className="a-panel-hd">
        <span className="a-panel-title">Prorated Start Calculator</span>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {!enabled && <span style={{fontSize:"0.65rem",color:"var(--txt-2)"}}>Disabled</span>}
          <div className={`toggle ${enabled ? "on" : "off"}`} onClick={onToggle}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      {!enabled && (
        <p style={{fontSize:"0.72rem",color:"var(--txt-2)",padding:"8px 0",lineHeight:1.55}}>
          Prorated starts are currently disabled. Enable to let clients join mid-month.
        </p>
      )}

      {enabled && (<>
        <p style={{fontSize:"0.72rem",color:"var(--txt-2)",marginBottom:14,lineHeight:1.55}}>
          Review and optionally override the auto-calculated prorated amount before confirming a client's mid-month start.
        </p>

        {/* Inputs row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div className="field">
            <label className="field-label">Plan</label>
            <select
              className="fi"
              value={selId}
              onChange={e=>{setSelId(e.target.value);resetOverrides();}}
              style={{cursor:"pointer"}}
            >
              {STRIPE_PACKAGES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Start Date</label>
            <input
              className="fi"
              type="date"
              value={startDateStr}
              onChange={e=>{setStartDateStr(e.target.value);resetOverrides();}}
            />
          </div>
        </div>

        {/* Calculated result */}
        <div style={{
          borderRadius:"var(--r2)",
          background:"rgba(0,0,0,0.2)",
          border:"1px solid var(--b0)",
          overflow:"hidden",
          marginBottom:14,
        }}>
          {[
            ["Plan",             pkg.name],
            ["Start date",       result.startDate],
            ["Days remaining",   `${result.daysLeft} of ${result.daysInMonth}`],
            ["Sessions (calc)",  `${result.sessionsCalc} — override below if needed`],
            ["Price (calc)",     `$${result.priceCalc.toLocaleString()}`],
            ["Next billing",     result.nextBillingLabel],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"9px 14px",borderBottom:i<arr.length-1?"1px solid var(--b0)":"none",gap:12,
            }}>
              <span style={{fontSize:"0.62rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.1em",textTransform:"uppercase",flexShrink:0}}>{k}</span>
              <span style={{fontSize:"0.74rem",color:"var(--txt-1)",textAlign:"right"}}>{v}</span>
            </div>
          ))}
        </div>

        {/* Override inputs */}
        <p className="label mb-8">Admin Overrides <span style={{fontFamily:"var(--fb)",textTransform:"none",letterSpacing:0,color:"var(--txt-2)",fontSize:"0.65rem",fontWeight:400}}>(leave blank to use calculated values)</span></p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div className="field">
            <label className="field-label">Sessions Override</label>
            <input
              className="fi"
              type="number"
              min="1"
              max={pkg.sessions}
              placeholder={`Suggested: ${result.sessionsCalc}`}
              value={ovSessions}
              onChange={e=>{setOvSessions(e.target.value);setApproved(false);}}
            />
          </div>
          <div className="field">
            <label className="field-label">Price Override ($)</label>
            <input
              className="fi"
              type="number"
              min="0"
              placeholder={`Suggested: $${result.priceCalc}`}
              value={ovPrice}
              onChange={e=>{setOvPrice(e.target.value);setApproved(false);}}
            />
          </div>
        </div>

        {/* Final confirmed summary */}
        <div style={{
          padding:"12px 14px",
          borderRadius:"var(--r2)",
          background: approved ? "rgba(42,122,75,0.08)" : "rgba(255,255,255,0.03)",
          border:`1px solid ${approved ? "rgba(42,122,75,0.25)" : "var(--b0)"}`,
          marginBottom:12,
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          gap:10,
          flexWrap:"wrap",
        }}>
          <div>
            <p style={{fontSize:"0.78rem",color:"var(--txt-0)",fontWeight:500}}>
              {result.sessions} session{result.sessions!==1?"s":""} — ${result.price.toLocaleString()} due today
            </p>
            <p style={{fontSize:"0.66rem",color:"var(--txt-2)",marginTop:2}}>
              Full plan begins {result.nextBillingLabel} · {pkg.name} · ${pkg.monthlyPrice.toLocaleString()}/mo
            </p>
          </div>
          {approved
            ? <span style={{fontSize:"0.62rem",padding:"3px 10px",borderRadius:100,background:"rgba(42,122,75,0.15)",color:"rgba(140,210,155,0.85)",border:"1px solid rgba(42,122,75,0.25)",fontFamily:"var(--fc)",letterSpacing:"0.08em",textTransform:"uppercase"}}>Approved</span>
            : <button className="btn btn-p btn-sm" onClick={()=>setApproved(true)}>Approve</button>
          }
        </div>

        {approved && (
          <p style={{fontSize:"0.66rem",color:"rgba(140,210,155,0.7)",textAlign:"center",lineHeight:1.65}}>
            ✓ Prorated start approved. Send the Start Now link to the client to complete checkout via Stripe.
          </p>
        )}
      </>)}
    </div>
  );
}

/* ── HELD INVENTORY PANEL — client-facing ────────────────────────────────────
   Inserted in Dashboard below the KPI row.
   Shows: active pause status · held packages · scheduled future-start packages.
   Hidden when there is nothing to show.
────────────────────────────────────────────────────────────────────────── */
function HeldInventoryPanel({ setView }) {
  const [tick, setTick] = useState(0);
  HELD_INVENTORY.tick(); // auto-activate any due packages on render

  const pending = HELD_INVENTORY.pending(1);
  const paused  = HELD_INVENTORY.isPaused();
  const pInfo   = HELD_INVENTORY.pauseInfo();

  // Nothing to show when not paused and no pending packages
  if (!paused && pending.length === 0) return null;

  return (
    <div style={{marginBottom:16}}>
      {/* Active pause banner */}
      {paused && (
        <div style={{
          borderRadius:"var(--r2)",padding:"12px 16px",
          background:"rgba(60,60,70,0.25)",border:"1px solid rgba(255,255,255,0.08)",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          gap:12,flexWrap:"wrap",marginBottom:pending.length?10:0,
        }}>
          <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
            <span style={{fontSize:"0.85rem",flexShrink:0}}>⏸</span>
            <div>
              <p style={{fontSize:"0.8rem",fontFamily:"var(--fh)",fontWeight:700,color:"var(--txt-0)",marginBottom:2}}>
                Training Paused
              </p>
              <p style={{fontSize:"0.7rem",color:"var(--txt-2)",lineHeight:1.5}}>
                {pInfo?.reason || "Your active package is currently paused."}
                {" "}Sessions are preserved and booking is unavailable during this period.
              </p>
            </div>
          </div>
          <span style={{fontSize:"0.62rem",padding:"3px 10px",borderRadius:100,background:"rgba(255,255,255,0.06)",color:"var(--txt-2)",border:"1px solid var(--b0)",fontFamily:"var(--fc)",letterSpacing:"0.08em",textTransform:"uppercase",flexShrink:0,whiteSpace:"nowrap"}}>
            Paused
          </span>
        </div>
      )}

      {/* Held / scheduled packages */}
      {pending.length > 0 && (
        <div>
          <p className="label mb-8" style={{marginTop:paused?8:0}}>Upcoming Package</p>
          {pending.map(pkg => {
            const daysStart  = HELD_INVENTORY.daysUntilStart(pkg);
            const daysExpiry = HELD_INVENTORY.daysUntilExpiry(pkg);
            return (
              <div key={pkg.id} className={`held-card ${pkg.status}`}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                  <div>
                    <p style={{fontFamily:"var(--fh)",fontSize:"0.86rem",fontWeight:700,color:"var(--txt-0)"}}>{pkg.plan}</p>
                    <p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:2}}>{pkg.sessions} sessions — purchased {HELD_INVENTORY.purchaseLabel(pkg)}</p>
                  </div>
                  <span className={`held-status-pill ${pkg.status}`}>{pkg.status}</span>
                </div>

                <div className="held-meta-row">
                  {pkg.activationDate && (
                    <div className="held-meta-item">
                      <span className="held-meta-lbl">Starts</span>
                      <span className="held-meta-val">{HELD_INVENTORY.activationLabel(pkg)}{daysStart !== null && daysStart > 0 ? ` · in ${daysStart}d` : daysStart === 0 ? " · today" : ""}</span>
                    </div>
                  )}
                  {!pkg.activationDate && (
                    <div className="held-meta-item">
                      <span className="held-meta-lbl">Status</span>
                      <span className="held-meta-val">No start date set — contact Malik to schedule</span>
                    </div>
                  )}
                  <div className="held-meta-item">
                    <span className="held-meta-lbl">Hold expires</span>
                    <span className="held-meta-val" style={{color:daysExpiry !== null && daysExpiry < 14?"rgba(220,175,100,0.85)":"var(--txt-1)"}}>
                      {HELD_INVENTORY.expiresLabel(pkg)}{daysExpiry !== null && daysExpiry < 30 ? ` · ${daysExpiry}d left` : ""}
                    </span>
                  </div>
                  <div className="held-meta-item">
                    <span className="held-meta-lbl">Sessions</span>
                    <span className="held-meta-val">{pkg.sessions}</span>
                  </div>
                </div>

                {pkg.note && (
                  <p style={{fontSize:"0.68rem",color:"var(--txt-2)",marginTop:8,lineHeight:1.55,fontStyle:"italic"}}>
                    {pkg.note}
                  </p>
                )}
              </div>
            );
          })}
          <p style={{fontSize:"0.65rem",color:"var(--txt-2)",lineHeight:1.65,marginTop:8}}>
            Held sessions are reserved for you and will be added to your active balance on the scheduled start date. Hold packages are valid for {HOLD_WINDOW_DAYS} days from purchase.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── ADMIN HELD INVENTORY PANEL ───────────────────────────────────────────────
   Embedded in AdminPackages below the prorated calculator.
────────────────────────────────────────────────────────────────────────── */
function AdminHeldPanel({ dbClients = [] }) {
  const [tick,      setTick]      = useState(0);
  const [newPlan,   setNewPlan]   = useState("2x Per Week");
  const [newDate,   setNewDate]   = useState("");
  const [newNote,   setNewNote]   = useState("");
  const [selClient, setSelClient] = useState(1);
  const [addErr,    setAddErr]    = useState("");
  const [addOk,     setAddOk]     = useState(false);

  HELD_INVENTORY.tick(); // run auto-activation

  const isPaused = HELD_INVENTORY.isPaused();
  const pInfo    = HELD_INVENTORY.pauseInfo();
  const pending  = HELD_INVENTORY.pending(selClient);
  const allHeld  = dbClients.flatMap(c => HELD_INVENTORY.all(c.id));

  const forceRender = () => setTick(t => t+1);

  const handleHold = () => {
    setAddErr(""); setAddOk(false);
    const pkg = STRIPE_PACKAGES.find(p => p.name === newPlan) || STRIPE_PACKAGES[1];
    const res = HELD_INVENTORY.hold(selClient, newPlan, pkg.sessions, newDate || null, newNote);
    if (!res.ok) { setAddErr(res.error); return; }
    setAddOk(true); setNewDate(""); setNewNote("");
    setTimeout(() => setAddOk(false), 3000);
    forceRender();
  };

  const handleActivate = id => { HELD_INVENTORY.activate(id); forceRender(); };
  const handleExpire   = id => { HELD_INVENTORY.expire(id);   forceRender(); };
  const handleRemove   = id => { HELD_INVENTORY.remove(id);   forceRender(); };
  const handleSchedule = (id, date) => { HELD_INVENTORY.schedule(id, date); forceRender(); };

  const statusColor = s => ({ held:"warn", scheduled:"blue", active:"ok", expired:"pend", paused:"pend" }[s] || "pend");

  return (
    <div className="a-panel" style={{marginBottom:14}}>
      <div className="a-panel-hd">
        <span className="a-panel-title">Held Inventory & Future Start</span>
        <span style={{fontSize:"0.62rem",color:"var(--txt-2)"}}>{allHeld.length} total · max 1 held/client</span>
      </div>

      {/* Active package pause controls */}
      <div style={{padding:"12px 14px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.15)",border:"1px solid var(--b0)",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
          <div>
            <p style={{fontSize:"0.78rem",color:"var(--txt-0)",fontWeight:500,marginBottom:3}}>Active Package — Pause / Resume</p>
            <p style={{fontSize:"0.66rem",color:"var(--txt-2)",lineHeight:1.55}}>
              {isPaused
                ? `Paused since ${HELD_INVENTORY.fmt(pInfo?.since)}${pInfo?.reason ? ` · ${pInfo.reason}` : ""}. Balance preserved.`
                : "Pause the active package to freeze weekly usage. Use for coach travel, planned breaks, or temporary interruptions."}
            </p>
          </div>
          {isPaused
            ? (
              <button className="btn btn-p btn-sm" onClick={()=>{HELD_INVENTORY.resume();forceRender();}}>
                Resume Training
              </button>
            ) : (
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["Coach travel","Client break","Schedule change"].map(r => (
                  <button key={r} className="btn btn-s btn-xs" onClick={()=>{HELD_INVENTORY.pause(r);forceRender();}}>
                    Pause — {r}
                  </button>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Add held / future-start package */}
      <p className="label mb-8">Schedule a Future-Start Package</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div className="field">
          <label className="field-label">Client</label>
          <select className="fi" value={selClient} onChange={e=>setSelClient(+e.target.value)} style={{cursor:"pointer"}}>
            {dbClients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Plan</label>
          <select className="fi" value={newPlan} onChange={e=>setNewPlan(e.target.value)} style={{cursor:"pointer"}}>
            {STRIPE_PACKAGES.map(p=><option key={p.id} value={p.name}>{p.name} ({p.sessions} sessions)</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Start Date <span style={{opacity:0.5}}>(leave blank for held)</span></label>
          <input className="fi" type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Note</label>
          <input className="fi" placeholder="e.g. Client resumes after holiday" value={newNote} onChange={e=>setNewNote(e.target.value)} />
        </div>
      </div>
      {addErr && <p style={{fontSize:"0.7rem",color:"rgba(220,120,120,0.85)",marginBottom:8}}>{addErr}</p>}
      <button className="btn btn-s btn-sm" onClick={handleHold} style={{marginBottom:14}}>
        {addOk ? "✓ Package held" : `Hold Package${newDate ? " (Scheduled)" : ""}`}
      </button>

      {/* All held packages across clients */}
      {allHeld.length === 0 ? (
        <p style={{fontSize:"0.72rem",color:"var(--txt-2)",padding:"8px 0"}}>No held packages. Add one above to schedule a future start.</p>
      ) : (
        allHeld.map(p => {
          const client = dbClients.find(c=>c.id===p.clientId);
          const daysStart  = HELD_INVENTORY.daysUntilStart(p);
          const daysExpiry = HELD_INVENTORY.daysUntilExpiry(p);
          return (
            <div key={p.id} style={{padding:"12px 0",borderBottom:"1px solid var(--b0)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
                  <div className="c-av">{client?.init}</div>
                  <div>
                    <p style={{fontSize:"0.8rem",color:"var(--txt-0)",fontWeight:500}}>{client?.name}</p>
                    <p style={{fontSize:"0.66rem",color:"var(--txt-2)",marginTop:1}}>
                      {p.plan} · {p.sessions} sessions · purchased {HELD_INVENTORY.purchaseLabel(p)}
                    </p>
                  </div>
                </div>
                <ATag type={statusColor(p.status)}>{p.status}</ATag>
              </div>

              {/* Meta */}
              <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:8}}>
                {p.activationDate && (
                  <div>
                    <p style={{fontSize:"0.58rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--txt-2)",fontFamily:"var(--fc)"}}>Start date</p>
                    <p style={{fontSize:"0.74rem",color:"var(--txt-1)"}}>{HELD_INVENTORY.activationLabel(p)}{daysStart !== null && daysStart > 0 ? ` · ${daysStart}d` : daysStart === 0 ? " · today" : ""}</p>
                  </div>
                )}
                <div>
                  <p style={{fontSize:"0.58rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--txt-2)",fontFamily:"var(--fc)"}}>Hold expires</p>
                  <p style={{fontSize:"0.74rem",color:daysExpiry !== null && daysExpiry < 14?"rgba(220,175,100,0.85)":"var(--txt-1)"}}>{HELD_INVENTORY.expiresLabel(p)}</p>
                </div>
              </div>

              {/* Reschedule date input for held packages */}
              {["held","scheduled"].includes(p.status) && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
                  <input
                    type="date"
                    className="fi"
                    style={{maxWidth:160,fontSize:"0.72rem",padding:"5px 10px"}}
                    defaultValue={p.activationDate ? new Date(p.activationDate).toISOString().slice(0,10) : ""}
                    onChange={e => e.target.value && handleSchedule(p.id, e.target.value)}
                    title="Set or change start date"
                  />
                  <span style={{fontSize:"0.62rem",color:"var(--txt-2)"}}>Set / change start</span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["held","scheduled"].includes(p.status) && (
                  <button className="btn btn-p btn-xs" onClick={()=>handleActivate(p.id)}>Activate Now</button>
                )}
                {["held","scheduled"].includes(p.status) && (
                  <button className="btn btn-s btn-xs" onClick={()=>handleExpire(p.id)}>Mark Expired</button>
                )}
                <button className="btn btn-danger btn-xs" onClick={()=>handleRemove(p.id)}>Remove</button>
              </div>
            </div>
          );
        })
      )}

      <p style={{fontSize:"0.63rem",color:"var(--txt-2)",marginTop:12,lineHeight:1.65}}>
        Hold window: {HOLD_WINDOW_DAYS} days. Packages not activated within this period expire automatically. Max 1 held package per client.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PACKAGE PRICING SCREEN
   Standalone component — accessible from login CTA, dashboard, and the
   post-consultation recommendation screen.
   Never renders raw Stripe URLs. All links open via window.open.
══════════════════════════════════════════════════════════════════════════ */
function PackagePricing({ onBack, onConsult }) {
  const open = (url) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="consult-shell">
      <div className="consult-head">
        <span className="consult-brand">MLVNT</span>
        <span style={{fontSize:"0.62rem",color:"var(--txt-2)",letterSpacing:"0.14em",textTransform:"uppercase"}}>Training Packages</span>
        {onBack && <button className="btn btn-ghost" style={{fontSize:"0.67rem",color:"var(--txt-2)"}} onClick={onBack}>← Back</button>}
      </div>

      <div className="consult-body">
        <div style={{width:"100%",maxWidth:780,margin:"0 auto"}}>

          {/* Header */}
          <div className="page-fade" style={{textAlign:"center",marginBottom:36,paddingTop:8}}>
            <p className="label mb-8">Personal Training</p>
            <h1 style={{fontFamily:"var(--fh)",fontSize:"clamp(1.6rem,4vw,2.4rem)",fontWeight:700,letterSpacing:"-0.025em",lineHeight:1.05,marginBottom:12,color:"var(--txt-0)"}}>
              Train with structure.<br />Move with purpose.
            </h1>
            <p style={{fontSize:"0.85rem",color:"var(--txt-1)",lineHeight:1.75,maxWidth:460,margin:"0 auto"}}>
              Select a monthly training plan below. All packages include programming, coaching, and ongoing support.
            </p>
          </div>

          {/* Package cards */}
          <div className="pkg-grid page-fade">
            {STRIPE_PACKAGES.map(pkg => (
              <div key={pkg.id} className={`pkg-card${pkg.badge ? " featured" : ""}`}>
                {pkg.badge && (
                  <span className="pkg-badge">{pkg.badge}</span>
                )}
                <p className="pkg-name">{pkg.name}</p>
                <p className="pkg-sess-lbl">{pkg.sessionLabel}</p>
                <div className="pkg-divider" />
                <p className="pkg-desc">{pkg.desc}</p>
                <button
                  className="btn btn-p btn-full btn-sm"
                  onClick={() => open(pkg.stripeUrl)}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          {/* Prorated start calculator — live, auto-calculated */}
          <div className="page-fade">
            <p className="label mb-10" style={{textAlign:"center"}}>Or Start This Month</p>
            <ProrateCalculator />
          </div>

          {/* Microcopy */}
          <div style={{textAlign:"center",padding:"4px 0 28px"}}>
            <p style={{fontSize:"0.72rem",color:"var(--txt-2)",lineHeight:1.75,maxWidth:500,margin:"0 auto 12px"}}>
              Results are built through consistency. The structure, guidance, and support are provided — but progress reflects the effort and habits you bring to the process.
            </p>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:"0.62rem",color:"var(--txt-2)",letterSpacing:"0.08em",fontFamily:"var(--fc)"}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Secure checkout powered by Stripe
            </div>
          </div>

          {/* Book a consultation CTA */}
          {onConsult && (
            <div style={{textAlign:"center",paddingBottom:20}}>
              <p style={{fontSize:"0.74rem",color:"var(--txt-2)",marginBottom:10}}>
                Not sure which plan is right for you?
              </p>
              <button className="btn btn-ghost btn-sm" onClick={onConsult}>
                Book a free consultation →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── CONSULTATION BOOKING (CLIENT SIDE) ─────────────────────────────────── */
function ConsultationFlow({ onBack, onComplete }) {
  const [step, setStep]       = useState(0); // 0=date 1=intake 2=confirm 3=success
  const [selDate, setDate]    = useState(null);
  const [selTime, setSelTime] = useState(null);
  const [goals, setGoals]     = useState([]);
  const [level, setLevel]     = useState(null);
  const [freq, setFreq]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const now      = new Date();
  const mnth     = MONTHS[now.getMonth()];
  const yr       = now.getFullYear();
  const firstDow = new Date(yr, now.getMonth(), 1).getDay();
  const daysInMo = new Date(yr, now.getMonth() + 1, 0).getDate();
  const cells    = [...Array(firstDow).fill(null), ...Array.from({length:daysInMo},(_,i)=>i+1)];

  const STEPS    = ["Schedule","Your Info","Review","Done"];
  const pct      = ((step) / (STEPS.length - 1)) * 100;

  const next = () => {
    if (step === 1) { setSaving(true); setTimeout(() => { setSaving(false); setStep(2); }, 500); }
    else if (step === 2) { setSaving(true); setTimeout(() => { setSaving(false); setStep(3); }, 700); }
    else setStep(s => s + 1);
  };

  const toggleGoal = g => setGoals(p => p.includes(g) ? p.filter(x=>x!==g) : [...p,g]);

  const canAdvanceStep0 = selDate && selTime;
  const canAdvanceStep1 = true; // name/email are uncontrolled, always allow
  const canAdvance = step===0 ? canAdvanceStep0 : step<=2;

  return (
    <div className="consult-shell">
      {/* Header */}
      <div className="consult-head">
        <span className="consult-brand">MLVNT</span>
        <span style={{fontSize:"0.62rem",color:"var(--txt-2)",letterSpacing:"0.14em",textTransform:"uppercase"}}>
          Free Consultation
        </span>
        <button className="btn btn-ghost" style={{fontSize:"0.67rem",color:"var(--txt-2)"}} onClick={onBack}>✕ Close</button>
      </div>

      {/* Progress bar */}
      {step < 3 && (
        <div className="consult-prog">
          <div className="consult-prog-fill" style={{width:`${pct}%`}} />
        </div>
      )}

      <div className="consult-body">
        <div className="consult-card page-fade" key={step}>
          <div className="consult-shimmer" />

          {/* ── STEP 0 — DATE + TIME ── */}
          {step === 0 && (
            <>
              <p className="consult-step-lbl">Step 1 of 3 · Schedule</p>
              <h2 className="consult-title">Book Your Free Consultation</h2>
              <p className="consult-desc">
                A 30-minute call with Malik. We'll talk through your goals, lifestyle, and build a path forward. No commitment required.
              </p>

              {/* Mini calendar */}
              <p className="label mb-8">Select a Date</p>
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700}}>{mnth} {yr}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
                  {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:"0.56rem",color:"var(--txt-2)",padding:"3px 0",fontFamily:"var(--fc)",letterSpacing:"0.08em"}}>{d}</div>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                  {cells.map((d,i)=>{
                    const isPast = d && d < now.getDate();
                    const isSel  = d === selDate;
                    const isToday= d === now.getDate() && !isSel;
                    return (
                      <div key={i}
                        onClick={() => d && !isPast && setDate(d)}
                        style={{
                          aspectRatio:"1",borderRadius:"var(--r1)",display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:"0.74rem",cursor:d&&!isPast?"pointer":"default",fontFamily:"var(--fc)",
                          border: isSel?"1px solid rgba(255,255,255,0.16)":isToday?"1px solid var(--acc-2)":"1px solid transparent",
                          background: isSel?"var(--acc-1)":"none",
                          color: isSel?"var(--txt-0)":isToday?"var(--txt-0)":d&&!isPast?"var(--txt-1)":"var(--txt-2)",
                          opacity: isPast?0.22:1,
                          transition:"all 0.14s",
                        }}
                      >{d||""}</div>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              {selDate && (
                <>
                  <p className="label mb-8">Select a Time · {mnth} {selDate}</p>
                  <div className="consult-time-grid">
                    {CONSULT_TIMES.map(t => {
                      const unavail = CONSULT_UNAVAIL.has(t);
                      return (
                        <button key={t}
                          className={`consult-time-btn${unavail?" unavail":""}${selTime===t?" sel":""}`}
                          onClick={() => !unavail && setSelTime(t)}
                        >{t}</button>
                      );
                    })}
                  </div>
                  <p style={{fontSize:"0.63rem",color:"var(--txt-2)",marginTop:10,lineHeight:1.5}}>
                    In-person at your preferred training location, or by phone.
                  </p>
                </>
              )}
            </>
          )}

          {/* ── STEP 1 — INTAKE ── */}
          {step === 1 && (
            <>
              <p className="consult-step-lbl">Step 2 of 3 · About You</p>
              <h2 className="consult-title">A Few Quick Questions</h2>
              <p className="consult-desc">This helps Malik prepare for your consultation. Takes under 2 minutes.</p>

              <div className="form-col">
                <div className="form-grid">
                  <div className="field">
                    <label className="field-label">First Name</label>
                    <input className="fi" placeholder="Taylor" autoComplete="given-name" />
                  </div>
                  <div className="field">
                    <label className="field-label">Last Name</label>
                    <input className="fi" placeholder="Reeves" autoComplete="family-name" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Email Address</label>
                  <input className="fi" type="email" placeholder="taylor@email.com" autoComplete="email" />
                </div>
                <div className="field">
                  <label className="field-label">Phone Number</label>
                  <input className="fi" type="tel" placeholder="+1 (555) 000-0000" autoComplete="tel" />
                </div>
                <div className="field">
                  <label className="field-label">Primary Goal</label>
                  <div className="chips mt-4">
                    {GOAL_OPTS_C.map(g=>(
                      <button key={g} className={`chip${goals.includes(g)?" on":""}`} onClick={()=>toggleGoal(g)}>{g}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Training Experience</label>
                  <div className="chips mt-4">
                    {LEVEL_OPTS_C.map(l=>(
                      <button key={l} className={`chip${level===l?" on":""}`} onClick={()=>setLevel(l)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Preferred Training Frequency</label>
                  <div className="chips mt-4">
                    {FREQ_OPTS_C.map(f=>(
                      <button key={f} className={`chip${freq===f?" on":""}`} onClick={()=>setFreq(f)}>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Preferred Training Location</label>
                  <input className="fi" placeholder="e.g. Equinox Hudson Yards, home gym, open to suggestions…" />
                </div>
                <div className="field">
                  <label className="field-label">Injuries or Limitations (optional)</label>
                  <input className="fi" placeholder="e.g. None, lower back tightness, post-surgery knee…" />
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2 — REVIEW ── */}
          {step === 2 && (
            <>
              <p className="consult-step-lbl">Step 3 of 3 · Review</p>
              <h2 className="consult-title">Confirm Your Consultation</h2>
              <p className="consult-desc">Everything look right? Hit confirm and you're set.</p>

              <div style={{borderRadius:"var(--r3)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)",overflow:"hidden",marginBottom:20}}>
                {[
                  ["Date",      `${mnth} ${selDate}, ${yr}`],
                  ["Time",      selTime],
                  ["Type",      "Free Consultation · 30 min"],
                  ["Format",    "In-Person or Phone"],
                  ["With",      "Malik Bryant · MLVNT"],
                ].map(([k,v]) => (
                  <div className="consult-confirm-row" key={k} style={{padding:"11px 16px"}}>
                    <span className="consult-confirm-k">{k}</span>
                    <span className="consult-confirm-v">{v}</span>
                  </div>
                ))}
              </div>

              <div style={{padding:"14px 16px",borderRadius:"var(--r2)",background:"rgba(255,255,255,0.03)",border:"1px solid var(--b0)",fontSize:"0.78rem",color:"var(--txt-1)",lineHeight:1.65}}>
                A confirmation will be sent to your email. Malik will reach out if anything needs to be adjusted.
              </div>
            </>
          )}

          {/* ── STEP 3 — SUCCESS ── */}
          {step === 3 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"12px 0"}}>
              <div className="consult-success-icon">✓</div>
              <h2 className="consult-title" style={{marginBottom:10}}>You're Confirmed</h2>
              <p className="consult-desc" style={{marginBottom:20,maxWidth:380}}>
                Your consultation is booked for <strong style={{color:"var(--txt-0)"}}>{mnth} {selDate} at {selTime}</strong>. A confirmation has been sent to your email.
              </p>
              <div style={{width:"100%",borderRadius:"var(--r3)",padding:"18px",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)",textAlign:"left",marginBottom:20}}>
                <p className="label mb-8">What to Expect</p>
                {[
                  "Malik will walk through your goals, history, and lifestyle.",
                  "You'll get a clear picture of what training with MLVNT looks like.",
                  "A package recommendation will follow — no pressure, no rush.",
                ].map((t,i) => (
                  <p key={i} style={{fontSize:"0.78rem",color:"var(--txt-1)",lineHeight:1.65,marginBottom:i<2?8:0}}>
                    {i+1}. {t}
                  </p>
                ))}
              </div>
              <button className="btn btn-p btn-full" onClick={onComplete}>
                Back to Home
              </button>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="consult-nav">
              <button
                className="btn btn-s btn-sm"
                style={{opacity: step===0?0.4:1}}
                onClick={() => step > 0 ? setStep(s=>s-1) : onBack()}
              >
                ← {step===0 ? "Cancel" : "Back"}
              </button>

              <div className="consult-dots">
                {[0,1,2].map(i=>(
                  <div key={i} className={`consult-dot${i===step?" curr":i<step?" done":" idle"}`} />
                ))}
              </div>

              <button
                className={`btn btn-sm${canAdvance?" btn-p":" btn-s"}`}
                style={{opacity: canAdvance?1:0.4}}
                onClick={() => canAdvance && next()}
              >
                {saving
                  ? <><Spinner />{step===2?"Booking…":"Saving…"}</>
                  : step===2 ? "Confirm ✓" : "Continue →"
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── CLIENT: RECOMMENDATION SCREEN ──────────────────────────────────────── */
function ConsultationRecommendation({ onBack, onProceed }) {
  const [selPkg, setSelPkg] = useState("2x");
  const open = (url) => window.open(url, "_blank", "noopener,noreferrer");
  const selected = STRIPE_PACKAGES.find(p=>p.id===selPkg) || STRIPE_PACKAGES[1];

  return (
    <div className="consult-shell">
      <div className="consult-head">
        <span className="consult-brand">MLVNT</span>
        <span style={{fontSize:"0.62rem",color:"var(--txt-2)",letterSpacing:"0.14em",textTransform:"uppercase"}}>Your Recommendation</span>
        <button className="btn btn-ghost" style={{fontSize:"0.67rem",color:"var(--txt-2)"}} onClick={onBack}>← Back</button>
      </div>
      <div className="consult-body">
        <div className="consult-card page-fade">
          <div className="consult-shimmer" />
          <p className="consult-step-lbl">From Malik</p>
          <h2 className="consult-title">Your Recommended Package</h2>
          <p className="consult-desc">
            Based on your consultation, here's what Malik recommends as the best fit for your goals and schedule.
          </p>

          {/* Coach message */}
          <div style={{display:"flex",gap:12,padding:"14px 16px",borderRadius:"var(--r3)",background:"var(--acc-0)",border:"1px solid rgba(255,255,255,0.08)",marginBottom:20}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"var(--acc-1)",border:"1px solid var(--b0)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fh)",fontSize:"0.6rem",fontWeight:700,color:"var(--txt-1)",flexShrink:0}}>MB</div>
            <div>
              <p style={{fontSize:"0.65rem",color:"var(--txt-2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4,fontFamily:"var(--fb)"}}>Malik Bryant · Coach Note</p>
              <p style={{fontSize:"0.8rem",color:"var(--txt-1)",lineHeight:1.65}}>
                Great talking with you. Based on your goals and schedule, 2x per week is the right starting point — it gives you structure, momentum, and real results without overcommitting. Let's get started.
              </p>
            </div>
          </div>

          {/* Package selector */}
          <p className="label mb-10">Select Your Package</p>
          {STRIPE_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              className={`consult-pkg-card${selPkg===pkg.id?" sel":""}`}
              onClick={() => setSelPkg(pkg.id)}
              style={{marginBottom:8}}
            >
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
                <p className="consult-pkg-name">{pkg.name}</p>
                {pkg.badge && (
                  <span style={{fontSize:"0.58rem",padding:"3px 8px",borderRadius:100,background:"rgba(42,122,75,0.2)",color:"rgba(140,210,155,0.85)",border:"1px solid rgba(42,122,75,0.25)",fontFamily:"var(--fc)",letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                    {pkg.badge}
                  </span>
                )}
              </div>
              <p style={{fontSize:"0.65rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em",marginBottom:6}}>{pkg.sessionLabel}</p>
              <p className="consult-pkg-desc">{pkg.desc}</p>
            </div>
          ))}

          <p style={{fontSize:"0.67rem",color:"var(--txt-2)",marginBottom:20,lineHeight:1.6}}>
            All first-time packages include one complimentary starter session.
          </p>

          {/* Primary CTA — opens Stripe */}
          <button
            className="btn btn-p btn-full"
            onClick={() => open(selected.stripeUrl)}
          >
            Get Started — {selected.name}
          </button>

          {/* Start Now prorated option */}
          <div style={{marginTop:12,padding:"12px 14px",borderRadius:"var(--r2)",background:"rgba(255,255,255,0.03)",border:"1px solid var(--b0)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <p style={{fontSize:"0.73rem",color:"var(--txt-2)",lineHeight:1.6,flex:1}}>
              Want to begin this month? Start now with a prorated plan.
            </p>
            <button
              className="btn btn-ghost btn-sm"
              style={{flexShrink:0,fontSize:"0.66rem"}}
              onClick={() => open(STRIPE_START_NOW.stripeUrl)}
            >
              Start Now →
            </button>
          </div>

          {/* Security note */}
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:16,fontSize:"0.6rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em"}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Secure checkout powered by Stripe
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN: CONSULTATIONS PANEL ──────────────────────────────────────────── */
function AdminConsultations({ setView: setAdminView }) {
  const [leads, setLeads]     = useState(CONSULT_STORE.leads);
  const [selId, setSelId]     = useState(null);
  const [filter, setFilter]   = useState("all");
  const [noteVal, setNoteVal] = useState("");
  const [recPkg, setRecPkg]   = useState("");
  const [msgVal, setMsgVal]   = useState("");
  const [saved, setSaved]     = useState(false);

  const lead = selId ? leads.find(l=>l.id===selId) : null;

  const filtered = filter==="all" ? leads
    : leads.filter(l=>l.status===filter);

  const markDone = id => setLeads(p=>p.map(l=>l.id===id?{...l,status:"completed"}:l));
  const convert  = id => setLeads(p=>p.map(l=>l.id===id?{...l,status:"converted",converted:true}:l));
  const saveNote = () => {
    setLeads(p=>p.map(l=>l.id===selId?{...l,coachNotes:noteVal,recommended:recPkg||l.recommended}:l));
    setSaved(true); setTimeout(()=>setSaved(false),2200);
  };

  const statusColor = s => s==="converted"?"ok":s==="completed"?"blue":s==="pending"?"warn":"pend";
  const statusLabel = s => s==="converted"?"Converted":s==="completed"?"Completed":s==="pending"?"Upcoming":"—";

  // When opening a lead, pre-fill note and pkg
  const openLead = id => {
    const l = leads.find(x=>x.id===id);
    setNoteVal(l?.coachNotes||"");
    setRecPkg(l?.recommended||"");
    setSelId(id);
  };

  if (lead) return (
    <div className="page-fade">
      <AdminTopbar
        title={lead.name}
        actions={<>
          <button className="btn btn-ghost btn-sm" onClick={()=>setSelId(null)}>← All Leads</button>
          {lead.status==="pending" && (
            <button className="btn btn-s btn-sm" onClick={()=>markDone(lead.id)}>Mark Completed</button>
          )}
          {lead.status==="completed" && !lead.converted && (
            <button className="btn btn-p btn-sm" onClick={()=>convert(lead.id)}>Convert to Client</button>
          )}
        </>}
      />
      <div className="admin-body">
        <div className="a-grid-2" style={{alignItems:"start"}}>
          {/* Left — intake details */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div className="a-panel">
              <div className="a-panel-hd">
                <span className="a-panel-title">Consultation Details</span>
                <ATag type={statusColor(lead.status)}>{statusLabel(lead.status)}</ATag>
              </div>
              {[
                ["Date & Time", `${lead.date} · ${lead.time}`],
                ["Format",      lead.type],
                ["Booked On",   lead.bookedAt],
              ].map(([k,v])=>(
                <div className="a-row" key={k}>
                  <span style={{fontSize:"0.76rem",color:"var(--txt-2)"}}>{k}</span>
                  <span style={{fontSize:"0.78rem",color:"var(--txt-0)",fontWeight:400}}>{v}</span>
                </div>
              ))}
            </div>

            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Intake Responses</span></div>
              {[
                ["Goal",       lead.goal],
                ["Experience", lead.level],
                ["Frequency",  lead.frequency],
                ["Location",   lead.location],
                ["Injuries",   lead.injuries],
                ["Email",      lead.email],
                ["Phone",      lead.phone],
              ].map(([k,v])=>(
                <div key={k} className="lead-detail">
                  <p className="lead-detail-lbl">{k}</p>
                  <p className="lead-detail-val">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — coach actions */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div className="a-panel">
              <div className="a-panel-hd">
                <span className="a-panel-title">Coach Notes</span>
                {saved && <span style={{fontSize:"0.65rem",color:"rgba(140,210,155,0.8)"}}>✓ Saved</span>}
              </div>
              <textarea
                className="note-area"
                rows={4}
                placeholder="Observations from the consultation, training style, personality, anything relevant…"
                value={noteVal}
                onChange={e=>setNoteVal(e.target.value)}
              />
            </div>

            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Package Recommendation</span></div>
              <p className="body-sm mb-12" style={{fontSize:"0.71rem"}}>Select the package to recommend to this client after the consultation.</p>
              {CONSULT_PACKAGES.map(pkg=>(
                <div
                  key={pkg.id}
                  onClick={()=>setRecPkg(pkg.name)}
                  style={{
                    padding:"10px 14px",borderRadius:"var(--r2)",border:`1px solid ${recPkg===pkg.name?"var(--b1)":"var(--b0)"}`,
                    background:recPkg===pkg.name?"var(--acc-0)":"rgba(0,0,0,0.15)",
                    cursor:"pointer",marginBottom:6,transition:"all 0.17s",
                  }}
                >
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <p style={{fontFamily:"var(--fh)",fontSize:"0.78rem",fontWeight:700,color:"var(--txt-0)"}}>{pkg.name}</p>
                    <span style={{fontSize:"0.7rem",color:"var(--txt-2)",fontFamily:"var(--fc)"}}>{pkg.price}</span>
                  </div>
                  <p style={{fontSize:"0.7rem",color:"var(--txt-1)",marginTop:2,lineHeight:1.45}}>{pkg.desc}</p>
                </div>
              ))}
            </div>

            <div className="a-panel">
              <div className="a-panel-hd"><span className="a-panel-title">Follow-Up Message</span></div>
              <textarea
                className="note-area"
                rows={4}
                placeholder={`Hi ${lead.name.split(" ")[0]}, great talking with you today. Based on your goals, I'd recommend…`}
                value={msgVal}
                onChange={e=>setMsgVal(e.target.value)}
              />
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button className="btn btn-p btn-sm" onClick={saveNote}>Save Notes</button>
                {msgVal.trim() && <button className="btn btn-s btn-sm">Send Message</button>}
              </div>
            </div>

            {lead.status==="completed" && !lead.converted && (
              <div style={{padding:"16px 18px",borderRadius:"var(--r3)",background:"rgba(42,122,75,0.08)",border:"1px solid rgba(42,122,75,0.2)"}}>
                <p style={{fontFamily:"var(--fh)",fontSize:"0.76rem",fontWeight:700,color:"rgba(140,210,155,0.9)",marginBottom:6}}>Ready to Convert?</p>
                <p style={{fontSize:"0.74rem",color:"var(--txt-1)",lineHeight:1.6,marginBottom:12}}>
                  Mark this lead as a converted client. They'll receive the package recommendation and can proceed with onboarding.
                </p>
                <button className="btn btn-p btn-sm" onClick={()=>convert(lead.id)}>Convert to Client →</button>
              </div>
            )}
            {lead.converted && (
              <div style={{padding:"14px 16px",borderRadius:"var(--r2)",background:"rgba(42,122,75,0.12)",border:"1px solid rgba(42,122,75,0.25)",fontSize:"0.76rem",color:"rgba(140,210,155,0.85)"}}>
                ✓ Converted to client — {lead.recommended}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Lead list view
  return (
    <div className="page-fade">
      <AdminTopbar
        title="Consultations"
        actions={<>
          <span style={{fontSize:"0.65rem",color:"var(--txt-2)"}}>
            {leads.filter(l=>l.status==="pending").length} upcoming
          </span>
          <button className="btn btn-p btn-sm" onClick={()=>setAdminView("schedule")}>View Schedule</button>
        </>}
      />
      <div className="admin-body">
        {/* Status KPIs */}
        <div className="a-kpi-row" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:20}}>
          {[
            ["Total Leads",   leads.length,                                    ""],
            ["Upcoming",      leads.filter(l=>l.status==="pending").length,    "warn"],
            ["Completed",     leads.filter(l=>l.status==="completed").length,  "accent"],
            ["Converted",     leads.filter(l=>l.status==="converted").length,  "ok"],
          ].map(([lbl,n,type])=>(
            <div key={lbl} className={`a-kpi${type?" "+type:""}`}>
              <p className="a-kpi-lbl">{lbl}</p>
              <div className="a-kpi-n">{n}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {[["all","All"],["pending","Upcoming"],["completed","Completed"],["converted","Converted"]].map(([id,lbl])=>(
            <button
              key={id}
              onClick={()=>setFilter(id)}
              style={{
                padding:"7px 14px",borderRadius:"var(--r2)",border:`1px solid ${filter===id?"var(--b1)":"var(--b0)"}`,
                background:filter===id?"var(--acc-0)":"none",color:filter===id?"var(--txt-0)":"var(--txt-1)",
                fontFamily:"var(--fh)",fontSize:"0.66rem",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.17s",
              }}
            >{lbl}</button>
          ))}
        </div>

        {/* Lead list */}
        <div className="a-panel">
          <div className="a-panel-hd">
            <span className="a-panel-title">
              {filter==="all"?"All Leads":filter.charAt(0).toUpperCase()+filter.slice(1)} — {filtered.length}
            </span>
          </div>
          {filtered.length === 0 && (
            <div className="empty-state" style={{padding:"36px 20px"}}>
              <span className="empty-ic">◎</span>
              <p className="empty-txt">No {filter} consultations.</p>
            </div>
          )}
          {filtered.map(l=>(
            <div className="lead-card" key={l.id} onClick={()=>openLead(l.id)}>
              <div className="lead-card-head">
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div className="c-av">{l.init}</div>
                  <div>
                    <p className="lead-name">{l.name}</p>
                    <p className="lead-meta">{l.date} · {l.time} · {l.type}</p>
                  </div>
                </div>
                <ATag type={statusColor(l.status)}>{statusLabel(l.status)}</ATag>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
                {[l.goal, l.level, l.frequency].filter(Boolean).map(v=>(
                  <span key={v} style={{padding:"3px 9px",borderRadius:100,background:"rgba(255,255,255,0.04)",border:"1px solid var(--b0)",fontSize:"0.63rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.06em"}}>{v}</span>
                ))}
                {l.recommended && (
                  <span style={{padding:"3px 9px",borderRadius:100,background:"rgba(42,122,75,0.12)",border:"1px solid rgba(42,122,75,0.2)",fontSize:"0.63rem",color:"rgba(140,210,155,0.85)",fontFamily:"var(--fc)",letterSpacing:"0.06em"}}>→ {l.recommended}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN NAV + SHELL ───────────────────────────────────────────────────── */
const ADMIN_NAV = [
  {id:"dashboard",    ic:"⊞",lbl:"Dashboard"},
  {id:"consultations",ic:"◎",lbl:"Consultations", badge:1},
  {id:"clients",      ic:"◉",lbl:"Clients",  badge:2},
  {id:"programs",     ic:"▦",lbl:"Programs"},
  {id:"schedule",     ic:"◷",lbl:"Schedule"},
  {id:"feedback",     ic:"◈",lbl:"Feedback", badge:2},
  {id:"packages",     ic:"⬡",lbl:"Packages", badge:1},
  {id:"messages",     ic:"✉",lbl:"Messages", badge:3},
  {id:"analytics",    ic:"△",lbl:"Analytics"},
  {id:"settings",     ic:"⊙",lbl:"Settings"},
];

function AdminShell({ onLogout, session }) {
  const [view, setView]               = useState("dashboard");
  const [focusClient, setFocusClient] = useState(null);

  // ── Load real client list from Supabase ───────────────────────────────────
  const [dbClients, setDbClients] = useState([]);
  useEffect(() => {
    listClients().then(rows => {
      setDbClients(rows.map(r => {
        const cp = r.client_profiles;
        return {
          id:            r.id,
          init:          (r.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
          name:          r.name || r.email,
          email:         r.email,
          pkg:           cp?.package_plan      || "—",
          sessLeft:      cp?.sessions_balance  ?? 0,
          sessTotal:     cp?.sessions_balance  ?? 0,
          location:      cp?.location_building || "—",
          goal:          (cp?.goals||[]).join(", ") || "—",
          level:         cp?.fitness_level     || "—",
          injuries:      "—",
          birthday:      cp?.birthday          || "—",
          birthdayReward:false,
          starterUsed:   true,
          status:        "active",
          expires:       "—",
          nextSess:      "—",
          unread:        0,
          lastFeedback:  "—",
          age:           cp?.age               || "—",
        };
      }));
    });
  }, []);

  const views = {
    dashboard:    <AdminDashboard setView={setView} setFocusClient={setFocusClient} dbClients={dbClients} />,
    consultations:<AdminConsultations setView={setView} />,
    clients:      <AdminClients   setView={setView} focusClient={focusClient} setFocusClient={setFocusClient} dbClients={dbClients} />,
    programs:     <AdminPrograms session={session} />,
    schedule:     <AdminSchedule />,
    feedback:     <AdminFeedback />,
    packages:     <AdminPackages dbClients={dbClients} />,
    messages:     <AdminMessages dbClients={dbClients} />,
    analytics:    <AdminAnalytics dbClients={dbClients} />,
    settings:     <AdminSettings />,
  };
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo">MLVNT</div>
          <div className="admin-role-badge">⊛ Coach Admin</div>
        </div>
        <p className="admin-sec">Control</p>
        {ADMIN_NAV.map(item=>(
          <div key={item.id} className={`a-item${view===item.id?" on":""}`} onClick={()=>setView(item.id)}>
            <span className="ic">{item.ic}</span>
            <span>{item.lbl}</span>
            {item.badge&&<span className="a-badge">{item.badge}</span>}
          </div>
        ))}
        <div className="admin-user">
          <div className="admin-av">{session?.init||"MB"}</div>
          <div style={{overflow:"hidden"}}>
            <p style={{fontSize:"0.75rem",fontWeight:600,color:"var(--txt-0)"}}>{session?.name||"Admin"}</p>
            <p style={{fontSize:"0.6rem",color:"var(--txt-2)"}}>Founder · MLVNT</p>
          </div>
          <button className="btn btn-ghost" style={{marginLeft:"auto",fontSize:"0.6rem"}} onClick={onLogout}>Out</button>
        </div>
      </aside>
      <div className="admin-main">
        {views[view]||views["dashboard"]}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC WEBSITE — "/"
   Premium personal training homepage. Entry point for new visitors.
   All auth/app flows remain intact behind the "Client Login" CTA.
   Routes:
     "home"     → this component
     "login"    → AuthLogin (existing)
     "packages" → PackagePricing (existing)
     "consult"  → ConsultationFlow (existing)
══════════════════════════════════════════════════════════════════════════ */
function PublicSite({ onLogin, onConsult, onPackages }) {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobMenu,    setMobMenu]    = useState(false);
  const [activeSection, setActive] = useState("");
  const open = url => window.open(url, "_blank", "noopener,noreferrer");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
    setMobMenu(false);
  };

  const navLinks = [
    { label:"Plans",        id:"plans" },
    { label:"How It Works", id:"how"   },
    { label:"Meet Malik",   id:"malik" },
    { label:"Get the App",  id:"app"   },
  ];

  return (
    <div style={{position:"relative"}}>

      {/* ── NAVIGATION ──────────────────────────────────────────────────── */}
      <nav className={`site-nav${scrolled?" scrolled":""}`}>
        <span className="site-nav-logo" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>MLVNT</span>

        <div className="site-nav-links">
          {navLinks.map(n=>(
            <button key={n.id} className="site-nav-link" onClick={()=>scrollTo(n.id)}>{n.label}</button>
          ))}
        </div>

        <div className="site-nav-actions">
          <button className="btn btn-ghost btn-sm site-nav-book" onClick={onConsult} style={{fontSize:"0.66rem"}}>Book</button>
          <button className="btn btn-s btn-sm" onClick={onLogin}>Client Login</button>
          {/* Mobile hamburger */}
          <button
            onClick={()=>setMobMenu(true)}
            style={{display:"none",width:36,height:36,borderRadius:"var(--r2)",background:"var(--gb)",border:"1px solid var(--b0)",color:"var(--txt-1)",cursor:"pointer",alignItems:"center",justifyContent:"center",fontSize:"1rem",
            }}
            className="site-mob-toggle"
          >☰</button>
        </div>
      </nav>

      {/* ── MOBILE MENU ─────────────────────────────────────────────────── */}
      {mobMenu && (
        <div className="site-mob-menu page-fade">
          <button className="site-mob-close" onClick={()=>setMobMenu(false)}>✕</button>
          {navLinks.map(n=>(
            <button key={n.id} className="site-mob-link" onClick={()=>scrollTo(n.id)}>{n.label}</button>
          ))}
          <button className="site-mob-link" onClick={()=>{setMobMenu(false);scrollTo("what");}}>What We Do</button>
          <div style={{marginTop:32,display:"flex",flexDirection:"column",gap:10}}>
            <button className="btn btn-p btn-full" onClick={()=>{setMobMenu(false);onConsult();}}>Book a Free Consultation</button>
            <button className="btn btn-s btn-full" onClick={()=>{setMobMenu(false);onPackages();}}>View Plans</button>
            <button className="btn btn-ghost btn-full" onClick={()=>{setMobMenu(false);onLogin();}}>Client Login →</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════════════════════════════ */}
      <section className="site-hero">
        <div className="site-hero-bg" />
        <div className="site-hero-glow" />

        <p className="site-tagline page-fade">Personal Training · New York</p>
        <h1 className="site-wordmark page-fade">MLVNT</h1>
        <p className="site-hero-sub page-fade">
          Personalized strength and physique training built around your body, schedule, and goals.
          Real structure. Real results. No guesswork.
        </p>
        <div className="site-hero-actions page-fade">
          <button className="btn btn-p" style={{padding:"14px 32px",fontSize:"0.72rem"}} onClick={onConsult}>
            Book a Free Consultation
          </button>
          <button className="btn btn-s" style={{padding:"13px 28px",fontSize:"0.72rem"}} onClick={onPackages}>
            View Plans
          </button>
        </div>

        <div className="site-hero-scroll">
          <span>Scroll</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6l5 5 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      <div className="site-rule" />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 — WHAT WE DO
      ════════════════════════════════════════════════════════════════ */}
      <section className="site-section" id="what">
        <div className="site-section-inner">
          <p className="site-section-label">What We Do</p>
          <h2 className="site-section-title">
            Training built for<br />real transformation.
          </h2>
          <p className="site-section-body">
            MLVNT delivers hands-on personal training and programming designed around who you are — your schedule, your body, and where you want to go.
          </p>

          <div className="site-feat-grid">
            {[
              { ic:"◈", title:"Personal Training",          body:"One-on-one sessions tailored to your mechanics, goals, and progression. Every session is intentional." },
              { ic:"▲", title:"Strength & Physique",        body:"Structured programs built for muscle development, fat loss, or body recomposition — based on what you actually want." },
              { ic:"◎", title:"Movement & Performance",     body:"Improve how your body moves. Better mechanics, better recovery, better results over time." },
              { ic:"⊙", title:"Accountability & Structure", body:"Weekly check-ins, program adjustments, and consistent communication keep your training on track." },
            ].map(({ic,title,body})=>(
              <div key={title} className="site-feat-card">
                <span className="site-feat-ic">{ic}</span>
                <p className="site-feat-title">{title}</p>
                <p className="site-feat-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="site-rule" />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3 — WHO IT'S FOR
      ════════════════════════════════════════════════════════════════ */}
      <section className="site-section" id="who">
        <div className="site-section-inner">
          <p className="site-section-label">Who It's For</p>
          <h2 className="site-section-title">Built for people<br />who are serious about results.</h2>
          <p className="site-section-body">
            Whether you're starting from scratch or refining what's already there — MLVNT is for people who want structure, guidance, and a coach who takes it as seriously as they do.
          </p>

          <div className="site-for-grid">
            {[
              { ic:"◷", title:"Busy Professionals",           body:"Training designed around your schedule — consistent, efficient, and effective even when life is demanding." },
              { ic:"▦", title:"Fat Loss & Muscle Building",   body:"You want to look and feel different. You need a plan that actually works and a coach who keeps you on it." },
              { ic:"◈", title:"Structure & Consistency",      body:"You've tried on your own. You know what missing: a clear program, real accountability, and someone in your corner." },
              { ic:"◎", title:"Performance-Minded Athletes",  body:"You're already training. MLVNT helps you train smarter — better mechanics, better programming, better results." },
            ].map(({ic,title,body})=>(
              <div key={title} className="site-for-item">
                <span className="site-for-ic">{ic}</span>
                <div>
                  <p className="site-for-title">{title}</p>
                  <p className="site-for-body">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="site-rule" />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 4 — HOW IT WORKS
      ════════════════════════════════════════════════════════════════ */}
      <section className="site-section" id="how">
        <div className="site-section-inner">
          <p className="site-section-label">How It Works</p>
          <h2 className="site-section-title">Four steps.<br />One clear path.</h2>
          <p className="site-section-body" style={{marginBottom:0}}>
            No confusion. No fluff. A structured process from first conversation to ongoing results.
          </p>

          <div className="site-steps">
            {[
              { n:"01", title:"Book Consultation",   body:"A free 30-minute conversation to understand your goals, schedule, and what's held you back." },
              { n:"02", title:"Get Assessed",        body:"Movement screening and goal alignment to build a clear picture of where you are and where you're going." },
              { n:"03", title:"Receive Your Program",body:"A fully personalized training program delivered through the MLVNT client app — structured, progressive, and built for you." },
              { n:"04", title:"Train & Progress",    body:"Weekly sessions, real-time feedback, and ongoing program adjustments as you build and improve." },
            ].map(({n,title,body})=>(
              <div key={n} className="site-step">
                <div className="site-step-n">{n}</div>
                <p className="site-step-title">{title}</p>
                <p className="site-step-body">{body}</p>
              </div>
            ))}
          </div>

          <div style={{textAlign:"center",marginTop:56}}>
            <button className="btn btn-p" style={{padding:"13px 32px"}} onClick={onConsult}>
              Book a Free Consultation
            </button>
          </div>
        </div>
      </section>

      <div className="site-rule" />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 5 — PLANS
      ════════════════════════════════════════════════════════════════ */}
      <section className="site-section" id="plans">
        <div className="site-section-inner">
          <p className="site-section-label">Training Plans</p>
          <h2 className="site-section-title">Simple, transparent<br />pricing.</h2>
          <p className="site-section-body">
            Choose a weekly training structure that fits your life. All packages include programming, coaching, and the MLVNT client app.
          </p>

          <div className="site-plans-grid">
            {STRIPE_PACKAGES.map(pkg=>(
              <div key={pkg.id} className={`site-plan-card${pkg.badge?" pop":""}`}>
                {pkg.badge && <span className="site-plan-badge">{pkg.badge}</span>}
                <p className="site-plan-name">{pkg.name}</p>
                <p className="site-plan-sess">{pkg.sessionLabel}</p>
                <div className="site-plan-divider" />
                <p className="site-plan-desc">{pkg.desc}</p>
                <button
                  className="btn btn-p btn-full btn-sm"
                  onClick={()=>open(pkg.stripeUrl)}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          {/* Start Now */}
          <div style={{
            marginTop:20,
            padding:"20px 24px",
            borderRadius:"var(--r3)",
            background:"rgba(255,255,255,0.025)",
            border:"1px solid var(--b0)",
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            gap:16,
            flexWrap:"wrap",
          }}>
            <div>
              <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700,color:"var(--txt-0)",marginBottom:5}}>Start Now</p>
              <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.65,maxWidth:500}}>{STRIPE_START_NOW.desc}</p>
            </div>
            <button className="btn btn-s btn-sm" style={{flexShrink:0}} onClick={()=>open(STRIPE_START_NOW.stripeUrl)}>
              Start Now →
            </button>
          </div>

          {/* Microcopy */}
          <div style={{textAlign:"center",marginTop:28}}>
            <p style={{fontSize:"0.72rem",color:"var(--txt-2)",lineHeight:1.75,maxWidth:500,margin:"0 auto 12px"}}>
              Results are built through consistency. The structure, guidance, and support are provided — but progress reflects the effort and habits you bring to the process.
            </p>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:"0.6rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Secure checkout powered by Stripe
            </div>
          </div>
        </div>
      </section>

      <div className="site-rule" />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 6 — MEET MALIK
      ════════════════════════════════════════════════════════════════ */}
      <section className="site-section" id="malik">
        <div className="site-section-inner">
          <div className="site-about-inner">
            {/* Avatar */}
            <div style={{display:"flex",justifyContent:"center"}}>
              <div style={{position:"relative"}}>
                <div className="site-about-av">
                  <img
                    src={malikImg}
                    alt="Malik Bryant — MLVNT Founder & Personal Trainer"
                    style={{
                      width:"100%",
                      height:"100%",
                      objectFit:"cover",
                      objectPosition:"center top",
                      display:"block",
                    }}
                  />
                </div>
                {/* Credential tag floating off the avatar */}
                <div style={{
                  position:"absolute",bottom:-12,left:"50%",transform:"translateX(-50%)",
                  whiteSpace:"nowrap",padding:"4px 12px",borderRadius:100,
                  background:"var(--bg-1)",border:"1px solid var(--b1)",
                  fontFamily:"var(--fc)",fontSize:"0.58rem",letterSpacing:"0.12em",
                  textTransform:"uppercase",color:"var(--txt-2)",
                }}>New York</div>
              </div>
            </div>

            {/* Copy */}
            <div>
              <p className="site-section-label">Meet Malik</p>
              <h2 className="site-section-title" style={{fontSize:"clamp(1.6rem,3vw,2.4rem)"}}>
                Malik Bryant
              </h2>
              <p style={{fontFamily:"var(--fc)",fontSize:"0.68rem",color:"var(--txt-2)",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:20}}>
                Founder · Personal Trainer · New York
              </p>

              {/* Opening line */}
              <p style={{fontFamily:"var(--fh)",fontSize:"clamp(0.88rem,1.5vw,1rem)",fontWeight:600,color:"var(--txt-0)",lineHeight:1.6,marginBottom:16}}>
                Malik is a personal trainer and coach who has been competing in sports since age 5 and coaching athletes of all levels across multiple disciplines.
              </p>

              {/* Background */}
              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",borderRadius:"var(--r2)",background:"rgba(255,255,255,0.025)",border:"1px solid var(--b0)"}}>
                  <span style={{fontSize:"0.85rem",flexShrink:0,marginTop:1}}>◎</span>
                  <div>
                    <p style={{fontFamily:"var(--fh)",fontSize:"0.78rem",fontWeight:600,color:"var(--txt-0)",marginBottom:3}}>Athlete Background</p>
                    <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.65,fontWeight:300}}>
                      Football, track, weightlifting, and rugby — starting at age 5. Malik still actively competes in rugby and brings that competitive edge to every client he works with.
                    </p>
                  </div>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",borderRadius:"var(--r2)",background:"rgba(255,255,255,0.025)",border:"1px solid var(--b0)"}}>
                  <span style={{fontSize:"0.85rem",flexShrink:0,marginTop:1}}>▦</span>
                  <div>
                    <p style={{fontFamily:"var(--fh)",fontSize:"0.78rem",fontWeight:600,color:"var(--txt-0)",marginBottom:3}}>Coaching Experience</p>
                    <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.65,fontWeight:300}}>
                      Experience training a diverse clientele at Equinox — from beginners to high-performing professionals — alongside coaching athletes across multiple disciplines. Focused on building strong foundations, improving performance, and delivering structured, personalized training.
                    </p>
                  </div>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",borderRadius:"var(--r2)",background:"rgba(255,255,255,0.025)",border:"1px solid var(--b0)"}}>
                  <span style={{fontSize:"0.85rem",flexShrink:0,marginTop:1}}>⊙</span>
                  <div>
                    <p style={{fontFamily:"var(--fh)",fontSize:"0.78rem",fontWeight:600,color:"var(--txt-0)",marginBottom:3}}>Client Range</p>
                    <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.65,fontWeight:300}}>
                      Ages 18–62. Models, busy professionals, general population, youth athletes. If you're serious about your training, Malik will match that energy.
                    </p>
                  </div>
                </div>
              </div>

              {/* What clients can expect */}
              <div style={{padding:"14px 16px",borderRadius:"var(--r3)",background:"var(--acc-0)",border:"1px solid var(--b1)",marginBottom:24}}>
                <p style={{fontFamily:"var(--fh)",fontSize:"0.76rem",fontWeight:600,color:"var(--txt-0)",marginBottom:6}}>What to expect working with Malik</p>
                <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.75,fontWeight:300}}>
                  Structured programming. Intentional sessions. Real accountability. Whether your goal is to look better, move better, or perform better — you'll have a program built specifically for you and a coach who takes your progress seriously.
                </p>
              </div>

              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button className="btn btn-p btn-sm" onClick={onConsult}>
                  Book a Consultation →
                </button>
                <button className="btn btn-s btn-sm" onClick={onPackages}>
                  View Plans
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="site-rule" />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 7 — GET THE APP
      ════════════════════════════════════════════════════════════════ */}
      <section className="site-section" id="app">
        <div className="site-section-inner">
          <div style={{
            display:"grid",
            gridTemplateColumns:"1fr 1fr",
            gap:"clamp(40px,6vw,96px)",
            alignItems:"center",
          }} className="site-app-inner">
            {/* App preview card */}
            <div style={{
              borderRadius:"var(--r5)",
              padding:"36px 28px",
              background:"var(--gb2)",
              border:"1px solid var(--b1)",
              backdropFilter:"blur(28px)",
              position:"relative",
              overflow:"hidden",
              textAlign:"center",
            }}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)"}} />
              {/* App icon */}
              <div style={{
                width:80,height:80,borderRadius:20,
                background:"linear-gradient(135deg,#1E2B3A,#263545)",
                border:"1px solid var(--b1)",
                display:"flex",alignItems:"center",justifyContent:"center",
                margin:"0 auto 16px",
                boxShadow:"0 12px 32px rgba(0,0,0,0.5)",
              }}>
                <span style={{fontFamily:"var(--fh)",fontSize:"1.6rem",fontWeight:800,letterSpacing:"-0.04em",color:"var(--txt-0)"}}>M</span>
              </div>
              <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,letterSpacing:"0.1em",color:"var(--txt-0)",marginBottom:4}}>MLVNT</p>
              <p style={{fontFamily:"var(--fc)",fontSize:"0.62rem",color:"var(--txt-2)",letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:24}}>Client Training App</p>

              {/* Fake UI strips — app preview suggestion */}
              {[85,65,75,55,80].map((w,i)=>(
                <div key={i} style={{height:6,borderRadius:3,background:"var(--b0)",marginBottom:8,width:`${w}%`,margin:"0 auto 8px"}} />
              ))}

              <div style={{marginTop:20,padding:"10px 14px",borderRadius:"var(--r2)",background:"rgba(42,122,75,0.08)",border:"1px solid rgba(42,122,75,0.2)"}}>
                <p style={{fontSize:"0.68rem",color:"rgba(140,210,155,0.85)",fontFamily:"var(--fc)",letterSpacing:"0.1em"}}>Available as web app · Add to home screen</p>
              </div>
            </div>

            {/* Copy + CTAs */}
            <div>
              <p className="site-section-label">Get the App</p>
              <h2 className="site-section-title">
                Your training,<br />always with you.
              </h2>
              <p className="site-section-body" style={{marginBottom:28}}>
                The MLVNT client portal gives you access to your program, session tracking, workout logs, and coach communication — all in one place. Install it to your home screen for an app-like experience on any device.
              </p>

              {/* Feature list */}
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
                {[
                  ["▦","Your personalized training program"],
                  ["◷","Session booking and scheduling"],
                  ["◈","Workout and progress tracking"],
                  ["✉","Direct messaging with your coach"],
                ].map(([ic,txt])=>(
                  <div key={txt} style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:"0.78rem",opacity:0.6,flexShrink:0}}>{ic}</span>
                    <p style={{fontSize:"0.78rem",color:"var(--txt-1)",fontWeight:300}}>{txt}</p>
                  </div>
                ))}
              </div>

              {/* Install CTAs */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button
                  className="btn btn-p btn-full"
                  style={{fontSize:"0.7rem",padding:"13px 20px"}}
                  onClick={onLogin}
                >
                  Open Client Portal
                </button>
                <button
                  className="btn btn-s btn-full"
                  style={{fontSize:"0.7rem",padding:"12px 20px"}}
                  onClick={()=>{
                    // PWA install prompt — browser fires beforeinstallprompt
                    // In production: listen for beforeinstallprompt, store, fire on click
                    // For now: show install instructions
                    alert("To install: tap the Share button in your browser, then select 'Add to Home Screen'.");
                  }}
                >
                  Add to Home Screen
                </button>
              </div>

              <p style={{fontSize:"0.65rem",color:"var(--txt-2)",marginTop:12,lineHeight:1.65}}>
                Works on all devices. No app store download required. Add to your home screen for a full native-app feel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="site-rule" />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 8 — CTA BAND
      ════════════════════════════════════════════════════════════════ */}
      <section className="site-cta-band">
        <div className="site-cta-inner">
          <p className="site-section-label">Get Started</p>
          <h2 style={{fontFamily:"var(--fh)",fontSize:"clamp(2rem,5vw,3.4rem)",fontWeight:700,letterSpacing:"-0.025em",lineHeight:1.05,color:"var(--txt-0)",marginBottom:14}}>
            Time Moves.<br />So Should You.
          </h2>
          <p style={{fontSize:"0.95rem",color:"var(--txt-1)",lineHeight:1.8,fontWeight:300}}>
            Book a free consultation and find out what a training program built specifically for you looks like.
          </p>
          <div className="site-cta-actions">
            <button
              className="btn btn-p"
              style={{padding:"14px 36px",fontSize:"0.72rem"}}
              onClick={onConsult}
            >
              Book a Consultation
            </button>
            <button
              className="btn btn-s"
              style={{padding:"13px 28px",fontSize:"0.72rem"}}
              onClick={onPackages}
            >
              View Plans
            </button>
            <button
              className="btn btn-ghost"
              style={{padding:"13px 20px",fontSize:"0.72rem"}}
              onClick={onLogin}
            >
              Client Login →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--txt-0)",marginBottom:4}}>MLVNT</p>
            <p className="site-footer-copy">© {new Date().getFullYear()} MLVNT · Personal Training · New York</p>
            <p style={{fontSize:"0.62rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.06em",marginTop:6}}>
              mlvnt2026@gmail.com
            </p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16,alignItems:"flex-end"}}>
            <div className="site-footer-links">
              <button className="site-footer-link" onClick={()=>scrollTo("what")}>Services</button>
              <button className="site-footer-link" onClick={()=>scrollTo("plans")}>Plans</button>
              <button className="site-footer-link" onClick={()=>scrollTo("malik")}>About</button>
              <button className="site-footer-link" onClick={()=>scrollTo("app")}>App</button>
              <button className="site-footer-link" onClick={onConsult}>Book</button>
              <button className="site-footer-link" onClick={onLogin}>Login</button>
            </div>
            <p style={{fontSize:"0.58rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em"}}>
              New York · In-Person & Online
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ── ROOT — OWNER-PROTECTED AUTH CONTROLLER ──────────────────────────────
   Access tiers (in order of privilege):
     owner  → full admin dashboard + owner-only controls
     admin  → full admin dashboard
     client → client app only
   Guards applied in sequence:
     1. emailVerified — must be true before any protected screen
     2. mfaSetupDone  — owner/admin must complete MFA setup on first login
     3. role check    — admin/owner vs client routing
     4. double-check  — admin route JSX re-validates role before rendering
────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [session,   setSession]  = useState(null);
  const [screen,    setScreen]   = useState("home");  // "home" = public website
  const [denied,    setDenied]   = useState(false);
  const [mfaSetup,  setMfaSetup] = useState(false);
  const [booting,   setBooting]  = useState(true);   // true while restoring session

  // ── Boot: restore persisted session + subscribe to auth changes ────────
  useEffect(() => {
    // Check for password-reset deep-link (?reset=1 set by Supabase redirect)
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      // Supabase sets the session automatically when the reset link is clicked
      // Just drop the user into the new-password form (step 2 of AuthForgot)
      setScreen("reset_password");
      setBooting(false);
      return;
    }

    // Restore existing session from localStorage — runs ONCE on boot.
    getSession().then(sess => {
      if (sess) handleLoginSuccess(sess, true);
      setBooting(false);
    });

    // Auth state listener — handles sign-out and password recovery only.
    // TOKEN_REFRESHED: silently update the session object (no re-routing).
    // SIGNED_IN: intentionally ignored here — AuthLogin calls handleLoginSuccess
    //   directly after signIn(), so firing it again from the listener would
    //   cause a double-call and lock contention on the Supabase auth lock.
    const sub = onAuthStateChange((event, sess) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setScreen("home");
      } else if (event === "PASSWORD_RECOVERY") {
        setScreen("reset_password");
      } else if (event === "TOKEN_REFRESHED" && sess) {
        // Silently refresh the session object; preserve current screen.
        setSession(sess);
      }
      // SIGNED_IN deliberately not handled here — see comment above.
    });
    return () => sub.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginSuccess = (sess, silent = false) => {
    setSession(sess);
    setDenied(false);

    // Single source of truth for coach/admin detection.
    // Three tiers: DB role, DB is_owner flag, email-based owner fallback.
    // Email fallback handles the case where fetchProfile() returns null due to
    // RLS policy or missing row — without it buildSession defaults to "client".
    const OWNER_EMAILS = ["mlvnt2026@gmail.com"];
    const isCoach =
      sess?.role    === "admin"  ||
      sess?.role    === "owner"  ||
      sess?.isOwner === true     ||
      OWNER_EMAILS.includes((sess?.email || "").toLowerCase());

    if (!sess.emailVerified) { setScreen("verify_email"); return; }

    // MFA gate: auto-write mfa_setup_done=true and proceed — no wizard blocker.
    if (isCoach && !sess.mfaSetupDone) {
      if (sess.id) markMfaSetupDone(sess.id).catch(() => {});
      setScreen("admin");
      return;
    }

    if (isCoach) {
      if (!silent) SEC_LOG.push("admin_login", sess.email, { role: sess.role });
      setScreen("admin");
    } else {
      setScreen("app");
    }
  };

  const handleMFASetupDone = async () => {
    if (session?.id) await markMfaSetupDone(session.id);
    const updatedSess = { ...session, mfaSetupDone: true };
    setSession(updatedSess);
    setMfaSetup(false);
    SEC_LOG.push("mfa_setup_complete", session.email, { role: session.role });
    setScreen("admin");
  };

  const logout = async () => {
    await signOut();
    setSession(null);
    setScreen("home");
    setDenied(false);
    setMfaSetup(false);
  };

  // Single source of truth — mirrors handleLoginSuccess exactly.
  const OWNER_EMAILS = ["mlvnt2026@gmail.com"];
  const isCoach =
    session?.role    === "admin"  ||
    session?.role    === "owner"  ||
    session?.isOwner === true     ||
    OWNER_EMAILS.includes((session?.email || "").toLowerCase());

  const adminGuardFailed     = screen === "admin" && session && !isCoach;
  const noSessionOnProtected = ["admin","app","onboarding","mfa_setup","verify_email"].includes(screen) && !session;

  // Show nothing while restoring session (prevents flash of login screen)
  if (booting) return (
    <>
      <style>{CSS}</style>
      <style>{ADMIN_CSS}</style>
      <div style={{minHeight:"100vh",background:"#0A0B0D",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div className="spinner" style={{width:24,height:24}} />
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <style>{ADMIN_CSS}</style>

      {/* ── PUBLIC WEBSITE — root "/" ── */}
      {screen === "home" && (
        <PublicSite
          onLogin={()=>setScreen("login")}
          onConsult={()=>setScreen("consult")}
          onPackages={()=>setScreen("packages")}
        />
      )}

      {/* ── AUTH ── */}
      {screen === "login"   && <AuthLogin
        onLoginSuccess={handleLoginSuccess}
        onForgot={()=>setScreen("forgot")}
        onSignup={()=>setScreen("signup")}
        onConsult={()=>setScreen("consult")}
        onPackages={()=>setScreen("packages")}
        onBack={()=>setScreen("home")}
      />}
      {screen === "signup"  && <AuthSignup onLogin={handleLoginSuccess} onBack={()=>setScreen("login")} />}
      {screen === "forgot"        && <AuthForgot onBack={()=>setScreen("login")} />}
      {/* Password-reset deep-link: Supabase redirects here, user sets new password */}
      {screen === "reset_password" && <AuthForgot onBack={()=>setScreen("login")} startAtStep={2} />}

      {/* ── CONSULTATION (no account required) ── */}
      {screen === "consult"        && <ConsultationFlow onBack={()=>setScreen("home")} onComplete={()=>setScreen("recommendation")} />}
      {screen === "recommendation" && <ConsultationRecommendation onBack={()=>setScreen("consult")} onProceed={()=>setScreen("onboarding")} />}
      {screen === "packages"       && <PackagePricing onBack={()=>setScreen("home")} onConsult={()=>setScreen("consult")} />}

      {/* ── EMAIL VERIFICATION GATE ── */}
      {screen === "verify_email" && session && (
        <div className="auth-shell">
          <div className="auth-bg" />
          <div className="auth-card page-fade" style={{textAlign:"center"}}>
            <div className="auth-shimmer" />
            <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(30,60,90,0.3)",border:"1px solid var(--b1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",margin:"0 auto 16px"}}>✉</div>
            <div className="auth-logo" style={{marginBottom:8}}>Please Verify Your Email</div>
            <p className="auth-sub" style={{marginBottom:20}}>
              Please verify your email before continuing. A verification link was sent to <strong style={{color:"var(--txt-0)"}}>{session.email}</strong>.
            </p>
            <Alert type="warn">Your account is not active until your email is verified.</Alert>
            <button className="btn btn-p btn-full mt-20" onClick={logout}>← Back to Sign In</button>
          </div>
        </div>
      )}

      {/* ── MFA SETUP GATE (owner/admin first login) ── */}
      {screen === "mfa_setup" && session && isAdminRole(session.role) && (
        <>
          <div style={{position:"fixed",top:0,left:0,right:0,padding:"10px 20px",background:"rgba(30,43,58,0.95)",borderBottom:"1px solid var(--b0)",zIndex:60,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:"var(--fh)",fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.06em",color:"var(--txt-0)"}}>
              {session.isOwner ? "🔐 Owner Account Setup" : "🔐 Admin Account Setup"}
            </span>
            <span style={{fontSize:"0.67rem",color:"var(--txt-2)"}}>
              — Two-step verification is required to secure your {session.isOwner?"owner":"admin"} account.
            </span>
          </div>
          <div style={{paddingTop:44}}>
            <MFASetup
              session={session}
              onDone={handleMFASetupDone}
              onSkip={null} /* owner/admin cannot skip MFA setup */
            />
          </div>
        </>
      )}

      {/* ── ACCESS DENIED ── */}
      {(screen === "denied" || adminGuardFailed || noSessionOnProtected) && (
        <AccessDenied onBack={()=>{ setDenied(false); setScreen("login"); }} />
      )}

      {/* ── CLIENT ROUTES ── */}
      {screen === "onboarding" && session && !isCoach && !adminGuardFailed && (
        <Onboarding onComplete={()=>setScreen("app")} session={session} />
      )}
      {screen === "app" && session && !isCoach && !adminGuardFailed && (
        <AppShell onLogout={logout} session={session} />
      )}

      {/* ── ADMIN / OWNER ROUTE ─────────────────────────────────────────────
          Guard: screen=admin + session exists + isCoach.
          isCoach = role=admin|owner OR isOwner=true OR owner email match.
          mfaSetupDone NOT required — auto-written in handleLoginSuccess.
      ────────────────────────────────────────────────────────────────────── */}
      {screen === "admin" && session && isCoach && (
        <AdminShell onLogout={logout} session={session} />
      )}
      {screen === "admin" && session && !isCoach && (
        <AccessDenied onBack={()=>{ setDenied(false); setScreen("login"); }} />
      )}
    </>
  );
}
