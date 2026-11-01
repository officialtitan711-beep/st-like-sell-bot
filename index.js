const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');
const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN || '8395471740:AAF-v0dAgc36nL7sb1G5Dy6IzHmsCUlwe80';
const ADMIN_ID = process.env.ADMIN_ID || '5932254012';
const CHANNEL_ID = process.env.CHANNEL_ID || '@shohan2004';
const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://m.youtube.com/@ShohanSir18';

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://st-like-sell-bot.onrender.com';
const PORT = process.env.PORT || 3000;
const DB_FILE = 'database.json';

const bot = new Telegraf(BOT_TOKEN);

// ডাটাবেজ হ্যান্ডলিং
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            if (data.trim() === '') return { users: {}, balances: {}, sessions: {}, numbers: {}, customProducts: [], allowedUsers: {} };
            const parsed = JSON.parse(data);
            if (!parsed.users) parsed.users = {};
            if (!parsed.balances) parsed.balances = {};
            if (!parsed.sessions) parsed.sessions = {};
            if (!parsed.numbers) parsed.numbers = {};
            if (!parsed.customProducts) parsed.customProducts = [];
            if (!parsed.allowedUsers) parsed.allowedUsers = {};
            return parsed;
        }
    } catch (e) { console.error('DB Load Error:', e); }
    return { users: {}, balances: {}, sessions: {}, numbers: {}, customProducts: [], allowedUsers: {} };
}

function saveDatabase(data) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('DB Save Error:', e); }
}

// 🛡️ রিয়েল-টাইম টেলিগ্রাম চ্যানেল সাবস্ক্রিপশন চেক
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

// 📢 ফোর্সিং সাবস্ক্রাইব ও অ্যাডমিন অ্যাক্সেস মেসেজ (ডিজাইন করা)
async function sendForceSubMessage(ctx, isPendingAdminAccess = false) {
    let text;
    let keyboard;

    if (isPendingAdminAccess) {
        text = 
`╔═════════════════════════════════╗
║    ⚠️ ACCESS PENDING APPROVAL   ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ আপনার টেলিগ্রাম ভেরিফিকেশন সফল! ✅ │
│ তবে প্রিমিয়াম বটের ফুল অ্যাক্সেস পেতে   │
│ নিচের অ্যাডমিনকে মেসেজ করে পারমিশন   │
│ নিয়ে নিন।                       │
└─────────────────────────────────┘

✦ ── ✦ ── ✦ ── ✦ ── ✦
👑 **অ্যাডমিন আইডি:** \`@sonu1813\`
✦ ── ✦ ── ✦ ── ✦ ── ✦`;

        keyboard = Markup.inlineKeyboard([
            [Markup.button.url('💬 Message Admin', 'https://t.me/sonu1813')],
            [Markup.button.callback('🔄 𝐕𝐞𝐫𝐢𝐟𝐲 𝐀𝗰𝗰e𝘀𝘀', 'verify_sub')]
        ]);
    } else {
        text = 
`╔═════════════════════════════════╗
║     🔒 SECURITY ALERT & LOCK    ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ বট ব্যবহার করতে হলে অবশ্যই আমাদের   │
│ অফিশিয়াল চ্যানেলে জয়েন থাকতে হবে!  │
└─────────────────────────────────┘

👉 **নিয়মাবলী:**
1️⃣ প্রথমে **📢 Join Telegram Channel**-এ ক্লিক করুন।
2️⃣ ইউটিউব চ্যানেল সাবস্ক্রাইব করুন।
3️⃣ সবশেষে **🔄 𝐕𝐞𝐫𝐢𝐟𝐲 𝐌𝐞𝐦𝐛𝐞𝐫𝐬𝐡ᱤপ** বাটনে ক্লিক করুন।`;
        
        keyboard = Markup.inlineKeyboard([
            [Markup.button.url('📢 Join Telegram Channel', 'https://t.me/shohan2004')],
            [Markup.button.url('🔴 Subscribe YouTube', YOUTUBE_URL)],
            [Markup.button.callback('🔄 𝐕𝐞𝐫𝐢𝐟𝐲 𝐌𝐞𝐦𝐛𝐞𝐫𝐬𝐡ᱤপ', 'verify_sub')]
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

// ✨ স্মার্ট মেনু
function getMainKeyboard(userId) {
    let keyboard = [
        ['🛍️ All Products', '🔍 Check FF UID'],
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

// 🔍 UID চেকিং ফাংশন
function checkFreeFireUID(uid) {
    return new Promise((resolve) => {
        const url = `https://akmtopup.com/api/checkuid?uid=${uid}`;
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
                } catch (e) { resolve('Unknown Player'); }
            });
        }).on('error', () => { resolve('Unknown Player'); });
    });
}

// 🛡️ গ্লোবাল মিডলওয়্যার
bot.use(async (ctx, next) => {
    try {
        if (ctx && ctx.from) {
            const userId = ctx.from.id.toString();
            
            const db = loadDatabase();
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
    } catch (err) { console.error('Middleware Error:', err); }
});

// ✨ /start কমান্ড
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

    const welcomeText = 
`╔═════════════════════════════════╗
║      ✨ ST LIKE ~ SELL BOT ✨     ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ স্বাগতম! আমাদের প্রিমিয়াম সার্ভিসে    │
│ আপনাকে স্বাগতম জানাই।            │
└─────────────────────────────────┘

👇 আপনার পছন্দের সার্ভিসটি নিচের মেনু থেকে সিলেক্ট করুন:`;

    return ctx.reply(welcomeText, {
        parse_mode: 'Markdown',
        ...getMainKeyboard(userId)
    });
});

