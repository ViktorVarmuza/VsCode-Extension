const vscode = require('vscode');
const { checkAuth } = require('../auth/checkLogin');
const { deleteTokens } = require('../tokens/Tokens');

//Odhlašovací funkce vymaže udaje o přihlašeni a resetuje extension
async function logOut(context, Uri, treeRefreshEvent) {
    const Logout_metoda = vscode.commands.registerCommand('share.logout', () => {
        deleteTokens(context);
        treeRefreshEvent.fire();
    })
}

module.exports = {logOut};