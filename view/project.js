const vscode = require('vscode');
const { colorMap } = require('../projects/project');
//Vrací html pro chat s kamaradem

async function getProjectSetingsHtml(extensionUri, webview, context, project) {
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'style', 'project.css')
    );
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'scripts', 'projectSetings.js')
    );


    const colors = Object.keys(colorMap);

    const colorKey = Object.keys(colorMap).find(k => colorMap[k] === project.Color);

    const colorOptions = Object.keys(colorMap).map(key => `
  <label>
    <input type="radio"
           class="${key}" 
           name="icon"
           value="${key}"  
           ${colorKey === key ? 'checked' : ''}>
    ${key}
  </label>
`).join('');



    return `
    <!DOCTYPE html>
<html lang="cs">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy">
    <title>Nastavení projektu</title>
    <link rel="stylesheet" href="${styleUri}">
</head>

<body>

    <div class="container">
        <h2>⚙️ Nastavení ${project.project_name}</h2>

        <!-- GENERALS -->
        <div class="section-group">
            <h3>🧩 Generals</h3>

            <div class="section">
                <label>Název projektu</label>

                <div class="row">
                    <span id="projectName">${project.project_name}</span>
                    <span class="edit-icon" onclick="enableEdit()">✏️</span>
                </div>

                <div id="editName" class="hidden">
                    <input type="text" id="nameInput" value="${project.project_name}">
                    <div>
                        <button id="saveName">Uložit</button>
                    </div>
                </div>
            </div>

            <div class="section">
                <label>🎨 Ikona projektu</label>
                <div class="radio-group">
                    <div class="color-header">
                        <div class="color-pick"
                            id="colorPreview"
                            style="background-color: ${colorKey};">
                        </div>

                        <div class="color-actions hidden" id="colorActions">
                            <button id="confirmColor" title="Potvrdit">✔</button>
                            <button id="cancelColor" title="Zrušit">✖</button>
                        </div>
                    </div>

                    ${colorOptions}
                </div>


            </div>
          <div class="section">
    <label>📁 Lokální cesta k projektu</label>

            <div class="path-header">
                <div class="path-actions hidden" id="pathActions">
                    <button id="confirmPath" title="Potvrdit">✔</button>
                    <button id="cancelPath" title="Zrušit">✖</button>
                </div>
               
            </div>

            <!-- CESTA 1 -->
            <div class="path-row" id="project_path">
                <label class="path-left">
                    <input type="radio"
                        id="path1"
                        class="project_path"
                        name="localPath"
                        value="${project.project_path}"
                        ${project.active_path === project.project_path ? 'checked data-original="true"' : ''}>
                    <span>${project.project_path}</span>
                </label>

                <button data-path="project_path" class="changePath">Změnit</button>
            </div>

            <!-- CESTA 2 -->
            <div class="path-row" id="project_path2">
                <label class="path-left">
                    <input type="radio"
                        id="path2"
                        name="localPath"
                        class="project_path2"
                        value="${project.project_path2}"
                        ${project.project_path2 === project.project_path ? '' : (project.active_path === project.project_path2 ? 'checked data-original="true"' : '')}>
                    <span>${project.project_path2}</span>
                </label>

                <button data-path="project_path2" class="changePath">Změnit</button>
            </div>
        </div>




            <div class="section">
                <div class="sync-row">
                    <label>🔐 Viditelnost projektu</label>

                    <div class="toggle-row">
                        <label class="switch">
                            <input type="checkbox" id="projectVisibility" checked onchange="toggleVisibility()">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>

        </div>

        <!-- GITHUB -->
        <!-- GITHUB (collapsible) -->
        <div class="section-group github">
            <h3 class="github-header" onclick="toggleGithub()">
                🐙 GitHub (volitelné) <span id="githubArrow">▼</span>
            </h3>

            <div id="githubContent" class="">
                <div class="section">
                    <label>🔗 GitHub Projekt</label>
                    <input type="text" placeholder="https://github.com/user/repository">
                </div>
                <div class="section">
                    <label>🗂️ GitHub repozitář</label>
                    <input type="text" placeholder="Repositary Name">
                </div>
                <div class="section">
                    <div class="sync-row">
                        <label>🔄 Automatická synchronizace</label>

                        <div class="toggle-row">

                            <label class="switch">
                                <input type="checkbox" id="autoSync" checked>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>




            </div>
        </div>


        <!-- INFO -->
        <div class="section info">
            <label>ℹ️ Informace</label>
            <div>ID: <code>${project.id}</code></div>
        </div>

        <!-- DANGER -->
        <div class="section danger">
            <label>⚠️ Nebezpečné akce</label>
            <button class="removeProject">🗑 Odstranit projekt</button>
        </div>
    </div>
    <script>
        const activePath = "${project.active_path}";
    </script>
    <script src="${scriptUri}">
    </script>

</body>

</html>

`;
}

module.exports = { getProjectSetingsHtml };
