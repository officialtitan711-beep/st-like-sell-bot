Const { Telegraf, Markup } = require('telegraf');
Const http = require('http');
Const https = require('https');
Require('dotenv').config();

Process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); });
Process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection at:', promise, 'reason:', reason); });

Const BOT_TOKEN = process.env.BOT_TOKEN || '8395471740:AAF-v0dAgc36nL7sb1G5Dy6IzHmsCUlwe80';
Const ADMIN_ID = process.env.ADMIN_ID || '5932254012';
Const CHANNEL_ID = process.env.CHANNEL_ID || '@shohan2004';
Const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://m.youtube.com/@ShohanSir18';

// সঠিক এপিআই বেস ইউআরএল (ডকুমেন্টেশন অনুযায়ী)
Const API_BASE = "https://raigen.site/likesff/reseller.php";
Const API_KEY = "likesff-shop-11935-c3rp5src";
Const PORT = process.env.PORT || 3000;
Const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://st-like-sell-bot.onrender.com';
Const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;

Const bot = new Telegraf(BOT_TOKEN);

Let cachedDb = { 
    Users: {}, 
    Balances: {}, 
    Sessions: {}, 
    Numbers: { bkash: '01XXXXXXXXX', nagad: '01XXXXXXXXX' }, 
    Categories: ['🔥 Free Fire Likes'], 
    CustomProducts: { 
        '🔥 Free Fire Likes': [
            { name: '100 LIKE - 5৳ [ DAILY ]' },
            { name: '220 LIKE - 7৳ [ DAILY ]' },
            { name: '1100 LIKE - 50৳ [ 5 DAYS ] ( AUTO ) 🚀⚡' },
            { name: '3300 LIKE - 150৳ [ 15 DAYS ] ( AUTO ) 🚀⚡' },
            { name: '6600 LIKE - 300৳ [ 30 DAYS ] ( AUTO ) 🚀⚡' }
        ]
    }, 
    Subscriptions: {}, 
    AllowedUsers: {}, 
    PendingMsgs: {}, 
    OrderHistories: {}, 
    HistoryTimestamps: {}, 
    LastCleanMonth: '', 
    UserLang: {}, 
    DepositRequests: {}, 
    AdminReplySessions: {}, 
    AdminInputSession: {}, 
    AdminSessions: {}, 
    CalcStates: {}, 
    Settings: { autoApiEnabled: true } 
};

Function loadDatabase() { 
    If (!cachedDb) cachedDb = {};
    If (!cachedDb.categories || !Array.isArray(cachedDb.categories)) {
        CachedDb.categories = cachedDb.categories ? Object.keys(cachedDb.categories) : ['🔥 Free Fire Likes'];
    }
    If (!cachedDb.customProducts) cachedDb.customProducts = {};
    If (!cachedDb.subscriptions) cachedDb.subscriptions = {};
    Return cachedDb; 
}

Function syncDataFromFirebase() {
    If (!FIREBASE_DB_URL) return;
    Const url = FIREBASE_DB_URL.endsWith('/') ? `${FIREBASE_DB_URL}database.json` : `${FIREBASE_DB_URL}/database.json`;
    Https.get(url, (res) => {
        Let data = '';
        Res.on('data', (chunk) => { data += chunk; });
        Res.on('end', () => {
            Try {
                If (data && data !== 'null') {
                    Const parsed = JSON.parse(data);
                    If (parsed) {
                        CachedDb.users = parsed.users || cachedDb.users;
                        CachedDb.balances = parsed.balances || cachedDb.balances;
                        CachedDb.sessions = parsed.sessions || cachedDb.sessions;
                        CachedDb.numbers = parsed.numbers || cachedDb.numbers;
                        
                        If (parsed.categories) {
                            If (Array.isArray(parsed.categories)) {
                                CachedDb.categories = parsed.categories;
                            } else {
                                CachedDb.categories = Object.keys(parsed.categories);
                            }
                        }
                        If (parsed.customProducts) {
                            CachedDb.customProducts = parsed.customProducts;
                        }
                        If (parsed.subscriptions) {
                            CachedDb.subscriptions = parsed.subscriptions;
                        }

                        CachedDb.allowedUsers = parsed.allowedUsers || cachedDb.allowedUsers;
                        CachedDb.orderHistories = parsed.orderHistories || cachedDb.orderHistories;
                        CachedDb.userLang = parsed.userLang || cachedDb.userLang;
                        CachedDb.depositRequests = parsed.depositRequests || cachedDb.depositRequests;
                        CachedDb.settings = parsed.settings || cachedDb.settings;
                    }
                }
            } catch (e) {}
        });
    }).on('error', () => {});
}

Function saveDatabase(data) {
    CachedDb = data;
    If (!FIREBASE_DB_URL) return;
    Const dataString = JSON.stringify(data);
    Const dbUrl = new URL(FIREBASE_DB_URL.endsWith('/') ? `${FIREBASE_DB_URL}database.json` : `${FIREBASE_DB_URL}/database.json`);
    Const reqOptions = { hostname: dbUrl.hostname, path: dbUrl.pathname + dbUrl.search, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dataString) } };
    Const req = https.request(reqOptions, () => {});
    Req.on('error', () => {});
    Req.write(dataString);
    Req.end();
}

SyncDataFromFirebase();
SetInterval(syncDataFromFirebase, 5 * 60 * 1000);

Function callLikesFFApiWithTimeout(params, timeoutMs = 30000) {
    Return new Promise((resolve) => {
        Const queryParams = new URLSearchParams({ key: API_KEY, ...params });
        Const url = `${API_BASE}?${queryParams.toString()}`;
        Let isFinished = false;
        Const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
            Let data = '';
            Res.on('data', (chunk) => { data += chunk; });
            Res.on('end', () => {
                If (isFinished) return;
                IsFinished = true;
                Try { resolve(JSON.parse(data)); } catch (err) { resolve({ success: false, error: 'Invalid JSON' }); }
            });
        });
        Req.on('error', () => { if (!isFinished) { isFinished = true; resolve({ success: false, error: 'Failed' }); } });
        SetTimeout(() => { if (!isFinished) { isFinished = true; req.destroy(); resolve({ success: false, error: 'Timeout' }); } }, timeoutMs);
    });
}

Function checkFreeFireUID(uid) {
    Return new Promise((resolve) => {
        Const url = 'https://auraffxserverinfocheckerapi.onrender.com/api/player?uid=' + uid;
        Https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
            Let data = '';
            Res.on('data', (chunk) => { data += chunk; });
            Res.on('end', () => {
                Try {
                    Const parsed = JSON.parse(data);
                    Let nickname = parsed.nickname || parsed.name || parsed.username || parsed.AccountName;
                    Let level = parsed.level || parsed.AccountLevel || parsed.lvl || '';
                    Let likes = parsed.likes || parsed.AccountLikes || parsed.Like || parsed.like || 0;
                    Resolve({ 
                        Nickname: (nickname && nickname.trim() !== '') ? nickname : 'Unknown Player', 
                        Level: level ? String(level) : '',
                        Likes: Number(likes) || 0
                    });
                } catch (err) { resolve({ nickname: 'Unknown Player', level: '', likes: 0 }); }
            });
        }).on('error', () => { resolve({ nickname: 'Unknown Player', level: '', likes: 0 }); });
    });
}

Function extractPackageDays(productName) {
    Const lower = productName.toLowerCase();
    If (lower.includes('100')) return 1; 

    If (lower.includes('5 days') || lower.includes('৫ দিন') || lower.includes('15 days') || lower.includes('১৫ দিন') || lower.includes('30 days') || lower.includes('৩০ দিন')) {
        Const match = productName.match(/(\d+)\s*(days?|দিন)/i);
        If (match && match[1]) {
            Const days = parseInt(match[1], 10);
            Return days > 1 ? days : 1;
        }
    }
    Return 1;
}

// স্ক্রিনশটের অফিশিয়াল প্রোডাক্ট কোড ম্যাপিং
Function getApiProductCode(productName) {
    Const lower = productName.toLowerCase();
    If (lower.includes('6600') || lower.includes('৩০ দিন')) return 'AL-55F71F';
    If (lower.includes('3300') || lower.includes('১৫ দিন')) return 'AL-3300';
    If (lower.includes('1100') || lower.includes('৫ দিন')) return 'AL-1100';
    Return ''; 
}

Function getTodayDateBD() {
    Const now = new Date();
    Const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    Const year = bdTime.getFullYear();
    Const month = String(bdTime.getMonth() + 1).padStart(2, '0');
    Const day = String(bdTime.getDate()).padStart(2, '0');
    Return `${year}-${month}-${day}`;
}

Function getCurrentHourBD() {
    Const now = new Date();
    Const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    Return bdTime.getHours();
}

Async function processDailySubscriptions() {
    Const db = loadDatabase();
    If (!db.subscriptions) return;

    Const currentHour = getCurrentHourBD();
    If (currentHour < 4) return; 

    Const todayStr = getTodayDateBD();
    Const subKeys = Object.keys(db.subscriptions);
    Let isDbModified = false;

    For (const subId of subKeys) {
        Const sub = db.subscriptions[subId];
        If (!sub) continue;

        If (sub.remainingDays <= 0) {
            Delete db.subscriptions[subId];
            IsDbModified = true;
            Continue;
        }

        If (sub.lastDeliveredDate === todayStr) {
            Continue;
        }

        If (db.settings && db.settings.autoApiEnabled) {
            Const preCheck = await checkFreeFireUID(sub.uid);
            Const prevLikes = preCheck.likes || 0;

            Const prodCode = getApiProductCode(sub.product);
            Const apiParams = prodCode ? { action: 'auto', product: prodCode, uid: sub.uid, server: sub.region } : { action: 'like', uid: sub.uid, server: sub.region };

            Const apiRes = await callLikesFFApiWithTimeout(apiParams, 30000);

            If (apiRes.success) {
                Await new Promise(r => setTimeout(r, 3000));
                Const postCheck = await checkFreeFireUID(sub.uid);
                Const currLikes = postCheck.likes || prevLikes;
                Const addedLikes = currLikes >= prevLikes ? (currLikes - prevLikes) : 0;

                Const isLastDay = sub.remainingDays === 1;

                Sub.remainingDays -= 1;
                Sub.deliveredDays += 1;
                Sub.lastDeliveredDate = todayStr;
                IsDbModified = true;

                Const userId = sub.userId;
                Const currentBal = db.balances[userId] || 0;

                If (!db.orderHistories[userId]) db.orderHistories[userId] = [];
                Const now = new Date();
                Db.orderHistories[userId].unshift({
                    Timestamp: now.getTime(),
                    Date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                    Time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                    Product: `${sub.product} (Day ${sub.deliveredDays}/${sub.totalDays})`,
                    Uid: sub.uid,
                    Nickname: sub.nickname || 'Unknown',
                    Region: sub.region,
                    Price: 0,
                    Status: 'Complete'
                });
                If (db.orderHistories[userId].length > 10) db.orderHistories[userId].pop();

                Const statusLine = !isLastDay 
                    ? `⏳ Remaining Days: \`${sub.remainingDays} Days Left\``
                    : `🏁 Package Status: \`Completed (All ${sub.totalDays} Days Delivered)\``;

                Const userLangChoice = getUserLang(userId);
                Const warningText = userLangChoice === 'bn' 
                    ? "⚠️ **সতর্কতা: ২৪ ঘণ্টার মধ্যে একই ইউআইডিতে পুনরায় লাইক নিলে লাইক না-ও যোগ হতে পারে!**"
                    : "⚠️ **Warning: Taking likes again on this UID within 24 hours may result in likes not being added!**";

                Const dailyReceipt = `💠 ════════════════════════════ 💠\n           ✅ DAILY AUTO-LIKE COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${sub.product}\`\n📅 Progress: \`Day ${sub.deliveredDays} of ${sub.totalDays}\`\n🆔 Sub ID: \`${subId}\`\n\n👤 Name: \`${sub.nickname || 'Unknown'}\`\n🛡️ UID: \`${sub.uid}\`\n🌍 Server: \`${sub.region}\`\n\n👍 **Previous Likes:** \`${prevLikes}\`\n👍 **Current Likes:** \`${currLikes}\`\n📈 **Added Likes:** \`+${addedLikes} Likes\`\n\n${statusLine}\n💰 Daily Charge: \`0 BDT (Pre-Paid)\`\n💳 Current Balance: \`${currentBal} BDT\`\n\n${warningText}\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

                Await bot.telegram.sendMessage(userId, dailyReceipt, {
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
                }).catch(() => {});

                Await bot.telegram.sendMessage(ADMIN_ID, `📋 **[Daily Auto-Delivery Log - Day ${sub.deliveredDays}/${sub.totalDays}]**\n\n` + dailyReceipt + `\n\n👤 **Customer ID:** \`${userId}\``, { parse_mode: 'Markdown' }).catch(() => {});

                If (isLastDay || sub.remainingDays <= 0) {
                    Delete db.subscriptions[subId];
                }
            }
        }
    }

    If (isDbModified) {
        SaveDatabase(db);
    }
}