// 🔄 ভেরিফাই বাটন হ্যান্ডলার
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

    const successText = 
`╔═════════════════════════════════╗
║     🎉 VERIFICATION SUCCESS     ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ আপনার অ্যাকাউন্ট সফলভাবে ভেরিফাই     │
│ করা হয়েছে!                      │
└─────────────────────────────────┘

👇 সার্ভিস বেছে নিতে নিচের মেনু ব্যবহার করুন:`;

    return ctx.reply(successText, {
        parse_mode: 'Markdown',
        ...getMainKeyboard(userId)
    });
});

// 📥 টেক্সট কমান্ড ও ইউজার মেসেজ হ্যান্ডলার
bot.on('message', async (ctx) => {
    if (!ctx.message || !ctx.message.text) return;
    const userId = ctx.from.id.toString();
    const text = ctx.message.text.trim();
    const db = loadDatabase();
    if (!db.balances) db.balances = {};
    if (!db.sessions) db.sessions = {};
    if (!db.numbers) db.numbers = {};
    if (!db.customProducts) db.customProducts = [];
    if (!db.users) db.users = {};
    if (!db.allowedUsers) db.allowedUsers = {};

    // --- ১. অ্যাডমিন যদি কাস্টমারের মেসেজে সরাসরি টেলিগ্রাম Reply করে ---
    if (userId === ADMIN_ID.toString() && ctx.message.reply_to_message) {
        const repliedText = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
        const match = repliedText.match(/ID:\s*`(\d+)`/) || repliedText.match(/আইডি:\s*`(\d+)`/);
        if (match && match[1]) {
            const targetUserId = match[1];
            try {
                await bot.telegram.sendMessage(targetUserId, `💬 **অ্যাডমিনের উত্তর:**\n\n${text}`, { parse_mode: 'Markdown' });
                return ctx.reply(`✅ ইউজারে মেসেজ পাঠানো সফল হয়েছে!`);
            } catch (e) {
                return ctx.reply(`❌ মেসেজ পাঠানো যায়নি। ইউজার হয়তো বট ব্লক করে রেখেছে।`);
            }
        }
    }

    // --- ২. অ্যাডমিন কন্ট্রোল প্যানেল ফিচারসমূহ ---
    if (userId === ADMIN_ID.toString()) {
        if (text === '➕ Add Bot') {
            db.sessions[userId] = { step: 'admin_add_bot_prompt' };
            saveDatabase(db);
            return ctx.reply(
                `╔═════════════════════════════════╗
║       ➕ ADD BOT PERMISSION     ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ যে ইউজারের আইডি বা ইউজারনেম      │
│ পারমিশন দিতে চান তা লিখে পাঠান:   │
│ *(উদাহরণ: \`123456789\`)*        │
└─────────────────────────────────┘`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]]) }
            );
        }

        if (text === '❌ Remove Bot') {
            db.sessions[userId] = { step: 'admin_remove_bot_prompt' };
            saveDatabase(db);
            return ctx.reply(
                `╔═════════════════════════════════╗
║      ❌ REMOVE BOT ACCESS       ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ যে ইউজারের অ্যাক্সেস রিমুভ বা ব্লক   │
│ করতে চান তার আইডি লিখে পাঠান:     │
│ *(উদাহরণ: \`123456789\`)*        │
└─────────────────────────────────┘`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]]) }
            );
        }

        if (text === '💳 Add/Minus Balance') {
            db.sessions[userId] = { step: 'admin_balance_prompt' };
            saveDatabase(db);
            return ctx.reply(
                `╔═════════════════════════════════╗
║     🛠️ BALANCE MANAGEMENT       ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ ব্যালেন্স যোগ বা কাটতে ফরম্যাট মেনে   │
│ লিখে পাঠান:                     │
│ 👉 \`[User_ID] [টাকার পরিমাণ]\`   │
│ *(প্লাস: \`123456789 100\`)*     │
│ *(মাইনাস: \`123456789 -50\`)*    │
└─────────────────────────────────┘`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]]) }
            );
        }

        if (text === '📱 Set Payment Numbers') {
            return ctx.reply(
                `╔═════════════════════════════════╗
║     📱 PAYMENT NUMBER SETUP     ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ কোন মাধ্যমের নম্বর সেট বা পরিবর্তন   │
│ করতে চান তা নিচের অপশন থেকে      │
│ সিলেক্ট করুন:                    │
└─────────────────────────────────┘`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('📱 Set bKash', 'set_bkash_prompt'), Markup.button.callback('📱 Set Nagad', 'set_nagad_prompt')],
                    [Markup.button.callback('🔙 Main Menu', 'back_start')]
                ])
            );
        }

        if (text === '➕ Add Product') {
            db.sessions[userId] = { step: 'admin_add_product' };
            saveDatabase(db);
            return ctx.reply(
                `╔═════════════════════════════════╗
║       📦 ADD NEW PRODUCT        ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ প্রোডাক্টের নাম এবং দাম একসাথে     │
│ লিখে পাঠান:                     │
│ *(উদাহরণ: \`Guild Glory 150৳\`)*  │
└─────────────────────────────────┘`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]]) }
            );
        }

        if (text === '❌ Remove Product') {
            if (db.customProducts.length === 0) {
                return ctx.reply('⚠️ বর্তমানে কোনো কাস্টম প্রোডাক্ট অ্যাড করা নেই।');
            }
            let listText = '╔═════════════════════════════════╗\n║      🗑️ REMOVE PRODUCT          ║\n╚═════════════════════════════════╝\n┌─────────────────────────────────\n';
            db.customProducts.forEach((p, index) => {
                listText += `│ ${index + 1}. \`${p}\`\n`;
            });
            listText += '└─────────────────────────────────\n\n✍️ রিমুভ করার জন্য সঠিক নামটি লিখে পাঠান:';
            db.sessions[userId] = { step: 'admin_remove_product' };
            saveDatabase(db);
            return ctx.reply(listText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]]) });
        }

        if (text === '📊 Total Users') {
            const allowedIds = Object.keys(db.allowedUsers || {});
            if (allowedIds.length === 0) return ctx.reply('⚠️ বর্তমানে কোনো অ্যাক্সেসপ্রাপ্ত ইউজার নেই।');
            
            let list = `📊 **Total Active Bot Users (${allowedIds.length} জন)**\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
            allowedIds.forEach((uid, index) => {
                const u = db.users[uid] || { first_name: 'Unknown', username: 'N/A' };
                const bal = db.balances[uid] || 0;
                list += `${index + 1}. নাম: ${u.first_name} (${u.username})\n   🆔 ID: \`${uid}\`\n   💰 ব্যালেন্স: \`${bal} BDT\`\n\n`;
            });
            return ctx.reply(list, { parse_mode: 'Markdown' });
        }

        if (text === '📩 Send Message') {
            db.sessions[userId] = { step: 'admin_send_msg_prompt' };
            saveDatabase(db);
            return ctx.reply(
                `╔═════════════════════════════════╗
║      📩 SEND DIRECT MESSAGE     ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ নির্দিষ্ট ইউজারে মেসেজ পাঠাতে ফরম্যাট: │
│ 👉 \`[User_ID] [আপনার মেসেজ]\`   │
└─────────────────────────────────┘`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]]) }
            );
        }

        if (text === '📢 All Users Msg') {
            db.sessions[userId] = { step: 'admin_broadcast_prompt' };
            saveDatabase(db);
            return ctx.reply(
                `╔═════════════════════════════════╗
║        📢 BROADCAST NOTICE      ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ যে এনাউন্সমেন্ট বা মেসেজটি সব ইউজারের │
│ কাছে পাঠাতে চান তা লিখে পাঠান:   │
└─────────────────────────────────┘`,
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]]) }
            );
        }
    }

    // প্রসেসিং: অ্যাড বট পারমিশন
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_add_bot_prompt') {
        let query = text.replace('@', '').trim();
        let targetId = query;

        if (isNaN(query)) {
            const foundUid = Object.keys(db.users).find(uid => db.users[uid].username.replace('@', '').toLowerCase() === query.toLowerCase());
            if (foundUid) targetId = foundUid;
        }

        db.allowedUsers[targetId] = true;
        delete db.sessions[userId];
        saveDatabase(db);

        bot.telegram.sendMessage(targetId, '🎉 **অভিনন্দন!** অ্যাডমিন আপনার বট অ্যাক্সেস অনুমোদন করেছেন। এখন আপনি বট ব্যবহার করতে পারবেন। নিচে /start দিয়ে শুরু করুন।', { parse_mode: 'Markdown' }).catch(()=>{});
        return ctx.reply(`✅ সফলভাবে ইউজার \`${targetId}\`-কে পারমিশন দেওয়া হয়েছে।`, { parse_mode: 'Markdown' });
    }

    // প্রসেসিং: রিমুভ বট পারমিশন
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_remove_bot_prompt') {
        let query = text.replace('@', '').trim();
        let targetId = query;

        if (isNaN(query)) {
            const foundUid = Object.keys(db.users).find(uid => db.users[uid].username.replace('@', '').toLowerCase() === query.toLowerCase());
            if (foundUid) targetId = foundUid;
        }

        delete db.allowedUsers[targetId];
        delete db.sessions[userId];
        saveDatabase(db);

        bot.telegram.sendMessage(targetId, '❌ দুঃখিত, অ্যাডমিন আপনার বটের অ্যাক্সেস রিমুভ বা ব্লক করে দিয়েছেন।', { parse_mode: 'Markdown' }).catch(()=>{});
        return ctx.reply(`🗑️ সফলভাবে ইউজার \`${targetId}\`-কে রিমুভ করা হয়েছে।`, { parse_mode: 'Markdown' });
    }

    // প্রসেসিং: নির্দিষ্ট ইউজারে মেসেজ
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_send_msg_prompt') {
        const firstSpace = text.indexOf(' ');
        if (firstSpace !== -1) {
            const targetId = text.substring(0, firstSpace).trim();
            const messageToSend = text.substring(firstSpace + 1).trim();

            delete db.sessions[userId];
            saveDatabase(db);

            try {
                await bot.telegram.sendMessage(targetId, `📢 **অ্যাডমিন নোটিশ:**\n\n${messageToSend}`, { parse_mode: 'Markdown' });
                return ctx.reply(`✅ সফলভাবে ইউজার \`${targetId}\`-কে মেসেজ পাঠানো হয়েছে।`, { parse_mode: 'Markdown' });
            } catch (e) {
                return ctx.reply(`❌ মেসেজ পাঠানো যায়নি।`);
            }
        }
    }

    // প্রসেসিং: ব্রডকাস্ট অ্যানাউন্সমেন্ট (আপনার স্ক্রিনশটের হুবহু ফাইনাল ডিজাইন)
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_broadcast_prompt') {
        delete db.sessions[userId];
        saveDatabase(db);

        const userKeys = Object.keys(db.allowedUsers || {});
        let successCount = 0;

        const broadcastText = 
