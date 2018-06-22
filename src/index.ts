import Utils from './utils'
import axios from 'axios'

// get token from https://steamcommunity.com/saliengame/gettoken
// can add many user
const userList = [
    'YOUR_TOKEN',
]

const apiEndpoint = 'https://community.steam-api.com/ITerritoryControlMinigameService'

async function SteamGame(userToken: string) {
    const logger = new Utils.Logger(Utils.Logger.LEVEL_INFO, `steam_2018_summer_game (${userToken})`)
    while (true) {
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

        const plantRequest = await axios.get(`${apiEndpoint}/GetPlanet/v0001/?id=${playerInfo.active_planet}&language=schinese`)
        const plant: {
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

        const zones = plant.planets[0].zones
            .filter(item => !item.captured)

        if (zones.length === 0) {
            logger.error('No available zone founded, please change your plant')
            continue
        }

        const zone = zones
            .reduce((best, thisZone) => {
                if (thisZone.difficulty > best.difficulty) {
                    return thisZone
                }
                return best
            })

        let post_score = 2320
        if (zone.difficulty === 1) {
            post_score = 585
        } else if (zone.difficulty === 2) {
            post_score = 1170
        }

        logger.info('===========================')
        logger.info(`user level: ${playerInfo.level}`)
        logger.info(`exp: ${playerInfo.score} / ${playerInfo.next_level_score}`)
        logger.info(`user at: ${plant.planets[0].state.name}`)
        logger.info(`select zone => ${zone.gameid}`)
        logger.info(`zone score => ${post_score}`)
        logger.info('===========================')
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
            logger.error(`server rejected request!`)
            continue
        }
        logger.info('joined zone, wait 120s to send score')
        await Utils.Time.wait(120 * Utils.Time.Second)
        logger.info('submit score')
        const requestScoreRequest = await axios.post(`${apiEndpoint}/ReportScore/v0001/`,
            `access_token=${userToken}&score=${post_score}&language=schinese`)

        const requestScore: {
            new_score: string,
        } = requestScoreRequest.data.response
        logger.info(`submit success, new => ${requestScore.new_score}`)
        logger.info('===========================')
    }
}

function userThread(userId: string) {
    SteamGame(userId).catch(err => {
        console.log(err)
        userThread(userId)
    })
}

for (const user of userList) {
    userThread(user)
}
