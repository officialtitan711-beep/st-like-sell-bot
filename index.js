const { Telegraf, Markup } = require('telegraf');
const http = require('http');
const https = require('https');
require('dotenv').config();

// গ্লোবাল এরর হ্যান্ডলার
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

const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://st-like-sell-bot.onrender.com';
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;

const bot = new Telegraf(BOT_TOKEN);

let cachedDb = { users: {}, balances: {}, sessions: {}, numbers: {}, categories: {}, customProducts: {}, allowedUsers: {}, pendingMsgs: {}, orderHistories: {}, historyTimestamps: {}, userLang: {}, depositRequests: {} };

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
                    if (parsed) cachedDb = parsed;
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

function getUserLang(userId) {
    const db = loadDatabase();
    if (!db.userLang) db.userLang = {};
    return db.userLang[userId] || 'bn';
}

function t(userId, key) {
    const lang = getUserLang(userId);
    const dict = {
        bn: {
            welcome: "╔═════════════════════════════════╗\n║     👑 ST LIKE ~ SELL BOT 👑      ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ ✨ স্বাগতম! আমাদের প্রিমিয়াম গেমিং  │\n│ সার্ভিসে আপনাকে স্বাগতম জানাই। 🚀   │\n├─────────────────────────────────┤\n│ 👇 আপনার পছন্দের সার্ভিসটি বেছে  │\n│ নিতে নিচের মেনু ব্যবহার করুন:     │\n└─────────────────────────────────┘",
            profileTitle: "╔═════════════════════════════════╗\n║         👤 ব্যবহারকারী প্রোফাইল   ║\n╚═════════════════════════════════╝",
            changeLangPrompt: "🌐 ভাষা পরিবর্তন করতে চাইলে নিচের বাটনে চাপ দিন:",
            langBtn: "🌐 ভাষা পরিবর্তন",
            langSelectTitle: "🌍 Select Language / ভাষা নির্বাচন করুন:",
            shopNow: "🛍️ শপ নাও",
            checkUid: "🔍 ইউআইডি চেক",
            addBalance: "💰 ব্যালেন্স অ্যাড",
            myProfile: "👤 আমার প্রোফাইল",
            orderHistory: "📜 অর্ডার হিস্ট্রি",
            supportDesk: "📞 সাপোর্ট ডেস্ক",
            shopMenuTitle: "╔═════════════════════════════════╗\n║      🛍️ সকল উপলব্ধ সার্ভিস       ║\n╚═════════════════════════════════╝\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:",
            loadingShop: "⏳ শপ মেনু লোড হচ্ছে...\n\n▰▰▰▰▰▱▱▱▱▱▱ [ ৫০% ]",
            loadingShopDone: "⏳ শপ মেনু লোড হচ্ছে...\n\n▰▰▰▰▰▰▰▰▰▰ [ ১০০% ]\n\n✨ সফলভাবে লোড হয়েছে!",
            checkUidPrompt: "╔═════════════════════════════════╗\n║    🎮 ফ্রি ফায়ার ইউআইডি চেকার     ║\n╚═════════════════════════════════╝\n\n✍️ ইউআইডি লিখে পাঠান:",
            depositPortal: "╔═════════════════════════════════╗\n║   💰 ব্যালেন্স ও ডিপোজিট পোর্টাল  ║\n╚═════════════════════════════════╝\n\n┌─────────────────────────────────┐\n│ 💎 সর্বনিম্ন ডিপোজিট: `১০০.০ টাকা`  │\n└─────────────────────────────────┘\n\n👇 টাকা পাঠানোর জন্য যেকোনো মাধ্যম সিলেক্ট করুন:",
            supportText: "╔═════════════════════════════════╗\n║       📞 সাপোর্ট ডেস্ক 📞        ║\n╚═════════════════════════════════╝\n\n┌─────────────────────────────────┐\n│ 💡 আপনার যেকোনো সমস্যা, TrxID বা  │\n│ স্ক্রিনশট সরাসরি এই বটের চ্যাটেই   │\n│ লিখে বা পাঠিয়ে দিন!             │\n├─────────────────────────────────┤\n│ ⚡ অ্যাডমিন খুব দ্রুত আপনার সাথে   │\n│ যোগাযোগ করবেন। 👇              │\n└─────────────────────────────────┘",
            mainMenuBack: "🔙 মূল মেনু 🏠",
            backBtn: "🔙 পেছনের মেনু ↩️",
            buyLikes: "🔥 ফ্রি ফায়ার লাইক কিনুন ⚡",
            serverTitle: "╔═════════════════════════════════╗\n║      🌍 সার্ভার নির্বাচন         ║\n╚═════════════════════════════════╝\n\nপ্যাকেজ: ",
            enterIdTitle: "╔═════════════════════════════════╗\n║      🎮 আইডি ডিটেইলস দিন        ║\n╚═════════════════════════════════╝\n\nসার্ভার: ",
            orderReviewTitle: "╔═════════════════════════════════╗\n║         📦 অর্ডার রিভিউ         ║\n╚═════════════════════════════════╝",
            confirmOrderBtn: "✅ অর্ডার কনফার্ম করুন 🚀",
            orderProcessing: "⏳ অর্ডার রিকোয়েস্ট প্রসেসিং হচ্ছে...\n\n▰▰▱▱▱▱▱▱▱▱ [ ২০% ]",
            uploadProofTitle: "✦ ─────────────── ✦ ─────────────── ✦\n       📸 পেমেন্ট প্রুফ আপলোড করুন\n✦ ─────────────── ✦ ─────────────── ✦\n\n✍️ আপনার বিকাশ বা নগদ পেমেন্টের স্ক্রিনশট অথবা ট্রানজেকশন আইডি (TrxID) এখন চ্যাটে সেন্ড করুন:",
            proofSubmittedStatus: "✦ ─────────────── ✦ ─────────────── ✦\n       🚀 প্রুফ সাবমিট সফল ✅\n✦ ─────────────── ✦ ─────────────── ✦\n\n💳 মাধ্যম: ",
            depositCancelledBox: "✦ ─────────────── ✦ ─────────────── ✦\n      ❌ ডিপোজিট বাতিল করা হয়েছে ❌\n✦ ─────────────── ✦ ─────────────── ✦\n\n⚠️ আপনার ডিপোজিট রিকোয়েস্টটি অ্যাডমিন কর্তৃক বাতিল করা হয়েছে।\n\n✦ ─────────────── ✦ ─────────────── ✦",
            balanceRechargedBox: "✦ ─────────────── ✦ ─────────────── ✦\n       💎 ব্যালেন্স রিচার্জ সফল 💎\n✦ ─────────────── ✦ ─────────────── ✦\n\nঅ্যাকাউন্ট ব্যালেন্স সফলভাবে আপডেট হয়েছে! ✨\n\n-----------------------------------------\n📌 পূর্বের ব্যালেন্স: `"
        },
        en: {
            welcome: "╔═════════════════════════════════╗\n║     👑 ST LIKE ~ SELL BOT 👑      ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ ✨ Welcome! Welcome to our      │\n│ premium gaming service. 🚀       │\n├─────────────────────────────────┤\n│ 👇 Please use the menu below    │\n│ to choose your preferred service:│\n└─────────────────────────────────┘",
            profileTitle: "╔═════════════════════════════════╗\n║         👤 USER PROFILE         ║\n╚═════════════════════════════════╝",
            changeLangPrompt: "🌐 Click below to switch language:",
            langBtn: "🌐 Change Language",
            langSelectTitle: "🌍 Select Language / ভাষা নির্বাচন করুন:",
            shopNow: "🛍️ Shop Now",
            checkUid: "🔍 Check FF UID",
            addBalance: "💰 Add Balance",
            myProfile: "👤 My Profile",
            orderHistory: "📜 Order History",
            supportDesk: "📞 Support Desk",
            shopMenuTitle: "╔═════════════════════════════════╗\n║      🛍️ ALL AVAILABLE SHOP      ║\n╚═════════════════════════════════╝\n\n👇 Please select the buttons below to choose your preferred service:",
            loadingShop: "⏳ Loading Shop Menu...\n\n▰▰▰▰▰▱▱▱▱▱▱ [ 50% ]",
            loadingShopDone: "⏳ Loading Shop Menu...\n\n▰▰▰▰▰▰▰▰▰▰ [ 100% ]\n\n✨ Successfully Loaded!",
            checkUidPrompt: "╔═════════════════════════════════╗\n║    🎮 FREE FIRE UID CHECKER     ║\n╚═════════════════════════════════╝\n\n✍️ Send UID:",
            depositPortal: "╔═════════════════════════════════╗\n║   💰 ADD BALANCE & DEPOSIT 💰   ║\n╚═════════════════════════════════╝\n\n┌─────────────────────────────────┐\n│ 💎 Min Deposit: `100.0 BDT`       │\n└─────────────────────────────────┘\n\n👇 Choose any payment method below to transfer:",
            supportText: "╔═════════════════════════════════╗\n║       📞 SUPPORT DESK 📞        ║\n╚═════════════════════════════════╝\n\n┌─────────────────────────────────┐\n│ 💡 Send any issue, TrxID or     │\n│ screenshot directly in this     │\n│ bot chat!                       │\n├─────────────────────────────────┤\n│ ⚡ Admin will contact you       │\n│ very soon. 👇                   │\n└─────────────────────────────────┘",
            mainMenuBack: "🔙 Main Menu 🏠",
            backBtn: "🔙 Back ↩️",
            buyLikes: "🔥 Buy Free Fire Likes ⚡",
            serverTitle: "╔═════════════════════════════════╗\n║      🌍 SERVER SELECTION        ║\n╚═════════════════════════════════╝\n\nPackage: ",
            enterIdTitle: "╔═════════════════════════════════╗\n║      🎮 ENTER ID DETAILS        ║\n╚═════════════════════════════════╝\n\nServer: ",
            orderReviewTitle: "╔═════════════════════════════════╗\n║         📦 ORDER REVIEW         ║\n╚═════════════════════════════════╝",
            confirmOrderBtn: "✅ Confirm Order 🚀",
            orderProcessing: "⏳ Order request is processing...\n\n▰▰▱▱▱▱▱▱▱▱ [ 20% ]",
            uploadProofTitle: "✦ ─────────────── ✦ ─────────────── ✦\n       📸 UPLOAD PAYMENT PROOF\n✦ ─────────────── ✦ ─────────────── ✦\n\n✍️ Please send your Bkash/Nagad payment screenshot or TrxID in chat now:",
            proofSubmittedStatus: "✦ ─────────────── ✦ ─────────────── ✦\n       🚀 PROOF SUBMITTED ✅\n✦ ─────────────── ✦ ─────────────── ✦\n\n💳 Method: ",
            depositCancelledBox: "✦ ─────────────── ✦ ─────────────── ✦\n      ❌ DEPOSIT CANCELLED ❌\n✦ ─────────────── ✦ ─────────────── ✦\n\n⚠️ Your deposit request has been cancelled by the admin.\n\n✦ ─────────────── ✦ ─────────────── ✦",
            balanceRechargedBox: "✦ ─────────────── ✦ ─────────────── ✦\n       💎 BALANCE RECHARGED 💎\n✦ ─────────────── ✦ ─────────────── ✦\n\nAccount balance updated successfully! ✨\n\n-----------------------------------------\n📌 Prev: `"
        }
    };
    return dict[lang][key] || dict['bn'][key];
}

