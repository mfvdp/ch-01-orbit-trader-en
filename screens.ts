// All screens and menus, and what the buttons do on each of them.
const COLOR_BACKGROUND = 15
const COLOR_TEXT = 1
const COLOR_RED = 2
const COLOR_ORANGE = 4
const COLOR_YELLOW = 5
const COLOR_GREEN = 7
const COLOR_BLUE = 8
const COLOR_CYAN = 9
const COLOR_PURPLE = 10
const COLOR_METAL = 11
const COLOR_SHADOW = 12
const COLOR_DIM = 13
const COLOR_RUST = 14

const HANGAR_ITEMS = hex`f630f7f8f9fafbfcfdfe`
const TITLE_ITEM_COUNT = 10
const OUTFIT_SHIP_INDEX = UPGRADE_COUNT + 2
const OUTFIT_NAME_INDEX = OUTFIT_SHIP_INDEX + 1
const OUTFIT_PAINT_INDEX = OUTFIT_NAME_INDEX + 1
const OUTFIT_MISSILE_INDEX = OUTFIT_PAINT_INDEX + 1
const OUTFIT_MINE_INDEX = OUTFIT_MISSILE_INDEX + 1
const OUTFIT_ITEM_COUNT = OUTFIT_MINE_INDEX + 1
const STATUS_PAGE_COUNT = 7
const STATUS_SHIP = 0
const STATUS_FACTIONS = 1
const STATUS_LOGBOOK = 2
const STATUS_ACHIEVEMENTS = 3
const STATUS_OPTIONS = 4
const STATUS_HARDWARE = 5
const STATUS_DEVELOPER = 6
let mapCursorWorld = 0
let outfitterInstalledId = -1
let outfitterRolePreview = ShipRole.Trader
let marketFeedbackText = ""
let marketFeedbackColor = COLOR_DIM
let marketFeedbackUntilMs = 0
let blackMarketOpen = false
let missionNegotiation = 0
let statusPage = STATUS_SHIP
let statusCursor = 0
let achievementCursor = 0
let lastRouteTarget = -1
let uiFrames = 0
let uiFps = 0
let uiFrameWindowAtMs = 0
let uiLastFreeBytes = 0
let uiMinFreeBytes = 0
let statusReturnScene = SceneId.Hangar
let confirmNewGamePlus = false
let mapPreviousRouteTarget = 0
let hardwareBTested = false
let noticeRenderKey = ""
let noticeRevealStartedAtMs = 0

function countFrame(): void {
    uiFrames++
}

function updateDiagnostics(): void {
    let now = game.runtime()
    if (uiFrameWindowAtMs == 0) uiFrameWindowAtMs = now
    if (now - uiFrameWindowAtMs < 1000) return
    uiFps = Math.idiv(uiFrames * 1000, Math.max(1, now - uiFrameWindowAtMs))
    uiFrames = 0
    uiFrameWindowAtMs = now
    if (developerMode) {
        // In the simulator gcStats() returns nothing (null), so the page keeps the last values.
        let stats = control.gcStats()
        if (stats) {
            uiLastFreeBytes = stats.lastFreeBytes
            uiMinFreeBytes = stats.minFreeBytes
        }
    }
}

function yesNoText(value: number): string {
    return value != 0 ? Texts.t(255) : Texts.t(201)
}

function stationAccentColor(): number {
    let colors = [COLOR_GREEN, COLOR_ORANGE, COLOR_CYAN, COLOR_PURPLE, COLOR_YELLOW, COLOR_METAL]
    return colors[WORLD_ECONOMY[currentWorld] % colors.length]
}

function stationDarkColor(): number {
    let colors = [COLOR_SHADOW, COLOR_RUST, COLOR_BLUE, COLOR_SHADOW, COLOR_RUST, COLOR_BLUE]
    return colors[WORLD_ECONOMY[currentWorld] % colors.length]
}

function shipPaintColor(): number {
    let colors = [COLOR_BLUE, COLOR_RED, COLOR_GREEN, COLOR_YELLOW, COLOR_PURPLE, COLOR_METAL]
    return colors[shipPaint[shipRole] % colors.length]
}

function countVisitedWorlds(): number {
    let count = 0
    for (let i = 0; i < WORLD_COUNT; i++) if (worldVisited(i)) count++
    return count
}

function noticeVisibleCharacters(): number {
    let delay = textSpeed == 0 ? 85 : (textSpeed == 2 ? 20 : 45)
    return Math.idiv(Math.max(0, game.runtime() - noticeRevealStartedAtMs), delay)
}

function noticeLinePart(text: string, offset: number): string {
    let count = Math.clamp(0, text.length, noticeVisibleCharacters() - offset)
    return text.substr(0, count)
}

function printRight(text: string, right: number, y: number, color: number): void {
    printGameText(text, right - text.length * 6, y, color)
}

function drawHeader(title: string): void {
    screen.fill(COLOR_BACKGROUND)
    screen.fillRect(0, 0, 160, 13, highContrast ? COLOR_BACKGROUND : COLOR_BLUE)
    if (highContrast) screen.drawRect(0, 0, 160, 13, COLOR_TEXT)
    printGameText(title, 3, 3, highContrast ? COLOR_YELLOW : COLOR_TEXT)
    printRight(Texts.t(256) + credits, 157, 3, COLOR_YELLOW)
}

function drawFooter(left: string, right: string): void {
    screen.fillRect(0, 108, 160, 12, highContrast ? COLOR_BACKGROUND : COLOR_BLUE)
    if (highContrast) screen.drawRect(0, 108, 160, 12, COLOR_TEXT)
    printGameText(left, 3, 111, highContrast ? COLOR_YELLOW : COLOR_TEXT)
    printRight(right, 157, 111, highContrast ? COLOR_YELLOW : COLOR_TEXT)
}

function drawSelection(y: number, height: number): void {
    screen.fillRect(2, y - 1, 156, height, highContrast ? COLOR_BLUE : COLOR_PURPLE)
}

function fitText(text: string, maxCharacters: number): string {
    if (text.length <= maxCharacters) return text
    // A long label stays readable in full: it waits at each end and slides in between.
    let distance = text.length - maxCharacters
    let phase = Math.idiv(game.runtime(), 220) % (distance * 2 + 12)
    let offset = phase < 6 ? 0
        : (phase < distance + 6 ? phase - 6 : (phase < distance + 12 ? distance : distance * 2 + 12 - phase))
    return text.substr(offset, maxCharacters)
}

function titleModeCanChange(): boolean {
    return !hasSave || campaignStage >= CAMPAIGN_MISSION_COUNT
}

function gameModeFromIndex(index: number): GameMode {
    if (index == 1) return GameMode.Veteran
    if (index == 2) return GameMode.Iron
    return GameMode.Standard
}

function cycleTitleMode(delta: number): void {
    let next = (gameMode + delta) % 3
    if (next < 0) next += 3
    gameMode = gameModeFromIndex(next)
    if (hasSave) writeSave()
}

function titleItemText(index: number): string {
    if (index == 0) return hasSave ? Texts.t(257) : Texts.t(254)
    if (index == 1) return Texts.t(258) + introModeName()
    if (index == 2) return introDurationSeconds() > 0
        ? Texts.t(259) + introDurationSeconds() + Texts.t(260) : Texts.t(261)
    if (index == 3) return Texts.t(262) + soundLevelName()
    if (index == 4) return Texts.t(263) + effectDensityName()
    if (index == 5) return Texts.t(264) + gameModeName(gameMode)
    if (index == 6) return Texts.t(265)
    if (index == 7) return Texts.t(266)
    if (index == 8) return Texts.t(267)
    return Texts.t(268)
}

// The name of the game in two lines for the title screen and the intro. The | splits line 1 from line 2.
const GAME_TITLE = "ORBIT|TRADER"   // line 1 | line 2

// Draws the name of the game in the middle: line 1 at y, line 2 gap pixels below it.
function drawGameTitle(y: number, gap: number): void {
    let cut = GAME_TITLE.indexOf("|")
    let first = cut < 0 ? GAME_TITLE : GAME_TITLE.substr(0, cut)
    printGameText(first, 80 - 3 * first.length, y, COLOR_YELLOW)
    if (cut < 0) return
    let second = GAME_TITLE.substr(cut + 1)
    printGameText(second, 80 - 3 * second.length, y + gap, COLOR_YELLOW)
}

function drawTitle(): void {
    screen.fill(COLOR_BACKGROUND)
    for (let i = 0; i < 22; i++) {
        let x = stableHash(i, 3, 9) % 160
        let y = stableHash(i, 7, 2) % 105
        screen.setPixel(x, y, i % 4 == 0 ? COLOR_CYAN : COLOR_DIM)
    }
    printGameText("CALLIOPE HACKER", 35, 2, COLOR_GREEN)
    screen.drawLine(25, 13, 135, 13, COLOR_CYAN)
    screen.drawLine(25, 43, 135, 43, COLOR_CYAN)
    drawGameTitle(16, 13)
    screen.drawLine(73, 49, 80, 45, COLOR_GREEN)
    screen.drawLine(80, 45, 87, 49, COLOR_GREEN)
    screen.drawLine(87, 49, 80, 53, COLOR_GREEN)
    screen.drawLine(80, 53, 73, 49, COLOR_GREEN)

    if (menuIndex < listTop) listTop = menuIndex
    if (menuIndex >= listTop + 6) listTop = menuIndex - 5
    for (let row = 0; row < 6; row++) {
        let i = listTop + row
        if (i >= TITLE_ITEM_COUNT) break
        let y = 55 + row * 9
        if (i == menuIndex) {
            screen.fillRect(17, y - 1, 126, 8, COLOR_PURPLE)
            screen.fillRect(17, y - 1, 2, 8, COLOR_YELLOW)
        }
        let color = COLOR_TEXT
        if (i == 5 && !titleModeCanChange()) color = COLOR_DIM
        if (i == 8 && !canStartNewGamePlus()) color = COLOR_DIM
        if (i == 9 && !hasSave) color = COLOR_DIM
        printGameText((i == menuIndex ? ">" : " ") +
            fitText(titleItemText(i), 19), 21, y, color)
    }
    screen.fillRect(146, 55 + Math.idiv(menuIndex * 45, TITLE_ITEM_COUNT), 2, 7, COLOR_YELLOW)
    if (saveWasCorrupt) printGameText(Texts.t(272), 3, 109, COLOR_RED)
    printRight(Texts.t(273), 157, 109, COLOR_DIM)
}

function shipPreviewLevel(id: number, highlightId: number, showNext: boolean): number {
    let level = upgrades[id]
    if (showNext && id == highlightId && level < UPGRADE_MAX[id]) level++
    return level
}

function shipPreviewPartColor(id: number, partLevel: number, highlightId: number, showNext: boolean,
    normalColor: number): number {
    if (showNext && id == highlightId && partLevel > upgrades[id]) return COLOR_YELLOW
    return normalColor
}

function drawPreviewDiamond(cx: number, cy: number, halfWidth: number, halfHeight: number,
    color: number): void {
    screen.drawLine(cx, cy - halfHeight, cx + halfWidth, cy, color)
    screen.drawLine(cx + halfWidth, cy, cx, cy + halfHeight, color)
    screen.drawLine(cx, cy + halfHeight, cx - halfWidth, cy, color)
    screen.drawLine(cx - halfWidth, cy, cx, cy - halfHeight, color)
}

