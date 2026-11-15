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
    categories: ['🔥 Free Fire Likes ❤️‍🔥'], 
    customProducts: { 
        '🔥 Free Fire Likes ❤️‍🔥': [
            { name: '100 LIKE (Instant)' },
            { name: '220 LIKE (Instant)' },
            { name: '1100 LIKE (Auto 5 Days)' },
            { name: '3300 LIKE (Auto 15 Days)' },
            { name: '6600 LIKE (Auto 30 Days)' }
        ]
    }, 
    subscriptions: {}, 
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
    if (!cachedDb.categories || !Array.isArray(cachedDb.categories)) {
        cachedDb.categories = cachedDb.categories ? Object.keys(cachedDb.categories) : ['🔥 Free Fire Likes ❤️‍🔥'];
    }
    if (!cachedDb.customProducts) cachedDb.customProducts = {};
    if (!cachedDb.subscriptions) cachedDb.subscriptions = {};
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
                        if (parsed.categories) {
                            cachedDb.categories = Array.isArray(parsed.categories) ? parsed.categories : Object.keys(parsed.categories);
                        }
                        if (parsed.customProducts) cachedDb.customProducts = parsed.customProducts;
                        if (parsed.subscriptions) cachedDb.subscriptions = parsed.subscriptions;
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
                try { 
                    const parsed = JSON.parse(data);
                    resolve({ success: true, ...parsed });
                } catch (err) { 
                    if (data && data.length > 0) {
                        resolve({ success: true, raw: data });
                    } else {
                        resolve({ success: false, error: 'Empty Response' }); 
                    }
                }
            });
        });
        req.on('error', () => { if (!isFinished) { isFinished = true; resolve({ success: false, error: 'Failed' }); } });
        setTimeout(() => { if (!isFinished) { isFinished = true; req.destroy(); resolve({ success: false, error: 'Timeout' }); } }, timeoutMs);
    });
}

