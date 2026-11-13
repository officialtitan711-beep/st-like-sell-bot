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

let cachedDb = { 
    users: {}, 
    balances: {}, 
    sessions: {}, 
    numbers: { bkash: '01XXXXXXXXX', nagad: '01XXXXXXXXX' }, 
    categories: { 'Free Fire Likes': true, 'Guild Glory Bot': true }, 
    customProducts: { 
        'Free Fire Likes': [
            { name: '1000 Likes - 50 BDT' },
            { name: '5000 Likes - 220 BDT' },
            { name: '10000 Likes - 400 BDT' }
        ],
        'Guild Glory Bot': [
            { name: 'Squad Bot 3 Days - 120 BDT' }
        ]
    }, 
    allowedUsers: {}, 
    pendingMsgs: {}, 
    orderHistories: {}, 
    historyTimestamps: {}, 
    lastCleanMonth: '', 
    userLang: {}, 
    depositRequests: {}, 
    adminReplySessions: {}, 
    adminInputSession: {}, 
    adminSessions: {}, 
    calcStates: {}, 
    settings: { autoApiEnabled: true } 
};

function loadDatabase() { 
    if (!cachedDb) cachedDb = {};
    if (!cachedDb.categories) cachedDb.categories = {};
    if (!cachedDb.customProducts) cachedDb.customProducts = {};
    
    if (Object.keys(cachedDb.categories).length === 0) {
        cachedDb.categories = { 'Free Fire Likes': true, 'Guild Glory Bot': true };
    }
    if (Object.keys(cachedDb.customProducts).length === 0) {
        cachedDb.customProducts = {
            'Free Fire Likes': [
                { name: '1000 Likes - 50 BDT' },
                { name: '5000 Likes - 220 BDT' },
                { name: '10000 Likes - 400 BDT' }
            ],
            'Guild Glory Bot': [
                { name: 'Squad Bot 3 Days - 120 BDT' }
            ]
        };
    }
    return cachedDb; 
}

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
                        cachedDb.users = parsed.users || cachedDb.users;
                        cachedDb.balances = parsed.balances || cachedDb.balances;
                        cachedDb.sessions = parsed.sessions || cachedDb.sessions;
                        cachedDb.numbers = parsed.numbers || cachedDb.numbers;
                        
                        if (parsed.categories && Object.keys(parsed.categories).length > 0) {
                            cachedDb.categories = parsed.categories;
                        }
                        if (parsed.customProducts && Object.keys(parsed.customProducts).length > 0) {
                            cachedDb.customProducts = parsed.customProducts;
                        }

                        cachedDb.allowedUsers = parsed.allowedUsers || cachedDb.allowedUsers;
                        cachedDb.orderHistories = parsed.orderHistories || cachedDb.orderHistories;
                        cachedDb.userLang = parsed.userLang || cachedDb.userLang;
                        cachedDb.depositRequests = parsed.depositRequests || cachedDb.depositRequests;
                        cachedDb.settings = parsed.settings || cachedDb.settings;
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
    return db.userLang[userId] || 'en';
}

function t(userId, key) {
    const lang = getUserLang(userId);
    const dict = {
        bn: {
            welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ স্বাগতম! আমাদের প্রিমিয়াম গেমিং সার্ভিসে আপনাকে স্বাগতম। নিচে থেকে আপনার পছন্দের সার্ভিসটি বেছে নিনঃ 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            shopMenuTitle: "🛍️ **সকল উপলব্ধ সার্ভিস**\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:",
            checkUidPrompt: "🎮 **ফ্রি ফায়ার ইউআইডি চেকার**\n\n✍️ ইউআইডি লিখে পাঠান:",
            depositPortal: "»»------------- ★ 💰 ডিপোজিট পোর্টাল ★ -------------««\n\n💎 টাকা পাঠানোর জন্য যেকোনো মাধ্যম সিলেক্ট করুন:\n\n»»-------------------------------------------------««",
            supportText: "📞 **সাপোর্ট ডেস্ক**\n\n💡 আপনার যেকোনো সমস্যা, TrxID বা স্ক্রিনশট সরাসরি এই চ্যাটেই পাঠিয়ে দিন। অ্যাডমিন খুব দ্রুত রিপ্লাই দেবেন।",
            mainMenuBack: "🔙 মূল মেনু 🏠",
            backBtn: "🔙 পেছনের মেনু ↩️",
            buyLikes: "🔥 ফ্রি ফায়ার লাইক কিনুন ⚡",
            serverTitle: "🌍 **সার্ভার নির্বাচন**\n\nপ্যাকেজ: ",
            confirmOrderBtn: "✅ অর্ডার কনফার্ম করুন 🚀",
            cancelBtn: "❌ বাতিল করুন",
            supportSentSuccess: "✨ আপনার মেসেজ বা স্ক্রিনশট সরাসরি অ্যাডমিনের কাছে পৌঁছে গেছে! দয়া করে অপেক্ষা করুন।",
            historyTitle: "📜 **শেষ ১০টি অর্ডারের ইতিহাস**\n\n",
            historyDisclaimer: "\n⚠️ *নোট: সুরক্ষার জন্য এখানে শুধুমাত্র আপনার সর্বশেষ ১০টি অর্ডার দেখানো হয়।*",
            noHistory: "❌ এখনো কোনো অর্ডার সম্পন্ন হয়নি!\n\n"
        },
        en: {
            welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ Welcome to our premium gaming service. Choose your preferred service below: 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            shopMenuTitle: "🛍️ **ALL AVAILABLE SHOP**\n\n👇 Please select the buttons below:",
            checkUidPrompt: "🎮 **FREE FIRE UID CHECKER**\n\n✍️ Send UID:",
            depositPortal: "»»------------- ★ 💰 DEPOSIT PORTAL ★ -------------««\n\n💎 Choose any payment method below:\n\n»»-------------------------------------------------««",
            supportText: "📞 **SUPPORT DESK**\n\n💡 Send any issue, TrxID or screenshot directly in this chat. Admin will reply soon.",
            mainMenuBack: "🔙 Main Menu 🏠",
            backBtn: "🔙 Back ↩️",
            buyLikes: "🔥 Buy Free Fire Likes ⚡",
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
    
    const keywords = [
        'total users', 'add bot', 'remove bot', 'add/minus balance', 
        'set payment numbers', 'send message', 'all users msg', '-----------------------------------',
        'auto api: on', 'auto api: off'
    ];
    
    return keywords.some(k => lowerText.includes(k));
}

function translateCategoryName(catName, userId) {
    const lang = getUserLang(userId);
    const map = { 
        'Guild Glory Bot': lang === 'bn' ? '🛡️ গিল্ড গ্লোরি বট' : 'Guild Glory Bot', 
        'Free Fire Likes': lang === 'bn' ? '🔥 ফ্রি ফায়ার লাইকস' : 'Free Fire Likes' 
    };
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
                    let level = parsed.level || parsed.AccountLevel || parsed.lvl || '';
                    let likes = parsed.likes || parsed.AccountLikes || parsed.Like || parsed.like || 0;
                    resolve({ 
                        nickname: (nickname && nickname.trim() !== '') ? nickname : 'Unknown Player', 
                        level: level ? String(level) : '',
                        likes: Number(likes) || 0
                    });
                } catch (err) { resolve({ nickname: 'Unknown Player', level: '', likes: 0 }); }
            });
        }).on('error', () => { resolve({ nickname: 'Unknown Player', level: '', likes: 0 }); });
    });
}

// --- BOT USE MIDDLEWARE ---
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
            
            if (ctx.message && ctx.message.text) {
                const msgText = ctx.message.text;
                if (msgText.startsWith('/start') || isMenuCommand(msgText)) {
                    return next();
                }
            }

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
        if (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
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
        [Markup.button.callback('0', 'calc_0'), Markup.button.callback('.', 'calc_.'), Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
    ]);
}

