export const COMMAND_PRESETS = {
    SetCurrentScene: {
        functionName: 'SetCurrentScene',
        prettyName: 'Change to scene',
        actions: [
            {
                name: 'Scene Name',
                property: 'scene-name',
                propertySafe: 'sceneName',
                type: 'text',
            },
        ],
    },
    Wait: {
        functionName: 'Wait',
        prettyName: 'Pause (ms)',
        actions: [
            {
                name: 'Time (ms)',
                property: 'timeInMs',
                propertySafe: 'timeInMs',
                type: 'number',
            },
        ],
    },
    SetSourceVisibility: {
        functionName: 'SetSourceVisibility',
        prettyName: 'Set Source Visibility',
        actions: [
            {
                name: 'Source Name',
                property: 'item',
                type: 'text',
            },
            {
                name: 'Visibility',
                property: 'visibility',
                type: 'checkbox',
                value: 'true'
            },
        ],
    },
}

export class Command {
    constructor(attributes) {
        this.functionName = attributes.functionName
        const preset = COMMAND_PRESETS[this.functionName]
        this.config = {}
        this.prettyName = preset.prettyName
        attributes.config.forEach(configElement => {
            this.config[configElement.name] = configElement.value
        });
    }
}
