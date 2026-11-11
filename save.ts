// Saving and loading the game: two automatic slots and one slot for saving by hand.
const SAVE_MAGIC = 731904
const SAVE_VERSION = 3
const SAVE_VERSION_V1 = 1
const SAVE_VERSION_V2 = 2
const SAVE_KEY_A = "ot.save.a"
const SAVE_KEY_B = "ot.save.b"
const SAVE_KEY_MANUAL = "ot.save.manual"

const SAVE_CORE_FIELD_COUNT = 26
const SAVE_V2_LEGACY_EXTRA_FIELD_COUNT = 11
const SAVE_V3_NEW_FIELD_COUNT = 200
const SAVE_V3_EXTRA_FIELD_COUNT = SAVE_V2_LEGACY_EXTRA_FIELD_COUNT + SAVE_V3_NEW_FIELD_COUNT
// An old name that nothing reads any more. In a current save the cargo lists start after all the fields of
// the newer versions.
const SAVE_V2_EXTRA_FIELD_COUNT = SAVE_V3_EXTRA_FIELD_COUNT
const SAVE_ARRAY_FIELD_COUNT = GOOD_COUNT * 3 + UPGRADE_COUNT
const SAVE_MAX_COUNTER = 9999999
const SAVE_MAX_SCORE = 999999999
const SAVE_MAX_SEQUENCE = 2000000000
const SAVE_MAX_SEED = 32748

function saveChecksumLength(values: number[], length: number): number {
    let result = 19
    for (let i = 0; i < length; i++) {
        let part = values[i] % 1000003
        if (part < 0) part += 1000003
        result = (result + part * (i + 7)) % 1000003
    }
    return result
}

function saveChecksum(values: number[]): number {
    return saveChecksumLength(values, values.length)
}

function expectedSaveLengthForVersion(version: number): number {
    let extra = 0
    if (version == SAVE_VERSION_V2) extra = SAVE_V2_LEGACY_EXTRA_FIELD_COUNT
    else if (version == SAVE_VERSION) extra = SAVE_V3_EXTRA_FIELD_COUNT
    return SAVE_CORE_FIELD_COUNT + extra + SAVE_ARRAY_FIELD_COUNT + 1
}

function expectedSaveLength(): number {
    return expectedSaveLengthForVersion(SAVE_VERSION)
}

function saveIntegerInRange(value: number, minimum: number, maximum: number): boolean {
    return value == (value | 0) && value >= minimum && value <= maximum
}

function ensureV3State(): void {
    if (!reputations || reputations.length != FACTION_COUNT)
        reputations = fillNumberArray(FACTION_COUNT, 0)
    if (!marketInfluence || marketInfluence.length != WORLD_COUNT)
        marketInfluence = fillNumberArray(WORLD_COUNT, 0)
    if (!marketMemoryDay || marketMemoryDay.length != WORLD_COUNT)
        marketMemoryDay = fillNumberArray(WORLD_COUNT, 0)
    if (!marketMemoryGood || marketMemoryGood.length != WORLD_COUNT)
        marketMemoryGood = fillNumberArray(WORLD_COUNT, 0)
    if (!marketMemoryBuy || marketMemoryBuy.length != WORLD_COUNT)
        marketMemoryBuy = fillNumberArray(WORLD_COUNT, 0)
    if (!marketMemorySell || marketMemorySell.length != WORLD_COUNT)
        marketMemorySell = fillNumberArray(WORLD_COUNT, 0)
    if (!marketMemoryTrend || marketMemoryTrend.length != WORLD_COUNT)
        marketMemoryTrend = fillNumberArray(WORLD_COUNT, 0)
    if (!rareCargo || rareCargo.length != RARE_GOOD_COUNT) rareCargo = fillNumberArray(RARE_GOOD_COUNT, 0)
    if (!shipNameId || shipNameId.length != SHIP_ROLE_COUNT) shipNameId = [0, 1, 2]
    if (!shipPaint || shipPaint.length != SHIP_ROLE_COUNT)
        shipPaint = fillNumberArray(SHIP_ROLE_COUNT, 0)
    if (!moduleDamage || moduleDamage.length != SHIP_MODULE_COUNT)
        moduleDamage = fillNumberArray(SHIP_MODULE_COUNT, 0)
    ownedShipsMask |= (1 << ShipRole.Trader) | (1 << shipRole)
}

