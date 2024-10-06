# Playdate Pulp Editor

This repo contains some of the code for the [Playdate Pulp](https://playdate-wiki.com/wiki/Pulp) editor with some modifications for offline use as a desktop app. Some features related creating and deleting projects won't work but you can still edit your project without any problems. [Powered by NW.js](https://nwjs.io/)

![screenshot](https://github.com/MintFerret/pulp-offline/blob/master/Capture.PNG?raw=true)

# Limitations
- ~**Saving doesn't work (you have to do it manually by exporting your JSON and overwriting it with `games/local/data`)**~
  Not anymore! You can now click on the save button as many times as you want (Still recommended to make backups, just in case)
- Only one game can be edited at once
- Creating and deleting games doesn't work
- Console cannot be used, for now, you'll have to download the [NW.js SDK](https://nwjs.io/downloads/), extract it, and move to `pulp` folder and `package.json` inside of that directory until I can find a way to allow devtools.

# Copyright

Credits goes to [Shaun Inman](https://devforum.play.date/u/shaun/) and the [Pulp team](https://play.date/pulp/team/)

Playdate is a registered trademark of Panic
