// The fixed data of the game: worlds, goods, ships, missions and the campaign.
const PUBLIC_WORLD_COUNT = 24
const WORLD_COUNT = 26
const GOOD_COUNT = 12
const UPGRADE_COUNT = 10
const FACTION_COUNT = 4
const RARE_GOOD_COUNT = 3
const ARTIFACT_COUNT = 4
const SHIP_ROLE_COUNT = 3
const SHIP_MODULE_COUNT = 4
const WEAPON_COUNT = 3
const ACHIEVEMENT_COUNT = 12
const PAINT_COUNT = 6
const SHIP_NAME_COUNT = 8
const START_WORLD = 0
const MISSION_OFFER_COUNT = 5
const CAMPAIGN_MISSION_COUNT = 6

const UPGRADE_CARGO = 0
const UPGRADE_SHIELD = 1
const UPGRADE_ARMOR = 2
const UPGRADE_LASER = 3
const UPGRADE_COOLER = 4
const UPGRADE_BOOSTER = 5
const UPGRADE_SCANNER = 6
const UPGRADE_JUMP = 7
const UPGRADE_REPAIR = 8
const UPGRADE_INSURANCE = 9

const WORLD_NAMES = [
    "LUMA", "VEXO", "NORI", "KAVO", "PIXA", "ZUNO",
    "MIRO", "TAVI", "REKO", "SOLA", "BIRI", "YUNO",
    "DOVA", "FENO", "RUNA", "KIRI", "JEXA", "WELA",
    "AURI", "MEKI", "ONDA", "QUBI", "ZERA", "TALO",
    "NEXUS-9", "EDEN-X"
]
const WORLD_X = hex`0c2743607d9614304b6784970925405e7995122f4c6884995391`
const WORLD_Y = hex`100b140d120a2b2531272f2648414d444f43655e695e675c3971`
const WORLD_ECONOMY = hex`0001050203040400020501030104000305020502030004010300`
const WORLD_DANGER = hex`0001000201030100010002020102010203020001030102030301`
const WORLD_FACTION = hex`0001010002000001010201020301000203020101000103000202`
const ECONOMY_NAMES = hex`1a1b1c1d1e1f`
const DANGER_NAMES = hex`20212223`

// Every world has one short trait. The bonuses are small on purpose,
// so the kind of economy and your own choices matter more than the trait.
const WORLD_TRAIT_NAMES = hex`2425262728292a2b2c2d2e2f303132333435363738393a3b3c3d`
const WORLD_TRAIT_DETAILS = hex`3e3f404142434445464748494a4b4c4d4e4f5051525354555657`
const WORLD_TRAIT_PRICE_PERCENT = hex`fefffdff00000400030005000200fcffffff0200fdff03000600fdfffcff0300070003000600feff07000100080005000a00faff`
const WORLD_TRAIT_SHOP_PERCENT = hex`f8ff0200f6ff08000000040003000000fcff02000500fbff0a00feff0100fdff0c0008000500faff0900feff0f0004001400f6ff`
const WORLD_TRAIT_DANGER = hex`0000000000000100000001000000ffff0000ffff0000010001000000ffff000001000100ffff000001000000010001000100ffff`

const FACTION_NAMES = hex`58595a5b`
const RARE_GOOD_NAMES = hex`5c5d5e`
const RARE_GOOD_VALUES = hex`8a0284037805`
const ARTIFACT_NAMES = hex`5f606162`
const SHIP_NAMES = ["NOMAD", "KESTREL", "RAPTOR", "AURORA", "MERCURY", "NOVA", "PHOENIX", "ORBITER"]
const PAINT_NAMES = hex`6b6c6d6e6f70`
const WEAPON_NAMES = hex`71721b`
const MODULE_NAMES = hex`73747576`
const ENDING_NAMES = hex`775878797a`
const ACHIEVEMENT_NAMES = hex`7b7c7d7e7f80818283848586`
const ACHIEVEMENT_DETAILS = hex`8788898a8b8c8d8e8f909192`

const GOOD_NAMES = hex`939495969798999a9b9c9d9e`
const GOOD_BASE_PRICE = hex`0a0e08162d1e1a3040527396`
// Bit n tells whether economy n produces or wants this good.
const GOOD_PRODUCER_MASK = hex`010111020210050408080c20`
const GOOD_DEMAND_MASK = hex`2a2406142807221b23341309`

