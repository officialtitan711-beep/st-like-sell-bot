'use strict';
const { Telegraf, Markup } = require('telegraf');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); });
process.on('unhandledRejection', (reason) => { console.error('Unhandled Rejection:', reason); });

// ───────────────────────── CONFIG ─────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || '9030947504:AAF8-c78QWRGLz1y1uPmmnXds_lDWevGxk0'; // ⚠️ ২-৩ দিন পর বদলে নিও (Render env BOT_TOKEN দিলে সেটাই আগে ব্যবহার হবে)
if (!BOT_TOKEN) { console.error('❌ BOT_TOKEN env variable missing! Render > Environment এ BOT_TOKEN দাও।'); process.exit(1); }
const ADMIN_ID = String(process.env.ADMIN_ID || '5932254012');
const API_BASE = process.env.LIKESFF_API_BASE || 'https://raigen.site/likesff/reseller.php';
const API_KEY = process.env.LIKESFF_API_KEY || 'likesff-shop-11935-mbqgvd7f'; // ⚠️ ২-৩ দিন পর বদলে নিও (Render env LIKESFF_API_KEY দিলে সেটাই আগে ব্যবহার হবে)
const PORT = process.env.PORT || 3000;
const RENDER_URL = (process.env.RENDER_EXTERNAL_URL || 'https://st-like-sell-bot.onrender.com').replace(/\/+$/, '');
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;
const DEFAULT_CAT = '🔥 Free Fire Likes ❤️‍🔥';

const bot = new Telegraf(BOT_TOKEN);

// ───────────────────────── HELPERS ─────────────────────────
const hasNum = (s, n) => new RegExp('(^|[^0-9])' + n + '([^0-9]|$)').test(s); // '1100' এর ভেতরে '100' ধরবে না
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => String(s === undefined || s === null ? '' : s).replace(/[`\\]/g, '');
const m = (v) => '`' + clean(v) + '`';
const stripMd = (s) => String(s).replace(/[*`_]/g, '');
const LINE = '💠 ════════════════════════════ 💠';
const receipt = (title, lines) => `${LINE}\n           ${title}\n${LINE}\n\n${lines.join('\n')}\n\n${LINE}\nStay with SIR TOPUP 💙`;

function getTodayDateBD() {
    const bd = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    return `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, '0')}-${String(bd.getDate()).padStart(2, '0')}`;
}
function getCurrentHourBD() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })).getHours();
}
function nowStamp() {
    const now = new Date();
    return {
        timestamp: now.getTime(),
        date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
        time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true })
    };
}

// ───────────────────────── DATABASE (Firebase safe) ─────────────────────────
let cachedDb = {};
let dbReady = !FIREBASE_DB_URL; // Firebase load না হওয়া পর্যন্ত কখনো save করবে না (data overwrite protection)
let saving = false, dirty = false, saveTimer = null;

function initDefaults(d) {
    if (!d.numbers) d.numbers = { bkash: '01XXXXXXXXX', nagad: '01XXXXXXXXX' };
    if (!d.categories) {
        d.categories = [DEFAULT_CAT];
    } else if (!Array.isArray(d.categories)) {
        const keys = Object.keys(d.categories);
        d.categories = keys.every((k) => /^\d+$/.test(k)) ? Object.values(d.categories) : keys;
    }
    if (!d.customProducts || Object.keys(d.customProducts).length === 0) {
        d.customProducts = {
            [DEFAULT_CAT]: [
                { name: '100 LIKE (INSTANT)' },
                { name: '220 LIKE (INSTANT)' },
                { name: '1100 LIKE (5 Days Auto)' },
                { name: '3300 LIKE (15 Days Auto)' },
                { name: '6600 LIKE (30 Days Auto)' }
            ]
        };
    }
    if (!d.settings) d.settings = {};
    if (typeof d.settings.autoApiEnabled !== 'boolean') d.settings.autoApiEnabled = true;
}

function loadDatabase() {
    const d = cachedDb;
    ['users', 'balances', 'sessions', 'subscriptions', 'allowedUsers', 'orderHistories', 'userLang',
        'depositRequests', 'adminReplySessions', 'adminInputSession', 'adminSessions', 'calcStates', 'settings', 'numbers', 'customProducts']
        .forEach((k) => { if (!d[k] || typeof d[k] !== 'object') d[k] = {}; });
    if (!Array.isArray(d.categories)) d.categories = [];
    if (typeof d.settings.autoApiEnabled !== 'boolean') d.settings.autoApiEnabled = true;
    return d;
}

const fbUrl = () => FIREBASE_DB_URL.replace(/\/+$/, '') + '/database.json';

function loadFromFirebase() {
    return new Promise((resolve) => {
        const req = https.get(fbUrl(), (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                if (res.statusCode !== 200) { console.error('Firebase load HTTP', res.statusCode, data.slice(0, 200)); return resolve(false); }
                try {
                    const parsed = data && data.trim() !== 'null' ? JSON.parse(data) : {};
                    cachedDb = Object.assign({}, parsed);
                    resolve(true);
                } catch (e) { console.error('Firebase parse error', e.message); resolve(false); }
            });
        });
        req.on('error', (e) => { console.error('Firebase load error', e.message); resolve(false); });
        req.setTimeout(15000, () => { req.destroy(); resolve(false); });
    });
}

async function initDb() {
    if (!FIREBASE_DB_URL) { initDefaults(cachedDb); loadDatabase(); console.log('⚠️ FIREBASE_DB_URL নেই — data restart এ হারাবে!'); return; }
    for (let i = 1; i <= 20; i++) {
        if (await loadFromFirebase()) {
            initDefaults(cachedDb); loadDatabase(); dbReady = true;
            console.log('✅ Database loaded from Firebase');
            return;
        }
        console.error(`Firebase load failed (try ${i}/20)`);
        await sleep(3000);
    }
    console.error('❌ FATAL: Firebase থেকে data load হয়নি। Data বাঁচাতে save বন্ধ রাখা হলো।');
    initDefaults(cachedDb); loadDatabase();
}

function saveDatabase(data) {
    if (data) cachedDb = data;
    if (!FIREBASE_DB_URL) return;
    dirty = true;
    if (saveTimer) return;
    saveTimer = setTimeout(() => { saveTimer = null; flush(); }, 400);
}

function flush() {
    if (!dbReady || saving || !dirty) return;
    dirty = false; saving = true;
    let body;
    try { body = JSON.stringify(cachedDb); } catch (e) { saving = false; console.error('stringify error', e.message); return; }
    const u = new URL(fbUrl());
    const req = https.request({
        hostname: u.hostname, path: u.pathname + u.search, method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
        let out = '';
        res.on('data', (c) => { out += c; });
        res.on('end', () => {
            saving = false;
            if (res.statusCode < 200 || res.statusCode >= 300) {
                console.error('Firebase save FAILED', res.statusCode, out.slice(0, 200));
                dirty = true; setTimeout(flush, 5000); return;
            }
            if (dirty) flush();
        });
    });
    req.on('error', (e) => { saving = false; dirty = true; console.error('Firebase save error', e.message); setTimeout(flush, 5000); });
    req.setTimeout(20000, () => req.destroy());
    req.write(body); req.end();
}

process.on('SIGTERM', () => { dirty = true; flush(); setTimeout(() => process.exit(0), 3000); });

// ───────────────────────── LIKESFF API ─────────────────────────
function callLikesFF(params, timeoutMs = 120000) {
    return new Promise((resolve) => {
        let done = false;
        const finish = (r) => { if (done) return; done = true; resolve(r); };
        const qs = new URLSearchParams({ key: API_KEY, ...params });
        const req = https.get(`${API_BASE}?${qs.toString()}`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                console.log(`[LikesFF] ${params.action} uid=${params.uid || '-'} http=${res.statusCode} body=${data.slice(0, 400)}`);
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (e) { /* ignore */ }
                if (!parsed || typeof parsed !== 'object') {
                    return finish({ ok: false, code: 'BAD_RESPONSE', error: `HTTP ${res.statusCode} non-JSON`, http: res.statusCode });
                }
                const ok = parsed.success === true || (parsed.success === undefined && res.statusCode < 400 && !parsed.error);
                finish({ ...parsed, ok, http: res.statusCode, code: parsed.code || null, error: parsed.error || parsed.message || null });
            });
        });
        req.on('error', (e) => finish({ ok: false, code: 'NETWORK', error: e.message }));
        req.setTimeout(timeoutMs, () => { finish({ ok: false, code: 'TIMEOUT', error: 'Timeout' }); req.destroy(); });
    });
}

async function callWithRetry(params) {
    let res;
    for (let i = 0; i < 4; i++) {
        res = await callLikesFF(params);
        if (res.code === 'RATE_LIMITED') { await sleep(3000 + i * 2000); continue; }
        break;
    }
    return res;
}

// এই error হলে অর্ডার ম্যানুয়ালে না ফেলে কাস্টমারকে রিফান্ড + কারণ দেখানো হবে
const REFUND_CODES = new Set(['UID_LIMIT', 'UID_ACTIVE', 'UID_NOT_FOUND', 'INVALID_UID', 'INVALID_SERVER', 'FF_API_ERROR', 'ORDER_FAILED']);
// রিসেলার সাইডের সমস্যা — অ্যাডমিনকে জরুরি alert
const CRITICAL_CODES = new Set(['INVALID_KEY', 'KEY_INACTIVE', 'MISSING_KEY', 'INSUFFICIENT_BALANCE', 'PRODUCT_DISABLED', 'INSTANT_DISABLED', 'PRODUCT_NOT_FOUND', 'MISSING_PRODUCT', 'INVALID_ACTION', 'DB_ERROR']);

const REASONS = {
    UID_LIMIT: ['এই UID-তে এই সময়ের লাইক আগেই দেওয়া হয়েছে (প্রতিদিন রাত ১০টা BD সময়ে রিসেট হয়)। রাত ১০টার পর আবার চেষ্টা করুন।', 'This UID already received likes in this window (resets 10 PM BD). Please try again after 10 PM.'],
    UID_ACTIVE: ['এই UID-তে আগে থেকেই একটি অটো প্যাকেজ চালু আছে।', 'This UID already has a running auto package.'],
    UID_NOT_FOUND: ['এই UID টি পাওয়া যায়নি। সঠিক UID দিন।', 'This UID does not exist. Please check your UID.'],
    INVALID_UID: ['UID সঠিক নয় (৮–১৪ ডিজিট হতে হবে)।', 'Invalid UID (must be 8–14 digits).'],
    INVALID_SERVER: ['এই সার্ভার সাপোর্টেড নয়।', 'This server is not supported.'],
    FF_API_ERROR: ['লাইক সার্ভারে লাইক যায়নি (এই UID আজ আগেই লাইক পেয়ে থাকতে পারে বা সার্ভারে সমস্যা)। পরে আবার চেষ্টা করুন।', 'Like server could not deliver (UID may have reached today\'s limit or server issue). Try again later.'],
    ORDER_FAILED: ['অর্ডার তৈরি হয়নি। পরে আবার চেষ্টা করুন।', 'Order could not be created. Please try again later.']
};
function friendlyReason(code, userId) {
    const r = REASONS[code];
    if (!r) return code || 'Rejected';
    return getUserLang(userId) === 'bn' ? r[0] : r[1];
}

function pickDelivered(r) {
    for (const k of ['delivered', 'likes_delivered', 'delivered_likes', 'likes_added', 'added_likes', 'added']) {
        const v = Number(r && r[k]);
        if (Number.isFinite(v) && v > 0) return v;
    }
    return 0;
}

