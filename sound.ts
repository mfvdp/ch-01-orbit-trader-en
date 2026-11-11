// All sound of the game in one place, made for the small speaker of the Calliope mini 3 with GameKit.
// Short high notes sound much clearer on this speaker than low clicks.
const SOUND_SETTING_KEY = "ot.sound.level"
const EFFECT_DENSITY_KEY = "ot.sound.fx"
const SOUND_LEVEL_VOLUMES = hex`0060a8e6`
const SOUND_LEVEL_NAMES = hex`c9007002eb007102`
const EFFECT_DENSITY_NAMES = hex`2000eb007202`
// How many density levels there are. EFFECT_DENSITY_NAMES holds 16-bit numbers, so its .length is twice this value.
const EFFECT_DENSITY_COUNT = 3
const DEFAULT_SOUND_LEVEL = 2
const DEFAULT_EFFECT_DENSITY = 1
const INTRO_THEME_FILM_TEMPO = 120
// Like the melody player of MakeCode, playIntroTheme counts in ticks of floor(15000 / tempo) milliseconds.
// At 159 BPM one duration unit lasts 94 ms, so the 512 units of the score take 48.128 s.
const INTRO_THEME_NORMAL_TEMPO = 159
// Not read anywhere in the game. The intro theme below is 512 duration units long.
const INTRO_THEME_BEATS = 128
const SOUND_CONFIRM_NOTES = [1319, 1760]
const SOUND_SHIELD_BREAK_NOTES = [2093, 1568, 1047, 740]
const SOUND_ALARM_NOTES = [2093, 0, 2093]
// The intro theme as pairs of bytes (key, duration). The key is an index for music.lookupFrequency, and 0 is a rest;
// the duration counts units of the tempo. Both tempos (FILM and NORMAL) play the same notes. Bytes instead of Melody
// objects save memory.
const INTRO_THEME = hex`3a023d024104460841043d0438043a043a0841043d043a043d044108440441043f043d044604440441083f0441044404460841043f043d043a023a023d023a0241023a023d023a02380238023c0238023f0238023c0238023a023a023d023f0241023f023d023c023a0841043d043a0838043a043d04410846043a023a023d023f0241043f043d043a0438083a043d044108000441044404460449084604440441043f0441024402460441083a023a023d023a023f023d023a0238023a043d0441043f043d043c043a043804350238023c023f02410446083a023c023d023f02410242024402460248024902460448044910460841043d043a043d044104440446083a023d0241024604440441043d083a06`
let introThemeGeneration = 0
let soundscapeScene = -1
let soundscapePhase = -1
let soundscapeWorld = -1
let nextAmbientSoundAtMs = 0
let soundGeneration = 0
let soundLevel = DEFAULT_SOUND_LEVEL
let effectDensity = DEFAULT_EFFECT_DENSITY
let activeGamePatterns = 0
let nextConfirmSoundAtMs = 0
let nextShieldBreakSoundAtMs = 0
let nextAlarmSoundAtMs = 0

// Stops every sound that the mixer is playing. This is the native call inside music.stopAllSounds().
// The game never starts Melody objects, songs or looping sounds, so the rest of stopAllSounds
// would have nothing to stop here. The intro theme stops through introThemeGeneration.
//% shim=music::stopPlaying
function mixerStop(): void { }

function stopGameSounds(): void {
    soundGeneration++
    activeGamePatterns = 0
    introThemeGeneration++
    mixerStop()
}

function soundLevelForVolume(volume: number): number {
    for (let i = 0; i < SOUND_LEVEL_VOLUMES.length; i++) {
        if (SOUND_LEVEL_VOLUMES[i] == volume) return i
    }
    return DEFAULT_SOUND_LEVEL
}

function initializeSound(): void {
    stopGameSounds()
    if (settings.exists(SOUND_SETTING_KEY))
        soundLevel = soundLevelForVolume(settings.readNumber(SOUND_SETTING_KEY))
    else soundLevel = DEFAULT_SOUND_LEVEL
    if (settings.exists(EFFECT_DENSITY_KEY)) {
        let storedDensity = Math.round(settings.readNumber(EFFECT_DENSITY_KEY))
        effectDensity = storedDensity >= 0 && storedDensity <= 2 ? storedDensity : DEFAULT_EFFECT_DENSITY
    } else effectDensity = DEFAULT_EFFECT_DENSITY
    music.setVolume(SOUND_LEVEL_VOLUMES[soundLevel])
    soundscapeScene = -1
    soundscapePhase = -1
    soundscapeWorld = -1
    nextAmbientSoundAtMs = 0
}

