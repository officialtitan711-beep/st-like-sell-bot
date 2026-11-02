const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');
const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN || '8395471740:AAF-v0dAgc36nL7sb1G5Dy6IzHmsCUlwe80';
const ADMIN_ID = process.env.ADMIN_ID || '5932254012';
const CHANNEL_ID = process.env.CHANNEL_ID || '@shohan2004';
const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://m.youtube.com/@ShohanSir18';

const RENDER_URL = 'https://st-like-sell-bot.onrender.com';
const PORT = process.env.PORT || 3000;
const DB_FILE = 'database.json';

const bot = new Telegraf(BOT_TOKEN);

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            if (data.trim() === '') return { users: {}, balances: {}, sessions: {}, numbers: {}, categories: {}, customProducts: {}, allowedUsers: {} };
            const parsed = JSON.parse(data);
            if (!parsed.users) parsed.users = {};
            if (!parsed.balances) parsed.balances = {};
            if (!parsed.sessions) parsed.sessions = {};
            if (!parsed.numbers) parsed.numbers = {};
            if (!parsed.categories) parsed.categories = {};
            if (!parsed.customProducts) parsed.customProducts = {};
            if (!parsed.allowedUsers) parsed.allowedUsers = {};
            return parsed;
        }
    } catch (e) { 
        console.error('DB Load Error:', e); 
    }
    return { users: {}, balances: {}, sessions: {}, numbers: {}, categories: {}, customProducts: {}, allowedUsers: {} };
}

function saveDatabase(data) {
    try { 
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); 
    } catch (e) { 
        console.error('DB Save Error:', e); 
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

    if (isPendingAdminAccess) {
        text = "╔═════════════════════════════════╗\n║      🌟 ACCESS GRANTED 🌟       ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ 🎉 **অভিনন্দন, ভর্টেক্স ভাইয়ের বট!**   │\n│ আপনি বটের এক্সেসটি সফলভাবে       │\n│ পেয়েছেন। ✨                      │\n├─────────────────────────────────┤\n│ 👇 অনুগ্রহ করে নিচের বাটনে ক্লিক   │\n│ করুন:                           │\n│ 👑 **Admin:** `@sonu1813`         │\n└─────────────────────────────────┘";
        keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Verify Access Now ✨', 'verify_sub')],
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
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
        } else {
            await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
        }
    } catch (e) {
        await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
}

function getMainKeyboard(userId) {
    let keyboard = [
        ['🛍️ Shop Now', '🔍 Check FF UID'],
        ['💰 Add Balance', '👤 My Profile'],
        ['📜 Order History', '📞 Support Desk']
    ];

    if (userId.toString() === ADMIN_ID.toString()) {
        keyboard.push(
            ['-----------------------------------'],
            ['➕ Add Bot', '❌ Remove Bot'],
            ['➕ Add Product', '❌ Remove Product'],
            ['💳 Add/Minus Balance', '📱 Set Payment Numbers'],
            ['📊 Total Users', '📩 Send Message'],
            ['📢 All Users Msg']
        );
    }
    return Markup.keyboard(keyboard).resize();
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
            if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/start')) return next();

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
    const userId = ctx.from.id.toString();
    const isSubscribed = await checkUserSubscription(userId);

    if (!isSubscribed) {
        return sendForceSubMessage(ctx, false);
    }

    const db = loadDatabase();
    if (userId.toString() !== ADMIN_ID.toString() && (!db.allowedUsers || !db.allowedUsers[userId])) {
        return sendForceSubMessage(ctx, true);
    }

    const welcomeText = "╔═════════════════════════════════╗\n║     👑 ST LIKE ~ SELL BOT 👑      ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ ✨ স্বাগতম! আমাদের প্রিমিয়াম গেমিং  │\n│ সার্ভিসে আপনাকে স্বাগতম জানাই। 🚀   │\n├─────────────────────────────────┤\n│ 👇 আপনার পছন্দের সার্ভিসটি বেছে  │\n│ নিতে নিচের মেনু ব্যবহার করুন:     │\n└─────────────────────────────────┘";
    return ctx.reply(welcomeText, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
});