SetInterval(processDailySubscriptions, 15 * 60 * 1000);

Function getUserLang(userId) {
    Const db = loadDatabase();
    If (!db.userLang) db.userLang = {};
    Return db.userLang[userId] || 'en';
}

Function t(userId, key) {
    Const lang = getUserLang(userId);
    Const dict = {
        Bn: {
            Welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ স্বাগতম! আমাদের প্রিমিয়াম গেমিং সার্ভিসে আপনাকে স্বাগতম। নিচে থেকে আপনার পছন্দের সার্ভিসটি বেছে নিনঃ 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            ShopMenuTitle: "🛍️ **সকল উপলব্ধ সার্ভিস**\n\n👇 আপনার পছন্দের সার্ভিসটি নিতে নিচের বাটনগুলোতে ক্লিক করুন:",
            CheckUidPrompt: "🎮 **ফ্রি ফায়ার ইউআইডি চেকার**\n\n✍️ ইউআইডি লিখে পাঠান:",
            DepositPortal: "»»------------- ★ 💰 ডিপোজিট পোর্টাল ★ -------------««\n\n💎 টাকা পাঠানোর জন্য যেকোনো মাধ্যম সিলেক্ট করুন:\n\n»»-------------------------------------------------««",
            SupportText: "📞 **সাপোর্ট ডেস্ক**\n\n💡 আপনার যেকোনো সমস্যা, TrxID বা স্ক্রিনশট সরাসরি এই চ্যাটেই পাঠিয়ে দিন। অ্যাডমিন খুব দ্রুত রিপ্লাই দেবেন।",
            MainMenuBack: "🔙 মূল মেনু 🏠",
            BackBtn: "🔙 পেছনের মেনু ↩️",
            BuyLikes: "🔥 ফ্রি ফায়ার লাইক কিনুন ⚡",
            ServerTitle: "🌍 **সার্ভার নির্বাচন**\n\nপ্যাকেজ: ",
            ConfirmOrderBtn: "✅ অর্ডার কনফার্ম করুন 🚀",
            CancelBtn: "❌ বাতিল করুন",
            SupportSentSuccess: "✨ আপনার মেসেজ বা স্ক্রিনশট সরাসরি অ্যাডমিনের কাছে পৌঁছে গেছে! দয়া করে অপেক্ষা করুন।",
            HistoryTitle: "📜 **শেষ ১০টি অর্ডারের ইতিহাস**\n\n",
            HistoryDisclaimer: "\n⚠️ *নোট: সুরক্ষার জন্য এখানে শুধুমাত্র আপনার সর্বশেষ ১০টি অর্ডার দেখানো হয়।*",
            NoHistory: "❌ এখনো কোনো অর্ডার সম্পন্ন হয়নি!\n\n"
        },
        En: {
            Welcome: "╭•◈•══════ 👑 ST LIKE BOT 👑 ══════•◈•╮\n\n✨ Welcome to our premium gaming service. Choose your preferred service below: 👇\n\n╰•◈•═════════════════════════════•◈•╯",
            ShopMenuTitle: "🛍️ **ALL AVAILABLE SHOP**\n\n👇 Please select the buttons below:",
            CheckUidPrompt: "🎮 **FREE FIRE UID CHECKER**\n\n✍️ Send UID:",
            DepositPortal: "»»------------- ★ 💰 DEPOSIT PORTAL ★ -------------««\n\n💎 Choose any payment method below:\n\n»»-------------------------------------------------««",
            SupportText: "📞 **SUPPORT DESK**\n\n💡 Send any issue, TrxID or screenshot directly in this chat. Admin will reply soon.",
            MainMenuBack: "🔙 Main Menu 🏠",
            BackBtn: "🔙 Back ↩️",
            BuyLikes: "🔥 Buy Fire Fire Likes ⚡",
            ServerTitle: "🌍 **SERVER SELECTION**\n\nPackage: ",
            ConfirmOrderBtn: "✅ Confirm Order 🚀",
            CancelBtn: "❌ Cancel",
            SupportSentSuccess: "✨ Your message or screenshot has been sent directly to the admin! Please wait.",
            HistoryTitle: "📜 **LAST 10 ORDERS HISTORY**\n\n",
            HistoryDisclaimer: "\n⚠️ *Note: Only the latest 10 orders are displayed here.*",
            NoHistory: "❌ No orders completed yet!\n\n"
        }
    };
    Return dict[lang][key] || dict['en'][key];
}

Function getMainKeyboard(userId) {
    Const lang = getUserLang(userId);
    Let keyboard = lang === 'en' ? [
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

    If (userId.toString() === ADMIN_ID.toString()) {
        Const db = loadDatabase();
        Const apiStatusText = (db.settings && db.settings.autoApiEnabled) ? '🟢 Auto API: ON' : '🔴 Auto API: OFF';
        Keyboard.push(
            ['-----------------------------------'],
            [apiStatusText, '📊 Total Users'],
            ['➕ Add Bot', '❌ Remove Bot'],
            ['💳 Add/Minus Balance', '📱 Set Payment Numbers'],
            ['📩 Send Message', '📢 All Users Msg']
        );
    }
    Return Markup.keyboard(keyboard).resize();
}

Function isMenuCommand(text) {
    If (!text) return false;
    If (text.startsWith('/')) return true;
    
    Const lowerText = text.trim().toLowerCase();
    
    If (lowerText.includes('shop now') || lowerText.includes('শপ নাও') || lowerText.includes('shop') || lowerText.includes('শপ')) return true;
    If (lowerText.includes('check ff uid') || lowerText.includes('ইউআইডি চেক') || lowerText.includes('ইউআইডি')) return true;
    If (lowerText.includes('add balance') || lowerText.includes('ব্যালেন্স অ্যাড') || lowerText.includes('ব্যালেন্স')) return true;
    If (lowerText.includes('my profile') || lowerText.includes('আমার প্রোফাইল') || lowerText.includes('প্রোফাইল')) return true;
    If (lowerText.includes('order history') || lowerText.includes('অর্ডার হিস্ট্রি') || lowerText.includes('হিস্ট্রি')) return true;
    If (lowerText.includes('support desk') || lowerText.includes('সাপোর্ট ডেস্ক') || lowerText.includes('সাপোর্ট')) return true;
    If (lowerText.includes('calculator') || lowerText.includes('ক্যালকুলেটর')) return true;
    If (lowerText.includes('world clock') || lowerText.includes('ওয়ার্ল্ড ক্লক') || lowerText.includes('ওয়ার্ল্ড')) return true;
    
    Const keywords = [
        'total users', 'add bot', 'remove bot', 'add/minus balance', 
        'set payment numbers', 'send message', 'all users msg', '-----------------------------------',
        'auto api: on', 'auto api: off'
    ];
    
    Return keywords.some(k => lowerText.includes(k));
}

Function translateCategoryName(catName, userId) {
    Return catName;
}

Function translateProductName(prodName, userId) {
    Const lang = getUserLang(userId);
    If (lang === 'bn') {
        Return prodName.replace(/Likes/gi, 'লাইক').replace(/Squad Bot/gi, 'স্কোয়াড বট').replace(/Days/gi, 'দিন').replace(/Pack/gi, 'প্যাকেজ');
    } else {
        Return prodName.replace(/লাইক/gi, 'Likes').replace(/স্কোয়াড বট/gi, 'Squad Bot').replace(/দিন/gi, 'Days').replace(/প্যাকেজ/gi, 'Pack');
    }
}

Async function checkUserSubscription(userId) {
    If (userId.toString() === ADMIN_ID.toString()) return true;
    Try {
        Const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
        Return !(chatMember.status === 'left' || chatMember.status === 'kicked');
    } catch (e) { return false; }
}

Async function sendForceSubMessage(ctx, isPendingAdminAccess = false) {
    Let text, keyboard;
    If (isPendingAdminAccess) {
        Text = "⏳ **50% ACCESS PENDING**\n\n🎉 অভিনন্দন! আপনি **ST Like Bot**-এর ৫০% এক্সেস সফলভাবে পেয়েছেন। বাকী এক্সেস পেতে নিচের বাটনে ক্লিক করে অ্যাডমিনকে মেসেজ দিন।\n👑 **Admin:** `@sonu1813`";
        Keyboard = Markup.inlineKeyboard([[Markup.button.url('💬 Message Admin 🚀', 'https://t.me/sonu1813')]]);
    } else {
        Text = "🚨 **SECURITY LOCK & FORCE**\n\n⚠️ প্রিমিয়াম বট ব্যবহার করতে হলে আমাদের অফিশিয়াল চ্যানেলে যুক্ত থাকতে হবে!\n\n🔥 **ধাপসমূহ:**\n1️⃣ টেলিগ্রাম চ্যানেলে জয়েন করুন।\n2️⃣ ইউটিউব চ্যানেল সাবস্ক্রাইব করুন।\n3️⃣ ভেরিফাই বাটনে ক্লিক করুন।";
        Keyboard = Markup.inlineKeyboard([
            [Markup.button.url('📢 Join Telegram Channel 🚀', 'https://t.me/shohan2004')],
            [Markup.button.url('🔴 Subscribe YouTube 🎬', YOUTUBE_URL)],
            [Markup.button.callback('🔄 Verify Membership ✨', 'verify_sub')]
        ]);
    }
    Try {
        If (ctx.callbackQuery) { await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }); }
        else { await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard }); }
    } catch (e) {}
}

Bot.use(async (ctx, next) => {
    Try {
        If (ctx && ctx.from) {
            Const userId = ctx.from.id.toString();
            Const db = loadDatabase();
            
            If (userId === ADMIN_ID.toString()) return next();
            If (ctx.callbackQuery && ctx.callbackQuery.data === 'verify_sub') return next();
            
            If (!db.allowedUsers || !db.allowedUsers[userId]) {
                If (ctx.message && ctx.message.text) {
                    Const msgText = ctx.message.text;
                    If (msgText.startsWith('/start') || isMenuCommand(msgText)) {
                        Return sendForceSubMessage(ctx, true);
                    }
                }
                Return sendForceSubMessage(ctx, true);
            }

            If (!db.users) db.users = {};
            Db.users[userId] = { id: userId, first_name: ctx.from.first_name || 'N/A', username: ctx.from.username ? '@' + ctx.from.username : 'N/A' };
            SaveDatabase(db);

            If (!(await checkUserSubscription(userId))) return sendForceSubMessage(ctx, false);
        }
        Await next();
    } catch (err) {}
});

