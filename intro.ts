// The cinematic start. Everything is drawn and played by code, which keeps memory use low.
const INTRO_OPEN_END_MS = 1800
const INTRO_PROLOGUE_END_MS = 13800
const INTRO_PROLOGUE_LENGTH_MS = 12000
const INTRO_HANGAR_END_MS = 17100
const INTRO_ORBIT_END_MS = 20300
const INTRO_BATTLE_END_MS = 24500
const INTRO_WARP_END_MS = 27300
const INTRO_ARRIVAL_END_MS = 29800
const INTRO_DURATION_MS = 32100
const INTRO_CARD_AT_MS = INTRO_ARRIVAL_END_MS - INTRO_OPEN_END_MS
const INTRO_MODE_KEY = "ot.intro.mode"
const INTRO_MODE_FILM = 0
const INTRO_MODE_NORMAL = 1
const INTRO_MODE_SKIP = 2
// The intro runs at every start, so the title option offers only FILM and NORMAL.
// A count of 3 would bring back OFF (INTRO_MODE_SKIP) as a choice. The code for OFF is still there.
const INTRO_MODE_COUNT = 2

// FILM runs the 32.1 s intro timeline at half speed (64.2 s).
// NORMAL runs it at two thirds speed (48.15 s). Pictures, text and sound cues all follow the same
// logical timeline, so the two modes cannot drift apart scene by scene.
const INTRO_FILM_SPEED_NUMERATOR = 1
const INTRO_FILM_SPEED_DENOMINATOR = 2
const INTRO_NORMAL_SPEED_NUMERATOR = 2
const INTRO_NORMAL_SPEED_DENOMINATOR = 3
let introStartedAtMs = 0
let introCue = 0
let introStoryCue = 0
let introCardCue = false
let introMode = -1

function readIntroMode(): number {
    if (introMode >= INTRO_MODE_FILM && introMode < INTRO_MODE_COUNT) return introMode
    if (settings.exists(INTRO_MODE_KEY)) {
        let stored = Math.round(settings.readNumber(INTRO_MODE_KEY))
        introMode = stored >= INTRO_MODE_FILM && stored < INTRO_MODE_COUNT ? stored : INTRO_MODE_FILM
    } else introMode = INTRO_MODE_FILM
    return introMode
}

function introModeName(): string {
    let mode = readIntroMode()
    if (mode == INTRO_MODE_NORMAL) return Texts.t(235)
    if (mode == INTRO_MODE_SKIP) return Texts.t(201)
    return Texts.t(477)
}

function cycleIntroMode(delta: number): void {
    let next = (readIntroMode() + delta) % INTRO_MODE_COUNT
    if (next < 0) next += INTRO_MODE_COUNT
    if (next == introMode) return
    introMode = next
    settings.writeNumber(INTRO_MODE_KEY, introMode)
}

function introDurationSeconds(): number {
    let mode = readIntroMode()
    if (mode == INTRO_MODE_SKIP) return 0
    if (mode == INTRO_MODE_NORMAL) return 48
    return 64
}

// The intro plays at every start, even after it has been seen once.
function introShouldAutoPlay(): boolean {
    return readIntroMode() != INTRO_MODE_SKIP
}

function startConfiguredIntro(): void {
    if (readIntroMode() == INTRO_MODE_SKIP) {
        setScene(SceneId.Title)
        return
    }
    startIntro()
}

function introUsesFilmTempo(): boolean {
    // Every intro mode except NORMAL plays at film tempo. This also covers a replay that the player starts while the
    // intro is OFF.
    return readIntroMode() != INTRO_MODE_NORMAL
}

function startIntro(): void {
    introStartedAtMs = game.runtime()
    // Cues 0 (silence) and 1 belong to the studio card, which comes after the arrival (introCardCue).
    introCue = 2
    introCardCue = false
    introStoryCue = 0
    activeScene = SceneId.Intro
    inputLocked = false
    soundStartIntroMusic()
}

function finishIntro(): void {
    if (activeScene == SceneId.Intro) {
        soundTitle()
        setScene(SceneId.Title)
    }
}

// The logical time since the intro began, in the order the scenes are shown.
function introPlayTime(): number {
    let realElapsed = Math.max(0, game.runtime() - introStartedAtMs)
    if (introUsesFilmTempo())
        return Math.idiv(realElapsed * INTRO_FILM_SPEED_NUMERATOR, INTRO_FILM_SPEED_DENOMINATOR)
    return Math.idiv(realElapsed * INTRO_NORMAL_SPEED_NUMERATOR, INTRO_NORMAL_SPEED_DENOMINATOR)
}

// First the story (from the prologue to the arrival), then the studio card "CALLIOPE HACKER PRESENTS",
// then the title reveal. Returns the matching time on the timeline of the INTRO_..._MS constants, where the card is
// first. The total stays 32.1 s.
function introElapsed(): number {
    let played = introPlayTime()
    if (played < INTRO_CARD_AT_MS) return played + INTRO_OPEN_END_MS
    if (played < INTRO_ARRIVAL_END_MS) return played - INTRO_CARD_AT_MS
    return played
}

function updateIntro(): void {
    if (activeScene != SceneId.Intro) return
    let elapsed = introElapsed()
    if (introStoryCue == 0 && elapsed >= INTRO_OPEN_END_MS + 80) {
        introStoryCue = 1
        soundPrologueCue(0)
    } else if (introStoryCue == 1 && elapsed >= INTRO_OPEN_END_MS + 3080) {
        introStoryCue = 2
        soundPrologueCue(1)
    } else if (introStoryCue == 2 && elapsed >= INTRO_OPEN_END_MS + 6080) {
        introStoryCue = 3
        soundPrologueCue(2)
    } else if (introStoryCue == 3 && elapsed >= INTRO_OPEN_END_MS + 9080) {
        introStoryCue = 4
        soundPrologueCue(3)
    }

    // The action scenes (hangar to arrival) wait during the prologue: cinematicElapsed stays at the end of the card.
    let cinematicElapsed = elapsed
    if (elapsed >= INTRO_OPEN_END_MS && elapsed < INTRO_PROLOGUE_END_MS)
        cinematicElapsed = INTRO_OPEN_END_MS
    else if (elapsed >= INTRO_PROLOGUE_END_MS) cinematicElapsed = elapsed - INTRO_PROLOGUE_LENGTH_MS
    // The chime of the studio card sounds 1.1 s after the card begins (cue 1).
    if (!introCardCue && elapsed < INTRO_OPEN_END_MS && cinematicElapsed >= 1100) {
        introCardCue = true
        soundIntroCue(1)
    }

    if (introCue == 2 && cinematicElapsed >= 1850) {
        introCue = 3
        soundIntroCue(2)
    } else if (introCue == 3 && cinematicElapsed >= 3600) {
        introCue = 4
        soundIntroCue(3)
    } else if (introCue == 4 && cinematicElapsed >= 5000) {
        introCue = 5
        soundIntroCue(4)
    } else if (introCue == 5 && cinematicElapsed >= 6500) {
        introCue = 6
        soundIntroCue(5)
    } else if (introCue == 6 && cinematicElapsed >= 8300) {
        introCue = 7
        soundIntroCue(6)
    } else if (introCue == 7 && cinematicElapsed >= 9300) {
        introCue = 8
        soundIntroCue(7)
    } else if (introCue == 8 && cinematicElapsed >= 10300) {
        introCue = 9
        soundIntroCue(8)
    } else if (introCue == 9 && cinematicElapsed >= 11100) {
        introCue = 10
        soundIntroCue(9)
    } else if (introCue == 10 && cinematicElapsed >= 11900) {
        introCue = 11
        soundIntroCue(10)
    } else if (introCue == 11 && cinematicElapsed >= 12500) {
        introCue = 12
        soundIntroCue(11)
    } else if (introCue == 12 && cinematicElapsed >= 13300) {
        introCue = 13
        soundIntroCue(12)
    } else if (introCue == 13 && cinematicElapsed >= 14100) {
        introCue = 14
        soundIntroCue(13)
    } else if (introCue == 14 && cinematicElapsed >= 14900) {
        introCue = 15
        soundIntroCue(14)
    } else if (introCue == 15 && cinematicElapsed >= 15300) {
        introCue = 16
        soundIntroCue(15)
    } else if (introCue == 16 && cinematicElapsed >= 16600) {
        introCue = 17
        soundIntroCue(16)
    } else if (introCue == 17 && cinematicElapsed >= 17800) {
        introCue = 18
        soundIntroCue(17)
    } else if (introCue == 18 && cinematicElapsed >= 18400) {
        introCue = 19
        soundIntroCue(18)
    } else if (introCue == 19 && cinematicElapsed >= 19100) {
        introCue = 20
        soundIntroCue(19)
    }
    if (elapsed >= INTRO_DURATION_MS) finishIntro()
}

