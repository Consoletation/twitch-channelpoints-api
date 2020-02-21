const commandPresets = {
    SetCurrentScene: {
        prettyName: 'Change to scene',
        configPropertyName: 'scene-name',
        configPropertySafeName: 'sceneName',
    },
    Wait: {
        prettyName: 'Pause (ms)',
        configPropertyName: 'timeInMs',
        configPropertySafeName: 'timeInMs',
    },
}

export class Command {
    constructor(attributes) {
        console.log('new command')
        this.function = attributes.function
        this.prettyName = commandPresets[this.function].prettyName
        this.config = {
            [commandPresets[this.function].configPropertyName]:
                attributes.configValue,
            [commandPresets[this.function].configPropertySafeName]:
                attributes.configValue,
        }
    }
}
