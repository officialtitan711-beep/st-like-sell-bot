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
    } catch (e) { 
        console.error('DB Load Error:', e); 
    }
    return { users: {}, balances: {}, sessions: {}, numbers: {}, customProducts: [], allowedUsers: {} };
}

function saveDatabase(data) {
    try { 
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); 
    } catch (e) { 
        console.error('DB Save Error:', e); 
    }
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

// 📢 ফোর্সিং সাবস্ক্রাইব ও অ্যাডমিন অ্যাক্সেস মেসেজ
async function sendForceSubMessage(ctx, isPendingAdminAccess = false) {
    let text;
    let keyboard;

    if (isPendingAdminAccess) {
        text = 
`✦────────── ⚠️ ACCESS PENDING ──────────✦
আপনার টেলিগ্রাম চ্যানেল ভেরিফিকেশন সফল হয়েছে! ✅ 
তবে প্রিমিয়াম বটের ফুল অ্যাক্সেস পেতে নিচের অ্যাডমিনকে মেসেজ করে পারমিশন নিয়ে নিন।

👑 **অ্যাডমিন আইডি:** \`@sonu1813\`
✦─────────────────────────────────✦`;

        keyboard = Markup.inlineKeyboard([
            [Markup.button.url('💬 Message Admin 🚀', 'https://t.me/sonu1813')],
            [Markup.button.callback('🔄 Verify Access Now ✨', 'verify_sub')]
        ]);
    } else {
        text = `🚨 **SECURITY LOCK & FORCE SUBSCRIBE** 🚨\n\nআমাদের প্রিমিয়াম বট ব্যবহার করতে হলে অবশ্যই অফিশিয়াল চ্যানেলে যুক্ত থাকতে হবে!\n\n🔥 **ধাপসমূহ:**\n1️⃣ প্রথমে টেলিগ্রাম চ্যানেলে জয়েন করুন।\n2️⃣ ইউটিউব চ্যানেল সাবস্ক্রাইব করুন।\n3️⃣ সবশেষে ভেরিফাই বাটনে ক্লিক করুন।`;
        
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
                } catch (e) { 
                    resolve('Unknown Player'); 
                }
            });
        }).on('error', () => { 
            resolve('Unknown Player'); 
        });
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
    } catch (err) { 
        console.error('Middleware Error:', err); 
    }
});

