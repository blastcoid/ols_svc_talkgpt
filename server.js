require('dotenv').config();

const express = require('express');
const {TextToSpeechClient} = require('@google-cloud/text-to-speech');
const app = express();
const PORT = process.env.APP_PORT || 3000;

// Load environment variables from .env file

app.use(express.json());  // for parsing application/json
app.use(express.static('public'));

app.get('/config', (req, res) => {
    res.json({
        positiveSpeechThreshold: process.env.POSITIVE_SPEECH_THRESHOLD,
        negativeSpeechThreshold: process.env.NEGATIVE_SPEECH_THRESHOLD,
    });
});

app.post('/synthesize', async (req, res) => {
    try {
        const text = req.body.text;

        const client = new TextToSpeechClient();
        const request = {
            input: {text: text},
            voice: {languageCode: process.env.LANGUAGE_CODE || 'id-ID', ssmlGender: process.env.SSML_GENDER || 'FEMALE'},
            audioConfig: {audioEncoding: 'MP3'},
        };

        const [response] = await client.synthesizeSpeech(request);
        res.set('Content-Type', 'audio/mp3');
        res.send(response.audioContent);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Failed to synthesize speech.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
