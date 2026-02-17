import type { Context } from "grammy";
import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export async function transcribeVoice(ctx: Context): Promise<string | null> {
  const voice = ctx.message?.voice;
  if (!voice) return null;

  const file = await ctx.getFile();
  const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download voice file: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const audioFile = new File([buffer], "voice.ogg", { type: "audio/ogg" });

  const transcription = await getOpenAI().audio.transcriptions.create({
    model: "gpt-4o-mini-transcribe",
    file: audioFile,
  });

  return transcription.text?.trim() || null;
}
