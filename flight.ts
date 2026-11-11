// The flight between two worlds: phases, encounters, fights, rescue and docking.
let flightPhase = FlightPhase.Launch
let phaseStartedAtMs = 0
let flightLastUpdateAtMs = 0
let flightShield = 0
let reticleX = 80
let reticleY = 52
let weaponReadyAtMs = 0
let weaponFlashUntilMs = 0
let weaponHit = false
let laserHeat = 0
let escapeStartedAtMs = 0
let enemyActive = false
let enemyType = 0
let enemyX = 80
let enemyY = 42
let enemyVX = 1
let enemyVY = 1
let enemySize = 10
let enemyHull = 0
let enemiesRemaining = 0
let enemyMoveAtMs = 0
let enemyNextAttackAtMs = 0
let attackFireAtMs = 0
let attackX = 0
let attackY = 0
let rescuePodX = 80
let rescuePodY = 43
let tractorProgress = 0
let dockingProgress = 0
let flightMessage = ""
let reticleMoveCarry = 0
let laserCoolCarry = 0
let rescueDriftAtMs = 0
let rescueDriftStep = 0
let enemyAttackSequence = 0
let enemyShield = 0
let hintText = ""
let hintTextUntilMs = 0
let damageFlashUntilMs = 0
let rescueAfterCombat = false
let enemyPatternStep = 0
let flightRankBefore = 0

// Flight events. The event numbers stay inside this file. The save only keeps what an event changed,
// never a half-finished encounter.
const FLIGHT_EVENT_NONE = 0
const FLIGHT_EVENT_TRADER = 1
const FLIGHT_EVENT_DISTRESS = 2
const FLIGHT_EVENT_CUSTOMS = 3
const FLIGHT_EVENT_MINES = 4
const FLIGHT_EVENT_WRECK = 5
const FLIGHT_EVENT_SMUGGLER = 6

let journeyEventChecked = false
let flightEventType = FLIGHT_EVENT_NONE
let flightEventResolved = false
let flightEventResolvedAtMs = 0
let flightEventResult = ""
let eventForcesCombat = false
let weaponEnergyCarry = 0
let shieldEnergyCarry = 0
let formationKind = 0
let formationWingmen = 0
let bossPhase = 0
let bossMaxHull = 0
let bossStoredHull = 0
let bossStoredShield = 0
let bossReinforcements = 0
let bossWaiting = false
let bossWeakX = 80
let bossWeakY = 42
let flightHintUntilMs = 0

function startJourney(): void {
    let cost = jumpCost(currentWorld, destinationWorld)
    if (destinationWorld == currentWorld || cost > maxJumpCost() || cost > fuel) {
        soundError()
        showNotice(Texts.t(508), Texts.t(509), "", SceneId.Hangar)
        return
    }
    if (missionSource == 2 && tutorialStage == 2) {
        if (destinationWorld != 1) {
            soundError()
            showNotice(Texts.t(510), Texts.t(511), Texts.t(512), SceneId.StarMap)
            return
        }
        tutorialStage = 3
    }
    transitOrigin = currentWorld
    transitTarget = destinationWorld
    transitSeed = stableHash(currentWorld, destinationWorld, orbitDay + saveSequence)
    fuel -= cost
    inTransit = 1
    writeSave()
    initializeFlight()
    setScene(SceneId.Flight)
}

function resumeJourney(): void {
    initializeFlight()
    setScene(SceneId.Flight)
}

function initializeFlight(): void {
    flightPhase = FlightPhase.Launch
    phaseStartedAtMs = game.runtime()
    flightLastUpdateAtMs = phaseStartedAtMs
    flightShield = maxShield()
    reticleX = 80
    reticleY = 52
    weaponReadyAtMs = phaseStartedAtMs
    weaponFlashUntilMs = 0
    laserHeat = 0
    escapeStartedAtMs = 0
    enemyActive = false
    enemiesRemaining = 0
    attackFireAtMs = 0
    tractorProgress = 0
    dockingProgress = 0
    flightMessage = Texts.t(254)
    reticleMoveCarry = 0
    laserCoolCarry = 0
    rescueDriftAtMs = phaseStartedAtMs + 96
    rescueDriftStep = 0
    enemyAttackSequence = 0
    enemyShield = 0
    hintText = ""
    hintTextUntilMs = 0
    damageFlashUntilMs = 0
    rescueAfterCombat = false
    enemyPatternStep = 0
    flightRankBefore = currentRank()
    journeyEventChecked = false
    flightEventType = FLIGHT_EVENT_NONE
    flightEventResolved = false
    flightEventResolvedAtMs = 0
    flightEventResult = ""
    eventForcesCombat = false
    weaponEnergyCarry = 0
    shieldEnergyCarry = 0
    formationKind = 0
    formationWingmen = 0
    bossPhase = 0
    bossMaxHull = 0
    bossStoredHull = 0
    bossStoredShield = 0
    bossReinforcements = 0
    bossWaiting = false
    flightHintUntilMs = 0
    soundLaunch()
}

function beginCruise(): void {
    flightPhase = FlightPhase.Cruise
    phaseStartedAtMs = game.runtime()
    flightMessage = Texts.t(513) + WORLD_NAMES[transitTarget]
    soundCruise()
}

function chooseEncounter(): void {
    if (!journeyEventChecked) {
        journeyEventChecked = true
        if (shouldStartFlightEvent()) {
            beginFlightEvent()
            return
        }
    }
    // The first courier run from LUMA to VEXO teaches navigation without a surprise fight.
    if (missionSource == 2 && missionTarget == transitTarget) {
        beginApproach(true)
        return
    }
    if (missionKind == MissionKind.Rescue && missionTarget == transitTarget && missionProgress == 0) {
        if (missionVariant == MissionVariant.UnderFire) {
            enemiesRemaining = 1 + (gameMode > 0 ? 1 : 0)
            rescueAfterCombat = true
            beginCombatEncounter(false)
        } else beginRescueEncounter()
        return
    }
    if (missionKind == MissionKind.Hunt && missionTarget == transitTarget &&
        missionProgress < missionAmount) {
        enemiesRemaining = missionAmount - missionProgress
        beginCombatEncounter(true)
        return
    }
    let routeDanger = effectiveWorldDanger(transitTarget)
    let chance = 12 + routeDanger * 16 + gameMode * 10
    if (missionKind == MissionKind.Delivery && missionVariant == MissionVariant.Illegal) chance += 25
    if (marketEventKind == MarketEventKind.Blockade && marketEventWorld == transitTarget &&
        orbitDay <= marketEventEnds) chance += 25
    chance = Math.min(92, chance)
    if (transitSeed % 100 < chance) {
        enemiesRemaining = 1 + stableHash(transitSeed, orbitDay, 4) % Math.max(1, routeDanger + 1)
        beginCombatEncounter(false)
    } else beginApproach(true)
}

function shouldStartFlightEvent(): boolean {
    if (missionSource == 2 || tutorialStage > 0 && tutorialStage < 4) return false
    let chance = 38 + effectiveWorldDanger(transitTarget) * 5
    if (moduleDamage[ShipModule.Scanner] >= 2) chance += 8
    if (transitTarget >= PUBLIC_WORLD_COUNT) chance = 100
    return stableHash(transitSeed, orbitDay, 211) % 100 < chance
}

