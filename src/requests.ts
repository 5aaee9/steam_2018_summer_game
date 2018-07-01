import axios from 'axios'
import Utils from './utils'

const steamHost = 'https://community.steam-api.com'
const apiEndpoint = `${steamHost}/ITerritoryControlMinigameService`

type Planet = {
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
}

type BossResponse = {
    boss_status: {
        boss_hp: number,
        boss_max_hp: number,
        boss_players: Array<object>
    },
    game_over: boolean,
    num_laser_uses: number,
    num_team_heals: number,
    waiting_for_players: boolean
}

namespace Requests {
    export class SalienGame {
        private token: string
        private logger: Utils.Logger
        private nextHeal: number = 0
        private waitForPlayer: boolean = true

        constructor(userToken: string, logger: Utils.Logger) {
            this.token = userToken
            this.logger = logger
        }

        async getPlanetsList() {
            const getPlanetsRequetst = await axios.get(`${apiEndpoint}/GetPlanets/v0001/?active_only=1&language=english`)
            const getPlanets: {
                planets: Array<Planet>
            } = getPlanetsRequetst.data.response
            return getPlanets
        }

        async getBossPlanet() {
            const getPlanets = await this.getPlanetsList()

            // select boss plant
            for (const planet of getPlanets.planets) {
                const planetInfo = await this.getPlanetInfoRequest(planet.id)
                const zones = planetInfo.planets[0].zones
                    .filter(item => !item.captured)

                for (const zone of zones) {
                    if (zone.type === 4) {
                        return planet
                    }
                }
            }
            return null
        }

        async joinPlanetRequest(planetId: string) {
            return await axios.post(`${apiEndpoint}/JoinPlanet/v0001/`,
                `id=${planetId}&access_token=${this.token}`)
        }

        async selectPlanetRequest(): Promise<Planet> {
            this.logger.info('   Selected Best Planet')
            const getPlanets = await this.getPlanetsList()

            const best = getPlanets.planets.filter(item => item.state.active)
                .filter(item => !item.state.captured)
                .reduce((best, thisPlanet) => {
                    if (best.state.capture_progress > thisPlanet.state.capture_progress) {
                        return thisPlanet
                    }
                    return best
                })

            this.logger.info(`++ New Planet: ${best.state.name}`)
            this.logger.info(`   Planet Id: ${best.id}`)
            this.logger.info(' ')
            await this.joinPlanetRequest(best.id)
            // Adding User To SteamCN Group
            await axios.post(`${apiEndpoint}/RepresentClan/v0001/`, `clanid=103582791429777370&access_token=${this.token}`)
            return best
        }

        async getPlayerInfoRequest() {
            const playerInfoRequest = await axios.post(`${apiEndpoint}/GetPlayerInfo/v0001/`, `access_token=${this.token}`)
            const playerInfo: {
                active_planet: string,
                time_on_planet: number,
                active_zone_game: string,
                active_zone_position: string,
                score: string,
                level: number,
                next_level_score: string,
            } = playerInfoRequest.data.response
            return playerInfo
        }

        async levaeRequest() {
            const playerInfo = await this.getPlayerInfoRequest()
            return axios.post(`${steamHost}/IMiniGameService/LeaveGame/v0001/`,
                    `access_token=${this.token}&gameid=${playerInfo.active_planet}`)
        }

        async getPlanetInfoRequest(planetId: string) {
            const planetRequest = await axios.get(`${apiEndpoint}/GetPlanet/v0001/?id=${planetId}&language=english`)
            const planet: {
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
            } = planetRequest.data.response
            return planet
        }

        async joinZoneRequest(zoneId: number) {
            const joinRequest = await axios.post(`${apiEndpoint}/JoinZone/v0001/`,
            `zone_position=${zoneId}&access_token=${this.token}`)
            const joinMessage: {
                active_planet: string|null,
                level: number|null,
                next_level_score : string|null,
                score : string|null,
                time_on_planet : number|null,
            } = joinRequest.data.response
            return joinMessage
        }

        async postScoreRequest(score: number) {
            const requestScoreRequest = await axios.post(`${apiEndpoint}/ReportScore/v0001/`,
                `access_token=${this.token}&score=${score}&language=english`)

            const requestScore: {
                new_score: string,
            } = requestScoreRequest.data.response
            return requestScore
        }

        async leaveRequest() {
            const playerInfo = await this.getPlayerInfoRequest()

            await axios.post(`${steamHost}/IMiniGameService/LeaveGame/v0001/`,
                `access_token=${this.token}&gameid=${playerInfo.active_planet}`)
        }

        async joinBossZone(zoneId: number, errorTimes: number = 0) {
            const joinRequest = await axios.post(`${apiEndpoint}/JoinBossZone/v0001/`,
                `access_token=${this.token}&zone_position=${zoneId}`)

            const joinResponse : {
                gameid: string,
                waiting_for_players: boolean,
                zone_info: {
                    boss_active: boolean,
                    capture_progress: number,
                    captured: boolean,
                    difficulty: number,
                    gameid: string,
                    leader: object,
                    top_clans: Array<object>,
                    type: number,
                    zone_position: number
                }
            } = joinRequest.data.response
            if (joinRequest.headers['eresult'] === 11 && errorTimes < 10) {
                this.logger.info('>> Join boss zone error, retrying')
                await this.joinBossZone(zoneId, errorTimes + 1)
            }
            this.logger.info('>> Joined BOSS zone')
            this.waitForPlayer = joinResponse.waiting_for_players
        }

        async sendBossDamage(): Promise<BossResponse> {
            const damageTaken = 0
            const damageToBoss = 1
            let useHeal = 0
            const now = Math.floor(new Date().getTime() / 1000)
            if (now > this.nextHeal) {
                useHeal = 1
                this.nextHeal = now + 120
                this.logger.info('>> Using heal ability')
            }
            const damageRequest = await axios.post(`${apiEndpoint}/ReportBossDamage/v0001/`,
                `access_token=${this.token}&use_heal_ability=${useHeal}&damage_to_boss=${damageToBoss}&damage_taken=${damageTaken}`)
            const damageResponse: BossResponse = damageRequest.data.response

            this.waitForPlayer = damageResponse.waiting_for_players
            this.logger.info(`>> Boss HP: ${damageResponse.boss_status.boss_hp} / ${damageResponse.boss_status.boss_max_hp}`)
            return damageResponse
        }
    }
}

export default Requests