const UPGRADE_NAMES = hex`9fa0a171a2a374a4a5a6`
const UPGRADE_MAX = hex`03030303020202030102`
const UPGRADE_PRICE_1 = hex`5e01f401c20126025e01c2012c015802dc058a02`
const UPGRADE_PRICE_2 = hex`52031405b004aa05e80314058403dc050000a406`
const UPGRADE_PRICE_3 = hex`0807540b8c0a800c000000000000800c00000000`

const RANK_NAMES = hex`a7a8a9aaabac`

// The campaign rebuilds the trade network that the story tells about in the prologue.
const CAMPAIGN_TITLES = hex`adaeaf5db0b1`
const CAMPAIGN_BRIEFINGS = hex`b2b3b4b5b6b7`
const CAMPAIGN_REQUIRED_RANK = hex`000102030405`
const CAMPAIGN_TARGET = hex`010710141617`
const CAMPAIGN_KIND = [MissionKind.Delivery, MissionKind.Rescue, MissionKind.Hunt, MissionKind.Delivery,
    MissionKind.Rescue, MissionKind.Hunt]
const CAMPAIGN_GOOD = hex`080800090800`
const CAMPAIGN_VARIANT = [MissionVariant.Standard, MissionVariant.UnderFire, MissionVariant.Ace,
    MissionVariant.Fragile, MissionVariant.UnderFire, MissionVariant.Ace]
const CAMPAIGN_AMOUNT = hex`020102020104`
const CAMPAIGN_REWARD = hex`a401bc024c040807f00a8813`

function economyProduces(good: number, economy: number): boolean {
    return (GOOD_PRODUCER_MASK[good] & (1 << economy)) != 0
}

function economyDemands(good: number, economy: number): boolean {
    return (GOOD_DEMAND_MASK[good] & (1 << economy)) != 0
}

function stableHash(a: number, b: number, c: number): number {
    let value = (a * 109 + b * 47 + c * 23 + 97) % 32749
    value = (value * 73 + 41) % 32749
    return value
}

function galaxyHash(a: number, b: number, c: number): number {
    return stableHash(a + galaxySeed, b + galaxySeed % 97, c + galaxySeed % 31)
}

function factionName(faction: Faction): string {
    return Texts.t(FACTION_NAMES[Math.clamp(0, FACTION_COUNT - 1, faction)])
}

function worldFaction(world: number): Faction {
    return WORLD_FACTION[Math.clamp(0, WORLD_COUNT - 1, world)]
}

function rareGoodName(id: RareGood): string {
    return Texts.t(RARE_GOOD_NAMES[Math.clamp(0, RARE_GOOD_COUNT - 1, id)])
}

function rareGoodValue(id: RareGood): number {
    let base = tableI16(RARE_GOOD_VALUES, Math.clamp(0, RARE_GOOD_COUNT - 1, id))
    return Math.max(1, Math.idiv(base * (100 + effectiveWorldDanger(currentWorld) * 5) + 50, 100))
}

function artifactName(id: number): string {
    return Texts.t(ARTIFACT_NAMES[Math.clamp(0, ARTIFACT_COUNT - 1, id)])
}

function weaponName(kind: WeaponKind): string {
    return Texts.t(WEAPON_NAMES[Math.clamp(0, WEAPON_COUNT - 1, kind)])
}

function endingName(ending: EndingKind): string {
    return Texts.t(ENDING_NAMES[Math.clamp(0, ENDING_NAMES.length - 1, ending)])
}

function achievementName(id: number): string {
    return Texts.t(ACHIEVEMENT_NAMES[Math.clamp(0, ACHIEVEMENT_COUNT - 1, id)])
}

function achievementDetail(id: number): string {
    return Texts.t(ACHIEVEMENT_DETAILS[Math.clamp(0, ACHIEVEMENT_COUNT - 1, id)])
}

function worldTraitName(world: number): string {
    return Texts.t(WORLD_TRAIT_NAMES[Math.clamp(0, WORLD_COUNT - 1, world)])
}

function worldTraitDetail(world: number): string {
    return Texts.t(WORLD_TRAIT_DETAILS[Math.clamp(0, WORLD_COUNT - 1, world)])
}

function worldTraitPricePercent(world: number): number {
    return tableI16(WORLD_TRAIT_PRICE_PERCENT, Math.clamp(0, WORLD_COUNT - 1, world))
}