function appendLegacyV2Fields(values: number[]): void {
    values.push(tutorialStage)
    values.push(campaignStage)
    values.push(missionVariant)
    values.push(missionSource)
    values.push(galaxySeed)
    values.push(marketEventKind)
    values.push(marketEventWorld)
    values.push(marketEventGood)
    values.push(marketEventEnds)
    values.push(shipRole)
    values.push(gameMode)
}

function appendV3Fields(values: number[]): void {
    for (let i = 0; i < FACTION_COUNT; i++) values.push(reputations[i])
    values.push(endingChoice)
    for (let i = 0; i < WORLD_COUNT; i++) values.push(marketInfluence[i])
    for (let i = 0; i < WORLD_COUNT; i++) values.push(marketMemoryDay[i])
    for (let i = 0; i < WORLD_COUNT; i++) values.push(marketMemoryGood[i])
    for (let i = 0; i < WORLD_COUNT; i++) values.push(marketMemoryBuy[i])
    for (let i = 0; i < WORLD_COUNT; i++) values.push(marketMemorySell[i])
    for (let i = 0; i < WORLD_COUNT; i++) values.push(marketMemoryTrend[i])
    for (let i = 0; i < RARE_GOOD_COUNT; i++) values.push(rareCargo[i])
    values.push(artifactMask)
    values.push(secretWorldMask)
    values.push(ownedShipsMask)
    for (let i = 0; i < SHIP_ROLE_COUNT; i++) values.push(shipNameId[i])
    for (let i = 0; i < SHIP_ROLE_COUNT; i++) values.push(shipPaint[i])
    values.push(achievementMask)
    values.push(visitedWorldMaskLow)
    values.push(visitedWorldMaskHigh)
    values.push(totalJumps)
    values.push(totalRescues)
    values.push(totalDeliveries)
    values.push(totalCreditsEarned)
    values.push(largestTradeProfit)
    values.push(bossVictories)
    values.push(blackMarketTrades)
    values.push(completedEvents)
    values.push(dailyMissionDay)
    values.push(dailyMissionDone)
    values.push(newGamePlusLevel)
    values.push(activeWeapon)
    values.push(missiles)
    values.push(mines)
    values.push(weaponEnergy)
    values.push(energyMode)
    for (let i = 0; i < SHIP_MODULE_COUNT; i++) values.push(moduleDamage[i])
    values.push(textSpeed)
    values.push(highContrast)
    values.push(cameraShake)
    values.push(developerMode)
}

function appendSaveArrays(values: number[]): void {
    for (let i = 0; i < GOOD_COUNT; i++) values.push(cargo[i])
    for (let i = 0; i < GOOD_COUNT; i++) values.push(cargoCost[i])
    for (let i = 0; i < UPGRADE_COUNT; i++) values.push(upgrades[i])
    for (let i = 0; i < GOOD_COUNT; i++) values.push(marketStock[i])
}

function packSave(): number[] {
    ensureV3State()
    let values: number[] = []
    values.push(SAVE_MAGIC)
    values.push(SAVE_VERSION)
    values.push(saveSequence)
    values.push(currentWorld)
    values.push(destinationWorld)
    values.push(orbitDay)
    values.push(credits)
    values.push(fuel)
    values.push(hull)
    values.push(tradeProfit)
    values.push(totalVictories)
    values.push(completedMissions)
    values.push(failedMissions)
    values.push(missionKind)
    values.push(missionOrigin)
    values.push(missionTarget)
    values.push(missionDeadline)
    values.push(missionReward)
    values.push(missionGood)
    values.push(missionAmount)
    values.push(missionProgress)
    values.push(missionSeed)
    values.push(inTransit)
    values.push(transitOrigin)
    values.push(transitTarget)
    values.push(transitSeed)
    appendLegacyV2Fields(values)
    appendV3Fields(values)
    appendSaveArrays(values)
    values.push(saveChecksum(values))
    return values
}

