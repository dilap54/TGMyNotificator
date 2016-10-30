const TelegramBot = require('node-telegram-bot-api');

var bot = new TelegramBot('155739550:AAED8gz0cQX6-To3hM5h3SX65lOvYJp6vk0', {polling: true});

bot.on('message', function(msg){
	console.log(msg);
});