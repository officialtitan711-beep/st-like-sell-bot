const { Telegraf, Markup } = require('telegraf');
const http = require('http');
const https = require('https');
require('dotenv').config();

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const BOT_TOKEN = process.env.BOT_TOKEN || '8395471740:AAF-v0dAgc36nL7sb1G5Dy6IzHmsCUlwe80';
const ADMIN_ID = process.env.ADMIN_ID || '5932254012';
const CHANNEL_ID = process.env.CHANNEL_ID || '@shohan2004';
const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://m.youtube.com/@ShohanSir18';

// LikesFF Reseller API Config
const API_BASE = "https://raigen.site/likesff/reseller.php";
const API_KEY = "likesff-shop-11935-c3rp5src";

const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://st-like-sell-bot.onrender.com';
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;

const bot = new Telegraf(BOT_TOKEN);

let cachedDb = { users: {}, balances: {}, sessions: {}, numbers: {}, categories: {}, customProducts: {}, allowedUsers: {}, pendingMsgs: {}, orderHistories: {}, historyTimestamps: {}, lastCleanMonth: '', userLang: {}, depositRequests: {}, adminReplySessions: {}, adminInputSession: {}, adminSessions: {}, calcStates: {}, settings: { autoApiEnabled: true } };

function loadDatabase() {
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
                        cachedDb = parsed;
                        if (!cachedDb.settings) cachedDb.settings = { autoApiEnabled: true };
                        if (!cachedDb.calcStates) cachedDb.calcStates = {};
                    }
                }
            } catch (e) {
                console.error('Firebase Load Error:', e);
            }
        });
    }).on('error', (e) => {
        console.error('Firebase Fetch Error:', e);
    });
}

function saveDatabase(data) {
    cachedDb = data;
    if (!FIREBASE_DB_URL) return;
    
    const dataString = JSON.stringify(data);
    const dbUrl = new URL(FIREBASE_DB_URL.endsWith('/') ? `${FIREBASE_DB_URL}database.json` : `${FIREBASE_DB_URL}/database.json`);
    
    const reqOptions = {
        hostname: dbUrl.hostname,
        path: dbUrl.pathname + dbUrl.search,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString)
        }
    };

    const req = https.request(reqOptions, (res) => {});
    req.on('error', (e) => {
        console.error('Firebase Save Error:', e);
    });
    req.write(dataString);
    req.end();
}

syncDataFromFirebase();
setInterval(syncDataFromFirebase, 5 * 60 * 1000);

