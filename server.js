import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import multer from "multer"
import xlsx from "xlsx"

const app = express()
const PORT = process.env.PORT || 3000
const INDEX_FILE = "index.html"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const upload = multer({ storage: multer.memoryStorage() })

const DIRECTUS_ADMIN_TOKEN = "B41pSo3f6xHytOAlY5FtvQcjlb9h0_75" // TODO: regenerer ce token sur le profile d'un super admin pour la prod

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
    const userResponse = await fetch(`http://127.0.0.1:8055/users?filter[email][_eq]=${email}`, {
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
      `http://127.0.0.1:8055/items/yard_providers?filter[user][_eq]=${user.data[0].id}`,

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
    const rows = sheetData.slice(2) // On skip les deux premières lignes (headers + titres)

    /**
     * Fonction qui permet de faire le formattage directus pour les dates
     *  (excel n'enregistre pas les dates commes elles sont ecrites dans le sheet)
     */
    function serialToDate(serial) {
      if (!serial) return ""
      const excelEpoch = new Date(1899, 11, 30) // Excel epoch starts from Dec 30, 1899
      const days = Math.floor(serial)
      const date = new Date(excelEpoch.getTime() + days * 86400000)
      console.log("date: ", date)
      return date.toISOString().split("T")[0] // Convertir en "yyyy-mm-dd"
    }

    // Construction des chantiers pedagogiques
    const farmyards = rows.map((row) => {
      const rowObject = {}
      headers.forEach((header, index) => {
        rowObject[header] = row[index]
      })

      return {
        data: {
          status: rowObject["Etat"] || "draft",
          title: rowObject["Titre de l'activité"] || "",
          category: (rowObject["Catégorie"] || "").trim(),
          description: rowObject["Description de l'activité proposée"] || "",
          start_date: serialToDate(rowObject["Date de début de disponibilité"]) || null,
          end_date: serialToDate(rowObject["Date de fin de disponibilité"]) || null,
          max_attendees: rowObject["Nombre maximum d'élèves"] || null,
          contact_name: rowObject["Nom du référent"] || "",
          contact_position: rowObject["Rôle du référent"] || "",
          phone: rowObject["Téléphone du référent"] || "",
          email: rowObject["Email du référent"] || "",
          zipcode: rowObject["Code postal"] || "undefined",
          city: rowObject["Commune "] || "undefined", //TODO: attention, il faut l'espace pour commune car c'est dans le template excel, sinon ca marche pas
          bus_parking: rowObject["Accessible en bus ?"] === "OUI",
          walkable: rowObject["Accessible à pied ?"] === "OUI",
          type: "plantation",
          location: {
            type: "Point",
            coordinates: [0, 0], // TODO: logique de récupération des coordonnées
          },
        },
      }
    })

    // Televerser les chantiers pédagogiques en les liant au provider
    farmyards.forEach(async (yard) => {
      await fetch(
        "http://127.0.0.1:8055/items/farmyard" /*TODO: remplacer avec: "https://admin.1jeune1arbre.fr/items/farmyard"*/,
        {
          method: "POST",
          body: JSON.stringify({ ...yard.data, provider: provider.data[0].id }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
          },
        },
      )
    })

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
