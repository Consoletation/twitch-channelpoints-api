const prefix = '[BetterPoints]'

export function log() {
    const args = Array.prototype.slice.call(arguments)
    args.unshift('%c' + prefix, 'background: #222; color: #bada55')
    console.log.apply(console, args)
}
