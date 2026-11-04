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

const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://st-like-sell-bot.onrender.com';
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;

const bot = new Telegraf(BOT_TOKEN);

let cachedDb = { users: {}, balances: {}, sessions: {}, numbers: {}, categories: {}, customProducts: {}, allowedUsers: {}, pendingMsgs: {}, orderHistories: {}, historyTimestamps: {}, userLang: {}, depositRequests: {}, adminReplySessions: {}, adminInputSession: {}, adminSessions: {} };

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
            langSelectTitle: "🌍 ভাষা নির্বাচন করুন:",
            shopNow: "🛍️ শপ নাও",
            checkUid: "🔍 ইউআইডি চেক",
            addBalance: "💰 ব্যালেন্স অ্যাড",
            myProfile: "👤 আমার প্রোফাইল",
            orderHistory: "📜 অর্ডার হিস্ট্রি",
            supportDesk: "📞 সাপোর্ট ডেস্ক",
            shopMenuTitle: "╔═════════════════════════════════╗\n║      🛍️ সকল উপলব্ধ সার্ভিস       ║\n╚═════════════════════════════════╝\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:",
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
            orderProcessing: "⏳ অর্ডার প্রসেসিং হচ্ছে...",
            uploadProofTitle: "✦ ─────────────── ✦ ─────────────── ✦\n       📸 পেমেন্ট প্রুফ আপলোড করুন\n✦ ─────────────── ✦ ─────────────── ✦\n\n✍️ আপনার বিকাশ বা নগদ পেমেন্টের স্ক্রিনশট অথবা ট্রানজেকশন আইডি (TrxID) এখন চ্যাটে সেন্ড করুন:",
            proofSubmittedStatus: "✦ ─────────────── ✦ ─────────────── ✦\n       🚀 প্রুফ সাবমিট সফল ✅\n✦ ─────────────── ✦ ─────────────── ✦\n\n💳 পেমেন্ট মাধ্যম: ",
            depositCancelledBox: "✦ ─────────────── ✦ ─────────────── ✦\n      ❌ ডিপোজিট বাতিল করা হয়েছে ❌\n✦ ─────────────── ✦ ─────────────── ✦\n\n⚠️ আপনার ডিপোজিট রিকোয়েস্টটি অ্যাডমিন কর্তৃক বাতিল করা হয়েছে।\n\n✦ ─────────────── ✦ ─────────────── ✦",
            balanceRechargedBox: "✦ ─────────────── ✦ ─────────────── ✦\n       💎 ব্যালেন্স রিচার্জ সফল 💎\n✦ ─────────────── ✦ ─────────────── ✦\n\nআপনার অ্যাকাউন্ট ব্যালেন্স সফলভাবে আপডেট করা হয়েছে! ✨\n\n-----------------------------------------\n📌 পূর্বের ব্যালেন্স: `",
            minDepositWarning: "⚠️═════════════════════════════════⚠️\n🛑 **সর্বনিম্ন ডিপোজিট সতর্কতা** 🛑\n⚠️═════════════════════════════════⚠️\n\nবট নিয়ম অনুযায়ী সর্বনিম্ন **১০০ টাকা** ডিপোজিট করতে হবে।\n\n❌ আপনার প্রদত্ত পরিমাণ: `",
            accountFoundTitle: "╔═════════════════════════════════╗\n║       🎉 অ্যাকাউন্ট পাওয়া গেছে     ║\n╚═════════════════════════════════╝\n\n👤 নাম: `",
            supportSentSuccess: "✨ আপনার মেসেজ বা স্ক্রিনশট সরাসরি অ্যাডমিনের কাছে পৌঁছে গেছে! দয়া করে অপেক্ষা করুন।",
            historyTitle: "📜 **অর্ডার ও ক্রয়ের ইতিহাস**\n\n",
            noHistory: "❌ এখনো কোনো অর্ডার সম্পন্ন হয়নি!\n\n"
        },
        en: {
            welcome: "╔═════════════════════════════════╗\n║     👑 ST LIKE ~ SELL BOT 👑      ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ ✨ Welcome! Welcome to our      │\n│ premium gaming service. 🚀       │\n├─────────────────────────────────┤\n│ 👇 Please use the menu below    │\n│ to choose your preferred service:│\n└─────────────────────────────────┘",
            profileTitle: "╔═════════════════════════════════╗\n║         👤 USER PROFILE         ║\n╚═════════════════════════════════╝",
            changeLangPrompt: "🌐 Click below to switch language:",
            langBtn: "🌐 Change Language",
            langSelectTitle: "🌍 Select Language:",
            shopNow: "🛍️ Shop Now",
            checkUid: "🔍 Check FF UID",
            addBalance: "💰 Add Balance",
            myProfile: "👤 My Profile",
            orderHistory: "📜 Order History",
            supportDesk: "📞 Support Desk",
            shopMenuTitle: "╔═════════════════════════════════╗\n║      🛍️ ALL AVAILABLE SHOP      ║\n╚═════════════════════════════════╝\n\n👇 Please select the buttons below to choose your preferred service:",
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
            orderProcessing: "⏳ Order is processing...",
            uploadProofTitle: "✦ ─────────────── ✦ ─────────────── ✦\n       📸 UPLOAD PAYMENT PROOF\n✦ ─────────────── ✦ ─────────────── ✦\n\n✍️ Please send your Bkash/Nagad payment screenshot or TrxID in chat now:",
            proofSubmittedStatus: "✦ ─────────────── ✦ ─────────────── ✦\n       🚀 PROOF SUBMITTED ✅\n✦ ─────────────── ✦ ─────────────── ✦\n\n💳 Method: ",
            depositCancelledBox: "✦ ─────────────── ✦ ─────────────── ✦\n      ❌ DEPOSIT CANCELLED ❌\n✦ ─────────────── ✦ ─────────────── ✦\n\n⚠️ Your deposit request has been cancelled by the admin.\n\n✦ ─────────────── ✦ ─────────────── ✦",
            balanceRechargedBox: "✦ ─────────────── ✦ ─────────────── ✦\n       💎 BALANCE RECHARGED 💎\n✦ ─────────────── ✦ ─────────────── ✦\n\nAccount balance updated successfully! ✨\n\n-----------------------------------------\n📌 Prev: `",
            minDepositWarning: "⚠️═════════════════════════════════⚠️\n🛑 **MINIMUM DEPOSIT WARNING** 🛑\n⚠️═════════════════════════════════⚠️\n\nMinimum deposit must be **100 BDT**.\n\n❌ Your amount: `",
            accountFoundTitle: "╔═════════════════════════════════╗\n║       🎉 ACCOUNT FOUND          ║\n╚═════════════════════════════════╝\n\n👤 Name: `",
            supportSentSuccess: "✨ Your message or screenshot has been sent directly to the admin! Please wait.",
            historyTitle: "📜 **PURCHASE & ORDER HISTORY**\n\n",
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
        ['📜 Order History', '📞 Support Desk']
    ] : [
        ['🛍️ শপ নাও', '🔍 ইউআইডি চেক'],
        ['💰 ব্যালেন্স অ্যাড', '👤 আমার প্রোফাইল'],
        ['📜 অর্ডার হিস্ট্রি', '📞 সাপোর্ট ডেস্ক']
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

        const text = ctx.message.text ? ctx.message.text.trim() : (ctx.message.caption ? ctx.message.caption.trim() : '');

        if (userId === ADMIN_ID.toString()) {
            if (text.startsWith('➕') || text.startsWith('❌') || text.startsWith('💳') || text.startsWith('📱') || text.startsWith('✏️') || text.startsWith('📊') || text.startsWith('📩') || text.startsWith('📢') || text.includes('Shop Now') || text.includes('শপ নাও') || text.includes('UID') || text.includes('ইউআইডি') || text.includes('ব্যালেন্স') || text.includes('প্রোফাইল') || text.includes('অর্ডার') || text.includes('সাপোর্ট')) {
                if (text !== '➕ Add Product' && text !== '❌ Remove Product' && text !== '✏️ Change Product Price') {
                    if (db.adminReplySessions && db.adminReplySessions[userId]) delete db.adminReplySessions[userId];
                    if (db.adminInputSession && db.adminInputSession[userId]) delete db.adminInputSession[userId];
                    if (db.sessions && db.sessions[userId]) {
                        const activeCat = db.sessions[userId].activeCategory;
                        db.sessions[userId] = { activeCategory: activeCat };
                    }
                    saveDatabase(db);
                }
            }

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

            const adminSession = db.adminInputSession[userId];
            if (adminSession && adminSession.step === 'awaiting_order_details') {
                const targetUserId = adminSession.targetUserId;
                const session = db.adminSessions[targetUserId];

                delete db.adminInputSession[userId];
                saveDatabase(db);

                if (session) {
                    const userBal = db.balances[targetUserId] || 0;
                    const lines = text.split('\n');
                    const prevStatus = lines[0] || '---';
                    const currStatus = lines[1] || '---';
                    const addedStatus = lines[2] || '---';

                    if (!db.orderHistories[targetUserId]) db.orderHistories[targetUserId] = [];
                    
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' });
                    const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });

                    db.orderHistories[targetUserId].push({
                        date: dateStr,
                        time: timeStr,
                        product: session.product,
                        uid: session.uid,
                        nickname: session.nickname,
                        region: session.region,
                        price: session.price
                    });
                    saveDatabase(db);

                    const idLabelText = session.isGuild ? '🛡 Guild ID' : '🆔 UID';
                    const lang = getUserLang(targetUserId);
                    
                    const finalSuccessBox = lang === 'en' ? 
                        `✦ ─────────────── ✦ ─────────────── ✦\n           ✅ ORDER COMPLETE\n✦ ─────────────── ✦ ─────────────── ✦\n\n📦 Product: \`${session.product}\`\n\n👤 Name: \`${session.nickname}\`\n\n${idLabelText}: \`${session.uid}\`\n\n🌐 Server: \`${session.region}\`\n\n✦ ─────────────── ✦ ─────────────── ✦\n\n📌 Previous: ${prevStatus}\n\n💖 Current: ${currStatus}\n\n🚀 Added/Note: ${addedStatus}\n\n✦ ─────────────── ✦ ─────────────── ✦\n\n🪶 Deducted: \`${session.price} BDT\`\n\n💰 Current Balance: \`${userBal} BDT\`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⏳ You can take Daily likes on this UID after 24 hours |\n\nStay with SIR TOPUP 💙\n✦ ─────────────── ✦ ─────────────── ✦` :
                        `✦ ─────────────── ✦ ─────────────── ✦\n           ✅ অর্ডার সম্পন্ন\n✦ ─────────────── ✦ ─────────────── ✦\n\n📦 প্যাকেজ: \`${session.product}\`\n\n👤 নাম: \`${session.nickname}\`\n\n${idLabelText}: \`${session.uid}\`\n\n🌐 সার্ভার: \`${session.region}\`\n\n✦ ─────────────── ✦ ─────────────── ✦\n\n📌 পূর্বের লাইক: ${prevStatus}\n\n💖 বর্তমান লাইক: ${currStatus}\n\n🚀 অ্যাড/নোট: ${addedStatus}\n\n✦ ─────────────── ✦ ─────────────── ✦\n\n🪶 কাটা হয়েছে: \`${session.price} টাকা\`\n\n💰 বর্তমান ব্যালেন্স: \`${userBal} টাকা\`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⏳ এই UID তে ২৪ ঘণ্টা পর আবার Daily লাইক নিতে পারবেন |\n\nSIR TOPUP এর পাশেই থাকুন 💙\n✦ ─────────────── ✦ ─────────────── ✦`;

                    try {
                        await bot.telegram.editMessageText(targetUserId, session.loadingMessageId, null, finalSuccessBox, { 
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([[Markup.button.callback(lang === 'en' ? '🔙 Main Menu 🏠' : '🔙 মূল মেনু 🏠', 'back_start_inline')]])
                        });

                        try {
                            await ctx.telegram.editMessageText(ADMIN_ID, session.adminMsgId, null, "╔═════════════════════════════════╗\n║    🔔 ORDER COMPLETED ✅        ║\n╚═════════════════════════════════╝\n\n🆔 Customer ID: `" + targetUserId + "`\n\n📦 Product: `" + session.product + "`\n\n**[STATUS: COMPLETED ✅]**", { parse_mode: 'Markdown' });
                        } catch (err) {}

                        delete db.adminSessions[targetUserId];
                        saveDatabase(db);
                        return ctx.reply('╔═════════════════════════════════╗\n║   ✅ অর্ডার সফলভাবে কমপ্লিট!    ║\n╚═════════════════════════════════╝\n\n🆔 User ID: `' + targetUserId + '`', { parse_mode: 'Markdown' });
                    } catch (e) {
                        return ctx.reply('❌ কাস্টমারের মেসেজ আপডেট করা যায়নি।');
                    }
                }
            }

            if (ctx.message.reply_to_message) {
                const repliedText = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
                const match = repliedText.match(/ID[^`]*`(\d+)`/) || repliedText.match(/আইডি[^`]*`(\d+)`/);
                if (match && match[1]) {
                    const targetUserId = match[1];

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

            if (text === '➕ Add Bot') {
                db.sessions[userId] = { step: 'admin_add_bot_prompt' };
                saveDatabase(db);
                return ctx.reply("╔═════════════════════════════════╗\n║     ➕ ADD BOT / PERMISSION     ║\n╚═════════════════════════════════╝\n\n✍️ যে ইউজারের আইডি বা ইউজারনেম পারমিশন দিতে চান তা লিখে পাঠান:\n*(উদাহরণ: `123456789`)*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
            }
            if (text === '❌ Remove Bot') {
                db.sessions[userId] = { step: 'admin_remove_bot_prompt' };
                saveDatabase(db);
                return ctx.reply("╔═════════════════════════════════╗\n║     ❌ REMOVE BOT ACCESS        ║\n╚═════════════════════════════════╝\n\n✍️ যে ইউজারের আইডি রিমুভ করতে চান তা পাঠান:", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
            }
            if (text === '💳 Add/Minus Balance') {
                db.sessions[userId] = { step: 'admin_balance_prompt' };
                saveDatabase(db);
                return ctx.reply("╔═════════════════════════════════╗\n║    🛠️ BALANCE MANAGEMENT        ║\n╚═════════════════════════════════╝\n\n✍️ ফরম্যাট: `[User_ID] [টাকার পরিমাণ]`\n*(উদাহরণ: `123456789 100`)*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
            }
            if (text === '📱 Set Payment Numbers') {
                return ctx.reply("╔═════════════════════════════════╗\n║    📱 PAYMENT SETUP PANEL       ║\n╚═════════════════════════════════╝\n\n👇 মাধ্যম সিলেক্ট করুন:", Markup.inlineKeyboard([
                    [Markup.button.callback('💳 বিকাশ [bKash]', 'set_bkash_prompt'), Markup.button.callback('💳 নগদ [Nagad]', 'set_nagad_prompt')],
                    [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
                ]));
            }
            if (text === '➕ Add Product') {
                const currentSub = db.sessions[userId] && db.sessions[userId].activeCategory ? db.sessions[userId].activeCategory : null;
                if (currentSub) {
                    db.sessions[userId] = { step: 'admin_add_sub_product', category: currentSub, activeCategory: currentSub };
                    saveDatabase(db);
                    return ctx.reply("╔═════════════════════════════════╗\n║     📦 ADD PACKAGE (" + currentSub + ") ║\n╚═════════════════════════════════╝\n\n✍️ নতুন প্যাকেজের নাম ও দাম পাঠান:\n*(উদাহরণ: `3 SQUAD BOT - ৳140`)*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
                } else {
                    db.sessions[userId] = { step: 'admin_add_category' };
                    saveDatabase(db);
                    return ctx.reply("╔═════════════════════════════════╗\n║     📦 ADD MAIN CATEGORY        ║\n╚═════════════════════════════════╝\n\n✍️ নতুন ক্যাটাগরির নাম লিখে পাঠান:\n*(উদাহরণ: `Guild Glory Bot`)*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
                }
            }
            if (text === '❌ Remove Product') {
                const currentSub = db.sessions[userId] && db.sessions[userId].activeCategory ? db.sessions[userId].activeCategory : null;
                if (currentSub) {
                    let listText = '╔═════════════════════════════════╗\n║     🗑️ REMOVE PACKAGE (' + currentSub + ') ║\n╚═════════════════════════════════╝\n\n✍️ যে প্যাকেজটি রিমুভ করতে চান, সেটির সঠিক নাম লিখে পাঠান:\n\n';
                    if (currentSub === 'Free Fire Likes' && (!db.customProducts['Free Fire Likes'])) db.customProducts['Free Fire Likes'] = [];
                    if (db.customProducts[currentSub] && db.customProducts[currentSub].length > 0) {
                        db.customProducts[currentSub].forEach((p, index) => { listText += (index + 1) + '. `' + p.name + '`\n'; });
                    } else {
                        listText += '⚠️ এই ক্যাটাগরিতে কোনো প্যাকেজ নেই।';
                    }
                    db.sessions[userId] = { step: 'admin_remove_sub_product', category: currentSub, activeCategory: currentSub };
                    saveDatabase(db);
                    return ctx.reply(listText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
                } else {
                    const catKeys = Object.keys(db.categories || {});
                    let listText = '╔═════════════════════════════════╗\n║      🗑️ REMOVE CATEGORY         ║\n╚═════════════════════════════════╝\n\n✍️ সম্পূর্ণ ক্যাটাগরি রিমুভ করতে সঠিক নামটি লিখে পাঠান:\n\n1. `Free Fire Likes`\n';
                    catKeys.forEach((c, index) => { listText += (index + 2) + '. `' + c + '`\n'; });
                    db.sessions[userId] = { step: 'admin_remove_category' };
                    saveDatabase(db);
                    return ctx.reply(listText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
                }
            }
            if (text === '✏️ Change Product Price') {
                const currentSub = db.sessions[userId] && db.sessions[userId].activeCategory ? db.sessions[userId].activeCategory : null;
                if (!currentSub) {
                    return ctx.reply('⚠️ প্রথমে শপ মেনু থেকে যে ক্যাটাগরির প্রোডাক্ট এডিট করতে চান সেটিতে প্রবেশ করুন, তারপর এই বাটনে ক্লিক করুন।', { parse_mode: 'Markdown' });
                }
                let listText = '╔═════════════════════════════════╗\n║   ✏️ UPDATE PACKAGE (' + currentSub + ') ║\n╚═════════════════════════════════╝\n\n✍️ ফরম্যাট: `[পুরাতন নাম/সিরিয়াল] | [নতুন নাম ও দাম]`\n\n👇 বর্তমান প্যাকেজগুলোর তালিকা:\n\n';
                const list = db.customProducts[currentSub] || [];
                if (list.length > 0) {
                    list.forEach((p, index) => { listText += (index + 1) + '. `' + p.name + '`\n'; });
                } else {
                    listText += '⚠️ এই ক্যাটাগরিতে কোনো প্যাকেজ নেই।';
                }
                db.sessions[userId] = { step: 'admin_update_sub_product', category: currentSub, activeCategory: currentSub };
                saveDatabase(db);
                return ctx.reply(listText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
            }
            if (text === '📊 Total Users') {
                const allowedIds = Object.keys(db.allowedUsers || {});
                if (allowedIds.length === 0) return ctx.reply('⚠️ কোনো ইউজার নেই।');
                let list = '╔═════════════════════════════════╗\n║    📊 TOTAL ACTIVE USERS (' + allowedIds.length + ')  ║\n╚═════════════════════════════════╝\n\n';
                allowedIds.forEach((uid, index) => {
                    const u = db.users[uid] || { first_name: 'Unknown', username: 'N/A' };
                    const bal = db.balances[uid] || 0;
                    list += (index + 1) + '. নাম: ' + u.first_name + ' (' + u.username + ')\n   ID: `' + uid + '`\n   Bal: `' + bal + ' BDT`\n\n';
                });
                return ctx.reply(list, { parse_mode: 'Markdown' });
            }
            if (text === '📩 Send Message') {
                db.sessions[userId] = { step: 'admin_send_msg_prompt' };
                saveDatabase(db);
                return ctx.reply("╔═════════════════════════════════╗\n║     📩 DIRECT MESSAGE PANEL     ║\n╚═════════════════════════════════╝\n\n✍️ ফরম্যাট: `[User_ID] [মেসেজ]`", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
            }
            if (text === '📢 All Users Msg') {
                db.sessions[userId] = { step: 'admin_broadcast_prompt' };
                saveDatabase(db);
                return ctx.reply("╔═════════════════════════════════╗\n║      📢 BROADCAST MESSAGE       ║\n╚═════════════════════════════════╝\n\n✍️ মেসেজটি লিখে পাঠান:", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
            }

            if (db.sessions[userId] && db.sessions[userId].step === 'admin_add_category') {
                db.categories[text] = true;
                if (!db.customProducts[text]) db.customProducts[text] = [];
                delete db.sessions[userId];
                saveDatabase(db);
                return ctx.reply('✅ নতুন ক্যাটাগরি সফলভাবে তৈরি করা হয়েছে: `' + text + '`', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_remove_category') {
                if (db.categories[text]) {
                    delete db.categories[text];
                    delete db.customProducts[text];
                    delete db.sessions[userId];
                    saveDatabase(db);
                    return ctx.reply('🗑️ ক্যাটাগরি রিমুভ সফল!', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
                } else {
                    return ctx.reply('❌ ক্যাটাগরি পাওয়া যায়নি। সঠিক নাম দিন।');
                }
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_add_sub_product') {
                const cat = db.sessions[userId].category;
                if (!db.customProducts[cat]) db.customProducts[cat] = [];
                db.customProducts[cat].push({ name: text });
                db.sessions[userId] = { activeCategory: cat };
                saveDatabase(db);
                return ctx.reply('✅ ক্যাটাগরির ভেতরে নতুন প্যাকেজ সফলভাবে যোগ করা হয়েছে!', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_remove_sub_product') {
                const cat = db.sessions[userId].category;
                const list = db.customProducts[cat] || [];
                const idx = list.findIndex(p => p.name.toLowerCase() === text.toLowerCase());
                if (idx > -1) {
                    list.splice(idx, 1);
                    db.customProducts[cat] = list;
                    db.sessions[userId] = { activeCategory: cat };
                    saveDatabase(db);
                    return ctx.reply('🗑️ প্যাকেজ রিমুভ সফল!', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
                } else {
                    return ctx.reply('❌ প্যাকেজটি পাওয়া যায়নি।');
                }
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_update_sub_product') {
                const cat = db.sessions[userId].category;
                const parts = text.split('|').map(s => s.trim());
                if (parts.length < 2) return ctx.reply('❌ সঠিক ফরম্যাটে দিন! যেমন: `1 | 220 Likes - ৳5`');
                const list = db.customProducts[cat] || [];
                let targetIdx = !isNaN(parts[0]) ? parseInt(parts[0]) - 1 : list.findIndex(p => p.name.toLowerCase() === parts[0].toLowerCase());
                if (targetIdx >= 0 && targetIdx < list.length) {
                    list[targetIdx].name = parts[1];
                    db.customProducts[cat] = list;
                    db.sessions[userId] = { activeCategory: cat };
                    saveDatabase(db);
                    return ctx.reply('✨ প্যাকেজের নাম ও দাম সফলভাবে আপডেট করা হয়েছে!', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
                } else {
                    return ctx.reply('❌ প্যাকেজ খুঁজে পাওয়া যায়নি।');
                }
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_add_bot_prompt') {
                let targetId = text.replace('@', '').trim();
                db.allowedUsers[targetId] = true;
                delete db.sessions[userId];
                saveDatabase(db);
                return ctx.reply('✅ এক্সেস পারমিশন সফলভাবে দেওয়া হয়েছে।', { parse_mode: 'Markdown' });
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_remove_bot_prompt') {
                let targetId = text.replace('@', '').trim();
                delete db.allowedUsers[targetId];
                delete db.orderHistories[targetId];
                delete db.historyTimestamps[targetId];
                delete db.sessions[userId];
                saveDatabase(db);
                return ctx.reply('🗑️ অ্যাক্সেস রিমুভ করা হয়েছে।', { parse_mode: 'Markdown' });
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_send_msg_prompt') {
                const firstSpace = text.indexOf(' ');
                if (firstSpace !== -1) {
                    const targetId = text.substring(0, firstSpace).trim();
                    const messageToSend = text.substring(firstSpace + 1).trim();
                    delete db.sessions[userId];
                    saveDatabase(db);
                    try {
                        await bot.telegram.sendMessage(targetId, "╔═════════════════════════════════╗\n║      📢 OFFICIAL NOTICE         ║\n╚═════════════════════════════════╝\n\n" + messageToSend, { parse_mode: 'Markdown' });
                        return ctx.reply('✅ মেসেজ পাঠানো হয়েছে।');
                    } catch (e) {
                        return ctx.reply('❌ পাঠানো যায়নি।');
                    }
                }
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_broadcast_prompt') {
                delete db.sessions[userId];
                saveDatabase(db);
                const userKeys = Object.keys(db.allowedUsers || {});
                let count = 0;
                for (const uid of userKeys) {
                    try { await bot.telegram.sendMessage(uid, "📢 " + text, { parse_mode: 'Markdown' }); count++; } catch (e) {}
                }
                return ctx.reply('✅ ব্রডকাস্ট সফল! মোট ' + count + ' জনের কাছে গেছে।');
            }
            if (db.sessions[userId] && db.sessions[userId].step === 'admin_balance_prompt') {
                const parts = text.split(' ');
                if (parts.length >= 2) {
                    const targetId = parts[0].trim();
                    const amount = parseFloat(parts[1]);
                    if (!db.balances[targetId]) db.balances[targetId] = 0;
                    db.balances[targetId] += amount;
                    const curBal = db.balances[targetId];
                    delete db.sessions[userId];
                    saveDatabase(db);
                    bot.telegram.sendMessage(targetId, "💎 ব্যালেন্স আপডেট হয়েছে! বর্তমান ব্যালেন্স: `" + curBal + " BDT`", { parse_mode: 'Markdown' }).catch(()=>{});
                    return ctx.reply('✅ ব্যালেন্স আপডেট সফল। বর্তমান ব্যালেন্স: ' + curBal + ' BDT');
                }
            }
            if (db.sessions[userId] && db.sessions[userId].step && db.sessions[userId].step.startsWith('waiting_set_')) {
                const method = db.sessions[userId].step.replace('waiting_set_', '');
                db.numbers[method] = text;
                delete db.sessions[userId];
                saveDatabase(db);
                return ctx.reply('✅ নম্বর আপডেট হয়েছে: ' + text, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
            }
        }

        const session = db.sessions[userId];
        if (session && session.step === 'awaiting_deposit_amount') {
            const amount = parseFloat(text);
            const lang = getUserLang(userId);
            if (isNaN(amount) || amount <= 0) {
                const errPrompt = lang === 'en' ? '❌ Please send a valid amount (e.g., `100`).' : '❌ সঠিক অ্যামাউন্ট পাঠান (যেমন: `100`)।';
                return ctx.reply(errPrompt, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(lang === 'en' ? '❌ Cancel ❌' : '❌ বাতিল ❌', 'back_start_inline')]]) });
            }
            if (amount < 100) {
                const warnBox = t(userId, 'minDepositWarning') + amount + " BDT`";
                return ctx.reply(warnBox, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
            }

            const method = session.method;
            const rawNumber = db.numbers[method] || '01772665599';
            session.amount = amount;
            session.step = 'awaiting_deposit_proof';
            saveDatabase(db);

            const slipText = lang === 'en' ? 
                `✦ ─────────────── ✦ ─────────────── ✦\n       💰 ${method.toUpperCase()} DEPOSIT PORTAL 💰\n✦ ─────────────── ✦ ─────────────── ✦\n\n💵 Amount: \`${amount}.0 BDT\`\n\n1️⃣ Open ${method.toUpperCase()} App.\n2️⃣ Send Money to official number.\n3️⃣ Send Screenshot or TrxID.\n\n-----------------------------------------\n📞 Number (Tap to Copy):\n\n\`${rawNumber}\`\n\n-----------------------------------------\n✦ ─────────────── ✦ ─────────────── ✦` :
                `✦ ─────────────── ✦ ─────────────── ✦\n       💰 ${method.toUpperCase()} ডিপোজিট পোর্টাল 💰\n✦ ─────────────── ✦ ─────────────── ✦\n\n💵 পরিমাণ: \`${amount}.0 টাকা\`\n\n1️⃣ আপনার ${method.toUpperCase()} অ্যাপ ওপেন করুন।\n2️⃣ অফিশিয়াল নম্বরে সেন্ড মনি করুন।\n3️⃣ স্ক্রিনশট অথবা TrxID পাঠান।\n\n-----------------------------------------\n📞 অফিশিয়াল নম্বর (কপি করতে ট্যাপ করুন):\n\n\`${rawNumber}\`\n\n-----------------------------------------\n✦ ─────────────── ✦ ─────────────── ✦`;

            const btnText = lang === 'en' ? '📸 Send Payment Proof / TrxID' : '📸 পেমেন্ট প্রুফ / TrxID পাঠান';
            const cancelBtnText = lang === 'en' ? '❌ Cancel ❌' : '❌ বাতিল ❌';

            return ctx.reply(slipText, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(btnText, 'send_proof_prompt_' + method + '_' + amount)],
                    [Markup.button.callback(cancelBtnText, 'back_start_inline')]
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

            const lang = getUserLang(userId);
            const statusWaitText = lang === 'en' ? '⏳ Status: Pending Verification...' : '⏳ স্ট্যাটাস: যাচাইকরণের অপেক্ষায়...';

            const clientMsgBox = t(userId, 'proofSubmittedStatus') + method.toUpperCase() + "\n" +
                                 (lang === 'en' ? '💵 Amount: `' : '💵 পরিমাণ: `') + amount + (lang === 'en' ? ' BDT`\n' : ' টাকা`\n') +
                                 (lang === 'en' ? '🔑 Proof / TrxID:\n`' : '🔑 প্রুফ / TrxID:\n`') + proofText + "`\n\n" +
                                 statusWaitText + "\n" +
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

            const adminInfo = "✦ ─────────────── ✦ ─────────────── ✦\n      📥 NEW DEPOSIT REQUEST\n✦ ─────────────── ✦ ─────────────── ✦\n\n👤 Name: " + (ctx.from.first_name || 'N/A') + "\n🔗 Username: " + (ctx.from.username ? '@' + ctx.from.username : 'N/A') + "\n🆔 ID: `" + userId + "`\n💳 Method: " + method.toUpperCase() + "\n💵 Request Amount: `" + amount + " BDT`\n🔑 Proof / TrxID:\n`" + proofText + "`\n\n✦ ─────────────── ✦ ─────────────── ✦";

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

        if (session && (session.step === 'awaiting_uid' || session.step === 'awaiting_uid_only')) {
            const isOnlyCheck = session.step === 'awaiting_uid_only';
            const uid = text;
            const lang = getUserLang(userId);
            
            if (isOnlyCheck) {
                // UID চেক করার সময় আগের সেই সুন্দর অ্যানিমেশন লজিক
                const checkTitle = lang === 'en' ? '⏳ Checking UID...\n\n' : '⏳ ইউআইডি চেক করা হচ্ছে...\n\n';
                const checkSteps = [20, 45, 65, 85];
                let cIdx = 0;

                let initPer = checkSteps[0];
                let initBar = '▰'.repeat(Math.floor(initPer / 10)) + '▱'.repeat(10 - Math.floor(initPer / 10));
                const waitMsg = await ctx.reply(checkTitle + `${initBar} [ ${initPer}% ]`, { parse_mode: 'Markdown' });

                const checkInterval = setInterval(async () => {
                    cIdx++;
                    if (cIdx < checkSteps.length) {
                        let per = checkSteps[cIdx];
                        let bar = '▰'.repeat(Math.floor(per / 10)) + '▱'.repeat(10 - Math.floor(per / 10));
                        try {
                            await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, checkTitle + `${bar} [ ${per}% ]`, { parse_mode: 'Markdown' });
                        } catch (e) {}
                    } else {
                        clearInterval(checkInterval);
                        try {
                            const nickname = await checkFreeFireUID(uid);
                            delete db.sessions[userId];
                            saveDatabase(db);
                            
                            let finalBar = '▰'.repeat(10) + '▱'.repeat(0);
                            await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, checkTitle + `${finalBar} [ 100% ]`, { parse_mode: 'Markdown' });

                            setTimeout(async () => {
                                const foundBox = t(userId, 'accountFoundTitle') + nickname + "`\n\n🆔 UID: `" + uid + "`";
                                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, foundBox, {
                                    parse_mode: 'Markdown',
                                    ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
                                }).catch(() => {});
                            }, 500);
                        } catch (error) {
                            await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, lang === 'en' ? '⚠️ API connection error.' : '⚠️ এপিআই কানেকশন এরর।').catch(() => {});
                        }
                    }
                }, 500);

                return;
            } else {
                if (session.isGuild) {
                    session.step = 'review_order';
                    session.uid = uid;
                    session.nickname = lang === 'en' ? 'Guild Order' : 'গিল্ড অর্ডার';
                    saveDatabase(db);

                    const userBal = db.balances[userId] || 0;
                    const slipText = t(userId, 'orderReviewTitle') + "\n\n┌─────────────────────────────────┐\n│ 📦 " + (lang === 'en' ? 'Product' : 'প্যাকেজ') + ": `" + session.product + "`\n\n│ 🛡 " + (lang === 'en' ? 'Guild ID' : 'গিল্ড আইডি') + ": `" + uid + "`\n\n│ 🌍 " + (lang === 'en' ? 'Server' : 'সার্ভার') + ": `" + session.region + "`\n\n│ 💳 " + (lang === 'en' ? 'Price' : 'মূল্য') + ": ৳" + session.price + "\n\n│ 💰 " + (lang === 'en' ? 'Balance' : 'ব্যালেন্স') + ": ৳" + userBal + "\n└─────────────────────────────────┘";

                    return ctx.reply(slipText, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]
                        ])
                    });
                } else {
                    // অর্ডার প্লেস করার সময় UID ভেরিফাই করার অ্যানিমেশন লজিক
                    const checkTitle = lang === 'en' ? '⏳ Verifying player info...\n\n' : '⏳ প্লেয়ার ইনফো যাচাই করা হচ্ছে...\n\n';
                    const checkSteps = [20, 45, 70, 90];
                    let cIdx = 0;

                    let initPer = checkSteps[0];
                    let initBar = '▰'.repeat(Math.floor(initPer / 10)) + '▱'.repeat(10 - Math.floor(initPer / 10));
                    const waitMsg = await ctx.reply(checkTitle + `${initBar} [ ${initPer}% ]`, { parse_mode: 'Markdown' });

                    const orderCheckInterval = setInterval(async () => {
                        cIdx++;
                        if (cIdx < checkSteps.length) {
                            let per = checkSteps[cIdx];
                            let bar = '▰'.repeat(Math.floor(per / 10)) + '▱'.repeat(10 - Math.floor(per / 10));
                            try {
                                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, checkTitle + `${bar} [ ${per}% ]`, { parse_mode: 'Markdown' });
                            } catch (e) {}
                        } else {
                            clearInterval(orderCheckInterval);
                            try {
                                const nickname = await checkFreeFireUID(uid);
                                session.step = 'review_order';
                                session.uid = uid;
                                session.nickname = nickname;
                                saveDatabase(db);

                                let finalBar = '▰'.repeat(10) + '▱'.repeat(0);
                                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, checkTitle + `${finalBar} [ 100% ]`, { parse_mode: 'Markdown' });

                                setTimeout(async () => {
                                    const userBal = db.balances[userId] || 0;
                                    const slipText = t(userId, 'orderReviewTitle') + "\n\n┌─────────────────────────────────┐\n│ 📦 " + (lang === 'en' ? 'Product' : 'প্যাকেজ') + ": `" + session.product + "`\n\n│ 👤 " + (lang === 'en' ? 'Name' : 'নাম') + ": `" + nickname + "`\n\n│ 🛡 " + (lang === 'en' ? 'UID' : 'ইউআইডি') + ": `" + uid + "`\n\n│ 🌍 " + (lang === 'en' ? 'Server' : 'সার্ভার') + ": `" + session.region + "`\n\n│ 💳 " + (lang === 'en' ? 'Price' : 'মূল্য') + ": ৳" + session.price + "\n\n│ 💰 " + (lang === 'en' ? 'Balance' : 'ব্যালেন্স') + ": ৳" + userBal + "\n└─────────────────────────────────┘";

                                    await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, slipText, {
                                        parse_mode: 'Markdown',
                                        ...Markup.inlineKeyboard([
                                            [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back')]
                                        ])
                                    }).catch(() => {});
                                }, 500);
                            } catch (error) {
                                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, lang === 'en' ? '⚠️ API connection error.' : '⚠️ এপিআই কানেকশন এরর।').catch(() => {});
                            }
                        }
                    }, 500);

                    return;
                }
            }
        }

        if (text === '🛍️ Shop Now' || text === '🛍️ শপ নাও') {
            const lang = getUserLang(userId);
            const successAlert = lang === 'en' ? '✅ Shop Opened Successfully! 🎉' : '✅ শপ সফলভাবে ওপেন হয়েছে! 🎉';

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

                // শপ মেনু থেকে লোডিং সরিয়ে সরাসরি ইনস্ট্যান্ট ওপেন করা হলো
                await ctx.reply(t(userId, 'shopMenuTitle'), {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(inlineButtons)
                });
            } catch (e) {
                console.error('Shop Menu Error:', e);
            }
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
            const profileBoxText = t(userId, 'profileTitle') + "\n\n🆔 Telegram ID: `" + userId + "`\n\n💰 " + (lang === 'en' ? 'Current Balance' : 'বর্তমান ব্যালেন্স') + ": `৳" + balance + "` 💳\n\n🌐 " + t(userId, 'changeLangPrompt');
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
                    historyBoxText += (index + 1) + ". 📦 **" + translateProductName(h.product, userId) + "**\n   🎮: `" + h.nickname + "`\n   🛡 UID: `" + h.uid + "`\n   💵: `" + h.price + " BDT`\n   🕒: `" + h.time + "` | 📅: `" + h.date + "`\n───────────────────\n";
                });
            }
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

            const adminSupportBox = "╔═════════════════════════════════╗\n║    📥 NEW CUSTOMER MESSAGE      ║\n╚═════════════════════════════════╝\n\n👤 Name: " + customerName + "\n🔗 Username: " + customerUsername + "\n🆔 ID: `" + userId + "`\n\n💬 Message:\n" + customerMsgContent;
            
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
        const db = loadDatabase();
        db.sessions[userId] = { step: 'awaiting_deposit_proof_input', method: ctx.match[1], amount: ctx.match[2] };
        saveDatabase(db);

        await ctx.editMessageText(t(userId, 'uploadProofTitle'), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(getUserLang(userId) === 'en' ? '❌ Cancel ❌' : '❌ বাতিল ❌', 'back_start_inline')]])
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
            const lang = getUserLang(targetUserId);
            const addedText = lang === 'en' ? '➕ Added: `+' : '➕ যোগ করা হয়েছে: `';
            const currentText = lang === 'en' ? '💰 Current: `' : '💰 বর্তমান ব্যালেন্স: `';

            const updatedClientBox = t(targetUserId, 'balanceRechargedBox') + previousBalance + (lang === 'en' ? ' BDT`\n\n' : ' টাকা`\n\n') +
                                     addedText + amount + (lang === 'en' ? ' BDT` 💵\n\n' : ' টাকা` 💵\n\n') +
                                     currentText + currentBalance + (lang === 'en' ? ' BDT` 💳\n\n' : ' টাকা` 💳\n\n') +
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

