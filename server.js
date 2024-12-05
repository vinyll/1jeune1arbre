import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import multer from "multer"
import xlsx from "xlsx"
import pLimit from "p-limit"

const app = express()
const PORT = process.env.PORT || 3000
const INDEX_FILE = "index.html"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const upload = multer({ storage: multer.memoryStorage() })
const limit = pLimit(5)

const DIRECTUS_ADMIN_TOKEN = "u15h6aQ6o_4KfSF1gz3nGxl2ZvEN1A9u" // TODO: regenerer ce token sur le profile d'un super admin pour la prod

app.post("/upload-farmyards", upload.single("sheet"), async (req, res) => {
  try {
    // verifications des inputs
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }
    const email = req.body.email
    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    // check si l'utilisateur existe
    const userResponse = await fetch(`https://admin.1jeune1arbre.fr/users?filter[email][_eq]=${email}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
    })
    if (!userResponse) {
      return res.status(404).json({ error: "User not found" })
    }
    const user = await userResponse.json()

    // check si le user a un profil de pourvoyeur
    const providerResponse = await fetch(
      `https://admin.1jeune1arbre.fr/items/yard_providers?filter[user][_eq]=${user.data[0].id}`,

      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    )
    if (!providerResponse) {
      return res.status(404).json({ error: "User is not a provider." })
    }
    let provider
    if (providerResponse.ok) {
      provider = await providerResponse.json()

      if (provider.data.length === 0) {
        return res.status(404).json({ error: "No provider found with this email" })
      } else {
        console.log("Provider found:", provider.data)
      }
    } else {
      console.error("Error fetching provider data:", providerResponse.statusText)
      return res.status(500).json({ error: "Error fetching provider data" })
    }

    // parsing des données excel
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    })
    const headers = sheetData[1]
    const extractedRows = sheetData.slice(2) // On skip les deux premières lignes (headers + titres)
    const rows = extractedRows.filter((row) => row.length > 0)

    /**
     * Fonction qui permet de faire le formattage directus pour les dates
     *  (excel n'enregistre pas les dates commes elles sont ecrites dans le sheet)
     */
    function serialToDate(serial) {
      if (!serial) return ""
      const excelEpoch = new Date(1899, 11, 30) // Excel epoch starts from Dec 30, 1899
      const days = Math.floor(serial)
      const date = new Date(excelEpoch.getTime() + days * 86400000)
      return date.toISOString().split("T")[0] // Convertir en "yyyy-mm-dd"
    }

    async function fetchCoordinates(city, department) {
      const apiUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(city)}&code=${department}&limit=1`
      try {
        const response = await fetch(apiUrl)
        const data = await response.json()

        if (data.features && data.features.length > 0) {
          return data.features[0].geometry.coordinates
        } else {
          console.warn(`No coordinates found for city: ${city}, department: ${department}`)
          return [0, 0]
        }
      } catch (error) {
        console.error(`Error fetching coordinates for city: ${city}, department: ${department}`, error)
        return [0, 0]
      }
    }

    // Construction des chantiers pedagogiques
    const farmyards = await Promise.all(
      rows.map((row) =>
        limit(async () => {
          const rowObject = {}
          headers.forEach((header, index) => {
            rowObject[header] = row[index]
          })

          const city = rowObject["Commune "] || "undefined" // espace en plus dans l'excel, trim toutes les clefs?
          const department = rowObject["Code postal"] || "undefined" // dans le excel, code postal est en fait le département

          let coordinates = [0, 0]
          try {
            coordinates = await fetchCoordinates(city, department)
          } catch (error) {
            console.warn("Failed to fetch coordinates, using default [0, 0].")
          }

          return {
            data: {
              status: rowObject["Etat"] || "draft",
              title: rowObject["Titre de l'activité"] || "",
              category: (rowObject["Catégorie"] || "").trim(),
              description: rowObject["Description de l'activité proposée "] || "",
              start_date: serialToDate(rowObject["Date de début de disponibilité"]) || null,
              end_date: serialToDate(rowObject["Date de fin de disponibilité"]) || null,
              max_attendees: rowObject["Nombre maximum d'élèves"] || null,
              contact_name: rowObject["Nom du référent"] || "",
              contact_position: rowObject["Rôle du référent"] || "",
              phone: rowObject["Téléphone du référent"] || "",
              email: rowObject["Email du référent"] || "",
              city,
              bus_parking: rowObject["Accessible en bus ?"] === "OUI",
              walkable: rowObject["Accessible à pied ?"] === "OUI",
              type: "plantation",
              location: {
                type: "Point",
                coordinates,
              },
            },
          }
        }),
      ),
    )

    // Televerser les chantiers pédagogiques en les liant au provider
    farmyards.forEach(async (yard) => {
      await fetch("https://admin.1jeune1arbre.fr/items/farmyard" /*TODO: changer en local pour test*/, {
        method: "POST",
        body: JSON.stringify({ ...yard.data, provider: provider.data[0].id }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
        },
      })
    })
    console.log("rows", rows.slice(-40, -1))
    res.status(200).json({ message: "Farmyards processed successfully", farmyards })
  } catch (error) {
    console.error("Error processing file:", error)
    res.status(500).json({ error: "An error occurred while processing the file" })
  }
})

app.use(express.static(path.join(__dirname)))

// Forward any other URI to index.html
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, INDEX_FILE))
})

app.listen(PORT, () => {
  console.info(`Server running at http://localhost:${PORT}`)
})