function beginFlightEvent(): void {
    flightPhase = FlightPhase.Event
    phaseStartedAtMs = game.runtime()
    flightEventResolved = false
    flightEventResult = ""
    eventForcesCombat = false
    flightEventType = 1 + stableHash(transitSeed, orbitDay, galaxySeed + 223) % 6
    flightMessage = flightEventTitle()
    if (flightEventType == FLIGHT_EVENT_DISTRESS || flightEventType == FLIGHT_EVENT_MINES) soundAlarm()
    else if (flightEventType == FLIGHT_EVENT_WRECK) soundRescueSignal()
    else soundEncounter()
}

function flightEventFaction(): Faction {
    if (flightEventType == FLIGHT_EVENT_SMUGGLER) return Faction.Outlaws
    return worldFaction(transitTarget)
}

function flightEventTitle(): string {
    if (flightEventType == FLIGHT_EVENT_TRADER) return Texts.t(514)
    if (flightEventType == FLIGHT_EVENT_DISTRESS) return Texts.t(515)
    if (flightEventType == FLIGHT_EVENT_CUSTOMS) return Texts.t(516)
    if (flightEventType == FLIGHT_EVENT_MINES) return Texts.t(517)
    if (flightEventType == FLIGHT_EVENT_WRECK) return Texts.t(518)
    if (flightEventType == FLIGHT_EVENT_SMUGGLER) return Texts.t(519)
    return Texts.t(520)
}

function flightEventDetail(): string {
    if (flightEventType == FLIGHT_EVENT_TRADER) return Texts.t(521)
    if (flightEventType == FLIGHT_EVENT_DISTRESS) return Texts.t(522)
    if (flightEventType == FLIGHT_EVENT_CUSTOMS) return Texts.t(523)
    if (flightEventType == FLIGHT_EVENT_MINES) return Texts.t(524)
    if (flightEventType == FLIGHT_EVENT_WRECK) return Texts.t(525)
    return Texts.t(526)
}

function flightEventAcceptLabel(): string {
    if (flightEventType == FLIGHT_EVENT_TRADER) return Texts.t(527)
    if (flightEventType == FLIGHT_EVENT_DISTRESS) return Texts.t(528)
    if (flightEventType == FLIGHT_EVENT_CUSTOMS) return Texts.t(529)
    if (flightEventType == FLIGHT_EVENT_MINES) return Texts.t(530)
    if (flightEventType == FLIGHT_EVENT_WRECK) return Texts.t(531)
    return Texts.t(532)
}

function flightEventDeclineLabel(): string {
    if (flightEventType == FLIGHT_EVENT_CUSTOMS) return Texts.t(533)
    if (flightEventType == FLIGHT_EVENT_MINES) return Texts.t(534)
    return Texts.t(535)
}

function finishFlightEvent(result: string): void {
    flightEventResult = result
    flightEventResolved = true
    flightEventResolvedAtMs = game.runtime()
    recordEvent()
    updateAchievements()
}

function resolveFlightEvent(accept: boolean): void {
    if (flightPhase != FlightPhase.Event || flightEventResolved) return
    let roll = stableHash(transitSeed, flightEventType, orbitDay + 239) % 100
    if (flightEventType == FLIGHT_EVENT_TRADER) {
        if (accept && credits >= 45) {
            credits -= 45
            fuel = Math.min(maxFuel(), fuel + 2)
            hull = Math.min(maxHull(), hull + 2)
            adjustReputation(Faction.Traders, 1)
            soundBuy()
            finishFlightEvent(Texts.t(536))
        } else finishFlightEvent(accept ? Texts.t(440) : Texts.t(537))
    } else if (flightEventType == FLIGHT_EVENT_DISTRESS) {
        if (accept) {
            let reward = 55 + effectiveWorldDanger(transitTarget) * 15
            credits += reward
            recordRescue()
            adjustReputation(Faction.Union, 3)
            if (roll < 18 && addArtifact(stableHash(transitSeed, orbitDay, 241) % ARTIFACT_COUNT))
                finishFlightEvent(Texts.t(538))
            else finishFlightEvent(Texts.t(539) + reward + Texts.t(319))
            soundRescueComplete()
        } else {
            adjustReputation(Faction.Union, -2)
            finishFlightEvent(Texts.t(540))
        }
    } else if (flightEventType == FLIGHT_EVENT_CUSTOMS) {
        if (accept) {
            if (missionKind == MissionKind.Delivery && missionVariant == MissionVariant.Illegal) {
                let fine = Math.min(credits, 80 + effectiveWorldDanger(transitTarget) * 25)
                credits -= fine
                missionProgress = Math.max(1, missionProgress)
                adjustReputation(Faction.Union, -3)
                soundError()
                finishFlightEvent(Texts.t(541) + fine + Texts.t(319))
            } else {
                adjustReputation(Faction.Union, 1)
                soundConfirm()
                finishFlightEvent(Texts.t(542))
            }
        } else {
            adjustReputation(Faction.Union, -5)
            adjustReputation(Faction.Outlaws, 2)
            eventForcesCombat = true
            soundAlarm()
            finishFlightEvent(Texts.t(543))
        }
    } else if (flightEventType == FLIGHT_EVENT_MINES) {
        if (!accept && useMine()) {
            soundExplosion()
            finishFlightEvent(Texts.t(544))
        } else {
            let safe = roll < 58 + upgrades[UPGRADE_SCANNER] * 12 -
                moduleDamage[ShipModule.Scanner] * 14
            if (!safe) {
                soundAlarm()
                damagePlayer(1 + Math.idiv(effectiveWorldDanger(transitTarget), 2))
                if (activeScene != SceneId.Flight) return
                damageModule(ShipModule.Engine, 1)
                finishFlightEvent(Texts.t(545))
            } else finishFlightEvent(accept ? Texts.t(546) : Texts.t(547))
        }
    } else if (flightEventType == FLIGHT_EVENT_WRECK) {
        if (accept) {
            let artifact = stableHash(transitSeed, galaxySeed, orbitDay + 251) % ARTIFACT_COUNT
            if (roll < 34 && addArtifact(artifact)) {
                adjustReputation(Faction.Scientists, 3)
                soundMission()
                finishFlightEvent(Texts.t(548))
            } else if (addRareCargo(stableHash(transitSeed, roll, 257) % RARE_GOOD_COUNT, 1)) {
                finishFlightEvent(Texts.t(549))
            } else {
                credits += 35
                finishFlightEvent(Texts.t(550))
            }
        } else finishFlightEvent(Texts.t(551))
    } else if (flightEventType == FLIGHT_EVENT_SMUGGLER) {
        if (accept && credits >= 90 &&
            addRareCargo(stableHash(transitSeed, orbitDay, 263) % RARE_GOOD_COUNT, 1)) {
            credits -= 90
            adjustReputation(Faction.Outlaws, 4)
            adjustReputation(Faction.Traders, -1)
            soundBuy()
            finishFlightEvent(Texts.t(552))
        } else {
            if (!accept) adjustReputation(Faction.Union, 1)
            finishFlightEvent(accept ? Texts.t(553) : Texts.t(554))
        }
    }
}

function leaveFlightEvent(): void {
    flightEventType = FLIGHT_EVENT_NONE
    if (eventForcesCombat) {
        enemiesRemaining = 1 + gameMode
        beginCombatEncounter(false)
    } else chooseEncounter()
}