bot.on('message', async (ctx) => {
    try {
        if (!ctx.message) return;
        const userId = ctx.from.id.toString();
        const text = ctx.message.text ? ctx.message.text.trim() : (ctx.message.caption ? ctx.message.caption.trim() : '');
        const lowerText = text.toLowerCase();
        const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2B50}\u{2728}\u{1F4F1}\u{1F4B0}\u{1F464}\u{1F4DC}\u{1F4DE}\u{1F9EE}\u{1F30D}\u{1F4CA}\u{2795}\u{274C}\u{1F4B3}\u{1F4E9}\u{1F4E2}\u{1F4F7}\u{1F50D}\u{1F3AE}\u{1F4C1}\u{1F4CC}\u{2328}\u{1F310}\s]/gu, '').trim().toLowerCase();

        const db = loadDatabase();
        if (!db.balances) db.balances = {};
        if (!db.sessions) db.sessions = {};
        if (!db.numbers) db.numbers = { bkash: '01XXXXXXXXX', nagad: '01XXXXXXXXX' };
        if (!db.categories) db.categories = {};
        if (!db.customProducts) db.customProducts = {};
        if (!db.users) db.users = {};
        if (!db.allowedUsers) db.allowedUsers = {};
        if (!db.orderHistories) db.orderHistories = {};
        if (!db.depositRequests) db.depositRequests = {};
        if (!db.adminInputSession) db.adminInputSession = {};
        if (!db.adminSessions) db.adminSessions = {};
        if (!db.calcStates) db.calcStates = {};
        if (!db.userLang) db.userLang = {};

        if (isMenuCommand(text)) {
            if (db.sessions && db.sessions[userId]) {
                delete db.sessions[userId];
                saveDatabase(db);
            }
            if (userId === ADMIN_ID.toString() && db.adminInputSession && db.adminInputSession[userId]) {
                delete db.adminInputSession[userId];
                saveDatabase(db);
            }
        }

        if (userId === ADMIN_ID.toString() && db.adminReplySessions && db.adminReplySessions[userId] && !isMenuCommand(text)) {
            const targetUser = db.adminReplySessions[userId];
            try {
                await bot.telegram.sendMessage(targetUser, "💬 **Admin Reply:**\n\n" + text, { parse_mode: 'Markdown' });
                await ctx.reply('✅ Reply sent successfully!');
            } catch (err) { await ctx.reply('❌ Failed to send.'); }
            delete db.adminReplySessions[userId];
            saveDatabase(db);
            return;
        }

        if (userId === ADMIN_ID.toString() && db.adminInputSession && db.adminInputSession[userId] && !isMenuCommand(text)) {
            const sessionData = db.adminInputSession[userId];

            if (sessionData.type === 'add_bot_user') {
                const targetUid = text.replace(/[^0-9]/g, '');
                if (targetUid) {
                    db.allowedUsers[targetUid] = true;
                    saveDatabase(db);
                    delete db.adminInputSession[userId];
                    try {
                        await bot.telegram.sendMessage(targetUid, "🎉 অভিনন্দন! অ্যাডমিন আপনার বট এক্সেস অনুমোদন করেছেন। এখন থেকে আপনি বট ব্যবহার করতে পারবেন। /start লিখে শুরু করুন।", { parse_mode: 'Markdown' });
                    } catch (e) {}
                    return ctx.reply(`✅ সফলভাবে ইউজার আইডি \`${targetUid}\`-কে বট ব্যবহারের এক্সেস দেওয়া হয়েছে!`, { parse_mode: 'Markdown' });
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ সঠিক ইউজার আইডি দিন।');
            }

            if (sessionData.type === 'remove_bot_user') {
                const targetUid = text.replace(/[^0-9]/g, '');
                if (targetUid) {
                    if (db.allowedUsers[targetUid]) {
                        delete db.allowedUsers[targetUid];
                    }
                    saveDatabase(db);
                    delete db.adminInputSession[userId];
                    try {
                        await bot.telegram.sendMessage(targetUid, "⚠️ দুঃখিত! অ্যাডমিন আপনার বট এক্সেস রিমুভ করে দিয়েছেন।", { parse_mode: 'Markdown' });
                    } catch (e) {}
                    return ctx.reply(`❌ সফলভাবে ইউজার আইডি \`${targetUid}\`-এর এক্সেস রিমুভ করা হয়েছে!`, { parse_mode: 'Markdown' });
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ সঠিক ইউজার আইডি দিন।');
            }

            if (sessionData.uniqueOrderId && db.adminSessions[sessionData.uniqueOrderId]) {
                const uniqueOrderId = sessionData.uniqueOrderId;
                const orderInfo = db.adminSessions[uniqueOrderId];
                const targetUid = orderInfo.targetUserId;
                const currentBal = db.balances[targetUid] || 0;

                if (!db.orderHistories[targetUid]) db.orderHistories[targetUid] = [];
                const orderNow = new Date();
                db.orderHistories[targetUid].unshift({
                    timestamp: orderNow.getTime(),
                    date: orderNow.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                    time: orderNow.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                    product: orderInfo.product, uid: orderInfo.uid, nickname: orderInfo.nickname || 'Unknown', region: orderInfo.region, price: orderInfo.price, status: 'Complete'
                });
                if (db.orderHistories[targetUid].length > 10) db.orderHistories[targetUid].pop();
                saveDatabase(db);

                const completedReceipt = `💠 ════════════════════════════ 💠\n           ✅ ORDER SUCCESSFULLY COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${orderInfo.product}\`\n🆔 Order ID: \`SRV-${Math.floor(10000 + Math.random() * 90000)}\`\n\n🛡️ Target ID: \`${orderInfo.uid}\`\n🌍 Server: \`${orderInfo.region}\`\n\n📊 Status: \`Completed by Admin\`\n📝 Note/Details: \`${text}\`\n\n💰 Price: \`${orderInfo.price} BDT\`\n💳 Remaining Balance: \`${currentBal} BDT\`\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

                await bot.telegram.editMessageText(targetUid, orderInfo.loadingMessageId, null, completedReceipt, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUid, 'mainMenuBack'), 'back_start_inline')]])
                }).catch(() => {});

                await bot.telegram.sendMessage(ADMIN_ID, "📋 **[Duplicate Copy - Completed Order]**\n\n" + completedReceipt + "\n\n👤 **Customer ID:** `" + targetUid + "`", { parse_mode: 'Markdown' }).catch(() => {});
                await ctx.reply('✅ Order successfully completed & receipt updated to customer!');
                delete db.adminInputSession[userId];
                delete db.adminSessions[uniqueOrderId];
                saveDatabase(db);
                return;
            }

            const actionType = sessionData.type;
            if (actionType === 'add_category') {
                const catName = text;
                if (catName) {
                    db.categories[catName] = true;
                    if (!db.customProducts[catName]) db.customProducts[catName] = [];
                    saveDatabase(db);
                    delete db.adminInputSession[userId];
                    return ctx.reply(`✅ Category "${catName}" created successfully! Now go to Shop Menu, enter this category and add products.`);
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ Invalid category name.');
            }
            if (actionType === 'add_shop_product') {
                const catName = sessionData.category;
                const parts = text.split('|');
                const prodName = parts[0] ? parts[0].trim() : text;
                const priceVal = parts[1] ? parts[1].trim() : '100';
                const formattedProd = `${prodName} - ${priceVal} BDT`;

                if (!db.customProducts[catName]) db.customProducts[catName] = [];
                db.customProducts[catName].push({ name: formattedProd });
                saveDatabase(db);
                delete db.adminInputSession[userId];
                return ctx.reply(`✅ Product added successfully to "${catName}"!`);
            }
            if (actionType === 'change_shop_price') {
                const catName = sessionData.category;
                const prodIndex = sessionData.prodIndex;
                const newPrice = text.replace(/[^0-9]/g, '');

                if (db.customProducts[catName] && db.customProducts[catName][prodIndex]) {
                    let oldName = db.customProducts[catName][prodIndex].name;
                    if (oldName.includes('-')) {
                        oldName = oldName.replace(/-\s*\d+.*$/, `- ${newPrice} BDT`);
                    } else {
                        oldName = `${oldName} - ${newPrice} BDT`;
                    }
                    db.customProducts[catName][prodIndex].name = oldName;
                    saveDatabase(db);
                    delete db.adminInputSession[userId];
                    return ctx.reply(`✅ Product price successfully updated to ${newPrice} BDT!`);
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ Product not found.');
            }
            if (actionType === 'add_minus_balance') {
                const parts = text.split(' ');
                const targetUser = parts[0], amount = Number(parts[1]);
                if (targetUser && !isNaN(amount)) {
                    db.balances[targetUser] = (db.balances[targetUser] || 0) + amount;
                    saveDatabase(db);
                    delete db.adminInputSession[userId];
                    return ctx.reply(`✅ Balance updated! New Balance: ৳${db.balances[targetUser]}`);
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ Correct format: `USER_ID AMOUNT`');
            }
            if (actionType === 'set_bkash_number') {
                db.numbers.bkash = text;
                saveDatabase(db);
                delete db.adminInputSession[userId];
                return ctx.reply('✅ bKash number updated successfully!');
            }
            if (actionType === 'set_nagad_number') {
                db.numbers.nagad = text;
                saveDatabase(db);
                delete db.adminInputSession[userId];
                return ctx.reply('✅ Nagad number updated successfully!');
            }
            if (actionType === 'send_message') {
                const parts = text.split('|');
                if (parts[0] && parts[1]) {
                    await bot.telegram.sendMessage(parts[0].trim(), parts[1].trim()).catch(() => {});
                    delete db.adminInputSession[userId];
                    return ctx.reply('✅ Message sent successfully!');
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ Correct format: `USER_ID | MESSAGE`');
            }
            if (actionType === 'broadcast_msg') {
                for (let uId of Object.keys(db.users || {})) {
                    await bot.telegram.sendMessage(uId, text).catch(() => {});
                }
                delete db.adminInputSession[userId];
                saveDatabase(db);
                return ctx.reply('✅ Broadcast completed successfully!');
            }
        }

        // --- Deposit Step 1: Awaiting Amount ---
        if (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_deposit_amount' && !isMenuCommand(text)) {
            const amountNum = Number(text);
            const lang = getUserLang(userId);

            if (isNaN(amountNum) || amountNum < 100) {
                const errBox = lang === 'bn'
                    ? "╔════════════════════════════╗\n⚠️ ১০০ টাকার নিচে অ্যামাউন্ট অ্যাড হবে না। সর্বনিম্ন ১০০ বা তার বেশি অ্যামাউন্ট অ্যাড ব্যালেন্স করতে হবে।\n╚════════════════════════════╝\n\n✍️ আপনার কাঙ্ক্ষিত অ্যামাউন্টটি আবার লিখে পাঠান:"
                    : "╔════════════════════════════╗\n⚠️ Amount below 100 BDT cannot be added. Minimum deposit is 100 BDT or more.\n╚════════════════════════════╝\n\n✍️ Please enter your amount again:";
                
                const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

                return ctx.reply(errBox, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback(cancelBtnText, 'deposit_portal_back')]
                    ])
                });
            }

            db.sessions[userId].depositAmount = amountNum;
            db.sessions[userId].step = 'awaiting_deposit_proof';
            saveDatabase(db);

            const method = db.sessions[userId].method;
            const targetNum = method === 'bKash' ? (db.numbers?.bkash || '01XXXXXXXXX') : (db.numbers?.nagad || '01XXXXXXXXX');

            let instructionBox = lang === 'bn'
                ? `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n     💖 ${method} সেন্ড মানি নিয়ম\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n📌 **অফিসিয়াল নম্বর:** \`${targetNum}\`\n*(নম্বরের উপর ট্যাপ করে কপি করে নিন)*\n\n💵 **টাকার পরিমাণ:** \`${amountNum} BDT\`\n\n📋 **${method} অ্যাপ থেকে পেমেন্ট করার নিয়ম:**\n1️⃣ ${method} অ্যাপে গিয়ে **Send Money** এ যান।\n2️⃣ উপরের অফিশিয়াল নম্বরটি দিন।\n3️⃣ অ্যামাউন্ট দিন: \`${amountNum} BDT\`\n4️⃣ পিন দিয়ে সেন্ড মানি কনফার্ম করুন।\n5️⃣ টাকা পাঠানোর পর আপনার **TrxID** অথবা পেমেন্টের **স্ক্রিনশট** এই চ্যাটে পাঠিয়ে দিন।\n\n✍️ দ্রুত TrxID অথবা স্ক্রিনশট চ্যাটে পাঠান:`
                : `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n     💖 ${method} Send Money Guide\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n📌 **Official Number:** \`${targetNum}\`\n*(Tap on the number to copy)*\n\n💵 **Amount to Send:** \`${amountNum} BDT\`\n\n📋 **Steps to Pay:**\n1️⃣ Open ${method} app and go to **Send Money**.\n2️⃣ Enter the official number above.\n3️⃣ Enter amount: \`${amountNum} BDT\`\n4️⃣ Confirm with your PIN.\n5️⃣ After sending, send your **TrxID** or payment **screenshot** in this chat.\n\n✍️ Send TrxID or screenshot here:`;

            const backText = lang === 'bn' ? "🔙 পেছনের মেনু ↩️" : "🔙 Back ↩️";
            return ctx.reply(instructionBox, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(backText, method === 'bKash' ? 'dep_bkash' : 'dep_nagad')]])
            });
        }

        // --- Deposit Step 2: Awaiting Proof ---
        if (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_deposit_proof' && !isMenuCommand(text)) {
            const method = db.sessions[userId].method;
            const amount = db.sessions[userId].depositAmount || 100;
            const uniqueDepId = userId + '_' + Date.now();
            const proofText = text || (ctx.message.photo ? '[Photo Screenshot Attached]' : 'N/A');

            if (!db.depositRequests) db.depositRequests = {};
            db.depositRequests[uniqueDepId] = { userId: userId, method: method, amount: amount, proof: proofText };
            saveDatabase(db);

            const adminDepBox = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   💰 NEW DEPOSIT REQUEST\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n🆔 **User ID:** \`${userId}\`\n💳 **Method:** \`${method}\`\n💵 **Amount:** \`${amount} BDT\`\n📝 **TrxID/Proof:** \`${proofText}\``;

            if (ctx.message.photo) {
                await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, {
                    caption: adminDepBox,
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback(`✅ Approve (+${amount} BDT)`, 'dep_app_' + uniqueDepId)],
                        [Markup.button.callback('❌ Cancel Request', 'dep_can_' + uniqueDepId)]
                    ])
                }).catch(() => {});
            } else {
                await bot.telegram.sendMessage(ADMIN_ID, adminDepBox, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback(`✅ Approve (+${amount} BDT)`, 'dep_app_' + uniqueDepId)],
                        [Markup.button.callback('❌ Cancel Request', 'dep_can_' + uniqueDepId)]
                    ])
                }).catch(() => {});
            }

            const lang = getUserLang(userId);
            const pendingBoxMsg = lang === 'bn'
                ? `╭──────────────────────────────╮\n     ⏳ অ্যাড মানি রিকোয়েস্ট পেন্ডিং\n╰──────────────────────────────╯\n\n💳 মাধ্যম: \`${method}\`\n💵 পেন্ডিং অ্যামাউন্ট: \`${amount} BDT\`\n\n✨ আপনার প্রমাণ সফলভাবে জমা হয়েছে। অ্যাডমিন যাচাই করে ব্যালেন্স অ্যাড করে দেবেন!`
                : `╭──────────────────────────────╮\n     ⏳ DEPOSIT REQUEST PENDING\n╰──────────────────────────────╯\n\n💳 Method: \`${method}\`\n💵 Pending Amount: \`${amount} BDT\`\n\n✨ Your proof has been submitted successfully!`;

            const userMsg = await ctx.reply(pendingBoxMsg, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });

            db.depositRequests[uniqueDepId].userMessageId = userMsg.message_id;
            delete db.sessions[userId];
            saveDatabase(db);
            return;
        }

        // --- Check FF UID Only ---
        if (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_uid_only' && !isMenuCommand(text)) {
            const uidText = text;
            const lang = getUserLang(userId);
            delete db.sessions[userId];
            saveDatabase(db);

            const loadingMsg = await ctx.reply(`⏳ Checking UID...\n\`▰▰▰▱▱▱▱▱▱▱ 30%\``, { parse_mode: 'Markdown' });
            await new Promise(r => setTimeout(r, 200));
            try { await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, `⏳ Checking UID...\n\`▰▰▰▰▰▰▱▱▱▱ 70%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            await new Promise(r => setTimeout(r, 200));
            try { await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, `⏳ Checking UID...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            await new Promise(r => setTimeout(r, 200));

            const resInfo = await checkFreeFireUID(uidText);
            const resultBox = lang === 'bn'
                ? `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   🎮 ফ্রি ফায়ার প্লেয়ার ইনফো\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n👤 নাম: \`${resInfo.nickname}\`\n🛡 ইউআইডি: \`${uidText}\``
                : `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   🎮 FREE FIRE PLAYER INFO\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n👤 Name: \`${resInfo.nickname}\`\n🛡 UID: \`${uidText}\``;

            try {
                await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, resultBox, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
                });
            } catch (e) {
                await ctx.reply(resultBox, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
            }
            return;
        }

        // --- Order Flow: Awaiting UID ---
        if (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_uid' && !isMenuCommand(text)) {
            const uidText = text;
            db.sessions[userId].uid = uidText;
            db.sessions[userId].step = 'confirming';
            saveDatabase(db);
            const session = db.sessions[userId];

            const isFFCategory = session.activeCategory === 'Free Fire Likes' || (session.product && session.product.toLowerCase().includes('like'));
            let nickname = 'N/A';
            let level = '';

            if (isFFCategory) {
                const loadingMsg = await ctx.reply(`⏳ Checking UID...\n\`▰▰▰▱▱▱▱▱▱▱ 30%\``, { parse_mode: 'Markdown' });
                await new Promise(r => setTimeout(r, 200));
                try { await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, `⏳ Checking UID...\n\`▰▰▰▰▰▰▱▱▱▱ 70%\``, { parse_mode: 'Markdown' }); } catch (e) {}
                await new Promise(r => setTimeout(r, 200));
                try { await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, `⏳ Checking UID...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
                await new Promise(r => setTimeout(r, 200));

                const resInfo = await checkFreeFireUID(uidText);
                nickname = resInfo.nickname;
                level = resInfo.level;
                session.nickname = nickname;
                session.level = level;
                session.initialLikes = resInfo.likes;
                saveDatabase(db);

                const reviewBox = `╭────────────────────────────╮\n      📦 ORDER CONFIRMATION\n╰────────────────────────────╯\n\n🛍️ **Package:** \`${session.product}\`\n💵 **Price:** \`${session.price} BDT\`\n🌍 **Server:** \`${session.region}\`\n\n👤 **Game Name:** \`${nickname}\`\n🛡️ **UID:** \`${uidText}\`\n\n⚠️ Please verify your in-game name & UID before confirming.`;

                try {
                    await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, reviewBox, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'cancelBtn'), 'cancel_order_review')],
                            [Markup.button.callback(t(userId, 'backBtn'), 'region_' + session.region.toLowerCase())]
                        ])
                    });
                } catch (e) {
                    await ctx.reply(reviewBox, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'cancelBtn'), 'cancel_order_review')],
                            [Markup.button.callback(t(userId, 'backBtn'), 'region_' + session.region.toLowerCase())]
                        ])
                    });
                }
            } else {
                session.nickname = 'Guild/Service ID';
                saveDatabase(db);
                const reviewBox = `╭────────────────────────────╮\n      📦 ORDER CONFIRMATION\n╰────────────────────────────╯\n\n🛍️ **Package:** \`${session.product}\`\n💵 **Price:** \`${session.price} BDT\`\n🌍 **Server:** \`${session.region}\`\n🛡️ **Target ID:** \`${uidText}\``;

                await ctx.reply(reviewBox, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'cancelBtn'), 'cancel_order_review')],
                        [Markup.button.callback(t(userId, 'backBtn'), 'region_' + session.region.toLowerCase())]
                    ])
                });
            }
            return;
        }

        // --- Admin Main Menu Commands ---
        if (cleanText.includes('totalusers') || text.includes('📊')) {
            if (userId === ADMIN_ID.toString()) {
                const usersObj = db.users || {};
                const userKeys = Object.keys(usersObj);
                let listText = `📊 **TOTAL USERS: ${userKeys.length}**\n\n`;
                userKeys.forEach((uId, idx) => {
                    const uInfo = usersObj[uId];
                    const bal = db.balances[uId] || 0;
                    listText += `${idx + 1}. 👤 Name: \`${uInfo.first_name}\`\n   🔗 Username: \`${uInfo.username}\`\n   🆔 ID: \`${uId}\`\n   💰 Balance: \`${bal} BDT\`\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
                    if (listText.length > 3700) {
                        ctx.reply(listText, { parse_mode: 'Markdown' });
                        listText = '';
                    }
                });
                if (listText.length > 0) return ctx.reply(listText, { parse_mode: 'Markdown' });
                return;
            }
        }
        if (cleanText.includes('addbot') || text.includes('➕')) {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'add_bot_user' };
                saveDatabase(db);
                return ctx.reply('➕ **অ্যাড বট মোড চালু হয়েছে**\n\n✍️ যে ইউজারের ইউজার আইডি (User ID) দিয়ে বট এক্সেস দিতে চান, শুধু সেই **ইউজার আইডিটি** লিখে পাঠান:', { parse_mode: 'Markdown' });
            }
        }
        if (cleanText.includes('removebot') || text.includes('❌')) {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'remove_bot_user' };
                saveDatabase(db);
                return ctx.reply('❌ **রিমুভ বট মোড চালু হয়েছে**\n\n✍️ যে ইউজারের ইউজার আইডি (User ID) বট থেকে রিমুভ করতে চান, শুধু সেই **ইউজার আইডিটি** লিখে পাঠান:', { parse_mode: 'Markdown' });
            }
        }
        if (cleanText.includes('add/minusbalance') || text.includes('💳')) {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'add_minus_balance' };
                saveDatabase(db);
                return ctx.reply('✍️ Format: `USER_ID AMOUNT` (Example: `5932254012 100`)', { parse_mode: 'Markdown' });
            }
        }
        if (cleanText.includes('setpaymentnumbers') || text.includes('📱')) {
            if (userId === ADMIN_ID.toString()) {
                return ctx.reply('📱 **Payment Number Management**\n\n👇 Select which payment number to update:', {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💖 Set bKash Number', 'admin_set_bkash')],
                        [Markup.button.callback('🧡 Set Nagad Number', 'admin_set_nagad')]
                    ])
                });
            }
        }
        if (cleanText.includes('sendmessage') || text.includes('📩')) {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'send_message' };
                saveDatabase(db);
                return ctx.reply('✍️ Format: `USER_ID | MESSAGE`', { parse_mode: 'Markdown' });
            }
        }
        if (cleanText.includes('allusersmsg') || text.includes('📢')) {
            if (userId === ADMIN_ID.toString()) {
                db.adminInputSession[userId] = { type: 'broadcast_msg' };
                saveDatabase(db);
                return ctx.reply('📢 Enter broadcast message for all users:');
            }
        }
        if (text.includes('Auto API: ON') || text.includes('Auto API: OFF')) {
            if (userId === ADMIN_ID.toString()) {
                db.settings.autoApiEnabled = !db.settings.autoApiEnabled;
                saveDatabase(db);
                const msg = db.settings.autoApiEnabled
                    ? "🟢 বটটি বর্তমানে অটোমেটিক মোডে আছে, এপিআই সফলভাবে অন হয়েছে।"
                    : "🔴 বটটি বর্তমানে ম্যানুয়াল মোডে আছে, এপিআই অফ হয়ে গেছে।";
                return ctx.reply(msg, { ...getMainKeyboard(userId) });
            }
        }

        // --- User Main Menu Buttons (Universal Dispatcher) ---
        if (lowerText.includes('shop now') || lowerText.includes('শপ নাও') || lowerText.includes('shop') || lowerText.includes('শপ')) {
            let inlineButtons = [];
            if (db.categories['Free Fire Likes']) {
                inlineButtons.push([Markup.button.callback(t(userId, 'buyLikes'), 'cat_ff_likes')]);
            }
            for (let c of Object.keys(db.categories || {})) {
                if (c === 'Free Fire Likes') continue;
                let encodedC = encodeURIComponent(c);
                inlineButtons.push([Markup.button.callback(translateCategoryName(c, userId), 'custom_cat_' + encodedC)]);
            }
            if (userId === ADMIN_ID.toString()) {
                inlineButtons.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
            }
            inlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
            return ctx.reply(t(userId, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
        }

        if (cleanText.includes('calculator') || cleanText.includes('ক্যালকুলেটর') || text.includes('🧮')) {
            db.calcStates[userId] = '0';
            saveDatabase(db);
            return ctx.reply("🧮 **Calculator**\n\nScreen: `0`", { parse_mode: 'Markdown', ...getCalcKeyboard() });
        }

        if (cleanText.includes('worldclock') || cleanText.includes('ওয়ার্ল্ডক্লক') || text.includes('🌍')) {
            return ctx.reply("🌍 **World Clock & Date**\n\n👇 Select country:", {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🇧🇩 Bangladesh', 'clock_bd'), Markup.button.callback('🇳🇵 Nepal', 'clock_np')],
                    [Markup.button.callback('🇮🇳 India', 'clock_in'), Markup.button.callback('🇵🇰 Pakistan', 'clock_pk')],
                    [Markup.button.callback('🇸🇦 Saudi Arabia', 'clock_sa'), Markup.button.callback('🇦🇪 Dubai (UAE)', 'clock_ae')],
                    [Markup.button.callback('🇲🇾 Malaysia', 'clock_my'), Markup.button.callback('🇸🇬 Singapore', 'clock_sg')],
                    [Markup.button.callback('🇺🇸 USA (NY)', 'clock_us'), Markup.button.callback('🇬🇧 UK (London)', 'clock_gb')],
                    [Markup.button.callback('🇨🇦 Canada', 'clock_ca'), Markup.button.callback('🇦🇺 Australia', 'clock_au')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (cleanText.includes('checkffuid') || cleanText.includes('ইউআইডিচেক') || cleanText.includes('ইউআইডি') || text.includes('🔍')) {
            db.sessions[userId] = { step: 'awaiting_uid_only' };
            saveDatabase(db);
            return ctx.reply(t(userId, 'checkUidPrompt'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (cleanText.includes('addbalance') || cleanText.includes('ব্যালেন্সঅ্যাড') || cleanText.includes('ব্যালেন্স') || text.includes('💰')) {
            const lang = getUserLang(userId);
            const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

            return ctx.reply(t(userId, 'depositPortal'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
                    [Markup.button.callback(cancelBtnText, 'back_start_inline')]
                ])
            });
        }

        if (cleanText.includes('myprofile') || cleanText.includes('আমারপ্রোফাইল') || cleanText.includes('প্রোফাইল') || text.includes('👤')) {
            const lang = getUserLang(userId);
            const langBtn = lang === 'en' ? '🌍 Change Language (EN)' : '🌍 Change Language (বাংলা)';
            const profileBox = `╔══════════════════════════════╗\n        👤 USER PROFILE\n╚══════════════════════════════╝\n\n🆔 **User ID:** \`${userId}\`\n👤 **Name:** \`${ctx.from.first_name}\`\n💰 **Balance:** \`৳${db.balances[userId] || 0}\``;

            return ctx.reply(profileBox, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(langBtn, 'open_lang_menu')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (cleanText.includes('orderhistory') || cleanText.includes('অর্ডারহিস্ট্রি') || cleanText.includes('হিস্ট্রি') || text.includes('📜')) {
            const userHistories = db.orderHistories && db.orderHistories[userId] ? db.orderHistories[userId].slice(0, 10) : [];
            let historyText = t(userId, 'historyTitle');
            if (userHistories.length === 0) {
                historyText += t(userId, 'noHistory');
            } else {
                userHistories.forEach((h, i) => {
                    const statusText = h.status === 'Cancelled' ? '❌ Cancelled' : '✅ Complete';
                    historyText += `${i + 1}. 📦 **${translateProductName(h.product, userId)}** — 💵 \`${h.price} BDT\`\n` +
                                   `   💰 Cost: \`${h.price} BDT\`\n` +
                                   `   ───────────────────────\n` +
                                   `   👤 Name: \`${h.nickname || 'N/A'}\`\n` +
                                   `   🛡️ UID: \`${h.uid}\`\n` +
                                   `   ✦ ───────────────── ✦\n` +
                                   `   🕒 \`${h.time} | ${h.date}\`\n` +
                                   `   📊 Status: ${statusText}\n\n`;
                });
            }
            return ctx.reply(historyText + t(userId, 'historyDisclaimer'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });
        }

        if (cleanText.includes('supportdesk') || cleanText.includes('সাপোর্টডেস্ক') || cleanText.includes('সাপোর্ট') || text.includes('📞')) {
            return ctx.reply(t(userId, 'supportText'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (userId !== ADMIN_ID.toString() && !isMenuCommand(text)) {
            const box = `📥 **New Customer Message**\n\n👤 Name: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n\n💬 Message:\n${text}`;
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

// --- Admin Shop Management Actions ---
bot.action('admin_create_cat', async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'add_category' };
        saveDatabase(db);
        await ctx.editMessageText('✍️ Enter new category name:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'shop_now_back')]])
        });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action(/admin_add_prod_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const catName = decodeURIComponent(ctx.match[1]);
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'add_shop_product', category: catName };
        saveDatabase(db);
        await ctx.editMessageText(`✍️ Enter product name and price for **${catName}**:\nFormat: \`Product Name | Price BDT\`\n(Example: \`Squad Bot 3 Days | 120\`)`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'custom_cat_' + encodeURIComponent(catName))]])
        });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action(/admin_rem_cat_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const catName = decodeURIComponent(ctx.match[1]);
        const db = loadDatabase();
        if (db.categories[catName]) delete db.categories[catName];
        if (db.customProducts[catName]) delete db.customProducts[catName];
        saveDatabase(db);
        await ctx.answerCbQuery('✅ Category removed successfully!');
        
        let inlineButtons = [];
        if (db.categories['Free Fire Likes']) {
            inlineButtons.push([Markup.button.callback(t(ADMIN_ID, 'buyLikes'), 'cat_ff_likes')]);
        }
        for (let c of Object.keys(db.categories || {})) {
            if (c === 'Free Fire Likes') continue;
            let encodedC = encodeURIComponent(c);
            inlineButtons.push([Markup.button.callback(translateCategoryName(c, ADMIN_ID), 'custom_cat_' + encodedC)]);
        }
        inlineButtons.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
        inlineButtons.push([Markup.button.callback(t(ADMIN_ID, 'mainMenuBack'), 'back_start_inline')]);
        await ctx.editMessageText(t(ADMIN_ID, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

bot.action(/admin_rem_prod_(.+)_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const catName = decodeURIComponent(ctx.match[1]);
        const prodIndex = parseInt(ctx.match[2]);
        const db = loadDatabase();
        if (db.customProducts[catName]) {
            db.customProducts[catName].splice(prodIndex, 1);
            saveDatabase(db);
        }
        await ctx.answerCbQuery('✅ Product removed successfully!');
        
        let inlineButtons = [];
        (db.customProducts?.[catName] || []).forEach((p, idx) => {
            let encodedC = encodeURIComponent(catName);
            let row = [Markup.button.callback(translateProductName(p.name, ADMIN_ID), 'sub_prod_' + encodedC + '_' + idx)];
            if (ADMIN_ID === ADMIN_ID.toString()) {
                row.push(Markup.button.callback('❌ Rem', `admin_rem_prod_${encodedC}_${idx}`));
                row.push(Markup.button.callback('✏️ Price', `admin_chg_price_${encodedC}_${idx}`));
            }
            inlineButtons.push(row);
        });
        inlineButtons.push([Markup.button.callback('➕ Add Product', 'admin_add_prod_' + encodeURIComponent(catName))]);
        inlineButtons.push([Markup.button.callback('❌ Remove Category', 'admin_rem_cat_' + encodeURIComponent(catName))]);
        inlineButtons.push([Markup.button.callback(t(ADMIN_ID, 'backBtn'), 'shop_now_back'), Markup.button.callback(t(ADMIN_ID, 'mainMenuBack'), 'back_start_inline')]);
        await ctx.editMessageText(`📂 **${translateCategoryName(catName, ADMIN_ID)}**`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

bot.action(/admin_chg_price_(.+)_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const catName = decodeURIComponent(ctx.match[1]);
        const prodIndex = parseInt(ctx.match[2]);
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'change_shop_price', category: catName, prodIndex: prodIndex };
        saveDatabase(db);
        await ctx.editMessageText(`✍️ Enter new price for this product (Only number):\n(Example: \`90\`)`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'custom_cat_' + encodeURIComponent(catName))]])
        });
        await ctx.answerCbQuery();
    } catch (e) {}
});

