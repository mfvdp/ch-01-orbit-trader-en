// The rules and the state of the game: market, missions, campaign and achievements.
enum SceneId {
    Title,
    Hangar,
    Market,
    Outfitter,
    Missions,
    StarMap,
    Status,
    Flight,
    Notice,
    DeleteSave,
    Intro
}

enum MissionKind {
    None,
    Delivery,
    Hunt,
    Rescue
}

enum MissionVariant {
    Standard,
    Fragile,
    Express,
    Illegal,
    Ace,
    UnderFire
}

enum MarketEventKind {
    None,
    Shortage,
    Surplus,
    Blockade,
    Boom
}

enum ShipRole {
    Trader,
    Courier,
    Hunter
}

enum GameMode {
    Standard,
    Veteran,
    Iron
}

enum FlightPhase {
    Launch,
    Cruise,
    Encounter,
    Event,
    Approach,
    Docking,
    Rescue
}

enum Faction {
    Union,
    Traders,
    Scientists,
    Outlaws
}

enum RareGood {
    Relic,
    DataCore,
    AlienSeed
}

enum WeaponKind {
    Laser,
    Missile,
    Mine
}

enum ShipModule {
    Engine,
    Scanner,
    Weapons,
    Cargo
}

enum EndingKind {
    None,
    Union,
    Merchant,
    Explorer,
    Outlaw
}

// The state of the player that is saved. Fixed content lives in data.ts; the state only refers to it by number.
let credits = 0
let currentWorld = 0
let destinationWorld = 0
let orbitDay = 1
let fuel = 0
let hull = 0
let tradeProfit = 0
let totalVictories = 0
let completedMissions = 0
let failedMissions = 0
let cargo: number[] = []
let cargoCost: number[] = []
let upgrades: number[] = []
let marketStock: number[] = []

// Progress and galaxy state. save.ts stores these values.
let tutorialStage = 0
let campaignStage = 0
let galaxySeed = 1
let marketEventKind = MarketEventKind.None
let marketEventWorld = 0
let marketEventGood = 0
let marketEventEnds = 0
let shipRole = ShipRole.Trader
let gameMode = GameMode.Standard

// These states are small lists of numbers and bit masks on purpose.
// That keeps the live memory and the three save slots small on the Calliope mini.
let reputations: number[] = []
let endingChoice = EndingKind.None
let marketInfluence: number[] = []
let marketMemoryDay: number[] = []
let marketMemoryGood: number[] = []
let marketMemoryBuy: number[] = []
let marketMemorySell: number[] = []
let marketMemoryTrend: number[] = []
let rareCargo: number[] = []
let artifactMask = 0
let secretWorldMask = 0
let ownedShipsMask = 1 << ShipRole.Trader
let shipNameId: number[] = []
let shipPaint: number[] = []
let achievementMask = 0
let visitedWorldMaskLow = 0
let visitedWorldMaskHigh = 0
let totalJumps = 0
let totalRescues = 0
let totalDeliveries = 0
let totalCreditsEarned = 0
let largestTradeProfit = 0
let bossVictories = 0
let blackMarketTrades = 0
let completedEvents = 0
let dailyMissionDay = 0
let dailyMissionDone = 0
let newGamePlusLevel = 0
let activeWeapon = WeaponKind.Laser
let missiles = 3
let mines = 2
let weaponEnergy = 100
// Energy setting: 0 balanced, 1 shields, 2 weapons, 3 engines.
let energyMode = 0
let moduleDamage: number[] = []
let textSpeed = 1
let highContrast = 0
let cameraShake = 1
let developerMode = 0

// Only one mission is active at a time. That keeps the screens and the save data small.
let missionKind = MissionKind.None
let missionOrigin = 0
let missionTarget = 0
let missionDeadline = 0
let missionReward = 0
let missionGood = 0
let missionAmount = 0
let missionProgress = 0
let missionSeed = 0
let missionVariant = MissionVariant.Standard
// Source of the mission: 0 normal offer, 1 campaign, 2 training (guided first delivery), 3 daily job.
let missionSource = 0

// The start of a flight is saved, so a restart can begin the same flight again.
let inTransit = 0
let transitOrigin = 0
let transitTarget = 0
let transitSeed = 0

