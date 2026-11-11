// The main program: start, game loop and buttons.
// Programmed by CALLIOPE HACKER for Calliope mini 3 + GameKit.

let menuRepeatDirection = 0
let menuRepeatAtMs = 0

function updateMenuRepeat(): void {
    if (activeScene == SceneId.Flight || activeScene == SceneId.Intro || inputLocked) {
        menuRepeatDirection = 0
        return
    }
    let direction = 0
    if (controller.up.isPressed()) direction = 1
    else if (controller.down.isPressed()) direction = 2
    else if (controller.left.isPressed()) direction = 3
    else if (controller.right.isPressed()) direction = 4
    if (direction == 0) {
        menuRepeatDirection = 0
        return
    }
    let now = game.runtime()
    if (direction != menuRepeatDirection) {
        menuRepeatDirection = direction
        menuRepeatAtMs = now + 350
        return
    }
    if (now < menuRepeatAtMs) return
    if (direction == 1) handleDirection(0, -1)
    else if (direction == 2) handleDirection(0, 1)
    else if (direction == 3) handleDirection(-1, 0)
    else handleDirection(1, 0)
    menuRepeatAtMs = now + 120
}

scene.setBackgroundColor(COLOR_BACKGROUND)
initializeSound()
loadGame()
if (introShouldAutoPlay()) startConfiguredIntro()
else setScene(SceneId.Title)

game.onPaint(function () {
    countFrame()
    drawCurrentScene()
})

game.onUpdate(function () {
    if (inputLocked && allButtonsReleased()) inputLocked = false
    updateIntro()
    updateFlight()
    updateSoundscape()
    updateMenuRepeat()
    updateDiagnostics()
})

controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    handleDirection(0, -1)
})

controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    handleDirection(0, 1)
})

controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    handleDirection(-1, 0)
})

controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    handleDirection(1, 0)
})

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (activeScene == SceneId.Flight) flightFire()
    else handleA()
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    if (activeScene == SceneId.Flight) flightSecondary()
    else handleB()
})
