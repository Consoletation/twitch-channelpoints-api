# Channel Points API

## Install web-ext
Use `npm install --global web-ext` to get the web-ext helper
Modify your config variables inside package.json under "webExt"
Example:
```
  "webExt": {
    "verbose": true,
    "run": {
      "firefoxProfile": "C:/path/to/Mozilla/Firefox/Profiles/profileFolderName",
      "startUrl": [
        "https://www.twitch.tv/popout/your_channel/reward-queue"
      ]
    }
  },
```
Use `web-ext run` in a terminal within the root folder of the project to launch the extension

## NPM
Make sure to run `npm install` to get dev dependancies

## Code Style
Using VSCode install the ESLint and Prettier(optional) plugin
Set ESLint to lint on save
Linting rules are extended from Standard.js (https://standardjs.com/)
