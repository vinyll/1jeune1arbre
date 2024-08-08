import express from "express"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
const PORT = process.env.PORT || 3000
const INDEX_FILE = "index.html"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname)))

// Forward any other URI to index.html
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, INDEX_FILE))
})

app.listen(PORT, () => {
  console.info(`Server running at http://localhost:${PORT}`)
})