// Screen state is only needed for now and is never saved.
let activeScene = SceneId.Title
let returnScene = SceneId.Hangar
let menuIndex = 0
let listTop = 0
let inputLocked = false
let transactionAmount = 0
let transactionOpen = false
let confirmOpen = false
let saveSequence = 0
let hasSave = false
let saveWasCorrupt = false
let noticeLine1 = ""
let noticeLine2 = ""
let noticeLine3 = ""

// The route plan is only needed for now. It can always be rebuilt from the map.
let plannedRoute: number[] = []
let plannedRouteFuel = 0
let deferNewGameSave = false

function fillNumberArray(length: number, value: number): number[] {
    let result: number[] = []
    for (let i = 0; i < length; i++) result.push(value)
    return result
}

function cargoUnits(): number {
    let used =
        (missionKind == MissionKind.Delivery || missionKind == MissionKind.Rescue) ? missionAmount : 0
    for (let i = 0; i < GOOD_COUNT; i++) used += cargo[i]
    for (let i = 0; i < RARE_GOOD_COUNT; i++) used += rareCargo[i]
    return used
}

function cargoCapacity(): number {
    return cargoCapacityForRole(shipRole)
}

function cargoCapacityForRole(role: ShipRole): number {
    let damagePenalty = moduleDamage &&
        moduleDamage.length > ShipModule.Cargo ? moduleDamage[ShipModule.Cargo] : 0
    return Math.max(4, 8 + upgrades[UPGRADE_CARGO] * 4 +
        (role == ShipRole.Trader ? 4 : 0) - damagePenalty * 2)
}

function maxHull(): number {
    return 8 + upgrades[UPGRADE_ARMOR] * 3
}

function maxShield(): number {
    return 4 + upgrades[UPGRADE_SHIELD] * 3 + (shipRole == ShipRole.Hunter ? 3 : 0)
}

function maxFuel(): number {
    let damagePenalty = moduleDamage &&
        moduleDamage.length > ShipModule.Engine ? moduleDamage[ShipModule.Engine] : 0
    return Math.max(3, 5 + upgrades[UPGRADE_JUMP] +
        (shipRole == ShipRole.Courier ? 2 : 0) - damagePenalty)
}

function maxJumpCost(): number {
    let damagePenalty = moduleDamage &&
        moduleDamage.length > ShipModule.Engine ? moduleDamage[ShipModule.Engine] : 0
    return Math.max(1, 2 + upgrades[UPGRADE_JUMP] - Math.idiv(damagePenalty + 1, 2))
}

function laserDamage(): number {
    let damagePenalty = moduleDamage &&
        moduleDamage.length > ShipModule.Weapons ? moduleDamage[ShipModule.Weapons] : 0
    let modeBonus = energyMode == 2 ? 1 : 0
    return Math.max(1,
        1 + upgrades[UPGRADE_LASER] +
            (shipRole == ShipRole.Hunter ? 1 : 0) + modeBonus - damagePenalty)
}

function laserCooldownMs(): number {
    let mode = energyMode == 2 ? -60 : (energyMode == 1 || energyMode == 3 ? 60 : 0)
    return Math.max(160, 440 - upgrades[UPGRADE_COOLER] * 100 + mode)
}

function escapeChargeTimeMs(): number {
    let roleBonus = shipRole == ShipRole.Courier ? 400 : 0
    let modeBonus = energyMode == 3 ? 450 : 0
    let enginePenalty = moduleDamage &&
        moduleDamage.length > ShipModule.Engine ? moduleDamage[ShipModule.Engine] * 220 : 0
    return Math.max(800, 2600 - upgrades[UPGRADE_BOOSTER] * 500 - roleBonus - modeBonus + enginePenalty)
}

function shipRoleRequiredRank(role: ShipRole): number {
    if (role == ShipRole.Courier) return 1
    if (role == ShipRole.Hunter) return 2
    return 0
}

function shipRoleUnlocked(role: ShipRole): boolean {
    return shipOwned(role) || currentRank() >= shipRoleRequiredRank(role)
}