// A line drawing of the ship seen from above. Each upgrade adds one visible part to the same ship shape.
function drawShipPreview(cx: number, cy: number, highlightId: number, showNext: boolean): void {
    let shieldLevel = shipPreviewLevel(UPGRADE_SHIELD, highlightId, showNext)
    for (let i = 0; i < shieldLevel; i++) {
        let shieldColor =
            shipPreviewPartColor(UPGRADE_SHIELD, i + 1, highlightId, showNext, COLOR_BLUE)
        drawPreviewDiamond(cx, cy, 21 + i * 2, 23 + i * 2, shieldColor)
    }

    let hullColor = highlightId == -3 ? COLOR_YELLOW : COLOR_TEXT
    screen.drawLine(cx, cy - 20, cx - 5, cy - 7, hullColor)
    screen.drawLine(cx - 5, cy - 7, cx - 20, cy + 8, hullColor)
    screen.drawLine(cx - 20, cy + 8, cx - 7, cy + 6, hullColor)
    screen.drawLine(cx - 7, cy + 6, cx - 6, cy + 17, hullColor)
    screen.drawLine(cx - 6, cy + 17, cx, cy + 13, hullColor)
    screen.drawLine(cx, cy + 13, cx + 6, cy + 17, hullColor)
    screen.drawLine(cx + 6, cy + 17, cx + 7, cy + 6, hullColor)
    screen.drawLine(cx + 7, cy + 6, cx + 20, cy + 8, hullColor)
    screen.drawLine(cx + 20, cy + 8, cx + 5, cy - 7, hullColor)
    screen.drawLine(cx + 5, cy - 7, cx, cy - 20, hullColor)
    screen.drawLine(cx, cy - 16, cx, cy + 12, COLOR_DIM)

    let armorLevel = shipPreviewLevel(UPGRADE_ARMOR, highlightId, showNext)
    for (let i = 0; i < armorLevel; i++) {
        let armorColor =
            shipPreviewPartColor(UPGRADE_ARMOR, i + 1, highlightId, showNext, COLOR_GREEN)
        screen.drawLine(cx - 2 - i, cy - 11, cx - 5 - i, cy + 7, armorColor)
        screen.drawLine(cx + 2 + i, cy - 11, cx + 5 + i, cy + 7, armorColor)
    }

    let cargoLevel = shipPreviewLevel(UPGRADE_CARGO, highlightId, showNext)
    if (cargoLevel >= 1) {
        let cargoColor = shipPreviewPartColor(UPGRADE_CARGO, 1, highlightId, showNext, COLOR_ORANGE)
        screen.drawRect(cx - 19, cy + 2, 5, 8, cargoColor)
        screen.drawRect(cx + 15, cy + 2, 5, 8, cargoColor)
    }
    if (cargoLevel >= 2) {
        let cargoColor = shipPreviewPartColor(UPGRADE_CARGO, 2, highlightId, showNext, COLOR_ORANGE)
        screen.drawRect(cx - 13, cy + 9, 5, 7, cargoColor)
        screen.drawRect(cx + 9, cy + 9, 5, 7, cargoColor)
    }
    if (cargoLevel >= 3) {
        let cargoColor = shipPreviewPartColor(UPGRADE_CARGO, 3, highlightId, showNext, COLOR_ORANGE)
        screen.drawRect(cx - 22, cy - 4, 4, 7, cargoColor)
        screen.drawRect(cx + 19, cy - 4, 4, 7, cargoColor)
    }

    let laserLevel = shipPreviewLevel(UPGRADE_LASER, highlightId, showNext)
    if (laserLevel >= 1) {
        let laserColor = shipPreviewPartColor(UPGRADE_LASER, 1, highlightId, showNext, COLOR_RED)
        screen.drawLine(cx - 2, cy - 17, cx - 2, cy - 24, laserColor)
        screen.drawLine(cx + 2, cy - 17, cx + 2, cy - 24, laserColor)
    }
    if (laserLevel >= 2) {
        let laserColor = shipPreviewPartColor(UPGRADE_LASER, 2, highlightId, showNext, COLOR_RED)
        screen.setPixel(cx - 3, cy - 25, laserColor)
        screen.setPixel(cx + 3, cy - 25, laserColor)
    }
    if (laserLevel >= 3) {
        let laserColor = shipPreviewPartColor(UPGRADE_LASER, 3, highlightId, showNext, COLOR_RED)
        screen.drawLine(cx - 2, cy - 25, cx - 2, cy - 28, laserColor)
        screen.drawLine(cx + 2, cy - 25, cx + 2, cy - 28, laserColor)
    }

    let coolerLevel = shipPreviewLevel(UPGRADE_COOLER, highlightId, showNext)
    for (let i = 0; i < coolerLevel; i++) {
        let coolerColor =
            shipPreviewPartColor(UPGRADE_COOLER, i + 1, highlightId, showNext, COLOR_CYAN)
        let finY = cy - 1 + i * 5
        screen.drawLine(cx - 8, finY, cx - 13, finY - 2, coolerColor)
        screen.drawLine(cx + 8, finY, cx + 13, finY - 2, coolerColor)
    }

    let jumpLevel = shipPreviewLevel(UPGRADE_JUMP, highlightId, showNext)
    for (let i = 0; i < jumpLevel; i++) {
        let jumpColor =
            shipPreviewPartColor(UPGRADE_JUMP, i + 1, highlightId, showNext, COLOR_PURPLE)
        let coilY = cy + 8 + i * 3
        screen.drawLine(cx - 4, coilY, cx + 4, coilY, jumpColor)
    }

    let boosterLevel = shipPreviewLevel(UPGRADE_BOOSTER, highlightId, showNext)
    let installedFlameLength = 3 + upgrades[UPGRADE_BOOSTER] * 2
    let boosterColor = highlightId == -2 ? COLOR_YELLOW : COLOR_ORANGE
    screen.drawLine(cx - 4, cy + 17, cx - 4, cy + 17 + installedFlameLength, boosterColor)
    screen.drawLine(cx + 4, cy + 17, cx + 4, cy + 17 + installedFlameLength, boosterColor)
    if (showNext && highlightId == UPGRADE_BOOSTER &&
        boosterLevel > upgrades[UPGRADE_BOOSTER]) {
        let previewFlameLength = 3 + boosterLevel * 2
        screen.drawLine(cx - 4, cy + 17 + installedFlameLength, cx - 4, cy + 17 + previewFlameLength,
            COLOR_YELLOW)
        screen.drawLine(cx + 4, cy + 17 + installedFlameLength, cx + 4, cy + 17 + previewFlameLength,
            COLOR_YELLOW)
    }

    let scannerLevel = shipPreviewLevel(UPGRADE_SCANNER, highlightId, showNext)
    if (scannerLevel >= 1) {
        let scannerColor = shipPreviewPartColor(UPGRADE_SCANNER, 1, highlightId, showNext, COLOR_CYAN)
        drawPreviewDiamond(cx, cy - 3, 4, 3, scannerColor)
    }
    if (scannerLevel >= 2) {
        let scannerColor = shipPreviewPartColor(UPGRADE_SCANNER, 2, highlightId, showNext, COLOR_CYAN)
        screen.drawRect(cx - 5, cy - 7, 11, 9, scannerColor)
    }

    let repairLevel = shipPreviewLevel(UPGRADE_REPAIR, highlightId, showNext)
    if (repairLevel > 0) {
        let repairColor =
            shipPreviewPartColor(UPGRADE_REPAIR, 1, highlightId, showNext, COLOR_GREEN)
        screen.drawRect(cx + 21, cy - 9, 5, 5, repairColor)
        screen.drawLine(cx + 23, cy - 11, cx + 23, cy - 2, repairColor)
        screen.drawLine(cx + 19, cy - 7, cx + 27, cy - 7, repairColor)
    }

    let insuranceLevel = shipPreviewLevel(UPGRADE_INSURANCE, highlightId, showNext)
    if (insuranceLevel > 0) {
        let insuranceColor =
            shipPreviewPartColor(UPGRADE_INSURANCE, 1, highlightId, showNext, COLOR_GREEN)
        screen.drawLine(cx - 24, cy - 15, cx - 24, cy - 10, insuranceColor)
        screen.drawLine(cx - 24, cy - 15, cx - 19, cy - 15, insuranceColor)
        screen.drawLine(cx + 24, cy - 15, cx + 24, cy - 10, insuranceColor)
        screen.drawLine(cx + 24, cy - 15, cx + 19, cy - 15, insuranceColor)
        if (insuranceLevel >= 2) {
            insuranceColor =
                shipPreviewPartColor(UPGRADE_INSURANCE, 2, highlightId, showNext, COLOR_GREEN)
            screen.drawLine(cx - 24, cy + 15, cx - 24, cy + 10, insuranceColor)
            screen.drawLine(cx - 24, cy + 15, cx - 19, cy + 15, insuranceColor)
            screen.drawLine(cx + 24, cy + 15, cx + 24, cy + 10, insuranceColor)
            screen.drawLine(cx + 24, cy + 15, cx + 19, cy + 15, insuranceColor)
        }
    }
}

function drawShipRolePreview(cx: number, cy: number, role: ShipRole): void {
    if (role == ShipRole.Trader) {
        screen.drawRect(cx - 27, cy + 4, 5, 10, COLOR_ORANGE)
        screen.drawRect(cx + 23, cy + 4, 5, 10, COLOR_ORANGE)
        screen.drawLine(cx - 25, cy + 14, cx + 25, cy + 14, COLOR_ORANGE)
    } else if (role == ShipRole.Courier) {
        screen.drawLine(cx - 8, cy + 20, cx - 8, cy + 27, COLOR_CYAN)
        screen.drawLine(cx, cy + 17, cx, cy + 29, COLOR_YELLOW)
        screen.drawLine(cx + 8, cy + 20, cx + 8, cy + 27, COLOR_CYAN)
    } else {
        screen.drawLine(cx - 7, cy - 20, cx - 7, cy - 28, COLOR_RED)
        screen.drawLine(cx + 7, cy - 20, cx + 7, cy - 28, COLOR_RED)
        drawPreviewDiamond(cx, cy - 4, 7, 5, COLOR_RED)
    }
}

function upgradeLevelSummary(id: number, level: number): string {
    if (id == UPGRADE_CARGO) return Texts.t(274) + (8 + level * 4)
    if (id == UPGRADE_SHIELD) return Texts.t(275) + (4 + level * 3)
    if (id == UPGRADE_ARMOR) return Texts.t(276) + (8 + level * 3)
    if (id == UPGRADE_LASER) return Texts.t(195) + (1 + level)
    if (id == UPGRADE_COOLER) return Texts.t(196) + Math.max(180, 440 - level * 100)
    if (id == UPGRADE_BOOSTER) return Texts.t(197) + Math.max(1200, 2600 - level * 500)
    if (id == UPGRADE_SCANNER) return Texts.t(198) + level
    if (id == UPGRADE_JUMP) return Texts.t(199) + (2 + level)
    if (id == UPGRADE_REPAIR) return level > 0 ? Texts.t(277) : Texts.t(278)
    if (id == UPGRADE_INSURANCE)
        return level == 0 ? Texts.t(202) : (level == 1 ? Texts.t(203) : Texts.t(279))
    return ""
}

function fillHangarQuad(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number,
    y3: number, color: number): void {
    screen.fillTriangle(x0, y0, x1, y1, x2, y2, color)
    screen.fillTriangle(x0, y0, x2, y2, x3, y3, color)
}

function drawHangarBackground3D(): void {
    let stationAccent = stationAccentColor()
    let stationDark = stationDarkColor()
    screen.fillRect(0, 13, 160, 95, COLOR_BACKGROUND)

    // A deep roof with beams that come together at the service bay in the back.
    fillHangarQuad(0, 13, 159, 13, 149, 39, 64, 39, COLOR_BLUE)
    screen.drawLine(0, 18, 159, 18, COLOR_METAL)
    screen.drawLine(13, 26, 155, 26, COLOR_METAL)
    screen.drawLine(35, 34, 151, 34, COLOR_METAL)
    screen.drawLine(0, 13, 76, 39, COLOR_DIM)
    screen.drawLine(29, 13, 88, 39, COLOR_DIM)
    screen.drawLine(58, 13, 98, 39, COLOR_DIM)
    screen.drawLine(87, 13, 108, 39, COLOR_DIM)
    screen.drawLine(116, 13, 121, 39, COLOR_DIM)
    screen.drawLine(145, 13, 137, 39, COLOR_DIM)
    screen.drawLine(4, 18, 29, 26, COLOR_SHADOW)
    screen.drawLine(29, 18, 13, 26, COLOR_SHADOW)
    screen.drawLine(58, 18, 88, 26, COLOR_SHADOW)
    screen.drawLine(88, 18, 58, 26, COLOR_SHADOW)
    screen.drawLine(116, 18, 145, 26, COLOR_SHADOW)
    screen.drawLine(145, 18, 116, 26, COLOR_SHADOW)

    // The slanted back wall with a door made of segments.
    fillHangarQuad(62, 38, 159, 31, 159, 72, 62, 67, stationDark)
    fillHangarQuad(72, 42, 155, 37, 155, 68, 72, 63, COLOR_SHADOW)
    screen.drawLine(72, 42, 155, 37, COLOR_DIM)
    screen.drawLine(72, 63, 155, 68, COLOR_DIM)
    screen.drawLine(91, 41, 91, 64, COLOR_METAL)
    screen.drawLine(112, 40, 112, 65, COLOR_METAL)
    screen.drawLine(133, 38, 133, 67, COLOR_METAL)
    screen.drawLine(72, 52, 155, 52, stationAccent)
    screen.fillRect(146, 41, 5, 4, COLOR_RED)
    screen.setPixel(148, 42, COLOR_YELLOW)

    // The floor in perspective with the launch pad, rails and a grid that spreads out.
    screen.fillRect(0, 64, 160, 44, COLOR_SHADOW)
    fillHangarQuad(104, 61, 119, 61, 153, 108, 54, 108, COLOR_METAL)
    fillHangarQuad(108, 63, 116, 63, 135, 108, 81, 108, COLOR_BLUE)
    screen.drawLine(111, 61, 42, 108, COLOR_DIM)
    screen.drawLine(111, 61, 75, 108, COLOR_DIM)
    screen.drawLine(113, 61, 112, 108, COLOR_DIM)
    screen.drawLine(114, 61, 148, 108, COLOR_DIM)
    screen.drawLine(115, 61, 159, 91, COLOR_DIM)
    screen.drawLine(94, 72, 131, 72, COLOR_DIM)
    screen.drawLine(80, 81, 142, 81, COLOR_DIM)
    screen.drawLine(63, 94, 154, 94, COLOR_DIM)
    screen.drawLine(39, 106, 159, 106, COLOR_DIM)
    screen.drawLine(101, 65, 72, 108, stationAccent)
    screen.drawLine(121, 65, 143, 108, stationAccent)
    screen.fillRect(96, 72, 2, 2, COLOR_YELLOW)
    screen.fillRect(89, 82, 2, 2, COLOR_CYAN)
    screen.fillRect(80, 96, 3, 2, COLOR_YELLOW)
    screen.fillRect(128, 72, 2, 2, COLOR_YELLOW)
    screen.fillRect(134, 83, 2, 2, COLOR_CYAN)
    screen.fillRect(140, 97, 3, 2, COLOR_YELLOW)

    // The door sill and the supports are in front. The floor must not paint over them.
    screen.drawLine(72, 63, 155, 68, COLOR_METAL)
    screen.drawLine(72, 64, 155, 69, COLOR_RUST)
    screen.fillRect(59, 34, 10, 48, stationDark)
    screen.fillRect(62, 37, 3, 42, COLOR_METAL)
    screen.fillRect(153, 28, 7, 57, stationDark)
    screen.fillRect(153, 33, 2, 47, COLOR_METAL)
    screen.drawLine(59, 44, 69, 54, COLOR_SHADOW)
    screen.drawLine(69, 44, 59, 54, COLOR_SHADOW)
    screen.fillRect(57, 80, 14, 3, COLOR_METAL)
    screen.fillRect(151, 83, 9, 3, COLOR_METAL)
}