function checkFreeFireUID(uid) {
    return new Promise((resolve) => {
        const url = 'https://auraffxserverinfocheckerapi.onrender.com/api/player?uid=' + uid;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    let nickname = parsed.nickname || parsed.name || parsed.username || parsed.AccountName;
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

function getTodayDateBD() {
    const now = new Date();
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const year = bdTime.getFullYear();
    const month = String(bdTime.getMonth() + 1).padStart(2, '0');
    const day = String(bdTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCurrentHourBD() {
    const now = new Date();
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    return bdTime.getHours();
}

async function processDailySubscriptions() {
    const db = loadDatabase();
    if (!db.subscriptions) return;

    const currentHour = getCurrentHourBD();
    if (currentHour < 4) return; 

    const todayStr = getTodayDateBD();
    const subKeys = Object.keys(db.subscriptions);
    let isDbModified = false;

    for (const subId of subKeys) {
        const sub = db.subscriptions[subId];
        if (!sub) continue;

        if (sub.remainingDays <= 0) {
            delete db.subscriptions[subId];
            isDbModified = true;
            continue;
        }

        if (sub.lastDeliveredDate === todayStr) continue;

        if (db.settings && db.settings.autoApiEnabled) {
            const preCheck = await checkFreeFireUID(sub.uid);
            const prevLikes = preCheck.likes || 0;

            const apiParams = { action: 'auto', product: sub.productCode, uid: sub.uid, server: sub.region };
            const apiRes = await callLikesFFApiWithTimeout(apiParams, 30000);

            if (apiRes.success) {
                await new Promise(r => setTimeout(r, 35000));
                const postCheck = await checkFreeFireUID(sub.uid);
                const currLikes = postCheck.likes || prevLikes;
                const addedLikes = currLikes >= prevLikes ? (currLikes - prevLikes) : 0;

                const isLastDay = sub.remainingDays === 1;
                sub.remainingDays -= 1;
                sub.deliveredDays += 1;
                sub.lastDeliveredDate = todayStr;
                isDbModified = true;

                const userId = sub.userId;
                const currentBal = db.balances[userId] || 0;

                if (!db.orderHistories[userId]) db.orderHistories[userId] = [];
                const now = new Date();
                db.orderHistories[userId].unshift({
                    timestamp: now.getTime(),
                    date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                    time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                    product: `${sub.product} (Day ${sub.deliveredDays}/${sub.totalDays})`,
                    uid: sub.uid, nickname: sub.nickname || 'Unknown', region: sub.region, price: 0, status: 'Complete'
                });
                if (db.orderHistories[userId].length > 10) db.orderHistories[userId].pop();

                const dailyReceipt = `💠 ════════════════════════════ 💠\n           ✅ DAILY AUTO-LIKE COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${sub.product}\`\n📅 Progress: \`Day ${sub.deliveredDays} of ${sub.totalDays}\`\n🆔 Sub ID: \`${subId}\`\n\n👤 Name: \`${sub.nickname || 'Unknown'}\`\n🛡️ UID: \`${sub.uid}\`\n🌍 Server: \`${sub.region}\`\n\n👍 **Previous Likes:** \`${prevLikes}\`\n👍 **Current Likes:** \`${currLikes}\`\n📈 **Added Likes:** \`+${addedLikes} Likes\`\n\n💰 Daily Charge: \`0 BDT (Pre-Paid)\`\n💳 Current Balance: \`${currentBal} BDT\`\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

                await bot.telegram.sendMessage(userId, dailyReceipt, { parse_mode: 'Markdown' }).catch(() => {});
                await bot.telegram.sendMessage(ADMIN_ID, `📋 **[Daily Auto-Delivery Log]**\n\n` + dailyReceipt, { parse_mode: 'Markdown' }).catch(() => {});

                if (isLastDay || sub.remainingDays <= 0) {
                    delete db.subscriptions[subId];
                }
            }
        }
    }
    if (isDbModified) saveDatabase(db);
}

setInterval(processDailySubscriptions, 15 * 60 * 1000);

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
            buyLikes: "🔥 ফ্রি ফায়ার লাইক কিনুন ❤️‍🔥⚡",
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
    if (lowerText.includes('shop') || lowerText.includes('শপ') || lowerText.includes('check') || lowerText.includes('ইউআইডি') || lowerText.includes('balance') || lowerText.includes('ব্যালেন্স') || lowerText.includes('profile') || lowerText.includes('প্রোফাইল') || lowerText.includes('history') || lowerText.includes('হিস্ট্রি') || lowerText.includes('support') || lowerText.includes('সাপোর্ট') || lowerText.includes('calculator') || lowerText.includes('ক্যালকুলেটর') || lowerText.includes('clock') || lowerText.includes('ওয়ার্ল্ড')) return true;
    return false;
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

bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const db = loadDatabase();
        if (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        if (!db.users) db.users = {};
        db.users[userId] = { id: userId, first_name: ctx.from.first_name || 'N/A', username: ctx.from.username ? '@' + ctx.from.username : 'N/A' };
        saveDatabase(db);
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

bot.action(/.*/, async (ctx, next) => {
    try { await ctx.answerCbQuery().catch(() => {}); } catch (e) {}
    if (next) return next();
});

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
        if (!db.categories) db.categories = ['🔥 Free Fire Likes ❤️‍🔥'];
        if (!db.customProducts) db.customProducts = {};
        if (!db.subscriptions) db.subscriptions = {};
        if (!db.users) db.users = {};
        if (!db.allowedUsers) db.allowedUsers = {};
        if (!db.orderHistories) db.orderHistories = {};
        if (!db.depositRequests) db.depositRequests = {};
        if (!db.adminInputSession) db.adminInputSession = {};
        if (!db.adminSessions) db.adminSessions = {};
        if (!db.userLang) db.userLang = {};

        db.users[userId] = { id: userId, first_name: ctx.from.first_name || 'N/A', username: ctx.from.username ? '@' + ctx.from.username : 'N/A' };
        saveDatabase(db);

        if (isMenuCommand(text)) {
            if (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
            if (userId === ADMIN_ID.toString() && db.adminInputSession?.[userId]) { delete db.adminInputSession[userId]; saveDatabase(db); }
        }

        if (userId === ADMIN_ID.toString() && db.adminReplySessions?.[userId] && !isMenuCommand(text)) {
            const targetUser = db.adminReplySessions[userId];
            try {
                await bot.telegram.sendMessage(targetUser, "💬 **Admin Reply:**\n\n" + text, { parse_mode: 'Markdown' });
                await ctx.reply('✅ Reply sent successfully!');
            } catch (err) { await ctx.reply('❌ Failed to send.'); }
            delete db.adminReplySessions[userId];
            saveDatabase(db);
            return;
        }

        if (userId === ADMIN_ID.toString() && db.adminInputSession?.[userId] && !isMenuCommand(text)) {
            const sessionData = db.adminInputSession[userId];
            if (sessionData.type === 'add_bot_user') {
                const targetUid = text.replace(/[^0-9]/g, '');
                if (targetUid) {
                    db.allowedUsers[targetUid] = true;
                    saveDatabase(db);
                    delete db.adminInputSession[userId];
                    try { await bot.telegram.sendMessage(targetUid, "🎉 অভিনন্দন! অ্যাডমিন আপনার বট এক্সেস অনুমোদন করেছেন।", { parse_mode: 'Markdown' }); } catch (e) {}
                    return ctx.reply(`✅ ইউজার আইডি \`${targetUid}\`-কে এক্সেস দেওয়া হয়েছে!`, { parse_mode: 'Markdown' });
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ সঠিক ইউজার আইডি দিন।');
            }
            if (sessionData.type === 'remove_bot_user') {
                const targetUid = text.replace(/[^0-9]/g, '');
                if (targetUid) {
                    if (db.allowedUsers[targetUid]) delete db.allowedUsers[targetUid];
                    saveDatabase(db);
                    delete db.adminInputSession[userId];
                    return ctx.reply(`❌ ইউজার আইডি \`${targetUid}\`-এর এক্সেস রিমুভ করা হয়েছে!`, { parse_mode: 'Markdown' });
                }
                delete db.adminInputSession[userId];
                return ctx.reply('❌ সঠিক ইউজার আইডি দিন।');
            }
            if (sessionData.type === 'add_minus_balance') {
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
        }

        if (db.sessions?.[userId]?.step === 'awaiting_deposit_amount' && !isMenuCommand(text)) {
            const amountNum = Number(text);
            const lang = getUserLang(userId);
            if (isNaN(amountNum) || amountNum < 100) {
                const errBox = lang === 'bn' ? "⚠️ ১০০ টাকার নিচে অ্যামাউন্ট অ্যাড হবে না। সর্বনিম্ন ১০০ বা তার বেশি দিতে হবে:" : "⚠️ Minimum deposit is 100 BDT:";
                return ctx.reply(errBox, { parse_mode: 'Markdown' });
            }
            db.sessions[userId].depositAmount = amountNum;
            db.sessions[userId].step = 'awaiting_deposit_proof';
            saveDatabase(db);
            const method = db.sessions[userId].method;
            const targetNum = method === 'bKash' ? (db.numbers?.bkash || '01XXXXXXXXX') : (db.numbers?.nagad || '01XXXXXXXXX');
            return ctx.reply(`📌 **${method} Official Number:** \`${targetNum}\`\n💵 **Amount:** \`${amountNum} BDT\`\n\n✍️ Send your TrxID or screenshot:`, { parse_mode: 'Markdown' });
        }

        if (db.sessions?.[userId]?.step === 'awaiting_deposit_proof' && !isMenuCommand(text)) {
            const method = db.sessions[userId].method;
            const amount = db.sessions[userId].depositAmount || 100;
            const uniqueDepId = userId + '_' + Date.now();
            const proofText = text || (ctx.message.photo ? '[Photo Attached]' : 'N/A');

            if (!db.depositRequests) db.depositRequests = {};
            db.depositRequests[uniqueDepId] = { userId, method, amount, proof: proofText };
            saveDatabase(db);

            const adminDepBox = `💰 **NEW DEPOSIT REQUEST**\n\n🆔 User ID: \`${userId}\`\n💳 Method: \`${method}\`\n💵 Amount: \`${amount} BDT\`\n📝 Proof: \`${proofText}\``;
            if (ctx.message.photo) {
                await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, {
                    caption: adminDepBox, parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(`✅ Approve (+${amount} BDT)`, 'dep_app_' + uniqueDepId), Markup.button.callback('❌ Reject', 'dep_can_' + uniqueDepId)]])
                }).catch(() => {});
            } else {
                await bot.telegram.sendMessage(ADMIN_ID, adminDepBox, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(`✅ Approve (+${amount} BDT)`, 'dep_app_' + uniqueDepId), Markup.button.callback('❌ Reject', 'dep_can_' + uniqueDepId)]])
                }).catch(() => {});
            }

            delete db.sessions[userId];
            saveDatabase(db);
            return ctx.reply("✨ Your deposit proof has been submitted to admin!", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (db.sessions?.[userId]?.step === 'awaiting_uid_only' && !isMenuCommand(text)) {
            const uidText = text;
            delete db.sessions[userId];
            saveDatabase(db);
            const resInfo = await checkFreeFireUID(uidText);
            return ctx.reply(`🎮 **Player Info**\n\n👤 Name: \`${resInfo.nickname}\`\n🛡 UID: \`${uidText}\`\n❤️ Likes: \`${resInfo.likes}\`\n⭐ Level: \`${resInfo.level}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (db.sessions?.[userId]?.step === 'awaiting_uid' && !isMenuCommand(text)) {
            const idText = text;
            db.sessions[userId].uid = idText;
            db.sessions[userId].step = 'confirming';
            saveDatabase(db);
            const session = db.sessions[userId];

            const loadingMsg = await ctx.reply(`⏳ Checking UID...\n\`▰▰▰▱▱▱▱▱▱▱ 30%\``, { parse_mode: 'Markdown' });
            await new Promise(r => setTimeout(r, 200));
            const resInfo = await checkFreeFireUID(idText);
            session.nickname = resInfo.nickname;
            session.initialLikes = resInfo.likes;
            saveDatabase(db);

            const reviewBox = `╭────────────────────────────╮\n      📦 ORDER CONFIRMATION\n╰────────────────────────────╯\n\n🛍️ **Package:** \`${session.product}\`\n💵 **Price:** \`${session.price} BDT\`\n🌍 **Server:** \`${session.region}\`\n\n👤 **Game Name:** \`${resInfo.nickname}\`\n🛡️ **UID:** \`${idText}\`\n❤️ **Current Likes:** \`${resInfo.likes}\`\n\n⚠️ Please verify before confirming.`;

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
                        [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'cancelBtn'), 'cancel_order_review')]
                    ])
                });
            }
            return;
        }

        if (lowerText.includes('shop now') || lowerText.includes('শপ নাও') || lowerText.includes('shop') || lowerText.includes('শপ')) {
            let inlineButtons = [];
            const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
            cats.forEach((c, index) => {
                inlineButtons.push([Markup.button.callback(c, 'custom_cat_' + index)]);
            });
            if (userId === ADMIN_ID.toString()) {
                inlineButtons.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
            }
            inlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
            return ctx.reply(t(userId, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
        }

        if (lowerText.includes('check ff uid') || lowerText.includes('ইউআইডি চেক') || lowerText.includes('ইউআইডি')) {
            db.sessions[userId] = { step: 'awaiting_uid_only' };
            saveDatabase(db);
            return ctx.reply(t(userId, 'checkUidPrompt'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (lowerText.includes('add balance') || lowerText.includes('ব্যালেন্স অ্যাড') || lowerText.includes('ব্যালেন্স')) {
            return ctx.reply(t(userId, 'depositPortal'), {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (lowerText.includes('my profile') || lowerText.includes('আমার প্রোফাইল') || lowerText.includes('প্রোফাইল')) {
            const lang = getUserLang(userId);
            const langBtn = lang === 'en' ? '🌍 Change Language (EN)' : '🌍 Change Language (বাংলা)';
            const userSubs = Object.values(db.subscriptions || {}).filter(s => s.userId === userId && s.remainingDays > 0);
            let activeSubsText = userSubs.length > 0 ? `\n🔄 **Active Packages:** \`${userSubs.length} Running\`` : '';
            return ctx.reply(`👤 **USER PROFILE**\n\n🆔 ID: \`${userId}\`\n👤 Name: \`${ctx.from.first_name}\`\n💰 Balance: \`৳${db.balances[userId] || 0}\`${activeSubsText}`, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(langBtn, 'open_lang_menu')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        if (lowerText.includes('order history') || lowerText.includes('অর্ডার হিস্ট্রি') || lowerText.includes('হিস্ট্রি')) {
            const userHistories = db.orderHistories?.[userId]?.slice(0, 10) || [];
            let historyText = t(userId, 'historyTitle');
            if (userHistories.length === 0) {
                historyText += t(userId, 'noHistory');
            } else {
                userHistories.forEach((h, i) => {
                    historyText += `${i + 1}. 📦 **${h.product}** — \`${h.price} BDT\`\n   🛡️ UID: \`${h.uid}\` | 🕒 \`${h.time}\`\n\n`;
                });
            }
            return ctx.reply(historyText + t(userId, 'historyDisclaimer'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (lowerText.includes('support desk') || lowerText.includes('সাপোর্ট ডেস্ক') || lowerText.includes('সাপোর্ট')) {
            return ctx.reply(t(userId, 'supportText'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        if (lowerText.includes('calculator') || lowerText.includes('ক্যালকুলেটর')) {
            db.calcStates[userId] = '0';
            saveDatabase(db);
            return ctx.reply("🧮 **Calculator**\n\nScreen: `0`", { parse_mode: 'Markdown', ...getCalcKeyboard() });
        }

        if (lowerText.includes('world clock') || lowerText.includes('ওয়ার্ল্ড ক্লক')) {
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
    } catch (err) {}
});

bot.action('dep_bkash', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    db.sessions[userId] = { step: 'awaiting_deposit_amount', method: 'bKash' };
    saveDatabase(db);
    return ctx.editMessageText("💖 **bKash Deposit**\n\n💎 Minimum deposit is **100 BDT**.\n\n✍️ Enter your amount:", { parse_mode: 'Markdown' });
});

bot.action('dep_nagad', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    db.sessions[userId] = { step: 'awaiting_deposit_amount', method: 'Nagad' };
    saveDatabase(db);
    return ctx.editMessageText("🧡 **Nagad Deposit**\n\n💎 Minimum deposit is **100 BDT**.\n\n✍️ Enter your amount:", { parse_mode: 'Markdown' });
});

bot.action(/dep_app_(.+)/, async (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
    const db = loadDatabase(), info = db.depositRequests?.[ctx.match[1]];
    if (info) {
        const addAmt = Number(info.amount) || 100;
        db.balances[info.userId] = (db.balances[info.userId] || 0) + addAmt;
        saveDatabase(db);
        await bot.telegram.sendMessage(info.userId, `✅ **Deposit Approved (+${addAmt} BDT)**`, { parse_mode: 'Markdown' }).catch(() => {});
        delete db.depositRequests[ctx.match[1]];
        saveDatabase(db);
        await ctx.editMessageText('✅ **[DEPOSIT APPROVED]**');
    }
});

bot.action(/dep_can_(.+)/, async (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
    const db = loadDatabase(), info = db.depositRequests?.[ctx.match[1]];
    if (info) {
        await bot.telegram.sendMessage(info.userId, "❌ Deposit request cancelled.", { parse_mode: 'Markdown' }).catch(() => {});
        delete db.depositRequests[ctx.match[1]];
        saveDatabase(db);
        await ctx.editMessageText('❌ **[DEPOSIT REJECTED]**');
    }
});

bot.action('open_lang_menu', async (ctx) => {
    await ctx.editMessageText("🌐 **Select Language:**", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🇧🇩 বাংলা', 'set_lang_bn'), Markup.button.callback('🇬🇧 English', 'set_lang_en')],
            [Markup.button.callback('🔙 Back', 'back_to_profile')]
        ])
    });
});

bot.action(/set_lang_(bn|en)/, async (ctx) => {
    const userId = ctx.from.id.toString();
    const lang = ctx.match[1];
    const db = loadDatabase();
    if (!db.userLang) db.userLang = {};
    db.userLang[userId] = lang;
    saveDatabase(db);
    await ctx.answerCbQuery(lang === 'bn' ? 'বাংলা সেট করা হয়েছে!' : 'English selected!');
    try { await ctx.deleteMessage(); } catch (e) {}
    return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
});

bot.action(/calc_(.+)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const val = ctx.match[1].trim();
        if (!cachedDb.calcStates) cachedDb.calcStates = {};
        let current = cachedDb.calcStates[userId] || '0';

        if (val === 'C') { current = '0'; } 
        else if (val === 'DEL') { current = current.length > 1 ? current.slice(0, -1) : '0'; } 
        else if (val === 'EQ') {
            try { 
                const sanitized = current.replace(/[^0-9+\-*/().]/g, '');
                current = sanitized ? String(Function('"use strict";return (' + sanitized + ')')()) : '0';
            } catch (e) { current = 'Error'; }
        } else {
            current = (current === '0' || current === 'Error') ? ((val === '.') ? '0.' : val) : (current + val);
        }
        cachedDb.calcStates[userId] = current;
        await ctx.editMessageText(`🧮 **Calculator**\n\nScreen: \`${current}\``, { parse_mode: 'Markdown', ...getCalcKeyboard() });
    } catch (e) {}
});

bot.action(/clock_(bd|np|in|pk|sa|ae|my|sg|us|gb|ca|au)/, async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const tzMap = { bd: 'Asia/Dhaka', np: 'Asia/Kathmandu', in: 'Asia/Kolkata', pk: 'Asia/Karachi', sa: 'Asia/Riyadh', ae: 'Asia/Dubai', my: 'Asia/Kuala_Lumpur', sg: 'Asia/Singapore', us: 'America/New_York', gb: 'Europe/London', ca: 'America/Toronto', au: 'Australia/Sydney' };
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
    await ctx.editMessageText("🌍 **World Clock & Date**\n\n👇 Select country:", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🇧🇩 Bangladesh', 'clock_bd'), Markup.button.callback('🇳🇵 Nepal', 'clock_np')],
            [Markup.button.callback('🇮🇳 India', 'clock_in'), Markup.button.callback('🇵🇰 Pakistan', 'clock_pk')],
            [Markup.button.callback('🇸🇦 Saudi Arabia', 'clock_sa'), Markup.button.callback('🇦🇪 Dubai (UAE)', 'clock_ae')],
            [Markup.button.callback('🇲🇾 Malaysia', 'clock_my'), Markup.button.callback('🇸🇬 Singapore', 'clock_sg')],
            [Markup.button.callback('🇺🇸 USA (NY)', 'clock_us'), Markup.button.callback('🇬🇧 UK (London)', 'clock_gb')],
            [Markup.button.callback('🇨🇦 Canada', 'clock_ca'), Markup.button.callback('🇦🇺 Australia', 'clock_au')],
            [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
        ])
    });
});

bot.action('shop_now_back', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    let inlineButtons = [];
    const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
    cats.forEach((c, index) => {
        inlineButtons.push([Markup.button.callback(c, 'custom_cat_' + index)]);
    });
    if (userId === ADMIN_ID.toString()) {
        inlineButtons.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
    }
    inlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
    await ctx.editMessageText(t(userId, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
});

bot.action('admin_create_cat', async (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
    const db = loadDatabase();
    db.adminInputSession[ADMIN_ID] = { type: 'add_category' };
    saveDatabase(db);
    await ctx.editMessageText('✍️ Enter new category name:', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'shop_now_back')]]) });
});