bot.action('verify_sub', async (ctx) => {
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

    const welcomeText = "╔═════════════════════════════════╗\n║     👑 ST LIKE ~ SELL BOT 👑      ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ ✨ স্বাগতম! ভেরিফিকেশন সফল। 🚀     │\n├─────────────────────────────────┤\n│ 👇 আপনার পছন্দের সার্ভিসটি বেছে  │\n│ নিতে নিচের মেনু ব্যবহার করুন:     │\n└─────────────────────────────────┘";
    return ctx.reply(welcomeText, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
});

bot.on('message', async (ctx) => {
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

    const text = ctx.message.text ? ctx.message.text.trim() : (ctx.message.caption ? ctx.message.caption.trim() : '');

    // ADMIN REPLY & ORDER COMPLETION HANDLING
    if (userId === ADMIN_ID.toString()) {
        const adminSession = db.adminInputSession && db.adminInputSession[userId] ? db.adminInputSession[userId] : null;
        if (adminSession && adminSession.step === 'awaiting_order_details') {
            const targetUserId = adminSession.targetUserId;
            const session = db.adminSessions && db.adminSessions[targetUserId] ? db.adminSessions[targetUserId] : null;

            delete db.adminInputSession[userId];
            saveDatabase(db);

            if (session) {
                const userBal = db.balances[targetUserId] || 0;
                const lines = text.split('\n');
                const prevLikes = lines[0] || '---';
                const currLikes = lines[1] || '---';
                const addedLikes = lines[2] || '---';

                const finalSuccessBox = "╔═════════════════════════════════╗\n║       ✅ ORDER COMPLETE         ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ 📦 Product: `" + session.product + "`\n│ 👤 Name: `" + session.nickname + "`\n│ 🛡 UID: `" + session.uid + "`\n│ 🌍 Server: `" + session.region + "`\n├─────────────────────────────────┤\n│ ❤️ Previous Likes: " + prevLikes + "\n│ 💖 Current Likes: " + currLikes + "\n│ 🚀 Added Likes: " + addedLikes + "\n├─────────────────────────────────┤\n│ 💸 Deducted: `" + session.price + " BDT`\n│ 💰 Current Balance: `" + userBal + " BDT`\n└─────────────────────────────────┘\n⏳ এই UID তে ২৪ ঘণ্টা পর আবার ডেইলি লাইক নিতে পারবেন।\n🙏 ধন্যবাদ!";

                try {
                    await bot.telegram.editMessageText(targetUserId, session.loadingMessageId, null, finalSuccessBox, { 
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]])
                    });

                    try {
                        await ctx.telegram.editMessageText(ADMIN_ID, session.adminMsgId, null, "╔═════════════════════════════════╗\n║    🔔 ORDER COMPLETED ✅        ║\n╚═════════════════════════════════╝\n🆔 Customer ID: `" + targetUserId + "`\n📦 Product: `" + session.product + "`\n**[STATUS: COMPLETED ✅]**", { parse_mode: 'Markdown' });
                    } catch (err) {}

                    delete db.adminSessions[targetUserId];
                    saveDatabase(db);
                    return ctx.reply('╔═════════════════════════════════╗\n║   ✅ অর্ডার সফলভাবে কমপ্লিট!    ║\n╚═════════════════════════════════╝\n🆔 User ID: `' + targetUserId + '`', { parse_mode: 'Markdown' });
                } catch (e) {
                    return ctx.reply('❌ কাস্টমারের মেসেজ আপডেট করা যায়নি।');
                }
            }
        }

        // Admin replying to customer support via reply feature with UNIQUE DESIGN
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
    }

    // ADMIN PANEL COMMANDS & DYNAMIC CATEGORIES/PRODUCTS MANAGEMENT
    if (userId === ADMIN_ID.toString() && text) {
        if (text === '➕ Add Bot') {
            db.sessions[userId] = { step: 'admin_add_bot_prompt' };
            saveDatabase(db);
            return ctx.reply("╔═════════════════════════════════╗\n║     ➕ ADD BOT / PERMISSION     ║\n╚═════════════════════════════════╝\n✍️ যে ইউজারের আইডি বা ইউজারনেম পারমিশন দিতে চান তা লিখে পাঠান:\n*(উদাহরণ: `123456789`)*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
        }
        if (text === '❌ Remove Bot') {
            db.sessions[userId] = { step: 'admin_remove_bot_prompt' };
            saveDatabase(db);
            return ctx.reply("╔═════════════════════════════════╗\n║     ❌ REMOVE BOT ACCESS        ║\n╚═════════════════════════════════╝\n✍️ যে ইউজারের আইডি রিমুভ করতে চান তা পাঠান:", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
        }
        if (text === '💳 Add/Minus Balance') {
            db.sessions[userId] = { step: 'admin_balance_prompt' };
            saveDatabase(db);
            return ctx.reply("╔═════════════════════════════════╗\n║    🛠️ BALANCE MANAGEMENT        ║\n╚═════════════════════════════════╝\n✍️ ফরম্যাট: `[User_ID] [টাকার পরিমাণ]`\n*(উদাহরণ: `123456789 100`)*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
        }
        if (text === '📱 Set Payment Numbers') {
            return ctx.reply("╔═════════════════════════════════╗\n║    📱 PAYMENT SETUP PANEL       ║\n╚═════════════════════════════════╝\n👇 মাধ্যম সিলেক্ট করুন:", Markup.inlineKeyboard([
                [Markup.button.callback('📱 Set bKash 🌸', 'set_bkash_prompt'), Markup.button.callback('📱 Set Nagad 🧨', 'set_nagad_prompt')],
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start')]
            ]));
        }
        if (text === '➕ Add Product') {
            const currentSub = db.sessions[userId] && db.sessions[userId].activeCategory ? db.sessions[userId].activeCategory : null;
            if (currentSub) {
                db.sessions[userId] = { step: 'admin_add_sub_product', category: currentSub };
                saveDatabase(db);
                return ctx.reply("╔═════════════════════════════════╗\n║     📦 ADD PACKAGE (" + currentSub + ") ║\n╚═════════════════════════════════╝\n✍️ নাম ও দাম পাঠান:\n*(উদাহরণ: `15 Days Likes - ৳150`)*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
            } else {
                db.sessions[userId] = { step: 'admin_add_category' };
                saveDatabase(db);
                return ctx.reply("╔═════════════════════════════════╗\n║     📦 ADD MAIN CATEGORY        ║\n╚═════════════════════════════════╝\n✍️ নতুন ক্যাটাগরির নাম লিখে পাঠান:\n*(উদাহরণ: `Guild Glory Bot`)*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
            }
        }
        if (text === '❌ Remove Product') {
            const currentSub = db.sessions[userId] && db.sessions[userId].activeCategory ? db.sessions[userId].activeCategory : null;
            if (currentSub) {
                let listText = '╔═════════════════════════════════╗\n║     🗑️ REMOVE PACKAGE (' + currentSub + ') ║\n╚═════════════════════════════════╝\n✍️ যে বাটন বা প্যাকেজটি রিমুভ করতে চান, সেটির সঠিক নাম লিখে পাঠান:\n\n';
                
                if (currentSub === 'Free Fire Likes') {
                    if (!db.customProducts) db.customProducts = {};
                    if (!db.customProducts['Free Fire Likes']) db.customProducts['Free Fire Likes'] = [
                        { name: '220 Likes - ৳8' },
                        { name: '6000 Likes - ৳300' }
                    ];
                }

                if (db.customProducts[currentSub] && db.customProducts[currentSub].length > 0) {
                    db.customProducts[currentSub].forEach((p, index) => { 
                        listText += (index + 1) + '. `' + p.name + '`\n'; 
                    });
                } else {
                    listText += '⚠️ এই ক্যাটাগরিতে কোনো প্যাকেজ নেই।';
                }

                db.sessions[userId] = { step: 'admin_remove_sub_product', category: currentSub };
                saveDatabase(db);
                return ctx.reply(listText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
            } else {
                const catKeys = Object.keys(db.categories || {});
                let listText = '╔═════════════════════════════════╗\n║      🗑️ REMOVE CATEGORY         ║\n╚═════════════════════════════════╝\n✍️ সম্পূর্ণ ক্যাটাগরি রিমুভ করতে সঠিক নামটি লিখে পাঠান:\n\n1. `Free Fire Likes`\n';
                catKeys.forEach((c, index) => { listText += (index + 2) + '. `' + c + '`\n'; });
                db.sessions[userId] = { step: 'admin_remove_category' };
                saveDatabase(db);
                return ctx.reply(listText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
            }
        }
        if (text === '📊 Total Users') {
            const allowedIds = Object.keys(db.allowedUsers || {});
            if (allowedIds.length === 0) return ctx.reply('⚠️ কোনো ইউজার নেই।');
            let list = '╔═════════════════════════════════╗\n║    📊 TOTAL ACTIVE USERS (' + allowedIds.length + ')  ║\n╚═════════════════════════════════╝\n';
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
            return ctx.reply("╔═════════════════════════════════╗\n║     📩 DIRECT MESSAGE PANEL     ║\n╚═════════════════════════════════╝\n✍️ ফরম্যাট: `[User_ID] [মেসেজ]`", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
        }
        if (text === '📢 All Users Msg') {
            db.sessions[userId] = { step: 'admin_broadcast_prompt' };
            saveDatabase(db);
            return ctx.reply("╔═════════════════════════════════╗\n║      📢 BROADCAST MESSAGE       ║\n╚═════════════════════════════════╝\n✍️ মেসেজটি লিখে পাঠান:", { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')]]) });
        }
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_add_category') {
        db.categories[text] = true;
        if (!db.customProducts[text]) db.customProducts[text] = [];
        delete db.sessions[userId];
        saveDatabase(db);
        return ctx.reply('╔═════════════════════════════════╗\n║    ✅ CATEGORY ADDED SUCCESS    ║\n╚═════════════════════════════════╝\n📂 `' + text + '`', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_remove_category') {
        if (text.toLowerCase() === 'free fire likes') {
            delete db.sessions[userId];
            saveDatabase(db);
            return ctx.reply('⚠️ ডিফল্ট "Free Fire Likes" ক্যাটাগরি সম্পূর্ণ মুছে ফেলা যায় না, তবে এর ভেতরের প্যাকেজ রিমুভ করতে পারবেন।', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
        }
        if (db.categories[text]) {
            delete db.categories[text];
            delete db.customProducts[text];
            delete db.sessions[userId];
            saveDatabase(db);
            return ctx.reply('╔═════════════════════════════════╗\n║    🗑️ CATEGORY REMOVED SUCCESS  ║\n╚═════════════════════════════════╝\n📂 `' + text + '`', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
        } else {
            return ctx.reply('❌ এই নামের কোনো ক্যাটাগরি পাওয়া যায়নি। সঠিক নামটি লিখে পাঠান।');
        }
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_add_sub_product') {
        const cat = db.sessions[userId].category;
        
        if (cat === 'Free Fire Likes' && (!db.customProducts['Free Fire Likes'] || db.customProducts['Free Fire Likes'].length === 0)) {
            db.customProducts['Free Fire Likes'] = [
                { name: '220 Likes - ৳8' },
                { name: '6000 Likes - ৳300' }
            ];
        }

        if (!db.customProducts[cat]) db.customProducts[cat] = [];
        db.customProducts[cat].push({ name: text });

        delete db.sessions[userId];
        saveDatabase(db);
        return ctx.reply('╔═════════════════════════════════╗\n║     ✅ PACKAGE ADDED SUCCESS    ║\n╚═════════════════════════════════╝\n📦 `' + text + '` (`' + cat + '`)', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_remove_sub_product') {
        const cat = db.sessions[userId].category;
        
        if (cat === 'Free Fire Likes' && (!db.customProducts['Free Fire Likes'] || db.customProducts['Free Fire Likes'].length === 0)) {
            db.customProducts['Free Fire Likes'] = [
                { name: '220 Likes - ৳8' },
                { name: '6000 Likes - ৳300' }
            ];
        }

        const list = db.customProducts[cat] || [];
        const index = list.findIndex(p => p.name.toLowerCase() === text.toLowerCase());
        if (index > -1) {
            list.splice(index, 1);
            db.customProducts[cat] = list;
            delete db.sessions[userId];
            saveDatabase(db);
            return ctx.reply('╔═════════════════════════════════╗\n║    🗑️ PACKAGE REMOVED SUCCESS   ║\n╚═════════════════════════════════╝\n📦 `' + text + '`', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
        } else {
            return ctx.reply('❌ এই নামের কোনো প্যাকেজ বা বাটন পাওয়া যায়নি। সঠিক নামটি লিখে পাঠান।');
        }
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_add_bot_prompt') {
        let query = text.replace('@', '').trim();
        let targetId = query;
        if (isNaN(query)) {
            const foundUid = Object.keys(db.users || {}).find(uid => db.users[uid].username.replace('@', '').toLowerCase() === query.toLowerCase());
            if (foundUid) targetId = foundUid;
        }
        if (!db.allowedUsers) db.allowedUsers = {};
        db.allowedUsers[targetId] = true;
        delete db.sessions[userId];
        saveDatabase(db);
        bot.telegram.sendMessage(targetId, '╔═════════════════════════════════╗\n║      🌟 ACCESS APPROVED 🌟      ║\n╚═════════════════════════════════╝\n🎉 অভিনন্দন! অ্যাডমিন আপনার বট এক্সেস অনুমোদন করেছেন। ✨', { parse_mode: 'Markdown' }).catch(()=>{});
        return ctx.reply('✅ পারমিশন সফলভাবে দেওয়া হয়েছে।', { parse_mode: 'Markdown' });
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_remove_bot_prompt') {
        let query = text.replace('@', '').trim();
        let targetId = query;
        if (isNaN(query)) {
            const foundUid = Object.keys(db.users || {}).find(uid => db.users[uid].username.replace('@', '').toLowerCase() === query.toLowerCase());
            if (foundUid) targetId = foundUid;
        }
        if (db.allowedUsers) delete db.allowedUsers[targetId];
        delete db.sessions[userId];
        saveDatabase(db);
        bot.telegram.sendMessage(targetId, '╔═════════════════════════════════╗\n║      ❌ ACCESS REVOKED ❌       ║\n╚═════════════════════════════════╝\n⚠️ আপনার বট অ্যাক্সেস রিমুভ করা হয়েছে।', { parse_mode: 'Markdown' }).catch(()=>{});
        return ctx.reply('🗑️ ইউজারের অ্যাক্সেস রিমুভ করা হয়েছে।', { parse_mode: 'Markdown' });
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_send_msg_prompt') {
        const firstSpace = text.indexOf(' ');
        if (firstSpace !== -1) {
            const targetId = text.substring(0, firstSpace).trim();
            const messageToSend = text.substring(firstSpace + 1).trim();
            delete db.sessions[userId];
            saveDatabase(db);
            try {
                await bot.telegram.sendMessage(targetId, "╔═════════════════════════════════╗\n║      📢 OFFICIAL NOTICE         ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ " + messageToSend + "\n└─────────────────────────────────┘\n👑 Admin: @sonu1813", { parse_mode: 'Markdown' });
                return ctx.reply('✅ মেসেজ সফলভাবে পাঠানো হয়েছে।', { parse_mode: 'Markdown' });
            } catch (e) {
                return ctx.reply('❌ মেসেজ পাঠানো যায়নি।');
            }
        }
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_broadcast_prompt') {
        delete db.sessions[userId];
        saveDatabase(db);
        const userKeys = Object.keys(db.allowedUsers || {});
        let successCount = 0;
        const broadcastText = "╔═════════════════════════════════╗\n║    ✦🌟 ST LIKE BOT NOTICE 🌟✦    ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ " + text + "\n└─────────────────────────────────┘\n\n👑 Admin: @sonu1813";
        for (const uid of userKeys) {
            try { await bot.telegram.sendMessage(uid, broadcastText, { parse_mode: 'Markdown' }); successCount++; } catch (e) {}
        }
        return ctx.reply('✅ ব্রডকাস্ট সফল! মোট `' + successCount + '` জন ইউজারের কাছে গেছে।', { parse_mode: 'Markdown' });
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step === 'admin_balance_prompt') {
        const parts = text.split(' ');
        if (parts.length >= 2) {
            const targetId = parts[0].trim();
            const amount = parseFloat(parts[1]);
            if (isNaN(amount)) {
                return ctx.reply('❌ সঠিক অ্যামাউন্ট দিন। Example: `123456789 50`', { parse_mode: 'Markdown' });
            }
            if (!db.balances) db.balances = {};
            if (!db.balances[targetId]) db.balances[targetId] = 0;
            const previousBalance = db.balances[targetId];
            db.balances[targetId] += amount;
            const currentBalance = db.balances[targetId];
            delete db.sessions[userId];
            saveDatabase(db);

            if (amount >= 0) {
                const balAddNotice = "💎~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~💎\n🚀 **ACCOUNT BALANCE RECHARGED** 🚀\n💎~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~💎\nBalance updated! ✨\n\n📌 **Prev:** `" + previousBalance + " BDT`\n➕ **Added:** `" + amount + " BDT` 💵\n💰 **Current:** `" + currentBalance + " BDT` 💳\n👑 **Admin:** `@sonu1813`\n💎~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~💎";
                bot.telegram.sendMessage(targetId, balAddNotice, { parse_mode: 'Markdown' }).catch(()=>{});
                return ctx.reply('✅ ব্যালেন্স সফলভাবে যোগ করা হয়েছে। নতুন ব্যালেন্স: `' + currentBalance + ' BDT`', { parse_mode: 'Markdown' });
            } else {
                const absAmount = Math.abs(amount);
                bot.telegram.sendMessage(targetId, '⚠️ আপনার অ্যাকাউন্ট থেকে `' + absAmount + ' BDT` কেটে নেওয়া হয়েছে!\n💰 বর্তমান ব্যালেন্স: `' + currentBalance + ' BDT`', { parse_mode: 'Markdown' }).catch(()=>{});
                return ctx.reply('🔻 ব্যালেন্স সফলভাবে মাইনাস করা হয়েছে।', { parse_mode: 'Markdown' });
            }
        }
    }

    if (userId === ADMIN_ID.toString() && db.sessions[userId] && db.sessions[userId].step && db.sessions[userId].step.startsWith('waiting_set_')) {
        const method = db.sessions[userId].step.replace('waiting_set_', '');
        db.numbers[method] = text;
        delete db.sessions[userId];
        saveDatabase(db);
        return ctx.reply('╔═════════════════════════════════╗\n║     📱 NUMBER UPDATED SUCCESS   ║\n╚═════════════════════════════════╝\n💳 ' + method.toUpperCase() + ': `' + text + '`', { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    }

    // SESSION FLOW (UID & DEPOSIT)
    const session = db.sessions[userId];
    if (session && session.step === 'awaiting_deposit_amount') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ সঠিক অ্যামাউন্ট পাঠান (যেমন: `100`)।', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]]) });
        }
        if (amount < 100) {
            const alertText = "⚠️═════════════════════════════════⚠️\n🛑 **MINIMUM DEPOSIT WARNING** 🛑\n⚠️═════════════════════════════════⚠️\nসর্বনিম্ন **১০০ টাকা** (100 BDT) ডিপোজিট করতে হবে।\n❌ আপনার পরিমাণ: `" + amount + " BDT`";
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
        session.step = 'awaiting_trxid';
        saveDatabase(db);

        const slipText = "╔═════════════════════════════════╗\n║     💰 " + method.toUpperCase() + " DEPOSIT PORTAL 💰     ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ 💵 Amount: `" + amount + ".0 BDT`\n├─────────────────────────────────┤\n│ 1️⃣ Open " + method.toUpperCase() + " App.\n│ 2️⃣ Send Money to official number.\n│ 3️⃣ Copy TrxID after payment.\n├─────────────────────────────────┤\n│ 📞 Number: `" + rawNumber + "`\n└─────────────────────────────────┘";

        return ctx.reply(slipText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 Copy Number ✂️', 'copy_num_' + rawNumber)],
                [Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]
            ])
        });
    }

    if (session && session.step === 'awaiting_trxid') {
        const trxId = text;
        const method = session.method;
        const amount = session.amount;
        delete db.sessions[userId];
        saveDatabase(db);

        const customerInfo = "╔═════════════════════════════════╗\n║     📥 NEW DEPOSIT / TrxID      ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ 👤 Name: " + (ctx.from.first_name || 'N/A') + "\n│ 🔗 Username: " + (ctx.from.username ? '@' + ctx.from.username : 'N/A') + "\n│ 🆔 ID: `" + userId + "`\n│ 💳 Method: " + method.toUpperCase() + "\n│ 💵 Amount: `" + amount + " BDT`\n│ 🔑 TrxID: `" + trxId + "`\n└─────────────────────────────────┘";

        await bot.telegram.sendMessage(ADMIN_ID, customerInfo, { parse_mode: 'Markdown' }).catch(()=>{});

        const trxSuccessText = "╔═════════════════════════════════╗\n║     🚀 TrxID SUBMITTED ✅       ║\n╚═════════════════════════════════╝\n✨ আপনার TrxID সফলভাবে অ্যাডমিনের কাছে পাঠানো হয়েছে।";

        return ctx.reply(trxSuccessText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (session && (session.step === 'awaiting_uid' || session.step === 'awaiting_uid_only')) {
        const isOnlyCheck = session.step === 'awaiting_uid_only';
        const uid = text;
        
        // Professional Thin Loading Animation (Progress bar style)
        const waitMsg = await ctx.reply('⏳ Verifying player info...\n\n▪️▫️▫️▫️▫️▫️▫️▫️▫️▫️ [ 10% ]');

        try {
            setTimeout(async () => {
                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, '🔄 Connecting with game server...\n\n▪️▪️▪️▪️▫️▫️▫️▫️▫️▫️ [ 40% ]', { parse_mode: 'Markdown' }).catch(() => {});
            }, 1000);

            setTimeout(async () => {
                await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, '⚡ Fetching player profile data...\n\n▪️▪️▪️▪️▪️▪️▪️▪️▫️▫️ [ 85% ]', { parse_mode: 'Markdown' }).catch(() => {});
            }, 2000);

            const nickname = await checkFreeFireUID(uid);

            setTimeout(async () => {
                if (isOnlyCheck) {
                    delete db.sessions[userId];
                    saveDatabase(db);
                    
                    const foundBox = "╔═════════════════════════════════╗\n║       🎉 ACCOUNT FOUND          ║\n╚═════════════════════════════════╝\n\n👤 Name: `" + nickname + "`\n\n🆔 UID: `" + uid + "`";

                    await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, foundBox, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]])
                    }).catch(() => {});
                } else {
                    session.step = 'review_order';
                    session.uid = uid;
                    session.nickname = nickname;
                    saveDatabase(db);

                    const userBal = db.balances[userId] || 0;
                    const slipText = "╔═════════════════════════════════╗\n║         📦 ORDER REVIEW         ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ 👤 Name: " + (ctx.from.first_name || 'User') + "\n│ 🎮 Game Name: `" + nickname + "`\n│ 🛡 UID: `" + uid + "`\n│ 💳 Price: ৳" + session.price + "\n│ 💰 Balance: ৳" + userBal + "\n└─────────────────────────────────┘";

                    await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, slipText, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('✅ Confirm Order 🚀', 'confirm_order'), Markup.button.callback('🔙 Back ↩️', 'shop_now_back')]
                        ])
                    }).catch(() => {});
                }
            }, 3000);

        } catch (error) {
            await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, '⚠️ API connection error. সঠিক UID দিয়ে আবার চেষ্টা করুন।').catch(() => {});
        }
        return;
    }

    // MAIN MENU BUTTONS
    if (text === '🛍️ Shop Now') {
        if (userId === ADMIN_ID.toString() && db.sessions[userId]) {
            db.sessions[userId].activeCategory = null;
            saveDatabase(db);
        }
        let inlineButtons = [
            [Markup.button.callback('🔥 Buy Free Fire Likes ⚡', 'cat_ff_likes')]
        ];

        const catKeys = Object.keys(db.categories || {});
        if (catKeys.length > 0) {
            catKeys.forEach((c) => {
                inlineButtons.push([Markup.button.callback('⭐ ' + c, 'custom_cat_' + c)]);
            });
        }

        inlineButtons.push([Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]);

        return ctx.reply("╔═════════════════════════════════╗\n║      🛍️ ALL AVAILABLE SHOP      ║\n╚═════════════════════════════════╝\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:", {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(inlineButtons)
        });
    }

    if (text === '🔍 Check FF UID') {
        db.sessions[userId] = { step: 'awaiting_uid_only' };
        saveDatabase(db);
        return ctx.reply('╔═════════════════════════════════╗\n║    🎮 FREE FIRE UID CHECKER     ║\n╚═════════════════════════════════╝\n\n✍️ UID লিখে পাঠান:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (text === '💰 Add Balance') {
        const depositMenuText = "╔═════════════════════════════════╗\n║   💰 ADD BALANCE & DEPOSIT 💰   ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ 💎 Min Deposit: `100.0 BDT`       │\n└─────────────────────────────────┘";
        return ctx.reply(depositMenuText, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('bKash 🌸', 'dep_bkash'), Markup.button.callback('Nagad 🧨', 'dep_nagad')],
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (text === '👤 My Profile') {
        const balance = db.balances[userId] || 0;
        const profileBoxText = "╔═════════════════════════════════╗\n║         👤 USER PROFILE         ║\n╚═════════════════════════════════╝\n🆔 Telegram ID: `" + userId + "`\n💰 Account Balance: `৳" + balance + "` 💳\n⚡═════════════════════════════════⚡";
        return ctx.reply(profileBoxText, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (text === '📜 Order History') {
        const historyBoxText = "╔═════════════════════════════════╗\n║    📜 PURCHASE & ORDER HISTORY  ║\n╚═════════════════════════════════╝\n❌ এখনো কোনো অর্ডার সম্পন্ন হয়নি!";
        return ctx.reply(historyBoxText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (text === '📞 Support Desk') {
        const supportInstructionBox = "╔═════════════════════════════════╗\n" +
                                       "║       📞 SUPPORT DESK 📞        ║\n" +
                                       "╚═════════════════════════════════╝\n" +
                                       "┌─────────────────────────────────┐\n" +
                                       "│ 💡 আপনার যেকোনো সমস্যা, TrxID বা  │\n" +
                                       "│ স্ক্রিনশট সরাসরি এই বটের চ্যাটেই   │\n" +
                                       "│ লিখে বা পাঠিয়ে দিন!             │\n" +
                                       "├─────────────────────────────────┤\n" +
                                       "│ ⚡ অ্যাডমিন খুব দ্রুত আপনার সাথে   │\n" +
                                       "│ যোগাযোগ করবেন। 👇              │\n" +
                                       "└─────────────────────────────────┘";
        return ctx.reply(supportInstructionBox, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    // GENERAL FREE TEXT OR SUPPORT MESSAGE
    if (userId !== ADMIN_ID.toString()) {
        const customerInfo = "╔═════════════════════════════════╗\n║    📥 NEW CUSTOMER MESSAGE      ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────┐\n│ 👤 Name: " + (ctx.from.first_name || 'N/A') + "\n│ 🔗 Username: " + (ctx.from.username ? '@' + ctx.from.username : 'N/A') + "\n│ 🆔 ID: `" + userId + "`\n└─────────────────────────────────┘";
        
        try {
            await bot.telegram.sendMessage(ADMIN_ID, customerInfo, { parse_mode: 'Markdown' });
            if (ctx.message.photo) {
                const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                await bot.telegram.sendPhoto(ADMIN_ID, photoId, { caption: ctx.message.caption || '' });
            } else if (ctx.message.text) {
                await bot.telegram.sendMessage(ADMIN_ID, "💬 Message: " + ctx.message.text);
            } else {
                await bot.telegram.copyMessage(ADMIN_ID, ctx.chat.id, ctx.message.message_id);
            }
        } catch (e) {
            console.error('Support forward error:', e);
        }

        const customerUniqueBox = "╔═════════════════════════════════╗\n" +
                                   "║      ✨ SUPPORT DESK ✨         ║\n" +
                                   "╚═════════════════════════════════╝\n" +
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
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }
});

bot.action(/dep_(bkash|nagad)/, async (ctx) => {
    const userId = ctx.from.id.toString();
    const method = ctx.match[1];
    const db = loadDatabase();
    if (!db.sessions) db.sessions = {};
    db.sessions[userId] = { step: 'awaiting_deposit_amount', method: method };
    saveDatabase(db);

    await ctx.editMessageText("╔═════════════════════════════════╗\n║     📥 " + method.toUpperCase() + " DEPOSIT 📥     ║\n╚═════════════════════════════════╝\n✍️ অ্যামাউন্ট পাঠান (যেমন: `100`):", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]
        ])
    });
});

bot.action(/copy_num_(.+)/, async (ctx) => {
    const num = ctx.match[1];
    await ctx.answerCbQuery('📋 Number copied!', { show_alert: false });
    await ctx.reply("╔═════════════════════════════════╗\n║     📋 PAYMENT NUMBER           ║\n╚═════════════════════════════════╝\n`" + num + "`", { parse_mode: 'Markdown' });
});

bot.action('set_bkash_prompt', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID.toString()) return;
    const db = loadDatabase();
    db.sessions[userId] = { step: 'waiting_set_bkash' };
    saveDatabase(db);
    await ctx.editMessageText('╔═════════════════════════════════╗\n║        📱 SET bKash             ║\n╚═════════════════════════════════╝\n✍️ বিকাশ নম্বর পাঠান:', { parse_mode: 'Markdown' });
});

bot.action('set_nagad_prompt', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID.toString()) return;
    const db = loadDatabase();
    db.sessions[userId] = { step: 'waiting_set_nagad' };
    saveDatabase(db);
    await ctx.editMessageText('╔═════════════════════════════════╗\n║         📱 SET NAGAD            ║\n╚═════════════════════════════════╝\n✍️ নগদ নম্বর পাঠান:', { parse_mode: 'Markdown' });
});

