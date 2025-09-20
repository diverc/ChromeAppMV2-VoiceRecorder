const Recording = () => {
  const { useState, useRef, useEffect } = React

  const [recording, setRecording] = useState(false) // 録音中かどうか
  const [audioURL, setAudioURL] = useState("")
  const [audioType, setAudioType] = useState("mp3")
  const [elapsedTime, setElapsedTime] = useState(0) // 経過時間（秒）
  const [audioFileName, setAudioFileName] = useState("") // 録音後のファイル名
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(() => {
    // ローカルストレージから初期値を読み込む
    return localStorage.getItem("discordWebhookUrl") || "";
  }) // Discord Webhook URL
  const [showDiscordControls, setShowDiscordControls] = useState(false) // Discordコントロールの表示/非表示
  const mediaRecorderRef = useRef()
  const streamRef = useRef()
  const chunksRef = useRef()
  const timerRef = useRef() // タイマー用のref
  const startTimeRef = useRef() // 録音開始時間

  const supportedAudioTypes = ["wav", "mp3", "flac"] // コンポーネント内に移動

  const recordingStart = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        setRecording(true)
        setElapsedTime(0) // 経過時間をリセット
        if (audioURL) {
          window.URL.revokeObjectURL(audioURL)
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })

        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorder.start()

        const chunks = []
        mediaRecorder.ondataavailable = e => {
          chunks.push(e.data)
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks)
          const url = window.URL.createObjectURL(audioBlob)
          setAudioURL(url)

          // 録音時間を時間:分:秒形式に変換
          const formatDuration = (seconds) => {
            const hrs = Math.floor(seconds / 3600)
            const mins = Math.floor((seconds % 3600) / 60)
            const secs = seconds % 60
            
            if (hrs > 0) {
              return `${hrs}h${mins.toString().padStart(2, "0")}m${secs.toString().padStart(2, "0")}s`
            } else if (mins > 0) {
              return `${mins}m${secs.toString().padStart(2, "0")}s`
            } else {
              return `${secs}s`
            }
          }

          const now = new Date()
          const fileName = `Voice_${now.getFullYear()}-${(now.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now
            .getHours()
            .toString()
            .padStart(2, "0")}-${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}-${now
            .getSeconds()
            .toString()
            .padStart(2, "0")}@${formatDuration(elapsedTime)}.${audioType}`
          setAudioFileName(fileName)

          // 録音終了時に自動ダウンロード
          if (
            chunksRef &&
            chunksRef.current &&
            supportedAudioTypes.includes(audioType)
          ) {
            const downloadBlob = new Blob(chunksRef.current, {
              type: `audio/${audioType}`,
            })
            const tempURL = window.URL.createObjectURL(downloadBlob)
            const downloadElement = document.createElement("a")
            downloadElement.href = tempURL
            downloadElement.download = fileName
            downloadElement.click()
            window.URL.revokeObjectURL(tempURL)
          }
        }

        streamRef.current = stream
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = chunks

        // タイマー開始
        startTimeRef.current = Date.now()
        timerRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }, 1000)
      } catch (e) {
        // 失敗したとき
        console.error(e)
        setRecording(false)
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    }
  }

  const recordingStop = () => {
    mediaRecorderRef?.current.stop()
    streamRef?.current.getTracks().forEach(track => {
      track.stop()
    })
    setRecording(false)

    // タイマー停止
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }

  const clickButton = () => {
    if (recording) {
      recordingStop()
    } else {
      recordingStart()
    }
  }

  // スペースキーでの録音開始/停止
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.code === "Space") {
        e.preventDefault() // スペースキーのデフォルト動作（スクロールなど）を防止
        clickButton()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [recording, clickButton]) // recordingとclickButtonが変更されたときに再実行

  // discordWebhookUrlが変更されたときにローカルストレージに保存
  useEffect(() => {
    localStorage.setItem("discordWebhookUrl", discordWebhookUrl);
  }, [discordWebhookUrl]);

  const downloadRecording = () => {
    if (
      chunksRef &&
      chunksRef.current &&
      supportedAudioTypes.includes(audioType)
    ) {
      const audioBlob = new Blob(chunksRef.current, {
        type: `audio/${audioType}`,
      })

      const tempURL = window.URL.createObjectURL(audioBlob)

      const downloadElement = document.createElement("a")
      downloadElement.href = tempURL
      
      // 録音時間を時間:分:秒形式に変換
      const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        
        if (hrs > 0) {
          return `${hrs}h${mins.toString().padStart(2, "0")}m${secs.toString().padStart(2, "0")}s`
        } else if (mins > 0) {
          return `${mins}m${secs.toString().padStart(2, "0")}s`
        } else {
          return `${secs}s`
        }
      }
      
      const now = new Date()
      const fileName = `Voice_${now.getFullYear()}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now
        .getHours()
        .toString()
        .padStart(2, "0")}-${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}-${now
        .getSeconds()
        .toString()
        .padStart(2, "0")}＠${formatDuration(elapsedTime)}.${audioType}`
      downloadElement.download = fileName
      downloadElement.click()
      window.URL.revokeObjectURL(tempURL)
    }
  }

  const uploadToDiscord = async (chunks, fileName, audioType, webhookUrl) => {
    if (!webhookUrl) {
      alert("Discord Webhook URLを入力してください。")
      return
    }
    if (!chunks || chunks.length === 0) {
      alert("録音されたオーディオデータがありません。")
      return
    }

    const audioBlob = new Blob(chunks, { type: `audio/${audioType}` })
    const formData = new FormData()
    formData.append("file", audioBlob, fileName)
    formData.append("payload_json", JSON.stringify({
      content: `新しいボイスメモ: ${fileName}`,
    }))

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Discordへのアップロードに失敗しました: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Discordへのアップロード成功:", data)
      alert("Discordへのアップロードが完了しました！手動で「🎤」リアクションを追加してください。")

    } catch (error) {
      console.error("Discordへのアップロード中にエラーが発生しました:", error)
      alert(`Discordへのアップロード中にエラーが発生しました: ${error.message}`)
    }
  }

  return (
    <>
      <h1>オフライン録音</h1>
      <p className="app-description">インターネットへ接続不要の録音アプリ<br />録音終了後、Discodeへ送付可能</p>
      <div className="recording-main-menu">
        <div className="recording-controls">
          <div className="recording-buttons">
            <button
              className="simple-button"
              onClick={clickButton}
            >
              {recording ? "録音終了" : "録音開始"}
            </button>
          </div>
          <div className="audio-type-select">
            <label htmlFor="audioType">フォーマット:</label>
            <select
              id="audioType"
              value={audioType}
              onChange={e => setAudioType(e.target.value)}
              disabled={recording}
            >
              {supportedAudioTypes.map(type => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        {recording && (
          <div className="recording-timer">
            録音時間: {elapsedTime}秒
          </div>
        )}
        {audioURL && !recording && (
          <div className="recorded-file-info">
            <p>録音ファイル: {audioFileName}</p>
            <audio controls src={audioURL} controlsList="nodownload"></audio>
            <button
              className="simple-button"
              onClick={() => setShowDiscordControls(!showDiscordControls)}
            >
              拡張チェック
            </button>
            {showDiscordControls && (
              <div className="discord-controls">
                <input
                  type="text"
                  placeholder="Discord Webhook URL"
                  value={discordWebhookUrl}
                  onChange={e => setDiscordWebhookUrl(e.target.value)}
                  style={{ width: "100%", padding: "8px", margin: "10px 0" }}
                />
                <button
                  className="simple-button"
                  onClick={() => uploadToDiscord(chunksRef.current, audioFileName, audioType, discordWebhookUrl)}
                  disabled={!discordWebhookUrl || !audioURL}
                >
                  DiscordへUpload
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

ReactDOM.render(<Recording />, document.getElementById("root"))
