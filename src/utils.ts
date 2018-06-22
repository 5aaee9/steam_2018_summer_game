import chalk from 'chalk'

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
                console.log(`[${chalk.blue('info')}][${this.prefix}][${new Date()}]: ${message}`)
            }
        }

        warn(message: string) {
            if (this.level === Logger.LEVEL_INFO || this.level === Logger.LEVEL_WARN) {
                console.warn(`[${chalk.yellow('warn')}][${this.prefix}][${new Date()}]: ${message}`)
            }
        }

        error(message: string) {
            console.error(`[${chalk.red('error')}][${this.prefix}][${new Date()}]: ${message}`)
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
