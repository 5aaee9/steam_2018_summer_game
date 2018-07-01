import Utils from './utils'
import Requests from './requests'
import * as config from 'config'

// get token from https://steamcommunity.com/saliengame/gettoken
// can add many user
const userList = config.get('token')

let singleton: boolean = false
if (userList.length === 1) {
    singleton = true
}

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
}

async function SteamGame(userToken: string) {
    let loggerName = `Saliens (${userToken})`
    if (singleton) {
        loggerName = `Saliens`
    }

    const logger = new Utils.Logger(Utils.Logger.LEVEL_INFO, loggerName)
    const requests = new Requests.SalienGame(userToken, logger)
    let times = 0

    while (true) {
        const bossPlanet = await requests.getBossPlanet()
        if (bossPlanet !== null) {
            logger.info('>> Boss room founded, joining')
            await requests.joinPlanetRequest(bossPlanet.id)
            const planetInfo = await this.getPlanetInfoRequest(bossPlanet.id)
            const zones = planetInfo.planets[0].zones
                .filter(item => !item.captured)
                .filter(item => item.type === 4)
            if (zones.length === 0) {
                continue
            }
            const zone = zones[0]
            await requests.joinBossZone(zone.id)
            let damage = await requests.sendBossDamage()
            while (!damage.game_over) {
                await Utils.Time.wait(5 * Utils.Time.Second)
                damage = await requests.sendBossDamage()
            }

            continue
        }

        times += 1
        const playerInfo = await requests.getPlayerInfoRequest()

        const planet = await requests.getPlanetInfoRequest(playerInfo.active_planet)

        if (times % 10 === 1) {
            await requests.leaveRequest()
            logger.info('>> Left Planet, Joining New One')
            await requests.selectPlanetRequest()
            continue
        }

        if (planet.planets === undefined) {
            await requests.selectPlanetRequest()
            continue
        }

        const zones = planet.planets[0].zones
            .filter(item => !item.captured && item.top_clans)

        if (zones.length === 0) {
            logger.error('   No Available Zone Found, Please Change Your Planet')
            continue
        }

        const zone = zones
            .reduce((best, thisZone) => {
                if (thisZone.difficulty > best.difficulty) {
                    return thisZone
                }
                return best
            })

        let post_score = 2400
        if (zone.difficulty === 1) {
            post_score = 585
        } else if (zone.difficulty === 2) {
            post_score = 1170
        }

        const scoreTable = [
          0,          // Level 1
          1200,       // Level 2
          2400,       // Level 3
          4800,       // Level 4
          12000,      // Level 5
          30000,      // Level 6
          72000,      // Level 7
          180000,     // Level 8
          450000,     // Level 9
          1200000,    // Level 10
          2400000,    // Level 11
          3600000,    // Level 12
          4800000,    // Level 13
          6000000,    // Level 14
          7200000,    // Level 15
          8400000,    // Level 16
          9600000,    // Level 17
          10800000,   // Level 18
          12000000,   // Level 19
          14600000,   // Level 20
          16800000,   // Level 21
        ]

        function getPercentage(current, goal) {
            const percentage = (Number(current) / Number(goal)) * 100
            return Math.round(percentage * 100) / 100
        }

        function timeConvert(mins) {
            const hours = (mins / 60)
            const rhours = Math.floor(hours)
            const minutes = (hours - rhours) * 60
            const rminutes = Math.round(minutes)
            return rhours + " hour(s) and " + rminutes + " minute(s)"
        }

        function getETA(current, goal, reward) {
            const remaining = (Number(goal) - Number(current)) / Number(reward)
            const time = remaining * 2
            return timeConvert(time)
        }

        logger.info(`>> User Level:          ${playerInfo.level}`)
        logger.info(`   Total Score:         ${playerInfo.score}`)
        logger.info(`   Level Progress:      ${Number(playerInfo.score) - Number(scoreTable[playerInfo.level - 1])} ` +
        `out of ${Number(playerInfo.next_level_score) - Number(scoreTable[playerInfo.level - 1])} for level ${playerInfo.level + 1} ` +
        `(${getPercentage(playerInfo.score, playerInfo.next_level_score)}%)`)
        logger.info(`   Until Next Level:    ${getETA(playerInfo.score, playerInfo.next_level_score, post_score)}`)
        logger.info(`   User Planet:         ${planet.planets[0].state.name}`)
        logger.info(`   Selected Zone:       ${zone.gameid}`)
        logger.info(`   Zone Reward Score:   ${post_score}`)
        logger.info(' ')

        const joinMessage = await requests.joinZoneRequest(zone.zone_position);
        if (joinMessage.score === null) {
            logger.error(`!! Server Rejected Request`)
            continue
        }
        const randomSecond = 115 + getRandomInt(0, 5)

        logger.info(`>> Joined Zone, Waiting ${randomSecond} Seconds Until Submitting Score`)
        await Utils.Time.wait(randomSecond * Utils.Time.Second)
        logger.info('>> Submitting Score')
        let retryTimes: number = 0

        while (retryTimes <= 5) {
            retryTimes += 1
            logger.info(`   Submitting Score (Retry ${retryTimes})`)
            const requestScore = await requests.postScoreRequest(post_score)

            if (requestScore.new_score === undefined) {
                logger.warn('   Received Undefined Response, Are There Multiple Instances Running?')
                await Utils.Time.wait((retryTimes * 2) * Utils.Time.Second)
            } else {
                logger.info(`   Submitted Score (Now ${requestScore.new_score})`)
                break
            }
        }
        logger.info(' ')
    }
}

function userThread(userId: string) {
    SteamGame(userId).catch(err => {
        console.log(err)
        userThread(userId)
    })
}

if (typeof userList === "string") {
    singleton = true
    userThread(userList)
} else {
    for (const user of userList) {
        userThread(user)
    }
}