function cycleSoundLevel(delta: number): void {
    let next = (soundLevel + delta) % SOUND_LEVEL_VOLUMES.length
    if (next < 0) next += SOUND_LEVEL_VOLUMES.length
    if (next == soundLevel) return
    stopGameSounds()
    soundLevel = next
    let volume = SOUND_LEVEL_VOLUMES[soundLevel]
    music.setVolume(volume)
    settings.writeNumber(SOUND_SETTING_KEY, volume)
    nextAmbientSoundAtMs = game.runtime() + 250
}

function soundLevelName(): string {
    return Texts.t(tableI16(SOUND_LEVEL_NAMES, soundLevel))
}

function cycleEffectDensity(delta: number): void {
    let next = (effectDensity + delta) % EFFECT_DENSITY_COUNT
    if (next < 0) next += EFFECT_DENSITY_COUNT
    if (next == effectDensity) return
    effectDensity = next
    settings.writeNumber(EFFECT_DENSITY_KEY, effectDensity)
    nextAmbientSoundAtMs = game.runtime() + 350
}

function effectDensityName(): string {
    return Texts.t(tableI16(EFFECT_DENSITY_NAMES, effectDensity))
}

function effectPatternLimit(): number {
    // One, two or three short sound patterns can play at once. Even the DENSE level stays below the number
    // of channels that caused drop-outs on the Calliope mini 3.
    return effectDensity + 1
}

function ambientDelayMs(baseDelayMs: number): number {
    if (effectDensity == 0) return Math.idiv(baseDelayMs * 16, 10)
    if (effectDensity == 2) return Math.idiv(baseDelayMs * 7, 10)
    return baseDelayMs
}

function audibleFrequency(frequency: number): number {
    if (frequency <= 0) return 700
    while (frequency < 700) frequency *= 2
    return Math.clamp(700, 2200, frequency)
}

// Runs in a background fiber, so the animation does not stall. This is what music.tonePlayable
// with PlaybackMode.InBackground does, but without linking the Playable classes.
function playGameTone(frequency: number, duration: number): void {
    if (SOUND_LEVEL_VOLUMES[soundLevel] == 0) return
    let pitch = audibleFrequency(frequency)
    let length = Math.max(70, duration)
    control.runInParallel(function () { music.playTone(pitch, length) })
}

function playGamePattern(notes: number[], duration: number, gap: number): void {
    if (SOUND_LEVEL_VOLUMES[soundLevel] == 0 || activeGamePatterns >= effectPatternLimit()) return
    let generation = soundGeneration
    activeGamePatterns++
    control.runInParallel(function () {
        for (let i = 0; i < notes.length; i++) {
            if (generation != soundGeneration) return
            if (notes[i] > 0) music.playTone(audibleFrequency(notes[i]), Math.max(70, duration))
            else pause(Math.max(70, duration))
            if (gap > 0 && i < notes.length - 1) pause(gap)
        }
        if (generation == soundGeneration) activeGamePatterns = Math.max(0, activeGamePatterns - 1)
    })
}

function playGameSweep(wave: WaveShape, startFrequency: number, endFrequency: number, duration: number,
    effect: SoundExpressionEffect): void {
    if (SOUND_LEVEL_VOLUMES[soundLevel] == 0) return
    music.playInstructions(0,
        gameSweepBuffer(wave, startFrequency, endFrequency, duration, effect, music.volume()))
}