function drawIntroStars(elapsed: number, speed: number): void {
    let shift = Math.idiv(elapsed * speed, 90)
    for (let i = 0; i < 34; i++) {
        let layer = 1 + i % 3
        let x = (stableHash(i, 31, 7) + shift * layer) % 160
        let y = 8 + stableHash(i, 17, 19) % 99
        let color = layer == 3 ? COLOR_TEXT : (layer == 2 ? COLOR_CYAN : COLOR_DIM)
        if (speed >= 3 && i % 3 == 0) screen.drawLine(Math.max(0, x - layer * 3), y, x, y, color)
        else screen.setPixel(x, y, color)
    }
}

function drawIntroFilmBars(elapsed: number): void {
    screen.fillRect(0, 0, 160, 7, COLOR_BACKGROUND)
    screen.fillRect(0, 108, 160, 12, COLOR_BACKGROUND)
    screen.drawLine(0, 7, 159, 7, COLOR_BLUE)
    screen.drawLine(0, 107, 159, 107, COLOR_BLUE)
    if (elapsed > 350) printRight(Texts.t(478), 157, 111, COLOR_DIM)
}

function drawIntroFlybyShip(cx: number, cy: number, scale: number): void {
    let noseX = cx + 10 * scale
    let tailX = cx - 8 * scale
    screen.fillTriangle(noseX, cy, tailX, cy - 5 * scale, tailX, cy + 5 * scale, COLOR_DIM)
    screen.fillTriangle(cx + 2 * scale, cy, cx - 4 * scale, cy - 10 * scale, cx - 1 * scale, cy - 2 * scale,
        COLOR_BLUE)
    screen.fillTriangle(cx + 2 * scale, cy, cx - 4 * scale, cy + 10 * scale, cx - 1 * scale, cy + 2 * scale,
        COLOR_SHADOW)
    screen.fillTriangle(noseX, cy, cx - 1 * scale, cy, tailX, cy + 5 * scale, COLOR_BLUE)
    screen.drawLine(tailX, cy - 5 * scale, noseX, cy, COLOR_TEXT)
    screen.drawLine(tailX, cy + 5 * scale, noseX, cy, COLOR_CYAN)
    screen.fillRect(cx + 2 * scale, cy - scale, 3 * scale, 2 * scale, COLOR_BACKGROUND)
    screen.drawLine(tailX, cy - 2 * scale, tailX - 6 * scale, cy - 2 * scale, COLOR_ORANGE)
    screen.drawLine(tailX, cy + 2 * scale, tailX - 6 * scale, cy + 2 * scale, COLOR_YELLOW)
}

function drawIntroBattleShip(cx: number, cy: number, scale: number): void {
    screen.fillTriangle(cx, cy - 9 * scale, cx - 8 * scale, cy + 7 * scale, cx + 8 * scale, cy + 7 * scale,
        COLOR_DIM)
    screen.fillTriangle(cx, cy - 5 * scale, cx, cy + 8 * scale, cx + 8 * scale, cy + 7 * scale, COLOR_BLUE)
    screen.fillTriangle(cx - 2 * scale, cy, cx - 11 * scale, cy + 5 * scale, cx - 4 * scale, cy + 5 * scale,
        COLOR_METAL)
    screen.fillTriangle(cx + 2 * scale, cy, cx + 11 * scale, cy + 5 * scale, cx + 4 * scale, cy + 5 * scale,
        COLOR_METAL)
    screen.drawLine(cx, cy - 9 * scale, cx, cy + 7 * scale, COLOR_CYAN)
    screen.fillRect(cx - scale, cy - 3 * scale, 3 * scale, 3 * scale, COLOR_BACKGROUND)
    screen.drawLine(cx - 4 * scale, cy + 7 * scale, cx - 4 * scale, cy + 12 * scale, COLOR_ORANGE)
    screen.drawLine(cx + 4 * scale, cy + 7 * scale, cx + 4 * scale, cy + 12 * scale, COLOR_YELLOW)
}

function drawIntroEnemy(cx: number, cy: number, scale: number): void {
    screen.fillTriangle(cx, cy + 6 * scale, cx - 7 * scale, cy - 5 * scale, cx + 7 * scale, cy - 5 * scale,
        COLOR_RED)
    screen.fillTriangle(cx, cy + 2 * scale, cx - 10 * scale, cy - 2 * scale, cx - 3 * scale, cy - 4 * scale,
        COLOR_PURPLE)
    screen.fillTriangle(cx, cy + 2 * scale, cx + 10 * scale, cy - 2 * scale, cx + 3 * scale, cy - 4 * scale,
        COLOR_PURPLE)
    screen.setPixel(cx, cy, COLOR_YELLOW)
}

function drawIntroLaunchShip(cx: number, cy: number, halfWidth: number, length: number,
    thrust: number): void {
    let noseY = cy - length
    let tailY = cy + Math.idiv(length, 2)
    screen.fillTriangle(cx, noseY, cx - halfWidth, tailY, cx + halfWidth, tailY, COLOR_DIM)
    screen.fillTriangle(cx, noseY + 3, cx, tailY, cx + halfWidth, tailY, COLOR_BLUE)
    screen.fillTriangle(cx - 3, cy, cx - halfWidth - 5, tailY - 3, cx -
        halfWidth + 3, tailY - 4, COLOR_METAL)
    screen.fillTriangle(cx + 3, cy, cx + halfWidth + 5, tailY - 3, cx +
        halfWidth - 3, tailY - 4, COLOR_METAL)
    screen.drawLine(cx, noseY, cx, tailY, COLOR_CYAN)
    screen.fillRect(cx - 2, noseY + Math.idiv(length, 3), 5, 5, COLOR_BACKGROUND)
    screen.drawLine(cx - Math.idiv(halfWidth, 3), tailY, cx - Math.idiv(halfWidth, 3), tailY + thrust,
        COLOR_ORANGE)
    screen.drawLine(cx + Math.idiv(halfWidth, 3), tailY, cx + Math.idiv(halfWidth, 3), tailY + thrust,
        COLOR_YELLOW)
}

