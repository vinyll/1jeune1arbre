import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import { Readable } from "stream"
import * as XLSX from "xlsx"

const app = express()
const PORT = process.env.PORT || 3000
const INDEX_FILE = "index.html"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname)))

app.get("/contact-farmyards", async (req, res) => {
  try {
    // Récupération des chantiers
    const chantiersResponse = await fetch(
      /*"http://127.0.0.1:8055*/ "https://admin.1jeune1arbre.fr/items/farmyard?filter[availability][_eq]=disponible&fields=id,title,contact_name,phone,email,zipcode,location",
      {
        //TODO: implementer les vars d'env
        method: "GET",
        headers: {
          // Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    )
    if (!chantiersResponse.ok) {
      return res.status(500).json({ error: "Issue when fetching farmyards" })
    }

    const chantiersJson = await chantiersResponse.json()
    const chantiers = chantiersJson.data

    console.log("chantiers", JSON.stringify(chantiers))
    if (!chantiers || chantiers.length === 0) {
      return res.status(404).json({ error: "No farmyards found" })
    }

    const rows = []

    // Récupération des chantiers pour chaque collège
    for (const chantier of chantiers) {
      const { coordinates } = chantier.location
      const latitude = coordinates[1]
      const longitude = coordinates[0]

      const collegeApiUrl = `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records?select=nom_etablissement%2C%20mail%2C%20identifiant_de_l_etablissement&where=within_distance(position%2C%20geom%27POINT(${longitude}%20${latitude})%27%2C%2020km)&refine=type_etablissement%3A%22Coll%C3%A8ge%22`
      try {
        const response = await fetch(collegeApiUrl)
        if (!response.ok) {
          throw new Error(`Erreur lors de la requête de recherche de collèges : ${response.statusText}`)
        }

        const data = await response.json()
        const nearbyColleges = data.results

        for (const college of nearbyColleges) {
          rows.push({
            chantier_id: chantier.id,
            chantier_directus: `https://admin.1jeune1arbre.fr/items/farmyard/${chantier.id}`,
            chantier_gmaps: `https://www.google.com/maps?q=${latitude},${longitude}`,
            chantier_titre: chantier.title,
            chantier_nom_contact: chantier.contact_name,
            chantier_tel: chantier.phone,
            chantier_email: chantier.email,
            chantier_cp: chantier.zipcode,
            college_id: college.identifiant_de_l_etablissement,
            college_nom: college.nom_etablissement,
            college_mail: college.mail,
          })
        }
      } catch (error) {
        console.error(
          `Erreur lors de la récupération des collèges pour le chantier "${chantier.title}":`,
          error.message,
        )
      }
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "No nearby colleges found" })
    }

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, "Farmyards")

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", 'attachment; filename="results.xlsx"')

    const stream = Readable.from(buffer)
    stream.pipe(res)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Error " + e.message })
  }
})


// Forward any other URI to index.html
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, INDEX_FILE))
})



app.listen(PORT, () => {
  console.info(`Server running at http://localhost:${PORT}`)
})