function getMainKeyboard(userId) {
    let keyboard = [
        [t(userId, 'shopNow'), t(userId, 'checkUid')],
        [t(userId, 'addBalance'), t(userId, 'myProfile')],
        [t(userId, 'orderHistory'), t(userId, 'supportDesk')]
    ];

    if (userId.toString() === ADMIN_ID.toString()) {
        keyboard.push(
            ['-----------------------------------'],
            ['➕ Add Bot', '❌ Remove Bot'],
            ['➕ Add Product', '❌ Remove Product'],
            ['✏️ Change Product Price', '💳 Add/Minus Balance'],
            ['📱 Set Payment Numbers', '📊 Total Users'],
            ['📩 Send Message', '📢 All Users Msg']
        );
    }
    return Markup.keyboard(keyboard).resize();
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
        text = "╔═════════════════════════════════╗\n║      ⏳ 50% ACCESS PENDING      ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ 🎉 **Congratulations!**          │\n│ আপনি **ST Like Bot**-এর ৫০% এক্সেস   │\n│ সফলভাবে পেয়েছেন। ✨               │\n├─────────────────────────────────┤\n│ ⚠️ বাকী ৫০% এক্সেস পেতে নিচের     │\n│ বাটনে ক্লিক করে অ্যাডমিনকে মেসেজ   │\n│ করে পারমিশন নিয়ে নিন।           │\n│ 👑 **Admin:** `@sonu1813`         │\n└─────────────────────────────────┘";
        keyboard = Markup.inlineKeyboard([
            [Markup.button.url('💬 Message Admin 🚀', 'https://t.me/sonu1813')]
        ]);
    } else {
        text = "╔═════════════════════════════════╗\n║    🚨 SECURITY LOCK & FORCE 🚨    ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ ⚠️ প্রিমিয়াম বট ব্যবহার করতে হলে   │\n│ আমাদের অফিশিয়াল চ্যানেলে যুক্ত      │\n│ থাকতে হবে!                      │\n├─────────────────────────────────┤\n│ 🔥 **ধাপসমূহ:**                  │\n│ 1️⃣ টেলিগ্রাম চ্যানেলে জয়েন করুন।   │\n│ 2️⃣ ইউটিউব চ্যানেল সাবস্ক্রাইব করুন।│\n│ 3️⃣ ভেরিফাই বাটনে ক্লিক করুন।       │\n└─────────────────────────────────┘";
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
            if (ctx.message && ctx.message.text && (ctx.message.text.startsWith('/start') || ctx.message.text === '🛍️ Shop Now' || ctx.message.text === '🛍️ শপ নাও')) return next();

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

        const text = ctx.message.text ? ctx.message.text.trim() : (ctx.message.caption ? ctx.message.caption.trim() : '');

        if (userId === ADMIN_ID.toString()) {
            const replySession = db.adminReplySessions[userId];
            if (replySession) {
                const targetUserId = replySession.targetUserId;
                delete db.adminReplySessions[userId];
                saveDatabase(db);

                try {
                    const adminReplyBox = "╔═════════════════════════════════╗\n" +
                                            "║   👑 OFFICIAL ADMIN REPLY 👑    ║\n" +
                                            "╚═════════════════════════════════╝\n" +
                                            "┌─────────────────────────────────┐\n" +
                                            "│ " + (ctx.message.text || ctx.message.caption || '📎 [Attachment / File]') + "\n" +
                                            "└─────────────────────────────────┘\n" +
                                            "✨ আপনার সহযোগিতায় সবসময় আমরা পাশে আছি।";

                    if (ctx.message.text) {
                        await bot.telegram.sendMessage(targetUserId, adminReplyBox, { parse_mode: 'Markdown' });
                    } else if (ctx.message.photo) {
                        const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                        await bot.telegram.sendPhoto(targetUserId, photoId, { caption: adminReplyBox, parse_mode: 'Markdown' });
                    } else {
                        await bot.telegram.copyMessage(targetUserId, ctx.chat.id, ctx.message.message_id);
                    }
                    return ctx.reply('╔═════════════════════════════════╗\n║  🚀 অ্যাডমিন রিপ্লাই সফল সেন্ড!  ║\n╚═════════════════════════════════╝', { parse_mode: 'Markdown' });
                } catch (e) {
                    return ctx.reply('❌ মেসেজ পাঠানো যায়নি। ইউজার কি বট ব্লক করেছে?');
                }
            }
        }

        const session = db.sessions[userId];
        if (session && session.step === 'awaiting_deposit_amount') {
            const amount = parseFloat(text);
            if (isNaN(amount) || amount <= 0) {
                return ctx.reply('❌ সঠিক অ্যামাউন্ট পাঠান (যেমন: `100`)।', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
            }
            if (amount < 100) {
                const alertText = "⚠️═════════════════════════════════⚠️\n🛑 **MINIMUM DEPOSIT WARNING** 🛑\n⚠️═════════════════════════════════⚠️\n\nসর্বনিম্ন **১০০ টাকা** (100 BDT) ডিপোজিট করতে হবে。\n\n❌ আপনার পরিমাণ: `" + amount + " BDT`";
                return ctx.reply(alertText, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔄 Try Again ⚡', 'dep_' + session.method)],
                        [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
                    ])
                });
            }

            const method = session.method;
            const rawNumber = db.numbers[method] || '01772665599';
            session.amount = amount;
            session.step = 'awaiting_deposit_proof';
            saveDatabase(db);

            const slipText = "✦ ─────────────── ✦ ─────────────── ✦\n" +
                             "       💰 " + method.toUpperCase() + " DEPOSIT PORTAL 💰\n" +
                             "✦ ─────────────── ✦ ─────────────── ✦\n\n" +
                             "💵 Amount: `" + amount + ".0 BDT`\n\n" +
                             "1️⃣ Open " + method.toUpperCase() + " App.\n" +
                             "2️⃣ Send Money to official number.\n" +
                             "3️⃣ Send Screenshot or TrxID.\n\n" +
                             "-----------------------------------------\n" +
                             "📞 Number (Tap to Copy):\n\n" +
                             "`" + rawNumber + "`\n\n" +
                             "-----------------------------------------\n" +
                             "✦ ─────────────── ✦ ─────────────── ✦";

            return ctx.reply(slipText, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📸 Send Payment Proof / TrxID', 'send_proof_prompt_' + method + '_' + amount)],
                    [Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]
                ])
            });
        }

        if (session && session.step === 'awaiting_deposit_proof_input') {
            const method = session.method;
            const amount = session.amount;
            const proofText = ctx.message.text || ctx.message.caption || '[Photo / Attachment]';
            const hasPhoto = !!ctx.message.photo;
            const photoId = hasPhoto ? ctx.message.photo[ctx.message.photo.length - 1].file_id : null;

            delete db.sessions[userId];
            saveDatabase(db);

            const clientMsgBox = t(userId, 'proofSubmittedStatus') + method.toUpperCase() + "\n" +
                                 "💵 Amount: `" + amount + " BDT`\n" +
                                 "🔑 Proof / TrxID:\n`" + proofText + "`\n\n" +
                                 "⏳ Status: Pending Verification...\n" +
                                 "✦ ─────────────── ✦ ─────────────── ✦";

            let sentClientMsg;
            if (hasPhoto) {
                sentClientMsg = await ctx.replyWithPhoto(photoId, {
                    caption: clientMsgBox,
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
                });
            } else {
                sentClientMsg = await ctx.reply(clientMsgBox, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
                });
            }

            const reqId = Date.now().toString();
            if (!db.depositRequests) db.depositRequests = {};
            db.depositRequests[reqId] = {
                userId: userId,
                amount: amount,
                method: method,
                proof: proofText,
                clientMsgId: sentClientMsg ? sentClientMsg.message_id : null
            };
            saveDatabase(db);

            const adminInfo = "✦ ─────────────── ✦ ─────────────── ✦\n" +
                              "      📥 NEW DEPOSIT REQUEST\n" +
                              "✦ ─────────────── ✦ ─────────────── ✦\n\n" +
                              "👤 Name: " + (ctx.from.first_name || 'N/A') + "\n" +
                              "🔗 Username: " + (ctx.from.username ? '@' + ctx.from.username : 'N/A') + "\n" +
                              "🆔 ID: `" + userId + "`\n" +
                              "💳 Method: " + method.toUpperCase() + "\n" +
                              "💵 Request Amount: `" + amount + " BDT`\n" +
                              "🔑 Proof / TrxID:\n`" + proofText + "`\n\n" +
                              "✦ ─────────────── ✦ ─────────────── ✦";

            const adminKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('✅ Confirm & Add ৳' + amount, 'dep_conf_' + reqId), Markup.button.callback('❌ Cancel', 'dep_canc_' + reqId)]
            ]);

            if (hasPhoto) {
                await bot.telegram.sendPhoto(ADMIN_ID, photoId, { caption: adminInfo, parse_mode: 'Markdown', ...adminKeyboard }).catch(()=>{});
            } else {
                await bot.telegram.sendMessage(ADMIN_ID, adminInfo, { parse_mode: 'Markdown', ...adminKeyboard }).catch(()=>{});
            }

            return;
        }

        if (text === '🛍️ Shop Now' || text === '🛍️ শপ নাও') {
            const loadingMsg = await ctx.reply(t(userId, 'loadingShop'));
            
            setTimeout(async () => {
                await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, t(userId, 'loadingShopDone')).catch(() => {});
            }, 600);

            setTimeout(async () => {
                if (userId === ADMIN_ID.toString() && db.sessions[userId]) {
                    db.sessions[userId].activeCategory = null;
                    saveDatabase(db);
                }
                let inlineButtons = [
                    [Markup.button.callback(t(userId, 'buyLikes'), 'cat_ff_likes')]
                ];

                const catKeys = Object.keys(db.categories || {});
                if (catKeys.length > 0) {
                    catKeys.forEach((c) => {
                        inlineButtons.push([Markup.button.callback(c, 'custom_cat_' + c)]);
                    });
                }

                inlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);

                await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, t(userId, 'shopMenuTitle'), {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(inlineButtons)
                }).catch(() => {});
            }, 1200);
            return;
        }

        if (text === '🔍 Check FF UID' || text === '🔍 ইউআইডি চেক') {
            db.sessions[userId] = { step: 'awaiting_uid_only' };
            saveDatabase(db);
            return ctx.reply(t(userId, 'checkUidPrompt'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '💰 Add Balance' || text === '💰 ব্যালেন্স অ্যাড') {
            const depositMenuText = t(userId, 'depositPortal');
            return ctx.reply(depositMenuText, { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '👤 My Profile' || text === '👤 আমার প্রোফাইল') {
            const balance = db.balances[userId] || 0;
            const lang = getUserLang(userId);
            const profileBoxText = t(userId, 'profileTitle') + "\n\n🆔 Telegram ID: `" + userId + "`\n\n💰 " + (lang === 'en' ? 'Current Balance' : 'বর্তমান ব্যালেন্স') + ": `৳" + balance + "` 💳\n\n🌐 " + t(userId, 'changeLangPrompt');
            
            return ctx.reply(profileBoxText, { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(t(userId, 'langBtn'), 'open_lang_settings')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (text === '📞 Support Desk' || text === '📞 সাপোর্ট ডেস্ক') {
            const supportInstructionBox = t(userId, 'supportText');
            return ctx.reply(supportInstructionBox, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (userId !== ADMIN_ID.toString()) {
            const customerName = ctx.from.first_name || 'N/A';
            const customerUsername = ctx.from.username ? '@' + ctx.from.username : 'N/A';
            const customerMsgContent = ctx.message.text || ctx.message.caption || '📎 [Attachment / File / Photo]';

            const adminSupportBox = "╔═════════════════════════════════╗\n" +
                                      "║    📥 NEW CUSTOMER MESSAGE      ║\n" +
                                      "╚═════════════════════════════════╝\n\n" +
                                      "┌─────────────────────────────────┐\n" +
                                      "│ 👤 Name: " + customerName + "\n" +
                                      "│ 🔗 Username: " + customerUsername + "\n" +
                                      "│ 🆔 ID: `" + userId + "`\n" +
                                      "├─────────────────────────────────┤\n" +
                                      "│ 💬 Message:\n" +
                                      "│ " + customerMsgContent + "\n" +
                                      "└─────────────────────────────────┘";
            
            try {
                if (ctx.message.photo) {
                    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                    await bot.telegram.sendPhoto(ADMIN_ID, photoId, { 
                        caption: adminSupportBox, 
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]
                        ])
                    });
                } else {
                    await bot.telegram.sendMessage(ADMIN_ID, adminSupportBox, { 
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]
                        ])
                    });
                }
            } catch (e) {}

            const customerUniqueBox = "╔═════════════════════════════════╗\n" +
                                       "║      ✨ SUPPORT DESK ✨         ║\n" +
                                       "╚═════════════════════════════════╝\n\n" +
                                       "┌─────────────────────────────────┐\n" +
                                       "│ 🚀 আপনার মেসেজ বা স্ক্রিনশট     │\n" +
                                       "│ সরাসরি অ্যাডমিনের কাছে পৌঁছে     │\n" +
                                       "│ গেছে!                           │\n" +
                                       "├─────────────────────────────────┤\n" +
                                       "│ ⏳ দয়া করে অপেক্ষা করুন, খুব       │\n" +
                                       "│ শীঘ্রই অ্যাডমিন আপনাকে রিপ্লাই  │\n" +
                                       "│ দেবেন। ধন্যবাদ! 🌟             │\n" +
                                       "└─────────────────────────────────┘";

            return ctx.reply(customerUniqueBox, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }
    } catch (err) {
        console.error('Message Handler Global Error:', err);
    }
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
        
        const profileBoxText = t(userId, 'profileTitle') + "\n\n🆔 Telegram ID: `" + userId + "`\n\n💰 " + (lang === 'en' ? 'Current Balance' : 'বর্তমান ব্যালেন্স') + ": `৳" + (db.balances[userId] || 0) + "` 💳\n\n🌐 " + t(userId, 'changeLangPrompt');

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

bot.action(/send_proof_prompt_(.+)_(.+)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const method = ctx.match[1];
        const amount = ctx.match[2];
        const db = loadDatabase();
        if (!db.sessions) db.sessions = {};
        db.sessions[userId] = { step: 'awaiting_deposit_proof_input', method: method, amount: amount };
        saveDatabase(db);

        await ctx.editMessageText(t(userId, 'uploadProofTitle'), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

bot.action(/dep_conf_(.+)/, async (ctx) => {
    try {
        const adminId = ctx.from.id.toString();
        if (adminId !== ADMIN_ID.toString()) return;
        const reqId = ctx.match[1];
        const db = loadDatabase();
        if (!db.depositRequests || !db.depositRequests[reqId]) {
            return ctx.answerCbQuery('❌ Request expired or already processed.', { show_alert: true });
        }

        const reqObj = db.depositRequests[reqId];
        const targetUserId = reqObj.userId;
        const amount = parseFloat(reqObj.amount);
        const clientMsgId = reqObj.clientMsgId;

        if (!db.balances) db.balances = {};
        if (!db.balances[targetUserId]) db.balances[targetUserId] = 0;
        const previousBalance = db.balances[targetUserId];
        db.balances[targetUserId] += amount;
        const currentBalance = db.balances[targetUserId];

        delete db.depositRequests[reqId];
        saveDatabase(db);

        await ctx.answerCbQuery('✅ Deposit confirmed and balance added!');
        await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n**[STATUS: CONFIRMED ✅ (Added ৳" + amount + ")]**", { parse_mode: 'Markdown' });

        if (clientMsgId) {
            const updatedClientBox = t(targetUserId, 'balanceRechargedBox') + previousBalance + " BDT`\n\n" +
                                     "➕ Added: `+" + amount + " BDT` 💵\n\n" +
                                     "💰 Current: `" + currentBalance + " BDT` 💳\n" +
                                     "-----------------------------------------\n\n" +
                                     "✦ ─────────────── ✦ ─────────────── ✦\n" +
                                     "👑 Admin: `@sonu1813`\n" +
                                     "✦ ─────────────── ✦ ─────────────── ✦";

            try {
                await bot.telegram.editMessageCaption(targetUserId, clientMsgId, null, updatedClientBox, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUserId, 'mainMenuBack'), 'back_start_inline')]])
                });
            } catch (err) {
                try {
                    await bot.telegram.editMessageText(targetUserId, clientMsgId, null, updatedClientBox, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUserId, 'mainMenuBack'), 'back_start_inline')]])
                    });
                } catch (e2) {}
            }
        }

        await ctx.reply('✅ ইউজারের ব্যালেন্স সফলভাবে অ্যাড করা হয়েছে। ইউজার আইডি: `' + targetUserId + '` | পরিমাণ: `৳' + amount + '`', { parse_mode: 'Markdown' });
    } catch (e) {}
});