// ✨ বটে যখন ইউজার এন্ট্রি নিবে (Welcome Message)
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
`🌟═════════════════════════════════🌟
👑      **ST LIKE ~ SELL BOT**      👑
🌟═════════════════════════════════🌟
✨ স্বাগতম! আমাদের প্রিমিয়াম গেমিং সার্ভিসে আপনাকে স্বাগতম জানাই। 

👇 আপনার পছন্দের সার্ভিসটি বেছে নিতে নিচের মেনু ব্যবহার করুন:`;

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

    return ctx.reply('✨ ভেরিফিকেশন সফল! নিচের মেনু থেকে আপনার সার্ভিসটি বেছে নিন:', {
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

    // --- ১. অ্যাডমিন যদি কাস্টমারের অর্ডার কমপ্লিটের জন্য টেমপ্লেট ডাটা পূরণ করে Reply করে ---
    if (userId === ADMIN_ID.toString() && ctx.message.reply_to_message) {
        const repliedText = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
        const match = repliedText.match(/ID:\s*`(\d+)`/) || repliedText.match(/আইডি:\s*`(\d+)`/);
        if (match && match[1]) {
            const targetUserId = match[1];
            const session = db.adminSessions?.[targetUserId];

            if (session) {
                const userBal = db.balances[targetUserId] || 0;
                const lines = text.split('\n');
                
                const prevLikes = lines[0] || '---';
                const currLikes = lines[1] || '---';
                const addedLikes = lines[2] || '---';

                const finalSuccessBox = 
`╔═════════════════════════════════╗
║       ✅ ORDER COMPLETE         ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ 📦 Product: \`${session.product}\`
│ 👤 Name: \`${session.nickname}\`
│ 🛡 UID: \`${session.uid}\`
│ 🌍 Server: \`${session.region}\`
├─────────────────────────────────┤
│ ❤️ Previous Likes: ${prevLikes}
│ 💖 Current Likes: ${currLikes}
│ 🚀 Added Likes: ${addedLikes}
├─────────────────────────────────┤
│ 💸 Deducted: \`${session.price} BDT\`
│ 💰 Current Balance: \`${userBal} BDT\`
└─────────────────────────────────┘
⏳ এই UID তে ২৪ ঘণ্টা পর আবার Daily লাইক নিতে পারবেন।
🙏 ধন্যবাদ!`;

                try {
                    await bot.telegram.editMessageText(
                        targetUserId, 
                        session.customerMessageId, 
                        null, 
                        finalSuccessBox, 
                        { 
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]])
                        }
                    );

                    delete db.adminSessions[targetUserId];
                    saveDatabase(db);

                    return ctx.reply(`✅ সফলভাবে ইউজার \`${targetUserId}\`-এর অর্ডার কমপ্লিট ও নোটিফিকেশন পাঠানো হয়েছে!`, { parse_mode: 'Markdown' });
                } catch (e) {
                    return ctx.reply(`❌ কাস্টমারের মেসেজ আপডেট করা যায়নি। হয়তো মেসেজটি অনেক পুরোনো।`);
                }
            } else {
                try {
                    await bot.telegram.sendMessage(targetUserId, `💬 **অ্যাডমিনের উত্তর:**\n\n${text}`, { parse_mode: 'Markdown' }); return ctx.reply(`✅ ইউজারে মেসেজ পাঠানো সফল হয়েছে!`); } catch (e) { return ctx.reply(`❌ মেসেজ পাঠানো যায়নি।`); } } } }  // --- ২. অ্যাডমিন কন্ট্রোল প্যানেল ফিচারসমূহ --- if (userId === ADMIN_ID.toString()) { if (text === '➕ Add Bot') { db.sessions[userId] = { step: 'admin_add_bot_prompt' }; saveDatabase(db); return ctx.reply( `➕ **বট পারমিশন বা অ্যাক্সেস দিন**\n\n` + `যে ইউজারের আইডি বা ইউজারনেম পারমিশন দিতে চান তা লিখে পাঠান:\n` + `*(উদাহরণ: \`123456789\` অথবা \`@username\`)*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')])} ); }  if (text === '❌ Remove Bot') { db.sessions[userId] = { step: 'admin_remove_bot_prompt' }; saveDatabase(db); return ctx.reply( `❌ **বট অ্যাক্সেস রিমুভ করুন**\n\n` + `যে ইউজারের আইডি বা ইউজারনেম রিমুভ বা ব্লক করতে চান তা লিখে পাঠান:\n` + `*(উদাহরণ: \`123456789\`)*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')])} ); }  if (text === '💳 Add/Minus Balance') { db.sessions[userId] = { step: 'admin_balance_prompt' }; saveDatabase(db); return ctx.reply( `🛠️ **অ্যাডমিন ব্যালেন্স ম্যানেজমেন্ট**\n\n` + `ইউজারের অ্যাকাউন্টে ব্যালেন্স যোগ বা কাটতে নিচের ফরম্যাটে লিখে পাঠান:\n\n` + `👉 **ফরম্যাট:** \`[User_ID] [টাকার পরিমাণ]\`\n` + `*(উদাহরণ প্লাস করতে: \`123456789 100\`)*\n` + `*(উদাহরণ মাইনাস করতে: \`123456789 -50\`)*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')])} ); }  if (text === '📱 Set Payment Numbers') { return ctx.reply( `📱 **পেমেন্ট নম্বর সেটআপ প্যানেল**\n\nকোন মাধ্যমের নম্বর সেট বা পরিবর্তন করতে চান তা সিলেক্ট করুন:`, Markup.inlineKeyboard([ [Markup.button.callback('📱 Set bKash 🌸', 'set_bkash_prompt'), Markup.button.callback('📱 Set Nagad 🧨', 'set_nagad_prompt')], [Markup.button.callback('🔙 Main Menu 🏠', 'back_start')] ]) ); }  if (text === '➕ Add Product') { db.sessions[userId] = { step: 'admin_add_product' }; saveDatabase(db); return ctx.reply( `📦 **নতুন প্রোডাক্ট অ্যাড করুন**\n\n` + `প্রোডাক্টের নাম এবং দাম একসাথে লিখে পাঠান:\n` + `*(উদাহরণ: \`Guild Glory Bot 150৳\`)*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')])} ); }  if (text === '❌ Remove Product') { if (db.customProducts.length === 0) { return ctx.reply('⚠️ বর্তমানে কোনো কাস্টম প্রোডাক্ট অ্যাড করা নেই।'); } let listText = '🗑️ **রিমুভ করার জন্য প্রোডাক্টের সঠিক নামটি লিখে পাঠান:**\n\n'; db.customProducts.forEach((p, index) => { listText += `${index + 1}. \`${p}\`\n`; }); db.sessions[userId] = { step: 'admin_remove_product' }; saveDatabase(db); return ctx.reply(listText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')])} }); }  if (text === '📊 Total Users') { const allowedIds = Object.keys(db.allowedUsers \vert{}\vert{} {}); if (allowedIds.length === 0) return ctx.reply('⚠️ বর্তমানে কোনো অ্যাক্সেসপ্রাপ্ত ইউজার নেই।');  let list = `📊 **Total Active Bot Users (${allowedIds.length} জন)**\n━━━━━━━━━━━━━━━━━━━━━━━\n`; allowedIds.forEach((uid, index) => { const u = db.users[uid] \vert{}\vert{} { first_name: 'Unknown', username: 'N/A' }; const bal = db.balances[uid] \vert{}\vert{} 0; list += `${index + 1}. নাম: ${u.first_name} (${u.username})\n   🆔 ID: \`${uid}\`\n   💰 ব্যালেন্স: \`${bal} BDT\`\n\n`; }); return ctx.reply(list, { parse_mode: 'Markdown' }); }  if (text === '📩 Send Message') { db.sessions[userId] = { step: 'admin_send_msg_prompt' }; saveDatabase(db); return ctx.reply( `📩 **নির্দিষ্ট ইউজারে মেসেজ পাঠান**\n\n` + `নিচের ফরম্যাটে চ্যাটে লিখে পাঠান:\n` + `👉 \`[User_ID] [আপনার মেসেজ]\`\n` + `*(উদাহরণ: \`123456789 আপনার অর্ডারটি কনফার্ম হয়েছে।\`)*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')])} ); }  if (text === '📢 All Users Msg') { db.sessions[userId] = { step: 'admin_broadcast_prompt' }; saveDatabase(db); return ctx.reply( `📢 **সকল ইউজারে ব্রডকাস্ট মেসেজ পাঠান**\n\n` + `যে এনাউন্সমেন্ট বা মেসেজটি সব ইউজারের কাছে পাঠাতে চান তা লিখে চ্যাটে পাঠান:`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start')])} ); } }  // প্রসেসিং: অ্যাড বট পারমিশন if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_add_bot_prompt') { let query = text.replace('@', '').trim(); let targetId = query;  if (isNaN(query)) { const foundUid = Object.keys(db.users).find(uid => db.users[uid].username.replace('@', '').toLowerCase() === query.toLowerCase()); if (foundUid) targetId = foundUid; }  db.allowedUsers[targetId] = true; delete db.sessions[userId]; saveDatabase(db);  bot.telegram.sendMessage(targetId, '🎉 **অভিনন্দন!** অ্যাডমিন আপনার বট অ্যাক্সেস অনুমোদন করেছেন। এখন আপনি বট ব্যবহার করতে পারবেন। নিচে /start দিয়ে শুরু করুন।', { parse_mode: 'Markdown' }).catch(()=>{}); return ctx.reply(`✅ সফলভাবে ইউজার \`${targetId}\`-কে পারমিশন দেওয়া হয়েছে।`, { parse_mode: 'Markdown' }); }  // প্রসেসিং: রিমুভ বট পারমিশন if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_remove_bot_prompt') { let query = text.replace('@', '').trim(); let targetId = query;  if (isNaN(query)) { const foundUid = Object.keys(db.users).find(uid => db.users[uid].username.replace('@', '').toLowerCase() === query.toLowerCase()); if (foundUid) targetId = foundUid; }  delete db.allowedUsers[targetId]; delete db.sessions[userId]; saveDatabase(db);  bot.telegram.sendMessage(targetId, '❌ দুঃখিত, অ্যাডমিন আপনার বটের অ্যাক্সেস রিমুভ বা ব্লক করে দিয়েছেন।', { parse_mode: 'Markdown' }).catch(()=>{}); return ctx.reply(`🗑️ সফলভাবে ইউজার \`${targetId}\`-কে রিমুভ করা হয়েছে।`, { parse_mode: 'Markdown' }); }  // প্রসেসিং: নির্দিষ্ট ইউজারে মেসেজ if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_send_msg_prompt') { const firstSpace = text.indexOf(' '); if (firstSpace !== -1) { const targetId = text.substring(0, firstSpace).trim(); const messageToSend = text.substring(firstSpace + 1).trim();  delete db.sessions[userId]; saveDatabase(db);  try { await bot.telegram.sendMessage(targetId, `📢 **অ্যাডমিন নোটিশ:**\n\n${messageToSend}`, { parse_mode: 'Markdown' });
                return ctx.reply(`✅ সফলভাবে ইউজার \`${targetId}\`-কে মেসেজ পাঠানো হয়েছে।`, { parse_mode: 'Markdown' });
            } catch (e) {
                return ctx.reply(`❌ মেসেজ পাঠানো যায়নি।`);
            }
        }
    }

    // ব্রডকাস্ট অ্যানাউন্সমেন্ট
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

    // --- ব্যালেন্স যখন অ্যাড হবে ---
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_balance_prompt') {
        const parts = text.split(' ');
        if (parts.length >= 2) {
            const targetId = parts[0].trim();
            const amount = parseFloat(parts[1]);

            if (isNaN(amount)) {
                return ctx.reply('❌ সঠিক টাকার পরিমাণ দিন। যেমন: `123456789 50`', { parse_mode: 'Markdown' });
            }

            if (!db.balances[targetId]) db.balances[targetId] = 0;
            const previousBalance = db.balances[targetId];
            db.balances[targetId] += amount;
            const currentBalance = db.balances[targetId];
            
            delete db.sessions[userId];
            saveDatabase(db);

            if (amount >= 0) {
                const balAddNotice = 
`💎~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~💎
🚀 **ACCOUNT BALANCE RECHARGED** 🚀
💎~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~💎
Your account balance has been successfully updated! ✨

📌 **Previous Balance:** \`${previousBalance} BDT\`
➕ **Added Balance:** \`${amount} BDT\` 💵
💰 **Current Balance:** \`${currentBalance} BDT\` 💳
👑 **Approved by:** \`@sonu1813\`
💎~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~💎`;

                bot.telegram.sendMessage(targetId, balAddNotice, { parse_mode: 'Markdown' }).catch(()=>{});
                return ctx.reply(`✅ সফলভাবে ইউজার \`${targetId}\`-এর অ্যাকাউন্টে \`${amount} BDT\` যোগ করা হয়েছে। নতুন ব্যালেন্স: \`${currentBalance} BDT\``, { parse_mode: 'Markdown' });
            } else {
                const absAmount = Math.abs(amount);
                bot.telegram.sendMessage(targetId, `⚠️ আপনার অ্যাকাউন্ট থেকে \`${absAmount} BDT\` কেটে নেওয়া হয়েছে!\n💰 বর্তমান ব্যালেন্স: \`${currentBalance} BDT\``, { parse_mode: 'Markdown' }).catch(()=>{});
                return ctx.reply(`🔻 ইউজার \`${targetId}\`-এর অ্যাকাউন্ট থেকে \`${absAmount} BDT\` মাইনাস করা হয়েছে। বর্তমান ব্যালেন্স: \`${currentBalance} BDT\``, { parse_mode: 'Markdown' });
            }
        }
    }

    // নম্বর সেটআপ
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step?.startsWith('waiting_set_')) {
        const method = db.sessions[userId].step.replace('waiting_set_', '');
        db.numbers[method] = text;
        delete db.sessions[userId];
        saveDatabase(db);
        return ctx.reply(`✅ সফলভাবে ${method.toUpperCase()} নম্বর আপডেট করা হয়েছে: \`${text}\``, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    }

    // প্রোডাক্ট অ্যাড
    if (userId === ADMIN_ID.toString() && db.sessions[userId]?.step === 'admin_add_product') {
        db.customProducts.push(text);
        delete db.sessions[userId];
        saveDatabase(db);
        return ctx.reply(`✅ সফলভাবে নতুন প্রোডাক্ট অ্যাড করা হয়েছে: \`${text}\``, { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    }

    // প্রোডাক্ট রিমুভ
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

    // --- ডিপোজিট অ্যামাউন্ট ইনপুট ও ১০০ টাকা ফিল্টারিং ---
    const session = db.sessions[userId];
    if (session && session.step === 'awaiting_deposit_amount') {
        const amount = parseFloat(text);

        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ দয়া করে সঠিক সংখ্যায় অ্যামাউন্ট লিখুন (যেমন: `100`)।', {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]])
            });
        }

        if (amount < 100) {
            const alertText = 
`⚠️═════════════════════════════════⚠️
🛑 **MINIMUM DEPOSIT WARNING** 🛑
⚠️═════════════════════════════════⚠️
দুঃখিত! এই অ্যামাউন্টটি আমাদের সিস্টেমে সাপোর্টেড নয়। 

💡 **শর্তাবলী:** সর্বনিম্ন **১০০ টাকা** (100 BDT) বা তার বেশি ডিপোজিট করতে হবে।
❌ আপনার প্রদত্ত পরিমাণ: \`${amount} BDT\`

দয়া করে সঠিক অ্যামাউন্ট দিয়ে আবার চেষ্টা করুন! 👇`;

            return ctx.reply(alertText, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔄 Try Again ⚡', `dep_${session.method}`)],
                    [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
                ])
            });
        }

        const method = session.method;
        const rawNumber = db.numbers[method] || '01772665599';
        session.amount = amount;
        session.step = 'awaiting_trxid';
        saveDatabase(db);

        const slipText = 
