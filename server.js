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

/**
 * Fonction qui permet de recuperer tous les items en bypassant la limite imposee par directus
 */
const fetchAllFarmyards = async () => {
    const limit = 500 // Limite max par req (config directus par defaut)
    let offset = 0
    let allFarmyards = []
    let hasMoreData = true

    while (hasMoreData) {
      const chantiersResponse = await fetch(
        `https://admin.1jeune1arbre.fr/items/farmyard?filter[availability][_eq]=disponible&fields=id,title,contact_name,phone,email,zipcode,location&limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (!chantiersResponse.ok) {
        throw new Error("Issue when fetching farmyards")
      }

      const chantiersJson = await chantiersResponse.json()
      const chantiers = chantiersJson.data

      allFarmyards = allFarmyards.concat(chantiers)

      // Verifie si il reste des items a recuperer
      hasMoreData = chantiers.length === limit
      offset += limit
    }

    return allFarmyards
}

app.get("/contact-colleges", async (req, res) => {
  try {
    // Récupération des chantiers
    const chantiers = await fetchAllFarmyards()
    const distance = req.query.km || 15

    if (!chantiers || chantiers.length === 0) {
      return res.status(404).json({ error: "No farmyards found" })
    }

    const rows = []

    // Récupération des chantiers pour chaque collège
    for (const chantier of chantiers) {
      const { coordinates: [longitude, latitude] } = chantier.location
      const select = `nom_etablissement, mail, identifiant_de_l_etablissement`
      const geo = `within_distance(position, geom'POINT(${longitude} ${latitude})', ${distance}km)`
      const where = `statut_public_prive:"Public"`
      const refine = `type_etablissement:"Collège"`
      const collegeApiUrl = `\
        https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records?\
        select=${encodeURIComponent(select)}\
        &where=${encodeURIComponent(geo)}\
        &where=${encodeURIComponent(where)}\
        &refine=${encodeURIComponent(refine)}`.replace(/\s/g, "")
      try {
        const response = await fetch(collegeApiUrl)
        if (!response.ok) {
          throw new Error(`Erreur lors de la requête de recherche de collèges : ${response.statusText}`)
        }

        const data = await response.json()
        const nearbyColleges = data.results

        if (!nearbyColleges || nearbyColleges.length === 0) {
          console.info(`Aucun collège trouvé pour le chantier "${chantier.title}". code postal : ${chantier.zipcode}, latitude ${chantier.latitude} et longitude ${chantier.longitude}`)
        }

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
    const filename = `chantiers-colleges-${distance}km.xlsx`
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)

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
