function getFriendHtml(Friend) {
    return `
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <title>${Friend.username}</title>
        </head>
        <body>
            <h1>${Friend.username}</h1>
            <p>ID: ${Friend.id}</p>
            <!-- sem můžeš přidat další informace o uživateli -->
        </body>
        </html>
    `;
}

module.exports = { getFriendHtml };