function beginCombatEncounter(hunt: boolean): void {
    flightPhase = FlightPhase.Encounter
    phaseStartedAtMs = game.runtime()
    flightMessage = hunt ? Texts.t(555) : (rescueAfterCombat ? Texts.t(556) : Texts.t(557))
    soundEncounter()
    spawnEnemy(hunt)
}

function spawnEnemy(hunt: boolean): void {
    let now = game.runtime()
    enemyActive = true
    if (hunt && missionSource == 1 && campaignStage >= 5 && enemiesRemaining == 1) enemyType = 4
    else if (hunt && missionVariant == MissionVariant.Ace) enemyType = 3
    else if (hunt && missionVariant == MissionVariant.UnderFire) enemyType = 2
    else if (hunt) enemyType = stableHash(missionSeed, enemiesRemaining, totalVictories + 19) % 3
    else if (marketEventKind == MarketEventKind.Blockade && marketEventWorld == transitTarget &&
        orbitDay <= marketEventEnds) enemyType = 4
    else enemyType = stableHash(transitSeed, enemiesRemaining, totalVictories) % 3
    enemyX = 35 + stableHash(transitSeed, enemiesRemaining, 8) % 90
    enemyY = 24 + stableHash(transitSeed, enemiesRemaining, 9) % 35
    enemyVX = stableHash(transitSeed, enemiesRemaining, 10) % 2 == 0 ? -1 : 1
    enemyVY = stableHash(transitSeed, enemiesRemaining, 11) % 2 == 0 ? -1 : 1
    let danger = effectiveWorldDanger(transitTarget)
    enemySize = 8 + danger * 2 + Math.min(4, enemyType)
    enemyHull = 2 + danger + enemyType + (hunt ? 2 : 0) + gameMode
    if (enemyType == 4) enemyHull += 5 + gameMode * 2
    enemyShield = enemyType == 2 ? 2 + danger
        : (enemyType == 3 ? 3 + danger : (enemyType == 4 ? 5 + danger : 0))
    formationKind = enemyType >= 3 ? 0 : stableHash(transitSeed, enemiesRemaining, 301) % 3
    formationWingmen = formationKind == 1 ? 2 : (formationKind == 2 ? 1 : 0)
    if (enemyType == 4) {
        bossPhase = 1
        bossMaxHull = enemyHull
        bossWaiting = false
        bossReinforcements = 0
    }
    enemyPatternStep = 0
    enemyMoveAtMs = now + enemyMoveDelayMs()
    enemyNextAttackAtMs = now + 1000 + stableHash(transitSeed, enemiesRemaining, 12) % 600
    attackFireAtMs = 0
    flightMessage = enemyTypeName(enemyType)
}

function updateBossWeakPoint(): void {
    if (bossPhase == 1) {
        bossWeakX = enemyX - Math.idiv(enemySize, 2)
        bossWeakY = enemyY
    } else if (bossPhase == 2) {
        bossWeakX = enemyX + Math.idiv(enemySize, 2)
        bossWeakY = enemyY - 2
    } else {
        bossWeakX = enemyX
        bossWeakY = enemyY + Math.idiv(enemySize, 3)
    }
}

function spawnBossReinforcement(): void {
    let now = game.runtime()
    enemyActive = true
    enemyType = bossReinforcements % 2 == 0 ? 2 : 0
    enemySize = enemyType == 2 ? 10 : 8
    enemyHull = 3 + effectiveWorldDanger(transitTarget) + gameMode
    enemyShield = enemyType == 2 ? 2 : 0
    enemyX = bossReinforcements % 2 == 0 ? 38 : 122
    enemyY = 30 + bossReinforcements * 7
    enemyVX = enemyX < 80 ? 1 : -1
    enemyVY = 1
    enemyPatternStep = 0
    enemyMoveAtMs = now + enemyMoveDelayMs()
    enemyNextAttackAtMs = now + 850
    attackFireAtMs = 0
    formationKind = 1
    formationWingmen = 0
    flightMessage = Texts.t(558)
    soundAlarm()
}

function startBossReinforcements(amount: number): void {
    bossStoredHull = enemyHull
    bossStoredShield = enemyShield
    bossReinforcements = amount
    bossWaiting = true
    spawnBossReinforcement()
}

function restoreBossAfterReinforcements(): void {
    let now = game.runtime()
    bossWaiting = false
    enemyActive = true
    enemyType = 4
    enemySize = 14 + effectiveWorldDanger(transitTarget)
    enemyHull = bossStoredHull
    enemyShield = bossStoredShield + bossPhase
    enemyX = 80
    enemyY = 40
    enemyVX = bossPhase >= 3 ? 2 : 1
    enemyVY = 1
    enemyPatternStep = 0
    enemyMoveAtMs = now + enemyMoveDelayMs()
    enemyNextAttackAtMs = now + 900
    attackFireAtMs = 0
    formationKind = 0
    formationWingmen = 0
    flightMessage = Texts.t(559) + bossPhase
    soundEncounter()
}

function checkBossPhase(): void {
    if (enemyType != 4 || bossWaiting || enemyHull <= 0) return
    if (bossPhase == 1 && enemyHull * 3 <= bossMaxHull * 2) {
        bossPhase = 2
        startBossReinforcements(2 + gameMode)
    } else if (bossPhase == 2 && enemyHull * 3 <= bossMaxHull) {
        bossPhase = 3
        startBossReinforcements(1 + gameMode)
    }
}

function enemyTypeName(type: number): string {
    if (type == 0) return Texts.t(560)
    if (type == 1) return Texts.t(561)
    if (type == 2) return Texts.t(562)
    if (type == 3) return Texts.t(563)
    return Texts.t(564)
}

function enemyMoveDelayMs(): number {
    if (enemyType == 0) return 34
    if (enemyType == 1) return 42
    if (enemyType == 2) return 72
    if (enemyType == 3) return 30
    return 82
}

function beginRescueEncounter(): void {
    flightPhase = FlightPhase.Encounter
    phaseStartedAtMs = game.runtime()
    flightMessage = Texts.t(500)
    enemyActive = false
    rescuePodX = 42 + stableHash(transitSeed, missionSeed, 2) % 77
    rescuePodY = 27 + stableHash(transitSeed, missionSeed, 3) % 35
    tractorProgress = 0
    soundRescueSignal()
}

function beginApproach(playCue: boolean): void {
    flightPhase = FlightPhase.Approach
    phaseStartedAtMs = game.runtime()
    enemyActive = false
    attackFireAtMs = 0
    escapeStartedAtMs = 0
    dockingProgress = 0
    flightMessage = Texts.t(565)
    if (playCue) soundApproach()
}

function updateReticle(deltaMs: number): void {
    let moving = controller.left.isPressed() || controller.right.isPressed() || controller.up.isPressed() ||
        controller.down.isPressed()
    if (!moving) {
        reticleMoveCarry = 0
        return
    }
    let speedPerSecond = controller.B.isPressed() ? 94 : 63
    if (energyMode == 3) speedPerSecond += 24
    speedPerSecond = Math.max(28, speedPerSecond - moduleDamage[ShipModule.Engine] * 11)
    reticleMoveCarry += deltaMs * speedPerSecond
    let step = Math.idiv(reticleMoveCarry, 1000)
    reticleMoveCarry %= 1000
    if (step <= 0) return
    if (controller.left.isPressed()) reticleX -= step
    if (controller.right.isPressed()) reticleX += step
    if (controller.up.isPressed()) reticleY -= step
    if (controller.down.isPressed()) reticleY += step
    reticleX = Math.clamp(12, 148, reticleX)
    reticleY = Math.clamp(17, 82, reticleY)
}

