
var selected_level;
var selected_type;
var selected_processing;
var noise_level_id=-1;
var noise_type_id=-1;
var noise_processing_id=-1;

var music_pos = -1;

var noise_levels = ["0dB", "5dB", "10dB", "15dB", "20dB", "clean"];
var noise_types = ["babble_", "car_", "street_"];
var noise_processings = ["", "rnnoise_", "speexdsp_"];

function updateMusicClip() {
  if (noise_level_id==5) document.getElementById("noise_type_selector").classList.add("inactive");
  if (noise_level_id!=5) document.getElementById("noise_type_selector").classList.remove("inactive");
  var audio = document.getElementById("music_player");
  name = "samples/" + noise_processings[noise_processing_id];
  if (noise_level_id != 5) name = name + noise_types[noise_type_id];
  name = name + noise_levels[noise_level_id];
  var extension = "opus";
  if (!audio.canPlayType('audio/ogg; codecs="opus"')) extension = "mp3";
  /*console.log("extension = " + extension);*/
  name = name + "." + extension;
  var playing = !(audio.paused);
  var position = audio.currentTime;
  if (music_pos >= 0)
    position = music_pos;

  audio.src = name;

  audio.addEventListener("loadedmetadata",
                           function() {
                               // don't set if zero
                               if(position>0)
                                   audio.currentTime = position;
                               if(playing)
                                   audio.play();
                               this.removeEventListener("loadedmetadata",arguments.callee,true);
                           }, true);
  
  audio.load();
  /*console.log(audio.canPlayType('audio/ogg; codecs="opus"'));
  console.log(audio.canPlayType("audio/mpeg;"));
  console.log(audio.canPlayType('audio/wav; codecs="1"'));*/
}

function setLevel(level_id, item) {
  if (noise_level_id == level_id) return;
  noise_level_id = level_id;
  if (selected_level) selected_level.classList.remove("selected");

  item.classList.add("selected");
  selected_level = item;
  updateMusicClip();
}

function setType(type_id, item) {
  if (noise_type_id == type_id) return;
  noise_type_id = type_id;
  if (selected_type) selected_type.classList.remove("selected");

  item.classList.add("selected");
  selected_type = item;
  updateMusicClip();
}

function setProcessing(processing_id, item) {
  if (noise_processing_id == processing_id) return;
  noise_processing_id = processing_id;
  if (selected_processing) selected_processing.classList.remove("selected");

  item.classList.add("selected");
  selected_processing = item;
  updateMusicClip();
}

function music_norestart() {
  music_pos = -1;
  document.getElementById("music_restart_string").innerHTML = "Player will <b>continue</b> when changing sample.";
}

function music_setrestart() {
  music_pos = document.getElementById("music_player").currentTime;
  document.getElementById("music_restart_string").innerHTML = "Player will <b>restart at " + music_pos.toFixed(2) + " seconds</b> when changing sample.";
}

function init_demo() {
  setLevel(3, document.getElementById("default_level"));
  setType(0, document.getElementById("default_type"));
  setProcessing(0, document.getElementById("default_processing"));
  music_norestart();

  liveNoise(0, document.getElementById("default_live_noise"));
  liveNoiseSuppression(0, document.getElementById("default_live_noise_suppression"));
}