function validSaveChecksum(values: number[]): boolean {
    let checksumIndex = values.length - 1
    if (!saveIntegerInRange(values[checksumIndex], 0, 1000002)) return false
    return saveChecksumLength(values, checksumIndex) == values[checksumIndex]
}

function validSaveCore(values: number[], arrayStart: number, savedShipRole: number): boolean {
    if (!saveIntegerInRange(values[2], 0, SAVE_MAX_SEQUENCE)) return false
    if (!saveIntegerInRange(values[3], 0, WORLD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[4], 0, WORLD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[5], 1, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[6], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[9], 0, SAVE_MAX_SCORE)) return false
    if (!saveIntegerInRange(values[10], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[11], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[12], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[13], MissionKind.None, MissionKind.Rescue)) return false
    if (!saveIntegerInRange(values[14], 0, WORLD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[15], 0, WORLD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[16], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[17], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[18], 0, GOOD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[19], 0, 99)) return false
    if (!saveIntegerInRange(values[20], 0, values[19])) return false
    if (!saveIntegerInRange(values[21], 0, SAVE_MAX_SEED)) return false
    if (!saveIntegerInRange(values[22], 0, 1)) return false
    if (!saveIntegerInRange(values[23], 0, WORLD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[24], 0, WORLD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[25], 0, SAVE_MAX_SEED)) return false
    if (values[22] == 1 && values[23] == values[24]) return false
    if (values[13] == MissionKind.None) {
        if (values[16] != 0 || values[17] != 0 || values[19] != 0 || values[20] != 0) return false
    } else if (values[16] < 1 || values[17] < 1 || values[19] < 1) return false

    let upgradeStart = arrayStart + GOOD_COUNT * 2
    for (let i = 0; i < UPGRADE_COUNT; i++) {
        if (!saveIntegerInRange(values[upgradeStart + i], 0, UPGRADE_MAX[i])) return false
    }
    let savedCargoCapacity = 8 + values[upgradeStart + UPGRADE_CARGO] * 4
    if (savedShipRole == ShipRole.Trader) savedCargoCapacity += 4
    let savedMaxFuel = 5 + values[upgradeStart + UPGRADE_JUMP]
    if (savedShipRole == ShipRole.Courier) savedMaxFuel += 2
    let savedMaxHull = 8 + values[upgradeStart + UPGRADE_ARMOR] * 3
    if (!saveIntegerInRange(values[7], 0, savedMaxFuel)) return false
    if (!saveIntegerInRange(values[8], 1, savedMaxHull)) return false
    let usedCargo = values[13] == MissionKind.Delivery || values[13] == MissionKind.Rescue ? values[19] : 0
    for (let i = 0; i < GOOD_COUNT; i++) {
        let units = values[arrayStart + i]
        let cost = values[arrayStart + GOOD_COUNT + i]
        if (!saveIntegerInRange(units, 0, savedCargoCapacity)) return false
        if (!saveIntegerInRange(cost, 0, SAVE_MAX_COUNTER)) return false
        if (units == 0 && cost != 0) return false
        usedCargo += units
    }
    if (usedCargo > savedCargoCapacity) return false
    let stockStart = upgradeStart + UPGRADE_COUNT
    for (let i = 0; i < GOOD_COUNT; i++)
        if (!saveIntegerInRange(values[stockStart + i], 0, 99)) return false
    return true
}

function validLegacyV2Fields(values: number[], start: number): boolean {
    let p = start
    if (!saveIntegerInRange(values[p++], 0, 4)) return false
    if (!saveIntegerInRange(values[p++], 0, CAMPAIGN_MISSION_COUNT)) return false
    if (!saveIntegerInRange(values[p++], MissionVariant.Standard, MissionVariant.UnderFire)) return false
    if (!saveIntegerInRange(values[p++], 0, 3)) return false
    if (!saveIntegerInRange(values[p++], 1, SAVE_MAX_SEED)) return false
    if (!saveIntegerInRange(values[p++], MarketEventKind.None, MarketEventKind.Boom)) return false
    if (!saveIntegerInRange(values[p++], 0, WORLD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[p++], 0, GOOD_COUNT - 1)) return false
    if (!saveIntegerInRange(values[p++], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[p++], ShipRole.Trader, ShipRole.Hunter)) return false
    if (!saveIntegerInRange(values[p++], GameMode.Standard, GameMode.Iron)) return false
    return true
}

