const { Telegraf, Markup } = require('telegraf');
const http = require('http');
const https = require('https');
require('dotenv').config();

process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); });
process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection at:', promise, 'reason:', reason); });

const BOT_TOKEN = process.env.BOT_TOKEN || '8395471740:AAF-v0dAgc36nL7sb1G5Dy6IzHmsCUlwe80';
const ADMIN_ID = process.env.ADMIN_ID || '5932254012';
const CHANNEL_ID = process.env.CHANNEL_ID || '@shohan2004';
const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://m.youtube.com/@ShohanSir18';

const API_BASE = "https://raigen.site/likesff/reseller.php";
const API_KEY = "likesff-shop-11935-c3rp5src";
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://st-like-sell-bot.onrender.com';
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;

const bot = new Telegraf(BOT_TOKEN);
let cachedDb = { users: {}, balances: {}, sessions: {}, numbers: { bkash: '01XXXXXXXXX (Personal)', nagad: '01XXXXXXXXX (Personal)' }, categories: {}, customProducts: {}, allowedUsers: {}, pendingMsgs: {}, orderHistories: {}, historyTimestamps: {}, lastCleanMonth: '', userLang: {}, depositRequests: {}, adminReplySessions: {}, adminInputSession: {}, adminSessions: {}, calcStates: {}, settings: { autoApiEnabled: true } };

function loadDatabase() { return cachedDb; }

function syncDataFromFirebase() {
    if (!FIREBASE_DB_URL) return;
    const url = FIREBASE_DB_URL.endsWith('/') ? `${FIREBASE_DB_URL}database.json` : `${FIREBASE_DB_URL}/database.json`;
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                if (data && data !== 'null') {
                    const parsed = JSON.parse(data);
                    if (parsed) {
                        cachedDb = parsed;
                        if (!cachedDb.settings) cachedDb.settings = { autoApiEnabled: true };
                        if (!cachedDb.numbers) cachedDb.numbers = { bkash: '01XXXXXXXXX (Personal)', nagad: '01XXXXXXXXX (Personal)' };
                    }
                }
            } catch (e) {}
        });
    }).on('error', () => {});
}

function saveDatabase(data) {
    cachedDb = data;
    if (!FIREBASE_DB_URL) return;
    const dataString = JSON.stringify(data);
    const dbUrl = new URL(FIREBASE_DB_URL.endsWith('/') ? `${FIREBASE_DB_URL}database.json` : `${FIREBASE_DB_URL}/database.json`);
    const reqOptions = { hostname: dbUrl.hostname, path: dbUrl.pathname + dbUrl.search, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dataString) } };
    const req = https.request(reqOptions, () => {});
    req.on('error', () => {});
    req.write(dataString);
    req.end();
}

syncDataFromFirebase();
setInterval(syncDataFromFirebase, 5 * 60 * 1000);

function callLikesFFApiWithTimeout(params, timeoutMs = 30000) {
    return new Promise((resolve) => {
        const queryParams = new URLSearchParams({ key: API_KEY, ...params });
        const url = `${API_BASE}?${queryParams.toString()}`;
        let isFinished = false;
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (isFinished) return;
                isFinished = true;
                try { resolve(JSON.parse(data)); } catch (err) { resolve({ success: false, error: 'Invalid JSON' }); }
            });
        });
        req.on('error', () => { if (!isFinished) { isFinished = true; resolve({ success: false, error: 'Failed' }); } });
        setTimeout(() => { if (!isFinished) { isFinished = true; req.destroy(); resolve({ success: false, error: 'Timeout' }); } }, timeoutMs);
    });
}

function getUserLang(userId) {
    const db = loadDatabase();
    if (!db.userLang) db.userLang = {};
    return db.userLang[userId] || 'bn';
}