Bot.start(async (ctx) => {
    Try {
        Const userId = ctx.from.id.toString();
        If (!(await checkUserSubscription(userId))) return sendForceSubMessage(ctx, false);
        Const db = loadDatabase();
        If (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        If (userId.toString() !== ADMIN_ID.toString() && (!db.allowedUsers || !db.allowedUsers[userId])) return sendForceSubMessage(ctx, true);
        Return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

Bot.action('verify_sub', async (ctx) => {
    Try {
        Const userId = ctx.from.id.toString();
        If (!(await checkUserSubscription(userId))) return ctx.answerCbQuery('❌ আপনি এখনো টেলিগ্রাম চ্যানেলে জয়েন করেননি!', { show_alert: true });
        Const db = loadDatabase();
        If (userId.toString() !== ADMIN_ID.toString() && (!db.allowedUsers || !db.allowedUsers[userId])) {
            Await ctx.answerCbQuery('⚠️ চ্যানেল ভেরিফাইড! অ্যাডমিনের পারমিশন নিন।');
            Try { await ctx.deleteMessage(); } catch (e) {}
            Return sendForceSubMessage(ctx, true);
        }
        Await ctx.answerCbQuery('🎉 ভেরিফিকেশন সফল!');
        Try { await ctx.deleteMessage(); } catch (e) {}
        Return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

Function getCalcKeyboard() {
    Return Markup.inlineKeyboard([
        [Markup.button.callback('C', 'calc_C'), Markup.button.callback('⌫', 'calc_DEL'), Markup.button.callback('/', 'calc_/'), Markup.button.callback('*', 'calc_*')],
        [Markup.button.callback('7', 'calc_7'), Markup.button.callback('8', 'calc_8'), Markup.button.callback('9', 'calc_9'), Markup.button.callback('-', 'calc_-')],
        [Markup.button.callback('4', 'calc_4'), Markup.button.callback('5', 'calc_5'), Markup.button.callback('6', 'calc_6'), Markup.button.callback('+', 'calc_+')],
        [Markup.button.callback('1', 'calc_1'), Markup.button.callback('2', 'calc_2'), Markup.button.callback('3', 'calc_3'), Markup.button.callback('=', 'calc_EQ')],
        [Markup.button.callback('0', 'calc_0'), Markup.button.callback('.', 'calc_.'), Markup.button.callback('🔙 Main Menu 🏠', 'back_start_inline')]
    ]);
}

Bot.on('message', async (ctx) => {
    Try {
        If (!ctx.message) return;
        Const userId = ctx.from.id.toString();
        Const text = ctx.message.text ? ctx.message.text.trim() : (ctx.message.caption ? ctx.message.caption.trim() : '');
        Const lowerText = text.toLowerCase();
        Const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2B50}\u{2728}\u{1F4F1}\u{1F4B0}\u{1F464}\u{1F4DC}\u{1F4DE}\u{1F9EE}\u{1F30D}\u{1F4CA}\u{2795}\u{274C}\u{1F4B3}\u{1F4E9}\u{1F4E2}\u{1F4F7}\u{1F50D}\u{1F3AE}\u{1F4C1}\u{1F4CC}\u{2328}\u{1F310}\s]/gu, '').trim().toLowerCase();

        Const db = loadDatabase();
        If (!db.balances) db.balances = {};
        If (!db.sessions) db.sessions = {};
        If (!db.numbers) db.numbers = { bkash: '01XXXXXXXXX', nagad: '01XXXXXXXXX' };
        If (!db.categories) db.categories = ['🔥 Free Fire Likes'];
        If (!db.customProducts) db.customProducts = {};
        If (!db.subscriptions) db.subscriptions = {};
        If (!db.users) db.users = {};
        If (!db.allowedUsers) db.allowedUsers = {};
        If (!db.orderHistories) db.orderHistories = {};
        If (!db.depositRequests) db.depositRequests = {};
        If (!db.adminInputSession) db.adminInputSession = {};
        If (!db.adminSessions) db.adminSessions = {};
        If (!db.calcStates) db.calcStates = {};
        If (!db.userLang) db.userLang = {};

        If (isMenuCommand(text)) {
            If (db.sessions && db.sessions[userId]) {
                Delete db.sessions[userId];
                SaveDatabase(db);
            }
            If (userId === ADMIN_ID.toString() && db.adminInputSession && db.adminInputSession[userId]) {
                Delete db.adminInputSession[userId];
                SaveDatabase(db);
            }
        }

        If (userId === ADMIN_ID.toString() && db.adminReplySessions && db.adminReplySessions[userId] && !isMenuCommand(text)) {
            Const targetUser = db.adminReplySessions[userId];
            Try {
                Await bot.telegram.sendMessage(targetUser, "💬 **Admin Reply:**\n\n" + text, { parse_mode: 'Markdown' });
                Await ctx.reply('✅ Reply sent successfully!');
            } catch (err) { await ctx.reply('❌ Failed to send.'); }
            Delete db.adminReplySessions[userId];
            SaveDatabase(db);
            Return;
        }

        If (userId === ADMIN_ID.toString() && db.adminInputSession && db.adminInputSession[userId] && !isMenuCommand(text)) {
            Const sessionData = db.adminInputSession[userId];

            If (sessionData.type === 'add_bot_user') {
                Const targetUid = text.replace(/[^0-9]/g, '');
                If (targetUid) {
                    Db.allowedUsers[targetUid] = true;
                    SaveDatabase(db);
                    Delete db.adminInputSession[userId];
                    Try {
                        Await bot.telegram.sendMessage(targetUid, "🎉 অভিনন্দন! অ্যাডমিন আপনার বট এক্সেস অনুমোদন করেছেন। এখন থেকে আপনি বট ব্যবহার করতে পারবেন। /start লিখে শুরু করুন।", { parse_mode: 'Markdown' });
                    } catch (e) {}
                    Return ctx.reply(`✅ সফলভাবে ইউজার আইডি \`${targetUid}\`-কে বট ব্যবহারের এক্সেস দেওয়া হয়েছে!`, { parse_mode: 'Markdown' });
                }
                Delete db.adminInputSession[userId];
                Return ctx.reply('❌ সঠিক ইউজার আইডি দিন।');
            }

            If (sessionData.type === 'remove_bot_user') {
                Const targetUid = text.replace(/[^0-9]/g, '');
                If (targetUid) {
                    If (db.allowedUsers[targetUid]) {
                        Delete db.allowedUsers[targetUid];
                    }
                    SaveDatabase(db);
                    Delete db.adminInputSession[userId];
                    Try {
                        Await bot.telegram.sendMessage(targetUid, "⚠️ দুঃখিত! অ্যাডমিন আপনার বট এক্সেস রিমুভ করে দিয়েছেন।", { parse_mode: 'Markdown' });
                    } catch (e) {}
                    Return ctx.reply(`❌ সফলভাবে ইউজার আইডি \`${targetUid}\`-এর এক্সেস রিমুভ করা হয়েছে!`, { parse_mode: 'Markdown' });
                }
                Delete db.adminInputSession[userId];
                Return ctx.reply('❌ সঠিক ইউজার আইডি দিন।');
            }

            If (sessionData.uniqueOrderId && db.adminSessions[sessionData.uniqueOrderId]) {
                Const uniqueOrderId = sessionData.uniqueOrderId;
                Const orderInfo = db.adminSessions[uniqueOrderId];

                If (orderInfo.isFFLikeCategory) {
                    If (!orderInfo.step || orderInfo.step === 'awaiting_prev_likes') {
                        OrderInfo.prevLikes = text;
                        OrderInfo.step = 'awaiting_curr_likes';
                        SaveDatabase(db);
                        Return ctx.reply('✍️ এখন **কারেন্ট লাইক (Current Likes)** কত সেটা লিখে পাঠান:', { parse_mode: 'Markdown' });
                    }
                    else if (orderInfo.step === 'awaiting_curr_likes') {
                        OrderInfo.currLikes = text;
                        OrderInfo.step = 'awaiting_added_likes';
                        SaveDatabase(db);
                        Return ctx.reply('✍️ এখন **এডেড লাইক (Added Likes)** কত (কত যোগ হলো) সেটা লিখে পাঠান:', { parse_mode: 'Markdown' });
                    }
                    else if (orderInfo.step === 'awaiting_added_likes') {
                        OrderInfo.addedLikes = text;
                        
                        Const targetUid = orderInfo.targetUserId;
                        Const currentBal = db.balances[targetUid] || 0;
                        Const totalDays = orderInfo.totalDays || 1;
                        Const remainingDays = totalDays - 1;

                        Let subNote = '';
                        If (totalDays > 1) {
                            Const subId = `SUB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
                            Db.subscriptions[subId] = {
                                UserId: targetUid,
                                Uid: orderInfo.uid,
                                Nickname: orderInfo.nickname || 'Unknown',
                                Region: orderInfo.region,
                                Product: orderInfo.product,
                                TotalDays: totalDays,
                                DeliveredDays: 1,
                                RemainingDays: remainingDays,
                                LastDeliveredDate: getTodayDateBD()
                            };
                            SubNote = `\n📅 **Subscription:** \`Day 1 of ${totalDays} (${remainingDays} Days Left)\``;
                        }

                        If (!db.orderHistories[targetUid]) db.orderHistories[targetUid] = [];
                        Const orderNow = new Date();
                        Db.orderHistories[targetUid].unshift({
                            Timestamp: orderNow.getTime(),
                            Date: orderNow.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                            Time: orderNow.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                            Product: totalDays > 1 ? `${orderInfo.product} (Day 1/${totalDays})` : orderInfo.product,
                            Uid: orderInfo.uid, nickname: orderInfo.nickname || 'Unknown', region: orderInfo.region, price: orderInfo.price, status: 'Complete'
                        });
                        If (db.orderHistories[targetUid].length > 10) db.orderHistories[targetUid].pop();
                        SaveDatabase(db);

                        Const userLangChoice = getUserLang(targetUid);
                        Const warningText = userLangChoice === 'bn' 
                            ? "⚠️ **সতর্কতা: ২৪ ঘণ্টার মধ্যে একই ইউআইডিতে পুনরায় লাইক নিলে লাইক না-ও যোগ হতে পারে!**"
                            : "⚠️ **Warning: Taking likes again on this UID within 24 hours may result in likes not being added!**";

                        Const completedReceipt = `💠 ════════════════════════════ 💠\n           ✅ ORDER SUCCESSFULLY COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${orderInfo.product}\`\n🆔 Order ID: \`SRV-${Math.floor(10000 + Math.random() * 90000)}\`\n\n🛡️ Target ID: \`${orderInfo.uid}\`\n🌍 Server: \`${orderInfo.region}\`\n\n📊 Status: \`Completed by Admin\`${subNote}\n\n👍 **Previous Likes:** \`${orderInfo.prevLikes}\`\n👍 **Current Likes:** \`${orderInfo.currLikes}\`\n📈 **Added Likes:** \`+${orderInfo.addedLikes} Likes\`\n\n💰 Price: \`${orderInfo.price} BDT\`\n💳 Remaining Balance: \`${currentBal} BDT\`\n\n${warningText}\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

                        Await bot.telegram.editMessageText(targetUid, orderInfo.loadingMessageId, null, completedReceipt, {
                            Parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUid, 'mainMenuBack'), 'back_start_inline')]])
                        }).catch(() => {});

                        Await bot.telegram.sendMessage(ADMIN_ID, "📋 **[Duplicate Copy - Manual Completed Order]**\n\n" + completedReceipt + "\n\n👤 **Customer ID:** `" + targetUid + "`", { parse_mode: 'Markdown' }).catch(() => {});
                        Await ctx.reply('✅ Order successfully completed & receipt updated to customer!');
                        Delete db.adminInputSession[userId];
                        Delete db.adminSessions[uniqueOrderId];
                        SaveDatabase(db);
                        Return;
                    }
                } else {
                    Const targetUid = orderInfo.targetUserId;
                    Const currentBal = db.balances[targetUid] || 0;

                    If (!db.orderHistories[targetUid]) db.orderHistories[targetUid] = [];
                    Const orderNow = new Date();
                    Db.orderHistories[targetUid].unshift({
                        Timestamp: orderNow.getTime(),
                        Date: orderNow.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                        Time: orderNow.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                        Product: orderInfo.product, uid: orderInfo.uid, nickname: orderInfo.nickname || 'Guild ID Service', region: orderInfo.region, price: orderInfo.price, status: 'Complete'
                    });
                    If (db.orderHistories[targetUid].length > 10) db.orderHistories[targetUid].pop();
                    SaveDatabase(db);

                    Const completedReceipt = `💠 ════════════════════════════ 💠\n           ✅ ORDER SUCCESSFULLY COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${orderInfo.product}\`\n🆔 Order ID: \`SRV-${Math.floor(10000 + Math.random() * 90000)}\`\n\n🛡️ Target Guild ID: \`${orderInfo.uid}\`\n🌍 Server: \`${orderInfo.region}\`\n\n📊 Status: \`Completed by Admin\`\n📝 Note/Details: \`${text}\`\n\n💰 Price: \`${orderInfo.price} BDT\`\n💳 Remaining Balance: \`${currentBal} BDT\`\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

                    Await bot.telegram.editMessageText(targetUid, orderInfo.loadingMessageId, null, completedReceipt, {
                        Parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUid, 'mainMenuBack'), 'back_start_inline')]])
                    }).catch(() => {});

                    Await bot.telegram.sendMessage(ADMIN_ID, "📋 **[Duplicate Copy - Completed Order]**\n\n" + completedReceipt + "\n\n👤 **Customer ID:** `" + targetUid + "`", { parse_mode: 'Markdown' }).catch(() => {});
                    Await ctx.reply('✅ Order successfully completed & receipt updated to customer!');
                    Delete db.adminInputSession[userId];
                    Delete db.adminSessions[uniqueOrderId];
                    SaveDatabase(db);
                    Return;
                }
            }

            Const actionType = sessionData.type;
            If (actionType === 'add_category') {
                Const catName = text;
                If (catName) {
                    If (!db.categories || !Array.isArray(db.categories)) db.categories = [];
                    If (!db.categories.includes(catName)) {
                        Db.categories.push(catName);
                    }
                    If (!db.customProducts[catName]) db.customProducts[catName] = [];
                    SaveDatabase(db);
                    Delete db.adminInputSession[userId];
                    Return ctx.reply(`✅ Category "${catName}" created successfully! Now go to Shop Menu, enter this category and add products.`);
                }
                Delete db.adminInputSession[userId];
                Return ctx.reply('❌ Invalid category name.');
            }
            If (actionType === 'add_shop_product') {
                Const catName = sessionData.category;
                Const parts = text.split('|');
                Const prodName = parts[0] ? parts[0].trim() : text;
                Const formattedProd = parts[1] ? `${prodName} - ${parts[1].trim()} BDT` : prodName;

                If (!db.customProducts[catName]) db.customProducts[catName] = [];
                Db.customProducts[catName].push({ name: formattedProd });
                SaveDatabase(db);
                Delete db.adminInputSession[userId];
                Return ctx.reply(`✅ Product added successfully to "${catName}"!`);
            }
            If (actionType === 'change_shop_price') {
                Const catName = sessionData.category;
                Const prodIndex = sessionData.prodIndex;
                Const newPrice = text.replace(/[^0-9]/g, '');

                If (db.customProducts[catName] && db.customProducts[catName][prodIndex]) {
                    Let oldName = db.customProducts[catName][prodIndex].name;
                    If (oldName.includes('-')) {
                        OldName = oldName.replace(/-\s*\d+.*$/, `- ${newPrice} BDT`);
                    } else {
                        OldName = `${oldName} - ${newPrice} BDT`;
                    }
                    Db.customProducts[catName][prodIndex].name = oldName;
                    SaveDatabase(db);
                    Delete db.adminInputSession[userId];
                    Return ctx.reply(`✅ Product price successfully updated to ${newPrice} BDT!`);
                }
                Delete db.adminInputSession[userId];
                Return ctx.reply('❌ Product not found.');
            }
            If (actionType === 'add_minus_balance') {
                Const parts = text.split(' ');
                Const targetUser = parts[0], amount = Number(parts[1]);
                If (targetUser && !isNaN(amount)) {
                    Db.balances[targetUser] = (db.balances[targetUser] || 0) + amount;
                    SaveDatabase(db);
                    Delete db.adminInputSession[userId];
                    Return ctx.reply(`✅ Balance updated! New Balance: ৳${db.balances[targetUser]}`);
                }
                Delete db.adminInputSession[userId];
                Return ctx.reply('❌ Correct format: `USER_ID AMOUNT`');
            }
            If (actionType === 'set_bkash_number') {
                Db.numbers.bkash = text;
                SaveDatabase(db);
                Delete db.adminInputSession[userId];
                Return ctx.reply('✅ bKash number updated successfully!');
            }
            If (actionType === 'set_nagad_number') {
                Db.numbers.nagad = text;
                SaveDatabase(db);
                Delete db.adminInputSession[userId];
                Return ctx.reply('✅ Nagad number updated successfully!');
            }
            If (actionType === 'send_message') {
                Const parts = text.split('|');
                If (parts[0] && parts[1]) {
                    Await bot.telegram.sendMessage(parts[0].trim(), parts[1].trim()).catch(() => {});
                    Delete db.adminInputSession[userId];
                    Return ctx.reply('✅ Message sent successfully!');
                }
                Delete db.adminInputSession[userId];
                Return ctx.reply('❌ Correct format: `USER_ID | MESSAGE`');
            }
            If (actionType === 'broadcast_msg') {
                For (let uId of Object.keys(db.users || {})) {
                    Await bot.telegram.sendMessage(uId, text).catch(() => {});
                }
                Delete db.adminInputSession[userId];
                SaveDatabase(db);
                Return ctx.reply('✅ Broadcast completed successfully!');
            }
        }

        If (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_deposit_amount' && !isMenuCommand(text)) {
            Const amountNum = Number(text);
            Const lang = getUserLang(userId);

            If (isNaN(amountNum) || amountNum < 100) {
                Const errBox = lang === 'bn'
                    ? "╔════════════════════════════╗\n⚠️ ১০০ টাকার নিচে অ্যামাউন্ট অ্যাড হবে না। সর্বনিম্ন ১০০ বা তার বেশি অ্যামাউন্ট অ্যাড ব্যালেন্স করতে হবে。\n╚════════════════════════════╝\n\n✍️ আপনার কাঙ্ক্ষিত অ্যামাউন্টটি আবার লিখে পাঠান:"
                    : "╔════════════════════════════╗\n⚠️ Amount below 100 BDT cannot be added. Minimum deposit is 100 BDT or more.\n╚════════════════════════════╝\n\n✍️ Please enter your amount again:";
                
                Const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

                Return ctx.reply(errBox, {
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback(cancelBtnText, 'deposit_portal_back')]
                    ])
                });
            }

            Db.sessions[userId].depositAmount = amountNum;
            Db.sessions[userId].step = 'awaiting_deposit_proof';
            SaveDatabase(db);

            Const method = db.sessions[userId].method;
            Const targetNum = method === 'bKash' ? (db.numbers?.bkash || '01XXXXXXXXX') : (db.numbers?.nagad || '01XXXXXXXXX');

            Let instructionBox = lang === 'bn'
                ? `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n     💖 ${method} সেন্ড মানি নিয়ম\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n📌 **অফিসিয়াল নম্বর:** \`${targetNum}\`\n*(নম্বরের উপর ট্যাপ করে কপি করে নিন)*\n\n💵 **টাকার পরিমাণ:** \`${amountNum} BDT\`\n\n📋 **${method} অ্যাপ থেকে পেমেন্ট করার নিয়ম:**\n1️⃣ ${method} অ্যাপে গিয়ে **Send Money** এ যান।\n2️⃣ উপরের অফিশিয়াল নম্বরটি দিন।\n3️⃣ অ্যামাউন্ট দিন: \`${amountNum} BDT\`\n4️⃣ পিন দিয়ে সেন্ড মানি কনফার্ম করুন।\n5️⃣ টাকা পাঠানোর পর আপনার **TrxID** অথবা পেমেন্টের **স্ক্রিনশট** এই চ্যাটে পাঠিয়ে দিন।\n\n✍️ দ্রুত TrxID অথবা স্ক্রিনশট চ্যাটে পাঠান:`
                : `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n     💖 ${method} Send Money Guide\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n📌 **Official Number:** \`${targetNum}\`\n*(Tap on the number to copy)*\n\n💵 **Amount to Send:** \`${amountNum} BDT\`\n\n📋 **Steps to Pay:**\n1️⃣ Open ${method} app and go to **Send Money**.\n2️⃣ Enter the official number above.\n3️⃣ Enter amount: \`${amountNum} BDT\`\n4️⃣ Confirm with your PIN.\n5️⃣ After sending, send your **TrxID** or payment **screenshot** in this chat.\n\n✍️ Send TrxID or screenshot here:`;

            Const backText = lang === 'bn' ? "🔙 পেছনের মেনু ↩️" : "🔙 Back ↩️";
            Return ctx.reply(instructionBox, {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(backText, method === 'bKash' ? 'dep_bkash' : 'dep_nagad')]])
            });
        }

        If (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_deposit_proof' && !isMenuCommand(text)) {
            Const method = db.sessions[userId].method;
            Const amount = db.sessions[userId].depositAmount || 100;
            Const uniqueDepId = userId + '_' + Date.now();
            Const proofText = text || (ctx.message.photo ? '[Photo Screenshot Attached]' : 'N/A');

            If (!db.depositRequests) db.depositRequests = {};
            Db.depositRequests[uniqueDepId] = { userId: userId, method: method, amount: amount, proof: proofText };
            SaveDatabase(db);

            Const adminDepBox = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   💰 NEW DEPOSIT REQUEST\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n🆔 **User ID:** \`${userId}\`\n💳 **Method:** \`${method}\`\n💵 **Amount:** \`${amount} BDT\`\n📝 **TrxID/Proof:** \`${proofText}\``;

            If (ctx.message.photo) {
                Await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, {
                    Caption: adminDepBox,
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback(`✅ Approve (+${amount} BDT)`, 'dep_app_' + uniqueDepId)],
                        [Markup.button.callback('❌ Cancel Request', 'dep_can_' + uniqueDepId)]
                    ])
                }).catch(() => {});
            } else {
                Await bot.telegram.sendMessage(ADMIN_ID, adminDepBox, {
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback(`✅ Approve (+${amount} BDT)`, 'dep_app_' + uniqueDepId)],
                        [Markup.button.callback('❌ Cancel Request', 'dep_can_' + uniqueDepId)]
                    ])
                }).catch(() => {});
            }

            Const lang = getUserLang(userId);
            Const pendingBoxMsg = lang === 'bn'
                ? `╭──────────────────────────────╮\n     ⏳ অ্যাড মানি রিকোয়েস্ট পেন্ডিং\n╰──────────────────────────────╯\n\n💳 মাধ্যম: \`${method}\`\n💵 পেন্ডিং অ্যামাউন্ট: \`${amount} BDT\`\n\n✨ আপনার প্রমাণ সফলভাবে জমা হয়েছে। অ্যাডমিন যাচাই করে ব্যালেন্স অ্যাড করে দেবেন!`
                : `╭──────────────────────────────╮\n     ⏳ DEPOSIT REQUEST PENDING\n╰──────────────────────────────╯\n\n💳 Method: \`${method}\`\n💵 Pending Amount: \`${amount} BDT\`\n\n✨ Your proof has been submitted successfully!`;

            Const userMsg = await ctx.reply(pendingBoxMsg, {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });

            Db.depositRequests[uniqueDepId].userMessageId = userMsg.message_id;
            Delete db.sessions[userId];
            SaveDatabase(db);
            Return;
        }

        If (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_uid_only' && !isMenuCommand(text)) {
            Const uidText = text;
            Const lang = getUserLang(userId);
            Delete db.sessions[userId];
            SaveDatabase(db);

            Const loadingMsg = await ctx.reply(`⏳ Checking UID...\n\`▰▰▰▱▱▱▱▱▱▱ 30%\``, { parse_mode: 'Markdown' });
            Await new Promise(r => setTimeout(r, 200));
            Try { await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, `⏳ Checking UID...\n\`▰▰▰▰▰▰▱▱▱▱ 70%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            Await new Promise(r => setTimeout(r, 200));
            Try { await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, `⏳ Checking UID...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            Await new Promise(r => setTimeout(r, 200));

            Const resInfo = await checkFreeFireUID(uidText);
            Const resultBox = lang === 'bn'
                ? `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   🎮 ফ্রি ফায়ার প্লেয়ার ইনফো\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n👤 নাম: \`${resInfo.nickname}\`\n🛡 ইউআইডি: \`${uidText}\`\n❤️ লাইক: \`${resInfo.likes}\`\n⭐ লেভেল: \`${resInfo.level}\``
                : `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   🎮 FREE FIRE PLAYER INFO\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n👤 Name: \`${resInfo.nickname}\`\n🛡 UID: \`${uidText}\`\n❤️ Likes: \`${resInfo.likes}\`\n⭐ Level: \`${resInfo.level}\``;

            Try {
                Await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, resultBox, {
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
                });
            } catch (e) {
                Await ctx.reply(resultBox, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
            }
            Return;
        }

        If (db.sessions && db.sessions[userId] && db.sessions[userId].step === 'awaiting_uid' && !isMenuCommand(text)) {
            Const idText = text;
            Db.sessions[userId].uid = idText;
            Db.sessions[userId].step = 'confirming';
            SaveDatabase(db);
            Const session = db.sessions[userId];

            Const isFFCategory = session.isFFLikes;
            Let nickname = 'N/A';
            Let level = '';

            If (isFFCategory) {
                Const loadingMsg = await ctx.reply(`⏳ Checking UID...\n\`▰▰▰▱▱▱▱▱▱▱ 30%\``, { parse_mode: 'Markdown' });
                Await new Promise(r => setTimeout(r, 200));
                Try { await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, `⏳ Checking UID...\n\`▰▰▰▰▰▰▱▱▱▱ 70%\``, { parse_mode: 'Markdown' }); } catch (e) {}
                Await new Promise(r => setTimeout(r, 200));
                Try { await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, `⏳ Checking UID...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
                Await new Promise(r => setTimeout(r, 200));

                Const resInfo = await checkFreeFireUID(idText);
                Nickname = resInfo.nickname;
                Level = resInfo.level;
                Session.nickname = nickname;
                Session.level = level;
                Session.initialLikes = resInfo.likes;
                SaveDatabase(db);

                Const daysInfo = session.totalDays > 1 ? `\n📅 **Duration:** \`${session.totalDays} Days Auto-Delivery\`` : '';
                Const reviewBox = `╭────────────────────────────╮\n      📦 ORDER CONFIRMATION\n╰────────────────────────────╯\n\n🛍️ **Package:** \`${session.product}\`${daysInfo}\n💵 **Price:** \`${session.price} BDT\`\n🌍 **Server:** \`${session.region}\`\n\n👤 **Game Name:** \`${nickname}\`\n🛡️ **UID:** \`${idText}\`\n❤️ **Current Likes:** \`${resInfo.likes}\`\n\n⚠️ Please verify your in-game name & UID before confirming.`;

                Try {
                    Await ctx.telegram.editMessageText(userId, loadingMsg.message_id, null, reviewBox, {
                        Parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'cancelBtn'), 'cancel_order_review')],
                            [Markup.button.callback(t(userId, 'backBtn'), 'region_' + session.region.toLowerCase())]
                        ])
                    });
                } catch (e) {
                    Await ctx.reply(reviewBox, {
                        Parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'cancelBtn'), 'cancel_order_review')],
                            [Markup.button.callback(t(userId, 'backBtn'), 'region_' + session.region.toLowerCase())]
                        ])
                    });
                }
            } else {
                Session.nickname = 'Guild ID Service';
                SaveDatabase(db);
                Const reviewBox = `╭────────────────────────────╮\n      📦 ORDER CONFIRMATION\n╰────────────────────────────╯\n\n🛍️ **Package:** \`${session.product}\`\n💵 **Price:** \`${session.price} BDT\`\n🌍 **Server:** \`${session.region}\`\n🛡️ **Guild ID:** \`${idText}\`\n\n⚠️ Please verify your Guild ID before confirming.`;

                Await ctx.reply(reviewBox, {
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback(t(userId, 'confirmOrderBtn'), 'confirm_order'), Markup.button.callback(t(userId, 'cancelBtn'), 'cancel_order_review')],
                        [Markup.button.callback(t(userId, 'backBtn'), 'region_' + session.region.toLowerCase())]
                    ])
                });
            }
            Return;
        }

        If (cleanText.includes('totalusers') || text.includes('📊')) {
            If (userId === ADMIN_ID.toString()) {
                Const allowedObj = db.allowedUsers || {};
                Const userKeys = Object.keys(allowedObj);
                Const activeSubsCount = Object.keys(db.subscriptions || {}).length;
                Let listText = `📊 **TOTAL AUTHORIZED USERS: ${userKeys.length}**\n🔄 **ACTIVE SUBSCRIPTIONS: ${activeSubsCount}**\n\n`;
                
                UserKeys.forEach((uId, idx) => {
                    Const uInfo = (db.users && db.users[uId]) ? db.users[uId] : { first_name: 'Approved User', username: 'N/A' };
                    Const bal = db.balances[uId] || 0;
                    ListText += `${idx + 1}. 👤 Name: \`${uInfo.first_name}\`\n   🔗 Username: \`${uInfo.username}\`\n   🆔 ID: \`${uId}\`\n   💰 Balance: \`${bal} BDT\`\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
                    If (listText.length > 3700) {
                        Ctx.reply(listText, { parse_mode: 'Markdown' });
                        ListText = '';
                    }
                });
                If (listText.length > 0) return ctx.reply(listText, { parse_mode: 'Markdown' });
                Return;
            }
        }
        If (cleanText.includes('addbot') || text.includes('➕')) {
            If (userId === ADMIN_ID.toString()) {
                Db.adminInputSession[userId] = { type: 'add_bot_user' };
                SaveDatabase(db);
                Return ctx.reply('➕ **অ্যাড বট মোড চালু হয়েছে**\n\n✍️ যে ইউজারের ইউজার আইডি (User ID) দিয়ে বট এক্সেস দিতে চান, শুধু সেই **ইউজার আইডিটি** লিখে পাঠান:', { parse_mode: 'Markdown' });
            }
        }
        If (cleanText.includes('removebot') || text.includes('❌')) {
            If (userId === ADMIN_ID.toString()) {
                Db.adminInputSession[userId] = { type: 'remove_bot_user' };
                SaveDatabase(db);
                Return ctx.reply('❌ **রিমুভ বট মোড চালু হয়েছে**\n\n✍️ যে ইউজারের ইউজার আইডি (User ID) বট থেকে রিমুভ করতে চান, শুধু সেই **ইউজার আইডিটি** লিখে পাঠান:', { parse_mode: 'Markdown' });
            }
        }
        If (cleanText.includes('add/minusbalance') || text.includes('💳')) {
            If (userId === ADMIN_ID.toString()) {
                Db.adminInputSession[userId] = { type: 'add_minus_balance' };
                SaveDatabase(db);
                Return ctx.reply('✍️ Format: `USER_ID AMOUNT` (Example: `5932254012 100`)', { parse_mode: 'Markdown' });
            }
        }
        If (cleanText.includes('setpaymentnumbers') || text.includes('📱')) {
            If (userId === ADMIN_ID.toString()) {
                Return ctx.reply('📱 **Payment Number Management**\n\n👇 Select which payment number to update:', {
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💖 Set bKash Number', 'admin_set_bkash')],
                        [Markup.button.callback('🧡 Set Nagad Number', 'admin_set_nagad')]
                    ])
                });
            }
        }
        If (cleanText.includes('sendmessage') || text.includes('📩')) {
            If (userId === ADMIN_ID.toString()) {
                Db.adminInputSession[userId] = { type: 'send_message' };
                SaveDatabase(db);
                Return ctx.reply('✍️ Format: `USER_ID | MESSAGE`', { parse_mode: 'Markdown' });
            }
        }
        If (cleanText.includes('allusersmsg') || text.includes('📢')) {
            If (userId === ADMIN_ID.toString()) {
                Db.adminInputSession[userId] = { type: 'broadcast_msg' };
                SaveDatabase(db);
                Return ctx.reply('📢 Enter broadcast message for all users:');
            }
        }
        If (text.includes('Auto API: ON') || text.includes('Auto API: OFF')) {
            If (userId === ADMIN_ID.toString()) {
                Db.settings.autoApiEnabled = !db.settings.autoApiEnabled;
                SaveDatabase(db);
                Const msg = db.settings.autoApiEnabled
                    ? "🟢 বটটি বর্তমানে অটোমেটিক মোডে আছে, এপিআই সফলভাবে অন হয়েছে।"
                    : "🔴 বটটি বর্তমানে ম্যানুয়াল মোডে আছে, এপিআই অফ হয়ে গেছে।";
                Return ctx.reply(msg, { ...getMainKeyboard(userId) });
            }
        }

        If (lowerText.includes('shop now') || lowerText.includes('শপ নাও') || lowerText.includes('shop') || lowerText.includes('শপ')) {
            Let inlineButtons = [];
            Let catIndex = 0;
            Const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
            Cats.forEach(c => {
                InlineButtons.push([Markup.button.callback(translateCategoryName(c, userId), 'custom_cat_' + catIndex)]);
                CatIndex++;
            });
            If (userId === ADMIN_ID.toString()) {
                InlineButtons.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
            }
            InlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
            Return ctx.reply(t(userId, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
        }

        If (cleanText.includes('calculator') || cleanText.includes('ক্যালকুলেটর') || text.includes('🧮')) {
            Db.calcStates[userId] = '0';
            SaveDatabase(db);
            Return ctx.reply("🧮 **Calculator**\n\nScreen: `0`", { parse_mode: 'Markdown', ...getCalcKeyboard() });
        }

        If (cleanText.includes('worldclock') || cleanText.includes('ওয়ার্ল্ডক্লক') || text.includes('🌍')) {
            Return ctx.reply("🌍 **World Clock & Date**\n\n👇 Select country:", {
                Parse_mode: 'Markdown',
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

        If (cleanText.includes('checkffuid') || cleanText.includes('ইউআইডিচেক') || cleanText.includes('ইউআইডি') || text.includes('🔍')) {
            Db.sessions[userId] = { step: 'awaiting_uid_only' };
            SaveDatabase(db);
            Return ctx.reply(t(userId, 'checkUidPrompt'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        If (cleanText.includes('addbalance') || cleanText.includes('ব্যালেন্সঅ্যাড') || cleanText.includes('ব্যালেন্স') || text.includes('💰')) {
            Const lang = getUserLang(userId);
            Const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

            Return ctx.reply(t(userId, 'depositPortal'), {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
                    [Markup.button.callback(cancelBtnText, 'back_start_inline')]
                ])
            });
        }

        If (cleanText.includes('myprofile') || cleanText.includes('আমারপ্রোফাইল') || cleanText.includes('প্রোফাইল') || text.includes('👤')) {
            Const lang = getUserLang(userId);
            Const langBtn = lang === 'en' ? '🌍 Change Language (EN)' : '🌍 Change Language (বাংলা)';
            
            Const userSubs = Object.values(db.subscriptions || {}).filter(s => s.userId === userId && s.remainingDays > 0);
            Let activeSubsText = '';
            If (userSubs.length > 0) {
                ActiveSubsText = `\n🔄 **Active Packages:** \`${userSubs.length} Running\``;
                UserSubs.forEach((s, idx) => {
                    ActiveSubsText += `\n   ${idx + 1}. UID \`${s.uid}\` — \`${s.remainingDays} Days Left\``;
                });
            }

            Const profileBox = `╔══════════════════════════════╗\n        👤 USER PROFILE\n╚══════════════════════════════╝\n\n🆔 **User ID:** \`${userId}\`\n👤 **Name:** \`${ctx.from.first_name}\`\n💰 **Balance:** \`৳${db.balances[userId] || 0}\`${activeSubsText}`;

            Return ctx.reply(profileBox, {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(langBtn, 'open_lang_menu')],
                    [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
                ])
            });
        }

        If (cleanText.includes('orderhistory') || cleanText.includes('অর্ডারহিস্ট্রি') || cleanText.includes('হিস্ট্রি') || text.includes('📜')) {
            Const userHistories = db.orderHistories && db.orderHistories[userId] ? db.orderHistories[userId].slice(0, 10) : [];
            Let historyText = t(userId, 'historyTitle');
            If (userHistories.length === 0) {
                HistoryText += t(userId, 'noHistory');
            } else {
                UserHistories.forEach((h, i) => {
                    Const statusText = h.status === 'Cancelled' ? '❌ Cancelled' : '✅ Complete';
                    HistoryText += `${i + 1}. 📦 **${translateProductName(h.product, userId)}** — 💵 \`${h.price} BDT\`\n` +
                                   `   💰 Cost: \`${h.price} BDT\`\n` +
                                   `   ───────────────────────\n` +
                                   `   👤 Name: \`${h.nickname || 'N/A'}\`\n` +
                                   `   🛡️ UID: \`${h.uid}\`\n` +
                                   `   ✦ ───────────────── ✦\n` +
                                   `   🕒 \`${h.time} | ${h.date}\`\n` +
                                   `   📊 Status: ${statusText}\n\n`;
                });
            }
            Return ctx.reply(historyText + t(userId, 'historyDisclaimer'), {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });
        }

        If (cleanText.includes('supportdesk') || cleanText.includes('সাপোর্টডেস্ক') || cleanText.includes('সাপোর্ট') || text.includes('📞')) {
            Return ctx.reply(t(userId, 'supportText'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }

        If (userId !== ADMIN_ID.toString() && !isMenuCommand(text)) {
            Const box = `📥 **New Customer Message**\n\n👤 Name: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n\n💬 Message:\n${text}`;
            Try {
                If (ctx.message.photo) {
                    Await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: box, parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]]) });
                } else {
                    Await bot.telegram.sendMessage(ADMIN_ID, box, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('💬 Reply 🚀', 'admin_reply_' + userId)]]) });
                }
            } catch (e) {}
            Return ctx.reply(t(userId, 'supportSentSuccess'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]]) });
        }
    } catch (err) {}
});