// --- Language Menu & Switching ---
bot.action('open_lang_menu', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        await ctx.editMessageText("🌐 **Select Your Language / ভাষা নির্বাচন করুন:**", {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 বাংলা', 'set_lang_bn'), Markup.button.callback('🇬🇧 English', 'set_lang_en')],
                [Markup.button.callback(t(userId, 'backBtn'), 'back_to_profile'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action('back_to_profile', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        const lang = getUserLang(userId);
        const langBtn = lang === 'en' ? '🌍 Change Language (EN)' : '🌍 Change Language (বাংলা)';
        const profileBox = `╔══════════════════════════════╗\n        👤 USER PROFILE\n╚══════════════════════════════╝\n\n🆔 **User ID:** \`${userId}\`\n👤 **Name:** \`${ctx.from.first_name}\`\n💰 **Balance:** \`৳${db.balances[userId] || 0}\``;

        await ctx.editMessageText(profileBox, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(langBtn, 'open_lang_menu')],
                [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action(/set_lang_(bn|en)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const lang = ctx.match[1];
        const db = loadDatabase();
        if (!db.userLang) db.userLang = {};
        db.userLang[userId] = lang;
        saveDatabase(db);
        await ctx.answerCbQuery(lang === 'bn' ? '🇧🇩 বাংলা ভাষা সেট করা হয়েছে!' : '🇬🇧 English language selected!');
        try { await ctx.deleteMessage(); } catch (e) {}
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

// --- Admin Payment Numbers ---
bot.action('admin_set_bkash', async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'set_bkash_number' };
        saveDatabase(db);
        await ctx.editMessageText('✍️ Send new bKash personal or merchant number:', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action('admin_set_nagad', async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { type: 'set_nagad_number' };
        saveDatabase(db);
        await ctx.editMessageText('✍️ Send new Nagad personal or merchant number:', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
    } catch (e) {}
});

// --- Deposit Portals & Back Navigation ---
bot.action('deposit_portal_back', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        const lang = getUserLang(userId);
        const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

        await ctx.editMessageText(t(userId, 'depositPortal'), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
                [Markup.button.callback(cancelBtnText, 'back_start_inline')]
            ])
        });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action('dep_bkash', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        db.sessions[userId] = { step: 'awaiting_deposit_amount', method: 'bKash' };
        saveDatabase(db);

        const lang = getUserLang(userId);
        const amountPromptBox = lang === 'bn' 
            ? `╭──────────────────────────────╮\n     💖 বিকাশ (bKash) ডিপোজিট\n╰──────────────────────────────╯\n\n💎 **নোটিশ:** সর্বনিম্ন ডিপোজিট বা অ্যাড ব্যালেন্স করতে হলে **১০০ টাকা বা তার বেশি** করতে হবে।\n\n✍️ আপনার কাঙ্ক্ষিত অ্যামাউন্টটি লিখে পাঠান:`
            : `╭──────────────────────────────╮\n     💖 bKash Deposit\n╰──────────────────────────────╯\n\n💎 **Notice:** Minimum deposit is **100 BDT or more**.\n\n✍️ Please enter your amount to add:`;

        const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

        await ctx.editMessageText(amountPromptBox, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(cancelBtnText, 'deposit_portal_back')]
            ])
        });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action('dep_nagad', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        db.sessions[userId] = { step: 'awaiting_deposit_amount', method: 'Nagad' };
        saveDatabase(db);

        const lang = getUserLang(userId);
        const amountPromptBox = lang === 'bn' 
            ? `╭──────────────────────────────╮\n     🧡 নগদ (Nagad) ডিপোজিট\n╰──────────────────────────────╯\n\n💎 **নোটিশ:** সর্বনিম্ন ডিপোজিট বা অ্যাড ব্যালেন্স করতে হলে **১০০ টাকা বা তার বেশি** করতে হবে।\n\n✍️ আপনার কাঙ্ক্ষিত অ্যামাউন্টটি লিখে পাঠান:`
            : `╭──────────────────────────────╮\n     🧡 Nagad Deposit\n╰──────────────────────────────╯\n\n💎 **Notice:** Minimum deposit is **100 BDT or more**.\n\n✍️ Please enter your amount to add:`;

        const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

        await ctx.editMessageText(amountPromptBox, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(cancelBtnText, 'deposit_portal_back')]
            ])
        });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action(/dep_app_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase(), info = db.depositRequests?.[ctx.match[1]];
        if (info) {
            const addAmt = Number(info.amount) || 100;
            const targetUser = info.userId;
            const prevBal = db.balances[targetUser] || 0;
            db.balances[targetUser] = prevBal + addAmt;
            const currBal = db.balances[targetUser];
            saveDatabase(db);

            const lang = getUserLang(targetUser);
            const depositReceipt = lang === 'bn'
                ? `💠 ════════════════════════════ 💠\n           ✅ ডিপোজিট সফলভাবে সম্পন্ন\n💠 ════════════════════════════ 💠\n\n💳 পেমেন্ট মাধ্যম: \`${info.method}\`\n💵 অ্যাডকৃত অ্যামাউন্ট: \`+${addAmt} BDT\`\n\n💰 **আগের ব্যালেন্স:** \`${prevBal} BDT\`\n💰 **বর্তমান ব্যালেন্স:** \`${currBal} BDT\`\n\n📊 স্ট্যাটাস: \`অ্যাডমিন কর্তৃক এপ্রুভড\`\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`
                : `💠 ════════════════════════════ 💠\n           ✅ DEPOSIT SUCCESSFULLY COMPLETED\n💠 ════════════════════════════ 💠\n\n💳 Method: \`${info.method}\`\n💵 Added Amount: \`+${addAmt} BDT\`\n\n💰 **Previous Balance:** \`${prevBal} BDT\`\n💰 **Current Balance:** \`${currBal} BDT\`\n\n📊 Status: \`Approved by Admin\`\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

            if (info.userMessageId) {
                await bot.telegram.editMessageText(targetUser, info.userMessageId, null, depositReceipt, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUser, 'mainMenuBack'), 'back_start_inline')]])
                }).catch(() => {
                    bot.telegram.sendMessage(targetUser, depositReceipt, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUser, 'mainMenuBack'), 'back_start_inline')]])
                    }).catch(() => {});
                });
            } else {
                await bot.telegram.sendMessage(targetUser, depositReceipt, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUser, 'mainMenuBack'), 'back_start_inline')]])
                }).catch(() => {});
            }

            delete db.depositRequests[ctx.match[1]];
            saveDatabase(db);
            await ctx.answerCbQuery('✅ Deposit approved & balance updated!');
            try { await ctx.editMessageCaption(`✅ **[DEPOSIT APPROVED: +${addAmt} BDT]**`); } catch (e) {
                try { await ctx.editMessageText(`✅ **[DEPOSIT APPROVED: +${addAmt} BDT]**`); } catch (err) {}
            }
        }
    } catch (e) {}
});

bot.action(/dep_can_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase(), info = db.depositRequests?.[ctx.match[1]];
        if (info) {
            await bot.telegram.sendMessage(info.userId, "❌ আপনার ডিপোজিট রিকোয়েস্টটি বাতিল করা হয়েছে।", { parse_mode: 'Markdown' }).catch(() => {});
            delete db.depositRequests[ctx.match[1]];
            saveDatabase(db);
            await ctx.answerCbQuery('❌ Cancelled.');
            try { await ctx.editMessageCaption('❌ **[DEPOSIT REJECTED]**'); } catch (e) {
                try { await ctx.editMessageText('❌ **[DEPOSIT REJECTED]**'); } catch (err) {}
            }
        }
    } catch (e) {}
});

// --- Admin Order & Reply Actions ---
bot.action(/admin_reply_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminReplySessions[ADMIN_ID] = ctx.match[1];
        saveDatabase(db);
        await ctx.reply('✍️ Type reply message for customer:');
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action(/admin_input_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.adminInputSession[ADMIN_ID] = { uniqueOrderId: ctx.match[1] };
        saveDatabase(db);
        await ctx.reply('✍️ Enter completion note/details for customer:\n(Example: `Successfully completed!`)', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
    } catch (e) {}
});

bot.action(/admin_can_(.+)/, async (ctx) => {
    try {
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        const db = loadDatabase(), info = db.adminSessions?.[ctx.match[1]];
        if (info) {
            db.balances[info.targetUserId] = (db.balances[info.targetUserId] || 0) + Number(info.price);

            if (!db.orderHistories[info.targetUserId]) db.orderHistories[info.targetUserId] = [];
            const now = new Date();
            db.orderHistories[info.targetUserId].unshift({
                timestamp: now.getTime(),
                date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                product: info.product, uid: info.uid, nickname: info.nickname || 'Unknown', region: info.region, price: info.price, status: 'Cancelled'
            });
            if (db.orderHistories[info.targetUserId].length > 10) db.orderHistories[info.targetUserId].pop();

            saveDatabase(db);
            await bot.telegram.editMessageText(info.targetUserId, info.loadingMessageId, null, "❌ **Order Cancelled & Refunded**", {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(info.targetUserId, 'mainMenuBack'), 'back_start_inline')]])
            }).catch(() => {});
            delete db.adminSessions[ctx.match[1]];
            saveDatabase(db);
            await ctx.answerCbQuery('✅ Cancelled & Refunded!');
            try { await ctx.editMessageText('❌ **[CANCELLED & REFUNDED]**'); } catch (e) {}
        }
    } catch (e) {}
});

// --- Calculator ---
bot.action(/calc_(.+)/, async (ctx) => {
    try {
        ctx.answerCbQuery().catch(() => {});
        const userId = ctx.from.id.toString();
        const val = ctx.match[1].trim();
        
        if (!cachedDb.calcStates) cachedDb.calcStates = {};
        let current = cachedDb.calcStates[userId] || '0';

        if (val === 'C') {
            current = '0';
        } else if (val === 'DEL') {
            current = current.length > 1 ? current.slice(0, -1) : '0';
        } else if (val === 'EQ') {
            try { 
                const sanitized = current.replace(/[^0-9+\-*/().]/g, '');
                current = sanitized ? String(Function('"use strict";return (' + sanitized + ')')()) : '0';
            } catch (e) { 
                current = 'Error'; 
            }
        } else {
            if (current === '0' || current === 'Error') {
                current = (val === '.') ? '0.' : val;
            } else {
                current += val;
            }
        }

        cachedDb.calcStates[userId] = current;

        await ctx.editMessageText(`🧮 **Calculator**\n\nScreen: \`${current}\``, { 
            parse_mode: 'Markdown', 
            ...getCalcKeyboard() 
        });
    } catch (e) {}
});