bot.action('shop_now_back', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    if (userId === ADMIN_ID.toString() && db.sessions[userId]) {
        db.sessions[userId].activeCategory = null;
        saveDatabase(db);
    }
    let inlineButtons = [
        [Markup.button.callback('🔥 Buy Free Fire Likes ⚡', 'cat_ff_likes')]
    ];

    const catKeys = Object.keys(db.categories || {});
    if (catKeys.length > 0) {
        catKeys.forEach((c) => {
            inlineButtons.push([Markup.button.callback('⭐ ' + c, 'custom_cat_' + c)]);
        });
    }

    inlineButtons.push([Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]);

    await ctx.editMessageText("╔═════════════════════════════════╗\n║      🛍️ ALL AVAILABLE SHOP      ║\n╚═════════════════════════════════╝\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineButtons)
    });
});

bot.action('cat_ff_likes', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    if (userId === ADMIN_ID.toString()) {
        if (!db.sessions[userId]) db.sessions[userId] = {};
        db.sessions[userId].activeCategory = 'Free Fire Likes';
        saveDatabase(db);
    }

    if (!db.customProducts) db.customProducts = {};
    if (!db.customProducts['Free Fire Likes']) {
        db.customProducts['Free Fire Likes'] = [
            { name: '220 Likes - ৳8' },
            { name: '6000 Likes - ৳300' }
        ];
        saveDatabase(db);
    }

    let inlineButtons = [];
    db.customProducts['Free Fire Likes'].forEach((p, idx) => {
        let callbackData = '';
        if (p.name.includes('220 Likes')) callbackData = 'pkg_like_220';
        else if (p.name.includes('6000 Likes')) callbackData = 'pkg_like_6000';
        else callbackData = 'sub_prod_Free Fire Likes_' + idx;

        inlineButtons.push([Markup.button.callback('⭐ ' + p.name, callbackData)]);
    });

    inlineButtons.push([Markup.button.callback('🔙 Back 🛍️', 'shop_now_back')]);

    await ctx.editMessageText('╔═════════════════════════════════╗\n║     🔥 FREE FIRE LIKES PACKS    ║\n╚═════════════════════════════════╝\n\n👇 প্যাকেজ সিলেক্ট করুন:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineButtons)
    });
});