`•.¸¸.•*´¨`*•.¸¸.•*´¨`*•.¸¸.•*´¨`*•.¸¸
💖 **${method.toUpperCase()} DEPOSIT PORTAL** 💖
•.¸¸.•*´¨`*•.¸¸.•*´¨`*•.¸¸.•*´¨`*•.¸¸

💰 **ডিপোজিট পরিমাণ:** \`✨ ${amount}.0 BDT\`

1️⃣ 📱 ${method.toUpperCase()} অ্যাপ ওপেন করুন।
2️⃣ 💸 **Send Money** অপশন সিলেক্ট করুন।
3️⃣ 🎯 নিচের অফিশিয়াল নম্বরে টাকা পাঠান।
4️⃣ 📝 পেমেন্ট শেষে TrxID কপি করে রাখুন।
5️⃣ 💬 এখানে ট্রানজেকশন আইডি বা স্ক্রিনশট দিন।

📞 **নম্বর:** \`${rawNumber}\`
*(ট্যাপ করলেই নম্বর কপি হবে)*
─────────────────────────────────────
⚠️ **সতর্কবার্তা:** ভুল নম্বরে টাকা পাঠালে তা ফেরতযোগ্য নয়!`;

        return ctx.reply(slipText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 Copy Number ✂️', `copy_num_${rawNumber}`)],
                [Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]
            ])
        });
    }

    // --- ট্রানজেকশন আইডি (TrxID) রিসিভ হ্যান্ডলার ---
    if (session && session.step === 'awaiting_trxid') {
        const trxId = text;
        const method = session.method;
        const amount = session.amount;

        delete db.sessions[userId];
        saveDatabase(db);

        const customerInfo = 
`╔═════════════════════════════════╗
║     📥 NEW DEPOSIT / TrxID      ║
╚═════════════════════════════════╝
┌─────────────────────────────────┐
│ 👤 নাম: ${ctx.from.first_name || 'N/A'}                │
│ 🔗 ইউজারনেম: ${ctx.from.username ? '@' + ctx.from.username : 'N/A'}          │
│ 🆔 ID: \`${userId}\`                  │
│ 💳 মাধ্যম: ${method.toUpperCase()}                  │
│ 💵 পরিমাণ: \`${amount} BDT\`          │
│ 🔑 TrxID: \`${trxId}\`                │
└─────────────────────────────────┘

💡 ইউজার TrxID পাঠিয়েছেন। চেক করে ব্যালেন্স অ্যাড করে দিন।`;

        await bot.telegram.sendMessage(ADMIN_ID, customerInfo, { parse_mode: 'Markdown' }).catch(()=>{});

        const trxSuccessText = 
`🚀===================================🚀
✅ **TrxID SUBMITTED SUCCESSFULLY** 🎯
🚀===================================🚀
আপনার ট্রানজেকশন আইডি সফলভাবে অ্যাডমিনের কাছে সাবমিট করা হয়েছে! 📝

⏳ অ্যাডমিন চেক করে শীঘ্রই আপনার একাউন্ট ব্যালেন্স আপডেট করে দেবেন। ধন্যবাদ! 🌟
🚀===================================🚀`;

        return ctx.reply(trxSuccessText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    // --- কাস্টমার সাধারণ মেসেজ ---
    if (userId !== ADMIN_ID.toString()) {
        const customerInfo = 
`📥 **NEW CUSTOMER MESSAGE!** 📥
━━━━━━━━━━━━━━━━━━━
👤 নাম: ${ctx.from.first_name || 'N/A'}
🔗 ইউজারনেম: ${ctx.from.username ? '@' + ctx.from.username : 'N/A'}
🆔 ID: \`${userId}\`
━━━━━━━━━━━━━━━━━━━`;

        await bot.telegram.sendMessage(ADMIN_ID, customerInfo, { parse_mode: 'Markdown' }).catch(()=>{});
        await bot.telegram.forwardMessage(ADMIN_ID, ctx.chat.id, ctx.message.message_id).catch(()=>{});
    }

    // --- কাস্টমার মেনু অপশন ---
    if (text === '🛍️ All Products') {
        let productMsg = `🛍️ **All Available Products & Services**\n\n🔥 **1. Free Fire Likes:**\n• 220 Likes - ৳8\n• 6000 Likes - ৳300\n\n`;
        
        if (db.customProducts.length > 0) {
            productMsg += `⭐ **2. Special & Guild Products:**\n`;
            db.customProducts.forEach((p, idx) => {
                productMsg += `• ${idx + 1}. ${p}\n`;
            });
        }

        return ctx.reply(productMsg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔥 Buy Free Fire Likes ⚡', 'cat_ff_likes')],
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (text === '🔍 Check FF UID') {
        db.sessions[userId] = { step: 'awaiting_uid_only' };
        saveDatabase(db);
        return ctx.reply('🎮 **Free Fire UID Checker**\n\n✍️ যে প্লেয়ারের নাম চেক করতে চান, তার সঠিক **UID** (যেমন: `9884223138`) নিচে চ্যাটে লিখে পাঠান:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (text === '💰 Add Balance') {
        const depositMenuText = 
`### 💰 **ADD BALANCE & DEPOSIT DESK** 💰
#####################################
💎 **সর্বনিম্ন ডিপোজিট:** \`100.0 BDT\` 💵
👇 নিচের পেমেন্ট মেথডগুলোতে ক্লিক করে প্রক্রিয়া শুরু করুন:
#####################################`;

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
        const profileBoxText = 
`⚡═════════════════════════════════⚡
👤          **USER PROFILE**         👤
⚡═════════════════════════════════⚡
🆔 Telegram ID: \`${userId}\`
💰 একাউন্ট ব্যালেন্স: \`৳${balance}\` 💳
📦 মোট সফল অর্ডার: \`০ টি আইডি\` 📦
❤️ মোট লাইক পয়েন্ট: \`০ টি\` 🔥
⚡═════════════════════════════════⚡`;

        return ctx.reply(profileBoxText, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (text === '📜 Order History') {
        const historyBoxText = 
`🎯-----------------------------------🎯
📜 **PURCHASE & ORDER HISTORY** 📜
🎯-----------------------------------🎯
আপনার পূর্ববর্তী সফল অর্ডারগুলোর তালিকা নিচে দেওয়া হলো: ✨

❌ এখনো কোনো অর্ডার সম্পন্ন হয়নি! 
নতুন সার্ভিস নিতে মেনু ব্যবহার করুন। 👇
🎯-----------------------------------🎯`;

        return ctx.reply(historyBoxText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    if (text === '📞 Support Desk') {
        return ctx.reply('📞 **Support Desk**\n\nআপনার যেকোনো সমস্যা, TrxID বা স্ক্রিনশট এখানে সরাসরি চ্যাটে পাঠান, অ্যাডমিন দ্রুত দেখে দেবেন।', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
            ])
        });
    }

    // UID ইনপুট প্রসেসিং
    const sessionUid = db.sessions[userId];
    if (sessionUid && (sessionUid.step === 'awaiting_uid' || sessionUid.step === 'awaiting_uid_only')) {
        const isOnlyCheck = sessionUid.step === 'awaiting_uid_only';
        const uid = text;

        const waitMsg = await ctx.reply('⏳ সার্ভার থেকে প্লেয়ারের তথ্য যাচাই করা হচ্ছে, দয়া করে অপেক্ষা করুন...');

        try {
            const nickname = await checkFreeFireUID(uid);
            await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

            if (isOnlyCheck) {
                delete db.sessions[userId];
                saveDatabase(db);
                return ctx.reply(`🎉 **Free Fire Account Found!**\n\n🆔 **UID:** \`${uid}\`\n👤 **Player Name:** \`${nickname}\``, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]])
                });
            }

            sessionUid.step = 'review_order';
            sessionUid.uid = uid;
            sessionUid.nickname = nickname;
            saveDatabase(db);

            const userBal = db.balances[userId] || 0;
            
            const slipText = 
`[★]=================================[★]
📦 **ORDER REVIEW & CONFIRMATION** 📦
[★]=================================[★]
👤 **কাস্টমার ইনফো:**
• নাম: ${ctx.from.first_name || 'User'}
• টেলিগ্রাম আইডি: \`${userId}\`

🎮 **গেম অ্যাকাউন্ট ডিটেইলস:**
• গেমের নাম: \`${nickname}\`
• গেমের UID: \`${uid}\`

💳 **পেমেন্ট সামারি:**
• প্যাকেজ: ${sessionUid.product}
• সার্ভার: 🇧🇩 ${sessionUid.region}
• মূল্য: ৳${sessionUid.price}
• আপনার ব্যালেন্স: ৳${userBal}
[★]=================================[★]
⚠️ তথ্যগুলো ভালোভাবে মিলিয়ে নিচের **Confirm Order** বাটনে ক্লিক করুন!`;

            await ctx.reply(slipText, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Confirm Order 🚀', 'confirm_order'), Markup.button.callback('🔙 Back ↩️', 'cat_ff_likes')]
                ])
            });

        } catch (error) {
            await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
            await ctx.reply(`⚠️ নেম চেকার এপিআই কানেক্ট করতে সমস্যা হয়েছে। সঠিক UID দিয়ে আবার চেষ্টা করুন।`);
        }
        return;
    }
});

