const { loadTokens, loadUserId } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');

async function getAllProjects(context) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const userId = await loadUserId(context);
    const supabase = createClient(supabaseUrl, supabaseKey);


    const { data: projects, error } = await supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', userId)

    if (error) {
        vscode.window.showErrorMessage("Chyba při načítání přátel.");
        return [];
    }

    let allProjects = [];

    for (let f of projects) {

        allProjects.push({
            type: "info",
            label: f.project_name,
            command: 'share.openFolder',
            arguments: [{ Path: f.project_path }]
        })  // <- zabaleno do jednoho objektu

    }

    return allProjects;
}

function openProject(context) {
    const disposable = vscode.commands.registerCommand('share.openFolder', async (args) => {
        const folderUri = vscode.Uri.file(args.Path);
        const options = ['Ano', 'Ne'];

        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: 'Otevřít v novém okně?'
        });
        

        vscode.commands.executeCommand('vscode.openFolder', folderUri, choice ==='Ano' ? true : false); // false = aktuální okno
    });

    context.subscriptions.push(disposable);
}


async function addProject(context, treeRefreshEvent, ProjectRoot) {
    const disposable = vscode.commands.registerCommand('share.addProject', async () => {
        const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
        const key_path = path.join(__dirname, '../key.key');
        const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

        const userId = await loadUserId(context);
        const supabase = createClient(supabaseUrl, supabaseKey);

        // --- Otevření file chooser ---
        const options = {
            canSelectFiles: true,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Vybrat projekt'
        };

        const selection = await vscode.window.showOpenDialog(options);
        if (!selection || selection.length === 0) {
            vscode.window.showInformationMessage('Nevybrali jste žádný projekt.');
            return;
        }

        const projectPath = selection[0].fsPath;

        // --- Zadat název projektu ---
        const projectName = await vscode.window.showInputBox({
            prompt: "Zadejte název projektu",
            value: path.basename(projectPath) // defaultní hodnota = název složky
        });

        if (!projectName) {
            vscode.window.showInformationMessage('Nebyl zadán název projektu.');
            return;
        }

        // --- Uložit do Supabase ---
        const { data, error } = await supabase
            .from('user_projects')
            .insert({
                user_id: userId,
                project_path: projectPath,
                project_name: projectName,
            });

        if (error) {
            vscode.window.showErrorMessage(`Chyba při ukládání: ${error.message}`);
        } else {
            vscode.window.showInformationMessage(`Projekt uložen: ${projectName}`);
            treeRefreshEvent.fire(ProjectRoot);
        }
    });

    return disposable;
}


module.exports = { getAllProjects, addProject, openProject }