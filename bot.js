const SteamUser = require('steam-user')
const SteamTotp = require('steam-totp')
const fs = require('fs')
const TradeOfferManager = require('steam-tradeoffer-manager')
const SteamCommunity = require('steamcommunity')
const request = require('request');
var msg
const ver = "1.0.2"

request('https://raw.githubusercontent.com/SloRunner/node-steam-donation-bot/master/version.json', { json: true }, (err, res, body) => {
  if (err) return console.log(err)
  if (ver != body.version) console.log('There is an update avaliable! Use "git pull" to download latest release from github or redownload it from repository: \nhttps://github.com/SloRunner/node-steam-donation-bot\n')
});

if (fs.existsSync('./config.json')) {
  var config = require('./config.json')
} else {
  console.log('Config file not present, please create one or copy it from config.example.json file')
  process.exit(1)
}

const client = new SteamUser()
const community = new SteamCommunity()
const manager = new TradeOfferManager({
  'steam': client,
  'domain': 'localhost',
  'language': 'en',
  'pollInterval': config.pollInterval * 1000
})

// Login with bot account
client.logOn({
  'accountName': config.bot_username,
  'password': config.bot_password,
  'twoFactorCode': SteamTotp.getAuthCode(config.bot_totp)
})

// Logged on event is fired
client.on('loggedOn', function () {
  console.log('Logged on to steam!')
  if (config.bot_online === true) {
    // Set bot online if requested in config
    client.setPersona(1)
    console.log('Setting status to online!')
  };
})

// Catch webSession event
client.on('webSession', function (sessionID, cookies) {
  // Set cookies to the trade offer manager
  manager.setCookies(cookies, function (err) {
    if (err) {
      console.log(err)
      process.exit(1) // Exit since we did not get api key
    }
    console.log('Got API key: ' + manager.apiKey)
    community.setCookies(cookies);
    community.startConfirmationChecker(30000, config.bot_identitySecret);
  })
})

// Catch new offer event
manager.on('newOffer', function (offer) {
  if (offer.partner == config.bot_admin) {
    console.log('Accepted Admin tradeoffer')
    offer.accept()
    return
  };
  var recieveditems = offer.itemsToReceive
  var givenitems = offer.itemsToGive
  // Only accept offer if we are not giving any items
  if (givenitems.length === 0 && recieveditems.length > 0) {
    recieveditems = recieveditems.map(item => item.name)
    offer.accept(false, function () {
      client.getPersonas([offer.partner], function (persona) {
        msg = 'Recieved: ' + recieveditems.join(', ') + ' from ' + persona[offer.partner].player_name + ' [' + offer.partner + ']'
        console.log(msg)
        if (config.send_message === true) {
          client.chatMessage(config.message_to, msg)
        };
      })
    })
  };
})

// Write pollData when we get it
manager.on('pollData', function (pollData) {
  fs.writeFile('polldata.json', JSON.stringify(pollData))
})