function drawIntroStation(cx: number, cy: number, pulse: number): void {
    screen.drawCircle(cx, cy, 13, COLOR_CYAN)
    screen.drawCircle(cx, cy, 10, COLOR_BLUE)
    screen.drawLine(cx - 20, cy, cx + 20, cy, COLOR_DIM)
    screen.drawLine(cx, cy - 16, cx, cy + 16, COLOR_METAL)
    screen.fillRect(cx - 4, cy - 4, 9, 9, COLOR_SHADOW)
    screen.drawRect(cx - 4, cy - 4, 9, 9, COLOR_TEXT)
    screen.fillRect(cx - 25, cy - 3, 8, 7, COLOR_BLUE)
    screen.fillRect(cx + 18, cy - 3, 8, 7, COLOR_BLUE)
    screen.setPixel(cx - 13, cy, pulse == 0 ? COLOR_YELLOW : COLOR_RED)
    screen.setPixel(cx + 13, cy, pulse == 0 ? COLOR_RED : COLOR_YELLOW)
}

function drawIntroRescuePod(cx: number, cy: number): void {
    screen.fillRect(cx - 3, cy - 4, 7, 9, COLOR_DIM)
    screen.drawRect(cx - 3, cy - 4, 7, 9, COLOR_CYAN)
    screen.setPixel(cx, cy - 1, COLOR_GREEN)
    screen.drawLine(cx - 2, cy + 5, cx - 4, cy + 8, COLOR_ORANGE)
    screen.drawLine(cx + 2, cy + 5, cx + 4, cy + 8, COLOR_ORANGE)
}

function drawIntroExplosion(cx: number, cy: number, age: number, maxRadius: number): void {
    let radius = Math.min(maxRadius, 2 + Math.idiv(age, 42))
    screen.fillCircle(cx, cy, radius, COLOR_ORANGE)
    screen.fillCircle(cx, cy, Math.max(1, radius - 4), COLOR_YELLOW)
    screen.setPixel(cx, cy, COLOR_TEXT)
    screen.drawLine(cx - radius - 4, cy, cx + radius + 4, cy, COLOR_RED)
    screen.drawLine(cx, cy - radius - 4, cx, cy + radius + 4, COLOR_ORANGE)
    screen.drawLine(cx - radius, cy - radius, cx + radius, cy + radius, COLOR_YELLOW)
    screen.drawLine(cx + radius, cy - radius, cx - radius, cy + radius, COLOR_YELLOW)
}

function introWorldY(world: number): number {
    return 13 + Math.idiv(WORLD_Y[world] * 58, 110)
}

function drawIntroHistoryRise(sceneTime: number): void {
    if (sceneTime < 80) {
        screen.fill(COLOR_CYAN)
        return
    }
    screen.fill(COLOR_BACKGROUND)
    drawIntroStars(sceneTime, 1)
    let revealed =
        Math.clamp(0, PUBLIC_WORLD_COUNT, Math.idiv((sceneTime - 120) * PUBLIC_WORLD_COUNT, 1550))
    for (let i = 0; i < revealed; i++) {
        let x = WORLD_X[i]
        let y = introWorldY(i)
        if (i % 6 != 0 && i - 1 < revealed)
            screen.drawLine(WORLD_X[i - 1], introWorldY(i - 1), x, y, COLOR_BLUE)
        if (i >= 6 && i % 2 == 0 && i - 6 < revealed)
            screen.drawLine(WORLD_X[i - 6], introWorldY(i - 6), x, y, COLOR_DIM)
        screen.fillCircle(x, y, i % 5 == 0 ? 2 : 1, i % 4 == 0 ? COLOR_YELLOW : COLOR_CYAN)
    }
    if (sceneTime < 1050) {
        introCaption(Texts.t(479), 84, COLOR_GREEN)
        introCaption(Texts.t(480), 96, COLOR_TEXT)
    } else {
        introCaption(Texts.t(481), 90, COLOR_YELLOW)
    }
}

function drawIntroHistoryFall(sceneTime: number): void {
    if (sceneTime < 80) {
        screen.fill(COLOR_RED)
        return
    }
    screen.fill(COLOR_BACKGROUND)
    drawIntroStars(sceneTime, 1)
    for (let i = 0; i < PUBLIC_WORLD_COUNT; i++) {
        let x = WORLD_X[i]
        let y = introWorldY(i)
        let failedAtMs = 350 + stableHash(i, 83, 17) % 1800
        let alive = sceneTime < failedAtMs
        if (i % 6 != 0) {
            let px = WORLD_X[i - 1]
            let py = introWorldY(i - 1)
            if (alive) screen.drawLine(px, py, x, y, COLOR_BLUE)
            else {
                screen.drawLine(px, py, Math.idiv(px + x, 2) - 2, Math.idiv(py + y, 2), COLOR_RED)
                screen.drawLine(Math.idiv(px + x, 2) + 3, Math.idiv(py + y, 2), x, y, COLOR_RUST)
            }
        }
        screen.fillCircle(x, y, i % 5 == 0 ? 2 : 1, alive ? COLOR_CYAN :
            (i % 3 == 0 ? COLOR_RED : COLOR_DIM))
    }
    let scanX = Math.idiv(sceneTime * 180, 3000) - 10
    screen.drawLine(scanX, 8, scanX, 78, COLOR_RED)
    if (sceneTime >= 900 && sceneTime < 2050) drawIntroExplosion(80, 43, sceneTime - 900, 13)
    if (sceneTime < 1000) introCaption(Texts.t(482), 88, COLOR_YELLOW)
    else if (sceneTime < 2050) introCaption(Texts.t(483), 91, COLOR_RED)
    else introCaption(Texts.t(484), 91, COLOR_TEXT)
}

