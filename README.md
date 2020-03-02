# Better Points

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

## NPM
Make sure to run `npm install` to get dev dependencies

## Dev
Use `npm run dev` to run the rollup build script and watch for changes
web-ext will also run and launch a browser instance from your profile
Unfortunately web-ext does not properly reload the extension when changes are made so you must refresh the page

## Code Style
Using VSCode install the ESLint and Prettier(optional) plugin
Set ESLint to lint on save
Linting rules are extended from Standard.js (https://standardjs.com/)