bot.action(/clock_(bd|np|in|pk|sa|ae|my|sg|us|gb|ca|au)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const tzMap = { 
            bd: 'Asia/Dhaka', 
            np: 'Asia/Kathmandu', 
            in: 'Asia/Kolkata', 
            pk: 'Asia/Karachi', 
            sa: 'Asia/Riyadh', 
            ae: 'Asia/Dubai', 
            my: 'Asia/Kuala_Lumpur', 
            sg: 'Asia/Singapore', 
            us: 'America/New_York', 
            gb: 'Europe/London', 
            ca: 'America/Toronto', 
            au: 'Australia/Sydney' 
        };
        const now = new Date();
        const selectedKey = ctx.match[1];
        const timeStr = now.toLocaleTimeString('en-US', { timeZone: tzMap[selectedKey] });
        const dateStr = now.toLocaleDateString('en-GB', { timeZone: tzMap[selectedKey], weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

        await ctx.editMessageText(`🌍 **World Clock & Date**\n\n📅 Date: \`${dateStr}\`\n🕒 Time: \`${timeStr}\``, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), 'back_to_clock'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
        });
    } catch (e) {}
});

bot.action('back_to_clock', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        await ctx.editMessageText("🌍 **World Clock & Date**\n\n👇 Select country:", {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 Bangladesh', 'clock_bd'), Markup.button.callback('🇳🇵 Nepal', 'clock_np')],
                [Markup.button.callback('🇮🇳 India', 'clock_in'), Markup.button.callback('🇵🇰 Pakistan', 'clock_pk')],
                [Markup.button.callback('🇸🇦 Saudi Arabia', 'clock_sa'), Markup.button.callback('🇦🇪 Dubai (UAE)', 'clock_ae')],
                [Markup.button.callback('🇲🇾 Malaysia', 'clock_my'), Markup.button.callback('🇸🇬 Singapore', 'clock_sg')],
                [Markup.button.callback('🇺🇸 USA (NY)', 'clock_us'), Markup.button.callback('🇬🇧 UK (London)', 'clock_gb')],
                [Markup.button.callback('🇨🇦 Canada', 'clock_ca'), Markup.button.callback('🇦🇺 Australia', 'clock_au')],
                [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

// --- Shop Navigation & Order Flow ---
bot.action('shop_now_back', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        let inlineButtons = [];
        
        if (db.categories['Free Fire Likes']) {
            inlineButtons.push([Markup.button.callback(t(userId, 'buyLikes'), 'cat_ff_likes')]);
        }
        for (let c of Object.keys(db.categories || {})) {
            if (c === 'Free Fire Likes') continue;
            let encodedC = encodeURIComponent(c);
            inlineButtons.push([Markup.button.callback(translateCategoryName(c, userId), 'custom_cat_' + encodedC)]);
        }
        if (userId === ADMIN_ID.toString()) {
            inlineButtons.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
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
        let encodedCat = encodeURIComponent('Free Fire Likes');
        (db.customProducts?.['Free Fire Likes'] || []).forEach((p, idx) => {
            let row = [Markup.button.callback(translateProductName(p.name, userId), `sub_prod_${encodedCat}_${idx}`)];
            if (userId === ADMIN_ID.toString()) {
                row.push(Markup.button.callback('❌ Rem', `admin_rem_prod_${encodedCat}_${idx}`));
                row.push(Markup.button.callback('✏️ Price', `admin_chg_price_${encodedCat}_${idx}`));
            }
            inlineButtons.push(row);
        });
        if (userId === ADMIN_ID.toString()) {
            inlineButtons.push([Markup.button.callback('➕ Add Product', `admin_add_prod_${encodedCat}`)]);
        }
        inlineButtons.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
        await ctx.editMessageText("🔥 **Select Package:**", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

bot.action(/custom_cat_(.+)/, async (ctx) => {
    try {
        const catName = decodeURIComponent(ctx.match[1]);
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        let inlineButtons = [];
        let encodedCat = encodeURIComponent(catName);
        (db.customProducts?.[catName] || []).forEach((p, idx) => {
            let row = [Markup.button.callback(translateProductName(p.name, userId), `sub_prod_${encodedCat}_${idx}`)];
            if (userId === ADMIN_ID.toString()) {
                row.push(Markup.button.callback('❌ Rem', `admin_rem_prod_${encodedCat}_${idx}`));
                row.push(Markup.button.callback('✏️ Price', `admin_chg_price_${encodedCat}_${idx}`));
            }
            inlineButtons.push(row);
        });
        if (userId === ADMIN_ID.toString()) {
            inlineButtons.push([Markup.button.callback('➕ Add Product', `admin_add_prod_${encodedCat}`)]);
            inlineButtons.push([Markup.button.callback('❌ Remove Category', `admin_rem_cat_${encodedCat}`)]);
        }
        inlineButtons.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
        await ctx.editMessageText(`📂 **${translateCategoryName(catName, userId)}**`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

bot.action(/sub_prod_(.+)_(.+)/, async (ctx) => {
    try {
        const catName = decodeURIComponent(ctx.match[1]);
        const index = parseInt(ctx.match[2]);
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        const prod = db.customProducts[catName]?.[index] || { name: 'Package' };
        const translated = translateProductName(prod.name, userId);

        let price = 0;
        const dashMatch = prod.name.match(/-\s*(\d+)/);
        const currMatch = prod.name.match(/(\d+)\s*(৳|tk|BDT)/i);
        if (dashMatch) {
            price = Number(dashMatch[1]);
        } else if (currMatch) {
            price = Number(currMatch[1]);
        } else {
            const allNums = prod.name.match(/\d+/g);
            price = allNums ? Number(allNums[allNums.length - 1]) : 0;
        }

        db.sessions[userId] = { product: translated, price, activeCategory: catName, prodIndex: index };
        saveDatabase(db);

        const prevCatCallback = catName === 'Free Fire Likes' ? 'cat_ff_likes' : 'custom_cat_' + encodeURIComponent(catName);
        await ctx.editMessageText(t(userId, 'serverTitle') + `\`${translated}\`\n💵 Price: \`${price} BDT\`\n\n👇 Select Server:`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 BD', 'region_bd'), Markup.button.callback('🇮🇩 ID', 'region_id')],
                [Markup.button.callback(t(userId, 'backBtn'), prevCatCallback), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

bot.action(/region_(bd|id)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString(), region = ctx.match[1].toUpperCase();
        const db = loadDatabase();
        const session = db.sessions?.[userId];
        if (session) {
            session.region = region;
            session.step = 'awaiting_uid';
            saveDatabase(db);
        }
        const prevProdCallback = session ? `sub_prod_${encodeURIComponent(session.activeCategory)}_${session.prodIndex}` : 'shop_now_back';
        await ctx.editMessageText(`🎮 **Enter UID (${region})**\n\n✍️ Please type and send your UID:`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(t(userId, 'backBtn'), prevProdCallback), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

bot.action('cancel_order_review', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        await ctx.answerCbQuery('❌ Order cancelled.');
        await ctx.editMessageText("❌ **Order Cancelled**\n\nYou have cancelled this order. No balance was deducted.", {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
        });
    } catch (e) {}
});

bot.action('confirm_order', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        const session = db.sessions?.[userId];
        if (!session) return ctx.answerCbQuery('Session expired.', { show_alert: true });
        if ((db.balances[userId] || 0) < session.price) return ctx.answerCbQuery('❌ Insufficient balance!', { show_alert: true });

        db.balances[userId] -= Number(session.price);
        saveDatabase(db);

        const procMsg = await ctx.reply(`⏳ Processing Order...\n\`▰▰▰▱▱▱▱▱▱▱ 30%\``, { parse_mode: 'Markdown' });
        await new Promise(r => setTimeout(r, 200));
        try { await ctx.telegram.editMessageText(userId, procMsg.message_id, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▱▱▱▱ 70%\``, { parse_mode: 'Markdown' }); } catch (e) {}
        await new Promise(r => setTimeout(r, 200));

        const isFFLikeCategory = session.activeCategory === 'Free Fire Likes' || (session.product && session.product.toLowerCase().includes('like'));
        const isAutoEnabled = db.settings && db.settings.autoApiEnabled && isFFLikeCategory;
        
        let apiRes = { success: false };
        if (isAutoEnabled) {
            apiRes = await callLikesFFApiWithTimeout({ action: 'like', uid: session.uid, server: session.region }, 30000);
        }

        if (isAutoEnabled && apiRes.success) {
            try { await ctx.telegram.editMessageText(userId, procMsg.message_id, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            await new Promise(r => setTimeout(r, 200));

            const postCheck = await checkFreeFireUID(session.uid);
            const prevLikes = session.initialLikes || 0;
            const currLikes = postCheck.likes || prevLikes;
            const addedLikes = currLikes >= prevLikes ? (currLikes - prevLikes) : 'N/A';

            if (!db.orderHistories[userId]) db.orderHistories[userId] = [];
            const now = new Date();
            db.orderHistories[userId].unshift({
                timestamp: now.getTime(),
                date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                product: session.product, uid: session.uid, nickname: session.nickname || 'Unknown', region: session.region, price: session.price, status: 'Complete'
            });
            if (db.orderHistories[userId].length > 10) db.orderHistories[userId].pop();
            saveDatabase(db);

            const autoReceipt = `💠 ════════════════════════════ 💠\n           ✅ ORDER SUCCESSFULLY COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${session.product}\`\n🆔 Order ID: \`AUTO-${Math.floor(10000 + Math.random() * 90000)}\`\n\n👤 Name: \`${session.nickname || 'Unknown'}\`\n🛡️ UID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n\n👍 **Previous Likes:** \`${prevLikes}\`\n👍 **Current Likes:** \`${currLikes}\`\n📈 **Added Likes:** \`+${addedLikes} Likes\`\n\n📊 Status: \`Completed Successfully\`\n📝 Note/Details: \`Delivered automatically via API\`\n\n💰 Price: \`${session.price} BDT\`\n💳 Remaining Balance: \`${db.balances[userId]} BDT\`\n\n⚠️ **সতর্কতা: ২৪ ঘণ্টার মধ্যে একই ইউআইডিতে পুনরায় লাইক নিলে লাইক না-ও যোগ হতে পারে!**\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

            await ctx.telegram.editMessageText(userId, procMsg.message_id, null, autoReceipt, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });

            await bot.telegram.sendMessage(ADMIN_ID, "📋 **[Duplicate Copy - Auto Order]**\n\n" + autoReceipt + "\n\n👤 **Customer ID:** `" + userId + "`", { parse_mode: 'Markdown' }).catch(() => {});

        } else if (isFFLikeCategory) {
            try { await ctx.telegram.editMessageText(userId, procMsg.message_id, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▰▰▰▱ 95% (Pending Admin Review)\``, { parse_mode: 'Markdown' }); } catch (e) {}

            const uniqueOrderId = userId + '_' + Date.now();
            db.adminSessions[uniqueOrderId] = {
                targetUserId: userId,
                loadingMessageId: procMsg.message_id,
                product: session.product,
                uid: session.uid,
                nickname: session.nickname || 'Unknown',
                region: session.region,
                price: session.price
            };
            saveDatabase(db);

            await bot.telegram.sendMessage(ADMIN_ID, `⚠️ API Failed / Fallback Order (Manual Needed)\n\n📦 Package: \`${session.product}\`\n👤 Name: \`${session.nickname || 'Unknown'}\`\n🆔 UID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n💵 Price: \`${session.price} BDT\`\n👤 Customer ID: \`${userId}\``, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Enter Details', 'admin_input_' + uniqueOrderId)],
                    [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
                ])
            });

        } else {
            try { await ctx.telegram.editMessageText(userId, procMsg.message_id, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            await new Promise(r => setTimeout(r, 200));

            const uniqueOrderId = userId + '_' + Date.now();
            
            const pendingReceipt = `💠 ════════════════════════════ 💠\n           ⏳ ORDER PENDING REVIEW\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${session.product}\`\n🆔 Order ID: \`SRV-${Math.floor(10000 + Math.random() * 90000)}\`\n\n🛡️ Target ID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n\n📊 Status: \`Pending Admin Approval\`\n💰 Price: \`${session.price} BDT\`\n💳 Remaining Balance: \`${db.balances[userId]} BDT\`\n\n✨ আপনার অর্ডারটি সফলভাবে সাবমিট হয়েছে এবং টাকা কেটে নেওয়া হয়েছে। অ্যাডমিন চেক করে শীঘ্রই এটি কমপ্লিট করে দেবেন!\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

            const userMsg = await ctx.telegram.editMessageText(userId, procMsg.message_id, null, pendingReceipt, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });

            db.adminSessions[uniqueOrderId] = {
                targetUserId: userId,
                loadingMessageId: userMsg.message_id,
                product: session.product,
                uid: session.uid,
                nickname: session.nickname || 'Guild/Service ID',
                region: session.region,
                price: session.price
            };
            saveDatabase(db);

            await bot.telegram.sendMessage(ADMIN_ID, `🛠️ **New Guild/Service Order (Pending)**\n\n📦 Package: \`${session.product}\`\n🛡️ Target ID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n💵 Price: \`${session.price} BDT\`\n👤 Customer ID: \`${userId}\``, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Complete Order', 'admin_input_' + uniqueOrderId)],
                    [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
                ])
            });
        }

        delete db.sessions[userId];
        saveDatabase(db);
    } catch (e) {}
});

bot.action('back_start_inline', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        await ctx.answerCbQuery();
        try { await ctx.deleteMessage(); } catch (e) {}
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

const webhookPath = `/secret-path-${BOT_TOKEN.split(':')[0]}`;
bot.telegram.setWebhook(`${RENDER_URL}${webhookPath}`, { drop_pending_updates: true }).catch(() => {});

http.createServer((req, res) => {
    if (req.url === webhookPath && req.method === 'POST') bot.webhookCallback(webhookPath)(req, res);
    else if (req.url === '/ping') { res.writeHead(200); res.end('OK'); }
    else { res.writeHead(200); res.end('Running'); }
}).listen(PORT);