function checkFreeFireUID(uid) {
    return new Promise((resolve) => {
        const fallback = { nickname: 'Unknown Player', level: '', likes: 0 };
        const req = https.get('https://auraffxserverinfocheckerapi.onrender.com/api/player?uid=' + encodeURIComponent(uid), { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                try {
                    const p = JSON.parse(data);
                    const nickname = p.nickname || p.name || p.username || p.AccountName;
                    const level = p.level || p.AccountLevel || p.lvl || '';
                    const likes = p.likes || p.AccountLikes || p.Like || p.like || 0;
                    resolve({
                        nickname: (nickname && String(nickname).trim() !== '') ? String(nickname) : 'Unknown Player',
                        level: level ? String(level) : '',
                        likes: Number(likes) || 0
                    });
                } catch (e) { resolve(fallback); }
            });
        });
        req.on('error', () => resolve(fallback));
        req.setTimeout(12000, () => { req.destroy(); resolve(fallback); });
    });
}

function extractDefaultAddedLikes(productName) {
    const lower = productName.toLowerCase();
    if (hasNum(lower, '100')) return '100 Likes';
    if (lower.includes('220') || lower.includes('1100') || lower.includes('3300') || lower.includes('6600')) return '220 Likes';
    const mt = productName.match(/(\d+)\s*like/i);
    if (mt && mt[1]) return mt[1] + ' Likes';
    return '220 Likes';
}

function extractPackageDays(productName) {
    const lower = productName.toLowerCase();
    if (hasNum(lower, '100') || hasNum(lower, '220')) return 1;
    if (lower.includes('5 days') || lower.includes('৫ দিন') || lower.includes('15 days') || lower.includes('১৫ দিন') || lower.includes('30 days') || lower.includes('৩০ দিন')) {
        const mt = productName.match(/(\d+)\s*(days?|দিন)/i);
        if (mt && mt[1]) { const days = parseInt(mt[1], 10); return days > 1 ? days : 1; }
    }
    return 1;
}

// ───────────────────────── TELEGRAM SAFE SEND ─────────────────────────
async function safeEdit(chatId, msgId, text, extra = {}) {
    try {
        await bot.telegram.editMessageText(chatId, msgId, null, text, { parse_mode: 'Markdown', ...extra });
        return true;
    } catch (e) {
        if (/not modified/i.test(e.message || '')) return true;
        try { await bot.telegram.editMessageText(chatId, msgId, null, stripMd(text), { ...extra }); return true; }
        catch (e2) {
            if (/not modified/i.test(e2.message || '')) return true;
            try { await bot.telegram.sendMessage(chatId, stripMd(text), { ...extra }); return true; }
            catch (e3) { console.error('safeEdit failed:', e3.message); return false; }
        }
    }
}
async function sendMd(chatId, text, extra = {}) {
    try { return await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown', ...extra }); }
    catch (e) {
        try { return await bot.telegram.sendMessage(chatId, stripMd(text), { ...extra }); }
        catch (e2) { console.error('sendMd failed', chatId, e2.message); return null; }
    }
}
const notifyAdmin = (text, extra = {}) => sendMd(ADMIN_ID, text, extra);

function pushHistory(db, userId, entry) {
    if (!db.orderHistories[userId]) db.orderHistories[userId] = [];
    db.orderHistories[userId].unshift({ ...nowStamp(), ...entry });
    if (db.orderHistories[userId].length > 10) db.orderHistories[userId].length = 10;
}

// ───────────────────────── LANGUAGE ─────────────────────────
function getUserLang(userId) {
    const db = loadDatabase();
    return db.userLang[userId] || 'en';
}

function t(userId, key) {
    const lang = getUserLang(userId);
    const dict = {
        bn: {
            welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ স্বাগতম! আমাদের প্রিমিয়াম গেমিং সার্ভিসে আপনাকে স্বাগতম। নিচে থেকে আপনার পছন্দের সার্ভিসটি বেছে নিনঃ 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            shopMenuTitle: "🛍️ **সকল উপলব্ধ সার্ভিস**\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:",
            checkUidPrompt: "🎮 **ফ্রি ফায়ার ইউআইডি চেকার**\n\n✍️ ইউআইডি লিখে পাঠান:",
            depositPortal: "»»------------- ★ 💰 ডিপোজিট পোর্টাল ★ -------------««\n\n💎 টাকা পাঠানোর জন্য যেকোনো মাধ্যম সিলেক্ট করুন:\n\n»»-------------------------------------------------««",
            supportText: "📞 **সাপোর্ট ডেস্ক**\n\n💡 আপনার যেকোনো সমস্যা, TrxID বা স্ক্রিনশট সরাসরি এই চ্যাটেই পাঠিয়ে দিন। অ্যাডমিন খুব দ্রুত রিপ্লাই দেবেন।",
            mainMenuBack: "🔙 মূল মেনু 🏠",
            backBtn: "🔙 পেছনের মেনু ↩️",
            buyLikes: "🔥 ফ্রি ফায়ার লাইক কিনুন ❤️‍🔥⚡",
            serverTitle: "🌍 **সার্ভার নির্বাচন**\n\nপ্যাকেজ: ",
            confirmOrderBtn: "✅ অর্ডার কনফার্ম করুন 🚀",
            cancelBtn: "❌ বাতিল করুন",
            supportSentSuccess: "✨ আপনার মেসেজ বা স্ক্রিনশট সরাসরি অ্যাডমিনের কাছে পৌঁছে গেছে! দয়া করে অপেক্ষা করুন।",
            historyTitle: "📜 **শেষ ১০টি অর্ডারের ইতিহাস**\n\n",
            historyDisclaimer: "\n⚠️ *নোট: সুরক্ষার জন্য এখানে শুধুমাত্র আপনার সর্বশেষ ১০টি অর্ডার দেখানো হয়।*",
            noHistory: "❌ এখনো কোনো অর্ডার সম্পন্ন হয়নি!\n\n"
        },
        en: {
            welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ Welcome to our premium gaming service. Choose your preferred service below: 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            shopMenuTitle: "🛍️ **ALL AVAILABLE SHOP**\n\n👇 Please select the buttons below:",
            checkUidPrompt: "🎮 **FREE FIRE UID CHECKER**\n\n✍️ Send UID:",
            depositPortal: "»»------------- ★ 💰 DEPOSIT PORTAL ★ -------------««\n\n💎 Choose any payment method below:\n\n»»-------------------------------------------------««",
            supportText: "📞 **SUPPORT DESK**\n\n💡 Send any issue, TrxID or screenshot directly in this chat. Admin will reply soon.",
            mainMenuBack: "🔙 Main Menu 🏠",
            backBtn: "🔙 Back ↩️",
            buyLikes: "🔥 Buy Fire Fire Likes ❤️‍🔥⚡",
            serverTitle: "🌍 **SERVER SELECTION**\n\nPackage: ",
            confirmOrderBtn: "✅ Confirm Order 🚀",
            cancelBtn: "❌ Cancel",
            supportSentSuccess: "✨ Your message or screenshot has been sent directly to the admin! Please wait.",
            historyTitle: "📜 **LAST 10 ORDERS HISTORY**\n\n",
            historyDisclaimer: "\n⚠️ *Note: Only the latest 10 orders are displayed here.*",
            noHistory: "❌ No orders completed yet!\n\n"
        }
    };
    return dict[lang][key] || dict['en'][key];
}

const backKb = (userId) => Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]);

function warningFor(userId) {
    return getUserLang(userId) === 'bn'
        ? '⚠️ **সতর্কতা: ২৪ ঘণ্টার মধ্যে একই ইউআইডিতে পুনরায় লাইক নিলে লাইক না-ও যোগ হতে পারে!**'
        : '⚠️ **Warning: Taking likes again on this UID within 24 hours may result in likes not being added!**';
}

function getMainKeyboard(userId) {
    const lang = getUserLang(userId);
    const keyboard = lang === 'en' ? [
        ['🛍️ Shop Now', '🔍 Check FF UID'],
        ['💰 Add Balance', '👤 My Profile'],
        ['📜 Order History', '📞 Support Desk'],
        ['🧮 Calculator', '🌍 World Clock']
    ] : [
        ['🛍️ শপ নাও', '🔍 ইউআইডি চেক'],
        ['💰 ব্যালেন্স অ্যাড', '👤 আমার প্রোফাইল'],
        ['📜 অর্ডার হিস্ট্রি', '📞 সাপোর্ট ডেস্ক'],
        ['🧮 ক্যালকুলেটর', '🌍 ওয়ার্ল্ড ক্লক']
    ];
    if (String(userId) === ADMIN_ID) {
        const db = loadDatabase();
        const apiStatusText = db.settings.autoApiEnabled ? '🟢 Auto API: ON' : '🔴 Auto API: OFF';
        keyboard.push(
            ['-----------------------------------'],
            [apiStatusText, '📊 Total Users'],
            ['➕ Add Bot', '❌ Remove Bot'],
            ['💳 Add/Minus Balance', '📱 Set Payment Numbers'],
            ['📩 Send Message', '📢 All Users Msg']
        );
    }
    return Markup.keyboard(keyboard).resize();
}

function isMenuCommand(text) {
    if (!text) return false;
    if (text.startsWith('/')) return true;
    const lowerText = text.trim().toLowerCase();
    if (lowerText.includes('shop now') || lowerText.includes('শপ নাও') || lowerText.includes('shop') || lowerText.includes('শপ')) return true;
    if (lowerText.includes('check ff uid') || lowerText.includes('ইউআইডি চেক') || lowerText.includes('ইউআইডি')) return true;
    if (lowerText.includes('add balance') || lowerText.includes('ব্যালেন্স অ্যাড') || lowerText.includes('ব্যালেন্স')) return true;
    if (lowerText.includes('my profile') || lowerText.includes('আমার প্রোফাইল') || lowerText.includes('প্রোফাইল')) return true;
    if (lowerText.includes('order history') || lowerText.includes('অর্ডার হিস্ট্রি') || lowerText.includes('হিস্ট্রি')) return true;
    if (lowerText.includes('support desk') || lowerText.includes('সাপোর্ট ডেস্ক') || lowerText.includes('সাপোর্ট')) return true;
    if (lowerText.includes('calculator') || lowerText.includes('ক্যালকুলেটর')) return true;
    if (lowerText.includes('world clock') || lowerText.includes('ওয়ার্ল্ড ক্লক') || lowerText.includes('ওয়ার্ল্ড')) return true;
    const keywords = ['total users', 'add bot', 'remove bot', 'add/minus balance', 'set payment numbers', 'send message', 'all users msg', '-----------------------------------', 'auto api: on', 'auto api: off'];
    return keywords.some((k) => lowerText.includes(k));
}

const translateCategoryName = (c) => c;
const translateProductName = (p) => p;

function shopButtons(userId) {
    const db = loadDatabase();
    const rows = db.categories.map((c, i) => [Markup.button.callback(translateCategoryName(c), 'custom_cat_' + i)]);
    if (String(userId) === ADMIN_ID) rows.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
    rows.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
    return Markup.inlineKeyboard(rows);
}

function categoryButtons(userId, catIdx) {
    const db = loadDatabase();
    const catName = db.categories[catIdx];
    const rows = [];
    (db.customProducts[catName] || []).forEach((p, idx) => {
        const row = [Markup.button.callback(translateProductName(p.name), `sub_prod_idx_${catIdx}_${idx}`)];
        if (String(userId) === ADMIN_ID) {
            row.push(Markup.button.callback('❌ Rem', `admin_rem_prod_idx_${catIdx}_${idx}`));
            row.push(Markup.button.callback('✏️ Price', `admin_chg_price_idx_${catIdx}_${idx}`));
        }
        rows.push(row);
    });
    if (String(userId) === ADMIN_ID) {
        rows.push([Markup.button.callback('➕ Add Product', 'admin_add_prod_idx_' + catIdx)]);
        rows.push([Markup.button.callback('❌ Remove Category', 'admin_rem_cat_idx_' + catIdx)]);
    }
    rows.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
    return Markup.inlineKeyboard(rows);
}

