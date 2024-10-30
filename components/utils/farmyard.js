export function getActivityString(type) {
  switch (type) {
    case "plantation":
      return "Plantation et visite du site"
    case "visit":
      return "Visite du site"
    default:
      return "Non spécifié"
  }
}