function shipRoleName(role: ShipRole): string {
    if (role == ShipRole.Courier) return Texts.t(168)
    if (role == ShipRole.Hunter) return Texts.t(224)
    return Texts.t(170)
}

function shipRoleInfo(role: ShipRole): string {
    if (role == ShipRole.Courier) return Texts.t(225)
    if (role == ShipRole.Hunter) return Texts.t(226)
    return Texts.t(227)
}

function shipOwned(role: ShipRole): boolean {
    return role >= ShipRole.Trader && role <= ShipRole.Hunter &&
        (ownedShipsMask & (1 << role)) != 0
}

function shipPurchaseCost(role: ShipRole): number {
    if (shipOwned(role)) return 0
    if (role == ShipRole.Courier) return worldShopPrice(1800)
    if (role == ShipRole.Hunter) return worldShopPrice(2600)
    return worldShopPrice(1200)
}

function selectShip(role: ShipRole): boolean {
    if (!shipOwned(role) || cargoUnits() > cargoCapacityForRole(role)) return false
    shipRole = role
    fuel = Math.min(fuel, maxFuel())
    hull = Math.min(hull, maxHull())
    clearPlannedRoute()
    return true
}

function buyOrSelectShip(role: ShipRole): boolean {
    if (!shipOwned(role) && !shipRoleUnlocked(role)) return false
    if (cargoUnits() > cargoCapacityForRole(role)) return false
    if (!shipOwned(role)) {
        let cost = shipPurchaseCost(role)
        if (credits < cost) return false
        credits -= cost
        ownedShipsMask |= 1 << role
    }
    return selectShip(role)
}

function shipDisplayName(role: ShipRole): string {
    let id = shipNameId && shipNameId.length > role ? shipNameId[role] : role
    return SHIP_NAMES[Math.clamp(0, SHIP_NAME_COUNT - 1, id)]
}

function cycleShipName(role: ShipRole, delta: number): void {
    if (!shipNameId || shipNameId.length != SHIP_ROLE_COUNT)
        shipNameId = fillNumberArray(SHIP_ROLE_COUNT, 0)
    shipNameId[role] = (shipNameId[role] + delta + SHIP_NAME_COUNT) % SHIP_NAME_COUNT
}

function cycleShipPaint(role: ShipRole, delta: number): void {
    if (!shipPaint || shipPaint.length != SHIP_ROLE_COUNT)
        shipPaint = fillNumberArray(SHIP_ROLE_COUNT, 0)
    shipPaint[role] = (shipPaint[role] + delta + PAINT_COUNT) % PAINT_COUNT
}

function shipPaintName(role: ShipRole): string {
    let id = shipPaint && shipPaint.length > role ? shipPaint[role] : 0
    return Texts.t(PAINT_NAMES[Math.clamp(0, PAINT_COUNT - 1, id)])
}

function factionReputation(faction: Faction): number {
    if (!reputations || reputations.length != FACTION_COUNT) return 0
    return reputations[faction]
}

function adjustReputation(faction: Faction, delta: number): void {
    if (!reputations || reputations.length != FACTION_COUNT)
        reputations = fillNumberArray(FACTION_COUNT, 0)
    reputations[faction] = Math.clamp(-100, 100, reputations[faction] + delta)
}

function changeFactionReputation(faction: Faction, delta: number): void {
    adjustReputation(faction, delta)
}

function dominantFaction(): Faction {
    let best = Faction.Union
    for (let i = 1; i < FACTION_COUNT; i++)
        if (factionReputation(i) > factionReputation(best)) best = i
    return best
}

function chooseEnding(ending: EndingKind): boolean {
    if (!endingAvailable(ending)) return false
    endingChoice = ending
    updateAchievements()
    return true
}

function endingAvailable(ending: EndingKind): boolean {
    if (!campaignComplete()) return false
    if (ending == EndingKind.Union) return factionReputation(Faction.Union) >= 20 ||
        dominantFaction() == Faction.Union
    if (ending == EndingKind.Merchant) return factionReputation(Faction.Traders) >= 20 ||
        dominantFaction() == Faction.Traders
    if (ending == EndingKind.Explorer) return factionReputation(Faction.Scientists) >= 20 ||
        artifactCount() >= 2
    if (ending == EndingKind.Outlaw) return factionReputation(Faction.Outlaws) >= 20 ||
        dominantFaction() == Faction.Outlaws
    return false
}