function worldTraitShopPercent(world: number): number {
    return tableI16(WORLD_TRAIT_SHOP_PERCENT, Math.clamp(0, WORLD_COUNT - 1, world))
}

function worldTraitDangerModifier(world: number): number {
    return tableI16(WORLD_TRAIT_DANGER, Math.clamp(0, WORLD_COUNT - 1, world))
}

function effectiveWorldDanger(world: number): number {
    let danger = WORLD_DANGER[world] + worldTraitDangerModifier(world)
    if (activeMarketEventAt(world) && marketEventKind == MarketEventKind.Blockade) danger++
    return Math.clamp(0, 3, danger)
}

function worldShopPriceAt(world: number, basePrice: number): number {
    if (basePrice <= 0) return 0
    return Math.max(1, Math.idiv(basePrice * (100 + worldTraitShopPercent(world)) + 50, 100))
}

function worldShopPrice(basePrice: number): number {
    return worldShopPriceAt(currentWorld, basePrice)
}

function updateMarketEvent(): void {
    if (marketEventKind != MarketEventKind.None && orbitDay <= marketEventEnds) return
    let cycle = orbitDay + Math.idiv(galaxySeed, 37)
    marketEventKind = 1 + galaxyHash(cycle, saveSequence + 17, 41) % 4
    marketEventWorld = galaxyHash(cycle, marketEventKind, 53) % PUBLIC_WORLD_COUNT
    marketEventGood = galaxyHash(cycle, marketEventWorld, 67) % GOOD_COUNT
    marketEventEnds = orbitDay + 2 + galaxyHash(cycle, marketEventGood, 71) % 3
}

function activeMarketEventAt(world: number): boolean {
    return marketEventKind != MarketEventKind.None &&
        orbitDay <= marketEventEnds && marketEventWorld == world
}

function marketEventPricePercent(world: number, good: number): number {
    if (!activeMarketEventAt(world)) return 0
    if (marketEventKind == MarketEventKind.Shortage) return good == marketEventGood ? 42 : 6
    if (marketEventKind == MarketEventKind.Surplus)
        return good == marketEventGood ? -36 : -4
    if (marketEventKind == MarketEventKind.Blockade) return good == marketEventGood ? 30 : 18
    if (marketEventKind == MarketEventKind.Boom) return good == marketEventGood ? 24 : 10
    return 0
}

function marketEventName(): string {
    if (marketEventKind == MarketEventKind.Shortage) return Texts.t(184)
    if (marketEventKind == MarketEventKind.Surplus) return Texts.t(185)
    if (marketEventKind == MarketEventKind.Blockade) return Texts.t(186)
    if (marketEventKind == MarketEventKind.Boom) return Texts.t(187)
    return Texts.t(32)
}

function marketEventDetail(): string {
    if (marketEventKind == MarketEventKind.None || orbitDay > marketEventEnds) return Texts.t(188)
    let good = Texts.t(GOOD_NAMES[marketEventGood])
    let world = WORLD_NAMES[marketEventWorld]
    if (marketEventKind == MarketEventKind.Shortage) return good + Texts.t(189) + world
    if (marketEventKind == MarketEventKind.Surplus) return good + Texts.t(190) + world
    if (marketEventKind == MarketEventKind.Blockade) return Texts.t(191) + world
    return Texts.t(192) + world
}

function marketEventMissionRewardPercent(world: number, kind: MissionKind, good: number): number {
    if (!activeMarketEventAt(world)) return 0
    if (marketEventKind == MarketEventKind.Blockade) return 35
    if (marketEventKind == MarketEventKind.Shortage && kind == MissionKind.Delivery &&
        good == marketEventGood) return 45
    if (marketEventKind == MarketEventKind.Boom) return 20
    if (marketEventKind == MarketEventKind.Surplus && kind == MissionKind.Hunt) return 10
    return 5
}

function worldDistance(from: number, to: number): number {
    let dx = WORLD_X[from] - WORLD_X[to]
    let dy = WORLD_Y[from] - WORLD_Y[to]
    return Math.round(Math.sqrt(dx * dx + dy * dy))
}

function jumpCost(from: number, to: number): number {
    if (from == to) return 0
    return Math.max(1, Math.idiv(worldDistance(from, to) + 17, 18))
}