function clockKeyboard(userId) {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🇧🇩 Bangladesh', 'clock_bd'), Markup.button.callback('🇳🇵 Nepal', 'clock_np')],
        [Markup.button.callback('🇮🇳 India', 'clock_in'), Markup.button.callback('🇵🇰 Pakistan', 'clock_pk')],
        [Markup.button.callback('🇸🇦 Saudi Arabia', 'clock_sa'), Markup.button.callback('🇦🇪 Dubai (UAE)', 'clock_ae')],
        [Markup.button.callback('🇲🇾 Malaysia', 'clock_my'), Markup.button.callback('🇸🇬 Singapore', 'clock_sg')],
        [Markup.button.callback('🇺🇸 USA (NY)', 'clock_us'), Markup.button.callback('🇬🇧 UK (London)', 'clock_gb')],
        [Markup.button.callback('🇨🇦 Canada', 'clock_ca'), Markup.button.callback('🇦🇺 Australia', 'clock_au')],
        [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
    ]);
}

function getCalcKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('C', 'calc_C'), Markup.button.callback('⌫', 'calc_DEL'), Markup.button.callback('/', 'calc_/'), Markup.button.callback('*', 'calc_*')],
        [Markup.button.callback('7', 'calc_7'), Markup.button.callback('8', 'calc_8'), Markup.button.callback('9', 'calc_9'), Markup.button.callback('-', 'calc_-')],
        [Markup.button.callback('4', 'calc_4'), Markup.button.callback('5', 'calc_5'), Markup.button.callback('6', 'calc_6'), Markup.button.callback('+', 'calc_+')],
        [Markup.button.callback('1', 'calc_1'), Markup.button.callback('2', 'calc_2'), Markup.button.callback('3', 'calc_3'), Markup.button.callback('=', 'calc_EQ')],
        [Markup.button.callback('0', 'calc_0'), Markup.button.callback('.', 'calc_.'), Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
    ]);
}