bot.action(/custom_cat_(.+)/, async (ctx) => {
    const catIdx = parseInt(ctx.match[1]);
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
    const catName = cats[catIdx];
    if (!catName) return;

    let inlineButtons = [];
    (db.customProducts?.[catName] || []).forEach((p, index) => {
        inlineButtons.push([Markup.button.callback(p.name, `sub_prod_idx_${catIdx}_${index}`)]);
    });
    inlineButtons.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
    await ctx.editMessageText(`📂 **${catName}**`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
});

bot.action(/sub_prod_idx_(.+)_(.+)/, async (ctx) => {
    const catIdx = parseInt(ctx.match[1]);
    const index = parseInt(ctx.match[2]);
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
    const catName = cats[catIdx];
    const prod = db.customProducts[catName]?.[index] || { name: 'Package' };

    let price = 0;
    const allNums = prod.name.match(/\d+/g);
    if (allNums && allNums.length > 0) price = Number(allNums[allNums.length - 1]);

    const lowerProd = prod.name.toLowerCase();
    let actionType = 'like';
    let productCode = '';
    let totalDays = 1;

    if (lowerProd.includes('6600')) {
        actionType = 'auto'; productCode = 'AL-55F71F'; totalDays = 30;
    } else if (lowerProd.includes('3300')) {
        actionType = 'auto'; productCode = 'AL-3300'; totalDays = 15;
    } else if (lowerProd.includes('1100')) {
        actionType = 'auto'; productCode = 'AL-1100'; totalDays = 5;
    } else {
        actionType = 'like'; productCode = ''; totalDays = 1;
    }

    db.sessions[userId] = { product: prod.name, price, catIdx, totalDays, actionType, productCode, isFFLikes: true };
    saveDatabase(db);

    await ctx.editMessageText(t(userId, 'serverTitle') + `\`${prod.name}\`\n💵 Price: \`${price} BDT\`\n\n👇 Select Server:`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🇧🇩 BD', 'region_bd'), Markup.button.callback('🇮🇩 ID', 'region_id')],
            [Markup.button.callback(t(userId, 'backBtn'), 'custom_cat_' + catIdx), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
        ])
    });
});