function updateFlightEnergy(deltaMs: number): void {
    let energyRate = energyMode == 2 ? 15 : (energyMode == 1 ? 6 : 9)
    energyRate = Math.max(2, energyRate - moduleDamage[ShipModule.Weapons] * 2)
    weaponEnergyCarry += deltaMs * energyRate
    while (weaponEnergyCarry >= 1000) {
        restoreWeaponEnergy(1)
        weaponEnergyCarry -= 1000
    }
    if (flightPhase == FlightPhase.Encounter && flightShield < maxShield()) {
        let shieldRate = energyMode == 1 ? 3 : 1
        shieldEnergyCarry += deltaMs * shieldRate
        let shieldStep = energyMode == 1 ? 1800 : 3600
        if (shieldEnergyCarry >= shieldStep) {
            flightShield++
            shieldEnergyCarry = 0
        }
    } else shieldEnergyCarry = 0
}

function updateFlight(): void {
    if (activeScene != SceneId.Flight) return
    let now = game.runtime()
    if (now - flightLastUpdateAtMs < 32) return
    let deltaMs = Math.min(80, now - flightLastUpdateAtMs)
    flightLastUpdateAtMs = now
    updateReticle(deltaMs)
    updateFlightEnergy(deltaMs)
    if (laserHeat > 0) {
        laserCoolCarry += deltaMs
        let coolStep = energyMode == 2 ? 85 : 120
        while (laserCoolCarry >= coolStep && laserHeat > 0) {
            laserHeat--
            laserCoolCarry -= coolStep
        }
    } else laserCoolCarry = 0
    if (flightPhase == FlightPhase.Launch) {
        if (now - phaseStartedAtMs > 1700) beginCruise()
    } else if (flightPhase == FlightPhase.Cruise) {
        if (now - phaseStartedAtMs > 2500) chooseEncounter()
    } else if (flightPhase == FlightPhase.Event) {
        if (flightEventResolved && now - flightEventResolvedAtMs > 1150) leaveFlightEvent()
    } else if (flightPhase == FlightPhase.Encounter) {
        if (missionKind == MissionKind.Rescue && missionTarget == transitTarget && missionProgress == 0 &&
            !enemyActive && !rescueAfterCombat) updateTractor(now, deltaMs)
        else updateCombat(now)
        if (activeScene != SceneId.Flight) return
        updateEscape(now)
    } else if (flightPhase == FlightPhase.Approach) {
        updateDocking(now, deltaMs)
    }
}

function updateCombat(now: number): void {
    if (!enemyActive) return
    let moveSteps = 0
    while (now >= enemyMoveAtMs && moveSteps < 4) {
        let speed = enemyType == 0 || enemyType == 3 ? 2 : 1
        if (enemyType == 4 && bossPhase >= 3) speed = 2
        enemyX += enemyVX * speed
        enemyY += enemyVY
        enemyPatternStep++
        if (enemyType == 1 && enemyPatternStep % 9 == 0) enemyVY = 0 - enemyVY
        if (enemyType == 3 && enemyPatternStep % 13 == 0) enemyVX = 0 - enemyVX
        if (enemyX < 24 || enemyX > 136) enemyVX = 0 - enemyVX
        if (enemyY < 20 || enemyY > 70) enemyVY = 0 - enemyVY
        enemyMoveAtMs += enemyMoveDelayMs()
        moveSteps++
    }
    if (enemyType == 4) updateBossWeakPoint()
    if (moveSteps >= 4 && now >= enemyMoveAtMs)
        enemyMoveAtMs = now + enemyMoveDelayMs()
    if (attackFireAtMs == 0 && now >= enemyNextAttackAtMs) {
        attackX = reticleX
        attackY = reticleY
        attackFireAtMs = now + (enemyType == 3 ? 470 : (enemyType == 2 || enemyType == 4 ? 760 : 620))
        enemyAttackSequence++
        soundEnemyLock()
    } else if (attackFireAtMs > 0 && now >= attackFireAtMs) {
        if (Math.abs(reticleX - attackX) < 13 && Math.abs(reticleY - attackY) < 13) {
            let damage = 1 + (enemyType >= 2 ? 1 : 0) + (enemyType == 4 ? 1 : 0) + (gameMode == 2 ? 1 : 0)
            if (formationWingmen > 0) damage++
            damagePlayer(damage)
            if (activeScene != SceneId.Flight) return
        }
        attackFireAtMs = 0
        enemyNextAttackAtMs = now + 820 +
            stableHash(transitSeed, enemyAttackSequence, enemiesRemaining + 31) % 720
    }
}

function updateTractor(now: number, deltaMs: number): void {
    let driftSteps = 0
    while (now >= rescueDriftAtMs && driftSteps < 3) {
        rescuePodX += stableHash(transitSeed, rescueDriftStep, 5) % 3 - 1
        rescuePodY += stableHash(transitSeed, rescueDriftStep, 6) % 3 - 1
        rescueDriftStep++
        rescueDriftAtMs += 96
        driftSteps++
    }
    if (driftSteps >= 3 && now >= rescueDriftAtMs) rescueDriftAtMs = now + 96
    rescuePodX = Math.clamp(24, 136, rescuePodX)
    rescuePodY = Math.clamp(22, 70, rescuePodY)
    let inRange = Math.abs(reticleX - rescuePodX) <= 11 && Math.abs(reticleY - rescuePodY) <= 11
    if (controller.A.isPressed() && inRange) tractorProgress += deltaMs
    else tractorProgress = Math.max(0, tractorProgress - deltaMs * 2)
    if (tractorProgress >= 900) {
        missionProgress = 1
        soundRescueComplete()
        beginApproach(false)
    }
}

function updateEscape(now: number): void {
    if (flightPhase != FlightPhase.Encounter) return
    if (controller.B.isPressed() && fuel > 0) {
        if (escapeStartedAtMs == 0) escapeStartedAtMs = now
        if (now - escapeStartedAtMs >= escapeChargeTimeMs()) {
            fuel--
            flightMessage = Texts.t(566)
            soundEscape()
            beginApproach(false)
        }
    } else escapeStartedAtMs = 0
}

function updateDocking(now: number, deltaMs: number): void {
    let gateX = 80 + Math.round(Math.sin((now - phaseStartedAtMs) / 700) * 12)
    let gateY = 46
    if (Math.abs(reticleX - gateX) < 9 && Math.abs(reticleY - gateY) < 9) dockingProgress += deltaMs
    else dockingProgress = Math.max(0, dockingProgress - deltaMs * 2)
    if (dockingProgress >= 900 && now - phaseStartedAtMs > 1200) finishDocking()
}

