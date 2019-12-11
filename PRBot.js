var EventEmitter = require('eventemitter3');
var socketCluster = require("socketcluster-client");
var U = require("./utils.js");

class PRBot extends EventEmitter
{
  constructor()
  {
    super();

    this.noteBuffer = [];
    this.noteBufferTime = Date.now();
    this.serverTimeOffset = 0;
  }

  connect(name, room="lobby")
  {
    this.socket = socketCluster.create({
      path: '/socketcluster/',
      hostname: 'www.pianorhythm.me',
      secure: true,
    });

    this.socket.on("setName", (data) => this.onSetName(data));
    this.socket.on("setRoom", (data) => this.onSetRoom(data));

    this.socket.on("connect", () =>
    {
      console.log("connected")
      console.log("socket id", this.socket.id)
      this.socketID = this.socket.id;
      this.socket.emit('register', {
        name: name,
        roomName: room,
      });

      setInterval(() => this.sendPing(), 2000);
      this.sendPing();
    });
  }

  sendPing()
  {
    this.socket.emit("ping", null, (err, res) => {
      if (res) {
        this.receiveServerTime(res);
      }
    });
  }

  //from https://www.pianorhythm.me/javascripts/lib/PianoRhythm.js
  receiveServerTime(time)
  {
    let now = Date.now();
    let target = time - now;
    let duration = 1000;
    let step = 0;
    let steps = 50;
    let step_ms = duration / steps;
    let difference = target - this.serverTimeOffset;
    let inc = difference / steps;
    let iv;
    iv = setInterval(() => {
        this.serverTimeOffset += inc;
        if (++step >= steps) {
          clearInterval(iv);
          this.serverTimeOffset = target;
        }

    }, step_ms);
  }

  onSetName(data)
  {
    this.clientID = data.id;
    console.log("Client id:", this.clientID);
  }

  addNote(note, velocity=100, dd=0)
  {
    if(note < U.A0 || note > U.C8)
    {
      console.log("invalid note");
    }
    var onOff = velocity > 0;
    var d = Date.now() - this.noteBufferTime + dd;
    var n = U.noteToStr(note);
    var s = 1; //not sent for off messages?
    var v = velocity;
    var inst = "high_quality_acoustic_grand_piano";
    var src = 1; //no idea, seems to differ
    var kb_src = 0;
    //others: src: 2, kb_src = 3
    //others midi: src: 1, kb_src = 0
    var msg = onOff ? {d, n, v, inst, src, kb_src} : {d, n, s, inst, src, kb_src};
    //console.log(msg);
    this.noteBuffer.push(msg);
  }

  playNote(note, velocity, dd)
  {
    this.addNote(note, velocity, dd);
  }

  stopNote(note, dd)
  {
    this.addNote(note, 0, dd);
  }

  onSetRoom(data)
  {
    console.log("room set to", data)

    this.chatChannel = this.socket.subscribe(data.roomID);
    this.chatChannel.watch((data) => this.handleChat(data));
    this.midiChannel = this.socket.subscribe("midi_" + data.roomID);
    this.midiChannel.watch((data) => this.handleMidi(data));

    this.noteBufferTime = Date.now();

    setInterval(() => this.flushNoteBuffer(), 200);
  }

  sendMessage(message)
  {
    this.socket.emit("chatMessage", message.toString()) //tostring so we dont send garbage to PR
  }

  flushNoteBuffer()
  {
    if(this.noteBuffer.length == 0)
    {
      this.noteBuffer = [];
      this.noteBufferTime = Date.now();
      return;
    }

    var t = Date.now() + this.serverTimeOffset;
    var n = this.noteBuffer;
    var id = this.socketID;
    var uuid = this.clientID;
    var color = "#88ffaa";
    var msg = {t, n, id, uuid, color};
    this.midiChannel.publish(msg);

    this.noteBuffer = [];
    this.noteBufferTime = Date.now();
  }

  handleChat(data)
  {
    if(data.type != "chat")
    {
      return;
    }

    var message =
    {
      author:
      {
        name: data.name,
        nickname: data.nickname,
        id: data.id,
        sID: data.sID,
      },
      content: data.message,
    };

    this.emit("message", message);
  }

  handleMidi(data)
  {
    //TODO: wait for data.t? (date.now() - t) + d
    data.n.forEach((e) =>
    {
      //delay event by e.d
      setTimeout(() =>
      {
        this.emit("note",
        {
          clientID: data.uuid,
          socketID: data.id,
          color: data.color,
          note: U.strToNote(e.n),
          noteName: e.n,
          velocity: e.v,
          stop: e.s,
          //TODO: src/kb_src/inst?
        });
      }, Date.now() - data.t + e.d);
    });

  }
}

PRBot.utils = U;
module.exports = PRBot