function drawIntroHistoryPirates(sceneTime: number): void {
    if (sceneTime < 80) {
        screen.fill(COLOR_RED)
        return
    }
    screen.fill(COLOR_BACKGROUND)
    drawIntroStars(sceneTime, 2)
    for (let i = 0; i < 9; i++) {
        let routeX = 8 + i * 18
        screen.drawLine(routeX, 78 - i * 5, routeX + 10, 75 - i * 5, i < 5 ? COLOR_DIM : COLOR_RED)
    }
    let shipX = 48 + Math.idiv(sceneTime * 45, 3000)
    drawIntroFlybyShip(shipX, 62, 2)
    let enemyProgress = Math.clamp(0, 1000, Math.idiv((sceneTime - 380) * 1000, 1050))
    let enemy1X = 170 - Math.idiv(enemyProgress * 50, 1000)
    let enemy2X = -12 + Math.idiv(enemyProgress * 47, 1000)
    drawIntroEnemy(enemy1X, 30, 1)
    if (sceneTime >= 650) drawIntroEnemy(enemy2X, 43, 1)
    if (sceneTime >= 1050 && sceneTime < 2100) {
        screen.drawLine(enemy1X - 2, 35, shipX + 8, 55, COLOR_RED)
        screen.drawLine(enemy2X + 2, 48, shipX - 7, 58, COLOR_ORANGE)
        let shield = 19 + Math.idiv(sceneTime, 90) % 3
        drawPreviewDiamond(shipX, 62, shield, 13, COLOR_CYAN)
    }
    if (sceneTime >= 2050 && sceneTime < 2750) drawIntroExplosion(enemy2X, 43, sceneTime - 2050, 11)
    if (sceneTime < 950) introCaption(Texts.t(485), 13, COLOR_DIM)
    else if (sceneTime < 2050) introCaption(Texts.t(486), 13, COLOR_RED)
    else introCaption(Texts.t(487), 93, COLOR_YELLOW)
}

function drawIntroHistoryLegacy(sceneTime: number): void {
    if (sceneTime < 80) {
        screen.fill(COLOR_CYAN)
        return
    }
    if (sceneTime >= 2880) {
        screen.fill(COLOR_BACKGROUND)
        return
    }
    screen.fill(COLOR_BACKGROUND)
    fillHangarQuad(0, 8, 159, 8, 124, 107, 36, 107, COLOR_BLUE)
    screen.fillTriangle(80, 12, 35, 107, 125, 107, COLOR_SHADOW)
    screen.fillRect(0, 75, 160, 33, COLOR_SHADOW)
    screen.drawLine(80, 50, 15, 107, COLOR_DIM)
    screen.drawLine(80, 50, 145, 107, COLOR_DIM)
    screen.drawLine(80, 50, 80, 107, COLOR_METAL)
    screen.drawLine(50, 76, 110, 76, COLOR_DIM)
    screen.drawLine(31, 92, 129, 92, COLOR_DIM)
    let thrust = sceneTime >= 2150 ? 12 : (sceneTime >= 1500 ? 5 : 1)
    drawIntroLaunchShip(80, 67, 19, 25, thrust)
    let pulse = Math.idiv(sceneTime, 180) % 2
    screen.fillRect(21, 93, 3, 3, pulse == 0 ? COLOR_YELLOW : COLOR_CYAN)
    screen.fillRect(136, 93, 3, 3, pulse == 0 ? COLOR_CYAN : COLOR_YELLOW)
    screen.fillRect(5, 29, 31, 18, COLOR_BACKGROUND)
    screen.drawRect(5, 29, 31, 18, COLOR_CYAN)
    printGameText("LUMA", 9, 32, COLOR_GREEN)
    introCaption(Texts.t(488), 40, COLOR_YELLOW)
    if (sceneTime < 950) introCaption(Texts.t(489), 13, COLOR_TEXT)
    else if (sceneTime < 1850) introCaption(Texts.t(490), 13, COLOR_YELLOW)
    else {
        screen.fillRect(14, 86, 132, 20, COLOR_BACKGROUND)
        if (sceneTime < 2450) introCaption(Texts.t(491), 91, COLOR_TEXT)
        else introCaption(Texts.t(492), 91, COLOR_YELLOW)
    }
}

function drawIntroPrologue(sceneTime: number): void {
    if (sceneTime < 3000) drawIntroHistoryRise(sceneTime)
    else if (sceneTime < 6000) drawIntroHistoryFall(sceneTime - 3000)
    else if (sceneTime < 9000) drawIntroHistoryPirates(sceneTime - 6000)
    else drawIntroHistoryLegacy(sceneTime - 9000)
}

function drawIntroHangar(sceneTime: number): void {
    screen.fill(COLOR_BACKGROUND)
    drawIntroStars(sceneTime, 1)

    // A huge launch bay with a door that opens into space.
    fillHangarQuad(0, 8, 159, 8, 119, 35, 40, 35, COLOR_BLUE)
    screen.drawLine(0, 15, 159, 15, COLOR_METAL)
    screen.drawLine(15, 25, 145, 25, COLOR_METAL)
    screen.drawLine(0, 8, 48, 35, COLOR_DIM)
    screen.drawLine(40, 8, 64, 35, COLOR_DIM)
    screen.drawLine(80, 8, 80, 35, COLOR_DIM)
    screen.drawLine(120, 8, 96, 35, COLOR_DIM)
    screen.drawLine(159, 8, 112, 35, COLOR_DIM)
    screen.fillRect(40, 20, 80, 45, COLOR_RUST)
    screen.fillRect(46, 24, 68, 38, COLOR_BACKGROUND)
    for (let i = 0; i < 8; i++) {
        screen.setPixel(51 + stableHash(i, 9, 4) % 58, 28 + stableHash(i, 4, 12) % 27,
            i % 3 == 0 ? COLOR_CYAN : COLOR_TEXT)
    }

    let doorOpen = Math.clamp(0, 27, Math.idiv((sceneTime - 220) * 27, 1400))
    let doorWidth = 34 - doorOpen
    screen.fillRect(46, 24, doorWidth, 38, COLOR_SHADOW)
    screen.fillRect(114 - doorWidth, 24, doorWidth, 38, COLOR_SHADOW)
    screen.drawLine(46 + doorWidth, 24, 46 + doorWidth, 61, COLOR_CYAN)
    screen.drawLine(113 - doorWidth, 24, 113 - doorWidth, 61, COLOR_CYAN)
    screen.drawRect(40, 20, 80, 45, COLOR_DIM)

    screen.fillRect(0, 62, 160, 46, COLOR_SHADOW)
    fillHangarQuad(68, 62, 92, 62, 136, 108, 24, 108, COLOR_METAL)
    fillHangarQuad(75, 62, 85, 62, 111, 108, 49, 108, COLOR_BLUE)
    screen.drawLine(80, 61, 0, 108, COLOR_DIM)
    screen.drawLine(80, 61, 32, 108, COLOR_DIM)
    screen.drawLine(80, 61, 80, 108, COLOR_DIM)
    screen.drawLine(80, 61, 128, 108, COLOR_DIM)
    screen.drawLine(80, 61, 159, 108, COLOR_DIM)
    screen.drawLine(58, 74, 102, 74, COLOR_DIM)
    screen.drawLine(40, 88, 120, 88, COLOR_DIM)
    screen.drawLine(21, 103, 139, 103, COLOR_DIM)

    let launchProgress = Math.clamp(0, 1000, Math.idiv((sceneTime - 900) * 1000, 2200))
    let shipY = 92 - Math.idiv(launchProgress * 43, 1000)
    let shipWidth = 18 - Math.idiv(launchProgress * 10, 1000)
    let shipLength = 22 - Math.idiv(launchProgress * 12, 1000)
    let thrust = 5 + Math.idiv(launchProgress * 12, 1000)
    drawIntroLaunchShip(80, shipY, shipWidth, shipLength, thrust)

    let lightPhase = Math.idiv(sceneTime, 150) % 2
    screen.fillRect(44, 96, 3, 2, lightPhase == 0 ? COLOR_YELLOW : COLOR_RED)
    screen.fillRect(113, 96, 3, 2, lightPhase == 0 ? COLOR_RED : COLOR_YELLOW)
    screen.fillRect(59, 80, 2, 2, lightPhase == 0 ? COLOR_CYAN : COLOR_YELLOW)
    screen.fillRect(99, 80, 2, 2, lightPhase == 0 ? COLOR_YELLOW : COLOR_CYAN)
    if (sceneTime < 1050) introCaption(Texts.t(493), 12, COLOR_GREEN)
    else if (sceneTime < 2300) introCaption(Texts.t(494), 12, COLOR_YELLOW)
    else introCaption(Texts.t(495), 12, COLOR_CYAN)

    // Two beams in the foreground stand in front of the ship. This makes the picture look deeper.
    screen.fillRect(0, 31, 7, 77, COLOR_RUST)
    screen.fillRect(153, 31, 7, 77, COLOR_RUST)
    screen.drawLine(0, 42, 7, 49, COLOR_METAL)
    screen.drawLine(153, 49, 159, 42, COLOR_METAL)
    if (sceneTime >= 3180 && sceneTime < 3240) screen.fill(COLOR_CYAN)
    else if (sceneTime >= 3240) screen.fill(COLOR_TEXT)
}

