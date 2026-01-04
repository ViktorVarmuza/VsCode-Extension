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
            type: "project",
            label: f.project_name,
            command: 'share.openProjekt',
            projectPath: f.active_path, // 👈 DŮLEŽITÉ
            contextValue: 'projectItem', // ← TOTO JE KLÍČ
            iconPath: new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(f.Color)),
            id: f.id,
        });

    }

    return allProjects;
}

const colorMap = {
    green: 'charts.green',
    red: 'charts.red',
    yellow: 'charts.yellow',
    orange: 'charts.orange',
    blue: 'charts.blue',
    purple: 'charts.purple',
    white: 'foreground'
};

function ChangeIcon(context, treeRefreshEvent, ProjectRoot) {
    const disposable = vscode.commands.registerCommand(
        'share.changeIcon',
        async (item) => {

            const colorChoices = Object.keys(colorMap);

            // showQuickPick
            const choice = await vscode.window.showQuickPick(colorChoices, {
                placeHolder: 'Vyberte barvu'
            });

            if (!choice) return; // zrušil výběr

            const save = await SaveColor(choice, item);
            treeRefreshEvent.fire(ProjectRoot);
        }
    );

    context.subscriptions.push(disposable);
}



async function SaveColor(color, item) {
    if (!color) return;



    const colorKey = colorMap[color] || colorMap.white;

    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('user_projects')
        .update({ Color: colorKey })
        .eq('id', item.id);

    if (error) {
        vscode.window.showErrorMessage(`Chyba při ukládání barvy: ${error.message}`);
    } else {
        vscode.window.showInformationMessage(`Barva projektu změněna na ${color}`);
    }

    return true;
}

async function SavePath(project_path, collumn, item) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('user_projects')
        .update({ [collumn]: project_path })
        .eq('id', item.id);

    if (error) {
        vscode.window.showErrorMessage(`Chyba při ukládání cesty: ${error.message}`);
    } else {
        vscode.window.showInformationMessage(`Cesta projektu změněna na ${project_path}`);
    }
    
    const { data: project, error: err } = await supabase
        .from('user_projects')
        .select('*')
        .eq('id', item.id);

    if (error) {
        vscode.window.showErrorMessage("Chyba při načítání projektu.");
        return false;
    }

    return project[0];
}


function ChangeName(context, treeRefreshEvent, ProjectRoot) {
    const disposable = vscode.commands.registerCommand(
        'share.renameProject',
        async (item) => {

            const projectName = await vscode.window.showInputBox({
                prompt: "Zadejte nové jméno",
                value: item.label // defaultní hodnota = název složky
            });

            if (!projectName) {
                vscode.window.showInformationMessage('nic nebylo zadané');
                return;
            }

            const save = await SaveName(projectName, item);
            treeRefreshEvent.fire(ProjectRoot);
        }
    );

    context.subscriptions.push(disposable);
}

async function SaveName(name, item) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('user_projects')
        .update({ project_name: name })
        .eq('id', item.id);

    if (error) {
        vscode.window.showErrorMessage(`Chyba při ukládání jména: ${error.message}`);
    } else {
        vscode.window.showInformationMessage(`Jméno projektu změněno na ${name}`);
    }

    return true;
}


function openProject(context) {
    const disposable = vscode.commands.registerCommand(
        'share.openProjekt',
        async (item) => {

            // item je VŽDY project element
            const folderUri = vscode.Uri.file(item.projectPath);

            const choice = await vscode.window.showQuickPick(
                ['Ano', 'Ne'],
                { placeHolder: 'Otevřít v novém okně?' }
            );

            vscode.commands.executeCommand(
                'vscode.openFolder',
                folderUri,
                choice === 'Ano'
            );
        }
    );

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
                active_path: projectPath,
                project_path: projectPath,
                project_path2: projectPath,
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


function deleteProject(context, treeRefreshEvent, ProjectRoot) {
    const disposable = vscode.commands.registerCommand(
        'share.deleteProject',
        async (item) => {
            const choice = await vscode.window.showQuickPick(
                ['Odstranit', 'Zrušit'],
                { placeHolder: 'Vážně chcete odstranit projekt?' }
            );

            if (choice !== 'Odstranit') {
                return;
            }


            const smazat = await removeProject(item, context);
            if (smazat) {
                treeRefreshEvent.fire(ProjectRoot);

            }
        }
    );

    context.subscriptions.push(disposable);

}

async function removeProject(item, context) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const userId = await loadUserId(context);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: projects, error } = await supabase
        .from('user_projects')
        .delete()
        .eq('id', item.id)

    if (error) {
        vscode.window.showErrorMessage('Chyba při mazání projektu')
        return false;
    }
    return true
}


module.exports = { getAllProjects, addProject, openProject, ChangeIcon, ChangeName, deleteProject, colorMap, SaveColor, SaveName, SavePath }