const HACKER_MINI_X = 136
const HACKER_MINI_Y = 46
// The Calliope Hacker: hood up, black hoodie and trousers, turquoise sneakers. The desk with a screen is on the right.
const HACKER_MINI = img`
    . . . . . . . . b b b b b b b .
    . . . b b b . . b 9 9 9 9 9 b .
    . . b f f f b . b 9 7 9 7 9 b .
    . . b f f f b . b 9 9 9 9 9 b .
    . . b f f f b . b b b b b b b .
    . b f f f f f b . . . b . . . .
    b f f f f f f f f d d d d d d d
    b f f f f f f b b b b b b b b b
    b f f f f f f b . b . . . . . b
    . b f f f f b . . b . . . . . b
    . b f f . f f b . b . . . . . b
    . b f f . f f b . . . . . . . .
    . 6 6 6 . 6 6 6 . . . . . . . .
`

function drawHangarShip3D(): void {
    let hullPaint = shipPaintColor()
    // The shadow and the shield bubble are drawn first, behind the solid ship.
    fillHangarQuad(73, 95, 91, 88, 155, 89, 142, 102, COLOR_BACKGROUND)
    for (let i = 0; i < upgrades[UPGRADE_SHIELD]; i++) {
        drawPreviewDiamond(116, 70, 39 + i * 2, 27 + i * 2,
            i == upgrades[UPGRADE_SHIELD] - 1 ? COLOR_CYAN : COLOR_BLUE)
    }

    // The far wing, the near wing and their darker undersides.
    screen.fillTriangle(106, 66, 122, 43, 150, 83, hullPaint)
    screen.drawLine(106, 66, 122, 43, COLOR_CYAN)
    screen.drawLine(122, 43, 150, 83, COLOR_DIM)
    screen.fillTriangle(106, 70, 73, 96, 152, 87, COLOR_DIM)
    screen.fillTriangle(73, 96, 152, 87, 144, 93, COLOR_SHADOW)
    screen.drawLine(73, 96, 106, 70, COLOR_TEXT)
    screen.drawLine(73, 96, 152, 87, COLOR_CYAN)

    // A long uneven body: bright top, dark side and a pointed nose.
    fillHangarQuad(80, 51, 111, 62, 154, 84, 106, 72, COLOR_DIM)
    fillHangarQuad(80, 58, 106, 72, 154, 84, 105, 79, hullPaint)
    screen.drawLine(80, 51, 111, 62, COLOR_TEXT)
    screen.drawLine(111, 62, 154, 84, COLOR_TEXT)
    screen.drawLine(80, 58, 105, 79, COLOR_CYAN)
    screen.drawLine(105, 79, 154, 84, COLOR_CYAN)

    // The tail fins, the glass of the cockpit and the engine covers.
    screen.fillTriangle(81, 53, 92, 43, 106, 64, COLOR_METAL)
    screen.fillTriangle(81, 59, 75, 70, 106, 70, COLOR_SHADOW)
    screen.drawLine(92, 43, 106, 64, COLOR_TEXT)
    fillHangarQuad(108, 60, 126, 67, 133, 76, 115, 70, COLOR_BACKGROUND)
    screen.drawLine(108, 60, 126, 67, COLOR_CYAN)
    screen.drawLine(126, 67, 133, 76, COLOR_CYAN)
    screen.drawLine(133, 76, 115, 70, COLOR_BLUE)
    screen.fillRect(77, 52, 6, 4, COLOR_BACKGROUND)
    screen.fillRect(76, 59, 6, 4, COLOR_BACKGROUND)
    screen.drawRect(77, 52, 6, 4, COLOR_ORANGE)
    screen.drawRect(76, 59, 6, 4, COLOR_ORANGE)

    // The landing legs hold the ship on the lit pad.
    screen.drawLine(96, 81, 94, 98, COLOR_TEXT)
    screen.drawLine(91, 98, 99, 98, COLOR_DIM)
    screen.drawLine(137, 84, 139, 98, COLOR_TEXT)
    screen.drawLine(135, 98, 143, 98, COLOR_DIM)

    // Parts you have installed show on the 3D ship in the hangar.
    for (let i = 0; i < upgrades[UPGRADE_ARMOR]; i++) {
        screen.drawLine(92 + i * 4, 58 + i, 116 + i * 4, 69 + i * 2, COLOR_GREEN)
    }
    for (let i = 0; i < upgrades[UPGRADE_COOLER]; i++) {
        screen.drawLine(91 - i * 5, 83 + i * 3, 102 - i * 3, 76 + i * 2, COLOR_CYAN)
    }
    for (let i = 0; i < upgrades[UPGRADE_CARGO]; i++) {
        screen.drawRect(84 + i * 7, 76 + i * 2, 6, 5, COLOR_ORANGE)
    }
    for (let i = 0; i < upgrades[UPGRADE_JUMP]; i++) {
        screen.drawLine(78 - i, 51 + i * 5, 84 + i, 54 + i * 5, COLOR_PURPLE)
    }
    if (upgrades[UPGRADE_LASER] > 0) {
        screen.drawLine(149, 80, 159, 82, COLOR_RED)
        screen.drawLine(148, 84, 159, 87, COLOR_RED)
    }
    if (upgrades[UPGRADE_BOOSTER] > 0) {
        screen.drawLine(76, 54, 70 - upgrades[UPGRADE_BOOSTER] * 2, 52, COLOR_YELLOW)
        screen.drawLine(75, 61, 69 - upgrades[UPGRADE_BOOSTER] * 2, 61, COLOR_ORANGE)
    }
    if (upgrades[UPGRADE_SCANNER] > 0) {
        drawPreviewDiamond(114, 57, 4 + upgrades[UPGRADE_SCANNER], 3, COLOR_CYAN)
        screen.drawLine(114, 57, 111, 51, COLOR_CYAN)
    }
    if (upgrades[UPGRADE_REPAIR] > 0) {
        screen.drawRect(143, 49, 5, 5, COLOR_GREEN)
        screen.drawLine(145, 47, 145, 56, COLOR_GREEN)
        screen.drawLine(141, 51, 150, 51, COLOR_GREEN)
    }
    if (upgrades[UPGRADE_INSURANCE] > 0) {
        screen.drawLine(76, 46, 83, 46, COLOR_GREEN)
        screen.drawLine(76, 46, 76, 52, COLOR_GREEN)
        screen.drawLine(156, 76, 156, 82, COLOR_GREEN)
        screen.drawLine(156, 76, 149, 76, COLOR_GREEN)
        if (upgrades[UPGRADE_INSURANCE] > 1) {
            screen.drawLine(72, 99, 79, 99, COLOR_GREEN)
            screen.drawLine(72, 99, 72, 93, COLOR_GREEN)
            screen.drawLine(156, 94, 156, 100, COLOR_GREEN)
            screen.drawLine(156, 100, 149, 100, COLOR_GREEN)
        }
    }

    // The shape of the ship role shows on the parked ship and in its preview.
    if (shipRole == ShipRole.Trader) {
        screen.drawRect(82, 82, 7, 5, COLOR_ORANGE)
        screen.drawRect(91, 84, 7, 5, COLOR_ORANGE)
    } else if (shipRole == ShipRole.Courier) {
        screen.drawLine(76, 54, 67, 51, COLOR_CYAN)
        screen.drawLine(75, 61, 66, 61, COLOR_YELLOW)
    } else {
        screen.drawLine(148, 79, 159, 80, COLOR_RED)
        screen.drawLine(147, 86, 159, 89, COLOR_RED)
    }

    // A stripe in the accent color of the station and a yellow badge that grows longer with your rank.
    screen.drawLine(91, 63, 141, 80, stationAccentColor())
    screen.fillRect(119, 71, 3 + Math.min(5, currentRank()), 2, COLOR_YELLOW)
}

function drawHangar(): void {
    drawHeader(Texts.t(280) + WORLD_NAMES[currentWorld])
    drawHangarBackground3D()
    drawHangarShip3D()
    screen.fillRect(156, 28, 4, 58, COLOR_RUST)
    screen.drawLine(156, 34, 159, 38, COLOR_METAL)
    screen.drawLine(159, 38, 156, 42, COLOR_METAL)

    // A small service drone on a cable to the ship and two blinking lights make the station look alive
    // without any sprites.
    let dronePhase = Math.idiv(game.runtime(), 90) % 76
    let droneX = 78 + dronePhase
    let droneY = 42 + Math.idiv(Math.abs(38 - dronePhase), 8)
    screen.fillRect(droneX, droneY, 4, 2, COLOR_GREEN)
    screen.setPixel(droneX - 1, droneY + 1, COLOR_CYAN)
    screen.drawLine(droneX + 2, droneY + 2, 116, 70, COLOR_DIM)
    if (Math.idiv(game.runtime(), 280) % 2 == 0) {
        screen.fillRect(147, 41, 3, 2, COLOR_YELLOW)
        screen.setPixel(96, 73, stationAccentColor())
    }
    // Cameo: the Calliope Hacker at the control desk on the back walkway, in front of the cable of the drone.
    screen.drawTransparentImage(HACKER_MINI, HACKER_MINI_X, HACKER_MINI_Y)

    // The hangar menu is a control console: the picture of the scene stays big and the list scrolls neatly.
    screen.fillRect(1, 17, 70, 83, COLOR_BACKGROUND)
    screen.drawRect(1, 17, 70, 83, COLOR_METAL)
    if (menuIndex < listTop) listTop = menuIndex
    if (menuIndex >= listTop + 6) listTop = menuIndex - 5
    for (let row = 0; row < 6; row++) {
        let i = listTop + row
        if (i >= HANGAR_ITEMS.length) break
        let y = 21 + row * 13
        if (i == menuIndex) {
            screen.fillRect(3, y - 1, 65, 10, COLOR_PURPLE)
            screen.fillRect(3, y - 1, 2, 10, COLOR_YELLOW)
        }
        let color = COLOR_TEXT
        if (i == 1 && !blackMarketAvailable()) color = COLOR_DIM
        if (i == 9 && destinationWorld == currentWorld) color = COLOR_DIM
        // Only the selected row scrolls. The other rows show the beginning of the word.
        let label = Texts.t(HANGAR_ITEMS[i])
        printGameText(i == menuIndex ? fitText(label, 10) : label.substr(0, 10), 7, y, color)
        let tutorialTarget = tutorialStage == 1 ? 3
            : (tutorialStage == 2 ? (destinationWorld == currentWorld ? 4 : 9) : -1)
        // The ink of the "!" sits in column 2 of its letter box. Drawn at x 65 it appears at x 67,
        // one pixel after a tenth letter and before the scroll bar (x 68).
        if (i == tutorialTarget && Math.idiv(game.runtime(), 250) % 2 == 0)
            printGameText("!", 65, y, COLOR_YELLOW)
    }
    screen.fillRect(68, 20 + Math.idiv(menuIndex * 73, HANGAR_ITEMS.length), 2, 8, stationAccentColor())

    screen.fillRect(101, 15, 58, 11, COLOR_BACKGROUND)
    screen.drawRect(101, 15, 58, 11, COLOR_CYAN)
    let routeLabel = routeHopCount() > 1 ? Texts.t(281) + fuel +
        Texts.t(282) + routeHopCount() + ">" +
        WORLD_NAMES[routeWorldAt(routeHopCount())] : Texts.t(281) + fuel + " >" +
        WORLD_NAMES[destinationWorld]
    printRight(fitText(routeLabel, 9), 156, 18,
        destinationWorld == currentWorld ? COLOR_DIM : COLOR_YELLOW)
    screen.fillRect(96, 27, 63, 9, COLOR_BACKGROUND)
    printRight(fitText(worldTraitName(currentWorld), 10), 157, 29, stationAccentColor())
    screen.fillRect(73, 99, 85, 9, COLOR_BACKGROUND)
    if (menuIndex == 9) {
        let insured = upgrades[UPGRADE_INSURANCE] == 0 ? Texts.t(283)
            : (upgrades[UPGRADE_INSURANCE] == 1 ? Texts.t(284) : Texts.t(285))
        printRight(fitText(insured, 14), 157, 101, COLOR_YELLOW)
    } else printRight(fitText(shipDisplayName(shipRole) + " / " + shipPaintName(shipRole),
        14), 157, 101, COLOR_DIM)
    if (guidedDeliveryRunning()) {
        screen.fillRect(0, 98, 160, 10, COLOR_BLUE)
        screen.fillRect(0, 98, 6, 10, COLOR_YELLOW)
        printGameText(Texts.t(286), 1, 101, COLOR_BACKGROUND)
        printGameText(fitText(tutorialStageName(), 25), 8, 101, COLOR_YELLOW)
    }
    if (confirmOpen) {
        drawConfirmBox(Texts.t(630), 0)
        screen.fillRect(0, 108, 160, 12, COLOR_BACKGROUND)
    } else drawFooter(Texts.t(273), guidedDeliveryRunning() ? Texts.t(629) : Texts.t(287))
}

