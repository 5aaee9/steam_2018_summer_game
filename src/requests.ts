import axios from 'axios'
import Utils from './utils'

const steamHost = 'https://community.steam-api.com'
const apiEndpoint = `${steamHost}/ITerritoryControlMinigameService`

namespace Requests {
    export class SalienGame {
        private token: string
        private logger: Utils.Logger

        constructor(userToken: string, logger: Utils.Logger) {
            this.token = userToken
            this.logger = logger
        }

        async selectPlanetRequest() {
            this.logger.info('   Selected Best Planet')
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

            this.logger.info(`++ New Planet: ${plane.state.name}`)
            this.logger.info(`   Planet Id: ${plane.id}`)
            this.logger.info(' ')
            await axios.post(`${apiEndpoint}/JoinPlanet/v0001/`, `id=${plane.id}&access_token=${this.token}`)
            // Adding User To SteamCN Group
            await axios.post(`${apiEndpoint}/RepresentClan/v0001/`, `clanid=103582791429777370&access_token=${this.token}`)
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
    }
}

export default Requests