function profileView(userId, firstName) {
    const db = loadDatabase();
    const lang = getUserLang(userId);
    const langBtn = lang === 'en' ? '🌍 Change Language (EN)' : '🌍 Change Language (বাংলা)';
    const userSubs = Object.values(db.subscriptions).filter((s) => s && s.userId === userId && s.remainingDays > 0);
    let activeSubsText = '';
    if (userSubs.length > 0) {
        activeSubsText = `\n🔄 **Active Packages:** \`${userSubs.length} Running\``;
        userSubs.forEach((s, idx) => { activeSubsText += `\n   ${idx + 1}. UID \`${s.uid}\` — \`${s.remainingDays} Days Left\``; });
    }
    const text = `╔══════════════════════════════╗\n        👤 USER PROFILE\n╚══════════════════════════════╝\n\n🆔 **User ID:** \`${userId}\`\n👤 **Name:** \`${clean(firstName)}\`\n💰 **Balance:** \`৳${db.balances[userId] || 0}\`${activeSubsText}`;
    const kb = Markup.inlineKeyboard([
        [Markup.button.callback(langBtn, 'open_lang_menu')],
        [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
    ]);
    return { text, kb };
}

async function checkingAnimation(ctx, userId) {
    const msg = await ctx.reply('⏳ Checking UID...\n`▰▰▰▱▱▱▱▱▱▱ 30%`', { parse_mode: 'Markdown' });
    await sleep(200);
    await safeEdit(userId, msg.message_id, '⏳ Checking UID...\n`▰▰▰▰▰▰▱▱▱▱ 70%`');
    await sleep(200);
    await safeEdit(userId, msg.message_id, '⏳ Checking UID...\n`▰▰▰▰▰▰▰▰▰▰ 100%`');
    await sleep(200);
    return msg;
}

// ───────────────────────── SUBSCRIPTIONS ─────────────────────────
async function advanceSubscription(subId) {
    const db = loadDatabase();
    const sub = db.subscriptions[subId];
    if (!sub) return false;
    const today = getTodayDateBD();
    if (sub.lastDeliveredDate === today) return false;

    const isLastDay = sub.remainingDays <= 1;
    sub.remainingDays -= 1;
    sub.deliveredDays += 1;
    sub.lastDeliveredDate = today;
    const userId = sub.userId;

    pushHistory(db, userId, {
        product: `${sub.product} (Day ${sub.deliveredDays}/${sub.totalDays})`,
        uid: sub.uid, nickname: sub.nickname || 'Unknown', region: sub.region, price: 0, status: 'Complete'
    });
    if (isLastDay || sub.remainingDays <= 0) delete db.subscriptions[subId];
    saveDatabase(db);

    const statusLine = !isLastDay
        ? `⏳ Remaining Days: ${m(sub.remainingDays + ' Days Left')}`
        : `🏁 Package Status: ${m('Completed (All ' + sub.totalDays + ' Days Delivered)')}`;
    const daily = receipt('✅ DAILY AUTO-LIKE COMPLETED', [
        `📦 Package: ${m(sub.product)}`,
        `📅 Progress: ${m('Day ' + sub.deliveredDays + ' of ' + sub.totalDays)}`,
        `🆔 Sub ID: ${m(subId)}`,
        '',
        `👤 Name: ${m(sub.nickname || 'Unknown')}`,
        `🛡️ UID: ${m(sub.uid)}`,
        `🌍 Server: ${m(sub.region)}`,
        '',
        `📈 **Added Likes:** ${m('+' + extractDefaultAddedLikes(sub.product))}`,
        '',
        statusLine,
        `💰 Daily Charge: ${m('0 BDT (Pre-Paid)')}`,
        `💳 Current Balance: ${m((db.balances[userId] || 0) + ' BDT')}`,
        '',
        warningFor(userId)
    ]);
    await sendMd(userId, daily, backKb(userId));
    await notifyAdmin(`📋 **[Daily Delivery Log - Day ${sub.deliveredDays}/${sub.totalDays}]**\n\n` + daily + `\n\n👤 **Customer ID:** ${m(userId)}`);
    return true;
}

let subRunning = false;
async function processDailySubscriptions() {
    if (subRunning || !dbReady) return;
    subRunning = true;
    try {
        const db = loadDatabase();
        if (getCurrentHourBD() < 6) return; // 4–6 AM এর ডেলিভারি শেষ হওয়ার পর
        const today = getTodayDateBD();
        let modified = false;

        for (const subId of Object.keys(db.subscriptions)) {
            const sub = db.subscriptions[subId];
            if (!sub) { delete db.subscriptions[subId]; modified = true; continue; }
            if (sub.remainingDays <= 0) { delete db.subscriptions[subId]; modified = true; continue; }
            if (sub.lastDeliveredDate === today || sub.startDate === today) continue;

            if (sub.manual) {
                // ম্যানুয়াল সাবস্ক্রিপশন: অ্যাডমিনকে প্রতিদিন রিমাইন্ডার
                if (sub.remindedDate !== today) {
                    sub.remindedDate = today; modified = true;
                    await notifyAdmin(`🔔 **Manual Package Reminder**\n\n📦 ${m(sub.product)}\n🛡️ UID: ${m(sub.uid)} (${m(sub.region)})\n📅 Day ${sub.deliveredDays + 1} of ${sub.totalDays}\n👤 Customer: ${m(sub.userId)}\n\nআজকের লাইক দিয়ে নিচের বাটন চাপো 👇`,
                        Markup.inlineKeyboard([[Markup.button.callback('✅ Mark Delivered', 'sub_done_' + subId)]]));
                }
                continue;
            }

            // অটো অর্ডার: LikesFF নিজেই প্রতিদিন ডেলিভারি দেয়। বট আর API কল করে নতুন অর্ডার দেবে না!
            if (sub.orderId) {
                const st = await callLikesFF({ action: 'status', order_id: sub.orderId }, 30000);
                if (st.ok && /fail|cancel|refund/i.test(String(st.status || ''))) {
                    if (!sub.alerted) {
                        sub.alerted = true; modified = true;
                        await notifyAdmin(`🚨 **Auto order problem**\n\nOrder: ${m(sub.orderId)}\nStatus: ${m(st.status)}\nUID: ${m(sub.uid)}\nCustomer: ${m(sub.userId)}\n\nLikesFF ড্যাশবোর্ড চেক করো।`);
                    }
                    continue;
                }
            }
            await advanceSubscription(subId);
        }
        if (modified) saveDatabase(db);
    } catch (e) { console.error('processDailySubscriptions error', e); }
    finally { subRunning = false; }
}

// ───────────────────────── ORDER PROCESSING ─────────────────────────
async function processOrder(userId, msgId, session) {
    const price = Number(session.price) || 0;
    const nick = session.nickname || 'Unknown';
    const totalDays = session.totalDays || 1;
    const isFF = !!session.isFFLikes;
    const kb = backKb(userId);

    await safeEdit(userId, msgId, '⏳ Processing Order...\n`▰▰▰▰▰▰▱▱▱▱ 60%`');

    let db = loadDatabase();
    let api = null;
    let manualReason = '';
    if (!isFF) manualReason = 'Non-Free-Fire category (manual service)';
    else if (session.is100Like) manualReason = '100 Likes package (manual by design)';
    else if (!db.settings.autoApiEnabled) manualReason = 'Auto API is OFF';
    else {
        const params = (session.actionType === 'auto' && session.productCode)
            ? { action: 'auto', product: session.productCode, uid: session.uid, server: session.region }
            : { action: 'like', uid: session.uid, server: session.region };
        api = await callWithRetry(params);
    }

    db = loadDatabase();
    const status = String((api && api.status) || '').toLowerCase();
    const failedStatus = /fail|cancel/.test(status);

    // ───── ✅ SUCCESS ─────
    if (api && api.ok && !failedStatus) {
        const isAutoPkg = session.actionType === 'auto';
        const orderRef = api.order_id || api.orderId || `AUTO-${Math.floor(10000 + Math.random() * 90000)}`;
        const delivered = pickDelivered(api);
        const addedText = delivered ? `${delivered} Likes` : extractDefaultAddedLikes(session.product);
        let subLines = [];

        if (totalDays > 1) {
            const subId = `SUB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
            db.subscriptions[subId] = {
                userId, uid: session.uid, nickname: nick, region: session.region, product: session.product,
                actionType: session.actionType, productCode: session.productCode, orderId: String(orderRef),
                totalDays, deliveredDays: 0, remainingDays: totalDays,
                startDate: getTodayDateBD(), lastDeliveredDate: '', manual: false
            };
            subLines = [`📅 **Package:** ${m(totalDays + ' Days (Auto, daily 4–6 AM BD)')}`, `🆔 **Sub Tracking ID:** ${m(subId)}`];
        }

        pushHistory(db, userId, { product: session.product, uid: session.uid, nickname: nick, region: session.region, price, status: 'Complete' });
        saveDatabase(db);

        const lines = [
            `📦 Package: ${m(session.product)}`,
            `🆔 Order ID: ${m(orderRef)}`,
            ...subLines,
            '',
            `👤 Name: ${m(nick)}`,
            `🛡️ UID: ${m(session.uid)}`,
            `🌍 Server: ${m(session.region)}`,
            '',
            isAutoPkg ? `📈 **Daily Likes:** ${m('+220 Likes / day')}` : `📈 **Added Likes:** ${m('+' + addedText)}`,
            '',
            `📊 Status: ${m(isAutoPkg ? 'Auto Order Placed ✔' : 'Completed')}`,
            '',
            `💰 Price: ${m(price + ' BDT')}`,
            `💳 Remaining Balance: ${m((db.balances[userId] || 0) + ' BDT')}`,
            '',
            warningFor(userId)
        ];
        const text = receipt(isAutoPkg ? '✅ AUTO ORDER PLACED' : '✅ ORDER SUCCESSFULLY COMPLETED', lines);
        await safeEdit(userId, msgId, text, kb);
        await notifyAdmin('📋 **[Duplicate Copy - Auto Order]**\n\n' + text + `\n\n👤 **Customer ID:** ${m(userId)}`);
        return;
    }

    // ───── 🔁 REFUND (API definite failure) ─────
    if (api && (REFUND_CODES.has(api.code) || failedStatus)) {
        db.balances[userId] = (db.balances[userId] || 0) + price;
        pushHistory(db, userId, { product: session.product, uid: session.uid, nickname: nick, region: session.region, price, status: 'Cancelled' });
        saveDatabase(db);

        const reason = friendlyReason(api.code, userId);
        const text = `❌ **Order Failed & Refunded**\n\n📦 Package: ${m(session.product)}\n👤 Name: ${m(nick)}\n🛡️ UID: ${m(session.uid)}\n💵 Price Refunded: ${m(price + ' BDT')}\n💳 Current Balance: ${m((db.balances[userId] || 0) + ' BDT')}\n\n⚠️ **Reason:** ${reason}\n\nটাকা স্বয়ংক্রিয়ভাবে আপনার ব্যালেন্সে ফেরত দেওয়া হয়েছে।`;
        await safeEdit(userId, msgId, text, kb);
        await notifyAdmin(`↩️ **API Refund**\n\nCustomer: ${m(userId)}\nUID: ${m(session.uid)}\nPackage: ${m(session.product)}\nCode: ${m(api.code || api.status)}\nMsg: ${m(api.error || '')}`);
        return;
    }

    // ───── 🛠️ MANUAL FALLBACK ─────
    if (api) manualReason = `${api.code || 'ERROR'}: ${api.error || 'no message'}`;
    const uncertain = api && (api.code === 'TIMEOUT' || api.code === 'NETWORK' || api.code === 'BAD_RESPONSE');
    const uniqueOrderId = userId + '_' + Date.now();

    const pending = receipt('⏳ ORDER PENDING REVIEW', [
        `📦 Package: ${m(session.product)}`,
        `🆔 Order ID: ${m('SRV-' + Math.floor(10000 + Math.random() * 90000))}`,
        '',
        `👤 Name: ${m(nick)}`,
        `🛡️ UID: ${m(session.uid)}`,
        `🌍 Server: ${m(session.region)}`,
        '',
        `📊 Status: ${m('Pending Admin Approval')}`,
        `💰 Price: ${m(price + ' BDT')}`,
        `💳 Remaining Balance: ${m((db.balances[userId] || 0) + ' BDT')}`,
        '',
        '✨ আপনার অর্ডারটি সফলভাবে সাবমিট হয়েছে এবং টাকা কেটে নেওয়া হয়েছে। অ্যাডমিন চেক করে শীঘ্রই এটি কমপ্লিট করে দেবেন!'
    ]);
    await safeEdit(userId, msgId, pending, kb);

    db.adminSessions[uniqueOrderId] = {
        targetUserId: userId, loadingMessageId: msgId, product: session.product, uid: session.uid,
        nickname: nick, region: session.region, price, totalDays,
        actionType: session.actionType, productCode: session.productCode, isFFLikeCategory: isFF
    };
    saveDatabase(db);

    const critical = api && CRITICAL_CODES.has(api.code);
    let adminText = `🛠️ **New Manual/Fallback Order (Pending Review)**\n\n📦 Package: ${m(session.product)}\n👤 Name: ${m(nick)}\n🛡️ UID: ${m(session.uid)}\n🌍 Server: ${m(session.region)}\n💵 Price: ${m(price + ' BDT')}\n👤 Customer ID: ${m(userId)}\n\n❓ **Why manual:** ${m(manualReason)}`;
    if (critical) adminText = `🚨 **LikesFF API PROBLEM — এখনই চেক করো!**\n\n` + adminText;
    if (uncertain) adminText += `\n\n⚠️ API-র উত্তর পাওয়া যায়নি। লাইক হয়তো ডেলিভারি হয়ে গেছে — LikesFF Recent Orders চেক করে তারপর Complete করো, না হলে ডাবল হবে।`;
    await notifyAdmin(adminText, Markup.inlineKeyboard([
        [Markup.button.callback('✅ Complete Order', 'admin_input_' + uniqueOrderId)],
        [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
    ]));
}

// ───────────────────────── BOT: START / COMMANDS ─────────────────────────
bot.start(async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const db = loadDatabase();
        delete db.sessions[userId];
        db.users[userId] = { id: userId, first_name: ctx.from.first_name || 'N/A', username: ctx.from.username ? '@' + ctx.from.username : 'N/A' };
        saveDatabase(db);
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) { console.error(e); }
});

bot.command('api', async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const db = loadDatabase();
        const res = await callLikesFF({ action: 'balance' }, 20000);
        await ctx.reply(`🔌 Auto API: ${db.settings.autoApiEnabled ? 'ON 🟢' : 'OFF 🔴'}\n💰 LikesFF: ${res.ok ? JSON.stringify(res).slice(0, 400) : (res.code || '') + ' ' + (res.error || '')}`);
    } catch (e) { console.error(e); }
});

// callback query এর spinner বন্ধ করা (যেসব হ্যান্ডলার নিজে alert/toast দেয় সেগুলো বাদে)
bot.action(/.*/, async (ctx, next) => {
    const data = (ctx.callbackQuery && ctx.callbackQuery.data) || '';
    if (!/^(confirm_order|dep_app_|dep_can_|admin_can_|admin_rem_cat_idx_|admin_rem_prod_idx_|set_lang_|verify_sub|sub_done_)/.test(data)) {
        try { await ctx.answerCbQuery(); } catch (e) { /* ignore */ }
    }
    return next();
});

bot.action('verify_sub', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        await ctx.answerCbQuery('🎉 ভেরিফিকেশন সফল!').catch(() => {});
        try { await ctx.deleteMessage(); } catch (e) { /* ignore */ }
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) { console.error(e); }
});

// ───────────────────────── BOT: MESSAGE HANDLER ─────────────────────────
bot.on('message', async (ctx) => {
    try {
        if (!ctx.message || !ctx.from) return;
        const userId = String(ctx.from.id);
        const isAdmin = userId === ADMIN_ID;
        const text = ctx.message.text ? ctx.message.text.trim() : (ctx.message.caption ? ctx.message.caption.trim() : '');
        const lowerText = text.toLowerCase();
        const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2B50}\u{2728}\u{1F4F1}\u{1F4B0}\u{1F464}\u{1F4DC}\u{1F4DE}\u{1F9EE}\u{1F30D}\u{1F4CA}\u{2795}\u{274C}\u{1F4B3}\u{1F4E9}\u{1F4E2}\u{1F4F7}\u{1F50D}\u{1F3AE}\u{1F4C1}\u{1F4CC}\u{2328}\u{1F310}\s]/gu, '').trim().toLowerCase();

        const db = loadDatabase();

        const info = { id: userId, first_name: ctx.from.first_name || 'N/A', username: ctx.from.username ? '@' + ctx.from.username : 'N/A' };
        const prevU = db.users[userId];
        if (!prevU || prevU.first_name !== info.first_name || prevU.username !== info.username) { db.users[userId] = info; saveDatabase(db); }

        if (isMenuCommand(text)) {
            if (db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
            if (isAdmin && db.adminInputSession[userId]) { delete db.adminInputSession[userId]; saveDatabase(db); }
        }

        // ── admin reply to customer
        if (isAdmin && db.adminReplySessions[userId] && !isMenuCommand(text)) {
            const targetUser = db.adminReplySessions[userId];
            const sent = await sendMd(targetUser, '💬 **Admin Reply:**\n\n' + text);
            await ctx.reply(sent ? '✅ Reply sent successfully!' : '❌ Failed to send.');
            delete db.adminReplySessions[userId];
            saveDatabase(db);
            return;
        }

        // ── admin input sessions
        if (isAdmin && db.adminInputSession[userId] && !isMenuCommand(text)) {
            const sessionData = db.adminInputSession[userId];

            if (sessionData.type === 'add_bot_user') {
                const targetUid = text.replace(/[^0-9]/g, '');
                delete db.adminInputSession[userId];
                if (targetUid) {
                    db.allowedUsers[targetUid] = true;
                    saveDatabase(db);
                    await sendMd(targetUid, '🎉 অভিনন্দন! অ্যাডমিন আপনার বট এক্সেস অনুমোদন করেছেন। এখন থেকে আপনি বট ব্যবহার করতে পারবেন। /start লিখে শুরু করুন।');
                    return ctx.reply(`✅ সফলভাবে ইউজার আইডি \`${targetUid}\`-কে বট ব্যবহারের এক্সেস দেওয়া হয়েছে!`, { parse_mode: 'Markdown' });
                }
                saveDatabase(db);
                return ctx.reply('❌ সঠিক ইউজার আইডি দিন।');
            }

            if (sessionData.type === 'remove_bot_user') {
                const targetUid = text.replace(/[^0-9]/g, '');
                delete db.adminInputSession[userId];
                if (targetUid) {
                    delete db.allowedUsers[targetUid];
                    saveDatabase(db);
                    await sendMd(targetUid, '⚠️ দুঃখিত! অ্যাডমিন আপনার বট এক্সেস রিমুভ করে দিয়েছেন।');
                    return ctx.reply(`❌ সফলভাবে ইউজার আইডি \`${targetUid}\`-এর এক্সেস রিমুভ করা হয়েছে!`, { parse_mode: 'Markdown' });
                }
                saveDatabase(db);
                return ctx.reply('❌ সঠিক ইউজার আইডি দিন।');
            }

            // manual order completion
            if (sessionData.uniqueOrderId && db.adminSessions[sessionData.uniqueOrderId]) {
                const uniqueOrderId = sessionData.uniqueOrderId;
                const orderInfo = db.adminSessions[uniqueOrderId];
                const targetUid = orderInfo.targetUserId;
                const currentBal = db.balances[targetUid] || 0;

                if (orderInfo.isFFLikeCategory) {
                    const totalDays = orderInfo.totalDays || 1;
                    let subNote = [];
                    if (totalDays > 1) {
                        const subId = `SUB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
                        db.subscriptions[subId] = {
                            userId: targetUid, uid: orderInfo.uid, nickname: orderInfo.nickname || 'Unknown', region: orderInfo.region,
                            product: orderInfo.product, actionType: orderInfo.actionType, productCode: orderInfo.productCode,
                            totalDays, deliveredDays: 1, remainingDays: totalDays - 1,
                            startDate: getTodayDateBD(), lastDeliveredDate: getTodayDateBD(), manual: true
                        };
                        subNote = [`📅 **Subscription:** ${m('Day 1 of ' + totalDays + ' (' + (totalDays - 1) + ' Days Left)')}`];
                    }
                    pushHistory(db, targetUid, {
                        product: totalDays > 1 ? `${orderInfo.product} (Day 1/${totalDays})` : orderInfo.product,
                        uid: orderInfo.uid, nickname: orderInfo.nickname || 'Unknown', region: orderInfo.region, price: orderInfo.price, status: 'Complete'
                    });
                    const completed = receipt('✅ ORDER SUCCESSFULLY COMPLETED', [
                        `📦 Package: ${m(orderInfo.product)}`,
                        `🆔 Order ID: ${m('SRV-' + Math.floor(10000 + Math.random() * 90000))}`,
                        '',
                        `👤 Name: ${m(orderInfo.nickname || 'Unknown')}`,
                        `🛡️ UID: ${m(orderInfo.uid)}`,
                        `🌍 Server: ${m(orderInfo.region)}`,
                        '',
                        `📊 Status: ${m('Completed by Admin')}`,
                        ...subNote,
                        '',
                        `📈 **Added Likes:** ${m('+' + text + ' Likes')}`,
                        '',
                        `💰 Price: ${m(orderInfo.price + ' BDT')}`,
                        `💳 Remaining Balance: ${m(currentBal + ' BDT')}`,
                        '',
                        warningFor(targetUid)
                    ]);
                    delete db.adminInputSession[userId];
                    delete db.adminSessions[uniqueOrderId];
                    saveDatabase(db);
                    await safeEdit(targetUid, orderInfo.loadingMessageId, completed, backKb(targetUid));
                    await notifyAdmin('📋 **[Duplicate Copy - Manual Completed Order]**\n\n' + completed + `\n\n👤 **Customer ID:** ${m(targetUid)}`);
                    return ctx.reply('✅ Order successfully completed & receipt updated to customer!');
                }

                pushHistory(db, targetUid, {
                    product: orderInfo.product, uid: orderInfo.uid, nickname: orderInfo.nickname || 'Guild ID Service',
                    region: orderInfo.region, price: orderInfo.price, status: 'Complete'
                });
                const completed = receipt('✅ ORDER SUCCESSFULLY COMPLETED', [
                    `📦 Package: ${m(orderInfo.product)}`,
                    `🆔 Order ID: ${m('SRV-' + Math.floor(10000 + Math.random() * 90000))}`,
                    '',
                    `🛡️ Target Guild ID: ${m(orderInfo.uid)}`,
                    `🌍 Server: ${m(orderInfo.region)}`,
                    '',
                    `📊 Status: ${m('Completed by Admin')}`,
                    `📝 Note/Details: ${m(text)}`,
                    '',
                    `💰 Price: ${m(orderInfo.price + ' BDT')}`,
                    `💳 Remaining Balance: ${m(currentBal + ' BDT')}`
                ]);
                delete db.adminInputSession[userId];
                delete db.adminSessions[uniqueOrderId];
                saveDatabase(db);
                await safeEdit(targetUid, orderInfo.loadingMessageId, completed, backKb(targetUid));
                await notifyAdmin('📋 **[Duplicate Copy - Completed Order]**\n\n' + completed + `\n\n👤 **Customer ID:** ${m(targetUid)}`);
                return ctx.reply('✅ Order successfully completed & receipt updated to customer!');
            }

            const actionType = sessionData.type;

            if (actionType === 'add_category') {
                const catName = text.replace(/[.$#\[\]\/]/g, '-').trim(); // Firebase key-তে এই ক্যারেক্টার চলে না
                delete db.adminInputSession[userId];
                if (catName) {
                    if (!db.categories.includes(catName)) db.categories.push(catName);
                    if (!db.customProducts[catName]) db.customProducts[catName] = [];
                    saveDatabase(db);
                    return ctx.reply(`✅ Category "${catName}" created successfully!`);
                }
                saveDatabase(db);
                return ctx.reply('❌ Invalid category name.');
            }
            if (actionType === 'add_shop_product') {
                const catName = sessionData.category;
                const parts = text.split('|');
                const prodName = parts[0] ? parts[0].trim() : text;
                const formattedProd = parts[1] ? `${prodName} - ${parts[1].trim()} BDT` : prodName;
                if (!db.customProducts[catName]) db.customProducts[catName] = [];
                db.customProducts[catName].push({ name: formattedProd });
                delete db.adminInputSession[userId];
                saveDatabase(db);
                return ctx.reply(`✅ Product added successfully to "${catName}"!`);
            }
            if (actionType === 'change_shop_price') {
                const catName = sessionData.category;
                const prodIndex = sessionData.prodIndex;
                const newPrice = text.replace(/[^0-9]/g, '');
                delete db.adminInputSession[userId];
                if (db.customProducts[catName] && db.customProducts[catName][prodIndex]) {
                    let oldName = db.customProducts[catName][prodIndex].name;
                    if (oldName.includes('-')) oldName = oldName.replace(/-\s*\d+.*$/, `- ${newPrice} BDT`);
                    else oldName = `${oldName} - ${newPrice} BDT`;
                    db.customProducts[catName][prodIndex].name = oldName;
                    saveDatabase(db);
                    return ctx.reply(`✅ Product price successfully updated to ${newPrice} BDT!`);
                }
                saveDatabase(db);
                return ctx.reply('❌ Product not found.');
            }
            if (actionType === 'add_minus_balance') {
                const parts = text.split(/\s+/);
                const targetUser = parts[0], amount = Number(parts[1]);
                delete db.adminInputSession[userId];
                if (targetUser && !isNaN(amount)) {
                    db.balances[targetUser] = (db.balances[targetUser] || 0) + amount;
                    saveDatabase(db);
                    return ctx.reply(`✅ Balance updated! New Balance: ৳${db.balances[targetUser]}`);
                }
                saveDatabase(db);
                return ctx.reply('❌ Correct format: `USER_ID AMOUNT`', { parse_mode: 'Markdown' });
            }
            if (actionType === 'set_bkash_number') {
                db.numbers.bkash = text; delete db.adminInputSession[userId]; saveDatabase(db);
                return ctx.reply('✅ bKash number updated successfully!');
            }
            if (actionType === 'set_nagad_number') {
                db.numbers.nagad = text; delete db.adminInputSession[userId]; saveDatabase(db);
                return ctx.reply('✅ Nagad number updated successfully!');
            }
            if (actionType === 'send_message') {
                const parts = text.split('|');
                delete db.adminInputSession[userId];
                saveDatabase(db);
                if (parts[0] && parts[1]) {
                    await bot.telegram.sendMessage(parts[0].trim(), parts.slice(1).join('|').trim()).catch(() => {});
                    return ctx.reply('✅ Message sent successfully!');
                }
                return ctx.reply('❌ Correct format: `USER_ID | MESSAGE`', { parse_mode: 'Markdown' });
            }
            if (actionType === 'broadcast_msg') {
                delete db.adminInputSession[userId];
                saveDatabase(db);
                const ids = Object.keys(db.users);
                (async () => {
                    let ok = 0;
                    for (const uId of ids) {
                        try { await bot.telegram.sendMessage(uId, text); ok++; } catch (e) { /* blocked */ }
                        await sleep(60);
                    }
                    await notifyAdmin(`✅ Broadcast completed: ${ok}/${ids.length} delivered.`);
                })().catch((e) => console.error(e));
                return ctx.reply(`📢 Broadcast started for ${ids.length} users...`);
            }
        }

        const sess = db.sessions[userId];

        // ── deposit amount
        if (sess && sess.step === 'awaiting_deposit_amount' && !isMenuCommand(text)) {
            const amountNum = Number(text);
            const lang = getUserLang(userId);

            if (isNaN(amountNum) || amountNum < 100) {
                const errBox = lang === 'bn'
                    ? '╔════════════════════════════╗\n⚠️ ১০০ টাকার নিচে অ্যামাউন্ট অ্যাড হবে না। সর্বনিম্ন ১০০ বা তার বেশি অ্যামাউন্ট অ্যাড ব্যালেন্স করতে হবে।\n╚════════════════════════════╝\n\n✍️ আপনার কাঙ্ক্ষিত অ্যামাউন্টটি আবার লিখে পাঠান:'
                    : '╔════════════════════════════╗\n⚠️ Amount below 100 BDT cannot be added. Minimum deposit is 100 BDT or more.\n╚════════════════════════════╝\n\n✍️ Please enter your amount again:';
                return ctx.reply(errBox, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(lang === 'bn' ? '❌ বাতিল করুন' : '❌ Cancel', 'deposit_portal_back')]])
                });
            }

            sess.depositAmount = amountNum;
            sess.step = 'awaiting_deposit_proof';
            saveDatabase(db);

            const method = sess.method;
            const targetNum = method === 'bKash' ? (db.numbers.bkash || '01XXXXXXXXX') : (db.numbers.nagad || '01XXXXXXXXX');

            const instructionBox = lang === 'bn'
                ? `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n     💖 ${method} সেন্ড মানি নিয়ম\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n📌 **অফিসিয়াল নম্বর:** \`${targetNum}\`\n*(নম্বরের উপর ট্যাপ করে কপি করে নিন)*\n\n💵 **টাকার পরিমাণ:** \`${amountNum} BDT\`\n\n📋 **${method} অ্যাপ থেকে পেমেন্ট করার নিয়ম:**\n1️⃣ ${method} অ্যাপে গিয়ে **Send Money** এ যান।\n2️⃣ উপরের অফিশিয়াল নম্বরটি দিন।\n3️⃣ অ্যামাউন্ট দিন: \`${amountNum} BDT\`\n4️⃣ পিন দিয়ে সেন্ড মানি কনফার্ম করুন।\n5️⃣ টাকা পাঠানোর পর আপনার **TrxID** অথবা পেমেন্টের **স্ক্রিনশট** এই চ্যাটে পাঠিয়ে দিন।\n\n✍️ দ্রুত TrxID অথবা স্ক্রিনশট চ্যাটে পাঠান:`
                : `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n     💖 ${method} Send Money Guide\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n📌 **Official Number:** \`${targetNum}\`\n*(Tap on the number to copy)*\n\n💵 **Amount to Send:** \`${amountNum} BDT\`\n\n📋 **Steps to Pay:**\n1️⃣ Open ${method} app and go to **Send Money**.\n2️⃣ Enter the official number above.\n3️⃣ Enter amount: \`${amountNum} BDT\`\n4️⃣ Confirm with your PIN.\n5️⃣ After sending, send your **TrxID** or payment **screenshot** in this chat.\n\n✍️ Send TrxID or screenshot here:`;

            return ctx.reply(instructionBox, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(lang === 'bn' ? '🔙 পেছনের মেনু ↩️' : '🔙 Back ↩️', method === 'bKash' ? 'dep_bkash' : 'dep_nagad')]])
            });
        }

        // ── deposit proof
        if (sess && sess.step === 'awaiting_deposit_proof' && !isMenuCommand(text)) {
            const method = sess.method;
            const amount = sess.depositAmount || 100;
            const uniqueDepId = userId + '_' + Date.now();
            const proofText = text || (ctx.message.photo ? '[Photo Screenshot Attached]' : 'N/A');

            db.depositRequests[uniqueDepId] = { userId, method, amount, proof: proofText };
            saveDatabase(db);

            const adminDepBox = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   💰 NEW DEPOSIT REQUEST\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n🆔 **User ID:** ${m(userId)}\n💳 **Method:** ${m(method)}\n💵 **Amount:** ${m(amount + ' BDT')}\n📝 **TrxID/Proof:** ${m(proofText)}`;
            const depKb = Markup.inlineKeyboard([
                [Markup.button.callback(`✅ Approve (+${amount} BDT)`, 'dep_app_' + uniqueDepId)],
                [Markup.button.callback('❌ Cancel Request', 'dep_can_' + uniqueDepId)]
            ]);
            if (ctx.message.photo) {
                await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: adminDepBox, parse_mode: 'Markdown', ...depKb }).catch(async () => {
                    await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: stripMd(adminDepBox), ...depKb }).catch((e) => console.error(e.message));
                });
            } else {
                await notifyAdmin(adminDepBox, depKb);
            }

            const lang = getUserLang(userId);
            const pendingBoxMsg = lang === 'bn'
                ? `╭──────────────────────────────╮\n     ⏳ অ্যাড মানি রিকোয়েস্ট পেন্ডিং\n╰──────────────────────────────╯\n\n💳 মাধ্যম: \`${method}\`\n💵 পেন্ডিং অ্যামাউন্ট: \`${amount} BDT\`\n\n✨ আপনার প্রমাণ সফলভাবে জমা হয়েছে। অ্যাডমিন যাচাই করে ব্যালেন্স অ্যাড করে দেবেন!`
                : `╭──────────────────────────────╮\n     ⏳ DEPOSIT REQUEST PENDING\n╰──────────────────────────────╯\n\n💳 Method: \`${method}\`\n💵 Pending Amount: \`${amount} BDT\`\n\n✨ Your proof has been submitted successfully!`;

            const userMsg = await ctx.reply(pendingBoxMsg, { parse_mode: 'Markdown', ...backKb(userId) });
            db.depositRequests[uniqueDepId].userMessageId = userMsg.message_id;
            delete db.sessions[userId];
            saveDatabase(db);
            return;
        }

        // ── UID checker only
        if (sess && sess.step === 'awaiting_uid_only' && !isMenuCommand(text)) {
            const uidText = text;
            const lang = getUserLang(userId);
            delete db.sessions[userId];
            saveDatabase(db);

            const loadingMsg = await checkingAnimation(ctx, userId);
            const resInfo = await checkFreeFireUID(uidText);
            const resultBox = lang === 'bn'
                ? `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   🎮 ফ্রি ফায়ার প্লেয়ার ইনফো\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n👤 নাম: ${m(resInfo.nickname)}\n🛡 ইউআইডি: ${m(uidText)}\n❤️ লাইক: ${m(resInfo.likes)}\n⭐ লেভেল: ${m(resInfo.level)}`
                : `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   🎮 FREE FIRE PLAYER INFO\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n👤 Name: ${m(resInfo.nickname)}\n🛡 UID: ${m(uidText)}\n❤️ Likes: ${m(resInfo.likes)}\n⭐ Level: ${m(resInfo.level)}`;
            await safeEdit(userId, loadingMsg.message_id, resultBox, backKb(userId));
            return;
        }

        // ── order: awaiting UID / Guild ID
        if (sess && sess.step === 'awaiting_uid' && !isMenuCommand(text)) {
            let idText = text;
            if (sess.isFFLikes) {
                idText = text.replace(/\s+/g, '');
                if (!/^\d{8,14}$/.test(idText)) {
                    return ctx.reply('❌ UID সঠিক নয়! UID শুধু ৮–১৪ ডিজিটের সংখ্যা হতে হবে।\n❌ Invalid UID! It must be 8–14 digits.\n\n✍️ আবার UID পাঠান:');
                }
            }
            sess.uid = idText;
            sess.step = 'confirming';
            saveDatabase(db);

            const backRow = [Markup.button.callback(t(userId, 'backBtn'), 'region_' + String(sess.region).toLowerCase())];
            const confirmKb = Markup.inlineKeyboard([
                [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'cancelBtn'), 'cancel_order_review')],
                backRow
            ]);

            if (sess.isFFLikes) {
                const loadingMsg = await checkingAnimation(ctx, userId);
                const resInfo = await checkFreeFireUID(idText);
                sess.nickname = resInfo.nickname;
                sess.level = resInfo.level;
                saveDatabase(db);

                const isAutoOn = db.settings.autoApiEnabled;
                const apiInfoLine = !isAutoOn
                    ? `🛠️ **Mode:** ${m('Manual Review (API is OFF)')}`
                    : (sess.is100Like
                        ? `🛠️ **Mode:** ${m('Manual Review (100 Likes Package)')}`
                        : (sess.actionType === 'auto'
                            ? `🤖 **API Type:** ${m('Auto Subscription (action=auto)')}\n🏷️ **Product Code:** ${m(sess.productCode)}`
                            : `⚡ **API Type:** ${m('Instant (action=like)')}`));

                const reviewBox = `╭────────────────────────────╮\n      📦 ORDER CONFIRMATION\n╰────────────────────────────╯\n\n🛍️ **Package:** ${m(sess.product)}\n${apiInfoLine}\n💵 **Price:** ${m(sess.price + ' BDT')}\n🌍 **Server:** ${m(sess.region)}\n\n👤 **Game Name:** ${m(resInfo.nickname)}\n🛡️ **UID:** ${m(idText)}\n\n⚠️ Please verify your in-game name & UID before confirming.`;
                await safeEdit(userId, loadingMsg.message_id, reviewBox, confirmKb);
            } else {
                sess.nickname = 'Guild ID Service';
                saveDatabase(db);
                const reviewBox = `╭────────────────────────────╮\n      📦 ORDER CONFIRMATION\n╰────────────────────────────╯\n\n🛍️ **Package:** ${m(sess.product)}\n💵 **Price:** ${m(sess.price + ' BDT')}\n🌍 **Server:** ${m(sess.region)}\n🛡️ **Guild ID:** ${m(idText)}\n\n⚠️ Please verify your Guild ID before confirming.`;
                await sendMd(userId, reviewBox, confirmKb);
            }
            return;
        }

        // ───────── ADMIN MENU ─────────
        if (isAdmin) {
            if (cleanText.includes('totalusers') || text.includes('📊')) {
                const userKeys = Object.keys(db.allowedUsers);
                const activeSubsCount = Object.keys(db.subscriptions).length;
                let listText = `📊 **TOTAL AUTHORIZED USERS: ${userKeys.length}**\n🔄 **ACTIVE SUBSCRIPTIONS: ${activeSubsCount}**\n\n`;
                for (let idx = 0; idx < userKeys.length; idx++) {
                    const uId = userKeys[idx];
                    const uInfo = db.users[uId] || { first_name: 'Telegram User', username: 'N/A' };
                    listText += `${idx + 1}. 👤 Name: ${m(uInfo.first_name)}\n   🔗 Username: ${m(uInfo.username)}\n   🆔 ID: ${m(uId)}\n   💰 Balance: ${m((db.balances[uId] || 0) + ' BDT')}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
                    if (listText.length > 3500) { await sendMd(userId, listText); listText = ''; }
                }
                if (listText.length > 0) await sendMd(userId, listText);
                return;
            }
            if (cleanText.includes('addbot') || text.includes('➕')) {
                db.adminInputSession[userId] = { type: 'add_bot_user' }; saveDatabase(db);
                return ctx.reply('➕ **অ্যাড বট মোড চালু হয়েছে**\n\n✍️ যে ইউজারের ইউজার আইডি (User ID) দিয়ে বট এক্সেস দিতে চান, শুধু সেই **ইউজার আইডিটি** লিখে পাঠান:', { parse_mode: 'Markdown' });
            }
            if (cleanText.includes('removebot') || text.includes('❌')) {
                db.adminInputSession[userId] = { type: 'remove_bot_user' }; saveDatabase(db);
                return ctx.reply('❌ **রিমুভ বট মোড চালু হয়েছে**\n\n✍️ যে ইউজারের ইউজার আইডি (User ID) বট থেকে রিমুভ করতে চান, শুধু সেই **ইউজার আইডিটি** লিখে পাঠান:', { parse_mode: 'Markdown' });
            }
            if (cleanText.includes('add/minusbalance') || text.includes('💳')) {
                db.adminInputSession[userId] = { type: 'add_minus_balance' }; saveDatabase(db);
                return ctx.reply('✍️ Format: `USER_ID AMOUNT` (Example: `5932254012 100`)', { parse_mode: 'Markdown' });
            }
            if (cleanText.includes('setpaymentnumbers') || text.includes('📱')) {
                return ctx.reply('📱 **Payment Number Management**\n\n👇 Select which payment number to update:', {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💖 Set bKash Number', 'admin_set_bkash')],
                        [Markup.button.callback('🧡 Set Nagad Number', 'admin_set_nagad')]
                    ])
                });
            }
            if (cleanText.includes('sendmessage') || text.includes('📩')) {
                db.adminInputSession[userId] = { type: 'send_message' }; saveDatabase(db);
                return ctx.reply('✍️ Format: `USER_ID | MESSAGE`', { parse_mode: 'Markdown' });
            }
            if (cleanText.includes('allusersmsg') || text.includes('📢')) {
                db.adminInputSession[userId] = { type: 'broadcast_msg' }; saveDatabase(db);
                return ctx.reply('📢 Enter broadcast message for all users:');
            }
            if (text.includes('Auto API: ON') || text.includes('Auto API: OFF')) {
                // বাটনের লেখা দেখে সেট করা হয় (OFF বাটন চাপলে ON, ON বাটন চাপলে OFF) — পুরনো কিবোর্ডেও ভুল উল্টাবে না
                db.settings.autoApiEnabled = text.includes('Auto API: OFF');
                saveDatabase(db);
                const msg = db.settings.autoApiEnabled
                    ? '🟢 বটটি বর্তমানে অটোমেটিক মোডে আছে, এপিআই সফলভাবে অন হয়েছে।'
                    : '🔴 বটটি বর্তমানে ম্যানুয়াল মোডে আছে, এপিআই অফ হয়ে গেছে।';
                return ctx.reply(msg, { ...getMainKeyboard(userId) });
            }
        }

        // ───────── USER MENU ─────────
        if (lowerText.includes('shop now') || lowerText.includes('শপ নাও') || lowerText.includes('shop') || lowerText.includes('শপ')) {
            return ctx.reply(t(userId, 'shopMenuTitle'), { parse_mode: 'Markdown', ...shopButtons(userId) });
        }

        if (cleanText.includes('calculator') || cleanText.includes('ক্যালকুলেটর') || text.includes('🧮')) {
            db.calcStates[userId] = '0';
            return ctx.reply('🧮 **Calculator**\n\nScreen: `0`', { parse_mode: 'Markdown', ...getCalcKeyboard() });
        }

        if (cleanText.includes('worldclock') || cleanText.includes('ওয়ার্ল্ডক্লক') || text.includes('🌍')) {
            return ctx.reply('🌍 **World Clock & Date**\n\n👇 Select country:', { parse_mode: 'Markdown', ...clockKeyboard(userId) });
        }

        if (cleanText.includes('checkffuid') || cleanText.includes('ইউআইডিচেক') || cleanText.includes('ইউআইডি') || text.includes('🔍')) {
            db.sessions[userId] = { step: 'awaiting_uid_only' };
            saveDatabase(db);
            return ctx.reply(t(userId, 'checkUidPrompt'), { parse_mode: 'Markdown', ...backKb(userId) });
        }

        if (cleanText.includes('addbalance') || cleanText.includes('ব্যালেন্সঅ্যাড') || cleanText.includes('ব্যালেন্স') || text.includes('💰')) {
            const lang = getUserLang(userId);
            return ctx.reply(t(userId, 'depositPortal'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
                    [Markup.button.callback(lang === 'bn' ? '❌ বাতিল করুন' : '❌ Cancel', 'back_start_inline')]
                ])
            });
        }

        if (cleanText.includes('myprofile') || cleanText.includes('আমারপ্রোফাইল') || cleanText.includes('প্রোফাইল') || text.includes('👤')) {
            const pv = profileView(userId, ctx.from.first_name);
            return ctx.reply(pv.text, { parse_mode: 'Markdown', ...pv.kb });
        }

        if (cleanText.includes('orderhistory') || cleanText.includes('অর্ডারহিস্ট্রি') || cleanText.includes('হিস্ট্রি') || text.includes('📜')) {
            const userHistories = (db.orderHistories[userId] || []).slice(0, 10);
            let historyText = t(userId, 'historyTitle');
            if (userHistories.length === 0) {
                historyText += t(userId, 'noHistory');
            } else {
                userHistories.forEach((h, i) => {
                    const statusText = h.status === 'Cancelled' ? '❌ Cancelled' : '✅ Complete';
                    historyText += `${i + 1}. 📦 **${clean(translateProductName(h.product))}** — 💵 \`${h.price} BDT\`\n` +
                        `   💰 Cost: \`${h.price} BDT\`\n` +
                        `   ───────────────────────\n` +
                        `   👤 Name: ${m(h.nickname || 'N/A')}\n` +
                        `   🛡️ UID: ${m(h.uid)}\n` +
                        `   ✦ ───────────────── ✦\n` +
                        `   🕒 \`${h.time} | ${h.date}\`\n` +
                        `   📊 Status: ${statusText}\n\n`;
                });
            }
            return sendMd(userId, historyText + t(userId, 'historyDisclaimer'), backKb(userId));
        }

        if (cleanText.includes('supportdesk') || cleanText.includes('সাপোর্টডেস্ক') || cleanText.includes('সাপোর্ট') || text.includes('📞')) {
            return ctx.reply(t(userId, 'supportText'), { parse_mode: 'Markdown', ...backKb(userId) });
        }

        // ── customer free message → admin
        if (!isAdmin && !isMenuCommand(text)) {
            const box = `📥 **New Customer Message**\n\n👤 Name: ${clean(ctx.from.first_name)}\n🆔 ID: ${m(userId)}\n\n💬 Message:\n${clean(text)}`;
            const replyKb = Markup.inlineKeyboard([[Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]]);
            try {
                if (ctx.message.photo) {
                    await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: stripMd(box), ...replyKb });
                } else {
                    await notifyAdmin(box, replyKb);
                }
            } catch (e) { console.error(e.message); }
            return ctx.reply(t(userId, 'supportSentSuccess'), { parse_mode: 'Markdown', ...backKb(userId) });
        }
    } catch (err) { console.error('message handler error:', err); }
});