// The Calliope Hacker at the desk, seen from behind: hood up, turquoise sneakers, a Calliope mini with GameKit
// and a sleeping cat. The picture is drawn with the colors of this game.
const HACKER_CARD = img`
    . . . . . . . . . . . . . . . . f f f f f . . . . . . . . . . . . . . . 8 . . . . . . . . . . . . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . f f f f f f f 9 . . . . . 8 . 8 . c c c c c c c c c c c c c c c c c c c c c c . . . . . . . . . . .
    . . . . . . . . . . . . . f c c f f f f f f 9 . 8 . 8 . 8 . 8 f f f f f f f f f f f f f f f f f f f f f f . . . . . . . . . . .
    . . . . . . . . . . . . f c f f f f f f f f f 9 . 8 . 8 8 8 8 f f f f f f f f f f f f f f f f f f f f f f . . . . . . . . . . .
    . . . . . . . . . . . . f c f f f f f f f f f 9 8 8 8 8 8 8 8 f f f 9 9 9 9 9 9 f f f f f f f f f f f f f . 8 . . . . . . . . .
    . . . . . . . . . . . f c f f f f f f f f f f f 9 8 8 8 8 8 8 f f f f f f f f f f f f f f f f f f f f f f 8 . 8 . . . . . . . .
    . . . . . . . . . . . f f f f f f f f f f f f f 9 8 8 8 8 8 8 f f f f f 5 5 5 5 5 5 5 5 5 f f f f f f f f . 8 . 8 . . . . . . .
    . . . . . . . . . . . f f f f f f f f f f f f f 9 8 8 8 8 8 8 f f f f f f f f f f f f f f f f f f f f f f 8 8 8 . 8 . . . . . .
    . . . . . . . . . . . f f f f f f f f f f f f f 9 8 8 8 8 8 8 f f f f f 6 6 6 6 6 f f f f f f f f f f f f 8 8 8 8 . 8 . . . . .
    . . . . . . . . . . . f f f f f f f f f f f f f 9 8 8 8 8 8 8 f f f f f f f f f f f f f f f f f f f f f f 8 8 5 5 8 . 8 5 5 . .
    . . . . . . . . . . . c f f f f f f f f f f f f 9 8 8 8 8 8 8 f f f f f f f 2 2 2 2 2 2 2 2 f f f f f f f 8 8 5 8 8 8 8 8 5 . .
    . . . . . . . . . . f f c f f f f f f f f f f f f 9 8 8 8 8 8 f f f f f f f f f f f f f f f f f f f f f f 8 8 8 8 8 8 8 8 8 8 .
    . . . . . . . . . f f f f c c f f f f f f f f f f f 9 8 8 8 8 f f f f f 9 9 9 9 9 9 9 9 9 9 9 f f f f f f 5 8 8 8 2 8 2 8 8 8 5
    . . . . . . f f f f f f f f f c c c c f f f f f f f f 9 8 8 8 f f f f f f f f f f f f f f f f f f f f f f 5 8 8 8 2 2 2 8 8 8 5
    . . . . . f 6 6 6 6 6 6 f f f f f f f f f f f f f f f f 9 8 8 f f f 8 8 8 8 f f f f f f f f f f f f f f f 8 8 8 8 8 2 8 8 8 8 .
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f f f f f 9 8 f f f f f f f f f f f f f f f f f f f f f f 8 8 5 8 8 8 8 8 5 . 8
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f c f f f f 9 f f f f f f f f f f f f f f f f f f f f f f 8 8 5 5 8 f 8 5 5 8 .
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f f c f f f f 9 8 8 8 8 8 8 8 8 8 c c c 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 . 8 . .
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f f f c f f f f f 4 4 8 8 8 c c c c c c c c c 8 8 8 8 8 8 8 8 8 8 8 8 . 8 . 8 .
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f f f f c f f f f 4 4 f f f e e e e e e e e e e e e e e e e e e e e e e e e e e
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f f f f f 8 c 9 c 6 c 2 c f e e e e e e e e e e f f f f f f f f f f f f e e e e
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f f f f e e e e e e e e e e e e e e e e e e e f f 1 f f b c b f 2 f 2 f f e e e
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f f f f e e e e e e e e e e e e e e e e e e e f 1 1 1 f f f f f 2 f 2 f f e e e
    . . . . f 6 6 6 6 6 6 6 6 f f f f f f f f f f f f f f f f e e e e e e e e e e e e e e e e e e e f 1 f f f f f f f f f f e e e e
    . . . . . f 6 6 6 6 6 6 f f f f f f f f f f f f f f f f f f f f e e e e e e e e e e e e e e e e e e e e e e e e e e e e e e e e
    . . . . . f 6 6 6 6 6 6 6 f f f f f f f f f f f f f f f f f f f f c e e e e e e e e e e e e e e e e e e e e e e e e e e e e e e
    . . . . . . f 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 f f f f f f f f f f f f 8 8 8 8 8 8 8 8 8 8 8 c c 8 8 . 8 . 8 . 8 . . c b b b b b b
    . . . . . . . f f f f f f f f f f f f f f f f f f f f f f f f f f f 8 8 8 8 8 8 8 8 8 8 8 c c 8 . 8 . 8 . . . . . c b b b b b b
    . . . . . . . . . . . . . . . . . f f . f f f f f . 8 f f f f f c . 8 . 8 . 8 . 8 . 8 . 8 c c . 8 . . . . . . . . c b b b b b b
    . . . . . . . . . . . . . . . . . f f . f f f f f . . 8 f f f f c 8 . 8 . 8 . 8 . 8 . 8 . c c . . 6 6 6 6 6 . . . c b c c c c b
    . . . . . . . . . . . . . . . . . f f . f f f f f . . . f f f f c . . . 8 . . . . . . . . c c . 6 6 6 6 6 6 6 . . c b b b b b b
    . . . . . . . . . . . . . . . . . f f 6 6 6 6 6 6 6 . . f f f f c . . . . . . . . . . . . c c . 6 6 f f f 6 6 . . c b b b b b b
    . . f . . . f . . . . . . . . . . f f 6 1 6 6 6 6 6 . . f f f f c . . . . . . . . . . . . c c . 6 6 6 6 6 6 6 . . c b b b b b b
    . . f f . f f . . . . . . . . . . f f 1 1 1 1 1 1 1 . . f f f f c . . . . . . . . . . . . c c . 6 6 6 6 6 6 6 . . c b c c c c b
    . f 1 1 1 1 1 f 1 1 . . . . . . . f f . . . . . . . . 6 6 6 6 6 6 6 6 . . . . . . . . . . c c . 6 6 c c c 6 6 . . c b b b b b b
    . 1 1 f 1 1 1 1 1 1 1 f f f f f f f f f f f f f f . 6 6 1 6 6 6 6 6 6 6 . . . . . . . . . c c . 6 6 6 6 6 6 6 . . c b b b b b b
    f 1 1 1 1 1 1 f f 1 1 . . . . f f . . . . . . f f . 1 1 1 1 1 1 1 1 1 1 . . . . . . . . . c c . 6 6 6 6 6 6 6 . . c b b b b b b
    6 6 6 6 6 6 6 6 6 6 6 . . . . c c . . . . . . c c . . . . . . . . . . . . . . . . . . . . c c . . 6 6 6 6 6 . . . c b c c c c b
    . 6 6 6 6 6 6 6 6 6 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . c b b b b b b
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . c b b b b b b
`