// Builds the same instruction buffer as music.soundToInstructionBuffer(wave, start, end, 180, 0, duration,
// effect, InterpolationCurve.Curve, 20, 1, globalVolume) of Arcade 4.2.1, but without the SoundEffect classes.
function gameSweepBuffer(wave: WaveShape, startFrequency: number, endFrequency: number, duration: number,
    effect: SoundExpressionEffect, globalVolume: number): Buffer {
    const startVolume = 180
    const endVolume = 0
    let fxSteps = Math.min(20, Math.floor(duration / 5))
    let timeSlice = duration / fxSteps
    let frequencies: number[] = []
    let volumes: number[] = []
    for (let i = 0; i < fxSteps; i++) {
        let t = i * timeSlice
        let frequency = startFrequency + (endFrequency - startFrequency) *
            Math.sin(t / duration * (Math.PI / 2))
        let volume =
            ((startVolume + t * (endVolume - startVolume) / duration) / 255) * globalVolume
        if (effect === SoundExpressionEffect.Tremolo) {
            if (i % 2 === 0) volume = Math.max(volume - 500, 0)
            else volume = Math.min(volume + 500, 1023)
        } else if (effect === SoundExpressionEffect.Vibrato) {
            if (i % 2 === 0) frequency = Math.max(frequency - 100, 0)
            else frequency = frequency + 100
        } else if (effect === SoundExpressionEffect.Warble) {
            if (i % 2 === 0) frequency = Math.max(frequency - 1000, 0)
            else frequency = frequency + 1000
        }
        frequencies.push(frequency)
        volumes.push(volume)
    }
    let out = control.createBuffer(12 * (fxSteps - 1))
    let stepDurationMs = Math.floor(duration / (fxSteps - 1))
    // Wave codes: Sine 3, Sawtooth 2, Triangle 1, Square 15, Noise 18 (the index is the WaveShape).
    let waveValue = hex`0302010f12`[wave]
    for (let i = 0; i < fxSteps - 1; i++) {
        let offset = i * 12
        out.setNumber(NumberFormat.UInt8LE, offset, waveValue)
        out.setNumber(NumberFormat.UInt16LE, offset + 2, frequencies[i])
        out.setNumber(NumberFormat.UInt16LE, offset + 4, stepDurationMs)
        out.setNumber(NumberFormat.UInt16LE, offset + 6, volumes[i])
        out.setNumber(NumberFormat.UInt16LE, offset + 8, volumes[i + 1])
        out.setNumber(NumberFormat.UInt16LE, offset + 10, frequencies[i + 1])
    }
    return out
}

function soundStartIntroMusic(): void {
    stopGameSounds()
    if (SOUND_LEVEL_VOLUMES[soundLevel] == 0) return
    playIntroTheme(introUsesFilmTempo() ? INTRO_THEME_FILM_TEMPO : INTRO_THEME_NORMAL_TEMPO)
}

// Same timing and volume as music.MelodyPlayer.play for a plain list of notes (triangle wave, no envelope).
function playIntroTheme(tempo: number): void {
    let generation = introThemeGeneration
    let volume = Math.clamp(0, 255, (music.volume() * music.volume()) >> 8)
    control.runInParallel(function () {
        let beat = Math.idiv(15000, tempo)
        let startTimeMs = control.millis()
        let timePos = 0
        let now = 0
        for (let i = 0; i < INTRO_THEME.length; i += 2) {
            if (generation != introThemeGeneration) return
            let noteLengthMs = INTRO_THEME[i + 1] * beat
            let key = INTRO_THEME[i]
            if (key > 0) {
                let frequency = music.lookupFrequency(key)
                let note = control.createBuffer(13)
                music.addNote(note, 0, noteLengthMs, 255, 255, 1, frequency, volume, frequency)
                music.playInstructions(timePos - now, note.slice(0, 12))
            }
            timePos += noteLengthMs
            let timeLeft = timePos - now
            if (timeLeft > 200) {
                pause(timeLeft - 100)
                now = control.millis() - startTimeMs
            }
        }
    })
}

function soundPrologueCue(cue: number): void {
    if (cue == 0) playGamePattern([880, 1047, 1319], 85, 30)
    else if (cue == 1) playGameSweep(WaveShape.Noise, 1500, 480, 420, SoundExpressionEffect.Tremolo)
    else if (cue == 2) soundEncounter()
    else playGamePattern([988, 1319, 1760], 105, 35)
}