function worldVisited(world: number): boolean {
    if (world < 0 || world >= WORLD_COUNT) return false
    if (world < 16) return (visitedWorldMaskLow & (1 << world)) != 0
    return (visitedWorldMaskHigh & (1 << (world - 16))) != 0
}

function markWorldVisited(world: number): void {
    if (world < 0 || world >= WORLD_COUNT) return
    if (world < 16) visitedWorldMaskLow |= 1 << world
    else visitedWorldMaskHigh |= 1 << (world - 16)
    if (world >= PUBLIC_WORLD_COUNT) secretWorldMask |= 1 << (world - PUBLIC_WORLD_COUNT)
    updateAchievements()
}

function discoverSecretWorld(world: number): boolean {
    if (world < PUBLIC_WORLD_COUNT || world >= WORLD_COUNT) return false
    let before = secretWorldMask
    secretWorldMask |= 1 << (world - PUBLIC_WORLD_COUNT)
    return before != secretWorldMask
}

function worldVisible(world: number): boolean {
    if (world < 0 || world >= WORLD_COUNT) return false
    if (world < PUBLIC_WORLD_COUNT) return true
    return (secretWorldMask & (1 << (world - PUBLIC_WORLD_COUNT))) != 0
}

function artifactCount(): number {
    let count = 0
    for (let i = 0; i < ARTIFACT_COUNT; i++) if ((artifactMask & (1 << i)) != 0) count++
    return count
}

function hasArtifact(id: number): boolean {
    return id >= 0 && id < ARTIFACT_COUNT && (artifactMask & (1 << id)) != 0
}

function addArtifact(id: number): boolean {
    if (id < 0 || id >= ARTIFACT_COUNT || hasArtifact(id)) return false
    artifactMask |= 1 << id
    if (artifactCount() >= 2) discoverSecretWorld(PUBLIC_WORLD_COUNT)
    if (artifactCount() >= ARTIFACT_COUNT) discoverSecretWorld(PUBLIC_WORLD_COUNT + 1)
    updateAchievements()
    return true
}

function addRareCargo(id: RareGood, amount: number): boolean {
    if (id < 0 || id >= RARE_GOOD_COUNT || amount <= 0 || cargoUnits() + amount > cargoCapacity())
        return false
    rareCargo[id] += amount
    return true
}

function sellRareCargo(id: RareGood, amount: number): number {
    if (id < 0 || id >= RARE_GOOD_COUNT || amount <= 0) return 0
    amount = Math.min(amount, rareCargo[id])
    let income = rareGoodValue(id) * amount
    rareCargo[id] -= amount
    credits += income
    tradeProfit = Math.min(SAVE_MAX_SCORE, tradeProfit + income)
    recordTradeProfit(income)
    return income
}

function applyTradeInfluenceAt(world: number, good: number, signedAmount: number): void {
    if (world < 0 || world >= WORLD_COUNT || good < 0 ||
        good >= GOOD_COUNT || signedAmount == 0) return
    let direction = signedAmount > 0 ? 1 : -1
    marketInfluence[world] = Math.clamp(-20, 20,
        marketInfluence[world] + direction * Math.min(4, Math.abs(signedAmount)))
}

function applyTradeInfluence(good: number, signedAmount: number): void {
    applyTradeInfluenceAt(currentWorld, good, signedAmount)
}

function rememberCurrentMarket(): void {
    let best = bestTradeGood((currentWorld + 1) % PUBLIC_WORLD_COUNT)
    let oldSell = marketMemorySell[currentWorld]
    marketMemoryDay[currentWorld] = orbitDay
    marketMemoryGood[currentWorld] = best
    marketMemoryBuy[currentWorld] = buyPrice(best)
    marketMemorySell[currentWorld] = sellPrice(best)
    marketMemoryTrend[currentWorld] = oldSell == 0 ? 0
        : Math.clamp(-2, 2, marketMemorySell[currentWorld] - oldSell)
    markWorldVisited(currentWorld)
}

