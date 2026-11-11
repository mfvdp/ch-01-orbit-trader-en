# Technical notes: Orbit Trader

This file briefly explains how the source code is organized and how to build it. The welcome and the first ideas for
changing the game are in `README.md`.

## How the project is organized

This is a project for MakeCode Arcade, written in TypeScript. `pxt.json` gives the project name `orbit-trader` and lists
all files in the order in which MakeCode reads them. `mkc.json` says which device to build for: the Calliope mini 3 with
GameKit (variant "n3").

The files of the game:

- `texts.ts`: All texts on the screen come from one catalog.
- `data.ts`: The fixed data of the game: worlds, goods, ships, missions and the campaign.
- `model.ts`: The rules and the state of the game: market, missions, campaign and achievements.
- `save.ts`: Saving and loading the game: two automatic slots and one slot for saving by hand.
- `screens.ts`: All screens and menus, and what the buttons do on each of them.
- `intro.ts`: The cinematic start.
- `flight.ts`: The flight between two worlds: phases, encounters, fights, rescue and docking.
- `sound.ts`: All sound of the game in one place, made for the small speaker of the Calliope mini 3 with GameKit.
- `main.ts`: The main program: start, game loop and buttons.

## How the game runs

1. At the start `texts.ts` unpacks the text catalog. Then `main.ts` sets up the sound (`initializeSound`) and loads the
   saved game (`loadGame`).
2. `startConfiguredIntro` plays the intro: the story, the studio card of the Calliope Hacker and the title. A or B skips
   it. Then `setScene` opens the title screen.
3. Every frame `drawCurrentScene` draws the active screen (`SceneId`): title, hangar, market, star map, status, flight.
4. Every game tick `game.onUpdate` calls `updateIntro`, `updateFlight`, `updateSoundscape` and `updateMenuRepeat`.
5. The buttons arrive in `handleDirection`, `handleA` and `handleB`. What they do depends on the active screen; in
   flight A fires the chosen weapon and B changes it.

The world map has 24 worlds that you can fly to (plus two hidden ones), and the markets trade 12 kinds of goods. The
campaign has 6 missions. The fixed data (worlds, goods, ships, missions) is in `data.ts`; the rules and the state of the
game are in `model.ts`.

## Texts and sound

All texts are in one packed catalog in `texts.ts`. The game asks for a text by its number, for example `Texts.t(247)`
for the word SHIPYARD. The quickest way to see which word belongs to a number is the simulator. The music and the sound
effects are made by `sound.ts` without the big music library, to save flash memory.

## Saving

`save.ts` writes the game into the settings of the Calliope: two automatic slots and one slot for saving by hand, each
with a checksum. The settings belong to this project name, so another game never reads them. If you load a different
program, MakeCode deletes the saved game the next time it starts.

## Building

- **In the browser:** Open arcade.makecode.com, choose "Import" and open the game file `orbit-trader.hex`. The whole
  source code is inside the game file. The simulator shows the game right away.
- **On your computer:** With the MakeCode command-line tool (npm package `makecode`), run `makecode build` in this
  folder. The game file for the device is then in `built/n3/binary.hex`.

## Putting it on the device

Plug the Calliope mini 3 into your computer with the USB cable. It shows up as a drive. Drag the game file (`.hex`) onto
that drive; the game then starts by itself. The GameKit screen has 160 × 120 pixels and 16 colors. The game is big and
uses almost all of the flash memory of the Calliope, so changes that add a lot of code may make the game file too large.

This game also exists in German, French and Spanish. All four versions are built from the same source project.