// Helper function to call LikesFF API with 30 Seconds Timeout Guard
function callLikesFFApiWithTimeout(params, timeoutMs = 30000) {
    return new Promise((resolve) => {
        const queryParams = new URLSearchParams({ key: API_KEY, ...params });
        const url = `${API_BASE}?${queryParams.toString()}`;
        
        let isFinished = false;

        const req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (isFinished) return;
                isFinished = true;
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (err) {
                    resolve({ success: false, error: 'Invalid JSON response from API', code: 'INVALID_JSON' });
                }
            });
        });

        req.on('error', () => {
            if (isFinished) return;
            isFinished = true;
            resolve({ success: false, error: 'API connection failed', code: 'CONNECTION_ERROR' });
        });

        setTimeout(() => {
            if (isFinished) return;
            isFinished = true;
            req.destroy();
            resolve({ success: false, error: 'API Request Timeout (30s exceeded)', code: 'TIMEOUT' });
        }, timeoutMs);
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
            profileTitle: "👤 **ব্যবহারকারী প্রোফাইল**",
            changeLangPrompt: "🌐 ভাষা পরিবর্তন করতে চাইলে নিচের বাটনে চাপ দিন:",
            langBtn: "🌐 ভাষা পরিবর্তন",
            langSelectTitle: "🌍 ভাষা নির্বাচন করুন:",
            shopNow: "🛍️ শপ নাও",
            checkUid: "🔍 ইউআইডি চেক",
            addBalance: "💰 ব্যালেন্স অ্যাড",
            myProfile: "👤 আমার প্রোফাইল",
            orderHistory: "📜 অর্ডার হিস্ট্রি",
            supportDesk: "📞 সাপোর্ট ডেস্ক",
            calculatorBtn: "🧮 ক্যালকুলেটর",
            worldClockBtn: "🌍 ওয়ার্ল্ড ক্লক",
            shopMenuTitle: "🛍️ **সকল উপলব্ধ সার্ভিস**\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:",
            checkUidPrompt: "🎮 **ফ্রি ফায়ার ইউআইডি চেকার**\n\n✍️ ইউআইডি লিখে পাঠান:",
            depositPortal: "»»------------- ★ 💰 ডিপোজিট পোর্টাল ★ -------------««\n\n💎 সর্বনিম্ন ডিপোজিট: `১০০.০ টাকা`\n👇 টাকা পাঠানোর জন্য যেকোনো মাধ্যম সিলেক্ট করুন:\n\n»»-------------------------------------------------««",
            supportText: "📞 **সাপোর্ট ডেস্ক**\n\n💡 আপনার যেকোনো সমস্যা, TrxID বা স্ক্রিনশট সরাসরি এই চ্যাটেই পাঠিয়ে দিন। অ্যাডমিন খুব দ্রুত রিপ্লাই দেবেন।",
            mainMenuBack: "🔙 মূল মেনু 🏠",
            backBtn: "🔙 পেছনের মেনু ↩️",
            buyLikes: "🔥 ফ্রি ফায়ার লাইক কিনুন ⚡",
            serverTitle: "🌍 **সার্ভার নির্বাচন**\n\nপ্যাকেজ: ",
            enterIdTitle: "🎮 **আইডি ডিটেইলস দিন**\n\nসার্ভার: ",
            orderReviewTitle: "📦 **অর্ডার রিভিউ**",
            confirmOrderBtn: "✅ অর্ডার কনফার্ম করুন 🚀",
            orderProcessing: "⏳ অর্ডার প্রসেসিং হচ্ছে...",
            uploadProofTitle: "✦ ─────────────── ✦ ─────────────── ✦\n       📸 পেমেন্ট প্রুফ আপলোড করুন\n✦ ─────────────── ✦ ─────────────── ✦\n\n✍️ বিকাশ বা নগদ পেমেন্টের স্ক্রিনশট অথবা ট্রানজেকশন আইডি (TrxID) এখন চ্যাটে সেন্ড করুন:",
            proofSubmittedStatus: "✦ ─────────────── ✦ ─────────────── ✦\n       🚀 প্রুফ সাবমিট সফল ✅\n✦ ─────────────── ✦ ─────────────── ✦\n\n💳 পেমেন্ট মাধ্যম: ",
            depositCancelledBox: "❌ **ডিপোজিট বাতিল করা হয়েছে**\n\n⚠️ আপনার ডিপোজিট রিকোয়েস্টটি অ্যাডমিন কর্তৃক বাতিল করা হয়েছে।",
            balanceRechargedBox: "💎 **ব্যালেন্স রিচার্জ সফল**\n\nঅ্যাকাউন্ট ব্যালেন্স সফলভাবে আপডেট করা হয়েছে!\n\n📌 পূর্বের ব্যালেন্স: `",
            minDepositWarning: "🛑 **সর্বনিম্ন ডিপোজিট সতর্কতা**\n\nবট নিয়ম অনুযায়ী সর্বনিম্ন **১০০ টাকা** ডিপোজিট করতে হবে।\n❌ আপনার প্রদত্ত পরিমাণ: `",
            accountFoundTitle: "🎉 **অ্যাকাউন্ট পাওয়া গেছে**\n\n👤 নাম: `",
            supportSentSuccess: "✨ আপনার মেসেজ বা স্ক্রিনশট সরাসরি অ্যাডমিনের কাছে পৌঁছে গেছে! দয়া করে অপেক্ষা করুন।",
            historyTitle: "📜 **শেষ ১০টি অর্ডারের ইতিহাস**\n\n",
            historyDisclaimer: "\n\n⚠️ *নোট: সুরক্ষার জন্য এখানে শুধুমাত্র আপনার সর্বশেষ ১০টি অর্ডার দেখানো হয়।*",
            noHistory: "❌ এখনো কোনো অর্ডার সম্পন্ন হয়নি!\n\n"
        },
        en: {
            welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ Welcome to our premium gaming service. Choose your preferred service below: 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            profileTitle: "👤 **USER PROFILE**",
            changeLangPrompt: "🌐 Click below to switch language:",
            langBtn: "🌐 Change Language",
            langSelectTitle: "🌍 Select Language:",
            shopNow: "🛍️ Shop Now",
            checkUid: "🔍 Check FF UID",
            addBalance: "💰 Add Balance",
            myProfile: "👤 My Profile",
            orderHistory: "📜 Order History",
            supportDesk: "📞 Support Desk",
            calculatorBtn: "🧮 Calculator",
            worldClockBtn: "🌍 World Clock",
            shopMenuTitle: "🛍️ **ALL AVAILABLE SHOP**\n\n👇 Please select the buttons below:",
            checkUidPrompt: "🎮 **FREE FIRE UID CHECKER**\n\n✍️ Send UID:",
            depositPortal: "»»------------- ★ 💰 DEPOSIT PORTAL ★ -------------««\n\n💎 Min Deposit: `100.0 BDT`\n👇 Choose any payment method below:\n\n»»-------------------------------------------------««",
            supportText: "📞 **SUPPORT DESK**\n\n💡 Send any issue, TrxID or screenshot directly in this chat. Admin will reply soon.",
            mainMenuBack: "🔙 Main Menu 🏠",
            backBtn: "🔙 Back ↩️",
            buyLikes: "🔥 Buy Free Fire Likes ⚡",
            serverTitle: "🌍 **SERVER SELECTION**\n\nPackage: ",
            enterIdTitle: "🎮 **ENTER ID DETAILS**\n\nServer: ",
            orderReviewTitle: "📦 **ORDER REVIEW**",
            confirmOrderBtn: "✅ Confirm Order 🚀",
            orderProcessing: "⏳ Order is processing...",
            uploadProofTitle: "✦ ─────────────── ✦ ─────────────── ✦\n       📸 UPLOAD PAYMENT PROOF\n✦ ─────────────── ✦ ─────────────── ✦\n\n✍️ Please send your Bkash/Nagad payment screenshot or TrxID in chat now:",
            proofSubmittedStatus: "✦ ─────────────── ✦ ─────────────── ✦\n       🚀 PROOF SUBMITTED ✅\n✦ ─────────────── ✦ ─────────────── ✦\n\n💳 Method: ",
            depositCancelledBox: "❌ **DEPOSIT CANCELLED**\n\n⚠️ Your deposit request has been cancelled by the admin.",
            balanceRechargedBox: "💎 **BALANCE RECHARGED**\n\nAccount balance updated successfully!\n\n📌 Prev: `",
            minDepositWarning: "🛑 **MINIMUM DEPOSIT WARNING**\n\nMinimum deposit must be **100 BDT**.\n❌ Your amount: `",
            accountFoundTitle: "🎉 **ACCOUNT FOUND**\n\n👤 Name: `",
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
            ['✏️ Change Product Price', '💳 Add/Minus Balance'],
            ['📱 Set Payment Numbers', '📩 Send Message'],
            ['📢 All Users Msg']
        );
    }
    return Markup.keyboard(keyboard).resize();
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
        return prodName
            .replace(/Likes/gi, 'লাইক')
            .replace(/Squad Bot/gi, 'স্কোয়াড বট')
            .replace(/Days/gi, 'দিন')
            .replace(/Pack/gi, 'প্যাকেজ');
    } else {
        return prodName
            .replace(/লাইক/gi, 'Likes')
            .replace(/স্কোয়াড বট/gi, 'Squad Bot')
            .replace(/দিন/gi, 'Days')
            .replace(/প্যাকেজ/gi, 'Pack');
    }
}

