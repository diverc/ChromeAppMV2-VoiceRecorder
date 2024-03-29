window.onload = function() {
  document.querySelector('#greeting').innerText ="こんにちは";
};

main();

async function main () {
  let recordingTime;
  let timer;

  const btnStart = document.querySelector('#btnStart');
  btnStart.focus();
  const btnStop = document.querySelector('#btnStop');
  const player = document.querySelector('#player');
  const stream = await navigator.mediaDevices.getUserMedia({ video: false,    audio: true,  });
  const mR = new MediaRecorder(stream, {    mimeType: 'audio/webm',  });

  btnStart.addEventListener('click', () => {
    document.querySelector('#greeting').innerText = "[ ● REC 録音中 ]";
	URL.revokeObjectURL(player.src);
    mR.start();
    btnStart.setAttribute('hidden', '');
    btnStop.removeAttribute('hidden');
	btnStop.focus();
	recordingTime = 0;
    timer = setInterval(() => {
      recordingTime += 0.1;
      document.querySelector(".recording-time").textContent = `${recordingTime.toFixed(1)}`+ " s";
     }, 100);
  });

  btnStop.addEventListener('click', () => {
    document.querySelector('#greeting').innerText = "[ ダウンロード完了 ]";
    mR.stop();
    btnStop.setAttribute('hidden', '');
    btnStart.removeAttribute('hidden');
	btnStart.focus();
	clearInterval(timer);
  });

  mR.addEventListener('dataavailable', event => {
    player.src = URL.createObjectURL(event.data);
	let fileName = "Voice_" + new Date().toLocaleString().replace(/ /g, "_").replace(/[T:\/]/g, "-") + "@" + `${recordingTime.toFixed(0)}`+ "s" + ".webm";
    document.querySelector(".recording-time").textContent  = fileName;
    let a = document.createElement('a');
    a.href = player.src;
    a.download = fileName;
    a.click();
  });
};