function canReachWorld(world: number): boolean {
    if (!worldVisible(world)) return false
    let cost = jumpCost(currentWorld, world)
    return world != currentWorld && cost <= maxJumpCost() && cost <= fuel
}

function localPrice(world: number, good: number): number {
    let economy = WORLD_ECONOMY[world]
    let profile = 0
    if (economyProduces(good, economy)) profile = -28
    else if (economyDemands(good, economy)) profile = 24
    let noise = galaxyHash(world, good, orbitDay) % 17 - 8
    let percent = 100 + profile + noise + effectiveWorldDanger(world) * 3
    percent += worldTraitPricePercent(world) + marketEventPricePercent(world, good)
    if (marketInfluence && marketInfluence.length == WORLD_COUNT) percent += marketInfluence[world]
    return Math.max(2, Math.idiv(GOOD_BASE_PRICE[good] * percent + 50, 100))
}

function buyPrice(good: number): number {
    let percent = 105 - Math.idiv(factionReputation(worldFaction(currentWorld)), 20)
    return Math.max(1, Math.idiv(localPrice(currentWorld, good) * percent + 99, 100))
}

function sellPrice(good: number): number {
    let percent = 95 + Math.idiv(factionReputation(worldFaction(currentWorld)), 25)
    return Math.max(1, Math.idiv(localPrice(currentWorld, good) * percent, 100))
}

function priceAt(world: number, good: number, buying: boolean): number {
    let worldPrice = localPrice(world, good)
    let reputation = factionReputation(worldFaction(world))
    if (buying) return Math.max(1, Math.idiv(worldPrice * (105 - Math.idiv(reputation, 20)) + 99, 100))
    return Math.max(1, Math.idiv(worldPrice * (95 + Math.idiv(reputation, 25)), 100))
}

function refreshMarket(): void {
    updateMarketEvent()
    if (!marketStock || marketStock.length != GOOD_COUNT)
        marketStock = fillNumberArray(GOOD_COUNT, 0)
    let economy = WORLD_ECONOMY[currentWorld]
    for (let good = 0; good < GOOD_COUNT; good++) {
        let seed = galaxyHash(currentWorld, good, orbitDay)
        if (economyProduces(good, economy)) marketStock[good] = 7 + seed % 7
        else if (economyDemands(good, economy)) marketStock[good] = 1 + seed % 3
        else marketStock[good] = 4 + seed % 5
        if (marketInfluence && marketInfluence.length == WORLD_COUNT) {
            marketStock[good] = Math.clamp(0, 99,
                marketStock[good] - Math.idiv(marketInfluence[currentWorld], 4))
        }
        if (activeMarketEventAt(currentWorld)) {
            if (marketEventKind == MarketEventKind.Shortage && good == marketEventGood)
                marketStock[good] = Math.max(0, Math.idiv(marketStock[good], 3))
            else if (marketEventKind == MarketEventKind.Surplus && good == marketEventGood)
                marketStock[good] = Math.min(99, marketStock[good] + 9)
            else if (marketEventKind == MarketEventKind.Blockade)
                marketStock[good] = Math.max(0, Math.idiv(marketStock[good] + 1, 2))
            else if (marketEventKind == MarketEventKind.Boom && good == marketEventGood)
                marketStock[good] = Math.max(0, marketStock[good] - 2)
        }
    }
}

function bestTradeGood(target: number): number {
    let bestGood = 0
    let bestMargin = -9999
    for (let good = 0; good < GOOD_COUNT; good++) {
        let margin = priceAt(target, good, false) - buyPrice(good)
        if (margin > bestMargin) {
            bestMargin = margin
            bestGood = good
        }
    }
    return bestGood
}

function upgradePrice(id: number, nextLevel: number): number {
    if (nextLevel == 1) return worldShopPrice(tableI16(UPGRADE_PRICE_1, id))
    if (nextLevel == 2) return worldShopPrice(tableI16(UPGRADE_PRICE_2, id))
    if (nextLevel == 3) return worldShopPrice(tableI16(UPGRADE_PRICE_3, id))
    return 0
}

function campaignRequiredRank(stage: number): number {
    if (stage < 0 || stage >= CAMPAIGN_MISSION_COUNT) return 5
    return CAMPAIGN_REQUIRED_RANK[stage]
}

function campaignTitle(stage: number): string {
    if (stage < 0 || stage >= CAMPAIGN_MISSION_COUNT) return Texts.t(88)
    return Texts.t(CAMPAIGN_TITLES[stage])
}