bot.action(/admin_reply_(.+)/, async (ctx) => {
    try {
        const targetUserId = ctx.match[1];
        const adminId = ctx.from.id.toString();
        if (adminId !== ADMIN_ID.toString()) return;

        const db = loadDatabase();
        if (!db.adminReplySessions) db.adminReplySessions = {};
        db.adminReplySessions[adminId] = { targetUserId: targetUserId };
        saveDatabase(db);

        await ctx.answerCbQuery('✍️ এখন চ্যাটে আপনার রিপ্লাই মেসেজটি লিখে পাঠান!');
        await ctx.reply("╔═════════════════════════════════╗\n║       💬 ADMIN REPLY            ║\n╚═════════════════════════════════╝\n\n✍️ ইউ আইডি: `" + targetUserId + "`\n\n👇 কাস্টমারের কাছে পাঠানোর জন্য আপনার উত্তরটি লিখে পাঠান:", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
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

        const lang = getUserLang(userId);
        const promptText = lang === 'en' ? 
            `╔═════════════════════════════════╗\n║     📥 ${method.toUpperCase()} DEPOSIT 📥     ║\n╚═════════════════════════════════╝\n\n✍️ Send amount (e.g., \`100\`):` :
            `╔═════════════════════════════════╗\n║     📥 ${method.toUpperCase()} ডিপোজিট 📥     ║\n╚═════════════════════════════════╝\n\n✍️ টাকার পরিমাণ পাঠান (যেমন: \`100\`):`;

        await ctx.editMessageText(promptText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(lang === 'en' ? '❌ Cancel ❌' : '❌ বাতিল ❌', 'back_start_inline')]])
        });
    } catch (e) {}
});

