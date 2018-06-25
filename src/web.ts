import * as koa from 'koa'
import * as logger from 'koa-logger'
import * as http  from 'http'
import * as io from 'socket.io'
import * as util from 'util'
import * as fs from 'fs'
import * as auth from 'socketio-auth'
import * as config from 'config'
import './index'

const readFile = util.promisify(fs.readFile)

let HTML_TEMPALTE: null|string = null

import event, { events } from './event'

const app = new koa()
const server = new http.Server(app.callback())
const ioApp = io(server)

auth(ioApp, {
    authenticate: (socket, data: {username: string, password: string}, callback) => {
        return callback(null, data.password === config.get('webPass'))
    }
})

ioApp.on('connection', socket => {
    event.on(events.LogEvent, message => {
        socket.emit('log', message)
    })
})

app.use(logger())

app.use(async ctx => {
    if (HTML_TEMPALTE === null) {
        HTML_TEMPALTE = (await readFile('index.html')).toString()
    }

    ctx.response.body = HTML_TEMPALTE
})

const port = process.env.PORT || 3000

server.listen(port)
console.log(`App is started at port ${port}`)
