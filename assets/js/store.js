import { LegoStore } from "/node_modules/@polight/store/dist/store.min.js"

import {
  Client,
  gql,
  cacheExchange,
  fetchExchange,
} from "https://cdn.jsdelivr.net/npm/urql@4.1.0/+esm"

const api = new Client({
  url: "https://admin.1jeune1arbre.fr/graphql",
  exchanges: [cacheExchange, fetchExchange],
})

const state = {
  pois: []
}

const actions = {
  async loadPois() {
    const response = await api.query(gql`
      {
        pois {
          title
          latitude
          longitude
        }
      }
    `)
    this.state.pois = response.data.pois
    return this.state.pois
  },
}

export default new LegoStore(state, actions)
