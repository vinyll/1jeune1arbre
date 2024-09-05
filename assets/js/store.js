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
  pois: [],
  modal: { title: "", body: "", visible: false }
}

const actions = {
  async loadPois() {
    const response = await api.query(gql`
      {
        farmyard {
          id
          title
          fakeLat
          fakeLong
          location
          description
          max_attendees
          department
          region
          availability
          start_date
          end_date
          contact_name
          contact_position
          phone
          email
          provider {
            id
            phone
            website
            position
            user {
              email
              first_name
              last_name
            }
          }
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
          logo {id}
          website
          phone
        }
      }
    `)
        this.state.partners = response.data.yard_providers
        return this.state.partners
    },

  async loadYardProvider(id) {
    const response = await api.query(
      gql`
        query GetYardProviderById($id: ID!) {
          yard_providers_by_id(id: $id) {
            id
            title
            logo {
              id
            }
            website
            phone
            user {
              email
            }
            departments_list
          }
        }
      `,
      { id }
    )

    // Récupération du nom du département depuis la liste des codes : [{ name: "Alpes-Maritimes", code: "06"}, { name: "Bouches-du-Rhône", code: "13"}]
    const provider = response.data.yard_providers_by_id
    const departments = await Promise.all((provider.departments_list || "")
      .split(",")
      .map((d) => d.trim())
      .map(async (code) => {
        const response = await fetch(
          `https://geo.api.gouv.fr/departements?code=${code}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        )
        try {
          const data = await response.json()
          const department = data[0]
          return department ? { name: department.nom, code: department.code } : {}
        } catch (e) {
          console.error(`Error fetching department ${code} for ${provider.title}: ${e}`)
        }
      })
    )

    this.state.partners = {
      ...provider,
      departments: departments.filter(d => d.name),
    }
    return this.state.partners
  },

  async saveSchoolDemand(values) {
    const response = await api.query(
      gql`
        mutation CreateSchoolDemand(
          $contact_name: String!
          $email: String!
          $city: String!
          $school_name: String!
          $department: String!
        ) {
          create_school_demand_item(
            data: {
              contact_name: $contact_name
              email: $email
              city: $city
              school_name: $school_name
              department: $department
            }
          )
        }
      `,
      values
    )
    return response.data.create_school_demand_item
  },

  async saveContactFarmyard(values) {
    const response = await api.query(
      gql`
        mutation CreateFarmyardContact(
          $farmyard: Int!
          $first_name: String!
          $last_name: String!
          $email: String
          $phone: String
          $subject: String!
          $body: String!
        ) {
          create_farmyard_contact_item(
            data: {
              farmyard: $farmyard
              first_name: $first_name
              last_name: $last_name
              email: $email
              phone: $phone
              subject: $subject
              body: $body
            }
          )
        }
      `,
      values
    );
    return response.data.create_farmyard_contact_item
  },
}

export default new LegoStore(state, actions)