function validSaveV1(values: number[]): boolean {
    if (values.length != expectedSaveLengthForVersion(SAVE_VERSION_V1)) return false
    if (!validSaveChecksum(values)) return false
    return validSaveCore(values, SAVE_CORE_FIELD_COUNT, -1)
}

function validSaveV2(values: number[]): boolean {
    if (values.length != expectedSaveLengthForVersion(SAVE_VERSION_V2)) return false
    if (!validSaveChecksum(values) ||
        !validLegacyV2Fields(values, SAVE_CORE_FIELD_COUNT)) return false
    return validSaveCore(values, SAVE_CORE_FIELD_COUNT +
        SAVE_V2_LEGACY_EXTRA_FIELD_COUNT, values[35])
}

function validSaveV3Fields(values: number[], start: number, arrayStart: number): boolean {
    let p = start
    for (let i = 0; i < FACTION_COUNT; i++) if (!saveIntegerInRange(values[p++], -100, 100)) return false
    if (!saveIntegerInRange(values[p++], EndingKind.None, EndingKind.Outlaw)) return false
    for (let i = 0; i < WORLD_COUNT; i++) if (!saveIntegerInRange(values[p++], -20, 20)) return false
    for (let i = 0; i < WORLD_COUNT; i++) if (!saveIntegerInRange(values[p++], 0, SAVE_MAX_COUNTER))
        return false
    for (let i = 0; i < WORLD_COUNT; i++) if (!saveIntegerInRange(values[p++], 0, GOOD_COUNT - 1))
        return false
    for (let i = 0; i < WORLD_COUNT; i++) if (!saveIntegerInRange(values[p++], 0, 9999)) return false
    for (let i = 0; i < WORLD_COUNT; i++) if (!saveIntegerInRange(values[p++], 0, 9999)) return false
    for (let i = 0; i < WORLD_COUNT; i++) if (!saveIntegerInRange(values[p++], -2, 2)) return false
    let rareUnits = 0
    for (let i = 0; i < RARE_GOOD_COUNT; i++) {
        if (!saveIntegerInRange(values[p], 0, 99)) return false
        rareUnits += values[p++]
    }
    if (!saveIntegerInRange(values[p++], 0, (1 << ARTIFACT_COUNT) - 1)) return false
    if (!saveIntegerInRange(values[p++], 0,
        (1 << (WORLD_COUNT - PUBLIC_WORLD_COUNT)) - 1)) return false
    let savedOwnedShips = values[p++]
    if (!saveIntegerInRange(savedOwnedShips, 1, (1 << SHIP_ROLE_COUNT) - 1)) return false
    if ((savedOwnedShips & 1) == 0 ||
        (savedOwnedShips & (1 << values[35])) == 0) return false
    for (let i = 0; i < SHIP_ROLE_COUNT; i++)
        if (!saveIntegerInRange(values[p++], 0, SHIP_NAME_COUNT - 1))
        return false
    for (let i = 0; i < SHIP_ROLE_COUNT; i++)
        if (!saveIntegerInRange(values[p++], 0, PAINT_COUNT - 1))
        return false
    if (!saveIntegerInRange(values[p++], 0, (1 << ACHIEVEMENT_COUNT) - 1)) return false
    if (!saveIntegerInRange(values[p++], 0, 65535)) return false
    if (!saveIntegerInRange(values[p++], 0, 1023)) return false
    for (let i = 0; i < 3; i++) if (!saveIntegerInRange(values[p++], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[p++], 0, SAVE_MAX_SCORE)) return false
    if (!saveIntegerInRange(values[p++], 0, SAVE_MAX_COUNTER)) return false
    for (let i = 0; i < 3; i++) if (!saveIntegerInRange(values[p++], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[p++], 0, SAVE_MAX_COUNTER)) return false
    if (!saveIntegerInRange(values[p++], 0, 1)) return false
    if (!saveIntegerInRange(values[p++], 0, 9)) return false
    if (!saveIntegerInRange(values[p++], WeaponKind.Laser, WeaponKind.Mine)) return false
    if (!saveIntegerInRange(values[p++], 0, 12)) return false
    if (!saveIntegerInRange(values[p++], 0, 8)) return false
    if (!saveIntegerInRange(values[p++], 0, 100)) return false
    if (!saveIntegerInRange(values[p++], 0, 3)) return false
    for (let i = 0; i < SHIP_MODULE_COUNT; i++) if (!saveIntegerInRange(values[p++], 0, 3)) return false
    if (!saveIntegerInRange(values[p++], 0, 2)) return false
    if (!saveIntegerInRange(values[p++], 0, 1)) return false
    if (!saveIntegerInRange(values[p++], 0, 1)) return false
    if (!saveIntegerInRange(values[p++], 0, 1)) return false
    if (p != arrayStart) return false
    let upgradeStart = arrayStart + GOOD_COUNT * 2
    let capacity = 8 + values[upgradeStart + UPGRADE_CARGO] * 4 +
        (values[SAVE_CORE_FIELD_COUNT + 9] == ShipRole.Trader ? 4 : 0)
    let baseUsed = values[13] == MissionKind.Delivery || values[13] == MissionKind.Rescue ? values[19] : 0
    for (let i = 0; i < GOOD_COUNT; i++) baseUsed += values[arrayStart + i]
    return baseUsed + rareUnits <= capacity
}

