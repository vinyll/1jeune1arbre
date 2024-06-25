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
        farmyard {
          title
          latitude
          longitude
          description
          max_attendees
          logo
          start_date
          end_date
          contact_name
          phone
          email
          website
          region
          department
        }
      }
    `)
    this.state.pois = response.data.farmyard
    return this.state.pois
  },

  async loadPartners() {
    const response = await api.query(gql`
      {
        yard_providers {
          id
          title
          logo
          website
        }
      }
    `)
    this.state.partners = response.data.yard_providers
    return this.state.partners
  },
}

export default new LegoStore(state, actions)