bot.action(/custom_cat_(.+)/, async (ctx) => {
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
            inlineButtons.push([Markup.button.callback('⭐ ' + p.name, 'sub_prod_' + catName + '_' + idx)]);
        });
    }

    inlineButtons.push([Markup.button.callback('🔙 Back 🛍️', 'shop_now_back')]);

    await ctx.editMessageText("╔═════════════════════════════════╗\n║     📂 " + catName.toUpperCase() + "     ║\n╚═════════════════════════════════╝\n\n👇 প্যাকেজ সিলেক্ট করুন:", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineButtons)
    });
});

bot.action(/sub_prod_(.+)_(.+)/, async (ctx) => {
    const catName = ctx.match[1];
    const index = parseInt(ctx.match[2]);
    const db = loadDatabase();
    const prod = db.customProducts[catName] && db.customProducts[catName][index] ? db.customProducts[catName][index] : { name: 'Custom Package' };
    
    await ctx.answerCbQuery('⭐ ' + prod.name + ' selected!');
    await ctx.editMessageText("╔═════════════════════════════════╗\n║       📦 PRODUCT SELECTED       ║\n╚═════════════════════════════════╝\n📦 **Product:** `" + prod.name + "`\n\n💬 অর্ডারের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Shop 🛍️', 'shop_now_back')]
        ])
    });
});

