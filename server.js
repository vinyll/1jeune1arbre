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

app.post("/upload-farmyards", upload.single("sheet"), (req, res) => {
  try {
    // Ensure a file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    // Read the file buffer using XLSX
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" })

    // Assume the data is in the first sheet
    const sheetName = workbook.SheetNames[0]

    // Use sheet_to_json with the `range` option to skip the first line
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1, // Read raw rows as an array of arrays
    })

    // Extract the actual header row (second row)
    const headers = sheetData[1]
    const rows = sheetData.slice(2) // Skip the first two rows (titles + headers)

    // Map the rows to objects using the extracted headers
    const farmyards = rows.map((row) => {
      const rowObject = {}
      headers.forEach((header, index) => {
        rowObject[header] = row[index]
      })

      return {
        data: {
          status: rowObject["Etat"] || "draft",
          title: rowObject["Titre de l'activité"] || "",
          category: rowObject["Catégorie"] || "",
          description: rowObject["Description de l'activité proposée"] || "",
          start_date: rowObject["Date de début de disponibilité"] || null,
          end_date: rowObject["Date de fin de disponibilité"] || null,
          max_attendees: rowObject["Nombre maximum d'élèves"] || null,
          contact_name: rowObject["Nom du référent"] || "",
          contact_position: rowObject["Rôle du référent"] || "",
          phone: rowObject["Téléphone du référent"] || "",
          email: rowObject["Email du référent"] || "",
          zipcode: rowObject["Code postal"] || "undefined",
          city: rowObject["Commune"] || "undefined",
          bus_parking: rowObject["Accessible en bus ?"] === "Oui",
          walkable: rowObject["Accessible à pied ?"] === "Oui",
          type: "plantation",
          location: {
            type: "Point",
            coordinates: [0, 0], // Add geocoding logic if necessary
          },
        },
      }
    })

    // Log the farmyard objects to the console
    console.log("Parsed Farmyards:", farmyards)

    console.log("First yard:", farmyards[0])

    // Respond to the client
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
