# Orbit Trader

Hi! This is **Orbit Trader**, a game by **Calliope Hacker** for the **Calliope mini 3 with GameKit**.

You are a space trader. Fly from world to world, buy goods where they are cheap and sell them where they are expensive.
Take on missions, upgrade your ship, get past pirates, pull in rescue pods and help to build the trade network again.
There are 24 worlds and 12 kinds of goods to discover. The Calliope Hacker is there too: look for the desk with the
screen on the walkway in the hangar.

## How to play

- **In the menus:** D-pad = choose, A = OK, B = back
- **In the intro:** A or B skips it
- **On the first delivery:** B in the hangar asks whether you want to skip the training
- **In the cockpit:** D-pad = move the aim cursor, A = fire the chosen weapon (laser, missile, mine)
- **In the cockpit, near a rescue pod:** hold A to pull it in with the tractor beam
- **In the cockpit, press B briefly:** change the weapon
- **In the cockpit, hold B:** dodge; hold it for a long time = escape (costs 1 fuel)

## Change the game yourself

The whole source code is inside this game file. Open it in MakeCode Arcade (arcade.makecode.com, "Import"). If the
editor asks for the hardware when you download, choose "Calliope GameKit Shield". Change a number, start the simulator
and see what happens:

- **More money at the start:** In `model.ts`, function `newGame`, you will find `credits = 500`. With `5000` you can buy
  several upgrades at the shipyard right away.
- **Your own names for the worlds:** In `data.ts`, `WORLD_NAMES` holds the names of the worlds, for example `"LUMA"`.
  Give them your own names, but short ones (almost all names in the game have four letters); a long name may not fit
  on the line.
- **A stronger laser:** In `model.ts`, function `laserDamage`, you will find `1 + upgrades[UP_LASER]`. With `3 + ...`
  your laser hits three times as hard right from the start.

An explanation of the source code for kids, parents and teachers is on calliope-hacker.de.