async function checkUserSubscription(userId) {
    if (userId.toString() === ADMIN_ID.toString()) return true;
    try {
        const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
        if (chatMember.status === 'left' || chatMember.status === 'kicked') {
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

async function sendForceSubMessage(ctx, isPendingAdminAccess = false) {
    let text;
    let keyboard;
    const userId = ctx.from ? ctx.from.id.toString() : (ctx.chat ? ctx.chat.id.toString() : null);

    if (isPendingAdminAccess) {
        text = "⏳ **50% ACCESS PENDING**\n\n🎉 অভিনন্দন! আপনি **ST Like Bot**-এর ৫০% এক্সেস সফলভাবে পেয়েছেন। বাকী এক্সেস পেতে নিচের বাটনে ক্লিক করে অ্যাডমিনকে মেসেজ দিন।\n👑 **Admin:** `@sonu1813`";
        keyboard = Markup.inlineKeyboard([
            [Markup.button.url('💬 Message Admin 🚀', 'https://t.me/sonu1813')]
        ]);
    } else {
        text = "🚨 **SECURITY LOCK & FORCE**\n\n⚠️ প্রিমিয়াম বট ব্যবহার করতে হলে আমাদের অফিশিয়াল চ্যানেলে যুক্ত থাকতে হবে!\n\n🔥 **ধাপসমূহ:**\n1️⃣ টেলিগ্রাম চ্যানেলে জয়েন করুন।\n2️⃣ ইউটিউব চ্যানেল সাবস্ক্রাইব করুন।\n3️⃣ ভেরিফাই বাটনে ক্লিক করুন।";
        keyboard = Markup.inlineKeyboard([
            [Markup.button.url('📢 Join Telegram Channel 🚀', 'https://t.me/shohan2004')],
            [Markup.button.url('🔴 Subscribe YouTube 🎬', YOUTUBE_URL)],
            [Markup.button.callback('🔄 Verify Membership ✨', 'verify_sub')]
        ]);
    }

    try {
        let sentMsg;
        if (ctx.callbackQuery) {
            sentMsg = await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
        } else {
            sentMsg = await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
        }

        if (isPendingAdminAccess && userId && sentMsg) {
            const db = loadDatabase();
            if (!db.pendingMsgs) db.pendingMsgs = {};
            db.pendingMsgs[userId] = sentMsg.message_id;
            saveDatabase(db);
        }
    } catch (e) {
        try {
            const sentMsg = await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
            if (isPendingAdminAccess && userId && sentMsg) {
                const db = loadDatabase();
                if (!db.pendingMsgs) db.pendingMsgs = {};
                db.pendingMsgs[userId] = sentMsg.message_id;
                saveDatabase(db);
            }
        } catch (err) {}
    }
}

function checkFreeFireUID(uid) {
    return new Promise((resolve) => {
        const url = 'https://akmtopup.com/api/checkuid?uid=' + uid;
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    let nickname = parsed.nickname || parsed.message || parsed.name || parsed.username || parsed.AccountName;
                    if (nickname && nickname.trim() !== '') {
                        resolve(nickname);
                    } else {
                        resolve('Unknown Player');
                    }
                } catch (err) {
                    resolve('Unknown Player');
                }
            });
        }).on('error', () => {
            resolve('Unknown Player');
        });
    });
}

bot.use(async (ctx, next) => {
    try {
        if (ctx && ctx.from) {
            const userId = ctx.from.id.toString();
            const db = loadDatabase();
            if (!db.users) db.users = {};
            db.users[userId] = {
                id: userId,
                first_name: ctx.from.first_name || 'N/A',
                username: ctx.from.username ? '@' + ctx.from.username : 'N/A'
            };
            saveDatabase(db);

            if (userId === ADMIN_ID) return next();
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'verify_sub') return next();
            if (ctx.message && ctx.message.text && (ctx.message.text.startsWith('/start') || ctx.message.text.includes('Shop Now') || ctx.message.text.includes('শপ নাও'))) return next();

            const isSubscribed = await checkUserSubscription(userId);
            if (!isSubscribed) {
                return sendForceSubMessage(ctx, false);
            }

            if (!db.allowedUsers || !db.allowedUsers[userId]) {
                return sendForceSubMessage(ctx, true);
            }
        }
        await next();
    } catch (err) { 
        console.error('Middleware Error:', err); 
    }
});

bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const isSubscribed = await checkUserSubscription(userId);

        if (!isSubscribed) {
            return sendForceSubMessage(ctx, false);
        }

        const db = loadDatabase();
        if (userId.toString() !== ADMIN_ID.toString() && (!db.allowedUsers || !db.allowedUsers[userId])) {
            return sendForceSubMessage(ctx, true);
        }

        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {
        console.error('Start Command Error:', e);
    }
});