function guidedDeliveryRunning(): boolean {
    return tutorialStage >= 1 && tutorialStage <= 3
}

// Skips the guided first delivery. The game ends up in the same state as after finishing it
// (stage 4, with the scanner), but without the reward.
function skipGuidedDelivery(): void {
    if (missionSource == 2) clearMission()
    tutorialStage = 4
    upgrades[UPGRADE_SCANNER] = Math.max(1, upgrades[UPGRADE_SCANNER])
    writeSave()
    soundConfirm()
    // The third line names the next step after the skipped guide: take a mission.
    showNotice(Texts.t(631), Texts.t(632), Texts.t(236), SceneId.Hangar)
}

function marketRowName(name: string, row: number): string {
    return row == menuIndex ? fitText(name, 9) : name.substr(0, 9)
}

function drawMarket(): void {
    drawHeader((blackMarketOpen ? Texts.t(288) : Texts.t(289)) + WORLD_NAMES[currentWorld])
    printGameText(Texts.t(290), 5, 16, COLOR_DIM)
    printGameText(blackMarketOpen ? Texts.t(291) : Texts.t(291), 66, 16, COLOR_DIM)
    printGameText(Texts.t(292), 126, 16, COLOR_DIM)
    let itemCount = blackMarketOpen ? GOOD_COUNT + RARE_GOOD_COUNT : GOOD_COUNT
    if (menuIndex < listTop) listTop = menuIndex
    if (menuIndex >= listTop + 6) listTop = menuIndex - 5
    for (let row = 0; row < 6; row++) {
        let good = listTop + row
        if (good >= itemCount) break
        let y = 28 + row * 12
        if (good == menuIndex && !transactionOpen) drawSelection(y, 10)
        if (good < GOOD_COUNT) {
            // Names stay in their column (9 characters, then a gap before the prices at x 66).
            // As in the hangar menu, only the selected row scrolls a longer name. The other rows show the beginning.
            printGameText(
                marketRowName(Texts.t(GOOD_NAMES[good]), good), 5, y, COLOR_TEXT)
            let buyCost = blackMarketOpen ? blackMarketBuyPrice(good) : buyPrice(good)
            let sellCost = blackMarketOpen ? blackMarketSellPrice(good) : sellPrice(good)
            // On the purple selection bar the red black-market prices are drawn in the text color, like the name.
            printGameText(buyCost + "/" + sellCost, 66, y,
                blackMarketOpen ?
                    (good == menuIndex && !transactionOpen ? COLOR_TEXT : COLOR_RED) : COLOR_YELLOW)
            printGameText((blackMarketOpen ? "--" : marketStock[good]) + "/" +
                cargo[good], 126, y, COLOR_GREEN)
        } else {
            let rare = good - GOOD_COUNT
            // The selection bar is purple here too, so the selected rare good is drawn in the text color.
            printGameText(marketRowName(rareGoodName(rare), good), 5, y,
                good == menuIndex && !transactionOpen ? COLOR_TEXT : COLOR_PURPLE)
            printGameText("--/" + rareGoodValue(rare), 66, y, COLOR_YELLOW)
            printGameText("--/" + rareCargo[rare], 126, y,
                rareCargo[rare] > 0 ? COLOR_GREEN : COLOR_DIM)
        }
    }
    screen.fillRect(0, 97, 160, 11, COLOR_BACKGROUND)
    if (marketFeedbackText != "" && game.runtime() < marketFeedbackUntilMs) {
        printGameText(fitText(marketFeedbackText, 26), 3, 100, marketFeedbackColor)
    } else {
        marketFeedbackText = ""
        if (blackMarketOpen) {
            printGameText(fitText(Texts.t(293), 26), 3, 100, COLOR_RED)
        } else if (marketKnown(currentWorld)) {
            let rememberedGood = knownMarketGood(currentWorld)
            let trend = knownMarketTrend(currentWorld)
            let trendText = trend > 0 ? "+" : (trend < 0 ? "-" : "=")
            printGameText(
                fitText(Texts.t(294) + Texts.t(GOOD_NAMES[rememberedGood]) + " " +
                knownMarketBuy(currentWorld) + "/" + knownMarketSell(currentWorld) + " " + trendText +
                Texts.t(295) + knownMarketAge(currentWorld), 26), 3, 100, COLOR_CYAN)
        } else {
            printGameText(fitText(Texts.t(296) + marketEventDetail(), 26), 3, 100,
                activeMarketEventAt(currentWorld) ? COLOR_YELLOW : COLOR_DIM)
        }
    }
    if (transactionOpen) drawTradeBox()
    else drawFooter(Texts.t(297), Texts.t(298))
}

function drawTradeBox(): void {
    screen.fillRect(15, 34, 130, 58, COLOR_BACKGROUND)
    screen.drawRect(15, 34, 130, 58, COLOR_CYAN)
    let rareSelected = blackMarketOpen && menuIndex >= GOOD_COUNT
    let tradeName = rareSelected ? rareGoodName(menuIndex - GOOD_COUNT) :
        Texts.t(GOOD_NAMES[menuIndex])
    printGameText(tradeName, 22, 40, rareSelected ? COLOR_PURPLE : COLOR_YELLOW)
    if (transactionAmount > 0) {
        printGameText(Texts.t(299) + transactionAmount, 22, 53, COLOR_GREEN)
        printGameText(Texts.t(300) + transactionAmount *
            (blackMarketOpen ? blackMarketBuyPrice(menuIndex) : buyPrice(menuIndex)), 22, 65, COLOR_TEXT)
    } else if (transactionAmount < 0) {
        printGameText(Texts.t(301) + (0 - transactionAmount), 22, 53, COLOR_ORANGE)
        let unitPrice = rareSelected ? rareGoodValue(menuIndex - GOOD_COUNT)
            : (blackMarketOpen ? blackMarketSellPrice(menuIndex) : sellPrice(menuIndex))
        printGameText(Texts.t(300) + (0 - transactionAmount) * unitPrice, 22, 65, COLOR_TEXT)
    } else {
        printGameText(Texts.t(302), 22, 53, COLOR_DIM)
        printGameText(Texts.t(303), 22, 65, COLOR_TEXT)
    }
    printGameText(Texts.t(304), 22, 79, COLOR_DIM)
}

function outfitName(index: number): string {
    if (index == 0) return Texts.t(305)
    if (index == 1) return Texts.t(306)
    if (index == OUTFIT_SHIP_INDEX) return Texts.t(307)
    if (index == OUTFIT_NAME_INDEX) return Texts.t(308)
    if (index == OUTFIT_PAINT_INDEX) return Texts.t(309)
    if (index == OUTFIT_MISSILE_INDEX) return Texts.t(114)
    if (index == OUTFIT_MINE_INDEX) return Texts.t(27)
    return Texts.t(UPGRADE_NAMES[index - 2])
}

function outfitCost(index: number): number {
    if (index == 0) return fuel < maxFuel() ? 8 : 0
    if (index == 1) {
        let damaged = hull < maxHull()
        for (let i = 0; i < moduleDamage.length; i++) if (moduleDamage[i] > 0) damaged = true
        return damaged ? 28 : 0
    }
    if (index == OUTFIT_SHIP_INDEX)
        return shipOwned(outfitterRolePreview) ? 0 : shipPurchaseCost(outfitterRolePreview)
    if (index == OUTFIT_NAME_INDEX || index == OUTFIT_PAINT_INDEX) return 0
    if (index == OUTFIT_MISSILE_INDEX) return missiles < 9 ? worldShopPrice(120) : 0
    if (index == OUTFIT_MINE_INDEX) return mines < 6 ? worldShopPrice(80) : 0
    let id = index - 2
    return upgradePrice(id, upgrades[id] + 1)
}

function roleFromIndex(index: number): ShipRole {
    if (index == 1) return ShipRole.Courier
    if (index == 2) return ShipRole.Hunter
    return ShipRole.Trader
}

function cycleOutfitterRole(delta: number): void {
    let next = (outfitterRolePreview + delta) % SHIP_ROLE_COUNT
    if (next < 0) next += SHIP_ROLE_COUNT
    outfitterRolePreview = roleFromIndex(next)
    outfitterInstalledId = -1
}

function drawOutfitter(): void {
    drawHeader(Texts.t(247))
    if (menuIndex < listTop) listTop = menuIndex
    if (menuIndex >= listTop + 6) listTop = menuIndex - 5
    for (let row = 0; row < 6; row++) {
        let index = listTop + row
        if (index >= OUTFIT_ITEM_COUNT) break
        let y = 18 + row * 12
        if (index == menuIndex)
            screen.fillRect(2, y - 1, 90, 10, confirmOpen ? COLOR_BLUE : COLOR_PURPLE)
        printGameText(outfitName(index), 5, y, COLOR_TEXT)
        if (index == OUTFIT_SHIP_INDEX) {
            screen.fillRect(87, y + 2, 2, 2, shipOwned(outfitterRolePreview) ? COLOR_GREEN
                : (shipRoleUnlocked(outfitterRolePreview) ? COLOR_CYAN : COLOR_RED))
        } else if (index == OUTFIT_NAME_INDEX || index == OUTFIT_PAINT_INDEX) {
            printRight("<>", 90, y, COLOR_CYAN)
        } else if (index == OUTFIT_MISSILE_INDEX || index == OUTFIT_MINE_INDEX) {
            printRight(outfitCost(index) > 0 ? "" + outfitCost(index) : Texts.t(310), 90, y,
                outfitCost(index) > 0 && outfitCost(index) > credits ? COLOR_RED : COLOR_YELLOW)
        } else if (index >= 2 && upgrades[index - 2] >= UPGRADE_MAX[index - 2]) {
            printRight(Texts.t(310), 90, y, COLOR_GREEN)
        } else {
            printRight("" + outfitCost(index), 90, y,
                outfitCost(index) <= credits ? COLOR_YELLOW : COLOR_RED)
        }
    }

    let shipSelected = menuIndex == OUTFIT_SHIP_INDEX
    let identitySelected = menuIndex == OUTFIT_NAME_INDEX || menuIndex == OUTFIT_PAINT_INDEX
    let upgradeSelected = menuIndex >= 2 && menuIndex < OUTFIT_SHIP_INDEX
    let highlightId = upgradeSelected ? menuIndex - 2 : -1
    let installedNow = shipSelected ? outfitterRolePreview == shipRole
        : (upgradeSelected && outfitterInstalledId == highlightId)
    let showNext = shipSelected ? outfitterRolePreview != shipRole
        : (upgradeSelected && !installedNow &&
            upgrades[highlightId] < UPGRADE_MAX[highlightId])
    screen.drawRect(94, 15, 65, 72, COLOR_CYAN)
    let previewLabel = installedNow ? Texts.t(311) : (showNext ? Texts.t(312) : Texts.t(313))
    if (shipSelected && !shipRoleUnlocked(outfitterRolePreview)) previewLabel = Texts.t(314)
    printGameText(previewLabel,
        previewLabel == Texts.t(311) ? 99
            : (previewLabel == Texts.t(314) ? 102 : (previewLabel == Texts.t(312) ? 102 : 109)),
        18,
        previewLabel == Texts.t(311) ? COLOR_GREEN
            : (previewLabel == Texts.t(314) ? COLOR_RED
                : (previewLabel == Texts.t(312) ? COLOR_YELLOW : COLOR_CYAN)))
    drawShipPreview(126, 57, menuIndex == 0 ? -2 : (menuIndex == 1 ? -3 : highlightId),
        shipSelected ? false : showNext)
    drawShipRolePreview(126, 57, shipSelected ? outfitterRolePreview : shipRole)

    if (shipSelected) {
        printGameText((shipOwned(outfitterRolePreview) ? Texts.t(315) : Texts.t(316)) +
            shipRoleName(outfitterRolePreview), 4, 90, installedNow ? COLOR_GREEN : COLOR_YELLOW)
        printRight(Texts.t(317) + shipRoleRequiredRank(outfitterRolePreview), 157, 90,
            shipRoleUnlocked(outfitterRolePreview) ? COLOR_TEXT : COLOR_RED)
        // The ship description stops one character before the price or the switch hint. A longer description scrolls.
        let shipPrice = installedNow ? ""
            : (shipOwned(outfitterRolePreview) ? Texts.t(318) : outfitCost(menuIndex) + Texts.t(319))
        printGameText(fitText(shipRoleInfo(outfitterRolePreview),
            Math.idiv(147 - shipPrice.length * 6, 6)), 4, 99, COLOR_DIM)
        if (!installedNow)
            printRight(shipPrice, 157, 99, outfitCost(menuIndex) <= credits ? COLOR_YELLOW : COLOR_RED)
    } else if (menuIndex == OUTFIT_NAME_INDEX) {
        printGameText(Texts.t(320), 4, 90, COLOR_YELLOW)
        printRight(shipDisplayName(shipRole), 157, 90, COLOR_GREEN)
        printGameText(Texts.t(321), 4, 99, COLOR_DIM)
    } else if (menuIndex == OUTFIT_PAINT_INDEX) {
        printGameText(Texts.t(309), 4, 90, COLOR_YELLOW)
        printRight(shipPaintName(shipRole), 157, 90, shipPaintColor())
        printGameText(Texts.t(322), 4, 99, COLOR_DIM)
    } else if (menuIndex == OUTFIT_MISSILE_INDEX || menuIndex == OUTFIT_MINE_INDEX) {
        let count = menuIndex == OUTFIT_MISSILE_INDEX ? missiles : mines
        let maximum = menuIndex == OUTFIT_MISSILE_INDEX ? 9 : 6
        printGameText(outfitName(menuIndex) + " " + count + "/" + maximum, 4, 90, COLOR_YELLOW)
        printGameText(menuIndex == OUTFIT_MISSILE_INDEX ? Texts.t(323) : Texts.t(324), 4, 99, COLOR_DIM)
        printRight(outfitCost(menuIndex) + Texts.t(319), 157, 99,
            outfitCost(menuIndex) <= credits ? COLOR_YELLOW : COLOR_RED)
    } else if (upgradeSelected) {
        let currentLevel = upgrades[highlightId]
        let shownLevel = showNext ? currentLevel + 1 : currentLevel
        printGameText(outfitName(menuIndex), 4, 90, COLOR_YELLOW)
        printRight(Texts.t(325) + currentLevel + (installedNow ? Texts.t(326)
            : (showNext ? ">" + shownLevel : Texts.t(327))), 157, 90, COLOR_TEXT)
        let compare = upgradeLevelSummary(highlightId, currentLevel)
        if (showNext) compare += " > " + upgradeLevelSummary(highlightId, shownLevel)
        printGameText(fitText(compare, 18), 4, 99, COLOR_DIM)
        if (showNext) printRight(outfitCost(menuIndex) + Texts.t(319), 157, 99,
            outfitCost(menuIndex) <= credits ? COLOR_YELLOW : COLOR_RED)
    } else if (menuIndex == 0) {
        printGameText(Texts.t(328) + fuel + "/" + maxFuel(), 4, 90, COLOR_YELLOW)
        printGameText(Texts.t(329), 4, 99, COLOR_DIM)
        printRight(outfitCost(menuIndex) + Texts.t(319), 157, 99,
            outfitCost(menuIndex) <= credits ? COLOR_YELLOW : COLOR_RED)
    } else {
        printGameText(Texts.t(330) + hull + "/" + maxHull(), 4, 90, COLOR_YELLOW)
        printGameText(Texts.t(331), 4, 99, COLOR_DIM)
        printRight(outfitCost(menuIndex) + Texts.t(319), 157, 99,
            outfitCost(menuIndex) <= credits ? COLOR_YELLOW : COLOR_RED)
    }
    if (confirmOpen) drawConfirmBox(shipSelected
        ? (shipOwned(outfitterRolePreview) ? Texts.t(332) : Texts.t(333))
        : Texts.t(334), outfitCost(menuIndex))
    else if (shipSelected) drawFooter(Texts.t(335), Texts.t(298))
    else if (identitySelected) drawFooter(Texts.t(336), Texts.t(298))
    else drawFooter(Texts.t(337), Texts.t(298))
}

