function timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    // @ts-ignore
    const diff = (now - past) / 1000; // sekundy

    if (diff < 30) return "právě teď";
    if (diff < 60) return "před pár vteřinami";
    if (diff < 3600) return "před " + Math.floor(diff / 60) + " minutami";
    if (diff < 3600 * 24) return "před " + Math.floor(diff / 3600) + " hodinami";

    const days = Math.floor(diff / (3600 * 24));
    if (days === 1) return "včera";
    return "před " + days + " dny";
}
module.exports = { timeAgo };