function validSaveV3(values: number[]): boolean {
    if (values.length != expectedSaveLength()) return false
    if (!validSaveChecksum(values) ||
        !validLegacyV2Fields(values, SAVE_CORE_FIELD_COUNT)) return false
    let arraysStart = SAVE_CORE_FIELD_COUNT + SAVE_V3_EXTRA_FIELD_COUNT
    if (!validSaveV3Fields(values, SAVE_CORE_FIELD_COUNT +
        SAVE_V2_LEGACY_EXTRA_FIELD_COUNT, arraysStart))
        return false
    return validSaveCore(values, arraysStart, values[35])
}

function validSave(values: number[]): boolean {
    if (!values || values.length < 3 || values[0] != SAVE_MAGIC) return false
    if (values[1] == SAVE_VERSION_V1) return validSaveV1(values)
    if (values[1] == SAVE_VERSION_V2) return validSaveV2(values)
    if (values[1] == SAVE_VERSION) return validSaveV3(values)
    return false
}

function saveSlot(key: string): number[] {
    if (!settings.exists(key)) return null
    return settings.readNumberArray(key)
}

function newestValidSave(a: number[], b: number[]): number[] {
    let validA = validSave(a)
    let validB = validSave(b)
    if (!validA) return validB ? b : null
    if (!validB) return a
    return a[2] >= b[2] ? a : b
}

function writeSave(): void {
    saveSequence++
    let values = packSave()
    if (saveSequence % 2 == 0) settings.writeNumberArray(SAVE_KEY_A, values)
    else settings.writeNumberArray(SAVE_KEY_B, values)
    hasSave = true
}

function manualSaveExists(): boolean {
    return validSave(saveSlot(SAVE_KEY_MANUAL))
}

function writeManualSave(): void {
    saveSequence++
    settings.writeNumberArray(SAVE_KEY_MANUAL, packSave())
    hasSave = true
}

function loadManualSave(): boolean {
    let values = saveSlot(SAVE_KEY_MANUAL)
    if (!validSave(values)) return false
    let newest = saveSequence
    unpackSave(values)
    // Continue counting after the newest automatic save. Otherwise the next start would load that one again.
    saveSequence = Math.max(saveSequence, newest)
    writeSave()
    return true
}

function eraseManualSave(): void {
    if (settings.exists(SAVE_KEY_MANUAL)) settings.remove(SAVE_KEY_MANUAL)
}

function migratedGalaxySeed(world: number, day: number): number {
    return 1 + stableHash(world, day, 17) % SAVE_MAX_SEED
}