bot.action(/pkg_like_(220|6000)/, async (ctx) => {
    const userId = ctx.from.id.toString();
    const amount = ctx.match[1];
    const price = amount === '220' ? 8 : 300;
    const db = loadDatabase();
    if (!db.sessions) db.sessions = {};
    db.sessions[userId] = { product: amount + ' Free Fire Likes', price: price };
    saveDatabase(db);

    await ctx.editMessageText("╔═════════════════════════════════╗\n║      🌍 SERVER SELECTION        ║\n╚═════════════════════════════════╝\nPackage: `" + amount + " Likes` (" + price + " BDT)\n\n👇 রিজিওন সিলেক্ট করুন:", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🇧🇩 BD (Bangladesh)', 'region_bd'), Markup.button.callback('🇮🇩 Indonesia', 'region_id')],
            [Markup.button.callback('🔙 Back ↩️', 'cat_ff_likes')]
        ])
    });
});

bot.action(/region_(bd|id)/, async (ctx) => {
    const userId = ctx.from.id.toString();
    const region = ctx.match[1].toUpperCase();
    const db = loadDatabase();
    if (db.sessions && db.sessions[userId]) {
        db.sessions[userId].region = region;
        db.sessions[userId].step = 'awaiting_uid';
        saveDatabase(db);
    }

    await ctx.editMessageText("╔═════════════════════════════════╗\n║      🎮 ENTER GAME UID          ║\n╚═════════════════════════════════╝\nServer: `" + region + "`\n\n✍️ UID পাঠান:", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back ↩️', 'cat_ff_likes')]])
    });
});

