let audioContext: AudioContext | null = null

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

export const playChord = (frequencies: number[], duration: number = 2): Promise<void> => {
  return new Promise((resolve) => {
    const ctx = getAudioContext()
    const gainNode = ctx.createGain()
    gainNode.connect(ctx.destination)
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05)
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.5)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    const oscillators = frequencies.map((freq) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const oscGain = ctx.createGain()
      oscGain.gain.value = 1 / frequencies.length

      osc.connect(oscGain)
      oscGain.connect(gainNode)

      return osc
    })

    oscillators.forEach((osc) => {
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    })

    setTimeout(resolve, duration * 1000 + 100)
  })
}

export const playNote = (frequency: number, duration: number = 0.5): Promise<void> => {
  return new Promise((resolve) => {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = frequency

    gainNode.connect(ctx.destination)
    osc.connect(gainNode)

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)

    setTimeout(resolve, duration * 1000 + 50)
  })
}

export const resumeAudioContext = async (): Promise<void> => {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}
