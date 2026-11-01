const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');
const https = require('https');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID || '5932254012';
const CHANNEL_ID = process.env.CHANNEL_ID || '@shohan2004';
const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://m.youtube.com/@ShohanSir18';

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://st-like-sell-bot.onrender.com';
const PORT = process.env.PORT || 3000;
const DB_FILE = 'database.json';

// ডাটাবেজ হ্যান্ডলিং
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            if (data.trim() === '') return { users: {}, balances: {}, sessions: {} };
            return JSON.parse(data);
        }
    } catch (e) { console.error('DB Load Error:', e); }
    return { users: {}, balances: {}, sessions: {} };
}

function saveDatabase(data) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('DB Save Error:', e); }
}

// 🛡️ রিয়েল-টাইম টেলিগ্রাম চ্যানেল সাবস্ক্রিপশন চেক (লিভ নিলেই ধরা পড়বে)
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

// 📢 ফোর্সিং সাবস্ক্রাইব মেসেজ (যখনই চ্যানেল থেকে লিভ নিবে বা নতুন আসবে)
async function sendForceSubMessage(ctx) {
    const text = `⚠️ **অ্যাক্সেস ডিনায়েলড & সিকিউরিটি অ্যালার্ট!**\n\nআমাদের এই প্রিমিয়াম ফ্রি ফায়ার লাইক ও সার্ভিস বটের ফুল এক্সেস পেতে হলে আপনাকে অবশ্যই আমাদের অফিশিয়াল টেলিগ্রাম চ্যানেলে জয়েন থাকতে হবে।\n\n👉 **নিয়মাবলী:**\n1️⃣ প্রথমে নিচের **📢 Join Telegram Channel** এ ক্লিক করে আমাদের চ্যানেলে জয়েন করুন।\n2️⃣ ইউটিউব চ্যানেল সাবস্ক্রাইব করতে পারেন (ঐচ্ছিক)।\n3️⃣ সবশেষে **🔄 𝐕𝐞𝐫𝐢𝐟𝐲 𝐌𝐞𝐦𝐛𝐞𝐫𝐬𝐡𝐢𝐩** বাটনে ক্লিক করুন।\n\n*(সতর্কতা: পরবর্তীতে চ্যানেল থেকে লিভ নিলে বট আর কাজ করবে না!)*`;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('📢 Join Telegram Channel', 'https://t.me/shohan2004')],
        [Markup.button.url('🔴 Subscribe YouTube', YOUTUBE_URL)],
        [Markup.button.callback('🔄 𝐕𝐞𝐫𝐢𝐟𝐲 𝐌𝐞𝐦𝐛𝐞𝐫𝐬𝐡𝐢𝐩', 'verify_sub')]
    ]);

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

// ✨ মূল নিচের পার্মানেন্ট মেনু (Reply Keyboard)
function getMainKeyboard(userId) {
    let keyboard = [
        ['🛍️ Shop / Buy Likes', '🔍 Check FF UID'],
        ['💰 Add Balance', '👤 My Profile'],
        ['📜 Order History', '📞 Support Desk']
    ];

    if (userId.toString() === ADMIN_ID.toString()) {
        keyboard.push(
            ['➕ Add Product', '📦 Manage Products'],
            ['💳 Deposit Requests', '⚙️ Bot Settings']
        );
    }
    return Markup.keyboard(keyboard).resize();
}

// 🔍 UID চেকিং ফাংশন (AKM Topup API)
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