// The studio card "CALLIOPE HACKER PRESENTS". It is shown after the arrival, right before the title reveal.
function drawIntroOpening(elapsed: number): void {
    screen.fill(COLOR_BACKGROUND)
    drawIntroStars(elapsed, 1)
    screen.fillRect(47, 9, 66, 42, COLOR_BLUE)
    screen.drawTransparentImage(HACKER_CARD, 48, 10)
    let halfLine = Math.clamp(0, 59, Math.idiv((elapsed - 120) * 59, 500))
    screen.drawLine(80 - halfLine, 53, 80 + halfLine, 53, COLOR_CYAN)
    screen.drawLine(80 - halfLine, 80, 80 + halfLine, 80, COLOR_BLUE)
    if (elapsed >= 280) {
        printGameText("CALLIOPE HACKER", 35, 60, COLOR_TEXT)
        let visible = Math.clamp(0, 90, Math.idiv((elapsed - 280) * 90, 620))
        if (visible < 90) screen.fillRect(35 + visible, 59, 90 - visible, 10, COLOR_BACKGROUND)
    }
    if (elapsed >= 930) introCaption(Texts.t(496), 72, COLOR_GREEN)
    if (elapsed >= 1600) {
        let wipe = Math.clamp(0, 80, Math.idiv((elapsed - 1600) * 80, 200))
        screen.fillRect(0, 8, wipe, 99, COLOR_BACKGROUND)
        screen.fillRect(160 - wipe, 8, wipe, 99, COLOR_BACKGROUND)
    }
}

function drawIntroOrbit(sceneTime: number): void {
    screen.fill(COLOR_BACKGROUND)
    drawIntroStars(sceneTime, 2)

    // A blue world with its orbital trade station fills the whole picture.
    screen.fillCircle(137, 109, 51, COLOR_CYAN)
    screen.fillCircle(139, 110, 47, COLOR_BLUE)
    screen.fillTriangle(113, 88, 128, 84, 124, 99, COLOR_SHADOW)
    screen.fillTriangle(139, 77, 158, 80, 150, 93, COLOR_SHADOW)
    screen.fillTriangle(142, 104, 159, 98, 159, 119, COLOR_SHADOW)
    screen.drawLine(100, 91, 158, 79, COLOR_DIM)
    screen.drawLine(94, 99, 159, 87, COLOR_METAL)
    screen.setPixel(116, 80, COLOR_YELLOW)
    screen.setPixel(127, 73, COLOR_YELLOW)
    screen.setPixel(151, 69, COLOR_YELLOW)
    drawIntroStation(113, 34, Math.idiv(sceneTime, 180) % 2)
    screen.drawLine(113, 48, 117, 64, COLOR_DIM)
    screen.drawLine(117, 64, 121, 75, COLOR_CYAN)

    let progress = Math.clamp(0, 1000, Math.idiv(sceneTime * 1000, 3100))
    let shipX = -18 + Math.idiv(progress * 202, 1000)
    let shipY = 45 + Math.idiv(progress * 23, 1000)
    let shipScale = 1 + Math.min(2, Math.idiv(progress, 350))
    drawIntroFlybyShip(shipX, shipY, shipScale)

    if (sceneTime >= 350 && sceneTime < 1850) {
        screen.fillRect(5, 91, 150, 10, COLOR_BACKGROUND)
        screen.drawLine(5, 90, 154, 90, COLOR_BLUE)
        introCaption(Texts.t(497), 94, COLOR_TEXT)
    } else if (sceneTime >= 1850 && sceneTime < 2900) {
        screen.fillRect(5, 91, 150, 10, COLOR_BACKGROUND)
        screen.drawLine(5, 90, 154, 90, COLOR_BLUE)
        introCaption(Texts.t(498), 94, COLOR_YELLOW)
    }
    if (sceneTime >= 2650) {
        let alert = Math.idiv(sceneTime, 110) % 2 == 0 ? COLOR_RED : COLOR_YELLOW
        screen.fillRect(145, 18, 3, 3, alert)
        screen.fillRect(151, 25, 3, 3, alert)
        screen.fillRect(142, 32, 3, 3, alert)
    }
}

function drawIntroWarp(sceneTime: number): void {
    for (let i = 0; i < 24; i++) {
        let edgeX = stableHash(i, 71, 13) % 160
        let edgeY = 8 + stableHash(i, 43, 29) % 99
        let phase = (Math.idiv(sceneTime, 42) + i * 3) % 12
        let start = 2 + phase
        let end = Math.min(14, start + 3)
        let x0 = 80 + Math.idiv((edgeX - 80) * start, 14)
        let y0 = 58 + Math.idiv((edgeY - 58) * start, 14)
        let x1 = 80 + Math.idiv((edgeX - 80) * end, 14)
        let y1 = 58 + Math.idiv((edgeY - 58) * end, 14)
        screen.drawLine(x0, y0, x1, y1, i % 3 == 0 ? COLOR_CYAN : COLOR_DIM)
    }
}