function soundIntroCue(cue: number): void {
    if (cue == 0) return
    else if (cue == 1) playGamePattern([1568, 2093], 75, 20)
    else if (cue == 2) playGameSweep(WaveShape.Sawtooth, 760, 520, 380, SoundExpressionEffect.Tremolo)
    else if (cue == 3) playGameSweep(WaveShape.Sawtooth, 520, 1450, 480, SoundExpressionEffect.Vibrato)
    else if (cue == 4) playGameSweep(WaveShape.Square, 740, 1950, 520, SoundExpressionEffect.Warble)
    else if (cue == 5) playGamePattern([1319, 0, 1760], 85, 45)
    else if (cue == 6) soundEncounter()
    else if (cue == 7) soundEnemyLock()
    else if (cue == 8) playGameSweep(WaveShape.Square, 2200, 900, 160, SoundExpressionEffect.None)
    else if (cue == 9) playGameSweep(WaveShape.Noise, 1150, 420, 260, SoundExpressionEffect.Tremolo)
    else if (cue == 10) playGameSweep(WaveShape.Noise, 900, 180, 480, SoundExpressionEffect.Warble)
    else if (cue == 11) soundRescueSignal()
    else if (cue == 12) playGameSweep(WaveShape.Sawtooth, 740, 1200, 420, SoundExpressionEffect.Vibrato)
    else if (cue == 13) playGameSweep(WaveShape.Sawtooth, 920, 1720, 440, SoundExpressionEffect.Vibrato)
    else if (cue == 14) playGameSweep(WaveShape.Square, 1250, 2200, 560, SoundExpressionEffect.Warble)
    else if (cue == 15) playGamePattern([988, 1319], 100, 35)
    else if (cue == 16) playGamePattern([1175, 1568], 90, 35)
    else if (cue == 17) playGamePattern([1319, 1568], 85, 25)
    else if (cue == 18) playGamePattern([1568, 1760], 85, 20)
    else playGamePattern([1760, 2093], 95, 20)
}

function soundTitle(): void {
    stopGameSounds()
    playGamePattern([880, 1047, 1319, 1760], 115, 25)
}

function soundNavigate(): void {
    playGameTone(1175, 70)
}

// A confirming sound for a menu action: the last two notes of the mission sound, shorter and with a smaller gap.
function soundConfirm(): void {
    if (SOUND_LEVEL_VOLUMES[soundLevel] == 0) return
    let now = game.runtime()
    if (now < nextConfirmSoundAtMs) return
    nextConfirmSoundAtMs = now + 140
    playGamePattern(SOUND_CONFIRM_NOTES, 70, 15)
}

// The sound of the player's shield breaking. The notes go down, so it stays clear under the fight noise.
function soundShieldBreak(): void {
    if (SOUND_LEVEL_VOLUMES[soundLevel] == 0) return
    let now = game.runtime()
    if (now < nextShieldBreakSoundAtMs) return
    nextShieldBreakSoundAtMs = now + 600
    playGamePattern(SOUND_SHIELD_BREAK_NOTES, 70, 8)
}

// A warning for critical moments. Callers may call this in every frame, but it lets through
// at most one pulse every 900 ms.
function soundAlarm(): void {
    if (SOUND_LEVEL_VOLUMES[soundLevel] == 0) return
    let now = game.runtime()
    if (now < nextAlarmSoundAtMs) return
    nextAlarmSoundAtMs = now + 900
    playGamePattern(SOUND_ALARM_NOTES, 70, 35)
}

function soundBuy(): void {
    playGamePattern([1319, 1760], 80, 20)
}

function soundSell(): void {
    playGamePattern([1568, 1175], 80, 20)
}

function soundMission(): void {
    playGamePattern([988, 1319, 1760], 95, 20)
}

function soundError(): void {
    playGamePattern([784, 740], 120, 20)
}

function soundLaunch(): void {
    playGamePattern([740, 880, 1175, 1568], 95, 20)
}

function soundCruise(): void {
    playGamePattern([880, 988], 80, 20)
}

function soundEncounter(): void {
    playGamePattern([740, 988, 740], 110, 45)
}

function soundEnemyLock(): void {
    playGamePattern([1760, 1760], 70, 55)
}

function soundRescueSignal(): void {
    playGamePattern([1319, 0, 1319], 100, 30)
}

