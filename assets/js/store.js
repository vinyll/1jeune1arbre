import { LegoStore } from "/node_modules/@polight/store/dist/store.min.js"

import { Client, gql, cacheExchange, fetchExchange } from "https://cdn.jsdelivr.net/npm/urql@4.1.0/+esm"

const api = new Client({
  url: "https://admin.1jeune1arbre.fr/graphql",
  exchanges: [cacheExchange, fetchExchange],
})

const state = {
  pois: [],
  modal: { title: "", body: "", visible: false },
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
          category
          walkable
          bus_parking
          provider {
            id
            phone
            website
            position
            organisation {
              name
            }
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
    return this.actions.loadOrganisations()
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
      { id },
    )

    // Récupération du nom du département depuis la liste des codes : [{ name: "Alpes-Maritimes", code: "06"}, { name: "Bouches-du-Rhône", code: "13"}]
    const provider = response.data.yard_providers_by_id
    const departments = await Promise.all(
      (provider.departments_list || "")
        .split(",")
        .map((d) => d.trim())
        .map(async (code) => {
          const response = await fetch(`https://geo.api.gouv.fr/departements?code=${code}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })
          try {
            const data = await response.json()
            const department = data[0]
            return department ? { name: department.nom, code: department.code } : {}
          } catch (e) {
            console.error(`Error fetching department ${code} for ${provider.title}: ${e}`)
          }
        }),
    )

    this.state.partners = {
      ...provider,
      departments: departments.filter((d) => d.name),
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
      values,
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
      values,
    )
    return response.data.create_farmyard_contact_item
  },

  // TODO: passer en graphql?
  async saveYardProvider(body) {
    delete body.userInfo
    // Création des chantiers avec sauvegarde des ids pour relation M2O
    const farmyardIds = []

    for (const yard of body.farmyards) {
      const url = "https://admin.1jeune1arbre.fr/items/farmyard"
      const headers = {
        "Content-Type": "application/json",
      }

      try {
        delete yard.id
        const response = await fetch(url, {
          headers,
          method: "POST",
          body: JSON.stringify(yard),
        })

        if (!response.ok) {
          console.log(response)
          throw new Error("Network response was not ok " + response.statusText)
        }

        const data = await response.json()
        if (!data) {
          throw new Error("Unable to create yard")
        }

        farmyardIds.push(data.data.id)
      } catch (error) {
        console.error("Error creating yard:", error)
      }
    }

    // création du pourvoyeur (avec relation chantiers)
    const url = "https://admin.1jeune1arbre.fr/items/yard_providers"
    const headers = {
      "Content-Type": "application/json",
    }

    try {
      const response = await fetch(url, {
        headers,
        method: "POST",
        body: JSON.stringify({ ...body, farmyards: farmyardIds }),
      })

      if (!response.ok) {
        console.log(response)
        throw new Error("Network response was not ok " + response.statusText)
      }
      const { data } = await response.json()

      return { wasYardProviderUploaded: true, id: data.id }
    } catch (error) {
      console.error("There was a problem posting data:", error)
    }
  },
  async loadOrganisations() {
    const response = await api.query(gql`
      {
        yard_organisation {
          id
          date_created
          name
          website
          logo {
            id
          }
        }
      }
    `)

    this.state.yard_organisations = response.data.yard_organisation
    return this.state.yard_organisations
  },
  async saveProviderUser(user, id) {
    const url = "https://admin.1jeune1arbre.fr/users"
    const headers = {
      "Content-Type": "application/json",
    }
    try {
      const response = await fetch(url, {
        headers,
        method: "POST",
        body: JSON.stringify({ ...user, yard_providers: [id] }),
      })

      if (!response.ok) {
        console.log(response)
        throw new Error("Network response was not ok " + response.statusText)
      }
      return true
      // l'endpoint ne renvoit aucune donnée de création
    } catch (error) {
      console.error(error)
    }
  },
}

export default new LegoStore(state, actions)