`╔═════════════════════════════════╗
║    ✦🌟 ST LIKE BOT NOTICE 🌟✦    ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ ${text}
└─────────────────────────────────┘

👑 Admin: @sonu1813`;

        for (const uid of userKeys) {
            try {
                await bot.telegram.sendMessage(uid, broadcastText, { parse_mode: 'Markdown' });
                successCount++;
            } catch (e) {}
        }

        return ctx.reply(`✅ ব্রডকাস্ট সফল! অনুমোদিত মোট \`${successCount}\` জন ইউজারের কাছে মেসেজ পাঠানো হয়েছে।`, { parse_mode: 'Markdown' });
    }

    // অ্যাডমিন প্রসেসিং: ব্যালেন্স আপডেট
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_balance_prompt') {
        const parts = text.split(' ');
        if (parts.length >= 2) {
            const targetId = parts[0].trim();
            const amount = parseFloat(parts[1]);

            if (isNaN(amount)) {
                return ctx.reply('❌ সঠিক টাকার পরিমাণ দিন। যেমন: `123456789 50`', { parse_mode: 'Markdown' });
            }

            if (!db.balances[targetId]) db.balances[targetId] = 0;
            db.balances[targetId] += amount;
            const newBal = db.balances[targetId];
            delete db.sessions[userId];
            saveDatabase(db);

            if (amount >= 0) {
                bot.telegram.sendMessage(targetId, `🎉 **আপনার অ্যাকাউন্টে ব্যালেন্স যোগ করা হয়েছে!**\n\n➕ অ্যাড হয়েছে: \`${amount} BDT\`\n💰 বর্তমান ব্যালেন্স: \`${newBal} BDT\``, { parse_mode: 'Markdown' }).catch(()=>{});
                return ctx.reply(`✅ সফলভাবে ইউজার \`${targetId}\`-এর অ্যাকাউন্টে \`${amount} BDT\` যোগ করা হয়েছে। নতুন ব্যালেন্স: \`${newBal} BDT\``, { parse_mode: 'Markdown' });
            } else {
                const absAmount = Math.abs(amount);
                bot.telegram.sendMessage(targetId, `⚠️ আপনার অ্যাকাউন্ট থেকে \`${absAmount} BDT\` কেটে নেওয়া হয়েছে!\n💰 বর্তমান ব্যালেন্স: \`${newBal} BDT\``, { parse_mode: 'Markdown' }).catch(()=>{});
                return ctx.reply(`🔻 ইউজার \`${targetId}\`-এর অ্যাকাউন্ট থেকে \`${absAmount} BDT\` মাইনাস করা হয়েছে। বর্তমান ব্যালেন্স: \`${newBal} BDT\``, { parse_mode: 'Markdown' });
            }
        }
    }

    // অ্যাডমিন প্রসেসিং: নাম্বার সেটআপ
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step?.startsWith('waiting_set_')) {
        const method = db.sessions[userId].step.replace('waiting_set_', '');
        db.numbers[method] = text;
        delete db.sessions[userId];
        saveDatabase(db);
        return ctx.reply(`✅ সফলভাবে ${method.toUpperCase()} নম্বর আপডেট করা হয়েছে: \`${text}\``, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    }

    // অ্যাডমিন প্রসেসিং: নতুন প্রোডাক্ট সেভ
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_add_product') {
        db.customProducts.push(text);
        delete db.sessions[userId];
        saveDatabase(db);
        return ctx.reply(`✅ সফলভাবে নতুন প্রোডাক্ট অ্যাড করা হয়েছে: \`${text}\``, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    }

    // অ্যাডমিন প্রসেসিং: প্রোডাক্ট রিমুভ
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_remove_product') {
        const index = db.customProducts.indexOf(text);
        if (index > -1) {
            db.customProducts.splice(index, 1);
            delete db.sessions[userId];
            saveDatabase(db);
            return ctx.reply(`🗑️ প্রোডাক্ট সফলভাবে রিমুভ করা হয়েছে: \`${text}\``, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
        } else {
            return ctx.reply(`❌ এই নামের কোনো প্রোডাক্ট পাওয়া যায়নি। সঠিক নামটি লিখে পাঠান।`);
        }
    }

    // --- ৩. কাস্টমার সাধারণ মেসেজ বা স্ক্রিনশট ফরোয়ার্ড হওয়া ---
    if (userId !== ADMIN_ID.toString()) {
        const customerInfo = 
`📥 **NEW CUSTOMER MESSAGE!** 📥
━━━━━━━━━━━━━━━━━━━
👤 নাম: ${ctx.from.first_name || 'N/A'}
🔗 ইউজারনেম: ${ctx.from.username ? '@' + ctx.from.username : 'N/A'}
🆔 ID: \`${userId}\`
━━━━━━━━━━━━━━━━━━━`;

        await bot.telegram.sendMessage(ADMIN_ID, customerInfo, { parse_mode: 'Markdown' }).catch(()=>{});
        await ctx.telegram.forwardMessage(ADMIN_ID, ctx.chat.id, ctx.message.message_id).catch(()=>{});
    }

    // --- কাস্টমার মেনু অপশন (ডিজাইন ও ইমোজি সহ) ---
    if (text === '🛍️ All Products') {
        let productMsg = 
`╔═════════════════════════════════╗
║     🛍️ ALL PRODUCTS & SERVICES    ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ 🔥 **1. Free Fire Likes:**      │
│ • 220 Likes - ৳8                │
│ • 6000 Likes - ৳300             │
└─────────────────────────────────┘\n`;
        
        if (db.customProducts.length > 0) {
            productMsg += 
`┌─────────────────────────────────┐
│ ⭐ **2. Special & Guild Products:**\n`;
            db.customProducts.forEach((p, idx) => {
                productMsg += `│ • ${idx + 1}. ${p}\n`;
            });
            productMsg += `└─────────────────────────────────┘`;
        }

        return ctx.reply(productMsg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔥 Buy Free Fire Likes', 'cat_ff_likes')],
                [Markup.button.callback('🔙 Main Menu', 'back_start')]
            ])
        });
    }

    if (text === '🔍 Check FF UID') {
        db.sessions[userId] = { step: 'awaiting_uid_only' };
        saveDatabase(db);
        return ctx.reply(
            `╔═════════════════════════════════╗
║      🎮 FREE FIRE UID CHECKER   ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ যে প্লেয়ারের নাম চেক করতে চান, তার   │
│ সঠিক **UID** (যেমন: \`9884223138\`)   │
│ নিচে চ্যাটে লিখে পাঠান:          │
└─────────────────────────────────┘`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]])
        });
    }

    if (text === '💰 Add Balance') {
        const bkash = db.numbers.bkash || '01XXXXXXXXX (Personal)';
        const nagad = db.numbers.nagad || '01XXXXXXXXX (Personal)';

        return ctx.reply(
            `╔═════════════════════════════════╗
║     💳 DEPOSIT & PAYMENT DESK   ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ ⚠️ **সতর্কবার্তা:** টাকা পাঠানোর সময়    │
│ **অবশ্যই সর্বনিম্ন ১০০ টাকা** ডিপোজিট   │
│ করতে হবে। ১০০ টাকার কম অগ্রহণযোগ্য! │
└─────────────────────────────────┘

📱 **bKash (Personal):** \`${bkash}\`
📱 **Nagad (Personal):** \`${nagad}\`

💡 সেন্ড মানি করার পর TrxID বা স্ক্রিনশট সরাসরি এই চ্যাটে পাঠিয়ে দিন!`,
            { parse_mode: 'Markdown' }
        );
    }

    if (text === '👤 My Profile') {
        const balance = db.balances[userId] || 0;
        return ctx.reply(
            `╔═════════════════════════════════╗
║          👤 MY PROFILE          ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ 🆔 Telegram ID: \`${userId}\`     │
│ 💰 ব্যালেন্স: \`${balance} BDT\`       │
│ 📦 মোট অর্ডার: \`০ টি\`            │
│ ❤️ মোট লাইক: \`০ টি\`            │
└─────────────────────────────────┘`, { parse_mode: 'Markdown' });
    }

    if (text === '📜 Order History') {
        return ctx.reply(
            `╔═════════════════════════════════╗
║         📜 ORDER HISTORY        ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ আপনার পূর্ববর্তী সফল অর্ডারগুলোর তালিকা: │
│ ✨ কোনো অর্ডার পাওয়া যায়নি।       │
└─────────────────────────────────┘`, { parse_mode: 'Markdown' });
    }

    if (text === '📞 Support Desk') {
        return ctx.reply(
            `╔═════════════════════════════════╗
║          📞 SUPPORT DESK        ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ আপনার যেকোনো সমস্যা, TrxID বা     │
│ স্ক্রিনশট এখানে সরাসরি পাঠান,    │
│ অ্যাডমিন দ্রুত দেখে দেবেন।       │
└─────────────────────────────────┘`, { parse_mode: 'Markdown' });
    }

    // UID ইনপুট প্রসেসিং
    const session = db.sessions[userId];
    if (session && (session.step === 'awaiting_uid' || session.step === 'awaiting_uid_only')) {
        const isOnlyCheck = session.step === 'awaiting_uid_only';
        const uid = text;

        const waitMsg = await ctx.reply('⏳ সার্ভার থেকে প্লেয়ারের তথ্য যাচাই করা হচ্ছে, দয়া করে অপেক্ষা করুন...');

        try {
            const nickname = await checkFreeFireUID(uid);
            await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

            if (isOnlyCheck) {
                delete db.sessions[userId];
                saveDatabase(db);
                return ctx.reply(
                    `╔═════════════════════════════════╗
║     🎉 ACCOUNT FOUND SUCCESS    ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ 🆔 **UID:** \`${uid}\`              │
│ 👤 **Player Name:** \`${nickname}\`    │
└─────────────────────────────────┘`, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu', 'back_start')]])
                });
            }

            session.step = 'review_order';
            session.uid = uid;
            session.nickname = nickname;
            saveDatabase(db);

            const userBal = db.balances[userId] || 0;
            const slipText = 
`╭━━━━━━━━━━━━━━━━━━━━━━━╮
│  ✨ 𝖲𝖳 𝖫𝖨𝖪𝖤 ~ 𝖲𝖤𝖫𝖫 𝖡𝖮𝖳 ✨  │
╰━━━━━━━━━━━━━━━━━━━━━━━╯
👤 **কাস্টমার ইনফো:**
• নাম: ${ctx.from.first_name || 'User'}
• ইউজারনেম: ${ctx.from.username ? '@' + ctx.from.username : 'N/A'}
• টেলিগ্রাম আইডি: \`${userId}\`

━━━━━━━━━━━━━━━━━━━━━━━
🎮 **গেম অ্যাকাউন্ট ডিটেইলস:**
• গেমের রিয়েল নাম: \`${nickname}\`
• গেমের UID: \`${uid}\`

━━━━━━━━━━━━━━━━━━━━━━━
📦 **অর্ডার ও পেমেন্ট সামারি:**
• প্যাকেজ: ${session.product}
• সার্ভার / রিজিওন: 🇧🇩 ${session.region}
• প্যাকেজের দাম: ৳${session.price}
• আপনার বর্তমান ব্যালেন্স: ৳${userBal}
• কাটবে মোট: ৳${session.price}
━━━━━━━━━━━━━━━━━━━━━━━
⚠️ অনুগ্রহ করে তথ্যগুলো মিলিয়ে নিচে **Confirm** বাটনে ক্লিক করুন।`;

            await ctx.reply(slipText, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Confirm Order', 'confirm_order'), Markup.button.callback('❌ Cancel', 'back_start')]
                ])
            });

        } catch (error) {
            await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
            await ctx.reply(`⚠️ নেম চেকার এপিআই কানেক্ট করতে সমস্যা হয়েছে। দয়া করে সঠিক UID দিয়ে আবার চেষ্টা করুন।`);
        }
        return;
    }
});

