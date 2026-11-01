const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://m.youtube.com/@ShohanSir18';

let userBalances = {};
let awaitingUidForCheck = {};

// ✨ /start কমান্ড এবং ফোর্স সাবস্ক্রাইব চেক (Force Subscribe System)
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    
    if (userId.toString() !== ADMIN_ID.toString()) {
        try {
            const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
            if (chatMember.status === 'left' || chatMember.status === 'kicked') {
                return ctx.reply(
                    '⚠️ **অ্যাক্সেস ডিনায়েলড!**\n\nবটটি ব্যবহার করার জন্য আপনাকে অবশ্যই আমাদের অফিশিয়াল টেলিগ্রাম চ্যানেল ও ইউটিউব চ্যানেল সাবস্ক্রাইব করতে হবে। নিচে থেকে জয়েন করে ভেরিফাই করুন:',
                    Markup.inlineKeyboard([
                        [Markup.button.url('📢 Join Telegram Channel', 'https://t.me/shohan2004')],
                        [Markup.button.url('🔴 Subscribe YouTube', YOUTUBE_URL)],
                        [Markup.button.callback('🔄 Verify Membership', 'verify_sub')]
                    ])
                );
            }
        } catch (e) {
            console.log('Start check error:', e);
        }
    }

    sendMainMenu(ctx);
});

// 🔄 ভেরিফাই বাটন হ্যান্ডলার
bot.action('verify_sub', async (ctx) => {
    const userId = ctx.from.id;
    try {
        const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
        if (chatMember.status === 'left' || chatMember.status === 'kicked') {
            return ctx.answerCbQuery('❌ আপনি এখনো টেলিগ্রাম চ্যানেলে জয়েন করেননি!', { show_alert: true });
        }
        await ctx.answerCbQuery('🎉 অভিনন্দন! ভেরিফিকেশন সফল হয়েছে।');
        await ctx.deleteMessage();
        sendMainMenu(ctx);
    } catch (e) {
        await ctx.answerCbQuery('❌ দয়া করে আগে চ্যানেলে জয়েন করুন!', { show_alert: true });
    }
});

// 💎 স্টাইলিশ মূল মেনু ড্যাশবোর্ড
function sendMainMenu(ctx) {
    const userId = ctx.from.id.toString();
    
    let keyboard = [
        [Markup.button.callback('🛍️ Shop / Buy Likes', 'buy_likes'), Markup.button.callback('🔍 Check FF UID', 'check_uid')],
        [Markup.button.callback('💰 Add Balance', 'deposit'), Markup.button.callback('👤 My Profile', 'profile')],
        [Markup.button.callback('📜 Order History', 'history'), Markup.button.callback('📞 Support Desk', 'support')]
    ];

    // 👑 সিক্রেট অ্যাডমিন প্যানেল (শুধুমাত্র আপনার আইডিতে শো করবে)
    if (userId === ADMIN_ID.toString()) {
        keyboard.push(
            [Markup.button.callback('➕ Add Product', 'admin_add_product'), Markup.button.callback('📦 Manage Products', 'admin_manage')],
            [Markup.button.callback('💳 Deposit Requests', 'admin_deposits'), Markup.button.callback('⚙️ Bot Settings', 'admin_settings')]
        );
    }

    ctx.reply('✨ **ST LIKE ~ SELL BOT**-এ আপনাকে স্বাগতম! ✨\n\n👇 আপনার পছন্দের সার্ভিসটি নিচের বাটন থেকে সিলেক্ট করুন:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
    });
}

// 🔍 ফ্রি ফায়ার UID নেম চেকার সিস্টেম
bot.action('check_uid', (ctx) => {
    const userId = ctx.from.id;
    awaitingUidForCheck[userId] = true;
    ctx.reply('🎮 **Free Fire UID Checker**\n\n✍️ যে প্লেয়ারের নাম চেক করতে চান, তার সঠিক **UID** (যেমন: `9884223138`) নিচে চ্যাটে লিখে পাঠান:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'back_start')]])
    });
});