bot.action('verify_sub', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const isSubscribed = await checkUserSubscription(userId);

        if (!isSubscribed) {
            return ctx.answerCbQuery('❌ আপনি এখনো টেলিগ্রাম চ্যানেলে জয়েন করেননি! দয়া করে আগে চ্যানেলে জয়েন করুন।', { show_alert: true });
        }

        const db = loadDatabase();
        if (userId.toString() !== ADMIN_ID.toString() && (!db.allowedUsers || !db.allowedUsers[userId])) {
            await ctx.answerCbQuery('⚠️ চ্যানেল ভেরিফাইড! এখন অ্যাডমিনের পারমিশন নিন।');
            try { await ctx.deleteMessage(); } catch (e) {}
            return sendForceSubMessage(ctx, true);
        }

        await ctx.answerCbQuery('🎉 অভিনন্দন! ভেরিফিকেশন সফল হয়েছে।');
        try { await ctx.deleteMessage(); } catch (e) {}

        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {
        console.error('Verify Sub Error:', e);
    }
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
        if (!db.numbers) db.numbers = {};
        if (!db.categories) db.categories = {};
        if (!db.customProducts) db.customProducts = {};
        if (!db.users) db.users = {};
        if (!db.allowedUsers) db.allowedUsers = {};
        if (!db.pendingMsgs) db.pendingMsgs = {};
        if (!db.adminReplySessions) db.adminReplySessions = {};
        if (!db.orderHistories) db.orderHistories = {};
        if (!db.historyTimestamps) db.historyTimestamps = {};
        if (!db.depositRequests) db.depositRequests = {};
        if (!db.adminInputSession) db.adminInputSession = {};
        if (!db.adminSessions) db.adminSessions = {};
        if (!db.calcStates) db.calcStates = {};
        if (!db.settings) db.settings = { autoApiEnabled: true };

        const text = ctx.message.text ? ctx.message.text.trim() : (ctx.message.caption ? ctx.message.caption.trim() : '');

        if (userId === ADMIN_ID.toString()) {
            if (text.includes('Auto API: ON') || text.includes('Auto API: OFF')) {
                db.settings.autoApiEnabled = !db.settings.autoApiEnabled;
                saveDatabase(db);
                const newStatusText = db.settings.autoApiEnabled ? '🟢 Auto API: ON (সিস্টেম এখন ফুল অটোমেটিক)' : '🔴 Auto API: OFF (সিস্টেম এখন ম্যানুয়াল মোডে আছে)';
                return ctx.reply(newStatusText, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
            }
        }

        if (text === '🧮 Calculator' || text === '🧮 ক্যালকুলেটর') {
            db.calcStates[userId] = '0';
            saveDatabase(db);
            const lang = getUserLang(userId);
            const calcHeader = lang === 'en' ? "🧮 **INTERACTIVE CALCULATOR**\n\n" : "🧮 **ইন্টারেক্টিভ ক্যালকুলেটর**\n\n";
            return ctx.reply(calcHeader + "Screen: `0`", { parse_mode: 'Markdown', ...getCalcKeyboard() });
        }

        if (text === '🌍 World Clock' || text === '🌍 ওয়ার্ল্ড ক্লক') {
            const lang = getUserLang(userId);
            const clockTitle = lang === 'en' ? "🌍 **WORLD CLOCK & DATE**\n\n👇 Select country to view real-time time & date:" : "🌍 **ওয়ার্ল্ড ক্লক ও তারিখ**\n\n👇 রিয়েল-টাইম সময় ও তারিখ দেখতে দেশ সিলেক্ট করুন:";
            return ctx.reply(clockTitle, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🇧🇩 Bangladesh', 'clock_bd'), Markup.button.callback('🇳🇵 Nepal', 'clock_np')],
                    [Markup.button.callback('🇮🇳 India', 'clock_in'), Markup.button.callback('🇧🇹 Bhutan', 'clock_bt')],
                    [Markup.button.callback('🇲🇲 Myanmar', 'clock_mm'), Markup.button.callback('🇸🇦 Saudi Arabia', 'clock_sa')],
                    [Markup.button.callback('🇦🇪 UAE (Dubai)', 'clock_uae'), Markup.button.callback('🇸🇬 Singapore', 'clock_sg')],
                    [Markup.button.callback('🇶🇦 Qatar', 'clock_qa'), Markup.button.callback('🇺🇸 USA', 'clock_us')],
                    [Markup.button.callback('🇮🇹 Italy', 'clock_it'), Markup.button.callback('🇲🇾 Malaysia', 'clock_my')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '🛍️ Shop Now' || text === '🛍️ শপ নাও') {
            const lang = getUserLang(userId);
            try {
                if (userId === ADMIN_ID.toString() && db.sessions[userId]) {
                    db.sessions[userId].activeCategory = null;
                    saveDatabase(db);
                }

                let inlineButtons = [[Markup.button.callback(t(userId, 'buyLikes'), 'cat_ff_likes')]];
                const catKeys = Object.keys(db.categories || {});
                if (catKeys.length > 0) {
                    catKeys.forEach((c) => { 
                        const translatedCat = translateCategoryName(c, userId);
                        inlineButtons.push([Markup.button.callback(translatedCat, 'custom_cat_' + c)]); 
                    });
                }
                inlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);

                await ctx.reply(t(userId, 'shopMenuTitle'), {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(inlineButtons)
                });
            } catch (e) {}
            return;
        }

        if (text === '🔍 Check FF UID' || text === '🔍 ইউআইডি চেক') {
            db.sessions[userId] = { step: 'awaiting_uid_only' };
            saveDatabase(db);
            return ctx.reply(t(userId, 'checkUidPrompt'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });
        }

        if (text === '💰 Add Balance' || text === '💰 ব্যালেন্স অ্যাড') {
            const lang = getUserLang(userId);
            return ctx.reply(t(userId, 'depositPortal'), { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(lang === 'en' ? '💖 bKash' : '💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback(lang === 'en' ? '🧡 Nagad' : '🧡 নগদ [Nagad]', 'dep_nagad')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '👤 My Profile' || text === '👤 আমার প্রোফাইল') {
            const balance = db.balances[userId] || 0;
            const lang = getUserLang(userId);
            const profileBoxText = "╔═════════════════════════════════╗\n║         👤 USER PROFILE         ║\n╚═════════════════════════════════╝\n\n🆔 Telegram ID: `" + userId + "`\n💰 " + (lang === 'en' ? 'Current Balance' : 'বর্তমান ব্যালেন্স') + ": `৳" + balance + "` 💳\n\n🌐 " + t(userId, 'changeLangPrompt');
            return ctx.reply(profileBoxText, { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(t(userId, 'langBtn'), 'open_lang_settings')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '📜 Order History' || text === '📜 অর্ডার হিস্ট্রি') {
            const lang = getUserLang(userId);
            const userHistories = db.orderHistories && db.orderHistories[userId] ? db.orderHistories[userId] : [];
            let historyBoxText = t(userId, 'historyTitle');
            if (userHistories.length === 0) {
                historyBoxText += t(userId, 'noHistory');
            } else {
                userHistories.forEach((h, index) => {
                    const prodName = translateProductName(h.product, userId);
                    if (lang === 'bn') {
                        historyBoxText += (index + 1) + ". 📦 **" + prodName + "**\n   🎮 নাম: `" + h.nickname + "`\n   🛡 ইউআইডি: `" + h.uid + "`\n   💵 মূল্য: `" + h.price + " টাকা`\n   🕒 সময়: `" + h.time + "` | 📅 তারিখ: `" + h.date + "`\n───────────────────\n";
                    } else {
                        historyBoxText += (index + 1) + ". 📦 **" + prodName + "**\n   🎮 Name: `" + h.nickname + "`\n   🛡 UID: `" + h.uid + "`\n   💵 Price: `" + h.price + " BDT`\n   🕒 Time: `" + h.time + "` | 📅 Date: `" + h.date + "`\n───────────────────\n";
                    }
                });
            }
            historyBoxText += t(userId, 'historyDisclaimer');
            return ctx.reply(historyBoxText, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });
        }

        if (text === '📞 Support Desk' || text === '📞 সাপোর্ট ডেস্ক') {
            return ctx.reply(t(userId, 'supportText'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });
        }

        if (userId !== ADMIN_ID.toString()) {
            const customerName = ctx.from.first_name || 'N/A';
            const customerUsername = ctx.from.username ? '@' + ctx.from.username : 'N/A';
            const customerMsgContent = ctx.message.text || ctx.message.caption || '📎 [Attachment / File / Photo]';

            const adminSupportBox = "📥 **নতুন কাস্টমার মেসেজ**\n\n👤 Name: " + customerName + "\n🔗 Username: " + customerUsername + "\n🆔 ID: `" + userId + "`\n\n💬 Message:\n" + customerMsgContent;
            
            try {
                if (ctx.message.photo) {
                    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                    await bot.telegram.sendPhoto(ADMIN_ID, photoId, { 
                        caption: adminSupportBox, 
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]])
                    });
                } else {
                    await bot.telegram.sendMessage(ADMIN_ID, adminSupportBox, { 
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]])
                    });
                }
            } catch (e) {}

            return ctx.reply(t(userId, 'supportSentSuccess'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });
        }
    } catch (err) {
        console.error('Message Handler Global Error:', err);
    }
});

