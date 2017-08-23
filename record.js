    function convertFloat32ToInt16(buffer) {
      let l = buffer.length;
      let buf = new Int16Array(l);
      while (l--) {
        buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
      }
      return buf;
    }
     
    let count = 0;
    function postData(arrayBuffer) {
      var fd = new FormData();
      fd.append("author", "Fake Name");
      fd.append("attachment1", new Blob([arrayBuffer]));
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "http://kyoko.thomasdaede.com:3001/upload");
      xhr.onload = function (event) {
        // Uploaded.
        console.log(event);
        // console.log("Packet: " + (count++) + ", Uploaded " + arrayBuffer.length + " bytes.");
      };
      xhr.send(fd);
    }
     
    function startStreaming() {
      var audioContext;
      try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
      } catch (e) {
        alert('Web Audio API is not supported in this browser.');
      }
     
     
      // Check if there is microphone input.
      try {
        navigator.getUserMedia = navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia ||
          navigator.msGetUserMedia;
        var hasMicrophoneInput = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia || navigator.msGetUserMedia);
      } catch (e) {
        alert("getUserMedia() is not supported in your browser.");
      }
     
      var inputBuffer = [];
      var bufferSize = 1024;
      var sampleRate = audioContext.sampleRate;
      var processingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processingNode.onaudioprocess = function (e) {
        var input = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          inputBuffer.push(input[i]);
        }
        while (inputBuffer.length >= sampleRate) {
          let buffer = [];
          for (let i = 0; i < sampleRate; i++) {
            buffer.push(inputBuffer.shift())
          }
          postData(convertFloat32ToInt16(buffer).buffer);
        }
      }
     
      var errorCallback = function (e) {
        alert("Error in getUserMedia: " + e);
      };
     
      // Get access to the microphone and start pumping data through the graph.
      navigator.getUserMedia({ audio: true }, function (stream) {
        var microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(processingNode);
        processingNode.connect(audioContext.destination);
      }, errorCallback);
    } 