function drawConfirmBox(action: string, cost: number): void {
    screen.fillRect(0, 87, 160, 21, COLOR_BACKGROUND)
    screen.drawRect(0, 87, 160, 21, COLOR_YELLOW)
    printGameText(action + Texts.t(338), 5, 90, COLOR_TEXT)
    if (cost > 0) printRight(cost + Texts.t(319), 155, 90, COLOR_YELLOW)
    printGameText(Texts.t(339), 5, 99, COLOR_GREEN)
    printRight(Texts.t(340), 155, 99, COLOR_DIM)
}

function drawMissions(): void {
    drawHeader(Texts.t(248))
    if (missionKind != MissionKind.None) {
        let source = missionSource == 2 ? Texts.t(341) : (missionSource == 1 ? Texts.t(342)
            : (missionSource == 3 ? Texts.t(343) : Texts.t(200)))
        // A campaign mission shows the title of its stage. In the line for the variant details it shows its briefing,
        // and a longer line scrolls.
        printGameText(source + ": " + (missionSource == 1 ? campaignTitle(campaignStage)
            : missionLabel(missionKind)), 6, 18, missionSource > 0 ? COLOR_YELLOW : COLOR_TEXT)
        printGameText(Texts.t(344) + missionVariantName(missionKind, missionVariant), 6, 29, COLOR_CYAN)
        printGameText(Texts.t(345) + WORLD_NAMES[missionTarget] + Texts.t(346) + missionDeadline, 6, 40,
            missionDeadline < orbitDay ? COLOR_RED : COLOR_GREEN)
        printGameText(Texts.t(347) + missionReward + Texts.t(319), 6, 51, COLOR_YELLOW)
        if (missionKind == MissionKind.Delivery) printGameText(Texts.t(274) +
            Texts.t(GOOD_NAMES[missionGood]) + Texts.t(348) + missionAmount, 6, 62, COLOR_ORANGE)
        if (missionKind == MissionKind.Hunt)
            printGameText(Texts.t(349) + missionProgress + "/" + missionAmount, 6, 62, COLOR_RED)
        if (missionKind == MissionKind.Rescue)
            printGameText(missionProgress > 0 ? Texts.t(350) : Texts.t(351), 6, 62, COLOR_GREEN)
        printGameText(fitText(missionSource == 1 ? campaignBriefing(campaignStage)
            : missionVariantDetail(missionKind, missionVariant), 25), 6, 75, COLOR_DIM)
        if (confirmOpen) drawConfirmBox(Texts.t(352), 0)
        else drawFooter(Texts.t(353), Texts.t(298))
        return
    }
    if (menuIndex < listTop) listTop = menuIndex
    if (menuIndex >= listTop + 3) listTop = menuIndex - 2
    for (let row = 0; row < 3; row++) {
        let slot = listTop + row
        if (slot >= MISSION_OFFER_COUNT) break
        let y = 17 + row * 30
        let source = missionOfferSource(slot)
        if (slot == menuIndex) screen.fillRect(2, y - 1, 156, 28, COLOR_PURPLE)
        if (source > 0)
            screen.fillRect(2, y - 1, 3, 28, source == 2 ? COLOR_YELLOW :
                (source == 3 ? COLOR_PURPLE : COLOR_CYAN))
        let kind = missionOfferKind(slot)
        let target = missionOfferTarget(slot)
        let prefix = source == 2 ? Texts.t(354)
            : (source == 1 ? Texts.t(355) : (source == 3 ? Texts.t(356) : ""))
        // The campaign offer names its stage. As in the hangar menu, only the selected row scrolls a long line.
        let head = prefix +
            (source == 1 ? campaignTitle(campaignStage) : missionLabel(kind)) + " > " +
            WORLD_NAMES[target]
        printGameText(slot == menuIndex ? head : head.substr(0, 25), 7, y,
            source > 0 ? COLOR_YELLOW : COLOR_TEXT)
        let detail = ""
        if (kind == MissionKind.Delivery) detail = Texts.t(GOOD_NAMES[missionOfferGood(slot)]) +
            Texts.t(348) + missionOfferAmount(slot)
        else if (kind == MissionKind.Hunt) detail = Texts.t(357) + missionOfferAmount(slot)
        else detail = Texts.t(358) + missionOfferAmount(slot)
        detail += " " + missionVariantName(kind, missionOfferVariant(slot))
        // On the purple selection bar the detail line is drawn in the text color, because red was hard to read.
        printGameText(fitText(detail, 24), 7, y + 9,
            slot == menuIndex ? COLOR_TEXT : (kind == MissionKind.Hunt ? COLOR_RED : COLOR_CYAN))
        let shownReward = slot == menuIndex
            ? negotiatedMissionReward(missionOfferReward(slot), missionNegotiation)
            : missionOfferReward(slot)
        let bargain = slot == menuIndex && missionNegotiation > 0 ?
            Texts.t(359) + missionNegotiation : ""
        printGameText(shownReward + Texts.t(319) + bargain +
            Texts.t(360) + missionOfferDeadline(slot),
            7, y + 18, COLOR_GREEN)
    }
    screen.fillRect(158, 17 + Math.idiv(menuIndex * 78, MISSION_OFFER_COUNT), 2, 12, COLOR_YELLOW)
    drawFooter(Texts.t(361), Texts.t(298))
}

function mapX(world: number): number {
    return 5 + Math.idiv(WORLD_X[world] * 148, 160)
}

function mapY(world: number): number {
    return 16 + Math.idiv(WORLD_Y[world] * 49, 110)
}

function drawStarMap(): void {
    drawHeader(Texts.t(249))
    // The fixed trade lanes make groups of worlds and long routes easy to read at a glance.
    for (let i = 0; i < PUBLIC_WORLD_COUNT; i++) {
        if (i % 6 > 0 && worldVisible(i - 1) && worldVisible(i))
            screen.drawLine(mapX(i - 1), mapY(i - 1), mapX(i), mapY(i), COLOR_SHADOW)
        if (i >= 6 && worldVisible(i - 6) && worldVisible(i))
            screen.drawLine(mapX(i - 6), mapY(i - 6), mapX(i), mapY(i), COLOR_SHADOW)
    }
    if (missionKind != MissionKind.None) {
        screen.drawLine(mapX(currentWorld), mapY(currentWorld), mapX(missionTarget), mapY(missionTarget),
            COLOR_RED)
    }
    if (lastRouteTarget != mapCursorWorld) {
        planRouteTo(mapCursorWorld)
        lastRouteTarget = mapCursorWorld
    }
    let routeFrom = routeWorldAt(0)
    for (let hop = 0; hop < routeHopCount(); hop++) {
        let routeTo = routeWorldAt(hop + 1)
        screen.drawLine(mapX(routeFrom), mapY(routeFrom),
            mapX(routeTo), mapY(routeTo), COLOR_CYAN)
        routeFrom = routeTo
    }
    for (let i = 0; i < WORLD_COUNT; i++) {
        if (!worldVisible(i)) continue
        let x = mapX(i)
        let y = mapY(i)
        let color = canReachWorld(i) ? COLOR_CYAN : COLOR_DIM
        if (i == currentWorld) color = COLOR_GREEN
        screen.fillRect(x - 1, y - 1, 3, 3, color)
        if (i == mapCursorWorld) screen.drawRect(x - 3, y - 3, 7, 7, COLOR_YELLOW)
        if (missionKind != MissionKind.None && i == missionTarget) {
            screen.drawLine(x - 4, y, x, y - 4, COLOR_RED)
            screen.drawLine(x, y - 4, x + 4, y, COLOR_RED)
            screen.drawLine(x + 4, y, x, y + 4, COLOR_RED)
            screen.drawLine(x, y + 4, x - 4, y, COLOR_RED)
        }
    }
    screen.fillRect(0, 69, 160, 39, COLOR_BACKGROUND)
    screen.drawLine(0, 69, 159, 69, COLOR_CYAN)
    let cost = jumpCost(currentWorld, mapCursorWorld)
    let hopText = routeHopCount() > 0 ? Texts.t(282) + routeHopCount() +
        Texts.t(362) + routeFuelCost()
        : Texts.t(363) + cost
    printGameText(fitText(WORLD_NAMES[mapCursorWorld] + hopText + " " +
        Texts.t(ECONOMY_NAMES[WORLD_ECONOMY[mapCursorWorld]]), 22),
        3, 72, mapCursorWorld == currentWorld ? COLOR_DIM : COLOR_TEXT)
    printRight(Texts.t(DANGER_NAMES[effectiveWorldDanger(mapCursorWorld)]), 157, 72,
        effectiveWorldDanger(mapCursorWorld) >= 2 ? COLOR_RED : COLOR_YELLOW)
    if (upgrades[UPGRADE_SCANNER] > 0) {
        printGameText(
            fitText(worldTraitName(mapCursorWorld) + ": " + worldTraitDetail(mapCursorWorld),
            26), 3, 81, COLOR_GREEN)
        let eventLine = activeMarketEventAt(mapCursorWorld)
            ? marketEventName() + " " + Texts.t(GOOD_NAMES[marketEventGood]) : Texts.t(364)
        printGameText(fitText(Texts.t(365) + eventLine, 26), 3, 90,
            activeMarketEventAt(mapCursorWorld) ? COLOR_YELLOW : COLOR_DIM)
        if (marketKnown(mapCursorWorld)) {
            let knownGood = knownMarketGood(mapCursorWorld)
            let knownTrend = knownMarketTrend(mapCursorWorld)
            let knownArrow = knownTrend > 0 ? "+" : (knownTrend < 0 ? "-" : "=")
            printGameText(fitText(Texts.t(366) + knownMarketAge(mapCursorWorld) + " " +
                Texts.t(GOOD_NAMES[knownGood]) + " " + knownMarketBuy(mapCursorWorld) + "/" +
                knownMarketSell(mapCursorWorld) + knownArrow, 26), 3, 99, COLOR_CYAN)
        } else if (upgrades[UPGRADE_SCANNER] > 1) {
            let bestGood = bestTradeGood(mapCursorWorld)
            let margin =
                priceAt(mapCursorWorld, bestGood, false) - buyPrice(bestGood)
            printGameText(Texts.t(367) + Texts.t(GOOD_NAMES[bestGood]) + " " +
                (margin >= 0 ? "+" : "") + margin + Texts.t(319), 3, 99, margin > 0 ? COLOR_CYAN : COLOR_RED)
        } else {
            printGameText(Texts.t(368), 3, 99, COLOR_DIM)
        }
    } else {
        printGameText(fitText(Texts.t(369), 26), 3, 83, COLOR_DIM)
    }
    drawFooter(Texts.t(370), Texts.t(298))
}