bot.action('set_bkash_prompt', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        if (userId !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.sessions[userId] = { step: 'waiting_set_bkash' };
        saveDatabase(db);
        await ctx.editMessageText('📱 বিকাশ নম্বর পাঠান:', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
    } catch (e) {}
});

bot.action('set_nagad_prompt', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        if (userId !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        db.sessions[userId] = { step: 'waiting_set_nagad' };
        saveDatabase(db);
        await ctx.editMessageText('📱 নগদ নম্বর পাঠান:', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
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
            '╔═════════════════════════════════╗\n║     🔥 FREE FIRE LIKES PACKS    ║\n╚═════════════════════════════════╝\n\n👇 Select package:' :
            '╔═════════════════════════════════╗\n║     🔥 ফ্রি ফায়ার লাইক প্যাকেজ    ║\n╚═════════════════════════════════╝\n\n👇 প্যাকেজ সিলেক্ট করুন:';

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

        await ctx.editMessageText("╔═════════════════════════════════╗\n║     📂 " + displayCatName.toUpperCase() + "     ║\n╚═════════════════════════════════╝\n\n" + selectText, {
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

        if (!db.sessions) db.sessions = {};
        db.sessions[userId] = { 
            product: translatedProdName, 
            price: extractedPrice, 
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

        db.balances[userId] -= session.price;
        if (!db.adminSessions) db.adminSessions = {};
        const idLabel = session.isGuild ? '🛡 Guild ID' : '🎮 UID';
        
        const lang = getUserLang(userId);
        const processingTitle = lang === 'en' ? '⏳ Order is processing...\n\n' : '⏳ অর্ডার প্রসেসিং হচ্ছে...\n\n';

        const procMsg = await ctx.editMessageText(processingTitle + `▰▰▰▰▱▱▱▱▱▱ [ 50% ]`, { parse_mode: 'Markdown' });

        const adminNotifyText = "✦ ─────────────── ✦ ─────────────── ✦\n          🔔 NEW ORDER PENDING\n✦ ─────────────── ✦ ─────────────── ✦\n\n👤 Customer: " + ctx.from.first_name + "\n🆔 ID: `" + userId + "`\n\n📦 Product: `" + session.product + "` (" + session.region + ")\n👤 Name: `" + session.nickname + "`\n" + idLabel + ": `" + session.uid + "`\n💵 Price: `৳" + session.price + "`\n\n👇 Click below to enter order details:";

        const sentAdminMsg = await bot.telegram.sendMessage(ADMIN_ID, adminNotifyText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Enter Details', 'admin_input_' + userId)],
                [Markup.button.callback('❌ Cancel', 'admin_can_' + userId)]
            ])
        }).catch(() => {});

        db.adminSessions[userId] = {
            loadingMessageId: procMsg.message_id,
            adminMsgId: sentAdminMsg ? sentAdminMsg.message_id : null,
            product: session.product,
            nickname: session.nickname || 'N/A',
            uid: session.uid,
            region: session.region,
            price: session.price,
            isGuild: session.isGuild
        };
        delete db.sessions[userId];
        saveDatabase(db);

    } catch (e) {}
});