// ───────────────────────── ADMIN ACTIONS ─────────────────────────
bot.action('admin_create_cat', async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'add_category' };
        saveDatabase(db);
        await ctx.editMessageText('✍️ Enter new category name:', { ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'shop_now_back')]]) });
    } catch (e) { console.error(e.message); }
});

bot.action(/^admin_add_prod_idx_(\d+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const catIdx = parseInt(ctx.match[1], 10);
        const db = loadDatabase();
        const catName = db.categories[catIdx];
        if (!catName) return;
        db.adminInputSession[ADMIN_ID] = { type: 'add_shop_product', category: catName };
        saveDatabase(db);
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id,
            `✍️ Enter product name and price for **${clean(catName)}**:\nFormat: \`Product Name | Price BDT\`\n(Example: \`100 LIKE | 5\` or \`220 LIKE | 7\`)`,
            Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'custom_cat_' + catIdx)]]));
    } catch (e) { console.error(e.message); }
});

bot.action(/^admin_rem_cat_idx_(\d+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const catIdx = parseInt(ctx.match[1], 10);
        const db = loadDatabase();
        const catName = db.categories[catIdx];
        if (catName) {
            db.categories.splice(catIdx, 1);
            delete db.customProducts[catName];
            saveDatabase(db);
        }
        await ctx.answerCbQuery('✅ Category removed successfully!').catch(() => {});
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, t(ADMIN_ID, 'shopMenuTitle'), shopButtons(ADMIN_ID));
    } catch (e) { console.error(e.message); }
});