function soundRescueComplete(): void {
    playGamePattern([988, 1319, 1760], 100, 25)
}

function soundApproach(): void {
    playGamePattern([1175, 1319], 90, 30)
}

function soundEscape(): void {
    playGamePattern([880, 1175, 1568], 90, 20)
}

function soundLaser(hit: boolean): void {
    if (hit) playGamePattern([2093, 1568], 70, 5)
    else playGameTone(1760, 75)
}

function soundExplosion(): void {
    playGamePattern([1047, 880, 740], 110, 10)
}

function soundDamage(): void {
    playGamePattern([784, 740], 115, 15)
}

function soundDestroyed(): void {
    stopGameSounds()
    playGamePattern([1047, 880, 784, 740], 150, 25)
}

function stationPitch(baseFrequency: number, world: number): number {
    let variation = Math.clamp(0, WORLD_COUNT - 1, world) % 3
    if (variation == 1) return Math.idiv(baseFrequency * 9, 8)
    if (variation == 2) return Math.idiv(baseFrequency * 5, 4)
    return baseFrequency
}

function playStationMotif(world: number): void {
    let safeWorld = Math.clamp(0, WORLD_COUNT - 1, world)
    let faction = worldFaction(safeWorld)
    let beat = 82 + (safeWorld % 2) * 18
    if (faction == 0) {
        playGamePattern([stationPitch(740, safeWorld), stationPitch(988, safeWorld),
            stationPitch(1175, safeWorld)], beat, 24)
    } else if (faction == 1) {
        playGamePattern([stationPitch(784, safeWorld), stationPitch(1175, safeWorld), 0,
            stationPitch(988, safeWorld)], beat, 18)
    } else if (faction == 2) {
        playGamePattern([stationPitch(880, safeWorld), stationPitch(1047, safeWorld),
            stationPitch(1319, safeWorld), stationPitch(1047, safeWorld)], beat, 14)
    } else {
        playGamePattern([stationPitch(740, safeWorld), stationPitch(880, safeWorld),
            stationPitch(740, safeWorld), stationPitch(1319, safeWorld)], beat, 20)
    }
}

function soundDock(): void {
    playStationMotif(currentWorld)
}

function isStationSoundscape(): boolean {
    return activeScene == SceneId.Hangar || activeScene == SceneId.Market ||
        activeScene == SceneId.Outfitter ||
        activeScene == SceneId.Missions ||
            activeScene == SceneId.StarMap || activeScene == SceneId.Status
}

// Sparse background sound keeps stations and flight alive without covering the important effects.
// All menus in one station share one soundscape, so quick navigation cannot restart the motifs
// or create extra fibers.
function updateSoundscape(): void {
    let phase = activeScene == SceneId.Flight ? flightPhase : -1
    let now = game.runtime()
    let stationScene = isStationSoundscape()
    let sceneGroup = stationScene ? 100 : activeScene
    let world = stationScene ? currentWorld : -1
    if (soundscapeScene != sceneGroup || soundscapePhase != phase || soundscapeWorld != world) {
        soundscapeScene = sceneGroup
        soundscapePhase = phase
        soundscapeWorld = world
        nextAmbientSoundAtMs = now + 900
    }
    if (now < nextAmbientSoundAtMs) return
    if (stationScene) {
        playStationMotif(currentWorld)
        nextAmbientSoundAtMs = now + ambientDelayMs(4200 + (currentWorld % 5) * 320)
    } else if (activeScene == SceneId.Flight &&
        (phase == FlightPhase.Launch || phase == FlightPhase.Cruise)) {
        playGamePattern([740, 784], 75, 10)
        nextAmbientSoundAtMs = now + ambientDelayMs(1250)
    } else if (activeScene == SceneId.Flight && phase == FlightPhase.Encounter) {
        playGameTone(988, 75)
        nextAmbientSoundAtMs = now + ambientDelayMs(1450)
    } else if (activeScene == SceneId.Flight && phase == FlightPhase.Approach) {
        playGameTone(1319, 80)
        nextAmbientSoundAtMs = now + ambientDelayMs(1650)
    } else nextAmbientSoundAtMs = now + 60000
}
