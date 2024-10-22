export function getActivityString(type) {
  switch (type) {
    case "both":
      return "Plantation et Visite"
    case "plantation":
      return "Plantation"
    case "visit":
      return "Visite"
    default:
      return "Non spécifié"
  }
}
