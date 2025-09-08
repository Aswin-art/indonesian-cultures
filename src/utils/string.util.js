export function formatCategory(title) {
    if (!title) return "";
    return title
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
