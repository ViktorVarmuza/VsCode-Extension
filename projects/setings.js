const { loadTokens, loadUserId } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const { getProjectSetingsHtml } = require('../view/project');
const { SaveColor, colorMap, SaveName, SavePath } = require('./project');


async function openSetings(context, extensionUri, treeRefreshEvent, ProjectRoot) {
    const disposable = vscode.commands.registerCommand('share.projectSetings', async (item) => {
        const project = await getProjectId(item.id, context);



        // Nový panel
        const setingPanel = vscode.window.createWebviewPanel(
            'ProjektSettings',
            `Nastavení Projektu`,
            vscode.ViewColumn.One,
            { enableScripts: true },
        );
        setingPanel.webview.html = await getProjectSetingsHtml(extensionUri, setingPanel.webview, context, project);

        setingPanel.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'colorChanged') {
                const save = await SaveColor(message.value, item);
                if (save) {
                    vscode.window.showInformationMessage(`Barva projektu změněna na ${message.value}`);
                    treeRefreshEvent.fire(ProjectRoot);
                } else {
                    vscode.window.showErrorMessage(`Chyba při změně barvy projektu`);
                }
            } else if (message.type === 'nameChanged') {
                const save = await SaveName(message.value, item);
                if (save) {
                    vscode.window.showInformationMessage(`Název projektu změněn na ${message.value}`);
                    treeRefreshEvent.fire(ProjectRoot);
                } else {
                    vscode.window.showErrorMessage(`Chyba při změně názvu projektu`);
                }
            } else if (message.type === 'activePathChanged') {
                const save = await SavePath(message.value, 'active_path', item);
                if (save) {
                    vscode.window.showInformationMessage(`Cesta projektu změněna na ${message.value}`);
                    treeRefreshEvent.fire(ProjectRoot);
                } else {
                    vscode.window.showErrorMessage(`Chyba při změně cesty projektu`);
                }
            }
            else if (message.type === 'changePath') {
                const whichPath = message.value;
                const options = {
                    canSelectFiles: true,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: 'Vybrat novou cestu'
                };

                const selection = await vscode.window.showOpenDialog(options);
                if (!selection || selection.length === 0) {
                    vscode.window.showInformationMessage('Nevybrali jste žádnou novou cestu');
                    return;
                }

                const projectPath = selection[0].fsPath;

                const save = await SavePath(projectPath, whichPath, item);
                if (save) {
                    vscode.window.showInformationMessage(`Cesta projektu změněna na ${projectPath}`);
                    if (message.changeActive) {
                        const saveActive = await SavePath(projectPath, 'active_path', item);
                        if (!saveActive) {
                            vscode.window.showErrorMessage(`chyba při změně cesty projektu`);
                        }
                    }

                    setingPanel.webview.postMessage({
                        type: 'pathUpdated',
                        value: { whichPath: whichPath, path: projectPath, project: project }
                    });
                    treeRefreshEvent.fire(ProjectRoot);
                } else {
                    vscode.window.showErrorMessage(`Chyba při změně cesty projektu`);
                }
            } else if (message.type === 'deleteProject') {
                await vscode.commands.executeCommand(
                    'share.deleteProject',
                    item // ⚠️ posíláš přímo item
                );
                setingPanel.dispose();
            }
        });
    });

    context.subscriptions.push(disposable);
}

async function getProjectId(id, context) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: project, error } = await supabase
        .from('user_projects')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !project) {
        vscode.window.showErrorMessage('Chyba při načítání projektu');
        return null;
    }
    return project;
}

module.exports = { openSetings }