// 📱 অ্যাডমিন নাম্বার সেটআপ ইনলাইন বাটন হ্যান্ডলার
bot.action('set_bkash_prompt', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID.toString()) return;
    const db = loadDatabase();
    db.sessions[userId] = { step: 'waiting_set_bkash' };
    saveDatabase(db);
    await ctx.editMessageText('📱 অনুগ্রহ করে নতুন **বিকাশ নম্বরটি** লিখে চ্যাটে পাঠান:', { parse_mode: 'Markdown' });
});

bot.action('set_nagad_prompt', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID.toString()) return;
    const db = loadDatabase();
    db.sessions[userId] = { step: 'waiting_set_nagad' };
    saveDatabase(db);
    await ctx.editMessageText('📱 অনুগ্রহ করে নতুন **নগদ নম্বরটি** লিখে চ্যাটে পাঠান:', { parse_mode: 'Markdown' });
});

// 🔥 ক্যাটাগরি ও প্যাকেজ হ্যান্ডলার
bot.action('cat_ff_likes', async (ctx) => {
    ctx.editMessageText(
        `╔═════════════════════════════════╗
║     🔥 FREE FIRE LIKES MENU     ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ আপনার পছন্দের লাইক প্যাকেজটি সিলেক্ট    │
│ করুন:                           │
└─────────────────────────────────┘`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('⚡ 220 Likes - ৳8', 'pkg_like_220')],
            [Markup.button.callback('🚀 6000 Likes - ৳300', 'pkg_like_6000')],
            [Markup.button.callback('🔙 Back', 'back_start')]
        ])
    });
});

