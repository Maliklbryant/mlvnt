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
  hasCompletedOnboarding,
  saveWorkoutLog,
  getWorkoutLog,
  getConsultationRequests,
  updateConsultationStatus,
  saveConsultationRequest,
  sendConsultationEmails,
  getCoachId,
  createNotification,
  getUnreadNotificationCount,
  subscribeToNotifications,
  getMessages,
  sendMessage,
  getUnreadMessageCount,
  markMessagesRead,
  subscribeToMessages,
  createSession,
  getClientSessions,
  getCoachSessions,
  updateSessionStatus,
  getWeeklySessionCount,
  isSlotTaken,
  getCoachAvailability,
  saveCoachAvailability,
  createCheckoutSession,
  adjustSessionBalance,
  getAllSessionPurchases,
  getAllLedgerEntries,
} from "./lib/db.js";
import { supabase } from "./lib/supabase.js";
import {
  formatIsoDate,
  parseSlotDateTime,
  isSlotInPast,
  isPastCalendarDay,
  nextCalendarMonth,
  prevCalendarMonth,
  isMonthInPast,
  evaluateBookingEligibility,
} from "./lib/logic.js";

/* ─────────────────────────────────────────────────────────────────────────────
   MLVNT APP  ·  Time Moves. So Should You.
   Complete client + coach experience — auth, onboarding, dashboard,
   scheduling, program, progress, feedback, messaging
   ── PRODUCTION INTEGRATION NOTES ──
   Every mock/in-memory production store (SESSION_INVENTORY, CLIENTS,
   CONSULT_STORE, HELD_INVENTORY, BOOKING_BLOCK_LOG, MESSAGES,
   ADMIN_MESSAGES_DATA, ADMIN_WEEK, TODAY_SESSIONS, REVENUE_DATA,
   ADMIN_FEEDBACKS, PROGRAM_STORE) has been removed from every live flow.
   All client/coach data now comes from Supabase via src/lib/db.js.
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
@supports(padding-top:env(safe-area-inset-top)){
  .topbar{padding-top:env(safe-area-inset-top);height:calc(58px + env(safe-area-inset-top));}
  .main-col{padding-top:0;}
}
.topbar-title{font-family:var(--fh);font-size:1rem;font-weight:700;letter-spacing:-0.01em;color:var(--txt-0);}
.topbar-actions{display:flex;gap:8px;align-items:center;}

/* ── MOBILE NAV ── */
.mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;background:rgba(10,11,13,0.95);backdrop-filter:blur(28px);border-top:1px solid var(--b0);padding:8px 0 max(8px,env(safe-area-inset-bottom));}
.mob-nav-inner{display:flex;justify-content:space-around;}
.mob-tab{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 16px;cursor:pointer;border:none;background:none;color:var(--txt-2);transition:color 0.2s;position:relative;}
.mob-tab.active{color:var(--txt-0);}
.mob-tab .ic{font-size:1.1rem;}
.mob-tab .lbl{font-size:0.55rem;font-family:var(--fb);font-weight:500;letter-spacing:0.1em;text-transform:uppercase;}
.mob-tab-badge{position:absolute;top:2px;right:8px;background:rgba(200,80,80,0.9);color:#fff;font-size:0.5rem;min-width:14px;height:14px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--fc);}

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
.btn:disabled{opacity:0.45;pointer-events:none;}
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
.cal-btn:disabled{opacity:0.25;cursor:not-allowed;}
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
.wk-set-target{font-size:0.72rem;color:var(--txt-1);}
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
.site-nav{position:fixed;top:0;left:0;right:0;z-index:200;height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,72px);background:rgba(10,11,13,0);backdrop-filter:blur(0px);border-bottom:1px solid transparent;transition:background 0.4s,backdrop-filter 0.4s,border-color 0.4s;}
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
.site-section{padding:clamp(56px,10vw,120px) clamp(20px,6vw,80px);}
.site-section-inner{max-width:1100px;margin:0 auto;}
.site-section-label{font-family:var(--fc);font-size:0.6rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--txt-2);margin-bottom:14px;}
.site-section-title{font-family:var(--fh);font-size:clamp(1.6rem,4vw,3rem);font-weight:700;letter-spacing:-0.025em;line-height:1.05;color:var(--txt-0);margin-bottom:16px;}
.site-section-body{font-size:clamp(0.85rem,1.5vw,1rem);color:var(--txt-1);line-height:1.85;max-width:580px;font-weight:300;}
.site-rule{height:1px;background:linear-gradient(90deg,transparent,var(--b0) 20%,var(--b0) 80%,transparent);max-width:1100px;margin:0 auto;}
.site-feat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:44px;}
.site-feat-card{padding:28px 24px;border-radius:var(--r4);background:var(--gb);border:1px solid var(--b0);position:relative;overflow:hidden;transition:border-color 0.25s,transform 0.25s;}
.site-feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);}
.site-feat-card:hover{border-color:var(--b1);transform:translateY(-3px);}
.site-feat-ic{font-size:1.4rem;margin-bottom:16px;display:block;opacity:0.8;}
.site-feat-title{font-family:var(--fh);font-size:0.9rem;font-weight:700;letter-spacing:-0.01em;color:var(--txt-0);margin-bottom:8px;}
.site-feat-body{font-size:0.76rem;color:var(--txt-1);line-height:1.7;font-weight:300;}
@media(max-width:900px){.site-feat-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:500px){.site-feat-grid{grid-template-columns:1fr;gap:12px;}}
.site-for-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:36px;}
.site-for-item{display:flex;align-items:flex-start;gap:14px;padding:20px;border-radius:var(--r3);background:rgba(255,255,255,0.025);border:1px solid var(--b0);}
.site-for-ic{font-size:1rem;flex-shrink:0;margin-top:2px;opacity:0.7;}
.site-for-title{font-family:var(--fh);font-size:0.82rem;font-weight:700;color:var(--txt-0);margin-bottom:4px;}
.site-for-body{font-size:0.73rem;color:var(--txt-1);line-height:1.6;font-weight:300;}
@media(max-width:600px){.site-for-grid{grid-template-columns:1fr;}}
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
.site-about-inner{display:grid;grid-template-columns:1fr 1fr;gap:clamp(40px,6vw,96px);align-items:center;}
.site-about-av{width:clamp(120px,20vw,200px);height:clamp(120px,20vw,200px);border-radius:50%;background:linear-gradient(135deg,var(--acc-0),var(--acc-1));border:1px solid var(--b1);overflow:hidden;flex-shrink:0;position:relative;}
.site-about-av::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:1px solid var(--b0);}
@media(max-width:700px){
  .site-about-inner{grid-template-columns:1fr;text-align:center;}
  .site-about-av{margin:0 auto;}
  .site-app-inner{grid-template-columns:1fr!important;}
}
.site-cta-band{padding:clamp(56px,10vw,120px) clamp(20px,6vw,80px);background:linear-gradient(180deg,transparent 0%,rgba(30,43,58,0.08) 100%);position:relative;overflow:hidden;}
.site-cta-band::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 100% at 50% 100%,rgba(30,43,58,0.2) 0%,transparent 70%);pointer-events:none;}
.site-cta-inner{max-width:640px;margin:0 auto;text-align:center;position:relative;}
.site-cta-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:28px;}
.site-footer{padding:32px clamp(20px,6vw,80px) max(32px,calc(24px + env(safe-area-inset-bottom,0px)));border-top:1px solid var(--b0);}
.site-footer-inner{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;}
.site-footer-copy{font-size:0.66rem;color:var(--txt-2);font-family:var(--fc);letter-spacing:0.08em;}
.site-footer-links{display:flex;gap:20px;flex-wrap:wrap;}
.site-footer-link{font-size:0.64rem;color:var(--txt-2);cursor:pointer;font-family:var(--fc);letter-spacing:0.08em;text-transform:uppercase;transition:color 0.2s;background:none;border:none;}
.site-footer-link:hover{color:var(--txt-1);}
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
  .site-hero{justify-content:flex-start;padding-top:calc(68px + env(safe-area-inset-top,0px) + 40px);}
  .site-wordmark{margin-bottom:14px;}
  .site-tagline{margin-bottom:10px;}
  .site-hero-sub{margin-bottom:24px;font-size:0.88rem;}
  .site-hero-actions{flex-direction:column;align-items:center;gap:8px;width:100%;max-width:320px;}
  .site-hero-actions .btn{width:100%;justify-content:center;padding:13px 20px !important;}
  .site-hero-scroll{display:none;}
  .site-section{padding:44px 20px;}
  .site-feat-grid{margin-top:28px;}
  .site-plans-grid{max-width:100%;}
  .site-cta-actions{flex-direction:column;align-items:center;width:100%;max-width:320px;margin-left:auto;margin-right:auto;}
  .site-cta-actions .btn{width:100%;justify-content:center;}
  .site-footer-inner{flex-direction:column;gap:20px;}
  .site-footer-links{gap:14px;}
}
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
.weekly-pip{width:10px;height:10px;border-radius:2px;}
.weekly-pip.used{background:var(--acc-1);}
.weekly-pip.avail{background:var(--b0);}
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
.fb-card{border-radius:var(--r3);padding:18px;background:var(--bg-1);border:1px solid var(--b0);margin-bottom:10px;transition:border-color 0.17s;cursor:pointer;}
.fb-card:hover{border-color:var(--b1);}
.lead-card{border-radius:var(--r3);padding:18px;background:var(--bg-1);border:1px solid var(--b0);margin-bottom:10px;cursor:pointer;transition:border-color 0.17s;}
.lead-card:hover{border-color:var(--b1);}
.lead-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;}
.lead-name{font-family:var(--fh);font-size:0.82rem;font-weight:700;color:var(--txt-0);}
.lead-meta{font-size:0.65rem;color:var(--txt-2);margin-top:2px;}
.lead-detail{border-radius:var(--r2);padding:14px;background:rgba(0,0,0,0.2);border:1px solid var(--b0);margin-bottom:8px;}
.lead-detail-lbl{font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--txt-2);margin-bottom:4px;font-family:var(--fb);}
.lead-detail-val{font-size:0.79rem;color:var(--txt-1);line-height:1.55;}
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
@media(max-width:700px){.pkg-grid{grid-template-columns:1fr;}}
`;

/* ── STATIC DATA ─────────────────────────────────────────────────────────── */
const NAV = [
  { id:"home",    ic:"⊞", lbl:"Home" },
  { id:"book",    ic:"◷", lbl:"Book" },
  { id:"program", ic:"▦", lbl:"Program" },
  { id:"progress",ic:"◈", lbl:"Progress" },
  { id:"messages",ic:"✉", lbl:"Messages" },
  { id:"profile", ic:"⊙", lbl:"Profile" },
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ── PACKAGE CATALOGUE (client-side reference only — server derives price/sessions from package_id) ── */
const PLAN_CATALOGUE = {
  "Hybrid Coaching":    { sessionsPerPurchase: 8,  weeklyMax: 2, label: "2x / week" },
  "1-on-1 Coaching":    { sessionsPerPurchase: 12, weeklyMax: 3, label: "3x / week" },
  "Online Programming": { sessionsPerPurchase: 4,  weeklyMax: 1, label: "1x / week" },
  "Single Session":     { sessionsPerPurchase: 1,  weeklyMax: 1, label: "1x / week" },
};

const STRIPE_PACKAGES = [
  { id:"single", name:"Single Session", sessions:1,  sessionLabel:"1 session",   desc:"Book one session and experience MLVNT firsthand. No commitment required.", badge:null },
  { id:"4x",     name:"4 Sessions",     sessions:4,  sessionLabel:"4 sessions",  desc:"A structured starting point for building consistency and establishing a strong foundation.", badge:null },
  { id:"8x",     name:"8 Sessions",     sessions:8,  sessionLabel:"8 sessions",  desc:"A balanced approach for steady progress, improved fitness, and noticeable results.", badge:"Most Popular" },
  { id:"12x",    name:"12 Sessions",    sessions:12, sessionLabel:"12 sessions", desc:"For those who are ready to train consistently and accelerate their results.", badge:null },
];

const PENDING_PACKAGE_KEY = "mlvnt_pending_package";

/**
 * The one function allowed to start a Stripe purchase anywhere in the app.
 * Always goes through create-checkout-session (server derives price/
 * sessions from packageId — never trusts anything from the browser).
 * Uses a same-tab redirect (not window.open) since a new tab opened after
 * an async call can be popup-blocked.
 */
async function startCheckout(packageId, opts = {}) {
  const result = await createCheckoutSession(packageId);
  if (!result.ok) {
    if (result.error === "You must be signed in to purchase sessions." && opts.onNeedsAuth) {
      sessionStorage.setItem(PENDING_PACKAGE_KEY, packageId);
      opts.onNeedsAuth();
      return;
    }
    if (opts.onError) opts.onError(result.error || "Could not start checkout. Please try again, or contact your coach.");
    else alert(result.error || "Could not start checkout. Please try again, or contact your coach.");
    return;
  }
  window.location.assign(result.url);
}

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
function Topbar({ title, actions, onMenu, onBack }) {
  return (
    <div className="topbar">
      <div className="flex items-center gap-12">
        {onBack && (
          <button onClick={onBack} style={{background:"none",border:"none",color:"var(--txt-1)",cursor:"pointer",padding:"6px 8px 6px 0",fontSize:"1rem",display:"flex",alignItems:"center",gap:4,flexShrink:0}} aria-label="Back">‹</button>
        )}
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

/* ── AUTH SCREENS ────────────────────────────────────────────────────────── */
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

const OWNER_EMAIL = "mlvnt2026@gmail.com";
function normaliseEmail(raw){ return (raw||"").trim().toLowerCase(); }
function isAdminRole(role){ return role==="owner"||role==="admin"; }
function isOwnerRole(role){ return role==="owner"; }

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
    const mfaState = MFA_STORE.get(sess.email);
    if (sess.mfaRequired || mfaState.enabled) {
      setPending(sess); setMfaStep(true); SEC_LOG.push("mfa_challenge", sess.email);
    } else {
      SESSION_STORE.create(sess);
      SEC_LOG.push("login_success", sess.email, { device: navigator.userAgent.slice(0, 60) });
      onLoginSuccess(sess);
    }
  };

  const submitMFA=()=>{
    if(!mfaCode.trim()){setMfaErr("Please enter your verification code.");return;}
    setMfaErr("");
    const mfaState=MFA_STORE.get(pendingSession.email);
    let valid=false;
    if(useBackup){valid=MFA_STORE.useCode(pendingSession.email,mfaCode);if(!valid){setMfaErr("Invalid backup code.");return;}}
    else{valid=SEC.verifyTOTP(mfaCode,mfaState.secret);if(!valid){setMfaErr("Invalid code. Codes refresh every 30 seconds.");return;}}
    const sessionId=SESSION_STORE.create(pendingSession);
    SEC_LOG.push("mfa_success",pendingSession.email);
    onLoginSuccess({...pendingSession,sessionId});
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
            ← Back to MLVNT
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
function AuthSignup({ onBack }) {
  const [step,   setStep]  = useState(0);
  const [email,  setEmail] = useState("");
  const [name,   setName]  = useState("");
  const [pw,     setPw]    = useState("");
  const [pw2,    setPw2]   = useState("");
  const [showPw, setShow]  = useState(false);
  const [loading,setLoad]  = useState(false);
  const [err,    setErr]   = useState("");
  const [created,  setCreated]   = useState(false);
  const [createdAs,setCreatedAs] = useState(null);

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

  const proceedToLogin = () => { onBack(); };

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
function AuthForgot({ onBack, initialStep = 0 }) {
  const [step,  setStep]  = useState(initialStep);
  const [email, setEmail] = useState("");
  const [pw,    setPw]    = useState("");
  const [pw2,   setPw2]   = useState("");
  const [showPw,setShow]  = useState(false);
  const [loading,setLoad] = useState(false);
  const [err,   setErr]   = useState("");
  const strength=(()=>{if(!pw)return 0;let s=0;if(pw.length>=8)s++;if(pw.length>=12)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;return s;})();

  const requestReset = async () => {
    if(!email){setErr("Please enter your email address.");return;}
    setErr("");setLoad(true);
    await sendPasswordReset(email);
    setLoad(false);
    setStep(1);
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
  const verifyMFA=()=>{
    if(!SEC.verifyTOTP(mfaCode,MFA_STORE.get(session.email).secret)){setErr("Invalid code.");return;}
    SEC_LOG.push("reauth_mfa_success",session.email,{reason});onSuccess();
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
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [saved,setSaved]=useState(false);

  const save = async () => {
    setPwErr("");
    if (!newPw || newPw.length < 8) { setPwErr("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setPwErr("Passwords don't match."); return; }
    setPwSaving(true);
    const result = await updatePassword(newPw);
    setPwSaving(false);
    if (!result.ok) { setPwErr(result.error || "Could not update password."); return; }
    setCurPw(""); setNewPw(""); setConfirmPw("");
    setSaved(true);setTimeout(()=>setSaved(false),2200);
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
        {pwErr && <Alert type="err">{pwErr}</Alert>}
        <div className="form-col mt-8">
          <div className="field"><label className="field-label">Current Password</label><input className="fi" type="password" value={curPw} onChange={e=>setCurPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></div>
          <div className="field"><label className="field-label">New Password</label><input className="fi" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" /></div>
          <div className="field"><label className="field-label">Confirm New Password</label><input className="fi" type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" /></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className={`btn btn-p btn-sm${pwSaving?" btn-loading":""}`} onClick={save} disabled={pwSaving}>{pwSaving?"Updating…":"Update Password"}</button>
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
      <Alert type="info">Passwords stored using PBKDF2-SHA256 with 310,000 iterations and unique salts. Sessions expire after 8 hours (client) or 2 hours (admin). Never stored in plain text.</Alert>
    </div>
  );
}

/* ── ONBOARDING ──────────────────────────────────────────────────────────── */
function Onboarding({ onComplete, session }) {
  const [step, setStep]   = useState(0);
  const [saving, setSaving]= useState(false);

  const [goals, setGoals] = useState([]);
  const [level,    setLevel]    = useState(null);
  const [hadCoach, setHadCoach] = useState(null);
  const [trainDays,     setTrainDays]     = useState([]);
  const [trainTimes,    setTrainTimes]    = useState([]);
  const [sleep,         setSleep]         = useState(null);
  const [stress,        setStress]        = useState(null);
  const [accountability,setAccountability]= useState(null);
  const [checks, setChecks] = useState([false,false,false,false,false]);
  const [obFirstName, setObFirstName] = useState("");
  const [obLastName,  setObLastName]  = useState("");
  const [obPhone,     setObPhone]     = useState("");
  const [obBirthday,  setObBirthday]  = useState("");
  const [obAge,       setObAge]       = useState("");
  const [obHeight,    setObHeight]    = useState("");
  const [obWeight,    setObWeight]    = useState("");
  const [obEmergency, setObEmergency] = useState("");
  const [saveErr, setSaveErr] = useState("");

  const total = OB_STEPS.length;
  const pct   = ((step+1)/total)*100;

  const toggleArr  = (arr, setArr, v) => setArr(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v]);
  const toggleCheck = i => setChecks(p=>p.map((c,idx)=>idx===i?!c:c));

  const handleNext = async () => {
    if (step < total - 1) { setStep(s => s + 1); return; }
    setSaving(true); setSaveErr("");
    if (session?.id) {
      const result = await saveOnboarding(session.id, session.email, {
        firstName: obFirstName, lastName: obLastName,
        phone: obPhone, birthday: obBirthday, age: obAge,
        height: obHeight, weight: obWeight, emergencyContact: obEmergency,
        goals, level, hadCoach, trainDays, trainTimes,
        sleep, stress, accountability,
      });
      setSaving(false);
      if (!result.ok) { setSaveErr(result.error || "Could not save. Please try again."); return; }
    } else {
      setSaving(false);
    }
    onComplete();
  };
  const canAdvance = step<6 || checks.every(Boolean);

  const screens = [
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
          <span className="field-note">🔒 Your birthday is locked after submission.</span>
        </div>
        <div className="field"><label className="field-label">Age</label><input className="fi" type="number" value={obAge} onChange={e=>setObAge(e.target.value)} placeholder="28" /></div>
      </div>
      <div className="form-grid">
        <div className="field"><label className="field-label">Height</label><input className="fi" value={obHeight} onChange={e=>setObHeight(e.target.value)} placeholder="5 ft 11 in" /></div>
        <div className="field"><label className="field-label">Approx. Weight</label><input className="fi" value={obWeight} onChange={e=>setObWeight(e.target.value)} placeholder="175 lbs" /></div>
      </div>
      <div className="field"><label className="field-label">Emergency Contact</label><input className="fi" value={obEmergency} onChange={e=>setObEmergency(e.target.value)} placeholder="Name — Phone Number" /></div>
    </div>,
    <div className="form-col" key="1">
      <div className="field">
        <label className="field-label">Primary Goals (select all that apply)</label>
        <div className="chips mt-8">{GOALS.map(g=><button key={g} className={`chip${goals.includes(g)?" on":""}`} onClick={()=>toggleArr(goals,setGoals,g)}>{g}</button>)}</div>
      </div>
    </div>,
    <div className="form-col" key="2">
      <div className="field">
        <label className="field-label">Experience Level</label>
        <div className="chips mt-8">{LEVELS.map(l=><button key={l} className={`chip${level===l?" on":""}`} onClick={()=>setLevel(l)}>{l}</button>)}</div>
      </div>
      <div className="field">
        <label className="field-label">Have you worked with a coach before?</label>
        <div className="chips mt-8">{["Yes","No"].map(o=><button key={o} className={`chip${hadCoach===o?" on":""}`} onClick={()=>setHadCoach(o)}>{o}</button>)}</div>
      </div>
    </div>,
    <div className="form-col" key="3">
      <div className="field"><label className="field-label">Favorite exercises or movements</label><textarea className="fi" rows={2} placeholder="e.g. Deadlifts, pull-ups, dumbbell bench..." /></div>
      <div className="field"><label className="field-label">Exercises or movements to avoid</label><textarea className="fi" rows={2} placeholder="e.g. Heavy overhead pressing — shoulder history..." /></div>
    </div>,
    <div className="form-col" key="4">
      <Alert type="info">This information is strictly confidential. It helps ensure your program is safe and effective from day one.</Alert>
      <div className="field mt-12"><label className="field-label">Current or past injuries</label><textarea className="fi" rows={2} placeholder="e.g. ACL surgery 2019, chronic lower back pain..." /></div>
      <div className="field"><label className="field-label">Health conditions</label><input className="fi" placeholder="e.g. Hypertension, asthma..." /></div>
    </div>,
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
        <div className="chips mt-8">{["Daily check-ins","Weekly touchpoints","Minimal — just the program"].map(o=><button key={o} className={`chip${accountability===o?" on":""}`} onClick={()=>setAccountability(o)}>{o}</button>)}</div>
      </div>
    </div>,
    <div className="form-col" key="6">
      <div className="waiver-scroll">
        <h4>Waiver & Assumption of Risk</h4>
        <p>I understand that exercise and training involve inherent physical risks. I voluntarily choose to participate and accept full responsibility for my participation.</p>
        <h4>Cancellation Policy</h4>
        <p>Sessions may be canceled or rescheduled up to 12 hours in advance. Cancellations made with less than 12 hours' notice may result in the session being forfeited.</p>
        <h4>Refund & Session Policy</h4>
        <p>All sales are final. Sessions are non-transferable.</p>
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
        </div>
      </div>
      <div className="ob-prog"><div className="ob-prog-fill" style={{width:`${pct}%`}} /></div>

      <div className="ob-body">
        <div className="ob-card page-fade">
          <p className="label mb-8">{OB_STEPS[step]}</p>
          <h2 className="ob-title">{OB_STEPS[step]}</h2>
          <p className="ob-desc">{subtitles[step]}</p>
          {saveErr && <Alert type="err">{saveErr}</Alert>}
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
              disabled={!canAdvance || saving}
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

/* ══════════════════════════════════════════════════════════════════════════
   SESSION ALERT — reads real profileData.sessions_balance, no in-memory store
══════════════════════════════════════════════════════════════════════════ */
function SessionAlert({ setView, profileData }) {
  const bal   = profileData?.sessions_balance ?? 0;
  const [showRenew, setShowRenew] = useState(false);
  const [renewStep, setRenewStep] = useState(0);
  const [selPkg,     setSelPkg]   = useState("8x");
  const [checkoutErr, setCheckoutErr] = useState("");

  if (bal > 3) return null;

  const isEnded = bal === 0;
  const isCrit  = bal === 1;

  const config = isEnded
    ? { level:"critical", icon:"◎", heading:"Your session balance has ended.",
        body:"Add sessions to your account to continue booking and training with Malik.", cta:"Re-Up Sessions", ctaStyle:"btn-p" }
    : isCrit
    ? { level:"critical", icon:"◈", heading:"1 session remaining.",
        body:"You have 1 session left in your account. Add sessions now to avoid a gap in your training.", cta:"Add Sessions", ctaStyle:"btn-p" }
    : { level:"low", icon:"◷", heading:`${bal} sessions remaining.`,
        body:"Sessions remain in your account. Consider topping up before you run out.", cta:"Add Sessions", ctaStyle:"btn-s" };

  const opt = STRIPE_PACKAGES.find(p=>p.id===selPkg) || STRIPE_PACKAGES[2];

  return (
    <>
      <div style={{
        borderRadius:"var(--r3)",padding:"16px 18px",marginBottom:16,
        background: isEnded||isCrit ? "rgba(107,26,26,0.12)" : "rgba(107,74,26,0.12)",
        border: `1px solid ${isEnded||isCrit ? "rgba(180,60,60,0.25)" : "rgba(180,120,40,0.25)"}`,
        display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap",
      }}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1,minWidth:0}}>
          <span style={{fontSize:"1.1rem",flexShrink:0,marginTop:1}}>{config.icon}</span>
          <div>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700,
              color: isEnded||isCrit ? "rgba(220,120,120,0.9)" : "rgba(220,175,100,0.9)", marginBottom:4}}>{config.heading}</p>
            <p style={{fontSize:"0.76rem",color:"var(--txt-1)",lineHeight:1.65}}>{config.body}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap",alignItems:"center"}}>
          <button className={`btn btn-sm ${config.ctaStyle}`} onClick={()=>setShowRenew(true)}>{config.cta}</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setView("messages")}>Message Malik</button>
        </div>
      </div>

      {showRenew && (
        <div style={{position:"fixed",inset:0,background:"rgba(5,6,8,0.88)",backdropFilter:"blur(16px)",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>setShowRenew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,borderRadius:"var(--r5)",
            padding:28,background:"var(--gb2)",border:"1px solid var(--b1)",backdropFilter:"blur(32px)",
            boxShadow:"0 32px 80px rgba(0,0,0,0.8)",position:"relative",overflow:"hidden",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)"}} />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
              <div>
                <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700,color:"var(--txt-0)"}}>Add Sessions</p>
                <p style={{fontSize:"0.7rem",color:"var(--txt-2)",marginTop:3}}>Sessions accumulate in your account — no expiry.</p>
              </div>
              <button onClick={()=>setShowRenew(false)} style={{width:28,height:28,borderRadius:"50%",background:"var(--gb)",border:"1px solid var(--b0)",color:"var(--txt-1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem"}}>✕</button>
            </div>
            {checkoutErr && <Alert type="err">{checkoutErr}</Alert>}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20,marginTop:checkoutErr?12:0}}>
              {STRIPE_PACKAGES.map(pkg=>(
                <div key={pkg.id} onClick={()=>setSelPkg(pkg.id)}
                  style={{padding:"14px 16px",borderRadius:"var(--r3)",cursor:"pointer",transition:"all 0.17s",
                    background: selPkg===pkg.id ? "var(--acc-0)" : "rgba(0,0,0,0.2)",
                    border: `1px solid ${selPkg===pkg.id ? "var(--b1)" : "var(--b0)"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                    <p style={{fontFamily:"var(--fh)",fontSize:"0.84rem",fontWeight:700,color:"var(--txt-0)"}}>{pkg.name}</p>
                    {pkg.badge && <span style={{fontSize:"0.55rem",padding:"2px 7px",borderRadius:100,background:"rgba(42,122,75,0.2)",color:"rgba(140,210,155,0.85)",border:"1px solid rgba(42,122,75,0.25)",fontFamily:"var(--fc)",letterSpacing:"0.08em",textTransform:"uppercase"}}>{pkg.badge}</span>}
                  </div>
                  <p style={{fontSize:"0.65rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em",marginBottom:6}}>{pkg.sessionLabel}</p>
                  <p style={{fontSize:"0.72rem",color:"var(--txt-1)",lineHeight:1.55}}>{pkg.desc}</p>
                </div>
              ))}
            </div>
            <button className="btn btn-p btn-full" onClick={()=>{ setCheckoutErr(""); startCheckout(opt.id, { onError: setCheckoutErr }); }}>
              Get Started — {opt.name}
            </button>
            <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:12,fontSize:"0.6rem",color:"var(--txt-2)",fontFamily:"var(--fc)",letterSpacing:"0.08em"}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Secure checkout powered by Stripe
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── DASHBOARD ───────────────────────────────────────────────────────────── */
function Dashboard({ setView, session, profileData, activeProgram, workoutLogs, coachNote }) {
  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  const hour  = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (session?.name || "").split(" ")[0] || "there";

  const DOW_MAP  = { 0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat" };
  const todayId  = DOW_MAP[new Date().getDay()];
  const todayDay = activeProgram?.days?.find(d=>d.id===todayId) || null;
  const dayLog   = todayDay ? workoutLogs?.[`${activeProgram.id}:${todayId}`] : null;
  const isDone   = !!dayLog?.completed;

  const [clientSessions, setClientSessions] = useState([]);
  useEffect(() => {
    if (!session?.id) return;
    getClientSessions(session.id).then(rows => setClientSessions(rows || []));
  }, [session?.id]);
  const nextSession = clientSessions
    .filter(s => s.status !== "cancelled" && new Date(`${s.date}T00:00:00`) >= new Date(new Date().toDateString()))
    .sort((a,b) => a.date.localeCompare(b.date))[0];

  return (
    <div className="page-fade">
      <Topbar title={`${greeting}, ${firstName}.`}
        actions={<button className="btn btn-p btn-sm" onClick={()=>setView("book")}>+ Book Session</button>} />

      <div className="page-body">
        <p className="body-sm mb-20" style={{color:"var(--txt-2)"}}>{today}</p>

        <div className="kpi-grid">
          <div className="kpi">
            <p className="kpi-label">Next Session</p>
            <div className="kpi-val" style={{fontSize:"1.1rem",marginTop:4}}>
              {nextSession ? `${new Date(`${nextSession.date}T00:00:00`).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}` : "—"}
            </div>
            <p className="kpi-sub">{nextSession ? nextSession.time : "None scheduled"}</p>
          </div>
          <div className="kpi hi">
            <p className="kpi-label">Sessions Available</p>
            <div className="kpi-val">{profileData?.sessions_balance ?? "—"}</div>
            <p className="kpi-sub">{profileData?.package_plan || "No package yet"}</p>
          </div>
          <div className="kpi">
            <p className="kpi-label">Current Block</p>
            <div className="kpi-val" style={{fontSize:"1rem",marginTop:4}}>{activeProgram?.block || "—"}</div>
            <p className="kpi-sub">{activeProgram ? `${activeProgram.phase||""} · Wk ${activeProgram.week}` : "No active program"}</p>
          </div>
          <div className="kpi">
            <p className="kpi-label">Weekly Limit</p>
            <div className="kpi-val" style={{fontSize:"1rem",marginTop:4}}>{profileData?.sessions_weekly_max ?? "—"}x</div>
            <p className="kpi-sub">per week</p>
          </div>
        </div>

        <div className="quick-actions">
          {[["◷","Book","book"],["▦","Program","program"],["◈","Progress","progress"],["✉","Messages","messages"]].map(([ic,lbl,v])=>(
            <div className="qa-btn" key={v} onClick={()=>setView(v)}>
              <span className="qa-ic">{ic}</span>
              <span className="qa-lbl">{lbl}</span>
            </div>
          ))}
        </div>

        {coachNote && (
          <div className="coach-note-banner">
            <div style={{width:6,height:6,borderRadius:"50%",background:"rgba(255,255,255,0.3)",flexShrink:0,marginTop:4}} />
            <div style={{flex:1}}>
              <p className="label mb-6">Latest Coach Note</p>
              <p className="body">{coachNote}</p>
            </div>
          </div>
        )}

        <SessionAlert setView={setView} profileData={profileData} />

        {todayDay && (
          <div style={{borderRadius:"var(--r3)",padding:"16px 18px",marginBottom:16,background:isDone?"rgba(42,122,75,0.08)":"var(--gb2)",border:`1px solid ${isDone?"rgba(42,122,75,0.2)":"var(--b1)"}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}} onClick={()=>setView("program")}>
            <div>
              <p className="label mb-3">Today's Workout</p>
              <p style={{fontFamily:"var(--fh)",fontSize:"0.92rem",fontWeight:700,color:"var(--txt-0)"}}>{todayDay.name} — {todayDay.focus}</p>
              <p style={{fontSize:"0.7rem",color:"var(--txt-1)",marginTop:3}}>{todayDay.exercises?.length||0} exercises</p>
            </div>
            {isDone
              ? <span className="wk-done-badge">✓ Complete</span>
              : <button className="btn btn-p btn-sm" onClick={e=>{e.stopPropagation();setView("program");}}>Start Workout →</button>}
          </div>
        )}

        {activeProgram && (
          <div className="prog-dash-card" onClick={()=>setView("program")} style={{cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <p className="label mb-3">Active Program</p>
                <p style={{fontFamily:"var(--fh)",fontSize:"0.96rem",fontWeight:700,color:"var(--txt-0)"}}>{activeProgram.name}</p>
                <p style={{fontSize:"0.72rem",color:"var(--txt-1)",marginTop:3}}>{activeProgram.block} · {activeProgram.phase}</p>
              </div>
              <span className="prog-status-pill active">Active</span>
            </div>
            <div className="prog-week-bar"><div className="prog-week-fill" style={{width:`${Math.round((activeProgram.week/activeProgram.totalWeeks)*100)}%`}} /></div>
          </div>
        )}

        {!activeProgram && (
          <div className="empty-state" style={{padding:"36px 20px",background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)",marginBottom:16}}>
            <span className="empty-ic">▦</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700,color:"var(--txt-0)"}}>No program assigned yet</p>
            <p className="empty-txt">Your coach is preparing your training program. It will appear here once assigned.</p>
          </div>
        )}

        <div className="dash-grid">
          <div className="card card-p">
            <div className="panel-hd">
              <span className="panel-title">Upcoming Sessions</span>
              <button className="btn btn-ghost btn-xs" onClick={()=>setView("book")}>+ Book</button>
            </div>
            {clientSessions.filter(s=>s.status!=="cancelled").length === 0 ? (
              <p className="body-sm" style={{padding:"8px 0",color:"var(--txt-2)"}}>No sessions booked yet.</p>
            ) : clientSessions.filter(s=>s.status!=="cancelled").slice(0,5).map(s=>(
              <div className="sess-upcoming" key={s.id}>
                <div className="sess-up-info">
                  <span className="sess-up-name">Training Session</span>
                  <span className="sess-up-time">{new Date(`${s.date}T00:00:00`).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · {s.time}</span>
                </div>
                <Tag type={s.status==="completed"?"ok":"pend"}>{s.status}</Tag>
              </div>
            ))}
          </div>

          <div className="card card-p">
            <div className="panel-hd"><span className="panel-title">Package & Sessions</span></div>
            <div style={{padding:"12px 14px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)",marginBottom:14}}>
              <p className="label mb-4">Active Package</p>
              <p className="h3">{profileData?.package_plan || "No package yet"}</p>
              <p className="body-sm mt-4">Sessions don't expire — they accumulate</p>
            </div>
            {[
              ["Sessions Available", String(profileData?.sessions_balance ?? "—")],
              ["Weekly Structure",   `${profileData?.sessions_weekly_max ?? "—"}x per week`],
            ].map(([k,v])=>(
              <div className="list-row" key={k}>
                <span className="list-sub">{k}</span>
                <span style={{fontSize:"0.8rem",color:"var(--txt-0)",fontWeight:400}}>{v}</span>
              </div>
            ))}
            <button className="btn btn-s btn-sm btn-full mt-16" onClick={()=>setView("packages")}>Add Sessions</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── BOOKING ─────────────────────────────────────────────────────────────── */
async function checkBookingEligibility(clientId, profileData) {
  const balance   = profileData?.sessions_balance    ?? 0;
  const weeklyMax = profileData?.sessions_weekly_max ?? 2;
  const plan      = profileData?.package_plan        || "—";
  const weeklyUsed = await getWeeklySessionCount(clientId);
  return evaluateBookingEligibility({ balance, weeklyMax, weeklyUsed, plan });
}

async function getInventoryWarning(clientId, profileData) {
  const bal = profileData?.sessions_balance    ?? 0;
  const wm  = profileData?.sessions_weekly_max ?? 2;
  if (bal === 0) return { level:"critical", msg:"No sessions available. Add sessions to your account to book." };
  if (bal === 1) return { level:"critical", msg:"You have 1 session remaining in your account." };
  const wu = await getWeeklySessionCount(clientId);
  if (wu !== null && wu >= wm) return { level:"low", msg:`Weekly limit reached (${wm}/${wm} used). You can book again from next week.` };
  if (bal <= 3) return { level:"low", msg:`${bal} sessions in your account. Consider topping up soon.` };
  return null;
}

function Booking({ setView, session, profileData, onBack }) {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selDate, setSel]         = useState(now.getDate());
  const [selTime, setTime]        = useState(null);
  const [c1, setC1]               = useState(false);
  const [c2, setC2]               = useState(false);
  const [booked, setBooked]       = useState(false);
  const [loading, setLoad]        = useState(false);
  const [bookErr, setBookErr]     = useState("");
  const submittingRef = useRef(false);

  const [eligibility, setEligibility] = useState({ blocked: true, type: "checking", reason: "Checking availability…", detail: "" });
  const [warning, setWarning] = useState(null);
  const [eligLoading, setEligLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setEligLoading(true);
    Promise.all([
      checkBookingEligibility(session?.id, profileData),
      getInventoryWarning(session?.id, profileData),
    ]).then(([elig, warn]) => {
      if (!alive) return;
      setEligibility(elig); setWarning(warn); setEligLoading(false);
    });
    return () => { alive = false; };
  }, [session?.id, profileData?.sessions_balance, profileData?.sessions_weekly_max]);

  const goToNextMonth = () => {
    const { year, month } = nextCalendarMonth(viewYear, viewMonth);
    setViewYear(year); setViewMonth(month); setSel(null); setTime(null);
  };
  const goToPrevMonth = () => {
    const { year, month } = prevCalendarMonth(viewYear, viewMonth);
    if (isMonthInPast(year, month, now)) return;
    setViewYear(year); setViewMonth(month); setSel(null); setTime(null);
  };
  const prevTarget = prevCalendarMonth(viewYear, viewMonth);
  const canGoPrevMonth = !isMonthInPast(prevTarget.year, prevTarget.month, now);

  const mnth     = MONTHS[viewMonth];
  const yr       = viewYear;
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMo = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells    = [...Array(firstDow).fill(null), ...Array.from({length:daysInMo},(_,i)=>i+1)];
  const ALL_TIMES = ["7:00 AM","8:00 AM","9:00 AM","10:00 AM","12:00 PM","1:00 PM","3:00 PM","5:00 PM","6:00 PM","7:00 PM"];

  const [clientSessions, setClientSessions] = useState([]);
  useEffect(() => {
    if (!session?.id) return;
    getClientSessions(session.id).then(rows => setClientSessions(rows || []));
  }, [session?.id]);
  const hasSess = new Set(
    clientSessions
      .filter(s => { const d = new Date(`${s.date}T00:00:00`); return d.getFullYear()===viewYear && d.getMonth()===viewMonth && s.status !== "cancelled"; })
      .map(s => new Date(`${s.date}T00:00:00`).getDate())
  );

  const [coachAvail, setCoachAvail]   = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [availLoading, setAvailLoad]  = useState(true);
  const [coachId, setCoachId]         = useState(null);

  const loadAvailability = () => {
    setAvailLoad(true);
    getCoachId().then(async cid => {
      setCoachId(cid);
      if (!cid) { setAvailLoad(false); return; }
      const datePrefix = formatIsoDate(viewYear, viewMonth, 1).slice(0, 7);
      const nextM = nextCalendarMonth(viewYear, viewMonth);
      const [avail, sessResult] = await Promise.all([
        getCoachAvailability(cid).catch(() => null),
        supabase.from("sessions").select("date,time,status")
          .eq("coach_id", cid)
          .neq("status","cancelled")
          .gte("date", datePrefix+"-01")
          .lt("date", formatIsoDate(nextM.year, nextM.month, 1))
          .then(({data}) => data || []).catch(() => []),
      ]);
      setCoachAvail(avail);
      setBookedSlots(sessResult.map(s => `${s.date}:${s.time}`));
      setAvailLoad(false);
    }).catch(() => setAvailLoad(false));
  };
  useEffect(() => { loadAvailability(); }, [viewYear, viewMonth]);

  const openDirections = addr => window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank", "noopener");

  const slotStatuses = ALL_TIMES.reduce((acc, t) => {
    let status = "available"; let reason = null;
    const dateStr = formatIsoDate(viewYear, viewMonth, selDate);
    if (coachAvail?.blocked_windows?.length) {
      for (const b of coachAvail.blocked_windows) {
        if (b.date === dateStr) { status = "blocked"; reason = b.reason || "Coach unavailable"; }
      }
    }
    if (bookedSlots.includes(`${dateStr}:${t}`)) { status = "taken"; reason = "Already booked"; }
    if (isSlotInPast(dateStr, t, now)) { status = "taken"; reason = "Past"; }
    acc[t] = { status, reason };
    return acc;
  }, {});

  const confirmBook = async () => {
    if (!c1 || !c2) return;
    if (!selDate || !selTime) { setBookErr("Please select a date and time."); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoad(true); setBookErr("");

    try {
      if (!session?.id) { setBookErr("Your session has expired. Please sign in again."); return; }

      const freshGate = await checkBookingEligibility(session.id, profileData);
      if (freshGate.blocked) { setBookErr(freshGate.reason || "Booking not available."); return; }

      const isoDate = formatIsoDate(viewYear, viewMonth, selDate);
      if (isSlotInPast(isoDate, selTime, now)) { setBookErr("That time has already passed. Please choose a future time."); return; }

      const cid = coachId || await getCoachId().catch(() => null);
      if (!cid) { setBookErr("Could not reach your coach's account. Please try again or message support."); return; }

      const taken = await isSlotTaken(cid, isoDate, selTime);
      if (taken === null) { setBookErr("Couldn't confirm slot availability. Please try again."); return; }
      if (taken) { setBookErr("That time was just booked by someone else. Please choose another slot."); loadAvailability(); return; }

      const result = await createSession({ clientId: session.id, coachId: cid, date: isoDate, time: selTime, notes: "" });
      if (!result.ok) { setBookErr(result.error || "Booking failed. Please try again."); return; }

      createNotification({
        recipientId: cid, type: "session_booked", title: "Session booked",
        body: `${session?.name || "A client"} booked a session for ${isoDate} at ${selTime}.`,
        relatedId: result.session?.id || null,
      }).catch(() => {});

      setBooked(true);
    } catch (e) {
      console.error("confirmBook: unexpected error", e);
      setBookErr("Something went wrong. Please try again.");
    } finally {
      setLoad(false);
      submittingRef.current = false;
    }
  };

  const resetBooking = () => { setBooked(false); setTime(null); setC1(false); setC2(false); loadAvailability(); };
  const availCount = ALL_TIMES.filter(t => slotStatuses[t].status === "available").length;

  return (
    <div className="page-fade">
      <Topbar title="Book a Session" onBack={onBack} />
      <div className="page-body">
        {eligLoading ? (
          <div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner /></div>
        ) : eligibility.blocked ? (
          <div className="inv-lock page-fade">
            <div className="inv-lock-icon">{eligibility.type === "weekly_limit" ? "◷" : "◎"}</div>
            <h2 className="inv-lock-title">{eligibility.reason}</h2>
            <p className="inv-lock-body">{eligibility.detail}</p>
            <div className="inv-lock-actions">
              {eligibility.type !== "weekly_limit" && (
                <button className="btn btn-p btn-sm" onClick={()=>setView("packages")}>Add Sessions</button>
              )}
              <button className="btn btn-s btn-sm" onClick={()=>setView("messages")}>Contact Coach</button>
            </div>
          </div>
        ) : (
          <>
            {warning && (
              <div className={`inv-warn-banner ${warning.level}`}>
                <div className={`inv-warn-dot ${warning.level}`} />
                <p className={`inv-warn-txt ${warning.level}`}>{warning.msg}</p>
              </div>
            )}

            <div className="bal-bar mb-16">
              <div>
                <p className="label mb-4">Sessions Available</p>
                <p className="body-sm">{profileData?.package_plan || "—"} · {profileData?.sessions_weekly_max ?? 2}x / week structure</p>
              </div>
              <span className="bal-n">{profileData?.sessions_balance ?? "—"}</span>
            </div>

            <div className="mb-16">
              <p className="label mb-8">Your Training Location</p>
              {profileData?.location_building ? (
                <div className="loc-card">
                  <div className="loc-icon">📍</div>
                  <div style={{flex:1,minWidth:0}}>
                    <p className="loc-building">{profileData.location_building}</p>
                    {profileData.location_address && <p className="loc-address">{profileData.location_address}</p>}
                  </div>
                  {profileData.location_address && <button className="loc-dir-btn" onClick={()=>openDirections(profileData.location_address)}>↗ Directions</button>}
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
                    <button className="cal-btn" onClick={goToPrevMonth} disabled={!canGoPrevMonth}>‹</button>
                    <button className="cal-btn" onClick={goToNextMonth}>›</button>
                  </div>
                </div>
                <div className="cal-dow">{DAYS.map(d=><div className="cal-dow-lbl" key={d}>{d}</div>)}</div>
                <div className="cal-days">
                  {cells.map((d,i)=>{
                    const isPast  = d ? isPastCalendarDay(viewYear, viewMonth, d, now) : false;
                    const isToday = d && viewYear===now.getFullYear() && viewMonth===now.getMonth() && d===now.getDate();
                    return (
                      <div key={i}
                        className={`cal-day${!d?" empty":""}${d===selDate?" sel":""}${isToday&&d!==selDate?" today":""}${isPast?" past":""}${d&&hasSess.has(d)?" has-sess":""}`}
                        onClick={()=>d&&!isPast&&setSel(d)}
                      >{d||""}</div>
                    );
                  })}
                </div>
                <p className="body-sm mt-12" style={{fontSize:"0.63rem",color:"var(--txt-2)",lineHeight:1.5}}>Dots indicate your existing sessions this month.</p>
              </div>

              <div className="slots-wrap">
                <div className="card card-p">
                  <p className="label mb-10">Available Times · {mnth} {selDate}</p>
                  {availLoading ? (
                    <div style={{display:"flex",justifyContent:"center",padding:30}}><Spinner /></div>
                  ) : (
                    <>
                      <div className="time-grid">
                        {ALL_TIMES.map(t => {
                          const { status, reason } = slotStatuses[t];
                          const isTaken = status === "taken" || status === "blocked";
                          return (
                            <button key={t}
                              className={`time-btn${isTaken?" taken":""}${selTime===t?" sel":""}`}
                              onClick={() => { if(!isTaken) setTime(t); }}
                              title={isTaken ? reason : ""}
                            >{t}</button>
                          );
                        })}
                      </div>
                      <div className="commute-legend">
                        <div className="commute-chip"><div className="commute-dot dot-avail" />{availCount} available</div>
                        <div className="commute-chip"><div className="commute-dot dot-taken" />booked / unavailable</div>
                      </div>
                    </>
                  )}
                </div>

                {selTime && !booked && slotStatuses[selTime]?.status === "available" && (
                  <div className="confirm-card">
                    <p className="label mb-14">Confirm Your Session</p>
                    {[
                      [`${mnth} ${selDate}, ${yr}`, "Date"],
                      [selTime, "Time"],
                      ["Malik Bryant", "Trainer"],
                      [profileData?.location_building || "—", "Location"],
                      [profileData?.sessions_balance != null ? `${Math.max(0,profileData.sessions_balance-1)} after booking` : "—", "After This"],
                    ].map(([v,k])=>(
                      <div className="confirm-row" key={k}>
                        <span className="confirm-k">{k}</span>
                        <span className="confirm-v">{v}</span>
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
                      disabled={!c1||!c2||loading}
                      onClick={confirmBook}
                    >
                      {loading ? <><Spinner />Booking…</> : "Confirm Booking"}
                    </button>
                    {bookErr && <p style={{fontSize:"0.72rem",color:"rgba(220,100,100,0.9)",marginTop:8,textAlign:"center"}}>{bookErr}</p>}
                  </div>
                )}

                {booked && (
                  <div className="confirm-card">
                    <Alert type="ok">
                      Session confirmed — {mnth} {selDate} at {selTime}. A confirmation email is on its way.
                    </Alert>
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
                  "No-shows may result in the loss of that session."].map((item,i)=>(
                  <p key={i} className="body-sm" style={{marginBottom:i<2?8:0}}>— {item}</p>
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
function Program({ session, onBack }) {
  const [tab,       setTab]        = useState("current");
  const [activeDay, setActiveDay]  = useState(null);
  const [openEx,    setOpenEx]     = useState(null);
  const [histOpen,  setHistOpen]   = useState(null);
  const [active,    setActive]     = useState(null);
  const [history,   setHistory]    = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState({});
  const [progLoading, setProgLoading] = useState(true);

  const reload = () => {
    if (!session?.id) return;
    setProgLoading(true);
    getActiveProgram(session.id).then(row => {
      if (!row) { setActive(null); setProgLoading(false); return; }
      const prog = {
        id: row.id, name: row.name, block: row.block, phase: row.phase || "",
        status: row.status, startDate: row.start_date || "", endDate: row.end_date || "",
        week: row.week ?? 1, totalWeeks: row.total_weeks ?? 8, coachNote: row.coach_note || "",
        days: row.days || [], updatedAt: row.updated_at || "",
      };
      setActive(prog);
      // Seed real completion state from Supabase — a completed day must
      // still show as completed after a page refresh.
      Promise.all((prog.days||[]).map(d =>
        getWorkoutLog(prog.id, d.id, session.id).then(log => log ? { key:`${prog.id}:${d.id}`, log } : null)
      )).then(results => {
        const map = {};
        results.filter(Boolean).forEach(({key,log}) => {
          map[key] = { sets: log.sets_data || {}, completed: log.completed || false, completedAt: log.completed_at || null };
        });
        setWorkoutLogs(map);
        setProgLoading(false);
      });
    });
    getPrograms(session.id).then(rows => {
      setHistory(rows.filter(r => r.status !== "active" && r.status !== "draft").map(row => ({
        id: row.id, name: row.name, block: row.block, phase: row.phase || "", status: row.status,
        startDate: row.start_date || "", endDate: row.end_date || "", week: row.week ?? 1,
        totalWeeks: row.total_weeks ?? 8, coachNote: row.coach_note || "", days: row.days || [],
      })));
    });
  };
  useEffect(reload, [session?.id]);

  const progId = active?.id;
  const DOW_MAP = { 0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat" };
  const todayDayId = DOW_MAP[new Date().getDay()];

  const [localSets, setLocalSets] = useState({});
  const toggleSet = (dayId, exId, si) => {
    const key = `${progId}:${dayId}:${exId}`;
    setLocalSets(prev => {
      const s = new Set(prev[key] || wlSetsForEx(dayId, exId));
      s.has(si) ? s.delete(si) : s.add(si);
      return { ...prev, [key]: s };
    });
  };
  const wlSetsForEx = (dayId, exId) => {
    const key = `${progId}:${dayId}:${exId}`;
    if (localSets[key]) return localSets[key];
    const raw = workoutLogs?.[`${progId}:${dayId}`]?.sets?.[exId];
    if (!raw) return new Set();
    if (raw?.sets && Array.isArray(raw.sets)) return new Set(raw.sets.map((s,i)=>s.done?i:-1).filter(i=>i>=0));
    return new Set();
  };
  const isSetDone = (dayId, exId, si) => wlSetsForEx(dayId, exId).has(si);
  const checkedSets = (dayId, exId) => wlSetsForEx(dayId, exId).size;
  const totalChecked = (dayId, exercises) => (exercises||[]).reduce((a,ex)=>a+checkedSets(dayId,ex.id),0);
  const totalSets = (exercises) => (exercises||[]).reduce((a,ex)=>a+(typeof ex.sets==="number"?ex.sets:ex.sets?.length||0),0);
  const isDayDone = (dayId) => !!workoutLogs?.[`${progId}:${dayId}`]?.completed;

  const completeDay = async (dayId) => {
    const day = active?.days?.find(d=>d.id===dayId);
    const completedAt = new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
    const setsObj = {};
    (day?.exercises||[]).forEach(ex => {
      const done = wlSetsForEx(dayId, ex.id);
      const numSets = typeof ex.sets==="number"?ex.sets:ex.sets?.length||0;
      setsObj[ex.id] = { sets: Array.from({length:numSets},(_,si)=>({done: done.has(si)})) };
    });
    await saveWorkoutLog(progId, dayId, session.id, { sets: setsObj, completed: true, completedAt }).catch(()=>{});
    getCoachId().then(cid => {
      if (!cid) return;
      createNotification({
        recipientId: cid, type: "workout_completed", title: "Workout completed",
        body: `${session.name || "A client"} completed ${day?.name || "a workout"}.`, relatedId: progId,
      }).catch(()=>{});
    });
    setActiveDay(null);
    reload();
  };

  const pct = active ? Math.round((active.week/active.totalWeeks)*100) : 0;

  if (progLoading) return (
    <div className="page-fade"><Topbar title="My Program" onBack={onBack} />
      <div className="page-body" style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner /></div>
    </div>
  );

  if (activeDay && active) {
    const day = active.days.find(d=>d.id===activeDay);
    if (!day) { setActiveDay(null); return null; }
    const done = isDayDone(activeDay);
    const total = totalSets(day.exercises);
    const checked = totalChecked(activeDay, day.exercises);
    const allChecked = checked >= total && total > 0;

    return (
      <div className="page-fade">
        <Topbar title={day.name} actions={<button className="btn btn-ghost btn-sm" onClick={()=>setActiveDay(null)}>← Back</button>} />
        <div className="page-body">
          <div className="prog-header">
            <p style={{fontFamily:"var(--fh)",fontSize:"1.1rem",fontWeight:700,color:"var(--txt-0)"}}>{day.focus}</p>
            <p style={{fontSize:"0.72rem",color:"var(--txt-1)",marginTop:3}}>{day.exercises.length} exercises · {total} total sets</p>
          </div>
          {day.exercises.map(ex => {
            const numSets = typeof ex.sets==="number"?ex.sets:ex.sets?.length||0;
            const repsArr = (ex.repsScheme||"").split(",");
            return (
              <div className="wk-ex-card" key={ex.id}>
                <div className="wk-ex-head">
                  <div>
                    <p className="wk-ex-name">{ex.name}</p>
                    <div className="wk-ex-specs">
                      <span className="wk-ex-spec">{numSets} sets</span>
                      {ex.weight && <span className="wk-ex-spec">{ex.weight}</span>}
                      {ex.rest && <span className="wk-ex-spec">{ex.rest} rest</span>}
                    </div>
                  </div>
                </div>
                {Array.from({length:numSets},(_,si)=>{
                  const isDone = isSetDone(activeDay, ex.id, si);
                  return (
                    <div className="wk-set-row" key={si}>
                      <span className="wk-set-label">Set {si+1}</span>
                      <span className="wk-set-target">{repsArr[si]||repsArr[0]||"—"} reps</span>
                      <button className={`set-bubble${isDone?" done":""}`} onClick={()=>!done && toggleSet(activeDay, ex.id, si)}>{isDone?"✓":""}</button>
                    </div>
                  );
                })}
                {ex.note && <div className="ex-note-block" style={{marginTop:10}}>{ex.note}</div>}
              </div>
            );
          })}
          {!done && (
            <div className="wk-day-complete-bar">
              <p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700,marginBottom:6,color:"var(--txt-0)"}}>
                {allChecked ? "All sets complete. Nice work." : `${checked} of ${total} sets completed.`}
              </p>
              <button className={`btn btn-full${allChecked?" btn-p":" btn-s"}`} style={{opacity:allChecked?1:0.5,maxWidth:320,margin:"0 auto"}}
                onClick={()=>{ if(allChecked) completeDay(activeDay); }}>
                {allChecked ? "Mark Workout Complete ✓" : `${total-checked} sets remaining`}
              </button>
            </div>
          )}
          {done && (
            <div className="wk-day-complete-bar">
              <div style={{fontSize:"1.4rem",marginBottom:8}}>✓</div>
              <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700,color:"var(--txt-0)"}}>Workout Complete</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade">
      <Topbar title="My Program" onBack={onBack} actions={active ? <Tag type="blue">{active.block} · Wk {active.week}</Tag> : null} />
      <div className="page-body">
        <div className="prog-tabs">
          <button className={`prog-tab${tab==="current"?" on":""}`} onClick={()=>setTab("current")}>Current Program</button>
          <button className={`prog-tab${tab==="history"?" on":""}`} onClick={()=>setTab("history")}>History {history.length>0 && <span style={{marginLeft:5}}>{history.length}</span>}</button>
        </div>
        {tab==="current" && (active ? (
          <>
            <div className="prog-header">
              <p style={{fontFamily:"var(--fh)",fontSize:"1.2rem",fontWeight:700,color:"var(--txt-0)"}}>{active.name}</p>
              <p style={{fontSize:"0.76rem",color:"var(--txt-1)",marginTop:4}}>{active.block} · {active.phase}</p>
              <div className="prog-week-bar"><div className="prog-week-fill" style={{width:`${pct}%`}} /></div>
              {active.coachNote && (
                <div style={{marginTop:14,padding:"11px 14px",borderRadius:"var(--r2)",background:"rgba(0,0,0,0.2)",border:"1px solid var(--b0)"}}>
                  <p style={{fontSize:"0.78rem",color:"var(--txt-1)",lineHeight:1.65}}>{active.coachNote}</p>
                </div>
              )}
            </div>
            <p className="label mb-10">Training Days</p>
            {active.days.map(day=>{
              const done = isDayDone(day.id);
              const isToday = day.id === todayDayId;
              return (
                <div className="day-card" key={day.id} style={{cursor:"pointer",borderColor:done?"rgba(42,122,75,0.25)":isToday?"var(--b1)":"var(--b0)"}} onClick={()=>setActiveDay(day.id)}>
                  <div className="day-card-head" style={{background:"none"}}>
                    <div><p className="day-card-title">{day.name}</p><p className="day-card-sub">{day.focus} · {day.exercises.length} exercises</p></div>
                    {done && <span className="wk-done-badge">✓ Done</span>}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="empty-state" style={{background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)"}}>
            <span className="empty-ic">▦</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>No Active Program</p>
            <p className="empty-txt">Your coach hasn't assigned a program yet.</p>
          </div>
        ))}
        {tab==="history" && (history.length>0 ? history.map(prog=>(
          <div className="hist-card" key={prog.id}>
            <p className="hist-card-name">{prog.name}</p>
            <p className="hist-card-meta">{prog.block} · {prog.startDate} – {prog.endDate}</p>
          </div>
        )) : (
          <div className="empty-state" style={{background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)"}}>
            <span className="empty-ic">◎</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>No History Yet</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PROGRESS ────────────────────────────────────────────────────────────── */
function Progress({ onBack }) {
  return (
    <div className="page-fade">
      <Topbar title="Progress" onBack={onBack} />
      <div className="page-body">
        <div className="empty-state" style={{background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)"}}>
          <span className="empty-ic">◈</span>
          <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>Not enough data yet</p>
          <p className="empty-txt">Progress metrics will appear here as you complete sessions and log workouts.</p>
        </div>
      </div>
    </div>
  );
}

/* ── FEEDBACK ────────────────────────────────────────────────────────────── */
function Feedback({ onBack }) {
  const [submitted, setDone] = useState(false);
  return (
    <div className="page-fade">
      <Topbar title="Program Reflection" onBack={onBack} />
      <div className="page-body centered" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"50vh"}}>
        {submitted ? (
          <div className="empty-state">
            <span style={{fontSize:"2.5rem"}}>✓</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"1.2rem",fontWeight:700,color:"var(--txt-0)"}}>Thanks for the feedback</p>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-ic">◎</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>Coming Soon</p>
            <p className="empty-txt">Program reflection isn't available yet. Message Malik directly with any feedback in the meantime.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── MESSAGES (client) — real Supabase, persists across refresh ──────────── */
function Messages({ session, onRead, onBack }) {
  const [msgs, setMsgs]     = useState([]);
  const [input, setInput]   = useState("");
  const [loading, setLoad]  = useState(true);
  const [msgErr, setMsgErr] = useState("");
  const [coachId, setCoachId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!session?.id) { setLoad(false); return; }
    let sub = null;
    getCoachId().then(id => {
      setCoachId(id);
      if (!id) { setLoad(false); return; }
      getMessages(session.id, id).then(rows => {
        setMsgs(rows || []);
        setLoad(false);
        markMessagesRead(session.id, id).catch(()=>{});
        if (onRead) onRead();
        setTimeout(() => bottomRef.current?.scrollIntoView({behavior:"smooth"}), 100);
      }).catch(() => { setMsgErr("Could not load messages."); setLoad(false); });

      sub = subscribeToMessages(session.id, newMsg => {
        setMsgs(p => [...p.filter(m=>!String(m.id).startsWith("tmp-")||m.content!==newMsg.content), newMsg]);
        markMessagesRead(session.id, id).catch(()=>{});
        if (onRead) onRead();
        setTimeout(() => bottomRef.current?.scrollIntoView({behavior:"smooth"}), 50);
      });
    });
    return () => { try { sub?.unsubscribe(); } catch(_){} };
  }, [session?.id]);

  const send = async () => {
    const text = input.trim();
    if (!text || !coachId) return;
    setInput("");
    const optimistic = { id:`tmp-${Date.now()}`, sender_id: session.id, receiver_id: coachId, content: text, created_at: new Date().toISOString() };
    setMsgs(p => [...p, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    await sendMessage(session.id, coachId, text).catch(()=>{});
    createNotification({ recipientId: coachId, type:"new_message", title:"New message", body: text.slice(0,60), relatedId: session.id }).catch(()=>{});
  };

  return (
    <div className="page-fade" style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <Topbar title="Messages" onBack={onBack} />
      <div className="msg-layout" style={{flex:1}}>
        <div className="msg-list">
          <p className="label mb-10" style={{padding:"0 2px"}}>Conversations</p>
          <div className="msg-thread active">
            <div className="msg-av">MB</div>
            <div style={{flex:1}}><span className="msg-thread-name">Malik Bryant</span><p className="msg-thread-preview">Your coach</p></div>
          </div>
        </div>
        <div className="msg-chat">
          <div className="msg-chat-head"><div className="msg-av">MB</div><div><p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700}}>Malik Bryant</p></div></div>
          <div className="msg-chat-body">
            {loading && <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner /></div>}
            {!loading && msgErr && <div className="empty-state" style={{paddingTop:60}}><p className="empty-txt">{msgErr}</p></div>}
            {!loading && !msgErr && msgs.length===0 && (
              <div className="empty-state" style={{paddingTop:60}}>
                <span className="empty-ic">✉</span>
                <p style={{fontFamily:"var(--fh)",fontSize:"0.9rem",fontWeight:700,color:"var(--txt-0)"}}>No messages yet</p>
                <p className="empty-txt">Your conversation with Malik will appear here.</p>
              </div>
            )}
            {!loading && !msgErr && msgs.map((m,i)=>{
              const isMe = m.sender_id === session?.id;
              const time = m.created_at ? new Date(m.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : "";
              return (
                <div key={m.id||i} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
                  <div className={`bubble ${isMe?"me":"them"}`}>{m.content||""}</div>
                  <span className="bubble-time">{time}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="msg-chat-foot">
            <div className="msg-input-row">
              <input className="fi msg-input" placeholder={coachId?"Message Malik…":"Connecting…"} value={input} disabled={!coachId}
                onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} />
              <button className="btn btn-p btn-sm" onClick={send} disabled={!coachId||!input.trim()}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PROFILE / SETTINGS ──────────────────────────────────────────────────── */
function ProfileSettings({ onLogout, session, profileData, onBack, onProfileSaved }) {
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const [firstName, setFirstName] = useState((session?.name||"").split(" ")[0]||"");
  const [lastName, setLastName] = useState((session?.name||"").split(" ").slice(1).join(" ")||"");
  const [phone, setPhone] = useState(profileData?.phone||"");
  const [height, setHeight] = useState(profileData?.height||"");
  const [weight, setWeight] = useState(profileData?.weight||"");
  const [locBuilding, setLocBuilding] = useState(profileData?.location_building||"");
  const [locAddress, setLocAddress] = useState(profileData?.location_address||"");

  const flashSaved = () => { setSaved(true); setTimeout(()=>setSaved(false),2500); };

  const saveProfile = async () => {
    setSaving(true); setErr("");
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const [r1, r2] = await Promise.all([
      saveProfileName(session.id, fullName),
      saveClientProfile(session.id, { phone: phone.trim()||null, height: height.trim()||null, weight: weight.trim()||null }),
    ]);
    setSaving(false);
    if (!r1.ok || !r2.ok) { setErr(r1.error||r2.error||"Save failed."); return; }
    flashSaved();
    if (onProfileSaved) onProfileSaved();
  };

  const saveLocation = async () => {
    setSaving(true); setErr("");
    const result = await saveClientProfile(session.id, { location_building: locBuilding.trim()||null, location_address: locAddress.trim()||null });
    setSaving(false);
    if (!result.ok) { setErr(result.error||"Save failed."); return; }
    flashSaved();
    if (onProfileSaved) onProfileSaved();
  };

  const tabs = [{id:"profile",lbl:"Profile"},{id:"location",lbl:"Training Location"},{id:"account",lbl:"Account"},{id:"security",lbl:"Security"}];

  return (
    <div className="page-fade">
      <Topbar title="Profile & Settings" onBack={onBack} actions={<div className="flex items-center gap-8"><SaveIndicator saving={saving} />{saved && <span className="body-sm" style={{color:"rgba(140,220,155,0.8)",fontSize:"0.7rem"}}>✓ Saved</span>}</div>} />
      <div className="page-body" style={{padding:"24px 0"}}>
        <div className="settings-layout">
          <div className="settings-nav">
            {tabs.map(t=><div key={t.id} className={`settings-tab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.lbl}</div>)}
            <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid var(--b0)"}}>
              <button className="btn btn-danger btn-sm btn-full" onClick={onLogout}>Sign Out</button>
            </div>
          </div>
          <div className="settings-content">
            {err && <Alert type="err">{err}</Alert>}
            {tab==="profile" && (
              <div className="form-col">
                <div className="flex items-center gap-16 mb-24">
                  <div className="avatar-lg">{session?.init||"?"}</div>
                  <div><p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>{session?.name||"—"}</p><p className="body-sm">{profileData?.package_plan||"Active Client"}</p></div>
                </div>
                <div className="form-grid">
                  <div className="field"><label className="field-label">First Name</label><input className="fi" value={firstName} onChange={e=>setFirstName(e.target.value)} /></div>
                  <div className="field"><label className="field-label">Last Name</label><input className="fi" value={lastName} onChange={e=>setLastName(e.target.value)} /></div>
                </div>
                <div className="field"><label className="field-label">Email Address</label><input className="fi" type="email" value={session?.email||""} readOnly style={{opacity:0.6}} /></div>
                <div className="field"><label className="field-label">Phone Number</label><input className="fi" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 (555) 000-0000" /></div>
                <div className="form-grid">
                  <div className="field"><label className="field-label">Height</label><input className="fi" value={height} onChange={e=>setHeight(e.target.value)} placeholder="5 ft 11 in" /></div>
                  <div className="field"><label className="field-label">Weight</label><input className="fi" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="175 lbs" /></div>
                </div>
                <button className="btn btn-p btn-sm" onClick={saveProfile} disabled={saving}>{saving?"Saving…":"Save Changes"}</button>
              </div>
            )}
            {tab==="location" && (
              <div className="form-col">
                <div className="field"><label className="field-label">Building / Gym Name</label><input className="fi" value={locBuilding} onChange={e=>setLocBuilding(e.target.value)} placeholder="e.g. Equinox Hudson Yards" /></div>
                <div className="field"><label className="field-label">Full Address</label><input className="fi" value={locAddress} onChange={e=>setLocAddress(e.target.value)} placeholder="Full street address" /></div>
                <button className="btn btn-p btn-sm" onClick={saveLocation} disabled={saving}>{saving?"Saving…":"Save Location"}</button>
              </div>
            )}
            {tab==="account" && (
              <div className="form-col">
                <div className="card card-p">
                  <p className="label mb-8">Active Package</p>
                  <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>{profileData?.package_plan||"—"}</p>
                  {[["Sessions Available",String(profileData?.sessions_balance??"—")],["Weekly Structure",`${profileData?.sessions_weekly_max??"—"}x per week`]].map(([k,v])=>(
                    <div className="list-row" key={k}><span className="list-sub">{k}</span><span className="list-main" style={{fontSize:"0.78rem"}}>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
            {tab==="security" && <SecuritySettings session={session} onSetupMFA={()=>{}} onLogoutAll={()=>{}} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── APP SHELL — real data orchestration ─────────────────────────────────── */
function AppShell({ onLogout, session }) {
  const [view, setView] = useState("home");
  const [navStack, setNavStack] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [activeProgram, setActiveProgram] = useState(null);
  const [workoutLogs, setWorkoutLogs] = useState({});
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const navigate = (id) => {
    setNavStack(s => id==="home" ? [] : [...s, view]);
    setView(id);
    if (id === "messages") setUnreadMsgs(0);
  };
  const goBack = () => {
    const prev = navStack[navStack.length-1] ?? "home";
    setNavStack(s => s.slice(0,-1));
    setView(prev);
  };

  const reloadProfile = () => {
    if (!session?.id) return;
    getClientProfile(session.id).then(p => setProfileData(p));
  };
  const reloadProgram = () => {
    if (!session?.id) return;
    getActiveProgram(session.id).then(row => {
      if (!row) { setActiveProgram(null); return; }
      const prog = { id:row.id, name:row.name, block:row.block, phase:row.phase||"", status:row.status,
        week:row.week??1, totalWeeks:row.total_weeks??8, coachNote:row.coach_note||"", days:row.days||[] };
      setActiveProgram(prog);
      Promise.all((prog.days||[]).map(d => getWorkoutLog(prog.id, d.id, session.id).then(log => log?{key:`${prog.id}:${d.id}`,log}:null)))
        .then(results => {
          const map = {};
          results.filter(Boolean).forEach(({key,log}) => { map[key] = { completed: log.completed||false }; });
          setWorkoutLogs(map);
        });
    });
  };
  const reloadUnread = () => {
    if (!session?.id) return;
    getUnreadMessageCount(session.id).then(setUnreadMsgs).catch(()=>{});
    getUnreadNotificationCount(session.id).then(setUnreadNotifs).catch(()=>{});
  };

  useEffect(() => {
    reloadProfile(); reloadProgram(); reloadUnread();
    const interval = setInterval(reloadUnread, 30000);
    const notifSub = session?.id ? subscribeToNotifications(session.id, () => setUnreadNotifs(n=>n+1)) : null;
    const profileSub = session?.id ? supabase.channel(`client_profiles:${session.id}`)
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"client_profiles", filter:`id=eq.${session.id}` }, reloadProfile)
      .subscribe() : null;
    return () => { clearInterval(interval); notifSub?.unsubscribe(); profileSub?.unsubscribe(); };
  }, [session?.id]);

  const views = {
    home:     <Dashboard setView={navigate} session={session} profileData={profileData} activeProgram={activeProgram} workoutLogs={workoutLogs} coachNote={activeProgram?.coachNote} />,
    book:     <Booking setView={navigate} session={session} profileData={profileData} onBack={goBack} />,
    program:  <Program session={session} onBack={goBack} />,
    progress: <Progress onBack={goBack} />,
    feedback: <Feedback onBack={goBack} />,
    messages: <Messages session={session} onRead={reloadUnread} onBack={goBack} />,
    profile:  <ProfileSettings onLogout={onLogout} session={session} profileData={profileData} onBack={goBack} onProfileSaved={reloadProfile} />,
    packages: <PackagePricing onBack={goBack} onConsult={()=>navigate("consultation")} />,
    consultation: <ConsultationFlow onBack={goBack} onComplete={()=>navigate("home")} />,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sb-brand"><div><div className="sb-logo">MLVNT</div><div className="sb-tagline">Time Moves. So Should You.</div></div></div>
        <p className="sb-sec">Main</p>
        {NAV.map(item => {
          const badge = item.id==="messages" ? unreadMsgs : 0;
          return (
            <div key={item.id} className={`sb-item${view===item.id?" active":""}`} onClick={()=>navigate(item.id)}>
              <span className="ic">{item.ic}</span><span>{item.lbl}</span>
              {badge>0 && <span className="sb-badge">{badge}</span>}
            </div>
          );
        })}
        <p className="sb-sec">Account</p>
        <div className={`sb-item${view==="profile"?" active":""}`} onClick={()=>navigate("profile")}><span className="ic">⊙</span><span>Profile & Settings</span></div>
        <div className="sb-user">
          <div className="sb-av">{session?.init||"?"}</div>
          <div style={{overflow:"hidden"}}><p className="sb-name">{session?.name||"Client"}</p><p className="sb-role">{profileData?.package_plan||"Client"}</p></div>
        </div>
      </aside>
      <div className="main-col">{views[view]||views["home"]}</div>
      <nav className="mob-nav">
        <div className="mob-nav-inner">
          {NAV.map(item => {
            const badge = item.id==="messages" ? unreadMsgs : 0;
            return (
              <button key={item.id} className={`mob-tab${view===item.id?" active":""}`} onClick={()=>navigate(item.id)}>
                {badge>0 && <span className="mob-tab-badge">{badge>9?"9+":badge}</span>}
                <span className="ic">{item.ic}</span><span className="lbl">{item.lbl}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ── PACKAGE PRICING ─────────────────────────────────────────────────────── */
function PackagePricing({ onBack, onConsult, onNeedsAuth }) {
  const [checkoutErr, setCheckoutErr] = useState("");
  return (
    <div className="page-fade">
      <Topbar title="Training Plans" onBack={onBack} />
      <div className="page-body">
        {checkoutErr && <Alert type="err">{checkoutErr}</Alert>}
        <div className="pkg-grid">
          {STRIPE_PACKAGES.map(pkg=>(
            <div key={pkg.id} className={`pkg-card${pkg.badge?" featured":""}`}>
              {pkg.badge && <span className="pkg-badge">{pkg.badge}</span>}
              <p className="pkg-name">{pkg.name}</p>
              <p className="pkg-sess-lbl">{pkg.sessionLabel}</p>
              <div className="pkg-divider" />
              <p className="pkg-desc">{pkg.desc}</p>
              <button className="btn btn-p btn-full btn-sm"
                onClick={() => { setCheckoutErr(""); startCheckout(pkg.id, { onNeedsAuth, onError: setCheckoutErr }); }}>
                Get Started
              </button>
            </div>
          ))}
        </div>
        <div className="card card-p mt-16" style={{textAlign:"center"}}>
          <p className="body">Not sure which plan fits? <span className="auth-link" style={{fontWeight:500,color:"var(--txt-0)"}} onClick={onConsult}>Book a free consultation →</span></p>
        </div>
      </div>
    </div>
  );
}

/* ── CONSULTATION FLOW — real submission, no fake setTimeout, no silent loss ── */
const CONSULT_TIMES = ["9:00 AM","10:00 AM","11:00 AM","1:00 PM","2:00 PM","3:00 PM","5:00 PM","6:00 PM"];

function ConsultationFlow({ onBack, onComplete }) {
  const [step, setStep] = useState(0);
  const total = 6;
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [age,       setAge]       = useState("");
  const [goals,     setGoals]     = useState([]);
  const [level,     setLevel]     = useState(null);
  const [hadCoach,  setHadCoach]  = useState(null);
  const [trainFreq, setTrainFreq] = useState(null);
  const [gymAccess, setGymAccess] = useState(null);
  const [location,  setLocation]  = useState("");
  const [injuries,    setInjuries]    = useState("");
  const [surgeries,   setSurgeries]   = useState("");
  const [conditions,  setConditions]  = useState("");
  const [medications, setMedications] = useState("");
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selDate, setSelDate] = useState(null);
  const [selTime, setSelTime] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const submittingRef = useRef(false);

  const toggleGoal = g => setGoals(p => p.includes(g) ? p.filter(x=>x!==g) : [...p,g]);

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMo = new Date(viewYear, viewMonth+1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({length:daysInMo},(_,i)=>i+1)];
  const goPrev = () => { const {year,month}=prevCalendarMonth(viewYear,viewMonth); if(isMonthInPast(year,month,now))return; setViewYear(year);setViewMonth(month);setSelDate(null); };
  const goNext = () => { const {year,month}=nextCalendarMonth(viewYear,viewMonth); setViewYear(year);setViewMonth(month);setSelDate(null); };
  const prevT = prevCalendarMonth(viewYear, viewMonth);
  const canPrev = !isMonthInPast(prevT.year, prevT.month, now);

  const dateDisplay = selDate ? `${MONTHS[viewMonth]} ${selDate}, ${viewYear}` : "";
  const timeDisplay = selTime || "";

  const canNext = [
    firstName.trim() && lastName.trim() && email.trim() && phone.trim(),
    goals.length > 0 && !!level,
    trainFreq !== null,
    true,
    true,
    !!selDate && !!selTime,
  ];

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true); setSubmitErr("");

    try {
      const isoDate = formatIsoDate(viewYear, viewMonth, selDate);
      if (isSlotInPast(isoDate, selTime, now)) {
        setSubmitErr("That time has already passed. Please choose a future time.");
        return;
      }

      const result = await saveConsultationRequest({
        firstName, lastName, email, phone, goals, selDate: isoDate, selTime,
      });
      if (!result.ok) {
        setSubmitErr(result.error || "Failed to submit. Please try again.");
        return;
      }

      sendConsultationEmails({
        consultationId: result.request?.id, firstName, lastName, email, phone, age,
        goals, level, hadCoach, trainFreq, gymAccess, location,
        injuries, surgeries, conditions, medications,
        dateDisplay, timeDisplay,
      }).catch(e => console.error("email function error", e?.message || e));

      setStep(6);
    } catch (e) {
      console.error("Consultation submit failed:", e);
      setSubmitErr(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  };

  const pct = ((Math.min(step,total-1)+1)/total)*100;

  if (step === 6) return (
    <div className="consult-shell">
      <div className="consult-head"><span className="consult-brand">MLVNT</span></div>
      <div className="consult-body">
        <div className="consult-card page-fade" style={{textAlign:"center"}}>
          <div className="consult-shimmer" />
          <div className="consult-success-icon" style={{margin:"0 auto 16px"}}>✓</div>
          <h2 className="consult-title">You're Confirmed</h2>
          <p className="consult-desc">Your free consultation with Malik is booked for <strong style={{color:"var(--txt-0)"}}>{dateDisplay}</strong> at <strong style={{color:"var(--txt-0)"}}>{timeDisplay}</strong>. A confirmation email is on its way to {email}.</p>
          <button className="btn btn-p btn-full" onClick={onComplete}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="consult-shell">
      <div className="consult-head">
        <span className="consult-brand">MLVNT</span>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>✕ Close</button>
      </div>
      <div className="consult-prog"><div className="consult-prog-fill" style={{width:`${pct}%`}} /></div>
      <div className="consult-body">
        <div className="consult-card page-fade">
          <div className="consult-shimmer" />
          <p className="consult-step-lbl">Step {step+1} of {total}</p>
          {submitErr && <Alert type="err">{submitErr}</Alert>}

          {step===0 && (<>
            <h2 className="consult-title">Let's start with the basics</h2>
            <p className="consult-desc">Tell us how to reach you.</p>
            <div className="form-col">
              <div className="form-grid">
                <div className="field"><label className="field-label">First Name</label><input className="fi" value={firstName} onChange={e=>setFirstName(e.target.value)} /></div>
                <div className="field"><label className="field-label">Last Name</label><input className="fi" value={lastName} onChange={e=>setLastName(e.target.value)} /></div>
              </div>
              <div className="field"><label className="field-label">Email</label><input className="fi" type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
              <div className="field"><label className="field-label">Phone</label><input className="fi" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
              <div className="field"><label className="field-label">Age</label><input className="fi" type="number" value={age} onChange={e=>setAge(e.target.value)} /></div>
            </div>
          </>)}

          {step===1 && (<>
            <h2 className="consult-title">What are your goals?</h2>
            <p className="consult-desc">Select everything that applies.</p>
            <div className="chips mb-20">{GOALS.map(g=><button key={g} className={`chip${goals.includes(g)?" on":""}`} onClick={()=>toggleGoal(g)}>{g}</button>)}</div>
            <div className="field"><label className="field-label">Experience Level</label><div className="chips mt-8">{LEVELS.map(l=><button key={l} className={`chip${level===l?" on":""}`} onClick={()=>setLevel(l)}>{l}</button>)}</div></div>
            <div className="field mt-14"><label className="field-label">Worked with a coach before?</label><div className="chips mt-8">{["Yes","No"].map(o=><button key={o} className={`chip${hadCoach===o?" on":""}`} onClick={()=>setHadCoach(o)}>{o}</button>)}</div></div>
          </>)}

          {step===2 && (<>
            <h2 className="consult-title">Training availability</h2>
            <p className="consult-desc">Roughly how often can you train?</p>
            <div className="chips mb-16">{["1x / week","2x / week","3x / week","4+ / week"].map(o=><button key={o} className={`chip${trainFreq===o?" on":""}`} onClick={()=>setTrainFreq(o)}>{o}</button>)}</div>
            <div className="field"><label className="field-label">Gym access?</label><div className="chips mt-8">{["Full gym","Home equipment","Bodyweight only"].map(o=><button key={o} className={`chip${gymAccess===o?" on":""}`} onClick={()=>setGymAccess(o)}>{o}</button>)}</div></div>
            <div className="field mt-14"><label className="field-label">Location / Neighborhood</label><input className="fi" value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Hudson Yards, NYC" /></div>
          </>)}

          {step===3 && (<>
            <h2 className="consult-title">Health check</h2>
            <p className="consult-desc">Strictly confidential — helps Malik plan safely.</p>
            <div className="field"><label className="field-label">Current or past injuries</label><textarea className="fi" rows={2} value={injuries} onChange={e=>setInjuries(e.target.value)} /></div>
            <div className="field mt-12"><label className="field-label">Surgeries</label><textarea className="fi" rows={2} value={surgeries} onChange={e=>setSurgeries(e.target.value)} /></div>
          </>)}

          {step===4 && (<>
            <h2 className="consult-title">Anything else?</h2>
            <p className="consult-desc">Medical conditions or medications Malik should be aware of.</p>
            <div className="field"><label className="field-label">Health conditions</label><input className="fi" value={conditions} onChange={e=>setConditions(e.target.value)} /></div>
            <div className="field mt-12"><label className="field-label">Medications</label><input className="fi" value={medications} onChange={e=>setMedications(e.target.value)} /></div>
          </>)}

          {step===5 && (<>
            <h2 className="consult-title">Pick a time</h2>
            <p className="consult-desc">30-minute free consultation call.</p>
            <div className="cal-card" style={{padding:16,marginBottom:14}}>
              <div className="cal-head"><span className="cal-month" style={{fontSize:"0.82rem"}}>{MONTHS[viewMonth]} {viewYear}</span>
                <div className="cal-nav-row"><button className="cal-btn" onClick={goPrev} disabled={!canPrev}>‹</button><button className="cal-btn" onClick={goNext}>›</button></div>
              </div>
              <div className="cal-dow">{DAYS.map(d=><div className="cal-dow-lbl" key={d}>{d}</div>)}</div>
              <div className="cal-days">
                {cells.map((d,i)=>{
                  const isPast = d ? isPastCalendarDay(viewYear, viewMonth, d, now) : false;
                  return <div key={i} className={`cal-day${!d?" empty":""}${d===selDate?" sel":""}${isPast?" past":""}`} onClick={()=>d&&!isPast&&setSelDate(d)}>{d||""}</div>;
                })}
              </div>
            </div>
            {selDate && (
              <div className="consult-time-grid">
                {CONSULT_TIMES.map(t=>{
                  const isoDate = formatIsoDate(viewYear, viewMonth, selDate);
                  const past = isSlotInPast(isoDate, t, now);
                  return <button key={t} className={`consult-time-btn${selTime===t?" sel":""}${past?" unavail":""}`} onClick={()=>!past&&setSelTime(t)}>{t}</button>;
                })}
              </div>
            )}
          </>)}

          <div className="consult-nav">
            <button className="btn btn-s btn-sm" onClick={()=>step>0?setStep(s=>s-1):onBack()}>← {step===0?"Cancel":"Back"}</button>
            <div className="consult-dots">{Array.from({length:total}).map((_,i)=><div key={i} className={`consult-dot${i===step?" curr":i<step?" done":" idle"}`} />)}</div>
            <button className={`btn btn-sm${canNext[step]?" btn-p":" btn-s"}`} style={{opacity:canNext[step]?1:0.4}}
              disabled={!canNext[step] || saving}
              onClick={()=>{ if(!canNext[step])return; step<total-1?setStep(s=>s+1):submit(); }}>
              {saving ? <><Spinner />Submitting…</> : step<total-1 ? "Continue →" : "Confirm Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── CONSULTATION RECOMMENDATION (post-consultation, coach reaches out) ── */
function ConsultationRecommendation({ onProceed, onBack }) {
  const [sel, setSel] = useState("8x");
  const selected = STRIPE_PACKAGES.find(p=>p.id===sel) || STRIPE_PACKAGES[2];
  return (
    <div className="page-fade">
      <Topbar title="Recommended Plan" onBack={onBack} />
      <div className="page-body narrow">
        <p className="body mb-20">Based on your consultation, here's a plan to get started.</p>
        {STRIPE_PACKAGES.map(pkg=>(
          <div key={pkg.id} className={`consult-pkg-card${sel===pkg.id?" sel":""}`} onClick={()=>setSel(pkg.id)}>
            <p className="consult-pkg-name">{pkg.name}</p>
            <p className="consult-pkg-desc">{pkg.desc}</p>
          </div>
        ))}
        <button className="btn btn-p btn-full mt-16" onClick={() => startCheckout(selected.id)}>
          Get Started — {selected.name}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN / COACH SIDE — all real data, no CLIENTS/CONSULT_STORE/ADMIN_WEEK/
   REVENUE_DATA mock arrays
══════════════════════════════════════════════════════════════════════════ */
const ADMIN_NAV = [
  { id:"dashboard", ic:"⊞", lbl:"Dashboard" },
  { id:"clients",   ic:"◉", lbl:"Clients" },
  { id:"schedule",  ic:"◷", lbl:"Schedule" },
  { id:"programs",  ic:"▦", lbl:"Programs" },
  { id:"packages",  ic:"◈", lbl:"Sessions" },
  { id:"consultations", ic:"☎", lbl:"Leads" },
  { id:"messages",  ic:"✉", lbl:"Messages" },
  { id:"analytics", ic:"◫", lbl:"Analytics" },
];

function initialsOf(name) {
  return (name||"").trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase() || "?";
}

/* ── ADMIN DASHBOARD ─────────────────────────────────────────────────────── */
function AdminDashboard({ setView }) {
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0,10);
    Promise.all([listClients(), getCoachSessions(today), getConsultationRequests()])
      .then(([c,s,l]) => { setClients(c||[]); setSessions(s||[]); setLeads(l||[]); setLoad(false); });
  }, []);

  const activeClients = clients.filter(c => c.client_profiles?.lifecycle_status === "active_client" || c.client_profiles?.sessions_balance > 0);
  const lowBalance = clients.filter(c => (c.client_profiles?.sessions_balance ?? 0) <= 1 && (c.client_profiles?.sessions_balance ?? 0) > 0);
  const pendingLeads = leads.filter(l => l.status === "pending" || !l.status);
  const todaySessions = sessions.filter(s => s.status !== "cancelled");

  if (loading) return <div className="page-fade"><Topbar title="Dashboard" /><div className="page-body" style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner /></div></div>;

  return (
    <div className="page-fade">
      <Topbar title="Coach Dashboard" />
      <div className="page-body">
        <div className="a-kpi-row">
          <div className="a-kpi accent"><p className="a-kpi-lbl">Active Clients</p><p className="a-kpi-n">{activeClients.length}</p></div>
          <div className="a-kpi"><p className="a-kpi-lbl">Total Clients</p><p className="a-kpi-n">{clients.length}</p></div>
          <div className="a-kpi warn"><p className="a-kpi-lbl">Low Balance</p><p className="a-kpi-n">{lowBalance.length}</p></div>
          <div className="a-kpi ok"><p className="a-kpi-lbl">New Leads</p><p className="a-kpi-n">{pendingLeads.length}</p></div>
        </div>
        <div className="a-grid-2">
          <div className="a-panel">
            <div className="a-panel-hd"><span className="a-panel-title">Today's Sessions</span><button className="btn btn-ghost btn-xs" onClick={()=>setView("schedule")}>View Schedule</button></div>
            {todaySessions.length===0 ? <p className="body-sm" style={{padding:"8px 0"}}>Nothing booked today.</p> : todaySessions.slice(0,6).map(s=>(
              <div className="a-row" key={s.id}><div><p className="a-row-main">{s.profiles?.name || "Client"}</p><p className="a-row-sub">{s.time}</p></div><Tag type={s.status==="completed"?"ok":"pend"}>{s.status}</Tag></div>
            ))}
          </div>
          <div className="a-panel">
            <div className="a-panel-hd"><span className="a-panel-title">Pending Leads</span><button className="btn btn-ghost btn-xs" onClick={()=>setView("consultations")}>View All</button></div>
            {pendingLeads.length===0 ? <p className="body-sm" style={{padding:"8px 0"}}>No pending consultation requests.</p> : pendingLeads.slice(0,6).map(l=>(
              <div className="a-row" key={l.id}><div><p className="a-row-main">{l.first_name} {l.last_name}</p><p className="a-row-sub">{l.requested_date} · {l.requested_time}</p></div><Tag type="warn">New</Tag></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN CLIENTS ───────────────────────────────────────────────────────── */
function AdminClients({ onOpenClient }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoad] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => { listClients().then(rows => { setClients(rows||[]); setLoad(false); }); }, []);

  const filtered = clients.filter(c => (c.name||c.email||"").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page-fade">
      <Topbar title="Clients" actions={<input className="fi" placeholder="Search clients…" value={q} onChange={e=>setQ(e.target.value)} style={{width:220}} />} />
      <div className="page-body">
        {loading ? <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner /></div> :
        filtered.length===0 ? (
          <div className="empty-state" style={{background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)"}}>
            <span className="empty-ic">◉</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>No clients yet</p>
            <p className="empty-txt">Clients appear here once they sign up.</p>
          </div>
        ) : (
          <table className="client-table">
            <thead><tr><th>Client</th><th>Package</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={()=>onOpenClient(c)}>
                  <td><div className="flex items-center gap-8"><div className="c-av">{initialsOf(c.name||c.email)}</div><div><p className="c-name">{c.name||"—"}</p><p className="c-detail">{c.email}</p></div></div></td>
                  <td>{c.client_profiles?.package_plan || "—"}</td>
                  <td>{c.client_profiles?.sessions_balance ?? "—"}</td>
                  <td><Tag type={c.client_profiles?.lifecycle_status==="active_client"?"ok":"pend"}>{c.client_profiles?.lifecycle_status||"lead"}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── ADMIN CLIENT PROFILE ────────────────────────────────────────────────── */
function AdminClientProfile({ client, onBack, onUpdated }) {
  const [tab, setTab] = useState("overview");
  const [adjAmt, setAdjAmt] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [adjErr, setAdjErr] = useState("");
  const [balance, setBalance] = useState(client.client_profiles?.sessions_balance ?? 0);
  const [saved, setSaved] = useState(false);

  const applyAdj = async (sign) => {
    const n = parseInt(adjAmt || "0");
    if (!n || isNaN(n)) return;
    const delta = sign * n;
    const reason = adjNote.trim() || (sign>0 ? "Coach adjustment (add)" : "Coach adjustment (remove)");
    const result = await adjustSessionBalance(client.id, delta, reason);
    if (!result.ok) { setAdjErr(result.error || "Could not adjust balance."); return; }
    setAdjErr(""); setBalance(result.newBalance);
    setAdjAmt(""); setAdjNote("");
    setSaved(true); setTimeout(()=>setSaved(false),2000);
    if (onUpdated) onUpdated();
  };

  const quickAdd = async (name, cfg) => {
    const result = await adjustSessionBalance(client.id, cfg.sessionsPerPurchase, `Quick add: ${name}`);
    if (!result.ok) { setAdjErr(result.error||"Could not add sessions."); return; }
    setBalance(result.newBalance);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
    if (onUpdated) onUpdated();
  };

  return (
    <div className="page-fade">
      <Topbar title={client.name || client.email} onBack={onBack} />
      <div className="page-body">
        <div className="cp-tabs">
          {[["overview","Overview"],["sessions","Sessions"],["programs","Programs"]].map(([id,lbl])=>(
            <button key={id} className={`cp-tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>
        {tab==="overview" && (
          <div className="form-col">
            <div className="cp-stat-row">
              <div className="cp-stat"><p className="cp-stat-n">{balance}</p><p className="cp-stat-l">Sessions Available</p></div>
              <div className="cp-stat"><p className="cp-stat-n">{client.client_profiles?.sessions_weekly_max ?? "—"}x</p><p className="cp-stat-l">Weekly Max</p></div>
            </div>
            <div className="info-block"><p className="info-block-title">Email</p><p className="info-val">{client.email}</p></div>
            <div className="info-block"><p className="info-block-title">Phone</p><p className="info-val">{client.client_profiles?.phone || "—"}</p></div>
            <div className="info-block"><p className="info-block-title">Package</p><p className="info-val">{client.client_profiles?.package_plan || "—"}</p></div>
            <div className="info-block"><p className="info-block-title">Lifecycle Status</p><p className="info-val">{client.client_profiles?.lifecycle_status || "lead"}</p></div>
          </div>
        )}
        {tab==="sessions" && (
          <div className="form-col">
            {adjErr && <Alert type="err">{adjErr}</Alert>}
            <div className="card card-p">
              <p className="label mb-10">Adjust Balance</p>
              <div className="flex gap-8 items-center">
                <input className="fi" type="number" placeholder="Amount" value={adjAmt} onChange={e=>setAdjAmt(e.target.value)} style={{width:100}} />
                <input className="fi" placeholder="Reason (optional)" value={adjNote} onChange={e=>setAdjNote(e.target.value)} style={{flex:1}} />
                <button className="btn btn-s btn-sm" onClick={()=>applyAdj(1)}>+ Add</button>
                <button className="btn btn-danger btn-sm" onClick={()=>applyAdj(-1)}>− Remove</button>
              </div>
              {saved && <p style={{fontSize:"0.7rem",color:"rgba(140,220,155,0.8)",marginTop:8}}>✓ Balance updated</p>}
            </div>
            <div className="card card-p">
              <p className="label mb-10">Quick Add</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {Object.entries(PLAN_CATALOGUE).map(([name,cfg])=>(
                  <button key={name} className="btn btn-s btn-xs" onClick={()=>quickAdd(name,cfg)}>+{cfg.sessionsPerPurchase} ({name.split(" ")[0]})</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab==="programs" && (
          <div className="empty-state" style={{background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)"}}>
            <span className="empty-ic">▦</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"0.95rem",fontWeight:700}}>Manage from the Programs tab</p>
            <p className="empty-txt">Use the main Programs screen to assign or edit this client's program.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ADMIN SCHEDULE ──────────────────────────────────────────────────────── */
function AdminSchedule() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoad] = useState(true);

  const reload = () => {
    const today = new Date().toISOString().slice(0,10);
    getCoachSessions(today).then(rows => { setSessions(rows||[]); setLoad(false); });
  };
  useEffect(reload, []);

  const markStatus = async (id, status) => {
    await updateSessionStatus(id, status);
    reload();
  };

  const byDate = {};
  sessions.forEach(s => { (byDate[s.date] = byDate[s.date]||[]).push(s); });

  return (
    <div className="page-fade">
      <Topbar title="Schedule" />
      <div className="page-body">
        {loading ? <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner /></div> :
        Object.keys(byDate).length===0 ? (
          <div className="empty-state" style={{background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)"}}>
            <span className="empty-ic">◷</span>
            <p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>No upcoming sessions</p>
          </div>
        ) : Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b)).map(([date, rows])=>(
          <div className="card card-p mb-12" key={date}>
            <p className="label mb-10">{new Date(`${date}T00:00:00`).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
            {rows.sort((a,b)=>a.time.localeCompare(b.time)).map(s=>(
              <div className="coach-sched-row" key={s.id}>
                <span className="coach-sched-time">{s.time}</span>
                <span style={{flex:1,fontSize:"0.8rem",color:"var(--txt-0)"}}>{s.profiles?.name || "Client"}</span>
                <Tag type={s.status==="completed"?"ok":s.status==="cancelled"?"pend":"warn"}>{s.status}</Tag>
                {s.status==="booked" && (
                  <div className="flex gap-6" style={{marginLeft:10}}>
                    <button className="btn btn-s btn-xs" onClick={()=>markStatus(s.id,"completed")}>Complete</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>markStatus(s.id,"no_show")}>No-Show</button>
                    <button className="btn btn-danger btn-xs" onClick={()=>markStatus(s.id,"cancelled")}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── ADMIN PACKAGES (session inventory across all clients) ──────────────── */
function AdminPackages({ onOpenClient }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoad] = useState(true);
  useEffect(() => { listClients().then(rows => { setClients(rows||[]); setLoad(false); }); }, []);

  return (
    <div className="page-fade">
      <Topbar title="Session Inventory" />
      <div className="page-body">
        {loading ? <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner /></div> :
        clients.length===0 ? (
          <div className="empty-state" style={{background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)"}}><span className="empty-ic">◈</span><p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>No clients yet</p></div>
        ) : (
          <table className="client-table">
            <thead><tr><th>Client</th><th>Package</th><th>Balance</th><th></th></tr></thead>
            <tbody>
              {clients.map(c=>(
                <tr key={c.id} onClick={()=>onOpenClient(c)}>
                  <td><div className="flex items-center gap-8"><div className="c-av">{initialsOf(c.name||c.email)}</div><span className="c-name">{c.name||c.email}</span></div></td>
                  <td>{c.client_profiles?.package_plan||"—"}</td>
                  <td>{c.client_profiles?.sessions_balance ?? "—"}</td>
                  <td><button className="btn btn-s btn-xs" onClick={e=>{e.stopPropagation();onOpenClient(c);}}>Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── ADMIN CONSULTATIONS (real leads, not CONSULT_STORE) ─────────────────── */
function AdminConsultations() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoad] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");

  const reload = () => getConsultationRequests().then(rows => { setLeads(rows||[]); setLoad(false); });
  useEffect(reload, []);

  const updateStatus = async (status) => {
    if (!selected) return;
    await updateConsultationStatus(selected.id, status, note);
    setSelected(null); setNote("");
    reload();
  };

  return (
    <div className="page-fade">
      <Topbar title="Consultation Leads" onBack={selected?()=>setSelected(null):undefined} />
      <div className="page-body">
        {loading ? <div style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner /></div> :
        selected ? (
          <div className="form-col">
            <div className="lead-detail"><p className="lead-detail-lbl">Name</p><p className="lead-detail-val">{selected.first_name} {selected.last_name}</p></div>
            <div className="lead-detail"><p className="lead-detail-lbl">Email</p><p className="lead-detail-val">{selected.email}</p></div>
            <div className="lead-detail"><p className="lead-detail-lbl">Phone</p><p className="lead-detail-val">{selected.phone||"—"}</p></div>
            <div className="lead-detail"><p className="lead-detail-lbl">Requested</p><p className="lead-detail-val">{selected.requested_date} · {selected.requested_time}</p></div>
            <div className="lead-detail"><p className="lead-detail-lbl">Goals</p><p className="lead-detail-val">{(selected.goals||[]).join(", ")||"—"}</p></div>
            <div className="field"><label className="field-label">Coach Notes</label><textarea className="fi" rows={3} value={note} onChange={e=>setNote(e.target.value)} /></div>
            <div className="flex gap-8">
              <button className="btn btn-p btn-sm" onClick={()=>updateStatus("contacted")}>Mark Contacted</button>
              <button className="btn btn-s btn-sm" onClick={()=>updateStatus("converted")}>Mark Converted</button>
              <button className="btn btn-danger btn-sm" onClick={()=>updateStatus("declined")}>Decline</button>
            </div>
          </div>
        ) : leads.length===0 ? (
          <div className="empty-state" style={{background:"var(--gb)",borderRadius:"var(--r4)",border:"1px solid var(--b0)"}}><span className="empty-ic">☎</span><p style={{fontFamily:"var(--fh)",fontSize:"1rem",fontWeight:700}}>No consultation requests yet</p></div>
        ) : leads.map(l=>(
          <div className="lead-card" key={l.id} onClick={()=>setSelected(l)}>
            <div className="lead-card-head"><span className="lead-name">{l.first_name} {l.last_name}</span><Tag type={l.status==="converted"?"ok":l.status==="declined"?"pend":"warn"}>{l.status||"pending"}</Tag></div>
            <p className="lead-meta">{l.requested_date} · {l.requested_time} · {l.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── ADMIN MESSAGES ──────────────────────────────────────────────────────── */
function AdminMessages({ session }) {
  const [clients, setClients] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { listClients().then(rows => setClients(rows||[])); }, []);
  useEffect(() => {
    if (!active) return;
    getMessages(session.id, active.id).then(rows => {
      setMsgs(rows||[]);
      markMessagesRead(session.id, active.id).catch(()=>{});
      setTimeout(()=>bottomRef.current?.scrollIntoView(),100);
    });
    const sub = subscribeToMessages(session.id, m => { if (m.sender_id===active.id) setMsgs(p=>[...p,m]); });
    return () => { try{sub?.unsubscribe();}catch(_){} };
  }, [active?.id]);

  const send = async () => {
    const text = input.trim();
    if (!text || !active) return;
    setInput("");
    setMsgs(p => [...p, { id:`tmp-${Date.now()}`, sender_id: session.id, receiver_id: active.id, content: text, created_at: new Date().toISOString() }]);
    await sendMessage(session.id, active.id, text).catch(()=>{});
    createNotification({ recipientId: active.id, type:"new_message", title:"New message from your coach", body: text.slice(0,60) }).catch(()=>{});
  };

  return (
    <div className="page-fade" style={{height:"100%"}}>
      <Topbar title="Messages" />
      <div className="msg-layout">
        <div className="msg-list">
          {clients.map(c=>(
            <div key={c.id} className={`msg-thread${active?.id===c.id?" active":""}`} onClick={()=>setActive(c)}>
              <div className="msg-av">{initialsOf(c.name||c.email)}</div>
              <div style={{flex:1,minWidth:0}}><span className="msg-thread-name">{c.name||c.email}</span></div>
            </div>
          ))}
        </div>
        <div className="msg-chat">
          {!active ? (
            <div className="empty-state" style={{paddingTop:80}}><span className="empty-ic">✉</span><p className="empty-txt">Select a client to view the conversation.</p></div>
          ) : (<>
            <div className="msg-chat-head"><div className="msg-av">{initialsOf(active.name||active.email)}</div><p style={{fontFamily:"var(--fh)",fontSize:"0.88rem",fontWeight:700}}>{active.name||active.email}</p></div>
            <div className="msg-chat-body">
              {msgs.map((m,i)=>{
                const isMe = m.sender_id === session.id;
                return <div key={m.id||i} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}><div className={`bubble ${isMe?"me":"them"}`}>{m.content}</div></div>;
              })}
              <div ref={bottomRef} />
            </div>
            <div className="msg-chat-foot"><div className="msg-input-row"><input className="fi msg-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a message…" /><button className="btn btn-p btn-sm" onClick={send}>Send</button></div></div>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN ANALYTICS — real revenue from session_purchases, no fabricated figures ── */
function AdminAnalytics() {
  const [purchases, setPurchases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    Promise.all([getAllSessionPurchases(), listClients()]).then(([p,c]) => { setPurchases(p||[]); setClients(c||[]); setLoad(false); });
  }, []);

  const totalRevenueCents = purchases.reduce((sum,p) => sum + (p.amount_total||0), 0);
  const totalRevenue = (totalRevenueCents/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
  const totalSessionsSold = purchases.reduce((sum,p) => sum + (p.sessions_added||0), 0);

  if (loading) return <div className="page-fade"><Topbar title="Analytics" /><div className="page-body" style={{display:"flex",justifyContent:"center",paddingTop:60}}><Spinner /></div></div>;

  return (
    <div className="page-fade">
      <Topbar title="Analytics" />
      <div className="page-body">
        <div className="a-kpi-row">
          <div className="a-kpi accent"><p className="a-kpi-lbl">Total Revenue</p><p className="a-kpi-n">{totalRevenue}</p><p className="a-kpi-sub">{purchases.length} purchases</p></div>
          <div className="a-kpi"><p className="a-kpi-lbl">Sessions Sold</p><p className="a-kpi-n">{totalSessionsSold}</p></div>
          <div className="a-kpi"><p className="a-kpi-lbl">Total Clients</p><p className="a-kpi-n">{clients.length}</p></div>
        </div>
        <div className="a-panel">
          <div className="a-panel-hd"><span className="a-panel-title">Recent Purchases</span></div>
          {purchases.length===0 ? <p className="body-sm" style={{padding:"8px 0"}}>No purchases yet.</p> : purchases.slice(0,15).map(p=>(
            <div className="a-row" key={p.id}>
              <div><p className="a-row-main">{p.profiles?.name || p.client_id}</p><p className="a-row-sub">{p.package_id} · {p.sessions_added} sessions</p></div>
              <span style={{fontSize:"0.8rem",color:"var(--txt-0)"}}>{((p.amount_total||0)/100).toLocaleString("en-US",{style:"currency",currency:p.currency||"usd"})}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN PROGRAMS (already real in prior build — reproduced, unchanged logic) ── */
function AdminPrograms() {
  const [tab, setTab] = useState("library");
  const [clients, setClients] = useState([]);
  const [library, setLibrary] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoad] = useState(true);
  const [editing, setEditing] = useState(null);

  const reload = () => {
    setLoad(true);
    Promise.all([listClients(), getPrograms(null)]).then(([c]) => {
      setClients(c||[]);
      setLoad(false);
    });
  };
  useEffect(reload, []);

  const createNew = async () => {
    const result = await createProgram(null, null, { name:"New Program" });
    if (result.ok) setEditing(result.program);
  };

  return (
    <div className="page-fade">
      <Topbar title="Programs" actions={<button className="btn btn-p btn-sm" onClick={createNew}>+ New Program</button>} />
      <div className="page-body">
        <div className="prog-tabs">
          <button className={`prog-tab${tab==="library"?" on":""}`} onClick={()=>setTab("library")}>Library</button>
          <button className={`prog-tab${tab==="clients"?" on":""}`} onClick={()=>setTab("clients")}>Assign to Client</button>
        </div>
        {tab==="clients" && (
          loading ? <div style={{display:"flex",justifyContent:"center",paddingTop:40}}><Spinner /></div> :
          clients.length===0 ? <p className="body-sm">No clients yet.</p> :
          clients.map(c => <AdminClientProgramRow key={c.id} client={c} />)
        )}
        {tab==="library" && (
          <p className="body-sm">Create and edit reusable program templates, then assign them to clients from the "Assign to Client" tab.</p>
        )}
      </div>
    </div>
  );
}

function AdminClientProgramRow({ client }) {
  const [prog, setProg] = useState(null);
  useEffect(() => { getActiveProgram(client.id).then(setProg); }, [client.id]);
  return (
    <div className="a-row">
      <div><p className="a-row-main">{client.name||client.email}</p><p className="a-row-sub">{prog ? `${prog.name} · Wk ${prog.week}` : "No active program"}</p></div>
    </div>
  );
}

/* ── PUBLIC SITE ─────────────────────────────────────────────────────────── */
function PublicSite({ onLogin, onSignup, onConsult, onPackages }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState("");
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = id => { setMobOpen(false); document.getElementById(id)?.scrollIntoView({behavior:"smooth"}); };

  return (
    <div>
      <nav className={`site-nav${scrolled?" scrolled":""}`}>
        <span className="site-nav-logo" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>MLVNT</span>
        <div className="site-nav-links">
          <button className="site-nav-link" onClick={()=>scrollTo("about")}>About</button>
          <button className="site-nav-link" onClick={()=>scrollTo("plans")}>Plans</button>
          <button className="site-nav-link" onClick={()=>scrollTo("how")}>How It Works</button>
        </div>
        <div className="site-nav-actions">
          <button className="btn btn-s btn-sm" onClick={onLogin}>Sign In</button>
          <button className="btn btn-p btn-sm site-nav-book" onClick={onConsult}>Book Consultation</button>
          <button className="btn btn-icon site-mob-toggle" onClick={()=>setMobOpen(true)}>≡</button>
        </div>
      </nav>

      {mobOpen && (
        <div className="site-mob-menu">
          <button className="site-mob-close" onClick={()=>setMobOpen(false)}>✕</button>
          <button className="site-mob-link" onClick={()=>scrollTo("about")}>About</button>
          <button className="site-mob-link" onClick={()=>scrollTo("plans")}>Plans</button>
          <button className="site-mob-link" onClick={()=>scrollTo("how")}>How It Works</button>
          <button className="site-mob-link" onClick={()=>{setMobOpen(false);onConsult();}}>Book Consultation</button>
          <button className="site-mob-link" onClick={()=>{setMobOpen(false);onLogin();}}>Sign In</button>
        </div>
      )}

      <div className="site-hero">
        <div className="site-hero-bg" /><div className="site-hero-glow" />
        <h1 className="site-wordmark">MLVNT</h1>
        <p className="site-tagline">Time Moves. So Should You.</p>
        <p className="site-hero-sub">Personal training built around your body, your schedule, and your goals — coached by Malik Bryant.</p>
        <div className="site-hero-actions">
          <button className="btn btn-p" onClick={onConsult}>Book a Free Consultation</button>
          <button className="btn btn-s" onClick={onPackages}>View Training Plans</button>
        </div>
      </div>

      <section className="site-section" id="about">
        <div className="site-section-inner site-about-inner">
          <div className="site-about-av" />
          <div>
            <p className="site-section-label">About Your Coach</p>
            <h2 className="site-section-title">Malik Bryant</h2>
            <p className="site-section-body">A coaching approach built on real accountability, structured programming, and training that fits into your actual life — not a generic template.</p>
          </div>
        </div>
      </section>

      <div className="site-rule" />

      <section className="site-section" id="plans">
        <div className="site-section-inner">
          <p className="site-section-label">Training Plans</p>
          <h2 className="site-section-title">Choose your starting point</h2>
          {checkoutErr && <Alert type="err">{checkoutErr}</Alert>}
          <div className="site-plans-grid">
            {STRIPE_PACKAGES.map(pkg=>(
              <div key={pkg.id} className={`site-plan-card${pkg.badge?" pop":""}`}>
                {pkg.badge && <span className="site-plan-badge">{pkg.badge}</span>}
                <p className="site-plan-name">{pkg.name}</p>
                <p className="site-plan-sess">{pkg.sessionLabel}</p>
                <div className="site-plan-divider" />
                <p className="site-plan-desc">{pkg.desc}</p>
                <button className="btn btn-p btn-full btn-sm"
                  onClick={()=>{ setCheckoutErr(""); startCheckout(pkg.id, { onNeedsAuth: onLogin, onError: setCheckoutErr }); }}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="site-rule" />

      <section className="site-section" id="how">
        <div className="site-section-inner">
          <p className="site-section-label">How It Works</p>
          <h2 className="site-section-title">Three steps to start training</h2>
          <div className="site-steps">
            {[["1","Book a Consultation","A free 30-minute call to talk through your goals."],
              ["2","Get Your Plan","Malik designs a program built around your body and schedule."],
              ["3","Start Training","Book sessions, track progress, and stay accountable."]].map(([n,t,b])=>(
              <div className="site-step" key={n}><div className="site-step-n">{n}</div><p className="site-step-title">{t}</p><p className="site-step-body">{b}</p></div>
            ))}
          </div>
        </div>
      </section>

      <div className="site-cta-band">
        <div className="site-cta-inner">
          <h2 className="site-section-title">Ready to start?</h2>
          <div className="site-cta-actions">
            <button className="btn btn-p" onClick={onConsult}>Book a Free Consultation</button>
            <button className="btn btn-s" onClick={onSignup}>Create an Account</button>
          </div>
        </div>
      </div>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span className="site-footer-copy">© {new Date().getFullYear()} MLVNT. All rights reserved.</span>
          <div className="site-footer-links">
            <button className="site-footer-link" onClick={onLogin}>Sign In</button>
            <button className="site-footer-link" onClick={onConsult}>Book Consultation</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── ADMIN SHELL ─────────────────────────────────────────────────────────── */
function AdminShell({ onLogout, session }) {
  const [view, setView] = useState("dashboard");
  const [openClient, setOpenClient] = useState(null);

  const handleOpenClient = (c) => setOpenClient(c);
  const handleClientUpdated = () => {
    // Refresh handled by each panel's own reload on next mount / navigation.
  };

  let content;
  if (openClient) {
    content = <AdminClientProfile client={openClient} onBack={()=>setOpenClient(null)} onUpdated={handleClientUpdated} />;
  } else {
    const views = {
      dashboard:     <AdminDashboard setView={setView} />,
      clients:       <AdminClients onOpenClient={handleOpenClient} />,
      schedule:      <AdminSchedule />,
      programs:      <AdminPrograms />,
      packages:      <AdminPackages onOpenClient={handleOpenClient} />,
      consultations: <AdminConsultations />,
      messages:      <AdminMessages session={session} />,
      analytics:     <AdminAnalytics />,
    };
    content = views[view] || views["dashboard"];
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sb-brand"><div><div className="sb-logo">MLVNT</div><div className="sb-tagline">Coach Console</div></div></div>
        <p className="sb-sec">Manage</p>
        {ADMIN_NAV.map(item=>(
          <div key={item.id} className={`sb-item${view===item.id&&!openClient?" active":""}`} onClick={()=>{setView(item.id);setOpenClient(null);}}>
            <span className="ic">{item.ic}</span><span>{item.lbl}</span>
          </div>
        ))}
        <div className="sb-user">
          <div className="sb-av">{session?.init||"?"}</div>
          <div style={{overflow:"hidden"}}><p className="sb-name">{session?.name||"Coach"}</p><p className="sb-role">{session?.role}</p></div>
        </div>
        <button className="btn btn-danger btn-sm btn-full mt-16" onClick={onLogout}>Sign Out</button>
      </aside>
      <div className="main-col">{content}</div>
    </div>
  );
}

/* ── ROOT APP ────────────────────────────────────────────────────────────── */
export default function App() {
  const [screen, setScreen]   = useState("loading");
  const [session, setSession] = useState(null);
  const [denied, setDenied]   = useState(false);
  const [reauth, setReauth]   = useState(null);

  useEffect(() => {
    getSession().then(sess => {
      if (!sess) { setScreen("public"); return; }
      handleLoginSuccess(sess, true);
    });
    const sub = onAuthStateChange((event, sess) => {
      if (event === "SIGNED_OUT") { setSession(null); setScreen("public"); return; }
      if (event === "PASSWORD_RECOVERY") {
        // The user clicked the reset-password email link. Supabase has
        // auto-established a temporary session from the recovery token —
        // that is NOT a normal login. Route to the "set a new password"
        // screen instead of silently signing them into their dashboard,
        // which is what happened before this fix (the reset never
        // actually completed — the user just got logged in unchanged).
        setSession(sess);
        setScreen("reset_password");
      }
    });
    return () => { try { sub?.unsubscribe?.(); } catch(_){} };
  }, []);

  const handleLoginSuccess = (sess, silent = false) => {
    setSession(sess);
    setDenied(false);

    if (!sess.emailVerified) { setScreen("verify_email"); return; }

    const isCoach = isAdminRole(sess.role);
    if (isCoach && !sess.mfaSetupDone) { setScreen("mfa_setup"); return; }

    if (isCoach) {
      if (!silent) SEC_LOG.push("admin_login", sess.email, { role: sess.role });
      setScreen("admin");
      return;
    }

    // Client: check onboarding completion before anything else — a new
    // client must complete onboarding before reaching their dashboard.
    hasCompletedOnboarding(sess.id).then(done => {
      if (!done) { setScreen("onboarding"); return; }

      // Resume a checkout started before authenticating (Patch: PublicSite
      // package selection). Package/price are always re-derived server-side
      // from packageId in create-checkout-session — nothing trusted here.
      const pendingPackageId = sessionStorage.getItem(PENDING_PACKAGE_KEY);
      if (pendingPackageId) {
        sessionStorage.removeItem(PENDING_PACKAGE_KEY);
        setScreen("app");
        createCheckoutSession(pendingPackageId).then(result => {
          if (result.ok) window.location.assign(result.url);
          else console.error("Resuming checkout after signup failed:", result.error);
        });
        return;
      }

      setScreen("app");
    });
  };

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    setScreen("public");
  };

  if (screen === "loading") {
    return <div className="auth-shell"><Spinner /></div>;
  }
  if (denied) return <AccessDenied onBack={()=>{setDenied(false);setScreen("public");}} />;
  if (reauth) return <ReauthGuard session={session} reason={reauth.reason} onSuccess={()=>{reauth.onSuccess();setReauth(null);}} onCancel={()=>setReauth(null)} />;

  return (
    <>
      <style>{CSS}</style>
      {screen === "public"        && <PublicSite onLogin={()=>setScreen("login")} onSignup={()=>setScreen("signup")} onConsult={()=>setScreen("consult")} onPackages={()=>setScreen("packages")} />}
      {screen === "packages"      && <PackagePricing onBack={()=>setScreen("public")} onConsult={()=>setScreen("consult")} onNeedsAuth={()=>setScreen("signup")} />}
      {screen === "consult"       && <ConsultationFlow onBack={()=>setScreen("public")} onComplete={()=>setScreen("public")} />}
      {screen === "login"         && <AuthLogin onLoginSuccess={handleLoginSuccess} onForgot={()=>setScreen("forgot")} onSignup={()=>setScreen("signup")} onConsult={()=>setScreen("consult")} onPackages={()=>setScreen("packages")} onBack={()=>setScreen("public")} />}
      {screen === "signup"        && <AuthSignup onBack={()=>setScreen("login")} />}
      {screen === "forgot"        && <AuthForgot onBack={()=>setScreen("login")} />}
      {screen === "reset_password"&& <AuthForgot initialStep={2} onBack={async()=>{ await signOut(); setSession(null); setScreen("login"); }} />}
      {screen === "verify_email"  && (
        <div className="auth-shell"><div className="auth-bg" />
          <div className="auth-card page-fade" style={{textAlign:"center"}}>
            <div className="auth-logo" style={{marginBottom:8}}>Verify Your Email</div>
            <p className="auth-sub">Please verify your email before continuing. Check your inbox for a verification link.</p>
            <button className="btn btn-p btn-full mt-20" onClick={()=>setScreen("login")}>← Back to Sign In</button>
          </div>
        </div>
      )}
      {screen === "mfa_setup"     && <MFASetup session={session} onDone={async()=>{ await markMfaSetupDone(session.id); setScreen("admin"); }} />}
      {screen === "onboarding"    && <Onboarding session={session} onComplete={()=>setScreen("app")} />}
      {screen === "app"           && <AppShell onLogout={handleLogout} session={session} />}
      {screen === "admin"         && <AdminShell onLogout={handleLogout} session={session} />}
    </>
  );
}