bot.action(/^admin_rem_prod_idx_(\d+)_(\d+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const catIdx = parseInt(ctx.match[1], 10);
        const prodIndex = parseInt(ctx.match[2], 10);
        const db = loadDatabase();
        const catName = db.categories[catIdx];
        if (catName && db.customProducts[catName]) {
            db.customProducts[catName].splice(prodIndex, 1);
            saveDatabase(db);
        }
        await ctx.answerCbQuery('✅ Product removed successfully!').catch(() => {});
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, `📂 **${clean(translateCategoryName(catName || ''))}**`, categoryButtons(ADMIN_ID, catIdx));
    } catch (e) { console.error(e.message); }
});

bot.action(/^admin_chg_price_idx_(\d+)_(\d+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const catIdx = parseInt(ctx.match[1], 10);
        const prodIndex = parseInt(ctx.match[2], 10);
        const db = loadDatabase();
        const catName = db.categories[catIdx];
        db.adminInputSession[ADMIN_ID] = { type: 'change_shop_price', category: catName, prodIndex };
        saveDatabase(db);
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, '✍️ Enter new price for this product (Only number):\n(Example: `90`)',
            Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'custom_cat_' + catIdx)]]));
    } catch (e) { console.error(e.message); }
});

bot.action('admin_set_bkash', async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'set_bkash_number' };
        saveDatabase(db);
        await ctx.editMessageText('✍️ Send new bKash personal or merchant number:');
    } catch (e) { console.error(e.message); }
});