function t(userId, key) {
    const lang = getUserLang(userId);
    const dict = {
        bn: {
            welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ স্বাগতম! আমাদের প্রিমিয়াম গেমিং সার্ভিসে আপনাকে স্বাগতম। নিচে থেকে আপনার পছন্দের সার্ভিসটি বেছে নিনঃ 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            shopMenuTitle: "🛍️ **সকল উপলব্ধ সার্ভিস**\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:",
            checkUidPrompt: "🎮 **ফ্রি ফায়ার ইউআইডি চেকার**\n\n✍️ ইউআইডি লিখে পাঠান:",
            depositPortal: "»»------------- ★ 💰 ডিপোজিট পোর্টাল ★ -------------««\n\n💎 সর্বনিম্ন ডিপোজিট: `১০০.০ টাকা`\n👇 টাকা পাঠানোর জন্য যেকোনো মাধ্যম সিলেক্ট করুন:\n\n»»-------------------------------------------------««",
            supportText: "📞 **সাপোর্ট ডেস্ক**\n\n💡 আপনার যেকোনো সমস্যা, TrxID বা স্ক্রিনশট সরাসরি এই চ্যাটেই পাঠিয়ে দিন। অ্যাডমিন খুব দ্রুত রিপ্লাই দেবেন।",
            mainMenuBack: "🔙 মূল মেনু 🏠",
            backBtn: "🔙 পেছনের মেনু ↩️",
            buyLikes: "🔥 ফ্রি ফায়ার লাইক কিনুন ⚡",
            serverTitle: "🌍 **সার্ভার নির্বাচন**\n\nপ্যাকেজ: ",
            enterIdTitle: "🎮 **আইডি ডিটেইলস দিন**\n\nসার্ভার: ",
            confirmOrderBtn: "✅ অর্ডার কনফার্ম করুন 🚀",
            orderProcessing: "⏳ অর্ডার প্রসেসিং হচ্ছে...",
            apiProcessing: "⏳ এপিআই অটো-প্রসেসিং হচ্ছে...",
            uploadProofTitle: "✦ ─────────────── ✦ ─────────────── ✦\n       📸 পেমেন্ট প্রুফ আপলোড করুন\n✦ ─────────────── ✦ ─────────────── ✦\n\n✍️ পেমেন্টের স্ক্রিনশট অথবা ট্রানজেকশন আইডি (TrxID) এখন চ্যাটে সেন্ড করুন:",
            proofSubmittedStatus: "✦ ─────────────── ✦ ─────────────── ✦\n       🚀 প্রুফ সাবমিট সফল ✅\n✦ ─────────────── ✦ ─────────────── ✦\n\n💳 পেমেন্ট মাধ্যম: ",
            depositCancelledBox: "❌ **ডিপোজিট বাতিল করা হয়েছে**\n\n⚠️ আপনার ডিপোজিট রিকোয়েস্টটি অ্যাডমিন কর্তৃক বাতিল করা হয়েছে।",
            supportSentSuccess: "✨ আপনার মেসেজ বা স্ক্রিনশট সরাসরি অ্যাডমিনের কাছে পৌঁছে গেছে! দয়া করে অপেক্ষা করুন।",
            historyTitle: "📜 **শেষ ১০টি অর্ডারের ইতিহাস**\n\n",
            historyDisclaimer: "\n\n⚠️ *নোট: সুরক্ষার জন্য এখানে শুধুমাত্র আপনার সর্বশেষ ১০টি অর্ডার দেখানো হয়।*",
            noHistory: "❌ এখনো কোনো অর্ডার সম্পন্ন হয়নি!\n\n"
        },
        en: {
            welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ Welcome to our premium gaming service. Choose your preferred service below: 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            shopMenuTitle: "🛍️ **ALL AVAILABLE SHOP**\n\n👇 Please select the buttons below:",
            checkUidPrompt: "🎮 **FREE FIRE UID CHECKER**\n\n✍️ Send UID:",
            depositPortal: "»»------------- ★ 💰 DEPOSIT PORTAL ★ -------------««\n\n💎 Min Deposit: `100.0 BDT`\n👇 Choose any payment method below:\n\n»»-------------------------------------------------««",
            supportText: "📞 **SUPPORT DESK**\n\n💡 Send any issue, TrxID or screenshot directly in this chat. Admin will reply soon.",
            mainMenuBack: "🔙 Main Menu 🏠",
            backBtn: "🔙 Back ↩️",
            buyLikes: "🔥 Buy Free Fire Likes ⚡",
            serverTitle: "🌍 **SERVER SELECTION**\n\nPackage: ",
            enterIdTitle: "🎮 **ENTER ID DETAILS**\n\nServer: ",
            confirmOrderBtn: "✅ Confirm Order 🚀",
            orderProcessing: "⏳ Order is processing...",
            apiProcessing: "⏳ API Auto-Processing...",
            uploadProofTitle: "✦ ─────────────── ✦ ─────────────── ✦\n       📸 UPLOAD PAYMENT PROOF\n✦ ─────────────── ✦ ─────────────── ✦\n\n✍️ Please send your payment screenshot or TrxID in chat now:",
            proofSubmittedStatus: "✦ ─────────────── ✦ ─────────────── ✦\n       🚀 PROOF SUBMITTED ✅\n✦ ─────────────── ✦ ─────────────── ✦\n\n💳 Method: ",
            depositCancelledBox: "❌ **DEPOSIT CANCELLED**\n\n⚠️ Your deposit request has been cancelled by the admin.",
            supportSentSuccess: "✨ Your message or screenshot has been sent directly to the admin! Please wait.",
            historyTitle: "📜 **LAST 10 ORDERS HISTORY**\n\n",
            historyDisclaimer: "\n\n⚠️ *Note: Only the latest 10 orders are displayed here.*",
            noHistory: "❌ No orders completed yet!\n\n"
        }
    };
    return dict[lang][key] || dict['bn'][key];
}

