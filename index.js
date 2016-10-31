const http = require('http');
const url = require('url');
const crypto = require('crypto');
const express = require('express');
const winston = require('winston');
const TelegramBot = require('node-telegram-bot-api');
const lowdb = require('lowdb');
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

const db = lowdb('TGM.json');
db.defaults({
	'notificators': []
}).value();
db.set('lastStart', Date.now()).value();


const bot = new TelegramBot(config.TGtoken, {polling: true});

bot.on('message', function(msg){
	console.log(msg);
	if (msg.entities !== undefined && msg.entities[0].type === 'bot_command'){
		var command = msg.text.substr(msg.entities[0].offset, msg.entities[0].length);
		if (command === '/new'){
			var name = msg.text.substr(msg.entities[0].length).trim();
			if (name.length>2 && name.length<32){
				logger.info('TM /new', (msg.from.username || msg.from.id), ': '+name);
				var newToken = crypto.randomBytes(8).toString('hex');
				db.get('notificators').push({
					user: msg.from.id,
					name: name,
					token: newToken
				}).value();
				bot.sendMessage(msg.from.id, 'Оповещение добавлено.\nuser: '+msg.from.id+'\nname: '+name+'\ntoken: '+newToken);
			}
			else{
				logger.debug('TM /new fail', (msg.from.username || msg.from.id), msg.text);
				bot.sendMessage(msg.from.id, 'Введите /new <Имя>');
			}
		}
		else if (command === '/all'){
			logger.debug('TM /all', (msg.from.username || msg.from.id));
			var notificators = db.get('notificators').find({user: msg.from.id}).value();
			bot.sendMessage(msg.from.id, 'Список оповещений:\n'+JSON.stringify(notificators));
		}
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
			bot.sendMessage(item.user, item.name+' Notice:\n'+text);
			logger.info('Notice:', item.user, item.name+'\n'+text)
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