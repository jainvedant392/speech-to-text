'use client';

import { useState, useRef } from 'react';

const AudioRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      setLoading(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      try {
        // Send to /api/transcribe (Deepgram)
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: audioBlob,
        });

        const data = await res.json();

        if (data.transcript) {
          setTranscript(data.transcript);

          // Now send to Gemini API with the transcript
          const geminiRes = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: data.transcript }),
          });

          const geminiData = await geminiRes.json();

          if (geminiData.result) {
            setAnalysis(geminiData.result);
          } else {
            setAnalysis('❌ Gemini analysis failed');
          }
        } else {
          setTranscript('❌ Transcription failed');
        }
      } catch (err) {
        console.error(err);
        setTranscript('❌ Error occurred during transcription');
        setAnalysis('');
      } finally {
        setLoading(false);
      }
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="p-4">
      <button
        onClick={recording ? stopRecording : startRecording}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {loading && <p className="mt-2 text-gray-500">🔄 Uploading and analyzing...</p>}

      {transcript && (
        <div className="mt-4 p-2 border rounded text-gray-800">
          <strong>Transcript:</strong> {transcript}
        </div>
      )}

      {analysis && (
        <div className="mt-4 p-2 border rounded bg-green-50 text-green-800">
          <strong>Gemini Analysis:</strong> {analysis}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