function getMainKeyboard(userId) {
    const lang = getUserLang(userId);
    let keyboard = lang === 'en' ? [
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

    if (userId.toString() === ADMIN_ID.toString()) {
        const db = loadDatabase();
        const apiStatusText = (db.settings && db.settings.autoApiEnabled) ? '🟢 Auto API: ON' : '🔴 Auto API: OFF';
        keyboard.push(
            ['-----------------------------------'],
            [apiStatusText, '📊 Total Users'],
            ['➕ Add Bot', '❌ Remove Bot'],
            ['➕ Add Product', '❌ Remove Product'],
            ['💳 Add/Minus Balance', '📱 Set Payment Numbers'],
            ['📩 Send Message', '📢 All Users Msg']
        );
    }
    return Markup.keyboard(keyboard).resize();
}

function translateCategoryName(catName, userId) {
    const lang = getUserLang(userId);
    const map = { 'Guild Glory Bot': lang === 'bn' ? '🛡️ গিল্ড গ্লোরি বট' : 'Guild Glory Bot', 'Free Fire Likes': lang === 'bn' ? '🔥 ফ্রি ফায়ার লাইকস' : 'Free Fire Likes' };
    return map[catName] || catName;
}

function translateProductName(prodName, userId) {
    const lang = getUserLang(userId);
    if (lang === 'bn') {
        return prodName.replace(/Likes/gi, 'লাইক').replace(/Squad Bot/gi, 'স্কোয়াড বট').replace(/Days/gi, 'দিন').replace(/Pack/gi, 'প্যাকেজ');
    } else {
        return prodName.replace(/লাইক/gi, 'Likes').replace(/স্কোয়াড বট/gi, 'Squad Bot').replace(/দিন/gi, 'Days').replace(/প্যাকেজ/gi, 'Pack');
    }
}

async function checkUserSubscription(userId) {
    if (userId.toString() === ADMIN_ID.toString()) return true;
    try {
        const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
        return !(chatMember.status === 'left' || chatMember.status === 'kicked');
    } catch (e) { return false; }
}

async function sendForceSubMessage(ctx, isPendingAdminAccess = false) {
    let text, keyboard;
    if (isPendingAdminAccess) {
        text = "⏳ **50% ACCESS PENDING**\n\n🎉 অভিনন্দন! আপনি **ST Like Bot**-এর ৫০% এক্সেস সফলভাবে পেয়েছেন। বাকী এক্সেস পেতে নিচের বাটনে ক্লিক করে অ্যাডমিনকে মেসেজ দিন।\n👑 **Admin:** `@sonu1813`";
        keyboard = Markup.inlineKeyboard([[Markup.button.url('💬 Message Admin 🚀', 'https://t.me/sonu1813')]]);
    } else {
        text = "🚨 **SECURITY LOCK & FORCE**\n\n⚠️ প্রিমিয়াম বট ব্যবহার করতে হলে আমাদের অফিশিয়াল চ্যানেলে যুক্ত থাকতে হবে!\n\n🔥 **ধাপসমূহ:**\n1️⃣ টেলিগ্রাম চ্যানেলে জয়েন করুন।\n2️⃣ ইউটিউব চ্যানেল সাবস্ক্রাইব করুন।\n3️⃣ ভেরিফাই বাটনে ক্লিক করুন।";
        keyboard = Markup.inlineKeyboard([
            [Markup.button.url('📢 Join Telegram Channel 🚀', 'https://t.me/shohan2004')],
            [Markup.button.url('🔴 Subscribe YouTube 🎬', YOUTUBE_URL)],
            [Markup.button.callback('🔄 Verify Membership ✨', 'verify_sub')]
        ]);
    }
    try {
        if (ctx.callbackQuery) { await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }); }
        else { await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard }); }
    } catch (e) {}
}

function checkFreeFireUID(uid) {
    return new Promise((resolve) => {
        const url = 'https://akmtopup.com/api/checkuid?uid=' + uid;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    let nickname = parsed.nickname || parsed.message || parsed.name || parsed.username || parsed.AccountName;
                    resolve((nickname && nickname.trim() !== '') ? nickname : 'Unknown Player');
                } catch (err) { resolve('Unknown Player'); }
            });
        }).on('error', () => { resolve('Unknown Player'); });
    });
}

bot.use(async (ctx, next) => {
    try {
        if (ctx && ctx.from) {
            const userId = ctx.from.id.toString();
            const db = loadDatabase();
            if (!db.users) db.users = {};
            db.users[userId] = { id: userId, first_name: ctx.from.first_name || 'N/A', username: ctx.from.username ? '@' + ctx.from.username : 'N/A' };
            saveDatabase(db);
            if (userId === ADMIN_ID) return next();
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'verify_sub') return next();
            if (ctx.message && ctx.message.text && (ctx.message.text.startsWith('/start') || ctx.message.text.includes('Shop Now') || ctx.message.text.includes('শপ নাও'))) return next();
            if (!(await checkUserSubscription(userId))) return sendForceSubMessage(ctx, false);
            if (!db.allowedUsers || !db.allowedUsers[userId]) return sendForceSubMessage(ctx, true);
        }
        await next();
    } catch (err) {}
});

bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        if (!(await checkUserSubscription(userId))) return sendForceSubMessage(ctx, false);
        const db = loadDatabase();
        if (userId.toString() !== ADMIN_ID.toString() && (!db.allowedUsers || !db.allowedUsers[userId])) return sendForceSubMessage(ctx, true);
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

bot.action('verify_sub', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        if (!(await checkUserSubscription(userId))) return ctx.answerCbQuery('❌ আপনি এখনো টেলিগ্রাম চ্যানেলে জয়েন করেননি!', { show_alert: true });
        const db = loadDatabase();
        if (userId.toString() !== ADMIN_ID.toString() && (!db.allowedUsers || !db.allowedUsers[userId])) {
            await ctx.answerCbQuery('⚠️ চ্যানেল ভেরিফাইড! অ্যাডমিনের পারমিশন নিন।');
            try { await ctx.deleteMessage(); } catch (e) {}
            return sendForceSubMessage(ctx, true);
        }
        await ctx.answerCbQuery('🎉 ভেরিফিকেশন সফল!');
        try { await ctx.deleteMessage(); } catch (e) {}
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

function getCalcKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('C', 'calc_C'), Markup.button.callback('⌫', 'calc_DEL'), Markup.button.callback('/', 'calc_/'), Markup.button.callback('*', 'calc_*')],
        [Markup.button.callback('7', 'calc_7'), Markup.button.callback('8', 'calc_8'), Markup.button.callback('9', 'calc_9'), Markup.button.callback('-', 'calc_-')],
        [Markup.button.callback('4', 'calc_4'), Markup.button.callback('5', 'calc_5'), Markup.button.callback('6', 'calc_6'), Markup.button.callback('+', 'calc_+')],
        [Markup.button.callback('1', 'calc_1'), Markup.button.callback('2', 'calc_2'), Markup.button.callback('3', 'calc_3'), Markup.button.callback('=', 'calc_EQ')],
        [Markup.button.callback('0', 'calc_0'), Markup.button.callback('.', 'calc_.'), Markup.button.callback('🔙 Menu', 'back_start_inline')]
    ]);
}

