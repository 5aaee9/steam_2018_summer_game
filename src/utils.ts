import chalk from 'chalk'
import event, { events } from './event'

namespace Utils {
    export class Logger {
        static LEVEL_INFO = Symbol('info')
        static LEVEL_WARN = Symbol('warn')
        static LEVEL_ERROR = Symbol('error')

        level: Symbol
        prefix: string

        constructor(level: Symbol = Logger.LEVEL_INFO, prefix: string = "application") {
            this.level = level
            this.prefix = prefix
        }

        info(message: string) {
            if (this.level === Logger.LEVEL_INFO) {
                this.sendMessage(message, Logger.LEVEL_INFO)
            }
        }

        warn(message: string) {
            if (this.level === Logger.LEVEL_INFO || this.level === Logger.LEVEL_WARN) {
                this.sendMessage(message, Logger.LEVEL_WARN)
            }
        }

        error(message: string) {
            this.sendMessage(message, Logger.LEVEL_ERROR)
        }

        private sendMessage(message: string, level: Symbol) {
            let name = chalk.blue('info')
            let noColor = 'info'
            let out = console.log
            switch (level) {
                case Logger.LEVEL_WARN: {
                    out = console.warn
                    name = chalk.yellow('warn')
                    noColor = 'warn'
                    break
                }
                case Logger.LEVEL_ERROR: {
                    out = console.error
                    name = chalk.red('error')
                    noColor = 'error'
                    break
                }
            }

            const newMessage = `[${name}][${this.prefix}][${new Date()}]: ${message}`
            event.emit(events.LogEvent, `[${noColor}][${this.prefix}][${new Date()}]: ${message}`)
            out(newMessage)
        }
    }

    export class Time {
        static Second = 1000
        static Minute = Time.Second * 60

        static async wait(time: number) {
            return new Promise((res, rej) => {
                setTimeout(res, time)
            })
        }
    }
}

export default Utils