bot.action(/admin_input_(.+)/, async (ctx) => {
    try {
        const targetUserId = ctx.match[1];
        const userId = ctx.from.id.toString();
        if (userId !== ADMIN_ID.toString()) return;
        const db = loadDatabase();
        if (!db.adminInputSession) db.adminInputSession = {};
        db.adminInputSession[userId] = { step: 'awaiting_order_details', targetUserId: targetUserId };
        saveDatabase(db);

        await ctx.answerCbQuery('✍️ 3 line order details pathan!');
        await ctx.reply("📝 অর্ডার ডিটেইলস চ্যাটে ৩ লাইনে পাঠান:\n1. Previous Status\n2. Current Status\n3. Added Status / Note", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
    } catch (e) {}
});

bot.action(/admin_can_(.+)/, async (ctx) => {
    try {
        const targetUserId = ctx.match[1];
        if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        await ctx.answerCbQuery('❌ Order cancelled!');
        await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n**[STATUS: CANCELLED ❌]**", { parse_mode: 'Markdown' });
        
        const dbObj = loadDatabase();
        if (dbObj.adminSessions && dbObj.adminSessions[targetUserId]) {
            const loadingMsgId = dbObj.adminSessions[targetUserId].loadingMessageId;
            const price = dbObj.adminSessions[targetUserId].price;
            
            if (!dbObj.balances[targetUserId]) dbObj.balances[targetUserId] = 0;
            dbObj.balances[targetUserId] += price;
            saveDatabase(dbObj);

            if (loadingMsgId) {
                const lang = getUserLang(targetUserId);
                const cancelRefundText = lang === 'en' ? 
                    "╔═════════════════════════════════╗\n║      ❌ ORDER CANCELLED         ║\n╚═════════════════════════════════╝\n\n⚠️ Your order has been cancelled and the amount has been refunded." :
                    "╔═════════════════════════════════╗\n║      ❌ অর্ডার বাতিল করা হয়েছে     ║\n╚═════════════════════════════════╝\n\n⚠️ আপনার অর্ডারটি বাতিল করা হয়েছে এবং টাকা রিফান্ড করা হয়েছে।";

                await bot.telegram.editMessageText(targetUserId, loadingMsgId, null, cancelRefundText, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(getUserLang(targetUserId) === 'en' ? '🔙 Main Menu 🏠' : '🔙 মূল মেনু 🏠', 'back_start_inline')]])
                }).catch(() => {});
            }
            delete dbObj.adminSessions[targetUserId];
            saveDatabase(dbObj);
        }
        const lang = getUserLang(targetUserId);
        await bot.telegram.sendMessage(targetUserId, lang === 'en' ? '❌ Your order has been cancelled.' : '❌ আপনার অর্ডারটি বাতিল করা হয়েছে।').catch(() => {});
    } catch (e) {}
});

bot.action('back_start_inline', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (db.sessions && db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        if (db.adminInputSession && db.adminInputSession[userId]) { delete db.adminInputSession[userId]; saveDatabase(db); }
        if (db.adminReplySessions && db.adminReplySessions[userId]) { delete db.adminReplySessions[userId]; saveDatabase(db); }
        
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