// --- ডিপোজিট মেথড সিলেকশন হ্যান্ডলার ---
bot.action(/dep_(bkash|nagad)/, async (ctx) => {
    const userId = ctx.from.id.toString();
    const method = ctx.match[1];

    const db = loadDatabase();
    if (!db.sessions) db.sessions = {};
    db.sessions[userId] = { step: 'awaiting_deposit_amount', method: method };
    saveDatabase(db);

    await ctx.editMessageText(
`✦⚡──────────────⚡✦
📥 **${method.toUpperCase()} DEPOSIT** 📥
✦⚡──────────────⚡✦
কত টাকা ডিপোজিট করতে চান? 
নিচে শুধু সংখ্যাটি লিখে পাঠান (যেমন: \`100\`) ✍️`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel ❌', 'back_start_inline')]
        ])
    });
});

bot.action(/copy_num_(.+)/, async (ctx) => {
    const num = ctx.match[1];
    await ctx.answerCbQuery(`📋 নম্বর কপি সফল: ${num}`, { show_alert: true });
});

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

bot.action('cat_ff_likes', async (ctx) => {
    await ctx.editMessageText('🔥 **Free Fire Likes Packages**\n\nআপনার পছন্দের লাইক প্যাকেজটি সিলেক্ট করুন:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('⚡ 220 Likes - ৳8', 'pkg_like_220')],
            [Markup.button.callback('🚀 6000 Likes - ৳300', 'pkg_like_6000')],
            [Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
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

    await ctx.editMessageText(`🌍 **Server / Region Selection**\n\nপ্যাকেজ: \`${amount} Likes\` (${price} BDT)\nদয়া করে গেমের সার্ভার বা রিজিওন সিলেক্ট করুন:`, {
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

    await ctx.editMessageText(`🎮 **Enter Game UID (${region})**\n\n✍️ অনুগ্রহ করে প্লেয়ারের সঠিক **UID** (যেমন: \`9884223138\`) নিচে চ্যাটে লিখে পাঠান:`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back ↩️', 'cat_ff_likes')]])
    });
});

// --- চিকন প্রোগ্রেস বার অ্যানিমেশন ও অর্ডার কনফার্মেশন ---
bot.action('confirm_order', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    const session = db.sessions?.[userId];
    if (!session) return ctx.answerCbQuery('❌ সেশন মেয়াদোত্তীর্ণ হয়েছে।', { show_alert: true });

    const userBal = db.balances[userId] || 0;
    if (userBal < session.price) {
        return ctx.answerCbQuery('❌ আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!', { show_alert: true });
    }

    // চিকন লোডিং অ্যানিমেশন (Slim Loading Progress Bar)
    await ctx.editMessageText('⏳ অর্ডারের রিকোয়েস্ট প্রসেসিং হচ্ছে...\n\n▪️▫️▫️▫️▫️▫️▫️▫️▫️▫️ [ 10% ]', { parse_mode: 'Markdown' });
    
    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, null, '🔄 সার্ভারের সাথে কানেক্ট করা হচ্ছে...\n\n▪️▪️▪️▪️▫️▫️▫️▫️▫️▫️ [ 40% ]', { parse_mode: 'Markdown' }).catch(() => {});
    }, 1500);

    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, null, '⚡ গেমের সাথে লাইক সিনক্রোনাইজ হচ্ছে...\n\n▪️▪️▪️▪️▪️▪️▪️▪️▫️▫️ [ 85% ] (Hold)', { parse_mode: 'Markdown' }).catch(() => {});
    }, 3000);

    // ৮৫% এ গিয়ে হোল্ড বা আটকা থাকবে এবং অ্যাডমিনের কাছে প্যানেল চলে যাবে
    setTimeout(async () => {
        if (!db.balances) db.balances = {};
        db.balances[userId] -= session.price;
        
        // অ্যাডমিন সেশনে কাস্টমারের মেসেজ আইডি ও অর্ডার ডিটেইলস সেভ রাখা
        if (!db.adminSessions) db.adminSessions = {};
        db.adminSessions[userId] = {
            customerMessageId: ctx.callbackQuery.message.message_id,
            product: session.product,
            nickname: session.nickname,
            uid: session.uid,
            region: session.region,
            price: session.price
        };
        delete db.sessions[userId];
        saveDatabase(db);

        // অ্যাডমিন প্যানেলে আপনার পছন্দের নতুন লেআউট অনুযায়ী নোটিফিকেশন পাঠানো
        const adminNotifyText = 
`🔔 **NEW ORDER PENDING APPROVAL!** 🔔
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 কাস্টমার: ${ctx.from.first_name}
🆔 কাস্টমার আইডি: \`${userId}\`

📦 প্রোডাক্ট: \`${session.product}\` (${session.region})
👤 গেম নেম: \`${session.nickname}\`
🎮 গেম UID: \`${session.uid}\`
💵 মূল্য: \`৳${session.price}\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 **অর্ডার কমপ্লিট করতে এই মেসেজে Reply (রিপ্লাই) করে ঠিক নিচে ৩টি সংখ্যা লিখে পাঠান:**
1. আগের লাইক (Previous Likes)
2. বর্তমান লাইক (Current Likes)
3. যোগ হয়েছে (Added Likes)`;

        await bot.telegram.sendMessage(ADMIN_ID, adminNotifyText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(`❌ Cancel [${userId}]`, `admin_can_${userId}`)]
            ])
        }).catch(() => {});

    }, 4500);
});

bot.action(/admin_can_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await ctx.answerCbQuery('❌ অর্ডারটি বাতিল করা হয়েছে!');
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n**[STATUS: CANCELLED ❌]**', { parse_mode: 'Markdown' });
    await bot.telegram.sendMessage(targetUserId, '❌ দুঃখিত, আপনার অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।').catch(() => {});
});

// স্মুথ মেইন মেনু ইনলাইন হ্যান্ডলার
bot.action('back_start_inline', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    if (db.sessions) { delete db.sessions[userId]; saveDatabase(db); }
    
    await ctx.editMessageText('✨ মূল মেনুতে ফিরে এসেছেন। নিচের মেনু থেকে আপনার সার্ভিসটি বেছে নিন:', { parse_mode: 'Markdown' }).catch(() => {});
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