function drawIntroBattle(sceneTime: number): void {
    if (sceneTime >= 3900) {
        if (sceneTime < 4010) screen.fill(COLOR_TEXT)
        else if (sceneTime < 4120) screen.fill(COLOR_CYAN)
        else screen.fill(COLOR_BACKGROUND)
        return
    }

    screen.fill(COLOR_BACKGROUND)
    drawIntroStars(sceneTime, 3)
    let shakeX = 0
    let shakeY = 0
    if (sceneTime >= 850 && sceneTime < 1750) {
        shakeX = stableHash(Math.idiv(sceneTime, 35), 3, 7) % 3 - 1
        shakeY = stableHash(Math.idiv(sceneTime, 41), 5, 9) % 3 - 1
    }

    let heroX = 80
    if (sceneTime >= 2100 && sceneTime < 2750) heroX += Math.idiv((sceneTime - 2100) * 16, 650)
    else if (sceneTime >= 2750 && sceneTime < 3400) heroX += 16 - Math.idiv((sceneTime - 2750) * 16, 650)
    let heroY = 80

    let enemy1Progress = Math.clamp(0, 1000, Math.idiv(sceneTime * 1000, 700))
    let enemy1X = 168 - Math.idiv(enemy1Progress * 45, 1000)
    let enemy1Y = 22 + Math.idiv(enemy1Progress * 14, 1000)
    let enemy2Progress = Math.clamp(0, 1000, Math.idiv((sceneTime - 450) * 1000, 750))
    let enemy2X = -15 + Math.idiv(enemy2Progress * 52, 1000)
    let enemy2Y = 29 + Math.idiv(enemy2Progress * 15, 1000)
    let enemy3Progress = Math.clamp(0, 1000, Math.idiv((sceneTime - 2200) * 1000, 800))
    let enemy3X = 132 - Math.idiv(enemy3Progress * 27, 1000)
    let enemy3Y = -12 + Math.idiv(enemy3Progress * 41, 1000)

    if (sceneTime < 1900) drawIntroEnemy(enemy1X, enemy1Y, 1)
    if (sceneTime >= 450 && sceneTime < 3200) drawIntroEnemy(enemy2X, enemy2Y, 1)
    if (sceneTime >= 2200) drawIntroEnemy(enemy3X, enemy3Y, sceneTime >= 3450 ? 2 : 1)
    drawIntroBattleShip(heroX + shakeX, heroY + shakeY, 2)

    if (sceneTime >= 700 && sceneTime < 1450) {
        screen.drawLine(enemy1X, enemy1Y + 5, heroX - 5 + shakeX, heroY - 14 + shakeY, COLOR_RED)
        screen.drawLine(enemy1X + 3, enemy1Y + 5, heroX + 6 + shakeX, heroY - 13 + shakeY, COLOR_ORANGE)
        if (sceneTime >= 950)
            screen.drawLine(enemy2X, enemy2Y + 5, heroX - 10 + shakeX, heroY - 9 + shakeY, COLOR_RED)
    }
    if (sceneTime >= 850 && sceneTime < 1700) {
        let shieldPulse = Math.idiv(sceneTime, 65) % 3
        drawPreviewDiamond(heroX + shakeX, heroY - 2 + shakeY, 24 +
            shieldPulse, 16 + shieldPulse, COLOR_CYAN)
        drawPreviewDiamond(heroX + shakeX, heroY - 2 + shakeY, 30 +
            shieldPulse, 20 + shieldPulse,
            shieldPulse == 0 ? COLOR_TEXT : COLOR_BLUE)
    }
    if (sceneTime >= 1450 && sceneTime < 2200) {
        screen.drawLine(heroX - 7 + shakeX, heroY - 17 + shakeY, enemy1X - 2, enemy1Y + 6, COLOR_CYAN)
        screen.drawLine(heroX + 7 + shakeX, heroY - 17 + shakeY, enemy1X + 2, enemy1Y + 6, COLOR_YELLOW)
    }
    if (sceneTime >= 1900 && sceneTime < 2600) drawIntroExplosion(123, 36, sceneTime - 1900, 15)

    if (sceneTime >= 2250 && sceneTime < 3500) {
        drawIntroRescuePod(74, 39)
        if (sceneTime >= 2600) {
            screen.drawLine(heroX - 4, heroY - 14, 71, 47, COLOR_GREEN)
            screen.drawLine(heroX + 4, heroY - 14, 77, 47, COLOR_CYAN)
        }
    }
    if (sceneTime >= 2350 && sceneTime < 2900)
        screen.drawLine(enemy2X, enemy2Y + 5, heroX - 7, heroY - 13, COLOR_RED)
    if (sceneTime >= 2880 && sceneTime < 3380) {
        screen.drawLine(heroX - 6, heroY - 17, enemy2X - 2, enemy2Y + 6, COLOR_CYAN)
        screen.drawLine(heroX + 6, heroY - 17, enemy2X + 2, enemy2Y + 6, COLOR_YELLOW)
    }
    if (sceneTime >= 3200 && sceneTime < 3890) drawIntroExplosion(37, 44, sceneTime - 3200, 14)
    if (sceneTime >= 3450 && sceneTime < 3890) {
        screen.drawLine(enemy3X - 4, enemy3Y + 8, heroX, heroY - 15, COLOR_RED)
        screen.drawLine(enemy3X + 4, enemy3Y + 8, heroX + 8, heroY - 13, COLOR_ORANGE)
    }

    if (sceneTime < 850) introCaption(Texts.t(499), 12, COLOR_RED)
    else if (sceneTime >= 2250 && sceneTime < 3500) introCaption(Texts.t(500), 12, COLOR_CYAN)
    else if (sceneTime >= 3500) introCaption(Texts.t(501), 12, COLOR_YELLOW)
}

function drawIntroHyperjump(sceneTime: number): void {
    if (sceneTime < 80) {
        screen.fill(COLOR_CYAN)
        return
    }
    if (sceneTime >= 2600) {
        if (sceneTime < 2700) screen.fill(COLOR_TEXT)
        else screen.fill(COLOR_CYAN)
        return
    }

    screen.fill(COLOR_BACKGROUND)
    let progress = Math.clamp(0, 1000, Math.idiv(sceneTime * 1000, 2600))
    drawIntroWarp(sceneTime * (2 + Math.idiv(progress, 330)))
    for (let i = 0; i < 3; i++) {
        let ringPhase = (progress + i * 330) % 1000
        let ring = 8 + Math.idiv(ringPhase * 66, 1000)
        let ringHeight = 5 + Math.idiv(ring * 3, 5)
        drawPreviewDiamond(80, 56, ring, ringHeight, i == 0 ? COLOR_TEXT :
            (i == 1 ? COLOR_CYAN : COLOR_BLUE))
    }

    let shipY = 82 - Math.idiv(progress * 25, 1000)
    let shipWidth = 12 - Math.idiv(progress * 6, 1000)
    let shipLength = 16 - Math.idiv(progress * 8, 1000)
    drawIntroLaunchShip(80, shipY, shipWidth, shipLength, 8 +
        Math.idiv(progress * 8, 1000))
    if (sceneTime >= 250 && sceneTime < 1250) introCaption(Texts.t(502), 14, COLOR_GREEN)
    else if (sceneTime >= 1250) introCaption(Texts.t(503), 14, COLOR_YELLOW)
}