bot.action(/calc_(.+)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const val = ctx.match[1].trim();
        const db = loadDatabase();
        if (!db.calcStates) db.calcStates = {};
        let current = db.calcStates[userId] || '0';

        if (val === 'C') {
            current = '0';
        } else if (val === 'DEL') {
            current = current.length > 1 ? current.slice(0, -1) : '0';
        } else if (val === 'EQ') {
            try {
                const sanitized = current.replace(/[^0-9+\-*/().]/g, '');
                current = String(eval(sanitized));
            } catch (e) {
                current = 'Error';
            }
        } else {
            if (current === '0' || current === 'Error') {
                current = val;
            } else {
                current += val;
            }
        }

        db.calcStates[userId] = current;
        saveDatabase(db);

        const lang = getUserLang(userId);
        const calcHeader = lang === 'en' ? "🧮 **INTERACTIVE CALCULATOR**\n\n" : "🧮 **ইন্টারেক্টিভ ক্যালকুলেটর**\n\n";

        await ctx.editMessageText(calcHeader + "Screen: `" + current + "`", {
            parse_mode: 'Markdown',
            ...getCalcKeyboard()
        });
    } catch (e) {}
});

bot.action(/clock_(bd|np|in|bt|mm|sa|uae|sg|qa|us|it|my)/, async (ctx) => {
    try {
        const country = ctx.match[1];
        const userId = ctx.from.id.toString();
        const lang = getUserLang(userId);

        const tzMap = {
            bd: 'Asia/Dhaka',
            np: 'Asia/Kathmandu',
            in: 'Asia/Kolkata',
            bt: 'Asia/Thimphu',
            mm: 'Asia/Yangon',
            sa: 'Asia/Riyadh',
            uae: 'Asia/Dubai',
            sg: 'Asia/Singapore',
            qa: 'Asia/Qatar',
            us: 'America/New_York',
            it: 'Europe/Rome',
            my: 'Asia/Kuala_Lumpur'
        };

        const nameMap = {
            bd: lang === 'en' ? '🇧🇩 Bangladesh' : '🇧🇩 বাংলাদেশ',
            np: lang === 'en' ? '🇳🇵 Nepal' : '🇳🇵 নেপাল',
            in: lang === 'en' ? '🇮🇳 India' : '🇮🇳 ভারত',
            bt: lang === 'en' ? '🇧🇹 Bhutan' : '🇧🇹 ভুটান',
            mm: lang === 'en' ? '🇲🇲 Myanmar' : '🇲🇲 মিয়ানমার',
            sa: lang === 'en' ? '🇸🇦 Saudi Arabia' : '🇸🇦 সৌদি আরব',
            uae: lang === 'en' ? '🇦🇪 UAE (Dubai)' : '🇦🇪 দুবাই (ইউএই)',
            sg: lang === 'en' ? '🇸🇬 Singapore' : '🇸🇬 সিঙ্গাপুর',
            qa: lang === 'en' ? '🇶🇦 Qatar' : '🇶🇦 কাতার',
            us: lang === 'en' ? '🇺🇸 USA (New York)' : '🇺🇸 আমেরিকা (নিউ ইয়র্ক)',
            it: lang === 'en' ? '🇮🇹 Italy' : '🇮🇹 ইতালি',
            my: lang === 'en' ? '🇲🇾 Malaysia' : '🇲🇾 মালয়েশিয়া'
        };

        const timeZone = tzMap[country];
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const dateStr = now.toLocaleDateString('en-GB', { timeZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const box = lang === 'en' ? 
            `🌍 **WORLD CLOCK**\n\n📌 Country: ${nameMap[country]}\n🕒 Time: \`${timeStr}\`\n📅 Date: \`${dateStr}\`` :
            `🌍 **ওয়ার্ল্ড ক্লক**\n\n📌 দেশ: ${nameMap[country]}\n🕒 সময়: \`${timeStr}\`\n📅 তারিখ: \`${dateStr}\``;

        await ctx.editMessageText(box, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(lang === 'en' ? '🔙 Back to Clock Menu' : '🔙 ক্লক মেনুতে ফিরুন', 'back_to_clock'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
        });
    } catch (e) {}
});

bot.action('back_to_clock', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const lang = getUserLang(userId);
        const clockTitle = lang === 'en' ? "🌍 **WORLD CLOCK & DATE**\n\n👇 Select country to view real-time time & date:" : "🌍 **ওয়ার্ল্ড ক্লক ও তারিখ**\n\n👇 রিয়েল-টাইম সময় ও তারিখ দেখতে দেশ সিলেক্ট করুন:";
        await ctx.editMessageText(clockTitle, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 Bangladesh', 'clock_bd'), Markup.button.callback('🇳🇵 Nepal', 'clock_np')],
                [Markup.button.callback('🇮🇳 India', 'clock_in'), Markup.button.callback('🇧🇹 Bhutan', 'clock_bt')],
                [Markup.button.callback('🇲🇲 Myanmar', 'clock_mm'), Markup.button.callback('🇸🇦 Saudi Arabia', 'clock_sa')],
                [Markup.button.callback('🇦🇪 UAE (Dubai)', 'clock_uae'), Markup.button.callback('🇸🇬 Singapore', 'clock_sg')],
                [Markup.button.callback('🇶🇦 Qatar', 'clock_qa'), Markup.button.callback('🇺🇸 USA', 'clock_us')],
                [Markup.button.callback('🇮🇹 Italy', 'clock_it'), Markup.button.callback('🇲🇾 Malaysia', 'clock_my')],
                [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

bot.action('open_lang_settings', async (ctx) => {
    try {
        await ctx.editMessageText(t(ctx.from.id.toString(), 'langSelectTitle'), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 বাংলা', 'set_lang_bn'), Markup.button.callback('🇬🇧 English', 'set_lang_en')],
                [Markup.button.callback(t(ctx.from.id.toString(), 'mainMenuBack'), 'back_start_inline')]
            ])
        });
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

        const successText = lang === 'en' ? '✅ Language successfully switched to English!' : '✅ সফলভাবে বাংলায় পরিবর্তন করা হয়েছে!';
        await ctx.answerCbQuery(successText);
        
        const profileBoxText = "╔═════════════════════════════════╗\n║         👤 USER PROFILE         ║\n╚═════════════════════════════════╝\n\n🆔 Telegram ID: `" + userId + "`\n💰 " + (lang === 'en' ? 'Current Balance' : 'বর্তমান ব্যালেন্স') + ": `৳" + (db.balances[userId] || 0) + "` 💳\n\n🌐 " + t(userId, 'changeLangPrompt');

        await ctx.editMessageText(profileBoxText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(t(userId, 'langBtn'), 'open_lang_settings')],
                [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });

        await ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

bot.action('shop_now_back', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (userId === ADMIN_ID.toString() && db.sessions[userId]) {
            db.sessions[userId].activeCategory = null;
            saveDatabase(db);
        }
        let inlineButtons = [[Markup.button.callback(t(userId, 'buyLikes'), 'cat_ff_likes')]];
        const catKeys = Object.keys(db.categories || {});
        if (catKeys.length > 0) {
            catKeys.forEach((c) => { 
                const translatedCat = translateCategoryName(c, userId);
                inlineButtons.push([Markup.button.callback(translatedCat, 'custom_cat_' + c)]); 
            });
        }
        inlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);

        await ctx.editMessageText(t(userId, 'shopMenuTitle'), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(inlineButtons)
        });
    } catch (e) {}
});

