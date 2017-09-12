let microphoneIsWiredUp = false;
let microphoneAccessIsNotAllowed = undefined;
let uploadMicrophoneData = false;
let streamMicrophoneData = false;
let suppressNoise = false;
let Module = null;
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
  var outputBuffer = [];
  var bufferSize = 1024;
  var sampleRate = audioContext.sampleRate;
  var processingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

  function sineWaveAt(sampleNumber, tone) {
    var sampleFrequency = sampleRate / tone
    return Math.sin(sampleNumber / (sampleFrequency / (Math.PI * 2)))
  }

  function addNoise(buffer) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] += Math.random() / 100;
    }
  }

  function removeNoise(buffer) {
    let ptr = Module.ptr;
    let st = Module.st;
    for (let i = 0; i < 480; i++) {
      Module.HEAPF32[(ptr >> 2) + i] = buffer[i] * 32768;
    }
    for (let j = 0; j < 1; j++) {
      Module._rnnoise_process_frame(st, ptr, ptr);
    }
    console.log("Processed Buffer");
    for (let i = 0; i < 480; i++) {
      buffer[i] = Module.HEAPF32[(ptr >> 2) + i] / 32768;
    }
  }
  
  let frameBuffer = [];

  let x = "car_5dB.sw"; 

  function getFile(path, cb) {
    var oReq = new XMLHttpRequest();
    oReq.open("GET", "/myfile.png", true);
    oReq.responseType = "arraybuffer";
    oReq.onload = function (oEvent) {
      var arrayBuffer = oReq.response; // Note: not oReq.responseText
      if (arrayBuffer) {
        cb(arrayBuffer);
        // var byteArray = new Uint8Array(arrayBuffer);
        // for (var i = 0; i < byteArray.byteLength; i++) {
        //   // do something with each byte in the array
        // }
      }
    };
    oReq.send(null);
  }



  processingNode.onaudioprocess = function (e) {
    var input = e.inputBuffer.getChannelData(0);
    var output = e.outputBuffer.getChannelData(0);

    // Drain input buffer.
    for (let i = 0; i < bufferSize; i++) {
      inputBuffer.push(input[i]);
    }
    while (inputBuffer.length >= 480) {
      for (let i = 0; i < 480; i++) {
        frameBuffer[i] = inputBuffer.shift();
      }
      // Process Frame

      addNoise(frameBuffer);
      if (suppressNoise) removeNoise(frameBuffer);

      for (let i = 0; i < 480; i++) {
        outputBuffer.push(frameBuffer[i]);
      }
    }

    // Flush output buffer.
    for (let i = 0; i < bufferSize; i++) {
      output[i] = outputBuffer.shift();
    }

    // {
    //   while (inputBuffer.length >= sampleRate) {
    //     let buffer = [];
    //     for (let i = 0; i < sampleRate; i++) {
    //       buffer.push(inputBuffer.shift())
    //     }
    //     if (uploadMicrophoneData) {
    //       postData(convertFloat32ToInt16(buffer).buffer);
    //     }
    //   }
    //   for (let i = 0; i < bufferSize; i++) {
    //     output[i] = 0;
    //   }
    // }


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
    uploadedPackets++;
    streamingStatus.innerText = "Donated " + uploadedPackets + " seconds of noise (of 60).";
    if (uploadedPackets >= 60) {
      stopStreaming();
    }
  };
  xhr.send(fd);
}

function stopStreaming() {
  let streamingButton = document.getElementById("streaming_button");
  let streamingStatusIcon = document.getElementById("streaming_status_icon");
  let streamingStatus = document.getElementById("streaming_status");
  streamingStatusIcon.style.visibility = "hidden";
  uploadMicrophoneData = false;
  streamingButton.innerText = "Start donating a minute of noise!";
  uploadedPackets = 0;
  streamingStatus.innerText = "";
}

function startStreaming() {
  let streamingButton = document.getElementById("streaming_button");
  let streamingStatusIcon = document.getElementById("streaming_status_icon");
  streamingStatusIcon.style.visibility = "visible";
  uploadMicrophoneData = true;
  streamingButton.innerText = "Stop donating my noise!";
}

function toggleStreaming() {
  getMicrophoneAccess();
  
  if (uploadMicrophoneData) {
    stopStreaming();
  } else {
    startStreaming();
  }
}

function initializeNoiseSuppression() {
  if (Module) {
    return;
  }
  Module = {
    noExitRuntime: true,
    noInitialRun: true,
    preInit: [],
    preRun: [],
    postRun: [function () {
      console.log(`Loaded Javascript Module OK`);
    }],
    memoryInitializerPrefixURL: "bin/",
    arguments: ['input.ivf', 'output.raw']
  };
  NoiseModule(Module);
  Module.st = Module._rnnoise_create();
  Module.ptr = Module._malloc(480 * 4);

  // console.info(Module._rnnoise_process_frame);
}

function toggleNoiseSuppression() {
  getMicrophoneAccess();
  
  initializeNoiseSuppression();

  if (suppressNoise) {
    stopNoiseSuppression();
  } else {
    startNoiseSuppression();
  }
}

function stopNoiseSuppression() {
  // let streamingButton = document.getElementById("streaming_button");
  // let streamingStatusIcon = document.getElementById("streaming_status_icon");
  // let streamingStatus = document.getElementById("streaming_status");
  // streamingStatusIcon.style.visibility = "hidden";
  suppressNoise = false;
  // streamingButton.innerText = "Start donating a minute of noise!";
  // uploadedPackets = 0;
  // streamingStatus.innerText = "";
}

function startNoiseSuppression() {
  // let streamingButton = document.getElementById("streaming_button");
  // let streamingStatusIcon = document.getElementById("streaming_status_icon");
  // streamingStatusIcon.style.visibility = "visible";
  streamMicrophoneData = true;
  suppressNoise = true;
  // streamingButton.innerText = "Stop donating my noise!";
}