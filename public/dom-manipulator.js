$().ready(() => {
    log('Channel Points DOM Manipulator Loaded.')
    $('.reward-queue-body').prepend('hello')
})

function log() {
    const prefix = '[ctPoints]'
    const args = Array.prototype.slice.call(arguments)
    args.unshift('%c' + prefix, 'background: #222; color: #bada55')
    console.log.apply(console, args)
}
