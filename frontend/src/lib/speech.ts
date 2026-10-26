/** Browser text-to-speech used to voice the simulated AI pitch (no audio leaves the browser). */

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function pickVoice(speaker: "agent" | "prospect"): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const female = /zira|aria|jenny|samantha|susan|female|google us english/i;
  const male = /david|mark|guy|alex|daniel|male/i;
  const wanted = speaker === "agent" ? female : male;
  return voices.find((v) => wanted.test(v.name)) ?? voices[speaker === "agent" ? 0 : voices.length - 1];
}

/** Speaks `text`; always resolves (end, error, cancel, or safety timeout) so the call script can never hang. */
export function speak(text: string, speaker: "agent" | "prospect"): Promise<void> {
  if (!speechSupported()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(speaker);
    if (voice) u.voice = voice;
    u.lang = "en-US";
    u.rate = speaker === "agent" ? 1.02 : 0.95;
    u.pitch = speaker === "agent" ? 1.1 : 0.8;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      resolve();
    };
    const guard = setTimeout(finish, text.length * 95 + 4000);
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
  });
}

export function cancelSpeech(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