bot.action('cat_ff_likes', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (userId === ADMIN_ID.toString()) {
            if (!db.sessions[userId]) db.sessions[userId] = {};
            db.sessions[userId].activeCategory = 'Free Fire Likes';
            saveDatabase(db);
        }

        if (!db.customProducts) db.customProducts = {};
        if (!db.customProducts['Free Fire Likes']) db.customProducts['Free Fire Likes'] = [];

        let inlineButtons = [];
        db.customProducts['Free Fire Likes'].forEach((p, idx) => {
            const translatedProdName = translateProductName(p.name, userId);
            inlineButtons.push([Markup.button.callback(translatedProdName, 'sub_prod_Free Fire Likes_' + idx)]);
        });
        inlineButtons.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]);

        const lang = getUserLang(userId);
        const titleText = lang === 'en' ? 
            '🔥 **FREE FIRE LIKES PACKS**\n\n👇 Select package:' :
            '🔥 **ফ্রি ফায়ার লাইক প্যাকেজ**\n\n👇 প্যাকেজ সিলেক্ট করুন:';

        await ctx.editMessageText(titleText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(inlineButtons)
        });
    } catch (e) {}
});

bot.action(/custom_cat_(.+)/, async (ctx) => {
    try {
        const catName = ctx.match[1];
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (userId === ADMIN_ID.toString()) {
            if (!db.sessions[userId]) db.sessions[userId] = {};
            db.sessions[userId].activeCategory = catName;
            saveDatabase(db);
        }

        let inlineButtons = [];
        if (db.customProducts && db.customProducts[catName]) {
            db.customProducts[catName].forEach((p, idx) => {
                const translatedProdName = translateProductName(p.name, userId);
                inlineButtons.push([Markup.button.callback(translatedProdName, 'sub_prod_' + catName + '_' + idx)]);
            });
        }
        inlineButtons.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]);

        const lang = getUserLang(userId);
        const selectText = lang === 'en' ? '👇 Select package:' : '👇 প্যাকেজ সিলেক্ট করুন:';
        const displayCatName = translateCategoryName(catName, userId);

        await ctx.editMessageText("📂 **" + displayCatName.toUpperCase() + "**\n\n" + selectText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(inlineButtons)
        });
    } catch (e) {}
});

bot.action(/sub_prod_(.+)_(.+)/, async (ctx) => {
    try {
        const catName = ctx.match[1];
        const index = parseInt(ctx.match[2]);
        const userId = ctx.from.id.toString();
        const db = loadDatabase();

        const prod = db.customProducts[catName] && db.customProducts[catName][index] ? db.customProducts[catName][index] : { name: 'Custom Package' };
        const translatedProdName = translateProductName(prod.name, userId);

        let extractedPrice = 0;
        const tkMatch = prod.name.match(/[৳টka]\s*(\d+)/i) || prod.name.match(/(\d+)\s*[৳টka]/i);
        if (tkMatch && tkMatch[1]) {
            extractedPrice = parseInt(tkMatch[1]);
        } else {
            const allNumbers = prod.name.match(/\d+/g);
            if (allNumbers && allNumbers.length > 0) extractedPrice = parseInt(allNumbers[allNumbers.length - 1]);
        }

        let extractedProductId = '';
        const prodIdMatch = prod.name.match(/\[(AL-[A-Za-z0-9]+)\]/i) || prod.name.match(/(AL-[A-Za-z0-9]+)/i);
        if (prodIdMatch && prodIdMatch[1]) {
            extractedProductId = prodIdMatch[1];
        }

        if (!db.sessions) db.sessions = {};
        db.sessions[userId] = { 
            product: translatedProdName, 
            price: extractedPrice, 
            productId: extractedProductId,
            isInstant: catName === 'Free Fire Likes' || prod.name.toLowerCase().includes('likes') || prod.name.toLowerCase().includes('লাইক'),
            isGuild: catName.toLowerCase().includes('guild') || prod.name.toLowerCase().includes('squad') || prod.name.toLowerCase().includes('bot'),
            activeCategory: catName
        };
        saveDatabase(db);

        const lang = getUserLang(userId);
        const regionPrompt = lang === 'en' ? '👇 Select Region:' : '👇 রিজিওন সিলেক্ট করুন:';
        const backCallback = catName === 'Free Fire Likes' ? 'cat_ff_likes' : ('custom_cat_' + catName);

        await ctx.editMessageText(t(userId, 'serverTitle') + "`" + translatedProdName + "` (" + extractedPrice + " BDT)\n\n" + regionPrompt, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 BD (Bangladesh)', 'region_bd'), Markup.button.callback('🇮🇩 Indonesia', 'region_id')],
                [Markup.button.callback(t(userId, 'backBtn'), backCallback)]
            ])
        });
    } catch (e) {}
});

bot.action(/region_(bd|id)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const region = ctx.match[1].toUpperCase();
        const db = loadDatabase();
        if (db.sessions && db.sessions[userId]) {
            db.sessions[userId].region = region;
            db.sessions[userId].step = 'awaiting_uid';
            saveDatabase(db);
        }

        const lang = getUserLang(userId);
        const inputPrompt = db.sessions[userId] && db.sessions[userId].isGuild ? 
            (lang === 'en' ? '✍️ Send Guild ID:' : '✍️ গিল্ড আইডি পাঠান:') : 
            (lang === 'en' ? '✍️ Send Player UID:' : '✍️ প্লেয়ার ইউআইডি পাঠান:');

        await ctx.editMessageText(t(userId, 'enterIdTitle') + "`" + region + "`\n\n" + inputPrompt, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]])
        });
    } catch (e) {}
});

