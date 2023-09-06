async function fetchConfig() {
    const res = await fetch('/config');
    return await res.json();
}

let mediaRecorder;
let audioChunks = [];
let isTTSPlaying = false;
let ENV;

async function resetContext() {
    try {
        const response = await fetch(`${ENV.TRANSCRIBE_ENDPOINT}/reset`);
        const data = await response.json();
        console.log('Reset Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function main() {
    ENV = await fetchConfig();
    const myvad = await vad.MicVAD.new({
        positiveSpeechThreshold: ENV.positiveSpeechThreshold,
        negativeSpeechThreshold: ENV.negativeSpeechThreshold,
        onSpeechStart: () => {
            if (!isTTSPlaying) {
                console.log("Speech started");
                startRecording();
            }
        },
        onSpeechEnd: (audio) => {
            if (!isTTSPlaying) {
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
                const response = await fetch(`${ENV.TRANSCRIBE_ENDPOINT}/transcribe`, {
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
