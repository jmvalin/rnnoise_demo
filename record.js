let microphoneIsWiredUp = false;
let microphoneAccessIsNotAllowed = undefined;
let streamMicrophoneData = false;

function getMicrophoneAccess() {
  if (microphoneIsWiredUp) {
    return;
  }
  var audioContext;
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  } catch (e) {
    alert('Web Audio API is not supported in this browser.');
  }

  // Check if there is microphone input.
  try {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  } catch (e) {
    alert("getUserMedia() is not supported in your browser.");
  }

  var inputBuffer = [];
  var bufferSize = 1024;
  var sampleRate = audioContext.sampleRate;
  var processingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
  processingNode.onaudioprocess = function (e) {
    // console.log("Processing.");
    var input = e.inputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      inputBuffer.push(input[i]);
    }
    while (inputBuffer.length >= sampleRate) {
      let buffer = [];
      for (let i = 0; i < sampleRate; i++) {
        buffer.push(inputBuffer.shift())
      }
      if (streamMicrophoneData) {
        postData(convertFloat32ToInt16(buffer).buffer);
      }
    }
  }

  // Get access to the microphone and start pumping data through the graph.
  navigator.getUserMedia({ audio: true }, function (stream) {
    var microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(processingNode);
    processingNode.connect(audioContext.destination);
    microphoneIsWiredUp = true;
  }, function (e) {
    if (e.name === "PermissionDeniedError") {
      microphoneAccessIsNotAllowed = true;
      alert("You'll need to provied access to your microphone for this web page to work.");
    }
  });
}

function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  let buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
  }
  return buf;
}

let uploadedPackets = 0;
function postData(arrayBuffer) {
  let streamingStatus = document.getElementById("streaming_status");
  var fd = new FormData();
  fd.append("author", "Fake Name");
  fd.append("attachment1", new Blob([arrayBuffer]));
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "http://kyoko.thomasdaede.com:3001/upload");
  xhr.onload = function (event) {
    streamingStatus.innerText = "Donated " + (uploadedPackets++) + " seconds of noise.";
  };
  xhr.send(fd);
}

function toggleStreaming() {
  getMicrophoneAccess();
  
  let streamingButton = document.getElementById("streaming_button");
  let streamingStatusIcon = document.getElementById("streaming_status_icon");
  if (streamMicrophoneData) {
    streamingStatusIcon.style.visibility = "hidden";
    streamMicrophoneData = false;
    streamingButton.innerText = "Start donating my noise!";
  } else {
    streamingStatusIcon.style.visibility = "visible";
    streamMicrophoneData = true;
    streamingButton.innerText = "Stop donating my noise!";
  }
}
