const vscode = acquireVsCodeApi();


const radios = document.querySelectorAll('input[name="icon"]');
const preview = document.getElementById('colorPreview');
const actions = document.getElementById('colorActions');
const confirmBtn = document.getElementById('confirmColor');
const cancelBtn = document.getElementById('cancelColor');
const saveNameBtn = document.getElementById('saveName');
const pathRadios = document.querySelectorAll('input[name="localPath"]');
const pathActions = document.getElementById('pathActions');
const confirmPathBtn = document.getElementById('confirmPath');
const cancelPathBtn = document.getElementById('cancelPath');
const path1 = document.getElementById('path1');
const path2 = document.getElementById('path2');
const deleteBtn = document.querySelector('.removeProject');


const changePathBtn = document.querySelectorAll('.changePath');

// původní barva (ta co přišla z backendu)
let originalColor = preview.style.backgroundColor;
let selectedColor = originalColor;



// původní active path z backendu
let originalPath = activePath;
let selectedPath = originalPath;

// změna radio buttonu
pathRadios.forEach(radio => {
    radio.addEventListener('change', () => {

        if (path1.value === path2.value) {
            return;
        }
        selectedPath = radio.value;
        if (selectedPath !== originalPath) {
            pathActions.classList.remove('hidden');
        } else {
            pathActions.classList.add('hidden');
        }
    });
});



// potvrzení změny
confirmPathBtn.addEventListener('click', () => {
    originalPath = selectedPath;
    pathActions.classList.add('hidden');

    vscode.postMessage({
        type: 'activePathChanged',
        value: selectedPath
    });
});

// zrušení změny
cancelPathBtn.addEventListener('click', () => {
    selectedPath = originalPath;

    // vrátí původní radio button
    pathRadios.forEach(radio => {
        radio.checked = radio.value === originalPath;
    });

    pathActions.classList.add('hidden');
});


// změna radio buttonu
radios.forEach(radio => {
    radio.addEventListener('change', () => {
        selectedColor = radio.value; // např. "green"
        preview.style.backgroundColor = selectedColor;

        if (selectedColor !== originalColor) {
            actions.classList.remove('hidden');
        } else {
            actions.classList.add('hidden');
        }
    });
});

// potvrdit
confirmBtn.addEventListener('click', () => {
    originalColor = selectedColor;
    actions.classList.add('hidden');

    // tady můžeš poslat zprávu do extension
    vscode.postMessage({
        type: 'colorChanged',
        value: selectedColor
    });
});

// zrušit
cancelBtn.addEventListener('click', () => {
    selectedColor = originalColor;
    preview.style.backgroundColor = originalColor;

    // vrátí radio button
    radios.forEach(radio => {
        radio.checked = radio.value === originalColor;
    });

    actions.classList.add('hidden');
});




function saveName() {
    const value = document.getElementById("nameInput").value;
    document.getElementById("projectName").textContent = value;
    document.getElementById("editName").classList.add("hidden");
}
saveNameBtn.addEventListener('click', () => {
    saveName();

    vscode.postMessage({
        type: 'nameChanged',
        value: document.getElementById("nameInput").value
    });
});

changePathBtn.forEach(button => {
    button.addEventListener('click', () => {
        const whichPath = button.dataset.path;
        const input = document.querySelector(`input.${whichPath}`);
        if (!input) return;

        vscode.postMessage({
            type: 'changePath',
            value: whichPath,
            changeActive: input.value === originalPath,
        });
    });
});


function enableEdit() {
    document.getElementById("editName").classList.remove("hidden");
}



function toggleGithub() {
    document.getElementById("githubSection").classList.toggle("hidden");
}

function toggleGithub() {
    const content = document.getElementById("githubContent");
    const arrow = document.getElementById("githubArrow");

    const isHidden = content.classList.toggle("hidden");
    arrow.textContent = isHidden ? "▶" : "▼";
}

// Funkce pro aktualizaci cesty v HTML
function updateProjectPath(whichPath, newPath, project) {
    const container = document.getElementById(whichPath);
    if (!container) return;

    const label = container.querySelector('.path-left');
    if (!label) return;

    const isActive = project.active_path === newPath;

    label.innerHTML = `
        <input type="radio"
            id="${whichPath === 'project_path' ? 'path1' : 'path2'}"
            name="localPath"
            value="${newPath}"
            class="${whichPath}">
        <span>${newPath}</span>
    `;

    const radio = label.querySelector('input[type="radio"]');
    radio.checked = isActive; // TADY JE KLÍČ
    radio.addEventListener('change', () => {
        selectedPath = radio.value;

        if (selectedPath !== project.active_path) {
            pathActions.classList.remove('hidden');
        } else {
            pathActions.classList.add('hidden');
        }
    });
}


deleteBtn.addEventListener('click', () => {
    vscode.postMessage({
        type: 'deleteProject'
    });
});

window.addEventListener("message", (event) => {
    const data = event.data;
    if (data.type === "pathUpdated") {
        const { whichPath, path, project } = data.value;
        updateProjectPath(whichPath, path, project);
    }
});