function statusPageName(): string {
    if (statusPage == STATUS_FACTIONS) return Texts.t(251)
    if (statusPage == STATUS_LOGBOOK) return Texts.t(252)
    if (statusPage == STATUS_ACHIEVEMENTS) return Texts.t(371)
    if (statusPage == STATUS_OPTIONS) return Texts.t(265)
    if (statusPage == STATUS_HARDWARE) return Texts.t(266)
    if (statusPage == STATUS_DEVELOPER) return Texts.t(372)
    return Texts.t(373)
}

function moduleName(module: number): string {
    if (module == ShipModule.Engine) return Texts.t(115)
    if (module == ShipModule.Scanner) return Texts.t(116)
    if (module == ShipModule.Weapons) return Texts.t(117)
    return Texts.t(118)
}

function endingForFaction(faction: number): EndingKind {
    if (faction == Faction.Traders) return EndingKind.Merchant
    if (faction == Faction.Scientists) return EndingKind.Explorer
    if (faction == Faction.Outlaws) return EndingKind.Outlaw
    return EndingKind.Union
}

function missionFaction(kind: MissionKind, variant: MissionVariant): Faction {
    if (variant == MissionVariant.Illegal) return Faction.Outlaws
    if (kind == MissionKind.Delivery) return Faction.Traders
    if (kind == MissionKind.Rescue) return Faction.Scientists
    return Faction.Union
}

function drawShipStatusPage(): void {
    printGameText(shipDisplayName(shipRole) + " / " +
        shipPaintName(shipRole), 6, 17, shipPaintColor())
    printGameText(Texts.t(317) + rankName() + Texts.t(374) + gameScore(), 6, 28, COLOR_YELLOW)
    printGameText(Texts.t(276) + hull + "/" + maxHull() + Texts.t(375) + maxShield(), 6, 39, COLOR_GREEN)
    printGameText(Texts.t(376) + fuel + "/" + maxFuel() + Texts.t(377) + cargoUnits() + "/" +
        cargoCapacity(), 6, 50, COLOR_CYAN)
    printGameText(Texts.t(378) + weaponName(activeWeapon) + Texts.t(379) + weaponEnergy, 6, 61,
        COLOR_ORANGE)
    printGameText(Texts.t(380) + missiles + Texts.t(381) + mines, 6, 72, COLOR_TEXT)
    let damageText = Texts.t(382)
    for (let i = 0; i < moduleDamage.length; i++) {
        if (moduleDamage[i] > 0) damageText = moduleName(i) + " " + moduleDamageName(i)
    }
    printGameText(fitText(damageText, 25), 6, 83, damageText == Texts.t(382) ? COLOR_GREEN : COLOR_RED)
    let loss = upgrades[UPGRADE_INSURANCE] == 0 ? Texts.t(383)
        : (upgrades[UPGRADE_INSURANCE] == 1 ? Texts.t(384) : Texts.t(385))
    printGameText(fitText(Texts.t(386) + loss, 25), 6, 94, COLOR_YELLOW)
}

function drawFactionPage(): void {
    for (let i = 0; i < FACTION_COUNT; i++) {
        let y = 19 + i * 17
        if (i == statusCursor) drawSelection(y, 11)
        let reputation = factionReputation(i)
        printGameText(factionName(i), 7, y, i == dominantFaction() ? COLOR_YELLOW : COLOR_TEXT)
        printRight((reputation >= 0 ? "+" : "") + reputation, 153, y, reputation >= 0 ? COLOR_GREEN : COLOR_RED)
        let width = Math.min(50, Math.abs(reputation))
        screen.fillRect(84, y + 7, width, 2, reputation >= 0 ? COLOR_GREEN : COLOR_RED)
    }
    if (campaignComplete()) {
        let selectedEnding = endingForFaction(statusCursor)
        let endingText = endingChoice == EndingKind.None ? Texts.t(387) + endingName(selectedEnding)
            : Texts.t(388) + endingName(endingChoice)
        let endingColor = endingChoice != EndingKind.None ? COLOR_GREEN
            : (endingAvailable(selectedEnding) ? COLOR_YELLOW : COLOR_RED)
        printGameText(fitText(endingText, 25), 6, 91, endingColor)
    } else printGameText(Texts.t(389) + campaignStage + "/" + CAMPAIGN_MISSION_COUNT, 6, 91, COLOR_DIM)
}

function drawLogbookPage(): void {
    printGameText(Texts.t(390) + totalJumps, 6, 17, COLOR_CYAN)
    printGameText(Texts.t(391) + totalDeliveries + Texts.t(392) + totalRescues, 6, 28, COLOR_GREEN)
    printGameText(Texts.t(393) + totalVictories + Texts.t(394) + bossVictories, 6, 39, COLOR_RED)
    printGameText(Texts.t(395) + completedMissions + Texts.t(396) + failedMissions, 6, 50, COLOR_TEXT)
    printGameText(Texts.t(397) + totalCreditsEarned + Texts.t(319), 6, 61, COLOR_YELLOW)
    printGameText(Texts.t(398) + largestTradeProfit, 6, 72, COLOR_GREEN)
    printGameText(Texts.t(399) + countVisitedWorlds() + "/" + WORLD_COUNT + Texts.t(400) +
        blackMarketTrades + Texts.t(401) + newGamePlusLevel, 6, 83, COLOR_PURPLE)
    let artifactText = hasArtifact(statusCursor) ? artifactName(statusCursor) : Texts.t(402)
    printGameText(Texts.t(403) + (statusCursor + 1) + "/" + ARTIFACT_COUNT + " " +
        fitText(artifactText, 13), 6, 94, hasArtifact(statusCursor) ? COLOR_YELLOW : COLOR_DIM)
}

function drawAchievementPage(): void {
    if (achievementCursor < listTop) listTop = achievementCursor
    if (achievementCursor >= listTop + 5) listTop = achievementCursor - 4
    for (let row = 0; row < 5; row++) {
        let id = listTop + row
        if (id >= ACHIEVEMENT_COUNT) break
        let y = 17 + row * 17
        if (id == achievementCursor) drawSelection(y, 14)
        let unlocked = achievementUnlocked(id)
        printGameText((unlocked ? "* " : Texts.t(404)) + achievementName(id), 6, y,
            unlocked ? COLOR_YELLOW : COLOR_DIM)
        printGameText(fitText(unlocked ? achievementDetail(id) : Texts.t(405), 25), 12, y + 8,
            unlocked ? COLOR_TEXT : COLOR_DIM)
    }
    screen.fillRect(157, 17 + Math.idiv(achievementCursor * 78, ACHIEVEMENT_COUNT), 2, 10, COLOR_YELLOW)
}

function optionText(index: number): string {
    if (index == 0) return Texts.t(406) + textSpeedName()
    if (index == 1) return Texts.t(407) + yesNoText(highContrast)
    if (index == 2) return Texts.t(408) + yesNoText(cameraShake)
    if (index == 3) return Texts.t(258) + introModeName()
    if (index == 4) return Texts.t(262) + soundLevelName()
    if (index == 5) return Texts.t(263) + effectDensityName()
    if (index == 6) return Texts.t(409)
    return Texts.t(410)
}

function drawOptionsPage(): void {
    if (statusCursor < listTop) listTop = statusCursor
    if (statusCursor >= listTop + 7) listTop = statusCursor - 6
    for (let row = 0; row < 7; row++) {
        let id = listTop + row
        if (id >= 8) break
        let y = 17 + row * 12
        if (id == statusCursor) drawSelection(y, 10)
        let enabled = id != 7 || manualSaveExists()
        printGameText(fitText(optionText(id), 25), 6, y, enabled ? COLOR_TEXT : COLOR_DIM)
    }
    printGameText(Texts.t(411), 6, 99, COLOR_DIM)
}

function drawHardwarePage(): void {
    printGameText(Texts.t(412), 6, 17, COLOR_YELLOW)
    screen.drawRect(62, 30, 37, 43, COLOR_METAL)
    screen.fillRect(76, 34, 9, 9, controller.up.isPressed() ? COLOR_GREEN : COLOR_DIM)
    screen.fillRect(76, 60, 9, 9, controller.down.isPressed() ? COLOR_GREEN : COLOR_DIM)
    screen.fillRect(65, 47, 9, 9, controller.left.isPressed() ? COLOR_GREEN : COLOR_DIM)
    screen.fillRect(87, 47, 9, 9, controller.right.isPressed() ? COLOR_GREEN : COLOR_DIM)
    screen.fillCircle(119, 43, 7, controller.A.isPressed() ? COLOR_YELLOW : COLOR_RED)
    screen.fillCircle(137, 61, 7, controller.B.isPressed() ? COLOR_YELLOW : COLOR_BLUE)
    for (let i = 0; i < 16; i++) screen.fillRect(4 + i * 9, 78, 8, 8, i)
    printGameText(hardwareBTested ? Texts.t(413) : Texts.t(414), hardwareBTested ? 10 : 27, 92,
        COLOR_TEXT)
    printGameText(Texts.t(415) + (hasSave ? Texts.t(232) : Texts.t(416)) + Texts.t(417) +
        (manualSaveExists() ? Texts.t(232) : Texts.t(416)), 9, 102, COLOR_GREEN)
}

function drawDeveloperPage(): void {
    let stats = control.gcStats()
    printGameText(Texts.t(418) + uiFps, 6, 18, uiFps >= 25 ? COLOR_GREEN : COLOR_RED)
    printGameText(Texts.t(419) + control.ramSize(), 6, 31, COLOR_TEXT)
    printGameText(Texts.t(420) + uiLastFreeBytes, 6, 44, COLOR_CYAN)
    printGameText(Texts.t(421) + uiMinFreeBytes, 6, 57, COLOR_YELLOW)
    printGameText(Texts.t(422) + (stats ? stats.numGC : 0), 6, 70, COLOR_DIM)
    printGameText(Texts.t(423) + orbitDay + "/" + currentWorld, 6, 83, COLOR_TEXT)
    printGameText(Texts.t(424) + yesNoText(developerMode), 6, 96,
        developerMode ? COLOR_GREEN : COLOR_DIM)
}

function drawStatus(): void {
    drawHeader(statusPageName())
    if (statusPage == STATUS_SHIP) drawShipStatusPage()
    else if (statusPage == STATUS_FACTIONS) drawFactionPage()
    else if (statusPage == STATUS_LOGBOOK) drawLogbookPage()
    else if (statusPage == STATUS_ACHIEVEMENTS) drawAchievementPage()
    else if (statusPage == STATUS_OPTIONS) drawOptionsPage()
    else if (statusPage == STATUS_HARDWARE) drawHardwarePage()
    else drawDeveloperPage()
    if (statusPage == STATUS_DEVELOPER) drawFooter(Texts.t(425), Texts.t(298))
    else if (statusPage == STATUS_LOGBOOK) drawFooter(Texts.t(426), Texts.t(298))
    else if (statusPage == STATUS_ACHIEVEMENTS) drawFooter(Texts.t(427), Texts.t(298))
    else if (statusPage != STATUS_HARDWARE) drawFooter(Texts.t(428), Texts.t(298))
}

function drawNotice(): void {
    let key = noticeLine1 + "|" + noticeLine2 + "|" + noticeLine3
    if (key != noticeRenderKey) {
        noticeRenderKey = key
        noticeRevealStartedAtMs = game.runtime()
    }
    let offset2 = noticeLine1.length
    let offset3 = offset2 + noticeLine2.length
    screen.fill(COLOR_BACKGROUND)
    screen.drawRect(3, 15, 154, 90, COLOR_CYAN)
    let y = printWrappedText(noticeLinePart(noticeLine1, 0), 8, 21, 24, COLOR_YELLOW) + 3
    y = printWrappedText(noticeLinePart(noticeLine2, offset2), 8, y, 24, COLOR_TEXT) + 3
    printWrappedText(noticeLinePart(noticeLine3, offset3), 8, y, 24, COLOR_GREEN)
    printGameText(Texts.t(429), 55, 109, COLOR_DIM)
}

function drawDeleteSave(): void {
    screen.fill(COLOR_BACKGROUND)
    screen.drawRect(12, 27, 136, 65, COLOR_RED)
    // The box is 136 pixels wide. The question about a new game plus is centered (x = 81 - 3 × length, at most 23), so
    // a long question stays inside the box. The other question starts at x = 20.
    let question = confirmNewGamePlus ? Texts.t(430) : Texts.t(431)
    printGameText(question, confirmNewGamePlus ?
        Math.min(23, 81 - question.length * 3) : 20, 39, COLOR_YELLOW)
    printGameText(confirmNewGamePlus ? Texts.t(432) : Texts.t(433),
        confirmNewGamePlus ? 29 : 26, 55,
        confirmNewGamePlus ? COLOR_GREEN : COLOR_RED)
    printGameText(Texts.t(434), 31, 75, COLOR_TEXT)
}