function initializeMigratedV2State(): void {
    reputations = fillNumberArray(FACTION_COUNT, 0)
    endingChoice = EndingKind.None
    marketInfluence = fillNumberArray(WORLD_COUNT, 0)
    marketMemoryDay = fillNumberArray(WORLD_COUNT, 0)
    marketMemoryGood = fillNumberArray(WORLD_COUNT, 0)
    marketMemoryBuy = fillNumberArray(WORLD_COUNT, 0)
    marketMemorySell = fillNumberArray(WORLD_COUNT, 0)
    marketMemoryTrend = fillNumberArray(WORLD_COUNT, 0)
    rareCargo = fillNumberArray(RARE_GOOD_COUNT, 0)
    artifactMask = 0
    secretWorldMask = 0
    ownedShipsMask = (1 << ShipRole.Trader) | (1 << shipRole)
    shipNameId = [0, 1, 2]
    shipPaint = fillNumberArray(SHIP_ROLE_COUNT, 0)
    achievementMask = 0
    visitedWorldMaskLow = currentWorld < 16 ? 1 << currentWorld : 0
    visitedWorldMaskHigh = currentWorld >= 16 ? 1 << (currentWorld - 16) : 0
    totalJumps = 0
    totalRescues = 0
    totalDeliveries = 0
    totalCreditsEarned = 0
    largestTradeProfit = 0
    bossVictories = 0
    blackMarketTrades = 0
    completedEvents = 0
    dailyMissionDay = 0
    dailyMissionDone = 0
    newGamePlusLevel = 0
    activeWeapon = WeaponKind.Laser
    missiles = 3
    mines = 2
    weaponEnergy = 100
    energyMode = 0
    moduleDamage = fillNumberArray(SHIP_MODULE_COUNT, 0)
    textSpeed = 1
    highContrast = 0
    cameraShake = 1
    developerMode = 0
}

function readLegacyV2Fields(values: number[], p: number): number {
    tutorialStage = values[p++]
    campaignStage = values[p++]
    missionVariant = values[p++]
    missionSource = values[p++]
    galaxySeed = values[p++]
    marketEventKind = values[p++]
    marketEventWorld = values[p++]
    marketEventGood = values[p++]
    marketEventEnds = values[p++]
    shipRole = values[p++]
    gameMode = values[p++]
    return p
}

function readV3Fields(values: number[], p: number): number {
    reputations = fillNumberArray(FACTION_COUNT, 0)
    for (let i = 0; i < FACTION_COUNT; i++) reputations[i] = values[p++]
    endingChoice = values[p++]
    marketInfluence = fillNumberArray(WORLD_COUNT, 0)
    for (let i = 0; i < WORLD_COUNT; i++) marketInfluence[i] = values[p++]
    marketMemoryDay = fillNumberArray(WORLD_COUNT, 0)
    for (let i = 0; i < WORLD_COUNT; i++) marketMemoryDay[i] = values[p++]
    marketMemoryGood = fillNumberArray(WORLD_COUNT, 0)
    for (let i = 0; i < WORLD_COUNT; i++) marketMemoryGood[i] = values[p++]
    marketMemoryBuy = fillNumberArray(WORLD_COUNT, 0)
    for (let i = 0; i < WORLD_COUNT; i++) marketMemoryBuy[i] = values[p++]
    marketMemorySell = fillNumberArray(WORLD_COUNT, 0)
    for (let i = 0; i < WORLD_COUNT; i++) marketMemorySell[i] = values[p++]
    marketMemoryTrend = fillNumberArray(WORLD_COUNT, 0)
    for (let i = 0; i < WORLD_COUNT; i++) marketMemoryTrend[i] = values[p++]
    rareCargo = fillNumberArray(RARE_GOOD_COUNT, 0)
    for (let i = 0; i < RARE_GOOD_COUNT; i++) rareCargo[i] = values[p++]
    artifactMask = values[p++]
    secretWorldMask = values[p++]
    ownedShipsMask = values[p++]
    shipNameId = fillNumberArray(SHIP_ROLE_COUNT, 0)
    for (let i = 0; i < SHIP_ROLE_COUNT; i++) shipNameId[i] = values[p++]
    shipPaint = fillNumberArray(SHIP_ROLE_COUNT, 0)
    for (let i = 0; i < SHIP_ROLE_COUNT; i++) shipPaint[i] = values[p++]
    achievementMask = values[p++]
    visitedWorldMaskLow = values[p++]
    visitedWorldMaskHigh = values[p++]
    totalJumps = values[p++]
    totalRescues = values[p++]
    totalDeliveries = values[p++]
    totalCreditsEarned = values[p++]
    largestTradeProfit = values[p++]
    bossVictories = values[p++]
    blackMarketTrades = values[p++]
    completedEvents = values[p++]
    dailyMissionDay = values[p++]
    dailyMissionDone = values[p++]
    newGamePlusLevel = values[p++]
    activeWeapon = values[p++]
    missiles = values[p++]
    mines = values[p++]
    weaponEnergy = values[p++]
    energyMode = values[p++]
    moduleDamage = fillNumberArray(SHIP_MODULE_COUNT, 0)
    for (let i = 0; i < SHIP_MODULE_COUNT; i++) moduleDamage[i] = values[p++]
    textSpeed = values[p++]
    highContrast = values[p++]
    cameraShake = values[p++]
    developerMode = values[p++]
    return p
}