bot.action('confirm_order', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        const session = db.sessions && db.sessions[userId] ? db.sessions[userId] : null;
        if (!session) return ctx.answerCbQuery('❌ Session expired.', { show_alert: true });

        const userBal = db.balances[userId] || 0;
        if (userBal < session.price) {
            return ctx.answerCbQuery('❌ পর্যাপ্ত ব্যালেন্স নেই!', { show_alert: true });
        }

        db.balances[userId] -= Number(session.price);
        saveDatabase(db);

        const lang = getUserLang(userId);
        const isAutoApiOn = db.settings && db.settings.autoApiEnabled;
        
        // Check if the product is explicitly supported by LikesFF API (e.g. checks if product name/details match API-supported quantities like 220, 540, 1100 etc.)
        const prodNameLower = (session.product || '').toLowerCase();
        const isApiSupportedQuantity = prodNameLower.includes('220') || prodNameLower.includes('540') || prodNameLower.includes('1100') || prodNameLower.includes('2200') || prodNameLower.includes('5500') || session.productId;
        const isApiSupportedProduct = session.activeCategory === 'Free Fire Likes' && isApiSupportedQuantity;

        // Intelligent Smart Routing: If Auto API is OFF OR Product is NOT in API-supported quantity list (e.g. 100 Likes pack), instantly bypass API in 3-4 seconds and route to admin panel
        if (!isAutoApiOn || !isApiSupportedProduct) {
            if (!db.adminSessions) db.adminSessions = {};
            const uniqueOrderId = userId + '_' + Date.now();
            const idLabel = session.isGuild ? '🛡 Guild ID' : '🎮 UID';
            
            const processingTitle = lang === 'en' ? '⏳ Order is processing...\n\n' : '⏳ অর্ডার প্রসেসিং হচ্ছে...\n\n';
            const procMsg = await ctx.editMessageText(processingTitle + `▰▱▱▱▱▱▱▱▱▱ [ 20% ]`, { parse_mode: 'Markdown' });

            const steps = [
                { per: 40, bar: '▰▰▰▱▱▱▱▱▱▱' },
                { per: 80, bar: '▰▰▰▰▰▰▰▱▱▱' }
            ];

            let sIdx = 0;
            const fastInterval = setInterval(async () => {
                if (sIdx < steps.length) {
                    const currentStep = steps[sIdx];
                    try {
                        await ctx.telegram.editMessageText(userId, procMsg.message_id, null, processingTitle + `${currentStep.bar} [ ${currentStep.per}% ]`, { parse_mode: 'Markdown' });
                    } catch (err) {}
                    sIdx++;
                } else {
                    clearInterval(fastInterval);
                }
            }, 300);

            setTimeout(async () => {
                clearInterval(fastInterval);
                const adminNotifyText = "🔔 **নতুন ম্যানুয়াল অর্ডার (এপিআই এর বাইরে - ইনস্ট্যান্ট)**\n\n👤 Customer: " + ctx.from.first_name + "\n🆔 ID: `" + userId + "`\n\n📦 Product: `" + session.product + "` (" + session.region + ")\n👤 Name: `" + (session.nickname || 'N/A') + "`\n" + idLabel + ": `" + session.uid + "`\n💵 Price: `৳" + session.price + "`\n\n👇 নিচের বাটনে ক্লিক করে ডিটেইলস দিন:";

                const sentAdminMsg = await bot.telegram.sendMessage(ADMIN_ID, adminNotifyText, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('✏️ Enter Details', 'admin_input_' + uniqueOrderId)],
                        [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
                    ])
                }).catch(() => {});

                db.adminSessions[uniqueOrderId] = {
                    targetUserId: userId,
                    loadingMessageId: procMsg.message_id,
                    adminMsgId: sentAdminMsg ? sentAdminMsg.message_id : null,
                    product: session.product,
                    nickname: session.nickname || 'N/A',
                    uid: session.uid,
                    region: session.region,
                    price: session.price,
                    isGuild: session.isGuild,
                    holdIntervalRef: null
                };
                saveDatabase(db);

                const instantForwardText = lang === 'en' ? 
                    `⏳ Order forwarded to admin for manual processing.` :
                    `⏳ আপনার অর্ডারটি সফলভাবে প্রসেসিংয়ের জন্য পাঠানো হয়েছে।`;

                await ctx.telegram.editMessageText(userId, procMsg.message_id, null, instantForwardText, { parse_mode: 'Markdown' }).catch(() => {});
            }, 1000);

            delete db.sessions[userId];
            saveDatabase(db);
            return;
        }

        const processingTitle = lang === 'en' ? '⏳ API Auto-Processing...\n\n' : '⏳ এপিআই অটো-প্রসেসিং হচ্ছে...\n\n';
        const procMsg = await ctx.editMessageText(processingTitle + `▰▱▱▱▱▱▱▱▱▱ [ 25% ]`, { parse_mode: 'Markdown' });

        let apiParams = {};
        if (session.isInstant) {
            apiParams = { action: 'like', uid: session.uid, server: session.region };
        } else {
            apiParams = { action: 'auto', product: session.productId || 'AL-55F71F', uid: session.uid, server: session.region };
        }

        // Call API with 30 Seconds Max Timeout Guard for API-supported packages
        const apiRes = await callLikesFFApiWithTimeout(apiParams, 30000);

        try {
            await ctx.telegram.editMessageText(userId, procMsg.message_id, null, processingTitle + `▰▰▰▰▰▰▰▰▰▰ [ 100% ]`, { parse_mode: 'Markdown' });
        } catch (err) {}

        if (apiRes.success) {
            const orderId = apiRes.order_id || 'RES-' + Math.floor(10000 + Math.random() * 90000);
            const playerNick = apiRes.player_name || session.nickname || 'Player';
            const statusVal = apiRes.status || 'Completed';
            const currentBal = db.balances[userId] || 0;

            const apiPrevLikes = apiRes.previous_likes !== undefined ? apiRes.previous_likes : (apiRes.old_likes !== undefined ? apiRes.old_likes : '---');
            const apiCurrLikes = apiRes.current_likes !== undefined ? apiRes.current_likes : (apiRes.new_likes !== undefined ? apiRes.new_likes : '---');
            const apiAddedLikes = apiRes.added_likes !== undefined ? apiRes.added_likes : '---';

            if (!db.orderHistories[userId]) db.orderHistories[userId] = [];
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' });
            const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });

            db.orderHistories[userId].push({
                timestamp: now.getTime(),
                date: dateStr,
                time: timeStr,
                product: session.product,
                uid: session.uid,
                nickname: playerNick,
                region: session.region,
                price: session.price
            });
            if (db.orderHistories[userId].length > 10) {
                db.orderHistories[userId].shift();
            }
            saveDatabase(db);

            const receiptBox = lang === 'en' ? 
                `💠 ════════════════════════════ 💠\n           ✅ ORDER COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Product: \`${session.product}\`\n\n🆔 Order ID: \`${orderId}\`\n\n👤 Name: \`${playerNick}\`\n🛡 UID: \`${session.uid}\`\n🌐 Server: \`${session.region}\`\n📊 Status: \`${statusVal}\`\n\n📌 Previous Likes: ${apiPrevLikes}\n💖 Current Likes: ${apiCurrLikes}\n🚀 Added Likes: ${apiAddedLikes}\n\n🪶 Deducted: \`${session.price} BDT\`\n💰 Current Balance: \`${currentBal} BDT\`\n\n⚠️ *Note: You can take Daily likes on this UID after 24 hours.*\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙` :
                `💠 ════════════════════════════ 💠\n           ✅ অর্ডার সফলভাবে সম্পন্ন\n💠 ════════════════════════════ 💠\n\n📦 প্যাকেজ: \`${session.product}\`\n\n🆔 অর্ডার আইডি: \`${orderId}\`\n\n👤 নাম: \`${playerNick}\`\n🛡 ইউআইডি: \`${session.uid}\`\n🌐 সার্ভার: \`${session.region}\`\n📊 স্ট্যাটাস: \`${statusVal}\`\n\n📌 পূর্বের লাইক: ${apiPrevLikes}\n💖 বর্তমান লাইক: ${apiCurrLikes}\n🚀 অ্যাড লাইক: ${apiAddedLikes}\n\n🪶 কাটা হয়েছে: \`${session.price} টাকাচিহ্ন\n💰 বর্তমান ব্যালেন্স: \`${currentBal} টাকাচিহ্ন\n\n⚠️ *নোট: এই UID তে ২৪ ঘণ্টা পর আবার Daily লাইক নিতে পারবেন।*\n\n💠 ════════════════════════════ 💠\nSIR TOPUP এর সাথেই থাকুন 💙`;

            setTimeout(async () => {
                await ctx.telegram.editMessageText(userId, procMsg.message_id, null, receiptBox, { 
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(lang === 'en' ? '🔙 Main Menu 🏠' : '🔙 মূল মেনু 🏠', 'back_start_inline')]])
                }).catch(() => {});
            }, 500);

            // Duplicate Receipt to Admin ID (Works for both API and Manual completion)
            const adminDuplicateMsg = "📋 **[ডুপ্লিকেট কপি - সফল অর্ডার রিসিট]**\n\n" + receiptBox + "\n\n👤 **Customer ID:** `" + userId + "`";
            await bot.telegram.sendMessage(ADMIN_ID, adminDuplicateMsg, { parse_mode: 'Markdown' }).catch(() => {});

        } else {
            // API failed or 30s Timeout occurred -> Fallback to Admin Panel automatically!
            if (!db.adminSessions) db.adminSessions = {};
            const uniqueOrderId = userId + '_' + Date.now();
            const idLabel = session.isGuild ? '🛡 Guild ID' : '🎮 UID';

            const adminNotifyText = "⚠️ **[API TIMEOUT / FAIL] - অটো অর্ডার ফলব্যাক হয়ে এসেছে**\n\n👤 Customer: " + ctx.from.first_name + "\n🆔 ID: `" + userId + "`\n\n📦 Product: `" + session.product + "` (" + session.region + ")\n👤 Name: `" + (session.nickname || 'N/A') + "`\n" + idLabel + ": `" + session.uid + "`\n💵 Price: `৳" + session.price + "`\n\n👇 এপিআই রেসপন্স না করায় অর্ডারটি আপনার কাছে পাঠানো হয়েছে। নিচের বাটন থেকে কমপ্লিট বা ক্যানসেল করুন:";

            const sentAdminMsg = await bot.telegram.sendMessage(ADMIN_ID, adminNotifyText, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Enter Details', 'admin_input_' + uniqueOrderId)],
                    [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
                ])
            }).catch(() => {});

            db.adminSessions[uniqueOrderId] = {
                targetUserId: userId,
                loadingMessageId: procMsg.message_id,
                adminMsgId: sentAdminMsg ? sentAdminMsg.message_id : null,
                product: session.product,
                nickname: session.nickname || 'N/A',
                uid: session.uid,
                region: session.region,
                price: session.price,
                isGuild: session.isGuild,
                holdIntervalRef: null
            };
            saveDatabase(db);

            const fallbackNotifyText = lang === 'en' ? 
                `⏳ API is busy. Your order has been forwarded to admin for manual processing.` :
                `⏳ এপিআই সার্ভার ব্যস্ত থাকায় আপনার অর্ডারটি অ্যাডমিনের কাছে পাঠানো হয়েছে। খুব দ্রুত সম্পন্ন হবে।`;

            await ctx.telegram.editMessageText(userId, procMsg.message_id, null, fallbackNotifyText, { parse_mode: 'Markdown' }).catch(() => {});
        }

        delete db.sessions[userId];
        saveDatabase(db);

    } catch (e) {
        console.error('Confirm Order Error:', e);
    }
});

