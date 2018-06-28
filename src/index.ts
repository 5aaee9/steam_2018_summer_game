import Utils from './utils'
import axios from 'axios'
import * as config from 'config'

// get token from https://steamcommunity.com/saliengame/gettoken
// can add many user
const userList = config.get('token')

const steamHost = 'https://community.steam-api.com'
const apiEndpoint = `${steamHost}/ITerritoryControlMinigameService`


let singleton: boolean = false
if (userList.length === 1) {
    singleton = true
}

async function selectPlanet(userToken: string, logger: Utils.Logger) {
    logger.info('   Selected Best Planet')
    // If No Planet Selected
    const getPlanetsRequetst = await axios.get(`${apiEndpoint}/GetPlanets/v0001/?active_only=1&language=english`)
    const getPlanets: {
        planets: Array<{
            giveaway_apps: Array<number>,
            id: string,
            state: {
                activation_time: number,
                active: boolean,
                capture_progress: number,
                captured: boolean,
                cloud_filename: string,
                current_players: number,
                difficulty: number,
                giveaway_id: string,
                image_filename: string,
                land_filename: string,
                map_filename: string,
                name: string,
                position: number,
                priority: number,
                tag_ids: string,
                total_joins: number,
            }
        }>
    } = getPlanetsRequetst.data.response

    const plane = getPlanets.planets.filter(item => item.state.active)
        .filter(item => !item.state.captured)
        .reduce((best, thisPlanet) => {
            if (best.state.capture_progress > thisPlanet.state.capture_progress) {
                return thisPlanet
            }
            return best
        })

    logger.info(`++ New Planet: ${plane.state.name}`)
    await axios.post(`${apiEndpoint}/JoinPlanet/v0001/`, `id=${plane.id}&access_token=${userToken}`)
    // Adding User To SteamCN Group
    await axios.post(`${apiEndpoint}/RepresentClan/v0001/`, `clanid=103582791429777370&access_token=${userToken}`)
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
    let times = 0
    while (true) {
        times += 1

        const playerInfoRequest = await axios.post(`${apiEndpoint}/GetPlayerInfo/v0001/`, `access_token=${userToken}`)
        const playerInfo: {
            active_planet: string,
            time_on_planet: number,
            active_zone_game: string,
            active_zone_position: string,
            score: string,
            level: number,
            next_level_score: string,
        } = playerInfoRequest.data.response

        const plantRequest = await axios.get(`${apiEndpoint}/GetPlanet/v0001/?id=${playerInfo.active_planet}&language=english`)
        let planet: {
            planets: Array<{
                id: string,
                state: {
                    name: string,
                },
                giveaway_apps: Array<any>,
                top_clans: Array<any>,
                zones: Array<{
                    zone_position: number,
                    leader: object,
                    type: number,
                    gameid: string,
                    difficulty: number,
                    captured: boolean,
                    capture_progress: number,
                    top_clans: Array<object>
                }>,
            }>
        } = plantRequest.data.response

        if (times % 10 === 1) {
            await axios.post(`${steamHost}/IMiniGameService/LeaveGame/v0001/`,
                `access_token=${userToken}&gameid=${playerInfo.active_planet}`)
            logger.info('>> Left Planet, Joining New One')
            await selectPlanet(userToken, logger)
            continue
        }

        if (planet.planets === undefined) {
            await selectPlanet(userToken, logger)
            continue
        }

        const zones = planet.planets[0].zones
            .filter(item => !item.captured)

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

        logger.info(`>> User Level:          ${playerInfo.level}`)
        var percentage = (Number(playerInfo.score) / Number(playerInfo.next_level_score)) * 100
        var percentageRounded = Math.round(percentage * 100) / 100
        logger.info(`   User Score:          ${playerInfo.score} out of ${playerInfo.next_level_score} (${percentageRounded}%)`)
        logger.info(`   User Planet:         ${planet.planets[0].state.name}`)
        logger.info(`   Selected Zone:       ${zone.gameid}`)
        logger.info(`   Zone Reward Score:   ${post_score}`)
        logger.info(' ')
        const joinRequest = await axios.post(`${apiEndpoint}/JoinZone/v0001/`,
            `zone_position=${zone.zone_position}&access_token=${userToken}`)
        const joinMessage: {
            active_planet: string|null,
            level: number|null,
            next_level_score : string|null,
            score : string|null,
            time_on_planet : number|null,
        } = joinRequest.data.response

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
            logger.info(`   Error Submitting Score (Retry ${retryTimes + 1})`)
            const requestScoreRequest = await axios.post(`${apiEndpoint}/ReportScore/v0001/`,
                `access_token=${userToken}&score=${post_score}&language=english`)

            const requestScore: {
                new_score: string,
            } = requestScoreRequest.data.response
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
