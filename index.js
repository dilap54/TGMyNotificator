const http = require('http');
const url = require('url');
const crypto = require('crypto');
const express = require('express');
const winston = require('winston');
const TelegramBot = require('node-telegram-bot-api');
const lowdb = require('lowdb');
const fileAsync = require('lowdb/lib/file-async')
const config = require('./config.json');

const logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            colorize: true,
            timestamp: true,
            level: config.logLevel,
            prettyPrint: true
        })
    ]
});

const db = lowdb('TGM.json',{
	//storage: fileAsync
});
db.defaults({
	'notificators': []
}).value();
db.set('lastStart', Date.now()).value();


const bot = new TelegramBot(config.TGtoken, {polling: true});

bot.on('message', function(msg){
	
	function sendInstructions(){
		logger.debug('wrong message', msg.text);
		bot.sendMessage(msg.chat.id, '/new <название>{0,32} - добавить оповещение\n/all - показать созданные оповещения\n/delete <token> - удалить оповещение');
	}

	if (msg.entities === undefined || msg.entities[0].type !== 'bot_command'){
		sendInstructions();
		return;
	}
	
	var command = msg.text.substr(msg.entities[0].offset, msg.entities[0].length);
	if (command === '/new'){
		var name = msg.text.substr(msg.entities[0].length).trim();
		logger.debug('TM /new', (msg.chat.username || msg.chat.id), name);
		if (name.length>2 && name.length<32){
			var newToken = crypto.randomBytes(8).toString('hex');
			db.get('notificators').push({
				user: msg.chat.id,
				name: name,
				token: newToken
			}).value();
			logger.info('TM /new succesful', (msg.chat.username || msg.chat.id), name);
			bot.sendMessage(msg.chat.id, 'Оповещение добавлено.\nuser: '+msg.chat.id+'\nname: '+name+'\ntoken: '+newToken);
		}
		else{
			logger.debug('TM /new fail', (msg.chat.username || msg.chat.id), msg.text);
			bot.sendMessage(msg.chat.id, 'Введите /new <Имя>');
		}
	}
	else if (command === '/all'){
		logger.debug('TM /all', (msg.chat.username || msg.chat.id));
		var notificators = db.get('notificators').filter({user: msg.chat.id}).value();
		bot.sendMessage(msg.chat.id, 'Список оповещений:\n'+JSON.stringify(notificators, null, 2));
	}
	else if (command === '/delete'){
		arg = msg.text.substr(msg.entities[0].length).trim();
		logger.debug('TM /delete', (msg.chat.username || msg.chat.id), arg);
		if (arg.length >2 && arg.length<32){
			var deleted = db.get('notificators').remove({user: msg.chat.id, token: arg}).value();
			if (deleted.length>0){
				bot.sendMessage(msg.chat.id, '"'+deleted[0].name+'" успешно удален');
			}
			else{
				bot.sendMessage(msg.chat.id, 'Ничего не удалено');
			}
			
		}
		else{
			sendInstructions();
		}
	}
	else{
		sendInstructions();
	}
});



var app = express();
app.all('/', function(req, res){
	res.status(404).end();
});

app.all('/:token', function(req, res){
	if (req.params.token.length == 16){
		var item = db.get('notificators').find({token: req.params.token}).value();
		if (item){
			var text = '';
			if (req.query.t){
				text = req.query.t;
			}
			bot.sendMessage(item.user, '['+item.name+']: '+text);
			logger.info('Notice:', item.user, item.name, text)
			res.end();
		}
		else{
			res.status(403).end();
		}
	}
	else{
		res.status(403).end();
	}
});


app.listen(config.port, (err)=>{
	if (err){
		logger.err('Server.listen error',err);
	}
	else{
		logger.info('Server listen on',config.port);
	}
});