bot.action('back_start_inline', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (db.sessions && db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        if (db.adminInputSession && db.adminInputSession[userId]) { delete db.adminInputSession[userId]; saveDatabase(db); }
        if (db.adminReplySessions && db.adminReplySessions[userId]) { delete db.adminReplySessions[userId]; saveDatabase(db); }
        if (db.calcStates && db.calcStates[userId]) { delete db.calcStates[userId]; saveDatabase(db); }
        
        const lang = getUserLang(userId);
        const backText = lang === 'en' ? '✨ Returned to main menu:' : '✨ মূল মেনুতে ফিরে এসেছেন:';
        await ctx.editMessageText(backText, { parse_mode: 'Markdown' }).catch(() => {});
    } catch (e) {}
});

const webhookPath = `/secret-path-${BOT_TOKEN.split(':')[0]}`;
const fullWebhookUrl = `${RENDER_URL}${webhookPath}`;

bot.telegram.setWebhook(fullWebhookUrl, { drop_pending_updates: true })
    .then(() => console.log(`Webhook set successfully to: ${fullWebhookUrl}`))
    .catch((err) => console.error('Webhook set error:', err));

const httpServer = http.createServer((req, res) => {
    if (req.url === webhookPath && req.method === 'POST') {
        bot.webhookCallback(webhookPath)(req, res);
    } else if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Bot is running live via Webhook!');
    }
});

httpServer.listen(PORT, () => {
    console.log(`HTTP Server listening on port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
