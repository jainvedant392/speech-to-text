import AudioRecorder from './components/AudioRecorder';

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Speech-to-Text Demo</h1>
      <AudioRecorder />
    </main>
  );
}