function marketKnown(world: number): boolean {
    return world >= 0 && world < WORLD_COUNT && marketMemoryDay[world] > 0
}

function knownMarketAge(world: number): number { return marketKnown(world)
    ? Math.max(0, orbitDay - marketMemoryDay[world]) : -1 }
function knownMarketGood(world: number):
    number { return marketKnown(world) ? marketMemoryGood[world] : -1 }
function knownMarketBuy(world: number):
    number { return marketKnown(world) ? marketMemoryBuy[world] : 0 }
function knownMarketSell(world: number): number { return marketKnown(world) ? marketMemorySell[world] : 0 }
function knownMarketTrend(world: number):
    number { return marketKnown(world) ? marketMemoryTrend[world] : 0 }

function recordRescue(): void {
    totalRescues = Math.min(SAVE_MAX_COUNTER, totalRescues + 1)
    updateAchievements()
}

function recordDelivery(): void {
    totalDeliveries = Math.min(SAVE_MAX_COUNTER, totalDeliveries + 1)
    updateAchievements()
}

function recordJump(): void {
    totalJumps = Math.min(SAVE_MAX_COUNTER, totalJumps + 1)
    markWorldVisited(currentWorld)
}

function recordEvent(): void {
    completedEvents = Math.min(SAVE_MAX_COUNTER, completedEvents + 1)
    updateAchievements()
}

function recordTradeProfit(amount: number): void {
    if (amount <= 0) return
    largestTradeProfit = Math.max(largestTradeProfit, amount)
    totalCreditsEarned = Math.min(SAVE_MAX_SCORE, totalCreditsEarned + amount)
    updateAchievements()
}

function achievementUnlocked(id: number): boolean {
    return id >= 0 && id < ACHIEVEMENT_COUNT && (achievementMask & (1 << id)) != 0
}

function unlockAchievement(id: number): boolean {
    if (id < 0 || id >= ACHIEVEMENT_COUNT || achievementUnlocked(id)) return false
    achievementMask |= 1 << id
    return true
}

function visitedWorldCount(): number {
    let result = 0
    for (let i = 0; i < WORLD_COUNT; i++) if (worldVisited(i)) result++
    return result
}

function updateAchievements(): void {
    if (totalJumps >= 1) unlockAchievement(0)
    if (tradeProfit >= 1000) unlockAchievement(1)
    if (totalVictories >= 10) unlockAchievement(2)
    if (totalRescues >= 5) unlockAchievement(3)
    if (visitedWorldCount() >= PUBLIC_WORLD_COUNT) unlockAchievement(4)
    if (ownedShipsMask == 7) unlockAchievement(5)
    if (artifactCount() >= ARTIFACT_COUNT) unlockAchievement(6)
    if (blackMarketTrades >= 5) unlockAchievement(7)
    if (campaignComplete()) unlockAchievement(8)
    if (endingChoice != EndingKind.None) unlockAchievement(9)
    if (newGamePlusLevel > 0) unlockAchievement(10)
    if (gameScore() >= 50000) unlockAchievement(11)
}

function cycleWeapon(delta: number): void {
    activeWeapon = (activeWeapon + delta + WEAPON_COUNT) % WEAPON_COUNT
}

function useMissile(): boolean {
    if (missiles <= 0 || weaponEnergy < 20 || moduleDamage[ShipModule.Weapons] >= 3) return false
    missiles--
    weaponEnergy -= 20
    return true
}

function useMine(): boolean {
    if (mines <= 0 || weaponEnergy < 12 || moduleDamage[ShipModule.Weapons] >= 3) return false
    mines--
    weaponEnergy -= 12
    return true
}

function restoreWeaponEnergy(amount: number): void {
    if (amount > 0) weaponEnergy = Math.min(100, weaponEnergy + amount)
}

function energyModeName(): string {
    if (energyMode == 1) return Texts.t(160)
    if (energyMode == 2) return Texts.t(117)
    if (energyMode == 3) return Texts.t(115)
    return Texts.t(228)
}

function cycleEnergyMode(delta: number): void {
    energyMode = (energyMode + delta + 4) % 4
}