bot.action('confirm_order', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    const session = db.sessions && db.sessions[userId] ? db.sessions[userId] : null;
    if (!session) return ctx.answerCbQuery('❌ Session expired.', { show_alert: true });

    const userBal = db.balances[userId] || 0;
    if (userBal < session.price) {
        return ctx.answerCbQuery('❌ পর্যাপ্ত ব্যালেন্স নেই!', { show_alert: true });
    }

    if (!db.balances) db.balances = {};
    db.balances[userId] -= session.price;
    if (!db.adminSessions) db.adminSessions = {};

    const adminNotifyText = "╔═════════════════════════════════╗\n║   🔔 NEW ORDER PENDING APPROVAL ║\n╚═════════════════════════════════╝\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 Customer: " + ctx.from.first_name + "\n🆔 Customer ID: `" + userId + "`\n\n📦 Product: `" + session.product + "` (" + session.region + ")\n👤 Name: `" + session.nickname + "`\n🎮 UID: `" + session.uid + "`\n💵 Price: `৳" + session.price + "`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👇 Click below to enter likes details:";

    const sentAdminMsg = await bot.telegram.sendMessage(ADMIN_ID, adminNotifyText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Enter Details', 'admin_input_' + userId)],
            [Markup.button.callback('❌ Cancel', 'admin_can_' + userId)]
        ])
    }).catch(() => {});

    db.adminSessions[userId] = {
        loadingMessageId: ctx.callbackQuery.message.message_id,
        adminMsgId: sentAdminMsg ? sentAdminMsg.message_id : null,
        product: session.product,
        nickname: session.nickname,
        uid: session.uid,
        region: session.region,
        price: session.price
    };
    delete db.sessions[userId];
    saveDatabase(db);

    await ctx.editMessageText('⏳ Order request is processing...\n\n▪️▫️▫️▫️▫️▫️▫️▫️▫️▫️ [ 10% ]', { parse_mode: 'Markdown' });
    
    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, null, '🔄 Connecting with server...\n\n▪️▪️▪️▪️▫️▫️▫️▫️▫️▫️ [ 40% ]', { parse_mode: 'Markdown' }).catch(() => {});
    }, 1500);

    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, null, '⚡ Synchronizing likes with game...\n\n▪️▪️▪️▪️▪️▪️▪️▪️▫️▫️ [ 85% ] (Hold)', { parse_mode: 'Markdown' }).catch(() => {});
    }, 3000);
});