function flightFire(): void {
    if (activeScene != SceneId.Flight || inputLocked) return
    let now = game.runtime()
    if (flightPhase == FlightPhase.Event) {
        resolveFlightEvent(true)
        return
    }
    if (flightPhase != FlightPhase.Encounter) return
    if (missionKind == MissionKind.Rescue && missionTarget == transitTarget && missionProgress == 0 &&
        !enemyActive) return
    if (now < weaponReadyAtMs || !enemyActive || moduleDamage[ShipModule.Weapons] >= 3) {
        if (moduleDamage[ShipModule.Weapons] >= 3) showFlightHint(Texts.t(567))
        return
    }
    // When the missile or mine rack is empty, the laser fires instead, so A always fires something.
    if (activeWeapon == WeaponKind.Missile && missiles <= 0 ||
        activeWeapon == WeaponKind.Mine && mines <= 0) {
        activeWeapon = WeaponKind.Laser
        showFlightHint(Texts.t(580) + weaponName(activeWeapon))
    }
    if (activeWeapon == WeaponKind.Missile) fireMissile(now)
    else if (activeWeapon == WeaponKind.Mine) fireMine(now)
    else fireLaser(now)
}

function showFlightHint(message: string): void {
    hintText = message
    hintTextUntilMs = game.runtime() + 900
    flightHintUntilMs = hintTextUntilMs
}

function fireLaser(now: number): void {
    if (laserHeat >= 10 || weaponEnergy < 7) {
        soundError()
        showFlightHint(laserHeat >= 10 ? Texts.t(568) : Texts.t(569))
        return
    }
    weaponReadyAtMs = now + laserCooldownMs()
    weaponFlashUntilMs = now + 90
    laserHeat = Math.min(10, laserHeat + 3)
    weaponEnergy -= 7
    weaponHit = Math.abs(reticleX - enemyX) <= enemySize && Math.abs(reticleY - enemyY) <= enemySize
    soundLaser(weaponHit)
    if (weaponHit) {
        applyEnemyDamage(laserDamage(), false)
    }
}

function fireMissile(now: number): void {
    if (!useMissile()) {
        soundError()
        showFlightHint(missiles <= 0 ? Texts.t(570) : Texts.t(571))
        return
    }
    weaponReadyAtMs = now + 720
    weaponFlashUntilMs = now + 180
    weaponHit = Math.abs(reticleX - enemyX) <= enemySize + 18 &&
        Math.abs(reticleY - enemyY) <= enemySize + 18
    soundLaser(weaponHit)
    if (weaponHit) applyEnemyDamage(5 + upgrades[UPGRADE_LASER], true)
}

function fireMine(now: number): void {
    if (!useMine()) {
        soundError()
        showFlightHint(mines <= 0 ? Texts.t(572) : Texts.t(573))
        return
    }
    weaponReadyAtMs = now + 900
    weaponFlashUntilMs = now + 220
    weaponHit = true
    attackFireAtMs = 0
    enemyNextAttackAtMs = now + 1500
    soundExplosion()
    if (formationWingmen > 0) {
        totalVictories += formationWingmen
        formationWingmen = 0
        showFlightHint(Texts.t(574))
    }
    applyEnemyDamage(3 + upgrades[UPGRADE_LASER], false)
}

function applyEnemyDamage(amount: number, precisionWeapon: boolean): void {
    let now = game.runtime()
    if (formationWingmen > 0) {
        formationWingmen--
        totalVictories++
        credits += 12
        soundExplosion()
        showFlightHint(Texts.t(575))
        updateAchievements()
        return
    }
    if (enemyType == 4) {
        updateBossWeakPoint()
        let weakHit = precisionWeapon ||
            Math.abs(reticleX - bossWeakX) <= 8 && Math.abs(reticleY - bossWeakY) <= 8
        if (!weakHit) {
            amount = Math.max(1, Math.idiv(amount, 3))
            showFlightHint(Texts.t(576))
        } else showFlightHint(Texts.t(577))
    }
    if (enemyShield > 0) {
        let absorbed = Math.min(enemyShield, amount)
        enemyShield -= absorbed
        amount -= absorbed
        hintText = Texts.t(578) + absorbed
        hintTextUntilMs = now + 650
    }
    enemyHull -= amount
    if (enemyHull <= 0) destroyEnemy()
    else checkBossPhase()
}

function flightSecondary(): void {
    if (activeScene != SceneId.Flight || inputLocked) return
    if (flightPhase == FlightPhase.Event) {
        resolveFlightEvent(false)
        return
    }
    if (controller.left.isPressed()) {
        cycleEnergyMode(-1)
        soundNavigate()
        showFlightHint(Texts.t(579) + energyModeName())
    } else if (controller.right.isPressed()) {
        cycleEnergyMode(1)
        soundNavigate()
        showFlightHint(Texts.t(579) + energyModeName())
    } else {
        cycleWeapon(1)
        soundNavigate()
        showFlightHint(Texts.t(580) + weaponName(activeWeapon))
    }
}

function destroyEnemy(): void {
    enemyActive = false
    attackFireAtMs = 0
    totalVictories++
    let bounty = 18 + effectiveWorldDanger(transitTarget) * 12 + enemyType * 7
    if (gameMode > 0) bounty += Math.idiv(bounty * gameMode, 4)
    credits += bounty
    if (bossWaiting) {
        bossReinforcements--
        soundExplosion()
        updateAchievements()
        if (bossReinforcements > 0) spawnBossReinforcement()
        else restoreBossAfterReinforcements()
        return
    }
    enemiesRemaining--
    if (missionKind == MissionKind.Hunt && missionTarget == transitTarget) missionProgress++
    if (enemyType == 4) {
        bossVictories++
        adjustReputation(Faction.Union, 5)
        addArtifact(stableHash(transitSeed, orbitDay, bossVictories + 313) % ARTIFACT_COUNT)
    }
    grantSalvage()
    soundExplosion()
    formationWingmen = 0
    updateAchievements()
    if (enemiesRemaining > 0) spawnEnemy(missionKind == MissionKind.Hunt && missionTarget == transitTarget)
    else if (rescueAfterCombat) {
        rescueAfterCombat = false
        beginRescueEncounter()
    } else beginApproach(false)
}

function grantSalvage(): void {
    let roll = stableHash(transitSeed, totalVictories, enemyType + enemiesRemaining * 7) % 100
    let chance = 32 + (shipRole == ShipRole.Trader ? 23 : 0) + upgrades[UPGRADE_SCANNER] * 8
    if (enemyType >= 3 && roll < 12 &&
        addRareCargo(stableHash(transitSeed, totalVictories, 317) % RARE_GOOD_COUNT, 1)) {
        hintText = Texts.t(581)
    } else if (cargoUnits() < cargoCapacity() && roll < chance) {
        let good = stableHash(transitSeed, totalVictories, enemyType + 73) % GOOD_COUNT
        cargo[good]++
        hintText = Texts.t(582) + Texts.t(GOOD_NAMES[good])
    } else {
        let scrap = 6 + enemyType * 3
        credits += scrap
        hintText = Texts.t(583) + scrap + Texts.t(319)
    }
    hintTextUntilMs = game.runtime() + 1200
}

