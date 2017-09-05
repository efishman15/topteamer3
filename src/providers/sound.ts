import {Client} from './client';

var audio = new Audio();
var playOgg = !!(audio.canPlayType && audio.canPlayType("audio/ogg; codecs='vorbis'").replace(/no/, ''));
var playMp3 = !!(audio.canPlayType && audio.canPlayType("audio/mpeg").replace(/no/, ''));

//Play
export let play = (sound) => {

  var client = Client.getInstance();

  if (!client.session.settings.sound) {
    return;
  }

  if (playMp3) {
    audio.src = sound + '.mp3';
    audio.play();
    return true;
  }
  else if (playOgg) {
    audio.src = sound + '.ogg';
    audio.play();
    return true;
  }
  else {
    return false;
  }
};