function drawIntroArrival(sceneTime: number): void {
    if (sceneTime < 90) {
        screen.fill(COLOR_TEXT)
        return
    }
    if (sceneTime < 170) {
        screen.fill(COLOR_CYAN)
        return
    }

    screen.fill(COLOR_BACKGROUND)
    drawIntroStars(sceneTime, 1)

    // Sunrise over a planet, below a gigantic orbital station.
    screen.fillCircle(80, 147, 74, COLOR_ORANGE)
    screen.drawCircle(80, 147, 75, COLOR_YELLOW)
    screen.drawCircle(80, 147, 72, COLOR_RUST)
    screen.drawLine(23, 94, 137, 94, COLOR_RUST)
    screen.drawLine(16, 103, 144, 103, COLOR_YELLOW)

    screen.drawLine(10, 42, 35, 29, COLOR_CYAN)
    screen.drawLine(35, 29, 80, 22, COLOR_DIM)
    screen.drawLine(80, 22, 125, 29, COLOR_DIM)
    screen.drawLine(125, 29, 150, 42, COLOR_CYAN)
    screen.drawLine(150, 42, 125, 56, COLOR_BLUE)
    screen.drawLine(125, 56, 80, 62, COLOR_DIM)
    screen.drawLine(80, 62, 35, 56, COLOR_DIM)
    screen.drawLine(35, 56, 10, 42, COLOR_BLUE)
    screen.drawLine(24, 42, 45, 34, COLOR_METAL)
    screen.drawLine(45, 34, 80, 29, COLOR_METAL)
    screen.drawLine(80, 29, 115, 34, COLOR_METAL)
    screen.drawLine(115, 34, 136, 42, COLOR_METAL)
    screen.drawLine(136, 42, 115, 50, COLOR_METAL)
    screen.drawLine(115, 50, 80, 55, COLOR_METAL)
    screen.drawLine(80, 55, 45, 50, COLOR_METAL)
    screen.drawLine(45, 50, 24, 42, COLOR_METAL)
    screen.fillRect(77, 12, 7, 60, COLOR_SHADOW)
    screen.drawRect(77, 12, 7, 60, COLOR_TEXT)
    screen.drawLine(18, 107, 70, 59, COLOR_CYAN)
    screen.drawLine(142, 107, 90, 59, COLOR_CYAN)
    screen.drawLine(48, 107, 75, 62, COLOR_BLUE)
    screen.drawLine(112, 107, 85, 62, COLOR_BLUE)

    let lightColor = Math.idiv(sceneTime, 140) % 2 == 0 ? COLOR_YELLOW : COLOR_CYAN
    screen.setPixel(24, 42, lightColor)
    screen.setPixel(45, 34, lightColor)
    screen.setPixel(115, 34, lightColor)
    screen.setPixel(136, 42, lightColor)
    screen.setPixel(80, 22, COLOR_RED)
    screen.setPixel(80, 62, COLOR_GREEN)

    let arrivalProgress = Math.clamp(0, 1000, Math.idiv((sceneTime - 250) * 1000, 1900))
    let shipY = 101 - Math.idiv(arrivalProgress * 36, 1000)
    drawIntroLaunchShip(80, shipY, 6, 8, 5)
    if (sceneTime >= 750 && sceneTime < 1500) {
        screen.fillRect(38, 79, 84, 12, COLOR_BACKGROUND)
        introCaption(Texts.t(504), 81, COLOR_YELLOW)
    } else if (sceneTime >= 1500) {
        screen.fillRect(20, 93, 120, 10, COLOR_BACKGROUND)
        introCaption(Texts.t(505), 96, COLOR_TEXT)
    }
}

function drawIntroTitleReveal(sceneTime: number): void {
    if (sceneTime < 90) {
        screen.fill(COLOR_TEXT)
        return
    }
    if (sceneTime < 170) {
        screen.fill(COLOR_CYAN)
        return
    }

    if (sceneTime >= 2300) {
        drawTitle()
        return
    }

    // From here on, the stars and the logo use exactly the coordinates of the title screen.
    screen.fill(COLOR_BACKGROUND)
    for (let i = 0; i < 22; i++) {
        let x = stableHash(i, 3, 9) % 160
        let y = stableHash(i, 7, 2) % 105
        screen.setPixel(x, y, i % 4 == 0 ? COLOR_CYAN : COLOR_DIM)
    }
    if (sceneTime < 500) {
        let warpRing = Math.max(2, 37 - Math.idiv((sceneTime - 170) * 35, 330))
        screen.drawCircle(80, 57, warpRing, COLOR_CYAN)
        if (warpRing > 5) screen.drawCircle(80, 57, warpRing - 3, COLOR_BLUE)
    }
    let halfLine = Math.clamp(0, 58, Math.idiv((sceneTime - 180) * 58, 520))
    screen.drawLine(80 - halfLine, 35, 80 + halfLine, 35, COLOR_CYAN)
    screen.drawLine(80 - halfLine, 70, 80 + halfLine, 70, COLOR_CYAN)

    if (sceneTime >= 330) printGameText("CALLIOPE HACKER", 35, 11, COLOR_GREEN)
    if (sceneTime >= 500) {
        drawGameTitle(41, 14)
        screen.drawLine(68, 78, 80, 72, COLOR_GREEN)
        screen.drawLine(80, 72, 92, 78, COLOR_GREEN)
        screen.drawLine(92, 78, 80, 84, COLOR_GREEN)
        screen.drawLine(80, 84, 68, 78, COLOR_GREEN)
    }
    if (sceneTime >= 1180 && sceneTime < 2100) introCaption(Texts.t(506), 89, COLOR_TEXT)
    if (sceneTime >= 1750 && sceneTime < 2100) introCaption(Texts.t(507), 99, COLOR_YELLOW)
}

function drawIntro(): void {
    let elapsed = introElapsed()
    if (elapsed < INTRO_OPEN_END_MS) drawIntroOpening(elapsed)
    else if (elapsed < INTRO_PROLOGUE_END_MS) drawIntroPrologue(elapsed - INTRO_OPEN_END_MS)
    else if (elapsed < INTRO_HANGAR_END_MS) drawIntroHangar(elapsed - INTRO_PROLOGUE_END_MS)
    else if (elapsed < INTRO_ORBIT_END_MS) drawIntroOrbit(elapsed - INTRO_HANGAR_END_MS)
    else if (elapsed < INTRO_BATTLE_END_MS) drawIntroBattle(elapsed - INTRO_ORBIT_END_MS)
    else if (elapsed < INTRO_WARP_END_MS) drawIntroHyperjump(elapsed - INTRO_BATTLE_END_MS)
    else if (elapsed < INTRO_ARRIVAL_END_MS) drawIntroArrival(elapsed - INTRO_WARP_END_MS)
    else drawIntroTitleReveal(elapsed - INTRO_ARRIVAL_END_MS)
    // The skip hint follows the playing time, so it stays on screen when the studio card begins.
    if (elapsed < INTRO_ARRIVAL_END_MS + 2300) drawIntroFilmBars(introPlayTime())
}

function introCaption(text: string, y: number, color: number): void {
    printGameText(text, Math.max(2, Math.idiv(160 - text.length * 6, 2)), y, color)
}
