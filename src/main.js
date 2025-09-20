document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const recordButton = document.getElementById('recordButton');
  const pauseButton = document.getElementById('pauseButton');
  const audioTypeSelect = document.getElementById('audioType');
  const timerDiv = document.getElementById('timer');
  const elapsedTimeSpan = document.getElementById('elapsedTime');
  const pauseStatusSpan = document.getElementById('pauseStatus');
  const recordedFileInfoDiv = document.getElementById('recordedFileInfo');
  const audioFileNameSpan = document.getElementById('audioFileName');
  const audioPlayer = document.getElementById('audioPlayer');
  const toggleDiscordButton = document.getElementById('toggleDiscordButton');
  const discordControlsDiv = document.getElementById('discordControls');
  const discordWebhookUrlInput = document.getElementById('discordWebhookUrl');
  const uploadButton = document.getElementById('uploadButton');

  // State variables
  let recording = false;
  let paused = false;
  let audioURL = "";
  let audioType = "mp3";
  let elapsedTime = 0;
  let audioFileName = "";
  let discordWebhookUrl = localStorage.getItem("discordWebhookUrl") || "";
  discordWebhookUrlInput.value = discordWebhookUrl;

  let mediaRecorder;
  let stream;
  let chunks = [];
  let timer;
  let startTime;
  let pausedTime = 0;
  let pauseStartTime;

  const supportedAudioTypes = ["wav", "mp3", "flac"];

  // Functions
  const updateUI = () => {
    recordButton.textContent = recording ? "録音終了" : "録音開始";
    pauseButton.style.display = recording ? "inline-block" : "none";
    pauseButton.textContent = paused ? "再開" : "一時停止";
    timerDiv.style.display = recording ? "block" : "none";
    pauseStatusSpan.style.display = paused ? "inline" : "none";
    audioTypeSelect.disabled = recording;
    recordedFileInfoDiv.style.display = audioURL && !recording ? "block" : "none";
    uploadButton.disabled = !discordWebhookUrl || !audioURL;
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h${mins.toString().padStart(2, "0")}m${secs.toString().padStart(2, "0")}s`;
    } else if (mins > 0) {
      return `${mins}m${secs.toString().padStart(2, "0")}s`;
    } else {
      return `${secs}s`;
    }
  };

  const recordingStart = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        recording = true;
        paused = false;
        elapsedTime = 0;
        pausedTime = 0;
        if (audioURL) {
          window.URL.revokeObjectURL(audioURL);
          audioURL = "";
        }

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = e => {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks);
          audioURL = window.URL.createObjectURL(audioBlob);
          audioPlayer.src = audioURL;

          const finalElapsedTime = Math.floor((Date.now() - startTime - pausedTime) / 1000);
          const now = new Date();
          audioFileName = `Voice_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now.getHours().toString().padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}-${now.getSeconds().toString().padStart(2, "0")}@${formatDuration(finalElapsedTime)}.${audioType}`;
          audioFileNameSpan.textContent = audioFileName;

          const downloadBlob = new Blob(chunks, { type: `audio/${audioType}` });
          const tempURL = window.URL.createObjectURL(downloadBlob);
          const downloadElement = document.createElement("a");
          downloadElement.href = tempURL;
          downloadElement.download = audioFileName;
          downloadElement.click();
          window.URL.revokeObjectURL(tempURL);
          
          chunks = [];
          updateUI();
        };

        mediaRecorder.start();
        startTime = Date.now();
        timer = setInterval(() => {
          if (!paused) {
            elapsedTime = Math.floor((Date.now() - startTime - pausedTime) / 1000);
            elapsedTimeSpan.textContent = elapsedTime;
          }
        }, 1000);

      } catch (e) {
        console.error(e);
        recording = false;
        paused = false;
        if (timer) clearInterval(timer);
      }
    }
    updateUI();
  };

  const pauseRecording = () => {
    if (mediaRecorder && recording && !paused) {
      mediaRecorder.pause();
      paused = true;
      pauseStartTime = Date.now();
      updateUI();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && recording && paused) {
      mediaRecorder.resume();
      paused = false;
      pausedTime += Date.now() - pauseStartTime;
      updateUI();
    }
  };

  const recordingStop = () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    recording = false;
    if (timer) {
      clearInterval(timer);
    }
    updateUI();
  };

  const uploadToDiscord = async () => {
    if (!discordWebhookUrl) {
      alert("Discord Webhook URLを入力してください。");
      return;
    }
    if (!chunks || chunks.length === 0) {
        // If chunks are empty, it means recording is stopped and blob is created.
        // We need to fetch the blob from the audio player's URL.
        if (!audioURL) {
            alert("録音されたオーディオデータがありません。");
            return;
        }
        const response = await fetch(audioPlayer.src);
        const audioBlob = await response.blob();
        
        const formData = new FormData();
        formData.append("file", audioBlob, audioFileName);
        formData.append("payload_json", JSON.stringify({
          content: `新しいボイスメモ: ${audioFileName}`,
        }));

        try {
          const response = await fetch(discordWebhookUrl, {
            method: "POST",
            body: formData,
          });
    
          if (!response.ok) {
            throw new Error(`Discordへのアップロードに失敗しました: ${response.statusText}`);
          }
    
          console.log("Discordへのアップロード成功");
          alert("Discordへのアップロードが完了しました！手動で「🎤」リアクションを追加してください。");
    
        } catch (error) {
          console.error("Discordへのアップロード中にエラーが発生しました:", error);
          alert(`Discordへのアップロード中にエラーが発生しました: ${error.message}`);
        }
    }
  };

  // Event Listeners
  recordButton.addEventListener('click', () => {
    if (recording) {
      recordingStop();
    } else {
      recordingStart();
    }
  });

  pauseButton.addEventListener('click', () => {
    if (paused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  });

  audioTypeSelect.addEventListener('change', (e) => {
    audioType = e.target.value;
  });

  toggleDiscordButton.addEventListener('click', () => {
    const isDisplayed = discordControlsDiv.style.display === 'block';
    discordControlsDiv.style.display = isDisplayed ? 'none' : 'block';
  });

  discordWebhookUrlInput.addEventListener('input', (e) => {
    discordWebhookUrl = e.target.value;
    localStorage.setItem("discordWebhookUrl", discordWebhookUrl);
    updateUI();
  });

  uploadButton.addEventListener('click', uploadToDiscord);

  window.addEventListener("keydown", e => {
    if (e.code === "Space") {
      e.preventDefault();
      recordButton.click();
    }
  });

  // Initial UI setup
  updateUI();
});