function drawCurrentScene(): void {
    if (activeScene == SceneId.Intro) drawIntro()
    else if (activeScene == SceneId.Title) drawTitle()
    else if (activeScene == SceneId.Hangar) drawHangar()
    else if (activeScene == SceneId.Market) drawMarket()
    else if (activeScene == SceneId.Outfitter) drawOutfitter()
    else if (activeScene == SceneId.Missions) drawMissions()
    else if (activeScene == SceneId.StarMap) drawStarMap()
    else if (activeScene == SceneId.Status) drawStatus()
    else if (activeScene == SceneId.Flight) drawFlight()
    else if (activeScene == SceneId.Notice) drawNotice()
    else if (activeScene == SceneId.DeleteSave) drawDeleteSave()
}

function adjustTradeAmount(delta: number): void {
    if (blackMarketOpen && menuIndex >= GOOD_COUNT) {
        let rare = menuIndex - GOOD_COUNT
        transactionAmount = Math.clamp(0 - rareCargo[rare], 0, transactionAmount + delta)
        return
    }
    let unitBuy = blackMarketOpen ? blackMarketBuyPrice(menuIndex) : buyPrice(menuIndex)
    let available = blackMarketOpen ? 6 : marketStock[menuIndex]
    let maxBuy = Math.min(available, cargoCapacity() - cargoUnits())
    maxBuy = Math.min(maxBuy, Math.idiv(credits, unitBuy))
    let minSell = 0 - cargo[menuIndex]
    transactionAmount = Math.clamp(minSell, maxBuy, transactionAmount + delta)
}

function applyTrade(): void {
    let good = menuIndex
    if (blackMarketOpen && good >= GOOD_COUNT) {
        let rare = good - GOOD_COUNT
        let amount = Math.min(rareCargo[rare], 0 - transactionAmount)
        if (amount > 0) {
            let revenue = sellRareCargo(rare, amount)
            recordBlackMarketTrade(0)
            marketFeedbackText = Texts.t(435)
            marketFeedbackColor = COLOR_PURPLE
            marketFeedbackUntilMs = game.runtime() + 3000
            soundSell()
        }
        transactionOpen = false
        transactionAmount = 0
        updateAchievements()
        writeSave()
        return
    }
    if (transactionAmount > 0) {
        let amount = transactionAmount
        let unitPrice = blackMarketOpen ? blackMarketBuyPrice(good) : buyPrice(good)
        let cost = amount * unitPrice
        if (cost > credits || (!blackMarketOpen && amount > marketStock[good]) ||
            cargoUnits() + amount > cargoCapacity()) return
        credits -= cost
        cargo[good] += amount
        cargoCost[good] += cost
        if (!blackMarketOpen) marketStock[good] -= amount
        if (blackMarketOpen) recordBlackMarketTrade(0)
        else applyTradeInfluence(good, amount)
        marketFeedbackText = Texts.t(436) + Texts.t(GOOD_NAMES[good]) + Texts.t(348) + amount +
            " -" + cost
        marketFeedbackColor = COLOR_GREEN
        marketFeedbackUntilMs = game.runtime() + 2600
        soundBuy()
    } else if (transactionAmount < 0) {
        let amount = 0 - transactionAmount
        if (amount > cargo[good]) return
        let oldUnits = cargo[good]
        let removedCost = oldUnits > 0 ? Math.idiv(cargoCost[good] * amount, oldUnits) : 0
        let revenue = amount * (blackMarketOpen ? blackMarketSellPrice(good) : sellPrice(good))
        credits += revenue
        cargo[good] -= amount
        cargoCost[good] -= removedCost
        if (cargo[good] == 0) cargoCost[good] = 0
        if (!blackMarketOpen) marketStock[good] = Math.min(99, marketStock[good] + amount)
        let profit = revenue - removedCost
        if (profit > 0) tradeProfit += profit
        if (blackMarketOpen) recordBlackMarketTrade(profit)
        else {
            applyTradeInfluence(good, 0 - amount)
            recordTradeProfit(profit)
        }
        marketFeedbackText = profit >= 0 ? Texts.t(437) + profit + Texts.t(319)
            : Texts.t(438) + profit + Texts.t(319)
        marketFeedbackColor = profit >= 0 ? COLOR_GREEN : COLOR_RED
        marketFeedbackUntilMs = game.runtime() + 3000
        soundSell()
    }
    transactionOpen = false
    transactionAmount = 0
    if (!blackMarketOpen) rememberCurrentMarket()
    updateAchievements()
    writeSave()
}

function buyOutfitItem(): void {
    let cost = outfitCost(menuIndex)
    if (menuIndex == OUTFIT_SHIP_INDEX) {
        if (!shipRoleUnlocked(outfitterRolePreview)) {
            confirmOpen = false
            showNotice(Texts.t(439), Texts.t(317) + shipRoleRequiredRank(outfitterRolePreview),
                shipRoleName(outfitterRolePreview), SceneId.Outfitter)
            soundError()
            return
        }
        if (!shipOwned(outfitterRolePreview) && credits < cost) {
            confirmOpen = false
            showNotice(Texts.t(440), Texts.t(441) + (cost - credits) + Texts.t(319),
                Texts.t(315) + shipRoleName(outfitterRolePreview), SceneId.Outfitter)
            soundError()
            return
        }
        if (!buyOrSelectShip(outfitterRolePreview)) {
            confirmOpen = false
            showNotice(Texts.t(442), Texts.t(443), shipRoleName(outfitterRolePreview),
                SceneId.Outfitter)
            soundError()
            return
        }
        confirmOpen = false
        outfitterInstalledId = -1
        soundBuy()
        writeSave()
        return
    }
    if (menuIndex == OUTFIT_NAME_INDEX || menuIndex == OUTFIT_PAINT_INDEX) return
    if (cost <= 0) return
    if (credits < cost) {
        confirmOpen = false
        showNotice(Texts.t(440), Texts.t(441) + (cost - credits) + Texts.t(319), "",
            SceneId.Outfitter)
        return
    }
    credits -= cost
    if (menuIndex == 0) fuel++
    else if (menuIndex == 1) {
        hull = Math.min(maxHull(), hull + 1)
        repairModules()
    } else if (menuIndex == OUTFIT_MISSILE_INDEX) missiles++
    else if (menuIndex == OUTFIT_MINE_INDEX) mines++
    else {
        let id = menuIndex - 2
        upgrades[id]++
        if (id == UPGRADE_ARMOR) hull = Math.min(maxHull(), hull + 3)
        if (id == UPGRADE_JUMP) fuel = Math.min(maxFuel(), fuel + 1)
        outfitterInstalledId = id
    }
    confirmOpen = false
    soundBuy()
    writeSave()
}

function acceptMission(slot: number): void {
    let kind = missionOfferKind(slot)
    let amount = missionOfferAmount(slot)
    let needed = kind == MissionKind.Hunt ? 0 : amount
    if (cargoUnits() + needed > cargoCapacity()) {
        showNotice(Texts.t(444), Texts.t(445), "", SceneId.Missions)
        return
    }
    let offerSeed = missionOfferSeed(slot)
    if (missionNegotiation > 0 && !negotiationSuccess(offerSeed, missionNegotiation)) {
        missionNegotiation = 0
        changeFactionReputation(Faction.Traders, -1)
        showNotice(Texts.t(446), Texts.t(447), Texts.t(448), SceneId.Missions)
        soundError()
        return
    }
    // Read the whole offer first. Campaign and daily offers exist only while no mission is active.
    let offerSource = missionOfferSource(slot)
    let offerTarget = missionOfferTarget(slot)
    let offerDeadline = missionOfferDeadline(slot)
    let offerReward = negotiatedMissionReward(missionOfferReward(slot), missionNegotiation)
    let offerGood = missionOfferGood(slot)
    let offerVariant = missionOfferVariant(slot)
    missionKind = kind
    missionOrigin = currentWorld
    missionTarget = offerTarget
    missionDeadline = offerDeadline
    missionReward = offerReward
    missionGood = offerGood
    missionAmount = amount
    missionProgress = 0
    missionSeed = offerSeed
    missionVariant = offerVariant
    missionSource = offerSource
    if (missionSource == 3) markDailyMissionAccepted()
    if (missionSource == 2 && tutorialStage < 2) tutorialStage = 2
    let acceptedTitle = missionSource == 2 ? Texts.t(449) : (missionSource == 1 ? Texts.t(450)
        : (missionSource == 3 ? Texts.t(451) : Texts.t(452)))
    missionNegotiation = 0
    showNotice(acceptedTitle,
        missionSource == 1 ? campaignTitle(campaignStage) : missionVariantName(kind, missionVariant),
        Texts.t(345) + WORLD_NAMES[missionTarget], SceneId.Hangar)
    soundMission()
    writeSave()
}

function moveMapCursor(dx: number, dy: number): void {
    let best = mapCursorWorld
    let bestScore = 99999
    for (let i = 0; i < WORLD_COUNT; i++) {
        if (i == mapCursorWorld || !worldVisible(i)) continue
        let vx = WORLD_X[i] - WORLD_X[mapCursorWorld]
        let vy = WORLD_Y[i] - WORLD_Y[mapCursorWorld]
        if (dx > 0 && vx <= 0) continue
        if (dx < 0 && vx >= 0) continue
        if (dy > 0 && vy <= 0) continue
        if (dy < 0 && vy >= 0) continue
        let primary = dx != 0 ? Math.abs(vx) : Math.abs(vy)
        let side = dx != 0 ? Math.abs(vy) : Math.abs(vx)
        let score = primary + side * 3
        if (score < bestScore) {
            bestScore = score
            best = i
        }
    }
    mapCursorWorld = best
}

function handleDirection(dx: number, dy: number): void {
    if (inputLocked) return
    let oldMenuIndex = menuIndex
    let oldTransactionAmount = transactionAmount
    let oldMapCursorWorld = mapCursorWorld
    let oldOutfitterRole = outfitterRolePreview
    let oldGameMode = gameMode
    let oldMissionNegotiation = missionNegotiation
    let oldStatusPage = statusPage
    let oldStatusCursor = statusCursor
    let oldAchievementCursor = achievementCursor
    let directSound = false
    if (activeScene == SceneId.Title) {
        if (dy < 0) menuIndex = Math.max(0, menuIndex - 1)
        if (dy > 0) menuIndex = Math.min(TITLE_ITEM_COUNT - 1, menuIndex + 1)
        if (menuIndex == 1 && dx != 0) {
            cycleIntroMode(dx < 0 ? -1 : 1)
        } else if (menuIndex == 3 && dx != 0) {
            cycleSoundLevel(dx < 0 ? -1 : 1)
            soundNavigate()
            directSound = true
        } else if (menuIndex == 4 && dx != 0) {
            cycleEffectDensity(dx < 0 ? -1 : 1)
        } else if (menuIndex == 5 && dx != 0) {
            if (titleModeCanChange()) cycleTitleMode(dx < 0 ? -1 : 1)
            else {
                soundError()
                directSound = true
            }
        }
    } else if (activeScene == SceneId.Hangar && !confirmOpen) {
        if (dy < 0) menuIndex = Math.max(0, menuIndex - 1)
        if (dy > 0) menuIndex = Math.min(HANGAR_ITEMS.length - 1, menuIndex + 1)
    } else if (activeScene == SceneId.Market) {
        if (transactionOpen) {
            if (dx < 0) adjustTradeAmount(-1)
            if (dx > 0) adjustTradeAmount(1)
            if (dy < 0) adjustTradeAmount(5)
            if (dy > 0) adjustTradeAmount(-5)
        } else {
            if (dy < 0) menuIndex = Math.max(0, menuIndex - 1)
            if (dy > 0)
                menuIndex =
                Math.min((blackMarketOpen ? GOOD_COUNT + RARE_GOOD_COUNT : GOOD_COUNT) - 1,
                menuIndex + 1)
        }
    } else if (activeScene == SceneId.Outfitter && !confirmOpen) {
        let previousIndex = menuIndex
        if (dy < 0) menuIndex = Math.max(0, menuIndex - 1)
        if (dy > 0) menuIndex = Math.min(OUTFIT_ITEM_COUNT - 1, menuIndex + 1)
        if (menuIndex != previousIndex) outfitterInstalledId = -1
        if (menuIndex == OUTFIT_SHIP_INDEX && dx != 0) cycleOutfitterRole(dx < 0 ? -1 : 1)
        else if (menuIndex == OUTFIT_NAME_INDEX && dx != 0) {
            cycleShipName(shipRole, dx < 0 ? -1 : 1)
            writeSave()
        } else if (menuIndex == OUTFIT_PAINT_INDEX && dx != 0) {
            cycleShipPaint(shipRole, dx < 0 ? -1 : 1)
            writeSave()
        }
    } else if (activeScene == SceneId.Missions && missionKind == MissionKind.None) {
        if (dy < 0) menuIndex = Math.max(0, menuIndex - 1)
        if (dy > 0) menuIndex = Math.min(MISSION_OFFER_COUNT - 1, menuIndex + 1)
        if (dx < 0) missionNegotiation = Math.max(0, missionNegotiation - 1)
        if (dx > 0) missionNegotiation = Math.min(2, missionNegotiation + 1)
    } else if (activeScene == SceneId.StarMap) {
        moveMapCursor(dx, dy)
        lastRouteTarget = -1
    } else if (activeScene == SceneId.Status) {
        if (statusPage == STATUS_HARDWARE) {
            // Nothing to do here: all directions stay with the tester, so the live GameKit indicators can
            // show every press.
        } else if (dy != 0) {
            if (statusPage == STATUS_FACTIONS)
                statusCursor = Math.clamp(0, FACTION_COUNT - 1, statusCursor + dy)
            else if (statusPage == STATUS_LOGBOOK)
                statusCursor = Math.clamp(0, ARTIFACT_COUNT - 1, statusCursor + dy)
            else if (statusPage == STATUS_ACHIEVEMENTS)
                achievementCursor = Math.clamp(0, ACHIEVEMENT_COUNT - 1, achievementCursor + dy)
            else if (statusPage == STATUS_OPTIONS) statusCursor = Math.clamp(0, 7, statusCursor + dy)
        } else if (dx != 0) {
            statusPage = (statusPage + dx + STATUS_PAGE_COUNT) % STATUS_PAGE_COUNT
            statusCursor = 0
            listTop = 0
            if (statusPage == STATUS_HARDWARE) hardwareBTested = false
        }
    }
    if (!directSound && (menuIndex != oldMenuIndex || transactionAmount != oldTransactionAmount ||
        mapCursorWorld != oldMapCursorWorld || outfitterRolePreview != oldOutfitterRole ||
        gameMode != oldGameMode || missionNegotiation != oldMissionNegotiation ||
        statusPage != oldStatusPage || statusCursor != oldStatusCursor ||
        achievementCursor != oldAchievementCursor)) soundNavigate()
}