bot.action(/pkg_like_(220|6000)/, async (ctx) => {
    const userId = ctx.from.id.toString();
    const amount = ctx.match[1];
    const price = amount === '220' ? 8 : 300;

    const db = loadDatabase();
    if (!db.sessions) db.sessions = {};
    db.sessions[userId] = { product: `${amount} Free Fire Likes`, price: price };
    saveDatabase(db);

    ctx.editMessageText(
        `╔═════════════════════════════════╗
║     🌍 SERVER / REGION SELECTION║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ প্যাকেজ: \`${amount} Likes\` (${price} BDT)    │
│ দয়া করে গেমের সার্ভার সিলেক্ট করুন:   │
└─────────────────────────────────┘`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🇧🇩 BD (Bangladesh)', 'region_bd'), Markup.button.callback('🇮🇩 Indonesia', 'region_id')],
            [Markup.button.callback('🔙 Back', 'cat_ff_likes')]
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

    ctx.editMessageText(
        `╔═════════════════════════════════╗
║       🎮 ENTER GAME UID         ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ সার্ভার: \`${region}\`                      │
│ ✍️ অনুগ্রহ করে প্লেয়ারের সঠিক **UID**    │
│ (যেমন: \`9884223138\`) লিখে পাঠান:  │
└─────────────────────────────────┘`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]])
    });
});