bot.action(/admin_input_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    if (!db.adminInputSession) db.adminInputSession = {};
    db.adminInputSession[userId] = { step: 'awaiting_order_details', targetUserId: targetUserId };
    saveDatabase(db);

    await ctx.answerCbQuery('✍️ Chat-e 3 line-e like details pathan!');
    await ctx.reply("╔═════════════════════════════════╗\n║        📝 ORDER DETAILS         ║\n╚═════════════════════════════════╝\nChat-e nicher moto 3 ti line pathan:\n1. Previous Likes\n2. Current Likes\n3. Added Likes", { parse_mode: 'Markdown' });
});

bot.action(/admin_can_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
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
            await bot.telegram.editMessageText(targetUserId, loadingMsgId, null, "╔═════════════════════════════════╗\n║      ❌ ORDER CANCELLED         ║\n╚═════════════════════════════════╝\n⚠️ আপনার অর্ডারটি বাতিল করা হয়েছে এবং টাকা রিফান্ড করা হয়েছে।", {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]])
            }).catch(() => {});
        }
        delete dbObj.adminSessions[targetUserId];
        saveDatabase(dbObj);
    }

    await bot.telegram.sendMessage(targetUserId, '❌ আপনার অর্ডারটি বাতিল করা হয়েছে।').catch(() => {});
});

bot.action('back_start_inline', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    if (db.sessions && db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
    await ctx.editMessageText('✨ মূল মেনুতে ফিরে এসেছেন:', { parse_mode: 'Markdown' }).catch(() => {});
});

bot.action('back_start', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    if (db.sessions && db.sessions[userId]) { delete db.sessions[userId]; saveDatabase(db); }
    await ctx.reply('🔙 মূল মেনুতে ফিরে এসেছেন:', { ...getMainKeyboard(userId) });
});

const webhookPath = '/secret-path-' + BOT_TOKEN.split(':')[0];
const fullWebhookUrl = RENDER_URL + webhookPath;

bot.telegram.setWebhook(fullWebhookUrl, { drop_pending_updates: true })
    .then(() => console.log('Webhook set successfully to: ' + fullWebhookUrl))
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

server.listen(PORT, () => { console.log('HTTP Server listening on port ' + PORT); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
