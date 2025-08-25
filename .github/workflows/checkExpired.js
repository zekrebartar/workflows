require('dotenv').config();
const { MongoClient } = require('mongodb');
const TelegramBot = require('node-telegram-bot-api');

const MONGO_URI = process.env.MONGO_URI;
const CHANNEL_ID = Number(process.env.CHANNEL_ID);
const BOT_TOKEN = process.env.BOT_TOKEN;

const client = new MongoClient(MONGO_URI);
const bot = new TelegramBot(BOT_TOKEN);

async function kickUserFromChannel(userId) {
  try {
    await bot.banChatMember(CHANNEL_ID, userId);
    await bot.unbanChatMember(CHANNEL_ID, userId, { only_if_banned: true });
    return true;
  } catch (e) {
    console.error('Kick failed:', e.message);
    return false;
  }
}

async function checkExpiredUsers() {
  try {
    await client.connect();
    const db = client.db('arsolx');
    const users = db.collection('users');
    const now = new Date();

    const expiredUsers = await users.find({ status: 'active', expire_date: { $lte: now } }).toArray();

    for (const u of expiredUsers) {
      const kicked = await kickUserFromChannel(u.telegram_id);
      await users.updateOne(
        { telegram_id: u.telegram_id },
        { $set: { status: 'expired' } }
      );
      console.log(`User ${u.telegram_id} expired. Kicked: ${kicked}`);
    }

    console.log('✅ Expired check done.');
  } catch (err) {
    console.error('Error checking expired users:', err);
  } finally {
    await client.close();
  }
}

checkExpiredUsers();