function damageModule(module: ShipModule, amount: number): void {
    if (module < 0 || module >= SHIP_MODULE_COUNT || amount <= 0) return
    moduleDamage[module] = Math.clamp(0, 3, moduleDamage[module] + amount)
    fuel = Math.min(fuel, maxFuel())
}

function repairModules(): void {
    for (let i = 0; i < SHIP_MODULE_COUNT; i++) moduleDamage[i] = 0
}

function moduleDamageName(module: ShipModule): string {
    let level = moduleDamage[module]
    if (level >= 3) return Texts.t(229)
    if (level == 2) return Texts.t(230)
    if (level == 1) return Texts.t(231)
    return Texts.t(232)
}

function clearPlannedRoute(): void {
    plannedRoute = []
    plannedRouteFuel = 0
}

function planRouteTo(target: number): boolean {
    clearPlannedRoute()
    if (target < 0 || target >= WORLD_COUNT || !worldVisible(target)) return false
    if (target == currentWorld) {
        plannedRoute.push(currentWorld)
        return true
    }
    let previous = fillNumberArray(WORLD_COUNT, -2)
    let queue: number[] = []
    queue.push(currentWorld)
    previous[currentWorld] = -1
    let head = 0
    while (head < queue.length && previous[target] == -2) {
        let from = queue[head++]
        for (let to = 0; to < WORLD_COUNT; to++) {
            if (!worldVisible(to) || previous[to] != -2 || to == from) continue
            let cost = jumpCost(from, to)
            if (cost > maxJumpCost()) continue
            if (from == currentWorld && cost > fuel) continue
            previous[to] = from
            queue.push(to)
            if (to == target) break
        }
    }
    if (previous[target] == -2) return false
    let reverse: number[] = []
    let cursor = target
    while (cursor >= 0) {
        reverse.push(cursor)
        cursor = previous[cursor]
    }
    for (let i = reverse.length - 1; i >= 0; i--) plannedRoute.push(reverse[i])
    for (let i = 1; i < plannedRoute.length; i++)
        plannedRouteFuel += jumpCost(plannedRoute[i - 1], plannedRoute[i])
    return true
}

function routeHopCount(): number { return Math.max(0, plannedRoute.length - 1) }
function routeFuelCost(): number { return plannedRouteFuel }
function routeWorldAt(index: number): number { return index >= 0 &&
    index < plannedRoute.length ? plannedRoute[index] : -1 }

function cycleTextSpeed(delta: number): void { textSpeed = (textSpeed + delta + 3) % 3 }
function textSpeedName(): string { return textSpeed == 0 ? Texts.t(233)
    : (textSpeed == 2 ? Texts.t(234) : Texts.t(235)) }
function toggleHighContrast(): void { highContrast = highContrast == 0 ? 1 : 0 }
function toggleCameraShake(): void { cameraShake = cameraShake == 0 ? 1 : 0 }
function toggleDeveloperMode(): void { developerMode = developerMode == 0 ? 1 : 0 }

function tutorialStageName(): string {
    if (tutorialStage == 1) return Texts.t(236)
    if (tutorialStage == 2) return Texts.t(237)
    if (tutorialStage == 3) return Texts.t(238)
    if (tutorialStage >= 4) return Texts.t(239)
    return Texts.t(240)
}

function gameModeName(mode: GameMode): string {
    if (mode == GameMode.Veteran) return Texts.t(241)
    if (mode == GameMode.Iron) return Texts.t(242)
    return Texts.t(212)
}

function currentRank(): number {
    let score = tradeProfit + completedMissions * 100 + totalVictories * 25
    if (score >= 30000) return 5
    if (score >= 12000) return 4
    if (score >= 5000) return 3
    if (score >= 2000) return 2
    if (score >= 600) return 1
    return 0
}

function rankName(): string {
    return Texts.t(RANK_NAMES[currentRank()])
}

function gameScore(): number {
    return tradeProfit + completedMissions * 100 + totalVictories * 25
}

