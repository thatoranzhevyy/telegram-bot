const {Telegraf} = require('telegraf');
const telegram = new Telegraf(process.env.TELEGRAM_TOKEN, {});

exports.telegram = telegram;
