import * as event from 'events'

const events = {
    LogEvent: Symbol(),
}

export default new event.EventEmitter()
export { events }