function campaignBriefing(stage: number): string {
    if (stage < 0 || stage >= CAMPAIGN_MISSION_COUNT) return Texts.t(205)
    return Texts.t(CAMPAIGN_BRIEFINGS[stage])
}

function campaignMissionKind(stage: number): MissionKind {
    return CAMPAIGN_KIND[Math.clamp(0, CAMPAIGN_MISSION_COUNT - 1, stage)]
}

function campaignMissionTarget(stage: number): number {
    return CAMPAIGN_TARGET[Math.clamp(0, CAMPAIGN_MISSION_COUNT - 1, stage)]
}

function campaignMissionGood(stage: number): number {
    return CAMPAIGN_GOOD[Math.clamp(0, CAMPAIGN_MISSION_COUNT - 1, stage)]
}

function campaignMissionVariant(stage: number): MissionVariant {
    return CAMPAIGN_VARIANT[Math.clamp(0, CAMPAIGN_MISSION_COUNT - 1, stage)]
}

function campaignMissionAmount(stage: number): number {
    return CAMPAIGN_AMOUNT[Math.clamp(0, CAMPAIGN_MISSION_COUNT - 1, stage)]
}

function campaignMissionReward(stage: number): number {
    return tableI16(CAMPAIGN_REWARD, Math.clamp(0, CAMPAIGN_MISSION_COUNT - 1, stage))
}

function campaignMissionAvailable(): boolean {
    if (tutorialStage < 4 || campaignStage < 0 || campaignStage >= CAMPAIGN_MISSION_COUNT) return false
    if (missionKind != MissionKind.None || currentRank() < campaignRequiredRank(campaignStage)) return false
    return currentWorld != campaignMissionTarget(campaignStage)
}

function campaignComplete(): boolean {
    return campaignStage >= CAMPAIGN_MISSION_COUNT
}

function advanceCampaignStage(): void {
    campaignStage = Math.min(CAMPAIGN_MISSION_COUNT, campaignStage + 1)
}

function dailyMissionAvailable(): boolean {
    return hasSave && tutorialStage >= 4 && missionKind == MissionKind.None && dailyMissionDay != orbitDay
}

function dailyMissionSeed(): number {
    return galaxyHash(orbitDay, newGamePlusLevel + 211, 907)
}

function dailyMissionKind(): MissionKind {
    return 1 + dailyMissionSeed() % 3
}

function dailyMissionTarget(): number {
    let target = dailyMissionSeed() % PUBLIC_WORLD_COUNT
    if (target == currentWorld) target = (target + 7) % PUBLIC_WORLD_COUNT
    return target
}

function dailyMissionGood(): number {
    return missionGoodForTarget(dailyMissionTarget(), dailyMissionSeed())
}

function dailyMissionAmount(): number {
    if (dailyMissionKind() == MissionKind.Rescue) return 1
    return 2 + dailyMissionSeed() % 4
}

function dailyMissionReward(): number {
    let distance = worldDistance(currentWorld, dailyMissionTarget())
    return 400 + distance * 5 + dailyMissionAmount() * 90 + newGamePlusLevel * 100
}

function dailyMissionDeadline(): number {
    return orbitDay + Math.max(2, Math.idiv(worldDistance(currentWorld, dailyMissionTarget()) + 25, 26) + 2)
}

function markDailyMissionAccepted(): void {
    dailyMissionDay = orbitDay
    dailyMissionDone = 0
}

function completeDailyMission(): void {
    dailyMissionDone = 1
    adjustReputation(worldFaction(missionTarget), 3)
}

function missionOfferSource(slot: number): number {
    if (slot == MISSION_OFFER_COUNT - 1 && dailyMissionAvailable()) return 3
    if (slot != 0) return 0
    if (tutorialStage == 1 && currentWorld == START_WORLD) return 2
    if (campaignMissionAvailable()) return 1
    return 0
}

function missionOfferSeed(slot: number): number {
    return galaxyHash(currentWorld + slot * 7, orbitDay + slot * 13, slot + 101)
}