function unpackSave(values: number[]): void {
    let version = values[1]
    let p = 2
    saveSequence = values[p++]
    currentWorld = values[p++]
    destinationWorld = values[p++]
    orbitDay = values[p++]
    credits = values[p++]
    fuel = values[p++]
    hull = values[p++]
    tradeProfit = values[p++]
    totalVictories = values[p++]
    completedMissions = values[p++]
    failedMissions = values[p++]
    missionKind = values[p++]
    missionOrigin = values[p++]
    missionTarget = values[p++]
    missionDeadline = values[p++]
    missionReward = values[p++]
    missionGood = values[p++]
    missionAmount = values[p++]
    missionProgress = values[p++]
    missionSeed = values[p++]
    inTransit = values[p++]
    transitOrigin = values[p++]
    transitTarget = values[p++]
    transitSeed = values[p++]
    if (version >= SAVE_VERSION_V2) p = readLegacyV2Fields(values, p)
    else {
        tutorialStage = 1
        campaignStage = 0
        missionVariant = MissionVariant.Standard
        missionSource = 0
        galaxySeed = migratedGalaxySeed(currentWorld, orbitDay)
        marketEventKind = MarketEventKind.None
        marketEventWorld = 0
        marketEventGood = 0
        marketEventEnds = 0
        shipRole = ShipRole.Trader
        gameMode = GameMode.Standard
    }
    if (version == SAVE_VERSION) p = readV3Fields(values, p)
    else initializeMigratedV2State()
    cargo = fillNumberArray(GOOD_COUNT, 0)
    cargoCost = fillNumberArray(GOOD_COUNT, 0)
    upgrades = fillNumberArray(UPGRADE_COUNT, 0)
    marketStock = fillNumberArray(GOOD_COUNT, 0)
    for (let i = 0; i < GOOD_COUNT; i++) cargo[i] = values[p++]
    for (let i = 0; i < GOOD_COUNT; i++) cargoCost[i] = values[p++]
    for (let i = 0; i < UPGRADE_COUNT; i++) upgrades[i] = values[p++]
    for (let i = 0; i < GOOD_COUNT; i++) marketStock[i] = values[p++]
    fuel = Math.min(fuel, maxFuel())
    clearPlannedRoute()
}

function loadGame(): boolean {
    let selected =
        newestValidSave(
        saveSlot(SAVE_KEY_A), saveSlot(SAVE_KEY_B))
    if (!selected) {
        hasSave = false
        saveWasCorrupt = settings.exists(SAVE_KEY_A) || settings.exists(SAVE_KEY_B)
        return false
    }
    let migrate = selected[1] != SAVE_VERSION
    unpackSave(selected)
    hasSave = true
    saveWasCorrupt = false
    if (migrate) writeSave()
    return true
}

function eraseSave(): void {
    if (settings.exists(SAVE_KEY_A)) settings.remove(SAVE_KEY_A)
    if (settings.exists(SAVE_KEY_B)) settings.remove(SAVE_KEY_B)
    eraseManualSave()
    hasSave = false
    saveWasCorrupt = false
    saveSequence = 0
}
