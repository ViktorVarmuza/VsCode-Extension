function saveTokens(context, tokens) {
    context.globalState.update('supabaseTokens', tokens);

    console.log(context.globalState.get("supabaseTokens"));
}

function loadTokens(context) {
    return context.globalState.get('supabaseTokens');
}
function deleteTokens(context) {
    context.globalState.update('supabaseTokens', null);
}

module.exports = { saveTokens, loadTokens, deleteTokens };