bot.action('admin_set_nagad', async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'set_nagad_number' };
        saveDatabase(db);
        await ctx.editMessageText('✍️ Send new Nagad personal or merchant number:');
    } catch (e) { console.error(e.message); }
});

bot.action(/^admin_reply_(.+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const db = loadDatabase();
        db.adminReplySessions[ADMIN_ID] = ctx.match[1];
        saveDatabase(db);
        await ctx.reply('✍️ Type reply message for customer:');
    } catch (e) { console.error(e.message); }
});

bot.action(/^admin_input_(.+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const uniqueOrderId = ctx.match[1];
        const db = loadDatabase();
        const orderInfo = db.adminSessions[uniqueOrderId];
        if (!orderInfo) return ctx.reply('ℹ️ এই অর্ডারটি আগেই কমপ্লিট/ক্যান্সেল হয়েছে।');
        db.adminInputSession[ADMIN_ID] = { uniqueOrderId };
        saveDatabase(db);
        if (orderInfo.isFFLikeCategory) {
            await ctx.reply('✍️ অর্ডার কমপ্লিট করার জন্য **এডেড লাইক (Added Likes)** কত সেটা লিখে পাঠান:\n(যেমন: `100` বা `220`)', { parse_mode: 'Markdown' });
        } else {
            await ctx.reply('✍️ Enter completion note/details for customer:\n(Example: `Guild bot successfully activated!`)', { parse_mode: 'Markdown' });
        }
    } catch (e) { console.error(e.message); }
});

bot.action(/^admin_can_(.+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const db = loadDatabase();
        const info = db.adminSessions[ctx.match[1]];
        if (!info) { await ctx.answerCbQuery('ℹ️ Already handled.').catch(() => {}); return; }
        db.balances[info.targetUserId] = (db.balances[info.targetUserId] || 0) + Number(info.price);
        pushHistory(db, info.targetUserId, { product: info.product, uid: info.uid, nickname: info.nickname || 'Unknown', region: info.region, price: info.price, status: 'Cancelled' });
        delete db.adminSessions[ctx.match[1]];
        saveDatabase(db);
        await safeEdit(info.targetUserId, info.loadingMessageId, '❌ **Order Cancelled & Refunded**', backKb(info.targetUserId));
        await ctx.answerCbQuery('✅ Cancelled & Refunded!').catch(() => {});
        try { await ctx.editMessageText('❌ [CANCELLED & REFUNDED]'); } catch (e) { /* ignore */ }
    } catch (e) { console.error(e.message); }
});

bot.action(/^sub_done_(.+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const ok = await advanceSubscription(ctx.match[1]);
        await ctx.answerCbQuery(ok ? '✅ Delivered & customer notified' : 'ℹ️ Already done / not found').catch(() => {});
        try { await ctx.editMessageText(ok ? '✅ Marked as delivered' : 'ℹ️ Already done / not found'); } catch (e) { /* ignore */ }
    } catch (e) { console.error(e.message); }
});

bot.action(/^dep_app_(.+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const db = loadDatabase();
        const info = db.depositRequests[ctx.match[1]];
        if (!info) { await ctx.answerCbQuery('ℹ️ Already handled.').catch(() => {}); return; }
        const addAmt = Number(info.amount) || 100;
        const targetUser = info.userId;
        const prevBal = db.balances[targetUser] || 0;
        db.balances[targetUser] = prevBal + addAmt;
        const currBal = db.balances[targetUser];
        delete db.depositRequests[ctx.match[1]];
        saveDatabase(db);

        const lang = getUserLang(targetUser);
        const depositReceipt = lang === 'bn'
            ? receipt('✅ ডিপোজিট সফলভাবে সম্পন্ন', [`💳 পেমেন্ট মাধ্যম: ${m(info.method)}`, `💵 অ্যাডকৃত অ্যামাউন্ট: ${m('+' + addAmt + ' BDT')}`, '', `💰 **আগের ব্যালেন্স:** ${m(prevBal + ' BDT')}`, `💰 **বর্তমান ব্যালেন্স:** ${m(currBal + ' BDT')}`, '', `📊 স্ট্যাটাস: ${m('অ্যাডমিন কর্তৃক এপ্রুভড')}`])
            : receipt('✅ DEPOSIT SUCCESSFULLY COMPLETED', [`💳 Method: ${m(info.method)}`, `💵 Added Amount: ${m('+' + addAmt + ' BDT')}`, '', `💰 **Previous Balance:** ${m(prevBal + ' BDT')}`, `💰 **Current Balance:** ${m(currBal + ' BDT')}`, '', `📊 Status: ${m('Approved by Admin')}`]);

        if (info.userMessageId) await safeEdit(targetUser, info.userMessageId, depositReceipt, backKb(targetUser));
        else await sendMd(targetUser, depositReceipt, backKb(targetUser));

        await ctx.answerCbQuery('✅ Deposit approved & balance updated!').catch(() => {});
        try { await ctx.editMessageCaption(`✅ [DEPOSIT APPROVED: +${addAmt} BDT]`); } catch (e) {
            try { await ctx.editMessageText(`✅ [DEPOSIT APPROVED: +${addAmt} BDT]`); } catch (err) { /* ignore */ }
        }
    } catch (e) { console.error(e.message); }
});

bot.action(/^dep_can_(.+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== ADMIN_ID) return;
        const db = loadDatabase();
        const info = db.depositRequests[ctx.match[1]];
        if (!info) { await ctx.answerCbQuery('ℹ️ Already handled.').catch(() => {}); return; }
        await sendMd(info.userId, '❌ আপনার ডিপোজিট রিকোয়েস্টটি বাতিল করা হয়েছে।');
        delete db.depositRequests[ctx.match[1]];
        saveDatabase(db);
        await ctx.answerCbQuery('❌ Cancelled.').catch(() => {});
        try { await ctx.editMessageCaption('❌ [DEPOSIT REJECTED]'); } catch (e) {
            try { await ctx.editMessageText('❌ [DEPOSIT REJECTED]'); } catch (err) { /* ignore */ }
        }
    } catch (e) { console.error(e.message); }
});

// ───────────────────────── USER ACTIONS ─────────────────────────
bot.action('open_lang_menu', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        await ctx.editMessageText('🌐 Select Your Language / ভাষা নির্বাচন করুন:', {
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 বাংলা', 'set_lang_bn'), Markup.button.callback('🇬🇧 English', 'set_lang_en')],
                [Markup.button.callback(t(userId, 'backBtn'), 'back_to_profile'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) { console.error(e.message); }
});

bot.action('back_to_profile', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const pv = profileView(userId, ctx.from.first_name);
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, pv.text, pv.kb);
    } catch (e) { console.error(e.message); }
});

bot.action(/^set_lang_(bn|en)$/, async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const lang = ctx.match[1];
        const db = loadDatabase();
        db.userLang[userId] = lang;
        saveDatabase(db);
        await ctx.answerCbQuery(lang === 'bn' ? '🇧🇩 বাংলা ভাষা সেট করা হয়েছে!' : '🇬🇧 English language selected!').catch(() => {});
        try { await ctx.deleteMessage(); } catch (e) { /* ignore */ }
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) { console.error(e.message); }
});

async function showDepositPortal(ctx) {
    const userId = String(ctx.from.id);
    const lang = getUserLang(userId);
    await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, t(userId, 'depositPortal'), Markup.inlineKeyboard([
        [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
        [Markup.button.callback(lang === 'bn' ? '❌ বাতিল করুন' : '❌ Cancel', 'back_start_inline')]
    ]));
}

bot.action('deposit_portal_back', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const db = loadDatabase();
        if (db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        await showDepositPortal(ctx);
    } catch (e) { console.error(e.message); }
});

async function startDeposit(ctx, method) {
    const userId = String(ctx.from.id);
    const db = loadDatabase();
    db.sessions[userId] = { step: 'awaiting_deposit_amount', method };
    saveDatabase(db);
    const lang = getUserLang(userId);
    const icon = method === 'bKash' ? '💖' : '🧡';
    const nameBn = method === 'bKash' ? 'বিকাশ (bKash)' : 'নগদ (Nagad)';
    const box = lang === 'bn'
        ? `╭──────────────────────────────╮\n     ${icon} ${nameBn} ডিপোজিট\n╰──────────────────────────────╯\n\n💎 **নোটিশ:** সর্বনিম্ন ডিপোজিট বা অ্যাড ব্যালেন্স করতে হলে **১০০ টাকা বা তার বেশি** করতে হবে।\n\n✍️ আপনার কাঙ্ক্ষিত অ্যামাউন্টটি লিখে পাঠান:`
        : `╭──────────────────────────────╮\n     ${icon} ${method} Deposit\n╰──────────────────────────────╯\n\n💎 **Notice:** Minimum deposit is **100 BDT or more**.\n\n✍️ Please enter your amount to add:`;
    await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, box,
        Markup.inlineKeyboard([[Markup.button.callback(lang === 'bn' ? '❌ বাতিল করুন' : '❌ Cancel', 'deposit_portal_back')]]));
}
bot.action('dep_bkash', async (ctx) => { try { await startDeposit(ctx, 'bKash'); } catch (e) { console.error(e.message); } });
bot.action('dep_nagad', async (ctx) => { try { await startDeposit(ctx, 'Nagad'); } catch (e) { console.error(e.message); } });

