const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.json');

var bot = new TelegramBot(config.TGtoken, {polling: true});

bot.on('message', function(msg){
	console.log(msg);
});