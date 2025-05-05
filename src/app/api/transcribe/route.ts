import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  if (!deepgramApiKey) {
    return NextResponse.json({ error: 'Deepgram API key missing' }, { status: 500 });
  }

  try {
    const audioBuffer = await req.arrayBuffer();
    const deepgram = createClient(deepgramApiKey);

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(audioBuffer),
      {
        model: 'nova-3',
        smart_format: true,
      }
    );

    if (error) {
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    return NextResponse.json({ transcript: result?.results?.channels?.[0]?.alternatives?.[0]?.transcript });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