function missionOfferTarget(slot: number): number {
    let source = missionOfferSource(slot)
    if (source == 2) return 1 // the practice route LUMA -> VEXO
    if (source == 1) return campaignMissionTarget(campaignStage)
    if (source == 3) return dailyMissionTarget()

    let target = missionOfferSeed(slot) % PUBLIC_WORLD_COUNT
    let allowedDanger = Math.min(3, 1 + Math.idiv(currentRank(), 2))
    for (let i = 0; i < PUBLIC_WORLD_COUNT; i++) {
        let candidate = (target + i * 5 + 1) % PUBLIC_WORLD_COUNT
        if (candidate != currentWorld && effectiveWorldDanger(candidate) <= allowedDanger) return candidate
    }
    return (currentWorld + 1) % PUBLIC_WORLD_COUNT
}

function missionOfferKind(slot: number): MissionKind {
    let source = missionOfferSource(slot)
    if (source == 2) return MissionKind.Delivery
    if (source == 1) return campaignMissionKind(campaignStage)
    if (source == 3) return dailyMissionKind()
    return 1 + (missionOfferSeed(slot) + slot * 2) % 3
}

function missionGoodForTarget(target: number, seed: number): number {
    let start = seed % GOOD_COUNT
    let economy = WORLD_ECONOMY[target]
    for (let i = 0; i < GOOD_COUNT; i++) {
        let good = (start + i * 5) % GOOD_COUNT
        if (economyDemands(good, economy) &&
            !economyProduces(good, WORLD_ECONOMY[currentWorld])) return good
    }
    return bestTradeGood(target)
}

function missionOfferGood(slot: number): number {
    let source = missionOfferSource(slot)
    if (source == 2) return 2
    if (source == 1) return campaignMissionGood(campaignStage)
    if (source == 3) return dailyMissionGood()
    let kind = missionOfferKind(slot)
    if (kind == MissionKind.Delivery)
        return missionGoodForTarget(missionOfferTarget(slot), missionOfferSeed(slot))
    if (kind == MissionKind.Rescue) return 8
    return 0
}

function missionOfferVariant(slot: number): MissionVariant {
    let source = missionOfferSource(slot)
    if (source == 2) return MissionVariant.Standard
    if (source == 1) return campaignMissionVariant(campaignStage)
    if (source == 3) return MissionVariant.Express
    let kind = missionOfferKind(slot)
    let roll = galaxyHash(missionOfferSeed(slot), currentRank(), 149) % 4
    if (kind == MissionKind.Delivery) {
        if (roll == 1) return MissionVariant.Fragile
        if (roll == 2) return MissionVariant.Express
        if (roll == 3 && currentRank() >= 2) return MissionVariant.Illegal
    } else if (kind == MissionKind.Hunt) {
        if (roll == 1 && currentRank() >= 2) return MissionVariant.Ace
        if (roll >= 2) return MissionVariant.UnderFire
    } else if (kind == MissionKind.Rescue) {
        if (roll == 1) return MissionVariant.Express
        if (roll >= 2) return MissionVariant.UnderFire
    }
    return MissionVariant.Standard
}

function missionVariantName(kind: MissionKind, variant: MissionVariant): string {
    if (variant == MissionVariant.Fragile) return Texts.t(207)
    if (variant == MissionVariant.Express) return Texts.t(208)
    if (variant == MissionVariant.Illegal) return Texts.t(209)
    if (variant == MissionVariant.Ace) return Texts.t(210)
    if (variant == MissionVariant.UnderFire) return Texts.t(211)
    return Texts.t(212)
}

function missionVariantDetail(kind: MissionKind, variant: MissionVariant): string {
    if (variant == MissionVariant.Fragile) return Texts.t(213)
    if (variant == MissionVariant.Express) return Texts.t(214)
    if (variant == MissionVariant.Illegal) return Texts.t(215)
    if (variant == MissionVariant.Ace) return Texts.t(216)
    if (variant == MissionVariant.UnderFire) return Texts.t(217)
    if (kind == MissionKind.Rescue) return Texts.t(218)
    return Texts.t(219)
}

function missionOfferAmount(slot: number): number {
    let source = missionOfferSource(slot)
    if (source == 2) return 1
    if (source == 1) return campaignMissionAmount(campaignStage)
    if (source == 3) return dailyMissionAmount()
    let kind = missionOfferKind(slot)
    let variant = missionOfferVariant(slot)
    if (kind == MissionKind.Rescue) return 1
    if (kind == MissionKind.Hunt) {
        if (variant == MissionVariant.Ace) return 1
        return Math.min(5, 1 + Math.idiv(currentRank(), 2) + missionOfferSeed(slot) % 2)
    }
    if (variant == MissionVariant.Fragile) return 1
    return Math.min(5, 1 + Math.idiv(currentRank(), 2) + missionOfferSeed(slot) % 3)
}

