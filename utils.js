var number2key = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
var key2number = {};
number2key.forEach((e, i) => key2number[e] = i);

var A0 = 0x15;
var C8 = 0x6C;

function noteToStr(note)
{
  var octave = (note - 12) / 12 >> 0;
  var name = number2key[note % 12] + octave;
  return name;
}

function strToNote(str)
{
  var octave = parseInt(str.slice(-1)); //assuming octave is only 1 digit
  var name = str.slice(0, -1);
  return octave * 12 + key2number[name] + 12;
}

module.exports = {number2key, A0, C8, noteToStr, strToNote};
