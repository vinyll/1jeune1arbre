import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import { Readable } from "stream"
import { format } from "fast-csv"

const app = express()
const PORT = process.env.PORT || 3000
const INDEX_FILE = "index.html"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname)))

//TODO: Changer / adapter la requete api pour récupérer les "collèges" car actuellement on récupère tous les établissements et on filtre de manière textuelle
app.get("/contact-farmyards", async (req, res) => {
  try {
    // Récupération des chantiers
    const chantiersResponse = await fetch("https://admin.1jeune1arbre.fr/items/farmyard", {
      method: "GET",
      headers: {
        // Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!chantiersResponse.ok) {
      return res.status(500).json({ error: "Issue when fetching farmyards" })
    }

    const chantiersJson = await chantiersResponse.json()
    const chantiers = chantiersJson.data

    if (!chantiers || chantiers.length === 0) {
      return res.status(404).json({ error: "No farmyards found" })
    }

    const rows = []

    // Récupération des chantiers pour chaque collège
    for (const chantier of chantiers) {
      console.log("iteration " + chantier.id.toString())
      const { coordinates } = chantier.location
      const latitude = coordinates[1]
      const longitude = coordinates[0]

      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="school"](around:20000,${latitude},${longitude});out;`

      try {
        const response = await fetch(overpassUrl)
        if (!response.ok) {
          throw new Error(`Erreur lors de la requête Overpass API : ${response.statusText}`)
        }

        const data = await response.json()
        const nearbyColleges = data.elements

        for (const college of nearbyColleges) {
          console.log("college ", JSON.stringify(college))
          const distance = calculateDistance(latitude, longitude, college.lat, college.lon)
          if (distance <= 20 && college.tags.name && college.tags.name.includes("Collège")) {
            rows.push({
              chantier_id: chantier.id,
              chantier_title: chantier.title,
              chantier_lat: latitude,
              chantier_lon: longitude,
              college_nom: college.tags.name || "Nom inconnu",
              college_lat: college.lat,
              college_lon: college.lon,
              distance: distance.toFixed(2),
            })
          }
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

    // Configuration de la réponse CSV
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", 'attachment; filename="results.csv"')

    // Générer le CSV et le renvoyer directement
    const csvStream = format({ headers: true })
    const stream = Readable.from(rows)
    stream.pipe(csvStream).pipe(res)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Error " + e.message })
  }
})

// Fonction pour calculer la distance géodésique
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Rayon de la Terre en km
  const toRadians = (degrees) => (degrees * Math.PI) / 180

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance en km
}

// Forward any other URI to index.html
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, INDEX_FILE))
})



app.listen(PORT, () => {
  console.info(`Server running at http://localhost:${PORT}`)
})
