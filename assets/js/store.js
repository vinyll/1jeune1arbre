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
          latitude
          longitude
          description
          max_attendees
          department
          region
          availability
          logo {
            id
          }
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
            logo {
              id
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

    //TODO: export to utility file?
    // transform departments_list as such: "06,13" --> [{ name: "Alpes-Maritimes", code: "06"}, { name: "Bouches-du-Rhône", code: "13"}]
    let departements;
    let currentProviderTitle = response.data.yard_providers_by_id.title;
    if (response.data.yard_providers_by_id.departments_list) {
      // string --> array of codes as strings
      const departmentsList =
        response.data.yard_providers_by_id.departments_list;
      const noSpaceDepartmentsList = departmentsList.replace(/\s+/g, ""); // remove extra spaces as they were causing issues with api
      const departementCodes = noSpaceDepartmentsList.split(",");

      // fetching department names
      try {
        const departmentPromises = departementCodes.map((code) =>
          fetch(`https://geo.api.gouv.fr/departements?code=${code}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })
        );
        const responses = await Promise.all(departmentPromises);
        departements = await Promise.all(
          responses.map(async (response) => {
            const dataArray = await response.json();
            if (dataArray.length === 0) {
              console.error(
                `Error fetching department in position ${responses.indexOf(
                  response
                )} of ${currentProviderTitle}`
              );
              return { name: "notFound", code: "notFound" };
            }

            const data = dataArray[0];
            return {
              name: data.nom,
              code: data.code,
            };
          })
        );
      } catch (error) {
        console.error("Error fetching department data:", error);
        departements = [];
      }
    }

    // setting partners state with department data
    this.state.partners = {
      ...response.data.yard_providers_by_id,
      departments_list: departements,
    };
    return this.state.partners;
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