Bot.action('admin_create_cat', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const db = loadDatabase();
        Db.adminInputSession[ADMIN_ID] = { type: 'add_category' };
        SaveDatabase(db);
        Await ctx.editMessageText('✍️ Enter new category name:', {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'shop_now_back')]])
        });
    } catch (e) {}
});

Bot.action(/admin_add_prod_idx_(.+)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const catIdx = parseInt(ctx.match[1]);
        Const db = loadDatabase();
        Const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
        Const catName = cats[catIdx];
        If (!catName) return;

        Db.adminInputSession[ADMIN_ID] = { type: 'add_shop_product', category: catName };
        SaveDatabase(db);
        Await ctx.editMessageText(`✍️ Enter product name and price for **${catName}**:\nFormat: \`Product Name | Price BDT\`\n(Example: \`100 LIKE - 5৳ | 5\` or \`1100 LIKE - 50৳ [ 5 DAYS ] | 50\`)`, {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'custom_cat_' + catIdx)]])
        });
    } catch (e) {}
});

Bot.action(/admin_rem_cat_idx_(.+)/, async (ctx) => {
    Try {
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const catIdx = parseInt(ctx.match[1]);
        Const db = loadDatabase();
        Const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
        Const catName = cats[catIdx];
        If (catName) {
            Cats.splice(catIdx, 1);
            Db.categories = cats;
            If (db.customProducts[catName]) delete db.customProducts[catName];
            SaveDatabase(db);
        }
        Await ctx.answerCbQuery('✅ Category removed successfully!');
        
        Let inlineButtons = [];
        Let idxCounter = 0;
        Const updatedCats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
        UpdatedCats.forEach(c => {
            InlineButtons.push([Markup.button.callback(translateCategoryName(c, ADMIN_ID), 'custom_cat_' + idxCounter)]);
            IdxCounter++;
        });
        InlineButtons.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
        InlineButtons.push([Markup.button.callback(t(ADMIN_ID, 'mainMenuBack'), 'back_start_inline')]);
        Await ctx.editMessageText(t(ADMIN_ID, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

Bot.action(/admin_rem_prod_idx_(.+)_(.+)/, async (ctx) => {
    Try {
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const catIdx = parseInt(ctx.match[1]);
        Const prodIndex = parseInt(ctx.match[2]);
        Const db = loadDatabase();
        Const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
        Const catName = cats[catIdx];

        If (catName && db.customProducts[catName]) {
            Db.customProducts[catName].splice(prodIndex, 1);
            SaveDatabase(db);
        }
        Await ctx.answerCbQuery('✅ Product removed successfully!');
        
        Let inlineButtons = [];
        Const productsList = db.customProducts?.[catName] || [];
        
        ProductsList.forEach((p, idx) => {
            Let row = [Markup.button.callback(translateProductName(p.name, ADMIN_ID), `sub_prod_idx_${catIdx}_${idx}`)];
            If (ADMIN_ID === ADMIN_ID.toString()) {
                Row.push(Markup.button.callback('❌ Rem', `admin_rem_prod_idx_${catIdx}_${idx}`));
                Row.push(Markup.button.callback('✏️ Price', `admin_chg_price_idx_${catIdx}_${idx}`));
            }
            InlineButtons.push(row);
        });

        If (ADMIN_ID === ADMIN_ID.toString()) {
            InlineButtons.push([Markup.button.callback('➕ Add Product', 'admin_add_prod_idx_' + catIdx)]);
            InlineButtons.push([Markup.button.callback('❌ Remove Category', 'admin_rem_cat_idx_' + catIdx)]);
        }
        InlineButtons.push([Markup.button.callback(t(ADMIN_ID, 'backBtn'), 'shop_now_back'), Markup.button.callback(t(ADMIN_ID, 'mainMenuBack'), 'back_start_inline')]);
        
        Await ctx.editMessageText(`📂 **${translateCategoryName(catName, ADMIN_ID)}**`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

Bot.action(/admin_chg_price_idx_(.+)_(.+)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const catIdx = parseInt(ctx.match[1]);
        Const prodIndex = parseInt(ctx.match[2]);
        Const db = loadDatabase();
        Const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
        Const catName = cats[catIdx];

        Db.adminInputSession[ADMIN_ID] = { type: 'change_shop_price', category: catName, prodIndex: prodIndex };
        SaveDatabase(db);
        Await ctx.editMessageText(`✍️ Enter new price for this product (Only number):\n(Example: \`90\`)`, {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Cancel', 'custom_cat_' + catIdx)]])
        });
    } catch (e) {}
});

Bot.action('open_lang_menu', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Await ctx.editMessageText("🌐 **Select Your Language / ভাষা নির্বাচন করুন:**", {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 বাংলা', 'set_lang_bn'), Markup.button.callback('🇬🇧 English', 'set_lang_en')],
                [Markup.button.callback(t(userId, 'backBtn'), 'back_to_profile'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

Bot.action('back_to_profile', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        Const lang = getUserLang(userId);
        Const langBtn = lang === 'en' ? '🌍 Change Language (EN)' : '🌍 Change Language (বাংলা)';
        
        Const userSubs = Object.values(db.subscriptions || {}).filter(s => s.userId === userId && s.remainingDays > 0);
        Let activeSubsText = '';
        If (userSubs.length > 0) {
            ActiveSubsText = `\n🔄 **Active Packages:** \`${userSubs.length} Running\``;
            UserSubs.forEach((s, idx) => {
                ActiveSubsText += `\n   ${idx + 1}. UID \`${s.uid}\` — \`${s.remainingDays} Days Left\``;
            });
        }

        Const profileBox = `╔══════════════════════════════╗\n        👤 USER PROFILE\n╚══════════════════════════════╝\n\n🆔 **User ID:** \`${userId}\`\n👤 **Name:** \`${ctx.from.first_name}\`\n💰 **Balance:** \`৳${db.balances[userId] || 0}\`${activeSubsText}`;

        Await ctx.editMessageText(profileBox, {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(langBtn, 'open_lang_menu')],
                [Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

Bot.action(/set_lang_(bn|en)/, async (ctx) => {
    Try {
        Const userId = ctx.from.id.toString();
        Const lang = ctx.match[1];
        Const db = loadDatabase();
        If (!db.userLang) db.userLang = {};
        Db.userLang[userId] = lang;
        SaveDatabase(db);
        Await ctx.answerCbQuery(lang === 'bn' ? '🇧🇩 বাংলা ভাষা সেট করা হয়েছে!' : '🇬🇧 English language selected!');
        Try { await ctx.deleteMessage(); } catch (e) {}
        Return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

Bot.action('admin_set_bkash', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const db = loadDatabase();
        Db.adminInputSession[ADMIN_ID] = { type: 'set_bkash_number' };
        SaveDatabase(db);
        Await ctx.editMessageText('✍️ Send new bKash personal or merchant number:', { parse_mode: 'Markdown' });
    } catch (e) {}
});

Bot.action('admin_set_nagad', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const db = loadDatabase();
        Db.adminInputSession[ADMIN_ID] = { type: 'set_nagad_number' };
        SaveDatabase(db);
        Await ctx.editMessageText('✍️ Send new Nagad personal or merchant number:', { parse_mode: 'Markdown' });
    } catch (e) {}
});

Bot.action('deposit_portal_back', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        If (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        Const lang = getUserLang(userId);
        Const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

        Await ctx.editMessageText(t(userId, 'depositPortal'), {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💖 বিকাশ [bKash]', 'dep_bkash'), Markup.button.callback('🧡 নগদ [Nagad]', 'dep_nagad')],
                [Markup.button.callback(cancelBtnText, 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

Bot.action('dep_bkash', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        Db.sessions[userId] = { step: 'awaiting_deposit_amount', method: 'bKash' };
        SaveDatabase(db);

        Const lang = getUserLang(userId);
        Const amountPromptBox = lang === 'bn' 
            ? `╭──────────────────────────────╮\n     💖 বিকাশ (bKash) ডিপোজিট\n╰──────────────────────────────╯\n\n💎 **নোটিশ:** সর্বনিম্ন ডিপোজিট বা অ্যাড ব্যালেন্স করতে হলে **১০০ টাকা বা তার বেশি** করতে হবে।\n\n✍️ আপনার কাঙ্ক্ষিত অ্যামাউন্টটি লিখে পাঠান:`
            : `╭──────────────────────────────╮\n     💖 bKash Deposit\n╰──────────────────────────────╯\n\n💎 **Notice:** Minimum deposit is **100 BDT or more**.\n\n✍️ Please enter your amount to add:`;

        Const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

        Await ctx.editMessageText(amountPromptBox, {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(cancelBtnText, 'deposit_portal_back')]
            ])
        });
    } catch (e) {}
});

Bot.action('dep_nagad', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        Db.sessions[userId] = { step: 'awaiting_deposit_amount', method: 'Nagad' };
        SaveDatabase(db);

        Const lang = getUserLang(userId);
        Const amountPromptBox = lang === 'bn' 
            ? `╭──────────────────────────────╮\n     🧡 নগদ (Nagad) ডিপোজিট\n╰──────────────────────────────╯\n\n💎 **নোটিশ:** সর্বনিম্ন ডিপোজিট বা অ্যাড ব্যালেন্স করতে হলে **১০০ টাকা বা তার বেশি** করতে হবে।\n\n✍️ আপনার কাঙ্ক্ষিত অ্যামাউন্টটি লিখে পাঠান:`
            : `╭──────────────────────────────╮\n     🧡 Nagad Deposit\n╰──────────────────────────────╯\n\n💎 **Notice:** Minimum deposit is **100 BDT or more**.\n\n✍️ Please enter your amount to add:`;

        Const cancelBtnText = lang === 'bn' ? "❌ বাতিল করুন" : "❌ Cancel";

        Await ctx.editMessageText(amountPromptBox, {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(cancelBtnText, 'deposit_portal_back')]
            ])
        });
    } catch (e) {}
});

Bot.action(/dep_app_(.+)/, async (ctx) => {
    Try {
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const db = loadDatabase(), info = db.depositRequests?.[ctx.match[1]];
        If (info) {
            Const addAmt = Number(info.amount) || 100;
            Const targetUser = info.userId;
            Const prevBal = db.balances[targetUser] || 0;
            Db.balances[targetUser] = prevBal + addAmt;
            Const currBal = db.balances[targetUser];
            SaveDatabase(db);

            Const lang = getUserLang(targetUser);
            Const depositReceipt = lang === 'bn'
                ? `💠 ════════════════════════════ 💠\n           ✅ ডিপোজিট সফলভাবে সম্পন্ন\n💠 ════════════════════════════ 💠\n\n💳 পেমেন্ট মাধ্যম: \`${info.method}\`\n💵 অ্যাডকৃত অ্যামাউন্ট: \`+${addAmt} BDT\`\n\n💰 **আগের ব্যালেন্স:** \`${prevBal} BDT\`\n💰 **বর্তমান ব্যালেন্স:** \`${currBal} BDT\`\n\n📊 স্ট্যাটাস: \`অ্যাডমিন কর্তৃক এপ্রুভড\`\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`
                : `💠 ════════════════════════════ 💠\n           ✅ DEPOSIT SUCCESSFULLY COMPLETED\n💠 ════════════════════════════ 💠\n\n💳 Method: \`${info.method}\`\n💵 Added Amount: \`+${addAmt} BDT\`\n\n💰 **Previous Balance:** \`${prevBal} BDT\`\n💰 **Current Balance:** \`${currBal} BDT\`\n\n📊 Status: \`Approved by Admin\`\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

            If (info.userMessageId) {
                Await bot.telegram.editMessageText(targetUser, info.userMessageId, null, depositReceipt, {
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUser, 'mainMenuBack'), 'back_start_inline')]])
                }).catch(() => {
                    Bot.telegram.sendMessage(targetUser, depositReceipt, {
                        Parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUser, 'mainMenuBack'), 'back_start_inline')]])
                    }).catch(() => {});
                });
            } else {
                Await bot.telegram.sendMessage(targetUser, depositReceipt, {
                    Parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback(t(targetUser, 'mainMenuBack'), 'back_start_inline')]])
                }).catch(() => {});
            }

            Delete db.depositRequests[ctx.match[1]];
            SaveDatabase(db);
            Await ctx.answerCbQuery('✅ Deposit approved & balance updated!');
            Try { await ctx.editMessageCaption(`✅ **[DEPOSIT APPROVED: +${addAmt} BDT]**`); } catch (e) {
                Try { await ctx.editMessageText(`✅ **[DEPOSIT APPROVED: +${addAmt} BDT]**`); } catch (err) {}
            }
        }
    } catch (e) {}
});

Bot.action(/dep_can_(.+)/, async (ctx) => {
    Try {
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const db = loadDatabase(), info = db.depositRequests?.[ctx.match[1]];
        If (info) {
            Await bot.telegram.sendMessage(info.userId, "❌ আপনার ডিপোজিট রিকোয়েস্টটি বাতিল করা হয়েছে।", { parse_mode: 'Markdown' }).catch(() => {});
            Delete db.depositRequests[ctx.match[1]];
            SaveDatabase(db);
            Await ctx.answerCbQuery('❌ Cancelled.');
            Try { await ctx.editMessageCaption('❌ **[DEPOSIT REJECTED]**'); } catch (e) {
                Try { await ctx.editMessageText('❌ **[DEPOSIT REJECTED]**'); } catch (err) {}
            }
        }
    } catch (e) {}
});

Bot.action(/admin_reply_(.+)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const db = loadDatabase();
        Db.adminReplySessions[ADMIN_ID] = ctx.match[1];
        SaveDatabase(db);
        Await ctx.reply('✍️ Type reply message for customer:');
    } catch (e) {}
});

Bot.action(/admin_input_(.+)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const uniqueOrderId = ctx.match[1];
        Const db = loadDatabase();
        Const orderInfo = db.adminSessions[uniqueOrderId];
        
        If (orderInfo) {
            If (orderInfo.isFFLikeCategory) {
                OrderInfo.step = 'awaiting_prev_likes';
                Db.adminInputSession[ADMIN_ID] = { uniqueOrderId: uniqueOrderId };
                SaveDatabase(db);
                Await ctx.reply('✍️ অর্ডার কমপ্লিট করার জন্য স্টেপ বাই স্টেপ লাইক সংখ্যা দিন:\n\nপ্রথমে **প্রিভিয়াস লাইক (Previous Likes)** কত সেটা লিখে পাঠান:', { parse_mode: 'Markdown' });
            } else {
                Db.adminInputSession[ADMIN_ID] = { uniqueOrderId: uniqueOrderId };
                SaveDatabase(db);
                Await ctx.reply('✍️ Enter completion note/details for customer:\n(Example: `Guild bot successfully activated!`)', { parse_mode: 'Markdown' });
            }
        }
    } catch (e) {}
});

Bot.action(/admin_can_(.+)/, async (ctx) => {
    Try {
        If (ctx.from.id.toString() !== ADMIN_ID.toString()) return;
        Const db = loadDatabase(), info = db.adminSessions?.[ctx.match[1]];
        If (info) {
            Db.balances[info.targetUserId] = (db.balances[info.targetUserId] || 0) + Number(info.price);

            If (!db.orderHistories[info.targetUserId]) db.orderHistories[info.targetUserId] = [];
            Const now = new Date();
            Db.orderHistories[info.targetUserId].unshift({
                Timestamp: now.getTime(),
                Date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                Time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                Product: info.product, uid: info.uid, nickname: info.nickname || 'Unknown', region: info.region, price: info.price, status: 'Cancelled'
            });
            If (db.orderHistories[info.targetUserId].length > 10) db.orderHistories[info.targetUserId].pop();

            SaveDatabase(db);
            Await bot.telegram.editMessageText(info.targetUserId, info.loadingMessageId, null, "❌ **Order Cancelled & Refunded**", {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(info.targetUserId, 'mainMenuBack'), 'back_start_inline')]])
            }).catch(() => {});
            Delete db.adminSessions[ctx.match[1]];
            SaveDatabase(db);
            Await ctx.answerCbQuery('✅ Cancelled & Refunded!');
            Try { await ctx.editMessageText('❌ **[CANCELLED & REFUNDED]**'); } catch (e) {}
        }
    } catch (e) {}
});

Bot.action(/calc_(.+)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Const val = ctx.match[1].trim();
        
        If (!cachedDb.calcStates) cachedDb.calcStates = {};
        Let current = cachedDb.calcStates[userId] || '0';

        If (val === 'C') {
            Current = '0';
        } else if (val === 'DEL') {
            Current = current.length > 1 ? current.slice(0, -1) : '0';
        } else if (val === 'EQ') {
            Try { 
                Const sanitized = current.replace(/[^0-9+\-*/().]/g, '');
                Current = sanitized ? String(Function('"use strict";return (' + sanitized + ')')()) : '0';
            } catch (e) { 
                Current = 'Error'; 
            }
        } else {
            If (current === '0' || current === 'Error') {
                Current = (val === '.') ? '0.' : val;
            } else {
                Current += val;
            }
        }

        CachedDb.calcStates[userId] = current;

        Await ctx.editMessageText(`🧮 **Calculator**\n\nScreen: \`${current}\``, { 
            Parse_mode: 'Markdown', 
            ...getCalcKeyboard() 
        });
    } catch (e) {}
});

Bot.action(/clock_(bd|np|in|pk|sa|ae|my|sg|us|gb|ca|au)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Const tzMap = { 
            Bd: 'Asia/Dhaka', 
            Np: 'Asia/Kathmandu', 
            In: 'Asia/Kolkata', 
            Pk: 'Asia/Karachi', 
            Sa: 'Asia/Riyadh', 
            Ae: 'Asia/Dubai', 
            My: 'Asia/Kuala_Lumpur', 
            Sg: 'Asia/Singapore', 
            Us: 'America/New_York', 
            Gb: 'Europe/London', 
            Ca: 'America/Toronto', 
            Au: 'Australia/Sydney' 
        };
        Const now = new Date();
        Const selectedKey = ctx.match[1];
        Const timeStr = now.toLocaleTimeString('en-US', { timeZone: tzMap[selectedKey] });
        Const dateStr = now.toLocaleDateString('en-GB', { timeZone: tzMap[selectedKey], weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

        Await ctx.editMessageText(`🌍 **World Clock & Date**\n\n📅 Date: \`${dateStr}\`\n🕒 Time: \`${timeStr}\``, {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'backBtn'), 'back_to_clock'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
        });
    } catch (e) {}
});

Bot.action('back_to_clock', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Await ctx.editMessageText("🌍 **World Clock & Date**\n\n👇 Select country:", {
            Parse_mode: 'Markdown',
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

Bot.action('shop_now_back', async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        Let inlineButtons = [];
        
        Let catIndex = 0;
        Const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
        Cats.forEach(c => {
            InlineButtons.push([Markup.button.callback(translateCategoryName(c, userId), 'custom_cat_' + catIndex)]);
            CatIndex++;
        });
        If (userId === ADMIN_ID.toString()) {
            InlineButtons.push([Markup.button.callback('➕ Create New Category', 'admin_create_cat')]);
        }
        InlineButtons.push([Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
        Await ctx.editMessageText(t(userId, 'shopMenuTitle'), { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

Bot.action(/custom_cat_(.+)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const catIdx = parseInt(ctx.match[1]);
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        Const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
        Const catName = cats[catIdx];
        If (!catName) return;

        Let inlineButtons = [];
        (db.customProducts?.[catName] || []).forEach((p, idx) => {
            Let row = [Markup.button.callback(translateProductName(p.name, userId), `sub_prod_idx_${catIdx}_${idx}`)];
            If (userId === ADMIN_ID.toString()) {
                Row.push(Markup.button.callback('❌ Rem', `admin_rem_prod_idx_${catIdx}_${idx}`));
                Row.push(Markup.button.callback('✏️ Price', `admin_chg_price_idx_${catIdx}_${idx}`));
            }
            InlineButtons.push(row);
        });
        If (userId === ADMIN_ID.toString()) {
            InlineButtons.push([Markup.button.callback('➕ Add Product', 'admin_add_prod_idx_' + catIdx)]);
            InlineButtons.push([Markup.button.callback('❌ Remove Category', 'admin_rem_cat_idx_' + catIdx)]);
        }
        InlineButtons.push([Markup.button.callback(t(userId, 'backBtn'), 'shop_now_back'), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]);
        Await ctx.editMessageText(`📂 **${translateCategoryName(catName, userId)}**`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineButtons) });
    } catch (e) {}
});

Bot.action(/sub_prod_idx_(.+)_(.+)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const catIdx = parseInt(ctx.match[1]);
        Const index = parseInt(ctx.match[2]);
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        Const cats = Array.isArray(db.categories) ? db.categories : Object.keys(db.categories || {});
        Const catName = cats[catIdx];
        Const prod = db.customProducts[catName]?.[index] || { name: 'Package' };
        Const translated = translateProductName(prod.name, userId);

        Let price = 0;
        Const takaMatch = prod.name.match(/(\d+)\s*[৳tk]/i);
        Const dashMatch = prod.name.match(/-\s*(\d+)/);
        Const currMatch = prod.name.match(/(\d+)\s*(tk|BDT)/i);

        If (takaMatch) {
            Price = Number(takaMatch[1]);
        } else if (dashMatch) {
            Const allMatches = [...prod.name.matchAll(/-\s*(\d+)/g)];
            If (allMatches.length > 0) {
                Price = Number(allMatches[allMatches.length - 1][1]);
            } else {
                Price = Number(dashMatch[1]);
            }
        } else if (currMatch) {
            Price = Number(currMatch[1]);
        } else {
            Const allNums = prod.name.match(/\d+/g);
            Price = allNums ? Number(allNums[allNums.length - 1]) : 0;
        }

        Const lowerCatName = catName.toLowerCase();
        Const isFFLikes = lowerCatName.includes('like') || lowerCatName.includes('লাইক') || catName.includes('🔥');
        Const totalDays = extractPackageDays(prod.name);

        Db.sessions[userId] = { product: translated, price, activeCategory: catName, prodIndex: index, catIdx: catIdx, isFFLikes, totalDays };
        SaveDatabase(db);

        Const prevCatCallback = 'custom_cat_' + catIdx;
        Await ctx.editMessageText(t(userId, 'serverTitle') + `\`${translated}\`\n💵 Price: \`${price} BDT\`\n\n👇 Select Server:`, {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇧🇩 BD', 'region_bd'), Markup.button.callback('🇮🇩 ID', 'region_id')],
                [Markup.button.callback(t(userId, 'backBtn'), prevCatCallback), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

Bot.action(/region_(bd|id)/, async (ctx) => {
    Try {
        Await ctx.answerCbQuery().catch(() => {});
        Const userId = ctx.from.id.toString(), region = ctx.match[1].toUpperCase();
        Const db = loadDatabase();
        Const session = db.sessions?.[userId];
        If (session) {
            Session.region = region;
            Session.step = 'awaiting_uid';
            SaveDatabase(db);
        }
        Let prevProdCallback = 'shop_now_back';
        If (session && session.catIdx !== undefined) {
            PrevProdCallback = 'custom_cat_' + session.catIdx;
        }

        Const isFFCategory = session && session.isFFLikes;
        Const promptText = isFFCategory 
            ? `🎮 **Enter UID (${region})**\n\n✍️ Please type and send your UID:`
            : `🛡️ **Enter Guild ID (${region})**\n\n✍️ Please type and send your Guild ID:`;

        Await ctx.editMessageText(promptText, {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback(t(userId, 'backBtn'), prevProdCallback), Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]
            ])
        });
    } catch (e) {}
});

Bot.action('cancel_order_review', async (ctx) => {
    Try {
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        If (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        Await ctx.answerCbQuery('❌ Order cancelled.');
        Await ctx.editMessageText("❌ **Order Cancelled**\n\nYou have cancelled this order. No balance was deducted.", {
            Parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
        });
    } catch (e) {}
});

Bot.action('confirm_order', async (ctx) => {
    Try {
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        Const session = db.sessions?.[userId];
        If (!session) return ctx.answerCbQuery('Session expired.', { show_alert: true });
        If ((db.balances[userId] || 0) < session.price) return ctx.answerCbQuery('❌ Insufficient balance!', { show_alert: true });

        Db.balances[userId] -= Number(session.price);
        SaveDatabase(db);

        Const procMsgId = ctx.callbackQuery.message.message_id;
        Try {
            Await ctx.editMessageText(`⏳ Processing Order...\n\`▰▰▰▱▱▱▱▱▱▱ 30%\``, { parse_mode: 'Markdown' });
        } catch (e) {}

        Await new Promise(r => setTimeout(r, 200));
        Try { await ctx.telegram.editMessageText(userId, procMsgId, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▱▱▱▱ 70%\``, { parse_mode: 'Markdown' }); } catch (e) {}
        Await new Promise(r => setTimeout(r, 200));

        Const isFFLikeCategory = session.isFFLikes;
        Const lowerProd = session.product.toLowerCase();
        
        Const isManualPackage = lowerProd.includes('100');
        Const isAutoEnabled = db.settings && db.settings.autoApiEnabled && isFFLikeCategory && !isManualPackage;
        Const totalDays = session.totalDays || 1;
        
        Let apiRes = { success: false };
        If (isAutoEnabled) {
            Const prodCode = getApiProductCode(session.product);
            Const apiParams = prodCode 
                ? { action: 'auto', product: prodCode, uid: session.uid, server: session.region } 
                : { action: 'like', uid: session.uid, server: session.region };

            ApiRes = await callLikesFFApiWithTimeout(apiParams, 30000);
        }

        If (isAutoEnabled && apiRes.success) {
            Try { await ctx.telegram.editMessageText(userId, procMsgId, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            
            Await new Promise(r => setTimeout(r, 3000));

            Const postCheck = await checkFreeFireUID(session.uid);
            Const prevLikes = session.initialLikes || 0;
            Const currLikes = postCheck.likes || prevLikes;
            Const addedLikes = currLikes >= prevLikes ? (currLikes - prevLikes) : 0;

            Let subStatusText = '';
            If (totalDays > 1) {
                Const remainingDays = totalDays - 1;
                Const subId = `SUB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
                Db.subscriptions[subId] = {
                    UserId: userId,
                    Uid: session.uid,
                    Nickname: session.nickname || 'Unknown',
                    Region: session.region,
                    Product: session.product,
                    TotalDays: totalDays,
                    DeliveredDays: 1,
                    RemainingDays: remainingDays,
                    LastDeliveredDate: getTodayDateBD()
                };
                SubStatusText = `\n📅 **Subscription:** \`Day 1 of ${totalDays} (${remainingDays} Days Auto-Remaining)\`\n🆔 **Sub Tracking ID:** \`${subId}\``;
            }

            If (!db.orderHistories[userId]) db.orderHistories[userId] = [];
            Const now = new Date();
            Db.orderHistories[userId].unshift({
                Timestamp: now.getTime(),
                Date: now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
                Time: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }),
                Product: totalDays > 1 ? `${session.product} (Day 1/${totalDays})` : session.product,
                Uid: session.uid, nickname: session.nickname || 'Unknown', region: session.region, price: session.price, status: 'Complete'
            });
            If (db.orderHistories[userId].length > 10) db.orderHistories[userId].pop();
            SaveDatabase(db);

            Const userLangChoice = getUserLang(userId);
            Const warningText = userLangChoice === 'bn' 
                ? "⚠️ **সতর্কতা: ২৪ ঘণ্টার মধ্যে একই ইউআইডিতে পুনরায় লাইক নিলে লাইক না-ও যোগ হতে পারে!**"
                : "⚠️ **Warning: Taking likes again on this UID within 24 hours may result in likes not being added!**";

            Const autoReceipt = `💠 ════════════════════════════ 💠\n           ✅ ORDER SUCCESSFULLY COMPLETED\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${session.product}\`\n🆔 Order ID: \`AUTO-${Math.floor(10000 + Math.random() * 90000)}\`${subStatusText}\n\n👤 Name: \`${session.nickname || 'Unknown'}\`\n🛡️ UID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n\n👍 **Previous Likes:** \`${prevLikes}\`\n👍 **Current Likes:** \`${currLikes}\`\n📈 **Added Likes:** \`+${addedLikes} Likes\`\n\n📊 Status: \`Completed Successfully\`\n📝 Note/Details: \`Delivered automatically via API\`\n\n💰 Price: \`${session.price} BDT\`\n💳 Remaining Balance: \`${db.balances[userId]} BDT\`\n\n${warningText}\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

            Await ctx.telegram.editMessageText(userId, procMsgId, null, autoReceipt, {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });

            Await bot.telegram.sendMessage(ADMIN_ID, "📋 **[Duplicate Copy - Auto Order]**\n\n" + autoReceipt + "\n\n👤 **Customer ID:** `" + userId + "`", { parse_mode: 'Markdown' }).catch(() => {});

        } else if (isFFLikeCategory) {
            Try { await ctx.telegram.editMessageText(userId, procMsgId, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▰▰▰▱ 95% (Pending Admin Review)\``, { parse_mode: 'Markdown' }); } catch (e) {}

            Const uniqueOrderId = userId + '_' + Date.now();
            Db.adminSessions[uniqueOrderId] = {
                TargetUserId: userId,
                LoadingMessageId: procMsgId,
                Product: session.product,
                Uid: session.uid,
                Nickname: session.nickname || 'Unknown',
                Region: session.region,
                Price: session.price,
                TotalDays: totalDays,
                IsFFLikeCategory: true,
                Step: 'awaiting_prev_likes'
            };
            SaveDatabase(db);

            Const adminNoticeText = isManualPackage 
                ? `🛠️ **New Manual Package Order (Pending)**\n\n📦 Package: \`${session.product}\`\n👤 Name: \`${session.nickname || 'Unknown'}\`\n🆔 UID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n💵 Price: \`${session.price} BDT\`\n👤 Customer ID: \`${userId}\``
                : `⚠️ API Failed / Fallback Order (Manual Needed)\n\n📦 Package: \`${session.product}\` (${totalDays} Days)\n👤 Name: \`${session.nickname || 'Unknown'}\`\n🆔 UID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n💵 Price: \`${session.price} BDT\`\n👤 Customer ID: \`${userId}\``;

            Await bot.telegram.sendMessage(ADMIN_ID, adminNoticeText, {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Enter Details', 'admin_input_' + uniqueOrderId)],
                    [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
                ])
            });

        } else {
            Try { await ctx.telegram.editMessageText(userId, procMsgId, null, `⏳ Processing Order...\n\`▰▰▰▰▰▰▰▰▰▰ 100%\``, { parse_mode: 'Markdown' }); } catch (e) {}
            Await new Promise(r => setTimeout(r, 200));

            Const uniqueOrderId = userId + '_' + Date.now();
            
            Const pendingReceipt = `💠 ════════════════════════════ 💠\n           ⏳ ORDER PENDING REVIEW\n💠 ════════════════════════════ 💠\n\n📦 Package: \`${session.product}\`\n🆔 Order ID: \`SRV-${Math.floor(10000 + Math.random() * 90000)}\`\n\n🛡️ Target Guild ID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n\n📊 Status: \`Pending Admin Approval\`\n💰 Price: \`${session.price} BDT\`\n💳 Remaining Balance: \`${db.balances[userId]} BDT\`\n\n✨ আপনার অর্ডারটি সফলভাবে সাবমিট হয়েছে এবং টাকা কেটে নেওয়া হয়েছে। অ্যাডমিন চেক করে শীঘ্রই এটি কমপ্লিট করে দেবেন!\n\n💠 ════════════════════════════ 💠\nStay with SIR TOPUP 💙`;

            Await ctx.editMessageText(userId, procMsgId, null, pendingReceipt, {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback(t(userId, 'mainMenuBack'), 'back_start_inline')]])
            });

            Db.adminSessions[uniqueOrderId] = {
                TargetUserId: userId,
                LoadingMessageId: procMsgId,
                Product: session.product,
                Uid: session.uid,
                Nickname: session.nickname || 'Guild ID Service',
                Region: session.region,
                Price: session.price,
                IsFFLikeCategory: false
            };
            SaveDatabase(db);

            Await bot.telegram.sendMessage(ADMIN_ID, `🛠️ **New Guild/Service Order (Pending)**\n\n📦 Package: \`${session.product}\`\n🛡️ Target Guild ID: \`${session.uid}\`\n🌍 Server: \`${session.region}\`\n💵 Price: \`${session.price} BDT\`\n👤 Customer ID: \`${userId}\``, {
                Parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Complete Order', 'admin_input_' + uniqueOrderId)],
                    [Markup.button.callback('❌ Cancel & Refund', 'admin_can_' + uniqueOrderId)]
                ])
            });
        }

        Delete db.sessions[userId];
        SaveDatabase(db);
    } catch (e) {}
});

Bot.action('back_start_inline', async (ctx) => {
    Try {
        Const userId = ctx.from.id.toString();
        Const db = loadDatabase();
        If (db.sessions?.[userId]) { delete db.sessions[userId]; saveDatabase(db); }
        Await ctx.answerCbQuery();
        Try { await ctx.deleteMessage(); } catch (e) {}
        Return ctx.reply(t(userId, 'welcome'), { parse_mode: 'Markdown', ...getMainKeyboard(userId) });
    } catch (e) {}
});

// --- ওয়েব হুক এবং ক্রন জব পিং হ্যান্ডলার (১% ক্র্যাশ-প্রুফ ও ফিক্সড) ---
Const webhookPath = `/secret-path-${BOT_TOKEN.split(':')[0]}`;

Bot.telegram.setWebhook(`${RENDER_URL}${webhookPath}`, { drop_pending_updates: true })
    .then(() => console.log("Webhook set successfully!"))
    .catch((err) => console.log("Webhook set warning:", err.message));

Http.createServer((req, res) => {
    Try {
        If (req.url === webhookPath && req.method === 'POST') {
            Return bot.webhookCallback(webhookPath)(req, res, (err) => {
                If (err) {
                    Console.error("Webhook Handling Error:", err.message);
                }
            });
        } else if (req.url === '/ping') {
            Res.writeHead(200, { 'Content-Type': 'text/plain' });
            Return res.end('OK');
        } else {
            Res.writeHead(200, { 'Content-Type': 'text/plain' });
            Return res.end('ST Like Bot is running live via Webhook! 🚀');
        }
    } catch (e) {
        Console.error("Server Request Error:", e);
        Res.writeHead(500, { 'Content-Type': 'text/plain' });
        Res.end('Internal Server Error');
    }
}).listen(PORT, () => {
    Console.log(`Webhook HTTP Server listening on port ${PORT}`);
});
