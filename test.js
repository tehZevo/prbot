var PRBot = require("./PRBot.js");
var U = require("./utils.js");

var bot = new PRBot();
bot.connect("Bot", "lobby");

bot.on("message", (message) =>
{
  if(message.content == "ping")
  {
    bot.sendMessage("pong");
  }
});

bot.on("note", (data) =>
{
  if(data.socketID == bot.socketID)
  {
    return;
  }

  if(!data.stop) {bot.playNote(data.note, data.velocity)}
  else {bot.stopNote(data.note)}
});