bot.action(/region_(bd|id)/, async (ctx) => {
    const userId = ctx.from.id.toString(), region = ctx.match[1].toUpperCase();
    const db = loadDatabase();
    const session = db.sessions?.[userId];
    if (session) {
        session.region = region;
        session.step = 'awaiting_uid';
        saveDatabase(db);
    }
    await ctx.editMessageText(`🎮 **Enter UID (${region})**\n\n✍️ Please type and send your UID:`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), 'custom_cat_' + (session?.catIdx || 0)), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
    });
});

bot.action('cancel_order_review', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    if (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
    await ctx.editMessageText("❌ **Order Cancelled**", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
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

        const procMsgId = ctx.callbackQuery.message.message_id;
        try { await ctx.editMessageText(`⏳ Processing Order...\n\`▰▰▰▱▱▱▱▱▱▱ 30%\``, { parse_mode: 'Markdown' }); } catch (e) {}
        await new Promise(r => setTimeout(r, 300));

        const isAutoEnabled = db.settings && db.settings.autoApiEnabled;
        const totalDays = session.totalDays || 1;
        
        let apiRes = { success: false };
        if (isAutoEnabled) {
            let apiParams = {};
            if (session.actionType === 'auto' && session.productCode) {
                apiParams = { action: 'auto', product: session.productCode, uid: session.uid, server: session.region };
            } else {
                apiParams = { action: 'like', uid: session.uid, server: session.region };
            }
            apiRes = await callLikesFFApiWithTimeout(apiParams, 30000);
        }

        if (isAutoEnabled && apiRes.success) {
            try { await ctx.telegram.editMessageText(userId, procMsgId, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            await new Promise(r => setTimeout(r, 35000));

            const postCheck = await checkFreeFireUID(session.uid);
            const prevLikes = session.initialLikes || 0;
            const currLikes = postCheck.likes || prevLikes;
            const addedLikes = currLikes >= prevLikes ? (currLikes - prevLikes) : 0;

            let subStatusText = '';
            if (totalDays > 1) {
                const remainingDays = totalDays - 1;
                const subId = `SUB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
                db.subscriptions[subId] = {
                    userId, uid: session.uid, nickname: session.nickname || 'Unknown',
                    region: session.region, product: session.product, actionType: session.actionType,
                    productCode: session.productCode, totalDays, deliveredDays: 1, remainingDays, lastDeliveredDate: getTodayDateBD()
                };
                subStatusText = `\n📅 **Subscription:** \`Day 1 of total ${totalDays} (${remainingDays} Days Auto-Remaining)\``;
            }

            if (!db.orderHistories[userId]) db.orderHistories[userId] = [];
            const now = new Date();
            db.orderHistories[userId].unshift({
                timestamp: now.getTime(),
                date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                product: totalDays > 1 ? `${session.product} (Day 1/${totalDays})` : session.product,
                uid: session.uid, nickname: session.nickname || 'Unknown', region: session.region, price: session.price, status: 'Complete'
            });
            if (db.orderHistories[userId].length > 10) db.orderHistories[userId].pop();
            saveDatabase(db);

            const autoReceipt = `💠 ════════════════════════════ 💠\n           ✅ ORDER SUCCESSFULLY COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${session.product}\`\n🆔 Order ID: \`AUTO-${Math.floor(10000 + Math.random() * 90000)}\`${subStatusText}\n\n👤 Name: \`${session.nickname || 'Unknown'}\`\n🛡️ UID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n\n👍 **Previous Likes:** \`${prevLikes}\`\n👍 **Current Likes:** \`${currLikes}\`\n📈 **Added Likes:** \`+${addedLikes} Likes\`\n\n💰 Price: \`${session.price} BDT\`\n💳 Remaining Balance: \`${db.balances[userId]} BDT\`\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

            await ctx.telegram.editMessageText(userId, procMsgId, null, autoReceipt, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });

            await bot.telegram.sendMessage(ADMIN_ID, "📋 **[Duplicate Copy - Auto Order]**\n\n" + autoReceipt, { parse_mode: 'Markdown' }).catch(() => {});
        } else {
            const uniqueOrderId = userId + '_' + Date.now();
            db.adminSessions[uniqueOrderId] = {
                targetUserId: userId, loadingMessageId: procMsgId, product: session.product,
                uid: session.uid, nickname: session.nickname || 'Unknown', region: session.region, price: session.price, isFFLikeCategory: true
            };
            saveDatabase(db);

            await bot.telegram.sendMessage(ADMIN_ID, `⚠️ API Failed / Fallback Order (Manual Needed)\n\n📦 Package: \`${session.product}\`\n🆔 UID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n💵 Price: \`${session.price} BDT\``, {
                parse_mode: 'Markdown'
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
        try { await ctx.deleteMessage(); } catch (e) {}
        return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

const webhookPath = `/secret-path-${BOT_TOKEN.split(':')[0]}`;

const server = http.createServer((req, res) => {
    try {
        if (req.url === webhookPath && req.method === 'POST') {
            return bot.webhookCallback(webhookPath)(req, res, () => {});
        } else if (req.url === '/ping') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            return res.end('OK');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            return res.end('ST Like Bot is running live via Webhook! 🚀');
        }
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

server.listen(PORT, async () => {
    try {
        await bot.telegram.setWebhook(`${RENDER_URL}${webhookPath}`, { drop_pending_updates: true });
    } catch (err) {}
});