bot.action(/^calc_(.+)$/, async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const val = ctx.match[1].trim();
        const db = loadDatabase();
        let current = db.calcStates[userId] || '0';

        if (val === 'C') current = '0';
        else if (val === 'DEL') current = current.length > 1 ? current.slice(0, -1) : '0';
        else if (val === 'EQ') {
            try {
                const sanitized = current.replace(/[^0-9+\-*/().]/g, '');
                current = sanitized ? String(Function('"use strict";return (' + sanitized + ')')()) : '0';
            } catch (e) { current = 'Error'; }
        } else if (current === '0' || current === 'Error') current = (val === '.') ? '0.' : val;
        else current += val;

        db.calcStates[userId] = current;
        await ctx.editMessageText(`🧮 **Calculator**\n\nScreen: \`${clean(current)}\``, { parse_mode: 'Markdown', ...getCalcKeyboard() });
    } catch (e) { /* message not modified etc. */ }
});

bot.action(/^clock_(bd|np|in|pk|sa|ae|my|sg|us|gb|ca|au)$/, async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const tzMap = {
            bd: 'Asia/Dhaka', np: 'Asia/Kathmandu', in: 'Asia/Kolkata', pk: 'Asia/Karachi', sa: 'Asia/Riyadh', ae: 'Asia/Dubai',
            my: 'Asia/Kuala_Lumpur', sg: 'Asia/Singapore', us: 'America/New_York', gb: 'Europe/London', ca: 'America/Toronto', au: 'Australia/Sydney'
        };
        const now = new Date();
        const tz = tzMap[ctx.match[1]];
        const timeStr = now.toLocaleTimeString('en-US', { timeZone: tz });
        const dateStr = now.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        await ctx.editMessageText(`🌍 **World Clock & Date**\n\n📅 Date: \`${dateStr}\`\n🕒 Time: \`${timeStr}\``, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), 'back_to_clock'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
        });
    } catch (e) { /* ignore */ }
});

bot.action('back_to_clock', async (ctx) => {
    try { await ctx.editMessageText('🌍 **World Clock & Date**\n\n👇 Select country:', { parse_mode: 'Markdown', ...clockKeyboard(String(ctx.from.id)) }); }
    catch (e) { /* ignore */ }
});

bot.action('shop_now_back', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, t(userId, 'shopMenuTitle'), shopButtons(userId));
    } catch (e) { console.error(e.message); }
});

bot.action(/^custom_cat_(\d+)$/, async (ctx) => {
    try {
        const catIdx = parseInt(ctx.match[1], 10);
        const userId = String(ctx.from.id);
        const db = loadDatabase();
        const catName = db.categories[catIdx];
        if (!catName) return;
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, `📂 **${clean(translateCategoryName(catName))}**`, categoryButtons(userId, catIdx));
    } catch (e) { console.error(e.message); }
});

bot.action(/^sub_prod_idx_(\d+)_(\d+)$/, async (ctx) => {
    try {
        const catIdx = parseInt(ctx.match[1], 10);
        const index = parseInt(ctx.match[2], 10);
        const userId = String(ctx.from.id);
        const db = loadDatabase();
        const catName = db.categories[catIdx];
        const prod = (db.customProducts[catName] || [])[index] || { name: 'Package' };
        const translated = translateProductName(prod.name);

        let price = 0;
        const takaMatch = prod.name.match(/(\d+)\s*[৳tk]/i);
        const dashMatch = prod.name.match(/-\s*(\d+)/);
        const currMatch = prod.name.match(/(\d+)\s*(tk|BDT)/i);
        if (takaMatch) price = Number(takaMatch[1]);
        else if (dashMatch) {
            const all = [...prod.name.matchAll(/-\s*(\d+)/g)];
            price = all.length > 0 ? Number(all[all.length - 1][1]) : Number(dashMatch[1]);
        } else if (currMatch) price = Number(currMatch[1]);
        else { const nums = prod.name.match(/\d+/g); price = nums ? Number(nums[nums.length - 1]) : 0; }

        const lowerCatName = String(catName).toLowerCase();
        const isFFLikes = lowerCatName.includes('like') || lowerCatName.includes('লাইক') || String(catName).includes('🔥');
        const totalDays = extractPackageDays(prod.name);

        let actionType = 'like';
        let productCode = '';
        const lowerProdName = prod.name.toLowerCase();
        const is100Like = hasNum(lowerProdName, '100');

        if (lowerProdName.includes('6600') || lowerProdName.includes('৩০ দিন') || lowerProdName.includes('30 days')) { actionType = 'auto'; productCode = 'AL-55F71F'; }
        else if (lowerProdName.includes('3300') || lowerProdName.includes('১৫ দিন') || lowerProdName.includes('15 days')) { actionType = 'auto'; productCode = 'AL-3300'; }
        else if (lowerProdName.includes('1100') || lowerProdName.includes('৫ দিন') || lowerProdName.includes('5 days')) { actionType = 'auto'; productCode = 'AL-1100'; }

        db.sessions[userId] = { product: translated, price, activeCategory: catName, prodIndex: index, catIdx, isFFLikes, is100Like, totalDays, actionType, productCode };
        saveDatabase(db);

        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id,
            t(userId, 'serverTitle') + `${m(translated)}\n💵 Price: ${m(price + ' BDT')}\n\n👇 Select Server:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 BD', 'region_bd'), Markup.button.callback('🇮🇩 ID', 'region_id')],
                [Markup.button.callback(t(userId, 'backBtn'), 'custom_cat_' + catIdx), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ]));
    } catch (e) { console.error(e.message); }
});

bot.action(/^region_(bd|id)$/, async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const region = ctx.match[1].toUpperCase();
        const db = loadDatabase();
        const session = db.sessions[userId];
        if (!session) { return safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, '⌛ Session expired. Please start again.', backKb(userId)); }
        session.region = region;
        session.step = 'awaiting_uid';
        saveDatabase(db);

        const prevProdCallback = session.catIdx !== undefined ? 'custom_cat_' + session.catIdx : 'shop_now_back';
        const promptText = session.isFFLikes
            ? `🎮 **Enter UID (${region})**\n\n✍️ Please type and send your UID:`
            : `🛡️ **Enter Guild ID (${region})**\n\n✍️ Please type and send your Guild ID:`;
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, promptText,
            Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), prevProdCallback), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]));
    } catch (e) { console.error(e.message); }
});

bot.action('cancel_order_review', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const db = loadDatabase();
        if (db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        await safeEdit(ctx.chat.id, ctx.callbackQuery.message.message_id, '❌ **Order Cancelled**\n\nYou have cancelled this order. No balance was deducted.', backKb(userId));
    } catch (e) { console.error(e.message); }
});

bot.action('confirm_order', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const db = loadDatabase();
        const session = db.sessions[userId];
        if (!session || session.step !== 'confirming') return ctx.answerCbQuery('Session expired. Please start again.', { show_alert: true }).catch(() => {});
        const price = Number(session.price) || 0;
        if ((db.balances[userId] || 0) < price) return ctx.answerCbQuery('❌ Insufficient balance!', { show_alert: true }).catch(() => {});

        // 🔒 ডাবল-ট্যাপ লক: সেশন সরিয়ে + টাকা কেটে তারপর প্রসেস
        delete db.sessions[userId];
        db.balances[userId] = (db.balances[userId] || 0) - price;
        saveDatabase(db);
        await ctx.answerCbQuery('⏳ Processing...').catch(() => {});

        const msgId = ctx.callbackQuery.message.message_id;
        // API অনেক সময় নিতে পারে (instant like ডেলিভারির অপেক্ষা করে) — তাই webhook আটকে না রেখে ব্যাকগ্রাউন্ডে চালানো হয়
        processOrder(userId, msgId, session).catch(async (err) => {
            console.error('processOrder crashed:', err);
            // ক্র্যাশ করলে টাকা হারাবে না: ম্যানুয়াল রিভিউয়ে পাঠানো
            try {
                const d = loadDatabase();
                const uniqueOrderId = userId + '_' + Date.now();
                d.adminSessions[uniqueOrderId] = {
                    targetUserId: userId, loadingMessageId: msgId, product: session.product, uid: session.uid, nickname: session.nickname || 'Unknown',
                    region: session.region, price, totalDays: session.totalDays || 1, actionType: session.actionType, productCode: session.productCode, isFFLikeCategory: !!session.isFFLikes
                };
                saveDatabase(d);
                await safeEdit(userId, msgId, '⏳ আপনার অর্ডারটি অ্যাডমিন রিভিউয়ে আছে। শীঘ্রই কমপ্লিট হবে।', backKb(userId));
                await notifyAdmin(`🚨 **Order processing crashed — manual needed**\n\n📦 ${m(session.product)}\n🛡️ UID: ${m(session.uid)}\n💵 ${m(price + ' BDT')}\n👤 Customer: ${m(userId)}\n⚠️ ${m(err && err.message)}`, Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Complete Order', 'admin_input_' + uniqueOrderId)],
                    [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
                ]));
            } catch (e2) { console.error(e2); }
        });
    } catch (e) { console.error('confirm_order error:', e); }
});

// 'mainMenuBack' পুরনো মেসেজের বাটনের জন্যও কাজ করবে
bot.action(/^(back_start_inline|mainMenuBack)$/, async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const db = loadDatabase();
        if (db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        try { await ctx.deleteMessage(); } catch (e) { /* ignore */ }
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) { console.error(e.message); }
});

bot.catch((err) => { console.error('Telegraf error:', err && err.message ? err.message : err); });

// ───────────────────────── SERVER / WEBHOOK ─────────────────────────
// ওয়েবহুক পাথ আগে শুধু bot id ছিল (যেটা পাবলিক) — এখন টোকেনের হ্যাশ, কেউ আন্দাজ করে ফেক আপডেট পাঠাতে পারবে না
const webhookPath = '/hook-' + crypto.createHash('sha256').update(BOT_TOKEN).digest('hex').slice(0, 32);
const handleWebhook = bot.webhookCallback(webhookPath);

const server = http.createServer((req, res) => {
    try {
        if (req.url === webhookPath && req.method === 'POST') {
            if (!dbReady) { res.writeHead(503); return res.end('db loading'); } // Telegram পরে আবার পাঠাবে
            return handleWebhook(req, res);
        }
        if (req.url === '/ping') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('OK'); }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('ST Like Bot is running live via Webhook! 🚀');
    } catch (e) {
        console.error('Server Request Error:', e);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

server.listen(PORT, async () => {
    console.log(`Webhook HTTP Server listening on port ${PORT}`);
    await initDb();
    try {
        await bot.telegram.setWebhook(`${RENDER_URL}${webhookPath}`, { drop_pending_updates: true });
        console.log('✅ Webhook set successfully');
    } catch (err) {
        console.error('Webhook set error:', err && err.message ? err.message : err);
    }
    setTimeout(processDailySubscriptions, 60 * 1000);
    setInterval(processDailySubscriptions, 15 * 60 * 1000);
    // Render ঘুমিয়ে না যেতে নিজেকে পিং (UptimeRobot-ও লাগাও)
    setInterval(() => { https.get(`${RENDER_URL}/ping`, (r) => r.resume()).on('error', () => {}); }, 4 * 60 * 1000);
});