function damagePlayer(amount: number): boolean {
    let dodge = controller.B.isPressed() ? 50 : 0
    if (shipRole == ShipRole.Courier) dodge += 15
    if (energyMode == 3) dodge += 18
    dodge -= moduleDamage[ShipModule.Engine] * 12
    if (stableHash(transitSeed, enemyAttackSequence, reticleX) % 100 < dodge) {
        hintText = Texts.t(584)
        hintTextUntilMs = game.runtime() + 700
        return false
    }
    damageFlashUntilMs = game.runtime() + 180
    let hullBefore = hull
    let shieldBefore = flightShield
    if (energyMode == 1 && amount > 1) amount--
    while (amount > 0 && flightShield > 0) {
        flightShield--
        amount--
    }
    if (shieldBefore > 0 && flightShield <= 0) soundShieldBreak()
    hull -= amount
    if (hull < hullBefore && missionKind == MissionKind.Delivery &&
        missionVariant == MissionVariant.Fragile)
        missionProgress = 1
    let tradeCargo = 0
    for (let i = 0; i < GOOD_COUNT; i++) tradeCargo += cargo[i]
    if (hull < hullBefore && enemyType == 1 && tradeCargo > 0 &&
        stableHash(transitSeed, enemyAttackSequence, 91) % 3 == 0) {
        removeCargoUnits(1)
        hintText = Texts.t(585)
        hintTextUntilMs = game.runtime() + 900
    }
    if (hull < hullBefore) {
        let moduleRoll = stableHash(transitSeed, enemyAttackSequence, hull + 331) % 100
        if (moduleRoll < 24 + effectiveWorldDanger(transitTarget) * 5) {
            let module = stableHash(transitSeed, enemyAttackSequence, 337) % SHIP_MODULE_COUNT
            damageModule(module, 1)
            hintText = moduleNameShort(module) + Texts.t(586)
            hintTextUntilMs = game.runtime() + 1000
            if (module == ShipModule.Cargo && cargoUnits() > 0) removeCargoUnits(1)
        }
    }
    soundDamage()
    if (hull <= 0) performInsuredRescue()
    return true
}

function moduleNameShort(module: number): string {
    if (module == ShipModule.Engine) return Texts.t(115)
    if (module == ShipModule.Scanner) return Texts.t(116)
    if (module == ShipModule.Weapons) return Texts.t(117)
    return Texts.t(587)
}

function insuredCargoLoss(): number {
    let total = 0
    for (let i = 0; i < GOOD_COUNT; i++) total += cargo[i]
    if (total <= 0) return 0
    let level = upgrades[UPGRADE_INSURANCE]
    if (level >= 2) return 1
    if (level == 1) return Math.idiv(total + 5, 6)
    return Math.idiv(total + 2, 3)
}

function removeCargoUnits(amount: number): void {
    let cursor = transitSeed % GOOD_COUNT
    let removed = 0
    let checks = 0
    while (removed < amount && checks < GOOD_COUNT * 20) {
        let good = cursor % GOOD_COUNT
        if (cargo[good] > 0) {
            let oldUnits = cargo[good]
            let costPer = Math.idiv(cargoCost[good], oldUnits)
            cargo[good]--
            cargoCost[good] = Math.max(0, cargoCost[good] - costPer)
            if (cargo[good] == 0) cargoCost[good] = 0
            removed++
        }
        cursor += 5
        checks++
    }
}

function performInsuredRescue(): void {
    soundDestroyed()
    if (!loadGame()) {
        newGame()
        showNotice(Texts.t(222), Texts.t(588), "", SceneId.Hangar)
        return
    }
    let lost = insuredCargoLoss()
    removeCargoUnits(lost)
    if (missionKind != MissionKind.None) failedMissions++
    if (missionSource == 2) tutorialStage = 1
    clearMission()
    currentWorld = transitOrigin
    destinationWorld = currentWorld
    inTransit = 0
    hull = maxHull()
    fuel = Math.max(1, fuel)
    grantEmergencyFuel()
    writeSave()
    showNotice(Texts.t(589), Texts.t(590) + lost, Texts.t(591), SceneId.Hangar)
}

function finishDocking(): void {
    let routeFinalTarget = routeHopCount() > 0 ? routeWorldAt(routeHopCount()) : -1
    currentWorld = transitTarget
    destinationWorld = currentWorld
    let routeContinues = false
    if (routeFinalTarget >= 0 && routeFinalTarget != currentWorld && planRouteTo(routeFinalTarget) &&
        routeHopCount() > 0) {
        destinationWorld = routeWorldAt(1)
        routeContinues = true
    } else clearPlannedRoute()
    inTransit = 0
    orbitDay++
    recordJump()
    let paidReward = missionReward
    let result = resolveMissionAtDock()
    if (upgrades[UPGRADE_REPAIR] > 0) hull = Math.min(maxHull(), hull + 1)
    if (upgrades[UPGRADE_REPAIR] > 0) repairModules()
    else {
        for (let module = 0; module < SHIP_MODULE_COUNT; module++) {
            if (moduleDamage[module] > 0) moduleDamage[module]--
        }
    }
    weaponEnergy = 100
    let emergencyFuel = grantEmergencyFuel()
    updateMarketEvent()
    refreshMarket()
    rememberCurrentMarket()
    updateAchievements()
    writeSave()
    if (result == 2) {
        soundMission()
        showNotice(Texts.t(592), "+" + paidReward + Texts.t(593), Texts.t(594), SceneId.Hangar)
    } else if (result == 4) {
        soundMission()
        showNotice(Texts.t(595), Texts.t(596), Texts.t(317) + rankName(), SceneId.Hangar)
    } else if (result == 3) {
        soundMission()
        showNotice(Texts.t(597), "+" + paidReward + Texts.t(593),
            Texts.t(389) + campaignStage + "/6", SceneId.Hangar)
    } else if (result == 1) {
        soundMission()
        let rankLine = currentRank() > flightRankBefore ? Texts.t(598) + rankName() : Texts.t(599)
        showNotice(Texts.t(600), "+" + paidReward + Texts.t(593), rankLine, SceneId.Hangar)
    } else if (result == -1) {
        soundError()
        showNotice(Texts.t(601), Texts.t(602), Texts.t(599), SceneId.Hangar)
    } else if (result == -2) {
        soundError()
        showNotice(Texts.t(603), Texts.t(604), Texts.t(599), SceneId.Hangar)
    } else {
        soundDock()
        let dockLine = emergencyFuel ? Texts.t(605)
            : (routeContinues ? Texts.t(606) + WORLD_NAMES[routeFinalTarget] : Texts.t(607))
        showNotice(Texts.t(608) + WORLD_NAMES[currentWorld], dockLine, Texts.t(599), SceneId.Hangar)
    }
}

function grantEmergencyFuel(): boolean {
    let minimum = Math.min(2, maxFuel())
    let needed = minimum - fuel
    if (needed > 0 && credits < needed * 8) {
        fuel = minimum
        return true
    }
    return false
}

function resolveMissionAtDock(): number {
    if (missionKind == MissionKind.None) return 0
    if (orbitDay > missionDeadline) {
        failedMissions++
        if (missionSource == 2) tutorialStage = 1
        clearMission()
        return -1
    }
    let complete = false
    if (currentWorld == missionTarget) {
        if (missionKind == MissionKind.Delivery) {
            if (missionVariant == MissionVariant.Fragile && missionProgress > 0) {
                failedMissions++
                clearMission()
                return -2
            }
            complete = true
        }
        if (missionKind == MissionKind.Hunt && missionProgress >= missionAmount) complete = true
        if (missionKind == MissionKind.Rescue && missionProgress > 0) complete = true
    }
    if (!complete) return 0
    let source = missionSource
    let completedKind = missionKind
    let completedVariant = missionVariant
    credits += missionReward
    completedMissions++
    if (completedKind == MissionKind.Delivery) recordDelivery()
    if (completedKind == MissionKind.Rescue) recordRescue()
    let targetFaction = flightEventFaction()
    adjustReputation(targetFaction, source == 1 ? 5 : 2)
    if (completedVariant == MissionVariant.Illegal) {
        adjustReputation(Faction.Outlaws, 4)
        adjustReputation(Faction.Union, -2)
    }
    if (source == 2) {
        tutorialStage = 4
        upgrades[UPGRADE_SCANNER] = Math.max(1, upgrades[UPGRADE_SCANNER])
    } else if (source == 1) advanceCampaignStage()
    else if (source == 3) completeDailyMission()
    clearMission()
    if (source == 2) return 2
    if (source == 1 && campaignStage >= 6) return 4
    if (source == 1) return 3
    return 1
}

