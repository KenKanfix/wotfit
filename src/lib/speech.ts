export function speak(text?: string): void {
  if (!text) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = document.documentElement.lang || 'en'
  utterance.rate = 0.95
  synth.speak(utterance)
}
