const SteamUser = require("steam-user");
const SteamTotp = require('steam-totp');
const fs = require('fs');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamCommunity = require('steamcommunity');
var msg = '';

if (fs.existsSync('./config.json')) {
    var config = require('./config.json');
}else{
	console.log('Config file not present, please create one or copy it from config.example.json file');
	process.exit(1);
}
const client = new SteamUser();
const manager = new TradeOfferManager({
	"steam": client,
	"domain": "localhost",
	"language": "en",
	"pollInterval": 30000
});

const community = new SteamCommunity();

// Login with bot account
client.logOn({
	"accountName": config.bot_username,
	"password": config.bot_password,
	"twoFactorCode": SteamTotp.getAuthCode(config.bot_totp)
});

// Logged on event is fired
client.on("loggedOn", function () {
	console.log("Logged on to steam!");
	if (config.bot_online == true) {
		//Set bot online if requested in config
		client.setPersona(1);
		console.log("Setting status to online!");
	};
});

// Catch webSession event
client.on('webSession', function(sessionID, cookies) {
	//Set cookies to the trade offer manager
	manager.setCookies(cookies, function(err) {
		if (err) {
			console.log(err);
			process.exit(1); // Exit since we did not get api key
			return;
		}

		console.log("Got API key: " + manager.apiKey);
	});
});

// Catch new offer event
manager.on('newOffer', function(offer) {
	var recieved_items = offer.itemsToReceive;
	var given_items = offer.itemsToGive;
	// Only accept offer if we are not giving any items
	if (given_items.length == 0 && recieved_items.length > 0) {
		recieved_items = recieved_items.map(item => item.name)
		offer.accept(false, function(){
			client.getPersonas([offer.partner], function(persona){
				msg = 'Recieved: ' + recieved_items.join(', ') + ' from ' + persona[offer.partner].player_name + ' [' + offer.partner + ']';
				console.log(msg);
				if (config.send_message == true) {
					client.chatMessage(config.message_to, msg);
				};
			});
		});
	};
});

// Write pollData when we get it
manager.on('pollData', function(pollData) {
	fs.writeFile('polldata.json', JSON.stringify(pollData));
});