function missionOfferReward(slot: number): number {
    let source = missionOfferSource(slot)
    if (source == 2) return 150
    if (source == 3) return dailyMissionReward()
    let target = missionOfferTarget(slot)
    let kind = missionOfferKind(slot)
    let good = missionOfferGood(slot)
    let variant = missionOfferVariant(slot)
    let distance = worldDistance(currentWorld, target)
    let danger = effectiveWorldDanger(target)
    let amount = missionOfferAmount(slot)
    let reward = source == 1 ? campaignMissionReward(campaignStage) : 0
    if (source == 0 && kind == MissionKind.Delivery) reward = 70 + distance * 3 + amount * 35 + danger * 35
    else if (source == 0 && kind == MissionKind.Hunt) reward = 120 + amount * 70 + distance * 2 + danger * 45
    else if (source == 0) reward = 150 + distance * 3 + danger * 55
    let variantPercent = 0
    if (variant == MissionVariant.Fragile) variantPercent = 35
    else if (variant == MissionVariant.Express) variantPercent = 30
    else if (variant == MissionVariant.Illegal) variantPercent = 60
    else if (variant == MissionVariant.Ace) variantPercent = 50
    else if (variant == MissionVariant.UnderFire) variantPercent = 45
    let modePercent = gameMode == GameMode.Veteran ? 15 : (gameMode == GameMode.Iron ? 30 : 0)
    let eventPercent = marketEventMissionRewardPercent(target, kind, good)
    return Math.idiv(reward * (100 + variantPercent + modePercent + eventPercent) + 50, 100)
}

function missionOfferDeadline(slot: number): number {
    let source = missionOfferSource(slot)
    if (source == 2) return orbitDay + 5
    if (source == 3) return dailyMissionDeadline()
    let target = missionOfferTarget(slot)
    let estimatedJumps = Math.max(1, Math.idiv(worldDistance(currentWorld, target) + 21, 22))
    let reserve = source == 1 ? 5 : 4
    if (missionOfferVariant(slot) == MissionVariant.Express) reserve = 1
    return orbitDay + estimatedJumps + reserve
}

function missionLabel(kind: MissionKind): string {
    if (kind == MissionKind.Delivery) return Texts.t(220)
    if (kind == MissionKind.Hunt) return Texts.t(221)
    if (kind == MissionKind.Rescue) return Texts.t(222)
    return Texts.t(223)
}

function negotiatedMissionReward(baseReward: number, delta: number): number {
    let percent = Math.clamp(-10, 25, delta * 5)
    return Math.max(1, Math.idiv(baseReward * (100 + percent) + 50, 100))
}

function negotiationSuccess(seed: number, delta: number): boolean {
    if (delta <= 0) return true
    let skill = factionReputation(Faction.Traders) + upgrades[UPGRADE_SCANNER] * 12
    let chance = Math.clamp(10, 90, 70 + skill - delta * 18)
    return galaxyHash(seed, orbitDay, delta + 991) % 100 < chance
}

function blackMarketAvailable(): boolean {
    return currentWorld == 12 || currentWorld == PUBLIC_WORLD_COUNT ||
        factionReputation(Faction.Outlaws) >= 20
}

function blackMarketBuyPrice(good: number): number {
    if (good < 0 || good >= GOOD_COUNT) return 0
    return Math.max(1, Math.idiv(buyPrice(good) * 88, 100))
}

function blackMarketSellPrice(good: number): number {
    if (good < 0 || good >= GOOD_COUNT) return 0
    return Math.max(1, Math.idiv(sellPrice(good) * 125, 100))
}

function recordBlackMarketTrade(profit: number): void {
    blackMarketTrades = Math.min(SAVE_MAX_COUNTER, blackMarketTrades + 1)
    if (profit > 0) recordTradeProfit(profit)
    adjustReputation(Faction.Outlaws, 2)
    adjustReputation(Faction.Union, -1)
    updateAchievements()
}

// One signed 16-bit number from a table. The tables are stored as hex text to save flash memory.
function tableI16(table: Buffer, index: number): number {
    return table.getNumber(NumberFormat.Int16LE, index * 2)
}