function drawFlightStars(now: number): void {
    let shakeX = flightVisualShakeX()
    let shakeY = flightVisualShakeY()
    for (let i = 0; i < 24; i++) {
        let x = (stableHash(transitSeed, i, 3) + shakeX + 160) % 160
        let baseY = stableHash(transitSeed, i, 7) % 88
        let speed = 1 + i % 3
        let y = (baseY + Math.idiv(now - phaseStartedAtMs, 35) * speed + shakeY + 88) % 88
        screen.setPixel(x, y, i % 5 == 0 ? COLOR_CYAN : COLOR_TEXT)
    }
}

function flightVisualShakeX(): number {
    if (!cameraShake || game.runtime() >= damageFlashUntilMs) return 0
    return Math.idiv(game.runtime(), 35) % 2 == 0 ? -2 : 2
}

function flightVisualShakeY(): number {
    if (!cameraShake || game.runtime() >= damageFlashUntilMs) return 0
    return Math.idiv(game.runtime(), 55) % 2 == 0 ? -1 : 1
}

function drawCockpit(): void {
    screen.fill(COLOR_BACKGROUND)
    drawFlightStars(game.runtime())
    let shakeX = flightVisualShakeX()
    let shakeY = flightVisualShakeY()
    screen.drawLine(0, 88 + shakeY, 31 + shakeX, 70 + shakeY, COLOR_DIM)
    screen.drawLine(159, 88 + shakeY, 129 + shakeX, 70 + shakeY, COLOR_DIM)
    screen.drawLine(31 + shakeX, 70 + shakeY, 47 + shakeX, 88 + shakeY, COLOR_DIM)
    screen.drawLine(129 + shakeX, 70 + shakeY, 113 + shakeX, 88 + shakeY, COLOR_DIM)
    screen.fillRect(0, 89, 160, 31, COLOR_BLUE)
    screen.drawLine(0, 89, 160, 89, COLOR_CYAN)
    printGameText(Texts.t(260), 3, 94, COLOR_CYAN)
    screen.fillRect(13, 95, flightShield * 22 / Math.max(1, maxShield()), 4, COLOR_CYAN)
    printGameText(Texts.t(609), 3, 104, COLOR_GREEN)
    screen.fillRect(13, 105, hull * 22 / Math.max(1, maxHull()), 4, hull <= 2 ? COLOR_RED : COLOR_GREEN)
    printGameText(Texts.t(610), 45, 94, COLOR_YELLOW)
    screen.fillRect(55, 95, laserHeat * 2, 4, laserHeat >= 8 ? COLOR_RED : COLOR_YELLOW)
    printGameText(Texts.t(281) + fuel, 45, 104, COLOR_GREEN)
    printGameText(flightMessage, 3, 80, COLOR_TEXT)
    printGameText(flightWeaponName(), 78, 103, COLOR_YELLOW)
    printGameText(Texts.t(611) + weaponEnergy, 111, 103, energyMode == 2 ? COLOR_YELLOW : COLOR_CYAN)
    printGameText(Texts.t(612) + energyModeName(), 78, 111, energyMode == 0 ? COLOR_DIM : COLOR_GREEN)
    let damagedModules = 0
    for (let module = 0; module < SHIP_MODULE_COUNT; module++) if (moduleDamage[module] > 0) damagedModules++
    if (damagedModules > 0) printGameText(Texts.t(613) + damagedModules, 139, 111, COLOR_RED)
    if (escapeStartedAtMs > 0) {
        let charge = Math.min(28, Math.idiv((game.runtime() - escapeStartedAtMs) * 28, escapeChargeTimeMs()))
        screen.drawRect(78, 107, 30, 6, COLOR_YELLOW)
        screen.fillRect(79, 108, charge, 4, COLOR_YELLOW)
    }
    if (game.runtime() < hintTextUntilMs) {
        // During the station approach and while the rescue pod is shown, the hint goes to the top: line 80
        // holds the flight message and lines 66 to 72 hold the docking or tractor instruction with its bar.
        // With the pod, the radar (y 9 to 26) is on screen, so the hint goes just below it.
        // The pod is drawn later, so the hint never covers it.
        let hintY = flightPhase == FlightPhase.Approach ? 18 : (rescuePodShown() ? 29 : 78)
        screen.fillRect(45, hintY - 2, 112, 10, COLOR_BACKGROUND)
        printRight(hintText, 156, hintY, COLOR_YELLOW)
    }
    if (game.runtime() < damageFlashUntilMs) {
        screen.drawRect(0, 8, 159, 80, COLOR_RED)
        screen.drawRect(2, 10, 155, 76, COLOR_ORANGE)
    }
    drawCockpitRadar()
}

function flightWeaponName(): string {
    if (activeWeapon == WeaponKind.Missile) return Texts.t(614) + missiles
    if (activeWeapon == WeaponKind.Mine) return Texts.t(615) + mines
    return Texts.t(616)
}

function drawCockpitRadar(): void {
    if (flightPhase != FlightPhase.Encounter) return
    let scannerDamage = moduleDamage[ShipModule.Scanner]
    screen.drawRect(132, 9, 25, 18, scannerDamage >= 2 ? COLOR_RED : COLOR_CYAN)
    screen.setPixel(144, 18, COLOR_GREEN)
    if (scannerDamage >= 3 && Math.idiv(game.runtime(), 180) % 2 == 0) {
        printGameText(Texts.t(201), 136, 14, COLOR_RED)
        return
    }
    if (enemyActive) {
        let radarX = 144 + Math.clamp(-10, 10, Math.idiv(enemyX - reticleX, 7))
        let radarY = 18 + Math.clamp(-7, 7, Math.idiv(enemyY - reticleY, 7))
        screen.fillRect(radarX - 1, radarY - 1, 3, 3, enemyType == 4 ? COLOR_RED : COLOR_ORANGE)
    }
    if (formationWingmen > 0 && scannerDamage < 2) {
        screen.setPixel(136, 13, COLOR_YELLOW)
        if (formationWingmen > 1) screen.setPixel(153, 23, COLOR_YELLOW)
    }
}

function drawReticle(): void {
    screen.drawLine(reticleX - 6, reticleY, reticleX - 2, reticleY, COLOR_GREEN)
    screen.drawLine(reticleX + 2, reticleY, reticleX + 6, reticleY, COLOR_GREEN)
    screen.drawLine(reticleX, reticleY - 6, reticleX, reticleY - 2, COLOR_GREEN)
    screen.drawLine(reticleX, reticleY + 2, reticleX, reticleY + 6, COLOR_GREEN)
}