// 📥 টেক্সট ইনপুট এবং API ফেচিং লজিক
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();

    if (awaitingUidForCheck[userId]) {
        delete awaitingUidForCheck[userId];

        const waitMsg = await ctx.reply('⏳ সার্ভার থেকে প্লেয়ারের তথ্য যাচাই করা হচ্ছে, দয়া করে অপেক্ষা করুন...');

        try {
            const apiUrl = `https://akmtopup.com/api/checkuid?uid=${text}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

            if (response.data && (response.data.success || response.data.status)) {
                const nickname = response.data.nickname || response.data.name || 'Unknown';
                await ctx.reply(`🎉 **Free Fire Account Found!**\n\n🆔 **UID:** \`${text}\`\n👤 **Player Name:** \`${nickname}\``, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu', 'back_start')]])
                });
            } else {
                await ctx.reply(`❌ কোনো প্লেয়ার খুঁজে পাওয়া যায়নি বা ইনভ্যালিড UID!\n\nদয়া করে সঠিক UID দিয়ে পুনরায় চেষ্টা করুন।`, {
                    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu', 'back_start')]])
                });
            }
        } catch (error) {
            await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
            await ctx.reply(`⚠️ নেম চেকার এপিআই কানেক্ট করতে সমস্যা হয়েছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।`, {
                ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu', 'back_start')]])
            });
        }
        return;
    }
});

// ⚡ লাইক অর্ডার ও প্রসেসিং অ্যানিমেশন
bot.action('buy_likes', async (ctx) => {
    let msg = await ctx.reply('⏳ লাইক পাঠানোর প্রক্রিয়া শুরু হচ্ছে...');
    
    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '🔄 সার্ভারে রিকোয়েস্ট পাঠানো হচ্ছে...');
    }, 1500);

    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '📊 লাইক কাউন্ট মিলিয়ে দেখা হচ্ছে...');
    }, 3000);

    setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '✅ **সফলভাবে লাইক পাঠানো সম্পন্ন হয়েছে!**\n\n❤️ আগের লাইক: `1995`\n❤️ বর্তমান লাইক: `2215`\n➕ যুক্ত হয়েছে: `+220`', { parse_mode: 'Markdown' });
    }, 4500);
});

// 💳 ডিপোজিট সেকশন
bot.action('deposit', (ctx) => {
    ctx.reply(
        '💳 **ডিপোজিট সেকশন**\n\nপেমেন্ট করার জন্য নিচের মেথডগুলো থেকে আপনার পছন্দের মাধ্যমটি সিলেক্ট করুন:',
        Markup.inlineKeyboard([
            [Markup.button.callback('bKash', 'pay_bkash'), Markup.button.callback('Nagad', 'pay_nagad')],
            [Markup.button.callback('Rocket', 'pay_rocket'), Markup.button.callback('Binance', 'pay_binance')],
            [Markup.button.callback('🔙 Main Menu', 'back_start')]
        ])
    );
});

bot.action(/pay_(.+)/, (ctx) => {
    const method = ctx.match[1].toUpperCase();
    ctx.reply(`📌 **${method} Deposit System**\n\n১. সেন্ড মানি করুন: \`01772665599\`\n২. টাকা পাঠানোর পর **TrxID** অথবা পেমেন্টের স্ক্রিনশট এখানে পাঠিয়ে দিন।`);
});

// 👤 প্রোফাইল সেকশন
bot.action('profile', (ctx) => {
    const userId = ctx.from.id;
    const balance = userBalances[userId] || 145.0;
    ctx.reply(`👤 **MY PROFILE**\n\n🆔 Telegram ID: \`${userId}\`\n💰 ব্যালেন্স: \`${balance} BDT\`\n📦 মোট অর্ডার: \`১ টি\`\n❤️ মোট লাইক: \`২১৩ টি\``, { parse_mode: 'Markdown' });
});

// 📞 সাপোর্ট ডেস্ক্রিপশন
bot.action('support', (ctx) => {
    ctx.reply('📞 **Support Desk**\n\nআপনার যেকোনো সমস্যা বা প্রশ্ন এখানে লিখে পাঠান, অ্যাডমিন খুব শীঘ্রই আপনার সাথে যোগাযোগ করবেন।');
});

// 📜 হিস্ট্রি
bot.action('history', (ctx) => {
    ctx.reply('📜 **Order History**\n\nআপনার পূর্ববর্তী সফল অর্ডারগুলোর তালিকা নিচে দেওয়া হলো:\n\n✨ ডেইলি লাইকস (+220 Likes) - সফল ✅');
});

bot.action('back_start', (ctx) => {
    sendMainMenu(ctx);
});

// 🚀 রেন্ডার (Render) সার্ভার সচল রাখার জন্য Express সার্ভার
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('ST LIKE ~ SELL BOT is running perfectly! 🔥'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

bot.launch();