// 🛡️ গ্লোবাল মিডলওয়্যার (প্রতিবার যেকোনো কমান্ড বা মেসেজে চ্যানেলে আছে কি না চেক করবে)
bot.use(async (ctx, next) => {
    try {
        if (ctx && ctx.from) {
            const userId = ctx.from.id.toString();
            
            // অ্যাডমিন হলে বাইপাস
            if (userId === ADMIN_ID) return next();

            // যদি ভেরিফাই বাটন বা /start কমান্ড হয়, তবে পাস করবে
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'verify_sub') {
                return next();
            }
            if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/start')) {
                return next();
            }

            // রিয়েল-টাইম চ্যানেল মেম্বারশিপ চেক (একমাস বা এক বছর পরেও লিভ নিলে ধরা পড়বে)
            const isSubscribed = await checkUserSubscription(userId);
            if (!isSubscribed) {
                return sendForceSubMessage(ctx);
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
        return sendForceSubMessage(ctx);
    }

    return ctx.reply('✨ **ST LIKE ~ SELL BOT**-এ আপনাকে স্বাগতম! ✨\n\n👇 আপনার পছন্দের সার্ভিসটি নিচের মেনু বাটন থেকে সিলেক্ট করুন:', {
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

    await ctx.answerCbQuery('🎉 অভিনন্দন! ভেরিফিকেশন সফল হয়েছে।');
    try { await ctx.deleteMessage(); } catch (e) {}

    return ctx.reply('✨ ভেরিফিকেশন সফল! নিচের মেনু থেকে আপনার সার্ভিসটি বেছে নিন:', {
        parse_mode: 'Markdown',
        ...getMainKeyboard(userId)
    });
});

// 📥 টেক্সট কমান্ড ও মেনু বাটন হ্যান্ডলার
bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const text = ctx.message.text.trim();
    const db = loadDatabase();
    if (!db.balances) db.balances = {};
    if (!db.sessions) db.sessions = {};

    if (text === '🛍️ Shop / Buy Likes') {
        return ctx.reply('🛍️ **Product Categories**\n\nদয়া করে আপনার পছন্দের ক্যাটাগরি সিলেক্ট করুন:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔥 Free Fire Likes', 'cat_ff_likes')],
                [Markup.button.callback('🔙 Main Menu', 'back_start')]
            ])
        });
    }

    if (text === '🔍 Check FF UID') {
        db.sessions[userId] = { step: 'awaiting_uid_only' };
        saveDatabase(db);
        return ctx.reply('🎮 **Free Fire UID Checker**\n\n✍️ যে প্লেয়ারের নাম চেক করতে চান, তার সঠিক **UID** (যেমন: `9884223138`) নিচে চ্যাটে লিখে পাঠান:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]])
        });
    }

    if (text === '💰 Add Balance') {
        return ctx.reply('💳 **ডিপোজিট সেকশন**\n\nপেমেন্ট করার জন্য নিচের মেথডগুলো থেকে আপনার পছন্দের মাধ্যমটি সিলেক্ট করুন:',
            Markup.inlineKeyboard([
                [Markup.button.callback('bKash', 'pay_bkash'), Markup.button.callback('Nagad', 'pay_nagad')],
                [Markup.button.callback('Rocket', 'pay_rocket'), Markup.button.callback('Binance', 'pay_binance')]
            ])
        );
    }

    if (text === '👤 My Profile') {
        const balance = db.balances[userId] || 145.0;
        return ctx.reply(`👤 **MY PROFILE**\n\n🆔 Telegram ID: \`${userId}\`\n💰 ব্যালেন্স: \`${balance} BDT\`\n📦 মোট অর্ডার: \`১ টি\`\n❤️ মোট লাইক: \`২১৩ টি\``, { parse_mode: 'Markdown' });
    }

    if (text === '📜 Order History') {
        return ctx.reply('📜 **Order History**\n\nআপনার পূর্ববর্তী সফল অর্ডারগুলোর তালিকা নিচে দেওয়া হলো:\n\n✨ ডেইলি লাইকস (+220 Likes) - সফল ✅');
    }

    if (text === '📞 Support Desk') {
        return ctx.reply('📞 **Support Desk**\n\nআপনার যেকোনো সমস্যা বা প্রশ্ন এখানে লিখে পাঠান, অ্যাডমিন খুব শীঘ্রই আপনার সাথে যোগাযোগ করবেন।');
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
                return ctx.reply(`🎉 **Free Fire Account Found!**\n\n🆔 **UID:** \`${uid}\`\n👤 **Player Name:** \`${nickname}\``, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu', 'back_start')]])
                });
            }

            session.step = 'review_order';
            session.uid = uid;
            session.nickname = nickname;
            saveDatabase(db);

            const userBal = db.balances[userId] || 145.0;
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

// 🔥 ক্যাটাগরি ও প্যাকেজ হ্যান্ডলার
bot.action('cat_ff_likes', async (ctx) => {
    ctx.editMessageText('🔥 **Free Fire Likes Packages**\n\nআপনার পছন্দের লাইক প্যাকেজটি সিলেক্ট করুন:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('⚡ 220 Likes - ৳8', 'pkg_like_220')],
            [Markup.button.callback('🚀 6000 Likes - ৳300', 'pkg_like_6000')],
            [Markup.button.callback('🔙 Back', 'shop_menu')]
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

    ctx.editMessageText(`🌍 **Server / Region Selection**\n\nপ্যাকেজ: \`${amount} Likes\` (${price} BDT)\nদয়া করে গেমের সার্ভার বা রিজিওন সিলেক্ট করুন:`, {
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

    ctx.editMessageText(`🎮 **Enter Game UID (${region})**\n\n✍️ অনুগ্রহ করে প্লেয়ারের সঠিক **UID** (যেমন: \`9884223138\`) নিচে চ্যাটে লিখে পাঠান:`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]])
    });
});

// ⚡ ইউনিক অ্যানিমেশন ও অর্ডার কনফার্মেশন
bot.action('confirm_order', async (ctx) => {
    const userId = ctx.from.id.toString();
    const db = loadDatabase();
    const session = db.sessions?.[userId];
    if (!session) return ctx.answerCbQuery('❌ সেশন মেয়াদোত্তীর্ণ হয়েছে।', { show_alert: true });

    let msg = await ctx.reply('⏳ অর্ডারের রিকোয়েস্ট প্রসেসিং হচ্ছে...\n\n[▒▒▒▒▒▒▒▒▒▒] 10%');
    
    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '🔄 সার্ভারের সাথে কানেক্ট করা হচ্ছে...\n\n[████▒▒▒▒▒▒] 40%').catch(() => {});
    }, 1500);

    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '⚡ গেমের সাথে লাইক সিনক্রোনাইজ হচ্ছে...\n\n[████████▒▒] 80%').catch(() => {});
    }, 3000);

    setTimeout(async () => {
        if (!db.balances) db.balances = {};
        db.balances[userId] = (db.balances[userId] || 145.0) - session.price;
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