function drawEnemy(): void {
    if (!enemyActive) return
    let x = enemyX + flightVisualShakeX()
    let y = enemyY + flightVisualShakeY()
    let size = enemySize
    let color = enemyType >= 3 ? COLOR_RED
        : (enemyType == 2 ? COLOR_PURPLE : (enemyType == 1 ? COLOR_YELLOW : COLOR_ORANGE))
    drawEnemyFormation(x, y, size, color)
    if (enemyType == 0 || enemyType == 3) {
        screen.drawLine(x - size, y, x, y - Math.idiv(size, 2), color)
        screen.drawLine(x, y - Math.idiv(size, 2), x + size, y, color)
        screen.drawLine(x + size, y, x, y + Math.idiv(size, 2), color)
        screen.drawLine(x, y + Math.idiv(size, 2), x - size, y, color)
    } else if (enemyType == 1) {
        screen.drawLine(x - size, y + Math.idiv(size, 2), x, y - size, color)
        screen.drawLine(x, y - size, x + size, y + Math.idiv(size, 2), color)
        screen.drawLine(x + size, y + Math.idiv(size, 2), x - size, y + Math.idiv(size, 2), color)
    } else {
        screen.drawRect(x - size, y - Math.idiv(size, 2), size * 2, size, color)
        screen.drawLine(x - size, y, x - size - 4, y - 5, color)
        screen.drawLine(x + size, y, x + size + 4, y - 5, color)
    }
    if (enemyShield > 0) {
        let pulse = Math.idiv(game.runtime(), 90) % 3
        drawPreviewDiamond(x, y, size + 5 + pulse, Math.idiv(size, 2) + 5 + pulse, COLOR_CYAN)
    }
    if (enemyType == 4) {
        updateBossWeakPoint()
        screen.drawCircle(bossWeakX + flightVisualShakeX(), bossWeakY + flightVisualShakeY(),
            3 + Math.idiv(game.runtime(), 120) % 2, COLOR_YELLOW)
        printGameText(Texts.t(617) + bossPhase, x - 3, y - size - 8, COLOR_RED)
    }
    printGameText((enemyShield > 0 ? Texts.t(260) + enemyShield + " " : "") + Texts.t(609) + enemyHull,
        x - 8, y + size + 2, COLOR_RED)
}

function drawEnemyFormation(x: number, y: number, size: number, color: number): void {
    if (formationKind == 2) {
        screen.drawRect(x - size - 9, y - 4, size * 2 + 18, 8, COLOR_DIM)
        screen.drawLine(x - size - 12, y, x - size - 5, y, COLOR_YELLOW)
        screen.drawLine(x + size + 5, y, x + size + 12, y, COLOR_YELLOW)
    }
    if (formationWingmen > 0) {
        screen.drawLine(x - size - 12, y + 7, x - size - 6, y + 3, color)
        screen.drawLine(x - size - 6, y + 3, x - size - 4, y + 9, color)
    }
    if (formationWingmen > 1) {
        screen.drawLine(x + size + 12, y + 7, x + size + 6, y + 3, color)
        screen.drawLine(x + size + 6, y + 3, x + size + 4, y + 9, color)
    }
}

function drawFlightEvent(): void {
    screen.fillRect(5, 16, 150, 76, COLOR_BLUE)
    screen.drawRect(5, 16, 150, 76, flightEventResolved ? COLOR_GREEN : COLOR_CYAN)
    printGameText(flightEventTitle(), 9, 21, COLOR_YELLOW)
    if (flightEventResolved) {
        printWrappedText(flightEventResult, 9, 36, 23, COLOR_GREEN)
        printGameText(Texts.t(618), 9, 75, COLOR_TEXT)
    } else {
        printWrappedText(flightEventDetail(), 9, 36, 23, COLOR_TEXT)
        printGameText(flightEventAcceptLabel(), 9, 67, COLOR_GREEN)
        printGameText(flightEventDeclineLabel(), 9, 80, COLOR_ORANGE)
    }
}

function rescuePodShown(): boolean {
    return flightPhase == FlightPhase.Encounter && missionKind == MissionKind.Rescue &&
        missionTarget == transitTarget && missionProgress == 0 && !enemyActive && !rescueAfterCombat
}

function drawFlight(): void {
    drawCockpit()
    let now = game.runtime()
    if (flightPhase == FlightPhase.Launch) {
        let open = Math.min(34, Math.idiv(now - phaseStartedAtMs, 45))
        screen.drawRect(80 - open, 18, open * 2, 64, COLOR_CYAN)
        printGameText(Texts.t(254), 65, 43, COLOR_TEXT)
    } else if (flightPhase == FlightPhase.Cruise) {
        printGameText(Texts.t(619) + WORLD_NAMES[transitTarget], 35, 18, COLOR_CYAN)
    } else if (flightPhase == FlightPhase.Event) {
        drawFlightEvent()
    } else if (flightPhase == FlightPhase.Encounter) {
        if (rescuePodShown()) {
            // Like the docking instruction, the tractor hint stands left of its bar. Line 80 stays free for the
            // flight message. The pod drifts over the whole view, so it is drawn last and the hint and the bar
            // never cover it.
            printRight(Texts.t(620), 111, 66, COLOR_YELLOW)
            screen.drawRect(113, 67, 34, 5, COLOR_CYAN)
            screen.fillRect(114, 68, Math.min(32, Math.idiv(tractorProgress * 32, 900)), 3, COLOR_CYAN)
            screen.drawRect(rescuePodX - 5, rescuePodY - 5, 10, 10, COLOR_YELLOW)
            screen.drawLine(rescuePodX - 7, rescuePodY,
                rescuePodX + 7, rescuePodY, COLOR_YELLOW)
        } else drawEnemy()
        if (attackFireAtMs > 0) {
            screen.drawRect(attackX - 9, attackY - 9, 18, 18, COLOR_RED)
            screen.drawLine(attackX - 12, attackY, attackX + 12, attackY, COLOR_RED)
        }
        if (now < weaponFlashUntilMs) {
            screen.drawLine(50, 88, weaponHit ? enemyX : reticleX, weaponHit ?
                enemyY : reticleY, COLOR_YELLOW)
            screen.drawLine(110, 88, weaponHit ? enemyX : reticleX, weaponHit ?
                enemyY : reticleY, COLOR_YELLOW)
        }
    } else if (flightPhase == FlightPhase.Approach) {
        let elapsed = now - phaseStartedAtMs
        let gateX = 80 + Math.round(Math.sin(elapsed / 700) * 12)
        let size = Math.min(34, 13 + Math.idiv(elapsed, 180))
        screen.drawRect(gateX - size, 46 - Math.idiv(size, 2), size * 2, size, COLOR_CYAN)
        screen.drawRect(gateX - Math.idiv(size, 2), 46 - Math.idiv(size, 4), size, Math.idiv(size, 2),
            COLOR_GREEN)
        // The docking instruction stands left of the docking bar, below the gate (bottom edge at y 62 at most).
        // Line 80 stays free for the flight message, so a long title does not run into it.
        printRight(Texts.t(621), 111, 66, COLOR_TEXT)
        screen.drawRect(113, 67, 34, 5, COLOR_GREEN)
        screen.fillRect(114, 68, Math.min(32, Math.idiv(dockingProgress * 32, 900)), 3, COLOR_GREEN)
    }
    if (flightPhase != FlightPhase.Event) drawReticle()
}