function handleA(): void {
    if (inputLocked) return
    if (activeScene == SceneId.Intro) finishIntro()
    else if (activeScene == SceneId.Title) {
        if (menuIndex == 0) {
            if (!hasSave) {
                let selectedMode = gameMode
                newGame()
                gameMode = selectedMode
                writeSave()
            }
            if (inTransit != 0) resumeJourney()
            else setScene(SceneId.Hangar)
        } else if (menuIndex == 1) {
            cycleIntroMode(1)
        } else if (menuIndex == 2) {
            startIntro()
        } else if (menuIndex == 3) {
            cycleSoundLevel(1)
            soundNavigate()
        } else if (menuIndex == 4) {
            cycleEffectDensity(1)
            soundNavigate()
        } else if (menuIndex == 5) {
            if (titleModeCanChange()) {
                cycleTitleMode(1)
                soundNavigate()
            } else {
                showNotice(Texts.t(453), Texts.t(143), gameModeName(gameMode), SceneId.Title)
                soundError()
            }
        } else if (menuIndex == 6) {
            statusPage = STATUS_OPTIONS
            statusCursor = 0
            statusReturnScene = SceneId.Title
            setScene(SceneId.Status)
        } else if (menuIndex == 7) {
            statusPage = STATUS_HARDWARE
            statusCursor = 0
            hardwareBTested = false
            statusReturnScene = SceneId.Title
            setScene(SceneId.Status)
        } else if (menuIndex == 8 && canStartNewGamePlus()) {
            confirmNewGamePlus = true
            setScene(SceneId.DeleteSave)
        } else if (menuIndex == 9 && hasSave) {
            confirmNewGamePlus = false
            setScene(SceneId.DeleteSave)
        } else soundError()
    } else if (activeScene == SceneId.Hangar) {
        if (confirmOpen) skipGuidedDelivery()
        else if (menuIndex == 0) {
            blackMarketOpen = false
            rememberCurrentMarket()
            setScene(SceneId.Market)
        } else if (menuIndex == 1) {
            if (!blackMarketAvailable()) {
                showNotice(Texts.t(454), Texts.t(455), Texts.t(456), SceneId.Hangar)
                soundError()
            } else {
                blackMarketOpen = true
                setScene(SceneId.Market)
            }
        } else if (menuIndex == 2) {
            outfitterInstalledId = -1
            outfitterRolePreview = shipRole
            setScene(SceneId.Outfitter)
        } else if (menuIndex == 3) {
            missionNegotiation = 0
            setScene(SceneId.Missions)
        } else if (menuIndex == 4) {
            mapPreviousRouteTarget = routeHopCount() > 0 ? routeWorldAt(routeHopCount()) : destinationWorld
            mapCursorWorld = mapPreviousRouteTarget
            lastRouteTarget = -1
            setScene(SceneId.StarMap)
        } else if (menuIndex == 5) {
            statusPage = STATUS_SHIP
            statusCursor = 0
            statusReturnScene = SceneId.Hangar
            setScene(SceneId.Status)
        } else if (menuIndex == 6) {
            statusPage = STATUS_FACTIONS
            statusCursor = dominantFaction()
            statusReturnScene = SceneId.Hangar
            setScene(SceneId.Status)
        } else if (menuIndex == 7) {
            statusPage = STATUS_LOGBOOK
            statusReturnScene = SceneId.Hangar
            setScene(SceneId.Status)
        } else if (menuIndex == 8) {
            statusPage = STATUS_OPTIONS
            statusCursor = 0
            statusReturnScene = SceneId.Hangar
            setScene(SceneId.Status)
        }
        else if (destinationWorld != currentWorld) startJourney()
        else soundError()
    } else if (activeScene == SceneId.Market) {
        if (transactionOpen) applyTrade()
        else {
            transactionOpen = true
            transactionAmount = 0
            if (blackMarketOpen && menuIndex >= GOOD_COUNT) {
                if (rareCargo[menuIndex - GOOD_COUNT] > 0) transactionAmount = -1
            } else {
                let available = blackMarketOpen ? 6 : marketStock[menuIndex]
                let unitBuy = blackMarketOpen ? blackMarketBuyPrice(menuIndex) : buyPrice(menuIndex)
                if (available > 0 && credits >= unitBuy && cargoUnits() < cargoCapacity())
                    transactionAmount = 1
                else if (cargo[menuIndex] > 0) transactionAmount = -1
            }
        }
    } else if (activeScene == SceneId.Outfitter) {
        if (confirmOpen) buyOutfitItem()
        else if (menuIndex == OUTFIT_SHIP_INDEX) {
            if (outfitterRolePreview == shipRole) soundError()
            else if (!shipRoleUnlocked(outfitterRolePreview)) {
                showNotice(Texts.t(457), Texts.t(458) + shipRoleRequiredRank(outfitterRolePreview),
                    shipRoleName(outfitterRolePreview), SceneId.Outfitter)
                soundError()
            } else if (outfitCost(menuIndex) > credits) {
                showNotice(Texts.t(440),
                    Texts.t(441) + (outfitCost(menuIndex) - credits) + Texts.t(319),
                    shipRoleName(outfitterRolePreview), SceneId.Outfitter)
                soundError()
            } else confirmOpen = true
        }
        else if (menuIndex == OUTFIT_NAME_INDEX) {
            cycleShipName(shipRole, 1)
            writeSave()
        } else if (menuIndex == OUTFIT_PAINT_INDEX) {
            cycleShipPaint(shipRole, 1)
            writeSave()
        }
        else if (menuIndex >= 2 && menuIndex < OUTFIT_SHIP_INDEX &&
            upgrades[menuIndex - 2] >= UPGRADE_MAX[menuIndex - 2]) soundError()
        else if (outfitCost(menuIndex) <= 0) soundError()
        else {
            outfitterInstalledId = -1
            confirmOpen = true
        }
    } else if (activeScene == SceneId.Missions) {
        if (missionKind == MissionKind.None) acceptMission(menuIndex)
        else if (confirmOpen) {
            let abandonedKind = missionKind
            let abandonedVariant = missionVariant
            let training = missionSource == 2
            if (training && tutorialStage < 4) tutorialStage = 1
            if (!training) {
                failedMissions++
                changeFactionReputation(missionFaction(abandonedKind, abandonedVariant), -2)
            }
            clearMission()
            confirmOpen = false
            writeSave()
            showNotice(training ? Texts.t(459) : Texts.t(460),
                training ? Texts.t(461) : Texts.t(462), "", SceneId.Hangar)
        } else confirmOpen = true
    } else if (activeScene == SceneId.StarMap) {
        if (mapCursorWorld == currentWorld) {
            clearPlannedRoute()
            destinationWorld = currentWorld
            setScene(SceneId.Hangar)
        } else if (planRouteTo(mapCursorWorld) && routeHopCount() > 0) {
            destinationWorld = routeWorldAt(1)
            setScene(SceneId.Hangar)
        } else {
            showNotice(Texts.t(463), Texts.t(464), Texts.t(465), SceneId.StarMap)
        }
    } else if (activeScene == SceneId.Status) {
        if (statusPage == STATUS_FACTIONS && campaignComplete() && endingChoice == EndingKind.None) {
            let ending = endingForFaction(statusCursor)
            if (endingAvailable(ending) && chooseEnding(ending)) {
                writeSave()
                showNotice(Texts.t(466), endingName(ending), Texts.t(467), SceneId.Status)
            } else {
                showNotice(Texts.t(468), Texts.t(469), endingName(ending), SceneId.Status)
                soundError()
            }
        } else if (statusPage == STATUS_OPTIONS) {
            if (statusCursor == 0) cycleTextSpeed(1)
            else if (statusCursor == 1) toggleHighContrast()
            else if (statusCursor == 2) toggleCameraShake()
            else if (statusCursor == 3) cycleIntroMode(1)
            else if (statusCursor == 4) cycleSoundLevel(1)
            else if (statusCursor == 5) cycleEffectDensity(1)
            else if (statusCursor == 6) {
                writeManualSave()
                showNotice(Texts.t(470), WORLD_NAMES[currentWorld] + Texts.t(471) + orbitDay,
                    Texts.t(472), SceneId.Status)
            } else if (manualSaveExists()) {
                loadManualSave()
                showNotice(Texts.t(473), WORLD_NAMES[currentWorld] + Texts.t(471) + orbitDay,
                    Texts.t(474), SceneId.Status)
            } else soundError()
            if (statusCursor <= 2 && hasSave) writeSave()
        } else if (statusPage == STATUS_HARDWARE) {
            soundMission()
        } else if (statusPage == STATUS_DEVELOPER) {
            toggleDeveloperMode()
        }
    }
    else if (activeScene == SceneId.Notice) {
        noticeRenderKey = ""
        setScene(returnScene)
    }
    else if (activeScene == SceneId.DeleteSave) {
        if (confirmNewGamePlus) startNewGamePlus()
        else eraseSave()
        confirmNewGamePlus = false
        setScene(SceneId.Title)
    }
}

function handleB(): void {
    if (inputLocked) return
    if (activeScene == SceneId.Intro) finishIntro()
    else if (activeScene == SceneId.Title) {
        // B does nothing on the title screen. Actions that delete something have their own visible menu entries.
    } else if (activeScene == SceneId.Hangar) {
        // During the guided first delivery, B asks whether to skip it. Pressing B again keeps the guide.
        if (confirmOpen) confirmOpen = false
        else if (guidedDeliveryRunning()) confirmOpen = true
        else setScene(SceneId.Title)
    }
    else if (activeScene == SceneId.Market) {
        if (transactionOpen) {
            transactionOpen = false
            transactionAmount = 0
        } else setScene(SceneId.Hangar)
    } else if (activeScene == SceneId.Outfitter) {
        if (confirmOpen) confirmOpen = false
        else {
            writeSave()
            setScene(SceneId.Hangar)
        }
    } else if (activeScene == SceneId.Missions) {
        if (confirmOpen) confirmOpen = false
        else setScene(SceneId.Hangar)
    } else if (activeScene == SceneId.StarMap) {
        if (mapPreviousRouteTarget != currentWorld) planRouteTo(mapPreviousRouteTarget)
        else clearPlannedRoute()
        setScene(SceneId.Hangar)
    } else if (activeScene == SceneId.Status) {
        if (statusPage == STATUS_HARDWARE && !hardwareBTested) {
            hardwareBTested = true
            soundNavigate()
        } else setScene(statusReturnScene)
    }
    else if (activeScene == SceneId.Notice) {
        noticeRenderKey = ""
        setScene(returnScene)
    }
    else if (activeScene == SceneId.DeleteSave) {
        confirmNewGamePlus = false
        setScene(SceneId.Title)
    }
}

// The font font8 draws every letter of the game, including accents, which the small font5 cannot.
// Every letter is six pixels wide. A label that is too long scrolls instead of losing words.
function printGameText(text: string, x: number, y: number, color: number): void {
    x = Math.max(0, x)
    let columns = Math.max(1, Math.idiv(160 - x, 6))
    screen.print(fitText(text, columns), x, y, color, image.font8)
}

function printWrappedText(text: string, x: number, y: number, columns: number, color: number): number {
    let offset = 0
    while (offset < text.length) {
        let count = Math.min(columns, text.length - offset)
        if (offset + count < text.length) {
            let boundary = count
            while (boundary > 0 && text.charAt(offset + boundary) != " ") boundary--
            if (boundary > 0) count = boundary
        }
        printGameText(text.substr(offset, count), x, y, color)
        offset += count
        while (text.charAt(offset) == " ") offset++
        y += 10
    }
    return y
}