// ⚡ অর্ডার কনফার্মেশন
bot.action('confirm_order', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    const session = db.sessions?.[userId];
    if (!session) return ctx.answerCbQuery('❌ সেশন মেয়াদোত্তীর্ণ হয়েছে।', { show_alert: true });

    const userBal = db.balances[userId] || 0;
    if (userBal < session.price) {
        return ctx.answerCbQuery('❌ আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!', { show_alert: true });
    }

    let msg = await ctx.reply('⏳ অর্ডারের রিকোয়েস্ট প্রসেসিং হচ্ছে...\n\n[▒▒▒▒▒▒▒▒▒▒] 10%');
    
    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '🔄 সার্ভারের সাথে কানেক্ট করা হচ্ছে...\n\n[████▒▒▒▒▒▒] 40%').catch(() => {});
    }, 1500);

    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '⚡ গেমের সাথে লাইক সিনক্রোনাইজ হচ্ছে...\n\n[████████▒▒] 80%').catch(() => {});
    }, 3000);

    setTimeout(async () => {
        if (!db.balances) db.balances = {};
        db.balances[userId] -= session.price;
        delete db.sessions[userId];
        saveDatabase(db);

        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, 
            `✅ **সফলভাবে অর্ডার কমপ্লিট!**\n\n[██████████] 100%\n\n📦 প্যাকেজ: \`${session.product}\`\n🆔 UID: \`${session.uid}\`\n👤 নাম: \`${session.nickname}\`\n💰 অবশিষ্ট ব্যালেন্স: \`৳${db.balances[userId]}\``, 
            { parse_mode: 'Markdown' }
        );

        const adminNotifyText = 
`🔔 **NEW ORDER PLACED!** 🔔
━━━━━━━━━━━━━━━━━━━
👤 কাস্টমার: ${ctx.from.first_name} (@${ctx.from.username || 'N/A'})
🆔 কাস্টমার আইডি: \`${userId}\`
📦 প্রোডাক্ট: \`${session.product}\` (${session.region})
🎮 গেম UID: \`${session.uid}\`
👤 গেম নেম: \`${session.nickname}\`
💵 মূল্য: \`৳${session.price}\`
━━━━━━━━━━━━━━━━━━━`;

        await bot.telegram.sendMessage(ADMIN_ID, adminNotifyText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(`✅ Approve [${userId}]`, `admin_app_${userId}`), Markup.button.callback(`❌ Cancel [${userId}]`, `admin_can_${userId}`)]
            ])
        }).catch(() => {});

    }, 4500);
});

bot.action(/admin_app_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await ctx.answerCbQuery('✅ অর্ডারটি অ্যাপ্রুভ করা হয়েছে!');
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n**[STATUS: APPROVED ✅]**', { parse_mode: 'Markdown' });
    await bot.telegram.sendMessage(targetUserId, '🎉 আপনার অর্ডারটি সফলভাবে অ্যাডমিন কর্তৃক কনফার্ম ও প্রসেস করা হয়েছে!').catch(() => {});
});

bot.action(/admin_can_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await ctx.answerCbQuery('❌ অর্ডারটি বাতিল করা হয়েছে!');
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n**[STATUS: CANCELLED ❌]**', { parse_mode: 'Markdown' });
    await bot.telegram.sendMessage(targetUserId, '❌ দুঃখিত, আপনার অর্ডারটি বাতিল (Cancelled) করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।').catch(() => {});
});

bot.action('back_start', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    if (db.sessions) { delete db.sessions[userId]; saveDatabase(db); }
    await ctx.reply('🔙 মূল মেনুতে ফিরে এসেছেন:', { ...getMainKeyboard(userId) });
});

// Webhook ও Server ইন্টিগ্রেশন
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

server.listen(PORT, () => { console.log(`HTTP Server listening on port ${PORT}`); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