bot.action(/dep_canc_(.+)/, async (ctx) => {
    try {
        const adminId = ctx.from.id.toString();
        if (adminId !== ADMIN_ID.toString()) return;
        const reqId = ctx.match[1];
        const db = loadDatabase();
        if (db.depositRequests && db.depositRequests[reqId]) {
            const reqObj = db.depositRequests[reqId];
            const targetUserId = reqObj.userId;
            const clientMsgId = reqObj.clientMsgId;

            delete db.depositRequests[reqId];
            saveDatabase(db);

            if (clientMsgId) {
                const cancelClientBox = t(targetUserId, 'depositCancelledBox');

                try {
                    await bot.telegram.editMessageCaption(targetUserId, clientMsgId, null, cancelClientBox, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUserId, 'mainMenuBack'), 'back_start_inline')]])
                    });
                } catch (err) {
                    try {
                        await bot.telegram.editMessageText(targetUserId, clientMsgId, null, cancelClientBox, {
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUserId, 'mainMenuBack'), 'back_start_inline')]])
                        });
                    } catch (e2) {}
                }
            }
        }

        await ctx.answerCbQuery('❌ Deposit request cancelled!');
        await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n**[STATUS: CANCELLED ❌]**", { parse_mode: 'Markdown' });
    } catch (e) {}
});