function newGame(): void {
    credits = 500
    currentWorld = START_WORLD
    destinationWorld = START_WORLD
    orbitDay = 1
    tradeProfit = 0
    totalVictories = 0
    completedMissions = 0
    failedMissions = 0
    tutorialStage = 1
    campaignStage = 0
    galaxySeed = 1 + stableHash(game.runtime(), saveSequence + 1, 2026) % 32748
    marketEventKind = MarketEventKind.None
    marketEventWorld = START_WORLD
    marketEventGood = 0
    marketEventEnds = 0
    shipRole = ShipRole.Trader
    gameMode = GameMode.Standard
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
    ownedShipsMask = 1 << ShipRole.Trader
    shipNameId = [0, 1, 2]
    shipPaint = fillNumberArray(SHIP_ROLE_COUNT, 0)
    achievementMask = 0
    visitedWorldMaskLow = 1 << START_WORLD
    visitedWorldMaskHigh = 0
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
    cargo = fillNumberArray(GOOD_COUNT, 0)
    cargoCost = fillNumberArray(GOOD_COUNT, 0)
    upgrades = fillNumberArray(UPGRADE_COUNT, 0)
    marketStock = fillNumberArray(GOOD_COUNT, 0)
    fuel = maxFuel()
    hull = maxHull()
    clearMission()
    inTransit = 0
    transitOrigin = START_WORLD
    transitTarget = START_WORLD
    transitSeed = 0
    refreshMarket()
    rememberCurrentMarket()
    clearPlannedRoute()
    if (!deferNewGameSave) {
        writeSave()
        hasSave = true
    }
}

function canStartNewGamePlus(): boolean {
    return campaignComplete() && endingChoice != EndingKind.None && newGamePlusLevel < 9
}

function startNewGamePlus(): boolean {
    if (!canStartNewGamePlus()) return false
    let oldLevel = newGamePlusLevel
    let oldOwned = ownedShipsMask
    let oldNames = shipNameId
    let oldPaint = shipPaint
    let oldAchievements = achievementMask
    let oldArtifacts = artifactMask
    let oldSecrets = secretWorldMask
    let oldStats =
        [totalJumps, totalRescues, totalDeliveries, totalCreditsEarned, largestTradeProfit,
        bossVictories, blackMarketTrades, completedEvents]
    let oldMode = gameMode
    deferNewGameSave = true
    newGame()
    deferNewGameSave = false
    newGamePlusLevel = Math.min(9, oldLevel + 1)
    ownedShipsMask = oldOwned
    shipNameId = oldNames
    shipPaint = oldPaint
    achievementMask = oldAchievements
    artifactMask = oldArtifacts
    secretWorldMask = oldSecrets
    totalJumps = oldStats[0]
    totalRescues = oldStats[1]
    totalDeliveries = oldStats[2]
    totalCreditsEarned = oldStats[3]
    largestTradeProfit = oldStats[4]
    bossVictories = oldStats[5]
    blackMarketTrades = oldStats[6]
    completedEvents = oldStats[7]
    gameMode = oldMode
    tutorialStage = 4
    credits = 1000 + newGamePlusLevel * 500
    for (let i = 0; i < UPGRADE_COUNT; i++) if (UPGRADE_MAX[i] > 0) upgrades[i] = 1
    fuel = maxFuel()
    hull = maxHull()
    updateAchievements()
    writeSave()
    return true
}

function clearMission(): void {
    missionKind = MissionKind.None
    missionOrigin = 0
    missionTarget = 0
    missionDeadline = 0
    missionReward = 0
    missionGood = 0
    missionAmount = 0
    missionProgress = 0
    missionSeed = 0
    missionVariant = MissionVariant.Standard
    missionSource = 0
}

function setScene(next: SceneId): void {
    activeScene = next
    menuIndex = 0
    listTop = 0
    transactionOpen = false
    transactionAmount = 0
    confirmOpen = false
    inputLocked = true
}

function showNotice(line1: string, line2: string, line3: string, backTo: SceneId): void {
    noticeLine1 = line1
    noticeLine2 = line2
    noticeLine3 = line3
    returnScene = backTo
    setScene(SceneId.Notice)
}

function allButtonsReleased(): boolean {
    return !controller.up.isPressed()
        && !controller.down.isPressed()
        && !controller.left.isPressed()
        && !controller.right.isPressed()
        && !controller.A.isPressed()
        && !controller.B.isPressed()
}