bot.on('message', async (ctx) => {
    try {
        if (!ctx.message) return;
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (!db.balances) db.balances = {};
        if (!db.sessions) db.sessions = {};
        if (!db.numbers) db.numbers = { bkash: '01XXXXXXXXX (Personal)', nagad: '01XXXXXXXXX (Personal)' };
        if (!db.categories) db.categories = {};
        if (!db.customProducts) db.customProducts = {};
        if (!db.users) db.users = {};
        if (!db.orderHistories) db.orderHistories = {};
        if (!db.depositRequests) db.depositRequests = {};
        if (!db.adminInputSession) db.adminInputSession = {};
        if (!db.adminSessions) db.adminSessions = {};
        if (!db.calcStates) db.calcStates = {};

        const text = ctx.message.text ? ctx.message.text.trim() : (ctx.message.caption ? ctx.message.caption.trim() : '');

        if (userId === ADMIN_ID.toString() && db.adminReplySessions && db.adminReplySessions[userId]) {
            const targetUser = db.adminReplySessions[userId];
            try {
                await bot.telegram.sendMessage(targetUser, "💬 **অ্যাডমিন রিপ্লাই:**\n\n" + text, { parse_mode: 'Markdown' });
                await ctx.reply('✅ মেসেজ পাঠানো হয়েছে!');
            } catch (err) { await ctx.reply('❌ পাঠানো যায়নি।'); }
            delete db.adminReplySessions[userId];
            saveDatabase(db);
            return;
        }

        if (userId === ADMIN_ID.toString() && db.adminInputSession && db.adminInputSession[userId]) {
            const sessionData = db.adminInputSession[userId];
            if (sessionData.uniqueOrderId && db.adminSessions[sessionData.uniqueOrderId]) {
                const uniqueOrderId = sessionData.uniqueOrderId;
                const orderInfo = db.adminSessions[uniqueOrderId];
                const targetUid = orderInfo.targetUserId;
                const currentBal = db.balances[targetUid] || 0;
                const lang = getUserLang(targetUid);

                if (!db.orderHistories[targetUid]) db.orderHistories[targetUid] = [];
                const now = new Date();
                db.orderHistories[targetUid].push({
                    timestamp: now.getTime(),
                    date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                    time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                    product: orderInfo.product, uid: orderInfo.uid, nickname: orderInfo.nickname, region: orderInfo.region, price: orderInfo.price
                });
                if (db.orderHistories[targetUid].length > 10) db.orderHistories[targetUid].shift();
                saveDatabase(db);

                const successReceipt = `💠 ════════════════════════════ 💠\n           ✅ অর্ডার সফলভাবে সম্পন্ন\n💠 ════════════════════════════ 💠\n\n📦 প্যাকেজ: \`${orderInfo.product}\`\n\n🆔 অর্ডার আইডি: \`MAN-${Math.floor(10000 + Math.random() * 90000)}\`\n\n👤 নাম: \`${orderInfo.nickname}\`\n🛡 ইউআইডি: \`${orderInfo.uid}\`\n🌐 সার্ভার: \`${orderInfo.region}\`\n📊 স্ট্যাটাস: \`অ্যাডমিন কর্তৃক সম্পন্ন\`\n\n📝 অ্যাডমিন নোট: \`${text}\`\n\n🪶 কাটা হয়েছে: \`${orderInfo.price} টাকা\`\n💰 বর্তমান ব্যালেন্স: \`${currentBal} টাকা\`\n\n💠 ════════════════════════════ 💠\nSIR TOPUP এর সাথেই থাকুন 💙`;

                await bot.telegram.editMessageText(targetUid, orderInfo.loadingMessageId, null, successReceipt, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(lang === 'en' ? '🔙 Main Menu 🏠' : '🔙 মূল মেনু 🏠', 'back_start_inline')]])
                }).catch(() => {});

                await bot.telegram.sendMessage(ADMIN_ID, "📋 **[ডুপ্লিকেট কপি]**\n\n" + successReceipt + "\n\n👤 **Customer ID:** `" + targetUid + "`", { parse_mode: 'Markdown' }).catch(() => {});
                await ctx.reply('✅ রিসিট পাঠানো হয়েছে!');
                delete db.adminInputSession[userId];
                delete db.adminSessions[uniqueOrderId];
                saveDatabase(db);
                return;
            }

            const actionType = sessionData.type;
            if (actionType === 'add_product') {
                const parts = text.split('|');
                const cat = parts[0] ? parts[0].trim() : 'Free Fire Likes';
                const prodName = parts[1] ? parts[1].trim() : text;
                if (!db.customProducts[cat]) db.customProducts[cat] = [];
                db.customProducts[cat].push({ name: prodName });
                saveDatabase(db);
                delete db.adminInputSession[userId];
                return ctx.reply('✅ প্রোডাক্ট অ্যাড করা হয়েছে!');
            }
            if (actionType === 'remove_product') {
                for (let cat in db.customProducts) {
                    db.customProducts[cat] = db.customProducts[cat].filter(p => p.name.toLowerCase() !== text.toLowerCase());
                }
                saveDatabase(db);
                delete db.adminInputSession[userId];
                return ctx.reply('✅ প্রোডাক্ট রিমুভ করা হয়েছে!');
            }
            if (actionType === 'add_minus_balance') {
                const parts = text.split(' ');
                const targetUser = parts[0], amount = Number(parts[1]);
                if (targetUser && !isNaN(amount)) {
                    db.balances[targetUser] = (db.balances[targetUser] || 0) + amount;
                    saveDatabase(db);
                    delete db.adminInputSession[userId];
                    return ctx.reply(`✅ ব্যালেন্স আপডেট হয়েছে! নতুন ব্যালেন্স: ৳${db.balances[targetUser]}`);
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ সঠিক ফরম্যাট: `USER_ID AMOUNT`');
            }
            if (actionType === 'set_bkash_number') {
                db.numbers.bkash = text;
                saveDatabase(db);
                delete db.adminInputSession[userId];
                return ctx.reply('✅ বিকাশ নাম্বার সফলভাবে আপডেট করা হয়েছে!');
            }
            if (actionType === 'set_nagad_number') {
                db.numbers.nagad = text;
                saveDatabase(db);
                delete db.adminInputSession[userId];
                return ctx.reply('✅ নগদ নাম্বার সফলভাবে আপডেট করা হয়েছে!');
            }
            if (actionType === 'send_message') {
                const parts = text.split('|');
                if (parts[0] && parts[1]) {
                    await bot.telegram.sendMessage(parts[0].trim(), parts[1].trim()).catch(() => {});
                    delete db.adminInputSession[userId];
                    return ctx.reply('✅ মেসেজ পাঠানো হয়েছে!');
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ সঠিক ফরম্যাট: `USER_ID | MESSAGE`');
            }
            if (actionType === 'broadcast_msg') {
                for (let uId of Object.keys(db.users || {})) {
                    await bot.telegram.sendMessage(uId, text).catch(() => {});
                }
                delete db.adminInputSession[userId];
                saveDatabase(db);
                return ctx.reply('✅ ব্রডকাস্ট সফল!');
            }
        }

        if (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_deposit_proof') {
            const method = db.sessions[userId].method;
            const uniqueDepId = userId + '_' + Date.now();
            if (!db.depositRequests) db.depositRequests = {};
            db.depositRequests[uniqueDepId] = { userId: userId, method: method, proof: text };
            saveDatabase(db);

            await bot.telegram.sendMessage(ADMIN_ID, `💰 **নতুন ডিপোজিট রিকোয়েস্ট**\n\n🆔 ID: \`${userId}\`\n💳 Method: \`${method}\`\n📝 TrxID: \`${text}\``, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Approve (+100 BDT)', 'dep_app_' + uniqueDepId)],
                    [Markup.button.callback('❌ Cancel Request', 'dep_can_' + uniqueDepId)]
                ])
            }).catch(() => {});

            delete db.sessions[userId];
            saveDatabase(db);
            return ctx.reply(t(userId, 'proofSubmittedStatus') + method + "\n\n✨ আপনার ডিপোজিট রিকোয়েস্টটি অ্যাডমিনের কাছে পাঠানো হয়েছে।", {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });
        }

        if (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_uid_only') {
            const waitMsg = await ctx.reply('⏳ ইউআইডি চেক করা হচ্ছে...');
            const nickname = await checkFreeFireUID(text);
            try { await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch (e) {}
            delete db.sessions[userId];
            saveDatabase(db);
            return ctx.reply(`🎉 **অ্যাকাউন্ট পাওয়া গেছে**\n\n👤 নাম: \`${nickname}\`\n🛡 ইউআইডি: \`${text}\``, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });
        }

        if (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_uid') {
            db.sessions[userId].uid = text;
            db.sessions[userId].step = 'confirming';
            saveDatabase(db);
            const session = db.sessions[userId];
            const waitMsg = await ctx.reply('⏳ প্লেয়ারের নাম চেক করা হচ্ছে...');
            session.nickname = await checkFreeFireUID(text);
            saveDatabase(db);
            try { await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch (e) {}

            return ctx.reply(`📦 **অর্ডার রিভিউ**\n\n🛍️ প্যাকেজ: \`${session.product}\`\n💵 মূল্য: \`${session.price} টাকা\``, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order')],
                    [Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]
                ])
            });
        }

        if (text === '📊 Total Users') {
            if (userId === ADMIN_ID.toString()) return ctx.reply(`📊 **মোট ইউজার:** \`${Object.keys(db.users || {}).length}\``, { parse_mode: 'Markdown' });
        }
        if (text === '➕ Add Bot') {
            if (userId === ADMIN_ID.toString()) return ctx.reply('✨ নতুন বট অ্যাড করার নির্দেশিকা।');
        }
        if (text === '❌ Remove Bot') {
            if (userId === ADMIN_ID.toString()) return ctx.reply('⚠️ রিমুভ করার জন্য বট টোকেন দিন।');
        }
        if (text === '➕ Add Product') {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'add_product' };
                saveDatabase(db);
                return ctx.reply('✍️ ক্যাটাগরি ও নাম দিন:\n`Category Name | Product Name - Price BDT`', { parse_mode: 'Markdown' });
            }
        }
        if (text === '❌ Remove Product') {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'remove_product' };
                saveDatabase(db);
                return ctx.reply('✍️ রিমুভ করার জন্য প্রোডাক্টের নাম লিখে পাঠান:');
            }
        }
        if (text === '💳 Add/Minus Balance') {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'add_minus_balance' };
                saveDatabase(db);
                return ctx.reply('✍️ ফরম্যাট: `USER_ID AMOUNT` (যেমন: `5932254012 100`)', { parse_mode: 'Markdown' });
            }
        }
        if (text === '📱 Set Payment Numbers') {
            if (userId === ADMIN_ID.toString()) {
                return ctx.reply('📱 **পেমেন্ট নাম্বার ম্যানেজমেন্ট**\n\n👇 আপনি কোন নাম্বারটি পরিবর্তন করতে চান সিলেক্ট করুন:', {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💖 বিকাশ নাম্বার সেট করুন', 'admin_set_bkash')],
                        [Markup.button.callback('🧡 নগদ নাম্বার সেট করুন', 'admin_set_nagad')]
                    ])
                });
            }
        }
        if (text === '📩 Send Message') {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'send_message' };
                saveDatabase(db);
                return ctx.reply('✍️ ফরম্যাট: `USER_ID | আপনার মেসেজ`', { parse_mode: 'Markdown' });
            }
        }
        if (text === '📢 All Users Msg') {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'broadcast_msg' };
                saveDatabase(db);
                return ctx.reply('📢 সকল ইউজারের কাছে পাঠানোর মেসেজটি লিখুন:');
            }
        }
        if (text.includes('Auto API: ON') || text.includes('Auto API: OFF')) {
            if (userId === ADMIN_ID.toString()) {
                db.settings.autoApiEnabled = !db.settings.autoApiEnabled;
                saveDatabase(db);
                return ctx.reply(`🟢 Auto API status: ${db.settings.autoApiEnabled}`, { ...getMainKeyboard(userId) });
            }
        }

        if (text === '🧮 Calculator' || text === '🧮 ক্যালকুলেটর') {
            db.calcStates[userId] = '0';
            saveDatabase(db);
            return ctx.reply("🧮 **ক্যালকুলেটর**\n\nScreen: `0`", { parse_mode: 'Markdown', ...getCalcKeyboard() });
        }

        if (text === '🌍 World Clock' || text === '🌍 ওয়ার্ল্ড ক্লক') {
            return ctx.reply("🌍 **ওয়ার্ল্ড ক্লক ও তারিখ**\n\n👇 দেশ সিলেক্ট করুন:", {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🇧🇩 Bangladesh', 'clock_bd'), Markup.button.callback('🇳🇵 Nepal', 'clock_np')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '🛍️ Shop Now' || text === '🛍️ শপ নাও') {
            let inlineButtons = [[Markup.button.callback(t(userId, 'buyLikes'), 'cat_ff_likes')]];
            for (let c of Object.keys(db.categories || {})) {
                inlineButtons.push([Markup.button.callback(translateCategoryName(c, userId), 'custom_cat_' + c)]);
            }
            inlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
            return ctx.reply(t(userId, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
        }

        if (text === '🔍 Check FF UID' || text === '🔍 ইউআইডি চেক') {
            db.sessions[userId] = { step: 'awaiting_uid_only' };
            saveDatabase(db);
            return ctx.reply(t(userId, 'checkUidPrompt'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (text === '💰 Add Balance' || text === '💰 ব্যালেন্স অ্যাড') {
            return ctx.reply(t(userId, 'depositPortal'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '👤 My Profile' || text === '👤 আমার প্রোফাইল') {
            return ctx.reply(`👤 **USER PROFILE**\n\n🆔 ID: \`${userId}\`\n💰 Balance: \`৳${db.balances[userId] || 0}\``, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '📜 Order History' || text === '📜 অর্ডার হিস্ট্রি') {
            const userHistories = db.orderHistories && db.orderHistories[userId] ? db.orderHistories[userId] : [];
            let historyText = t(userId, 'historyTitle');
            if (userHistories.length === 0) { historyText += t(userId, 'noHistory'); }
            else {
                userHistories.forEach((h, i) => {
                    historyText += `${i + 1}. 📦 **${translateProductName(h.product, userId)}**\n   🛡 UID: \`${h.uid}\` | 💵 \`${h.price}\`\n───────────────────\n`;
                });
            }
            return ctx.reply(historyText + t(userId, 'historyDisclaimer'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (text === '📞 Support Desk' || text === '📞 সাপোর্ট ডেস্ক') {
            return ctx.reply(t(userId, 'supportText'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (userId !== ADMIN_ID.toString()) {
            const box = `📥 **নতুন কাস্টমার মেসেজ**\n\n👤 Name: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n\n💬 Message:\n${text}`;
            try {
                if (ctx.message.photo) {
                    await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: box, parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]]) });
                } else {
                    await bot.telegram.sendMessage(ADMIN_ID, box, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]]) });
                }
            } catch (e) {}
            return ctx.reply(t(userId, 'supportSentSuccess'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }
    } catch (err) {}
});

bot.action('admin_set_bkash', async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'set_bkash_number' };
        saveDatabase(db);
        await ctx.editMessageText('✍️ নতুন বিকাশ পার্সোনাল বা মার্চেন্ট নাম্বার লিখে পাঠান:', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action('admin_set_nagad', async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'set_nagad_number' };
        saveDatabase(db);
        await ctx.editMessageText('✍️ নতুন নগদ পার্সোনাল বা মার্চেন্ট নাম্বার লিখে পাঠান:', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action('dep_bkash', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        db.sessions[userId] = { step: 'awaiting_deposit_proof', method: 'bKash' };
        saveDatabase(db);
        const bkashNum = db.numbers?.bkash || '01XXXXXXXXX (Personal)';
        await ctx.editMessageText(`💖 **বিকাশ পেমেন্ট**\n\n📌 আমাদের বিকাশ নাম্বার:\n\`${bkashNum}\`\n\n` + t(userId, 'uploadProofTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]]) });
    } catch (e) {}
});

bot.action('dep_nagad', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        db.sessions[userId] = { step: 'awaiting_deposit_proof', method: 'Nagad' };
        saveDatabase(db);
        const nagadNum = db.numbers?.nagad || '01XXXXXXXXX (Personal)';
        await ctx.editMessageText(`🧡 **নগদ পেমেন্ট**\n\n📌 আমাদের নগদ নাম্বার:\n\`${nagadNum}\`\n\n` + t(userId, 'uploadProofTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]]) });
    } catch (e) {}
});

bot.action(/dep_app_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase(), info = db.depositRequests?.[ctx.match[1]];
        if (info) {
            db.balances[info.userId] = (db.balances[info.userId] || 0) + 100;
            saveDatabase(db);
            await bot.telegram.sendMessage(info.userId, `💎 **ব্যালেন্স রিচার্জ সফল**\n\nঅ্যাকাউন্টে যোগ হয়েছে: \`৳১০০\``, { parse_mode: 'Markdown' }).catch(() => {});
            delete db.depositRequests[ctx.match[1]];
            saveDatabase(db);
            await ctx.answerCbQuery('✅ ডিপোজিট অ্যাপ্রুভ হয়েছে!');
            try { await ctx.editMessageText('✅ **[DEPOSIT APPROVED]**'); } catch (e) {}
        }
    } catch (e) {}
});

bot.action(/dep_can_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase(), info = db.depositRequests?.[ctx.match[1]];
        if (info) {
            await bot.telegram.sendMessage(info.userId, t(info.userId, 'depositCancelledBox'), { parse_mode: 'Markdown' }).catch(() => {});
            delete db.depositRequests[ctx.match[1]];
            saveDatabase(db);
            await ctx.answerCbQuery('❌ বাতিল করা হয়েছে।');
            try { await ctx.editMessageText('❌ **[DEPOSIT REJECTED]**'); } catch (e) {}
        }
    } catch (e) {}
});

bot.action(/admin_reply_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminReplySessions[ADMIN_ID] = ctx.match[1];
        saveDatabase(db);
        await ctx.reply('✍️ কাস্টমারকে পাঠানোর জন্য রিপ্লাই লিখুন:');
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action(/admin_input_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { uniqueOrderId: ctx.match[1] };
        saveDatabase(db);
        await ctx.reply('✍️ অর্ডার নোট বা রিসিট লিখে পাঠান:');
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action(/admin_can_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase(), info = db.adminSessions?.[ctx.match[1]];
        if (info) {
            db.balances[info.targetUserId] = (db.balances[info.targetUserId] || 0) + Number(info.price);
            saveDatabase(db);
            await bot.telegram.editMessageText(info.targetUserId, info.loadingMessageId, null, "❌ **অর্ডার ক্যানসেলড ও টাকা রিফান্ড হয়েছে**", { parse_mode: 'Markdown' }).catch(() => {});
            delete db.adminSessions[ctx.match[1]];
            saveDatabase(db);
            await ctx.answerCbQuery('✅ ক্যানসেল ও রিফান্ড সফল!');
            try { await ctx.editMessageText('❌ **[CANCELLED & REFUNDED]**'); } catch (e) {}
        }
    } catch (e) {}
});

bot.action(/calc_(.+)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString(), val = ctx.match[1].trim();
        const db = loadDatabase();
        let current = db.calcStates[userId] || '0';
        if (val === 'C') current = '0';
        else if (val === 'DEL') current = current.length > 1 ? current.slice(0, -1) : '0';
        else if (val === 'EQ') { try { current = String(eval(current.replace(/[^0-9+\-*/().]/g, ''))); } catch (e) { current = 'Error'; } }
        else { current = (current === '0' || current === 'Error') ? val : current + val; }
        db.calcStates[userId] = current;
        saveDatabase(db);
        await ctx.editMessageText(`🧮 **ক্যালকুলেটর**\n\nScreen: \`${current}\``, { parse_mode: 'Markdown', ...getCalcKeyboard() });
    } catch (e) {}
});

bot.action(/clock_(bd|np)/, async (ctx) => {
    try {
        const tzMap = { bd: 'Asia/Dhaka', np: 'Asia/Kathmandu' };
        const now = new Date();
        await ctx.editMessageText(`🌍 **ওয়ার্ল্ড ক্লক**\n🕒 সময়: \`${now.toLocaleTimeString('en-US', { timeZone: tzMap[ctx.match[1]] })}\``, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 ব্যাক', 'back_to_clock'), Markup.button.callback(t(ctx.from.id.toString(), 'mainMenuBack'), 'back_start_inline')]])
        });
    } catch (e) {}
});

bot.action('back_to_clock', async (ctx) => {
    try {
        await ctx.editMessageText("🌍 **ওয়ার্ল্ড ক্লক ও তারিখ**\n\n👇 দেশ সিলেক্ট করুন:", {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 Bangladesh', 'clock_bd'), Markup.button.callback('🇳🇵 Nepal', 'clock_np')],
                [Markup.button.callback(t(ctx.from.id.toString(), 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

bot.action('shop_now_back', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        let inlineButtons = [[Markup.button.callback(t(userId, 'buyLikes'), 'cat_ff_likes')]];
        for (let c of Object.keys(db.categories || {})) {
            inlineButtons.push([Markup.button.callback(translateCategoryName(c, userId), 'custom_cat_' + c)]);
        }
        inlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
        await ctx.editMessageText(t(userId, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

bot.action('cat_ff_likes', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        let inlineButtons = [];
        (db.customProducts?.['Free Fire Likes'] || []).forEach((p, idx) => {
            inlineButtons.push([Markup.button.callback(translateProductName(p.name, userId), 'sub_prod_Free Fire Likes_' + idx)]);
        });
        inlineButtons.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]);
        await ctx.editMessageText("🔥 **প্যাকেজ সিলেক্ট করুন:**", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

bot.action(/custom_cat_(.+)/, async (ctx) => {
    try {
        const catName = ctx.match[1], userId = ctx.from.id.toString();
        const db = loadDatabase();
        let inlineButtons = [];
        (db.customProducts?.[catName] || []).forEach((p, idx) => {
            inlineButtons.push([Markup.button.callback(translateProductName(p.name, userId), 'sub_prod_' + catName + '_' + idx)]);
        });
        inlineButtons.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]);
        await ctx.editMessageText(`📂 **${translateCategoryName(catName, userId)}**`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

bot.action(/sub_prod_(.+)_(.+)/, async (ctx) => {
    try {
        const catName = ctx.match[1], index = parseInt(ctx.match[2]), userId = ctx.from.id.toString();
        const db = loadDatabase();
        const prod = db.customProducts[catName]?.[index] || { name: 'Package' };
        const translated = translateProductName(prod.name, userId);
        const price = Number((prod.name.match(/\d+/) || [0])[0]);
        db.sessions[userId] = { product: translated, price, activeCategory: catName };
        saveDatabase(db);
        await ctx.editMessageText(t(userId, 'serverTitle') + `\`${translated}\`\n\n👇 রিজিওন সিলেক্ট করুন:`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 BD', 'region_bd'), Markup.button.callback('🇮🇩 ID', 'region_id')],
                [Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]
            ])
        });
    } catch (e) {}
});

bot.action(/region_(bd|id)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString(), region = ctx.match[1].toUpperCase();
        const db = loadDatabase();
        if (db.sessions?.[userId]) { db.sessions[userId].region = region; db.sessions[userId].step = 'awaiting_uid'; saveDatabase(db); }
        await ctx.editMessageText(`🎮 **ইউআইডি পাঠান (${region})**`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]]) });
    } catch (e) {}
});

bot.action('confirm_order', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        const session = db.sessions?.[userId];
        if (!session) return ctx.answerCbQuery('Session expired.', { show_alert: true });
        if ((db.balances[userId] || 0) < session.price) return ctx.answerCbQuery('❌ পর্যাপ্ত ব্যালেন্স নেই!', { show_auth: true });

        db.balances[userId] -= Number(session.price);
        saveDatabase(db);

        const procMsg = await ctx.editMessageText("⏳ প্রসেসিং হচ্ছে...", { parse_mode: 'Markdown' });
        const apiRes = await callLikesFFApiWithTimeout({ action: 'like', uid: session.uid, server: session.region }, 30000);

        if (apiRes.success) {
            const receipt = `✅ **অর্ডার সম্পন্ন**\n📦 ${session.product}\n💰 Price: ${session.price} BDT`;
            await ctx.telegram.editMessageText(userId, procMsg.message_id, null, receipt, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        } else {
            const uniqueOrderId = userId + '_' + Date.now();
            db.adminSessions[uniqueOrderId] = { targetUserId: userId, loadingMessageId: procMsg.message_id, product: session.product, uid: session.uid, region: session.region, price: session.price };
            saveDatabase(db);

            await bot.telegram.sendMessage(ADMIN_ID, `⚠️ **API Fallback Order**\n📦 ${session.product}\n🆔 UID: \`${session.uid}\``, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Enter Details', 'admin_input_' + uniqueOrderId)],
                    [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
                ])
            });
            await ctx.telegram.editMessageText(userId, procMsg.message_id, null, "⏳ এপিআই ব্যস্ত থাকায় অর্ডারটি অ্যাডমিনের কাছে পাঠানো হয়েছে।", { parse_mode: 'Markdown' });
        }
        delete db.sessions[userId];
        saveDatabase(db);
    } catch (e) {}
});

bot.action('back_start_inline', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (db.sessions?.[userId]) delete db.sessions[userId];
        saveDatabase(db);
        await ctx.editMessageText("✨ মূল মেনুতে ফিরে এসেছেন:", { parse_mode: 'Markdown' }).catch(() => {});
    } catch (e) {}
});

const webhookPath = `/secret-path-${BOT_TOKEN.split(':')[0]}`;
bot.telegram.setWebhook(`${RENDER_URL}${webhookPath}`, { drop_pending_updates: true }).catch(() => {});

http.createServer((req, res) => {
    if (req.url === webhookPath && req.method === 'POST') bot.webhookCallback(webhookPath)(req, res);
    else if (req.url === '/ping') { res.writeHead(200); res.end('OK'); }
    else { res.writeHead(200); res.end('Running'); }
}).listen(PORT);
