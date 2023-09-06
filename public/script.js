async function fetchConfig() {
    const res = await fetch('https://talkgpt.dev.ols.blast.co.id/config');
    return await res.json();
}

let mediaRecorder;
let audioChunks = [];
let isTTSPlaying = false;

async function main() {
    const config = await fetchConfig();
    const myvad = await vad.MicVAD.new({
        positiveSpeechThreshold: config.positiveSpeechThreshold,  // assign from fetched config
        negativeSpeechThreshold: config.positiveSpeechThreshold,  // assign from fetched config
        onSpeechStart: () => {
            if (!isTTSPlaying) {  // Check if TTS is not playing
                console.log("Speech started");
                startRecording();
            }
        },
        onSpeechEnd: (audio) => {
            if (!isTTSPlaying) {  // Check if TTS is not playing
                console.log("Speech ended");
                stopRecording(audio);
            }
        },
    });

    myvad.start();
}

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('audio_file', audioBlob, 'audio.wav');

            try {
                const response = await fetch('http://ols-svc-transcribegpt.svc.gke-main.ols.blast.co.id:8000/transcribe', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                const prompt = document.getElementById('prompt');
                const completion = document.getElementById('completion');
                console.log(data)
                prompt.value = data.prompt;
                completion.value = data.completion;
                playTextToSpeech(data.completion);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        mediaRecorder.start();
    });
}

async function stopRecording() {
    mediaRecorder.stop();
}

async function playTextToSpeech(text) {
    try {
        const response = await fetch('/synthesize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });
        const audioBlob = await response.blob();
        const audioURL = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioURL);
        isTTSPlaying = true;
        audio.onended = function() {
            isTTSPlaying = false;
        };
        audio.play();
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