bot.action(/dep_(bkash|nagad)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const method = ctx.match[1];
        const db = loadDatabase();
        if (!db.sessions) db.sessions = {};
        db.sessions[userId] = { step: 'awaiting_deposit_amount', method: method };
        saveDatabase(db);

        await ctx.editMessageText("╔═════════════════════════════════╗\n║     📥 " + method.toUpperCase() + " DEPOSIT 📥     ║\n╚═════════════════════════════════╝\n\n✍️ অ্যামাউন্ট পাঠান (যেমন: `100`):", {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

bot.action('back_start_inline', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (db.sessions && db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        const lang = getUserLang(userId);
        const backText = lang === 'en' ? '✨ Returned to main menu:' : '✨ মূল মেনুতে ফিরে এসেছেন:';
        await ctx.editMessageText(backText, { parse_mode: 'Markdown' }).catch(() => {});
    } catch (e) {}
});

// Webhook & HTTP Server Configuration
const webhookPath = `/secret-path-${BOT_TOKEN.split(':')[0]}`;
const fullWebhookUrl = `${RENDER_URL}${webhookPath}`;

bot.telegram.setWebhook(fullWebhookUrl, { drop_pending_updates: true })
    .then(() => console.log(`Webhook set successfully to: ${fullWebhookUrl}`))
    .catch((err) => console.error('Webhook set error:', err));

const server = http.createServer((req, res) => {
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

server.listen(PORT, () => {
    console.log(`HTTP Server listening on port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
