let nmsDatabase = null;

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. LOAD DATABASE ---
    try {
        const response = await fetch('NMSRefinerRecipes.json');
        if (!response.ok) throw new Error("Could not find NMSRefinerRecipes.json");
        nmsDatabase = await response.json();
        console.log("Atlas Data Link: Established.");
    } catch (err) {
        console.error("Atlas Data Link: Failed.", err);
    }

    // --- 2. SELECTORS ---
    const modal = document.getElementById('material-modal');
    const outputSlot = document.getElementById('main-output-slot');
    const selectorGrid = document.getElementById('material-selector-grid');
    const searchInput = document.getElementById('mat-search');
    const infoContainer = document.getElementById('info-panel-container');
    const refineBtn = document.getElementById('refine-btn');
    const tabs = document.querySelectorAll('.tab-btn');
    const gridContainer = document.getElementById('refiner-grid');
    const clearBtn = document.getElementById('clear-terminal-btn');
    const aboutModal = document.getElementById('about-modal');
    const aboutOpen = document.getElementById('about-open');
    const aboutClose = document.getElementById('about-close');

    tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const type = tab.getAttribute('data-type');
        
        gridContainer.className = 'refiner-grid';
        if (type !== 'small') {
            gridContainer.classList.add(`show-${type}`);
        }
        const refinerNames = {
            'small': "Portable Refiner // MK-I",
            'medium': "Medium Refiner // MK-II",
            'large': "Large Refiner // MK-III"
        };
        document.getElementById('refiner-name').innerText = refinerNames[type];
        
        console.log(`Refiner Mode Switched: ${type.toUpperCase()}`);
    });
});

    // --- 3. UI RENDERING FUNCTIONS ---
function renderModalItems(searchTerm = "") {
    if (!nmsDatabase) return;
    selectorGrid.innerHTML = '';

    const lowerSearch = searchTerm.toLowerCase().trim();

    for (const [outputId, recipesArray] of Object.entries(nmsDatabase.recipes)) {
        const matInfo = nmsDatabase.mats[outputId];
        if (!matInfo) continue;

        const nameMatch = matInfo.Name.toLowerCase().includes(lowerSearch);
        const symbolMatch = matInfo.Symbol && matInfo.Symbol.toLowerCase().includes(lowerSearch);

        if (nameMatch || symbolMatch || lowerSearch === "") {
            recipesArray.forEach((recipe, index) => {
                const count = recipe.InId.length;
                const level = count === 3 ? "MK-III" : (count === 2 ? "MK-II" : "MK-I");
                const typeName = count === 3 ? "large" : (count === 2 ? "medium" : "small");

                const div = document.createElement('div');
                div.className = `material-option`;
                
                div.innerHTML = `
                    <div class="refiner-badge ${typeName}">${level}</div>
                    <div class="slot-icon" style="width:90px; height:90px; margin: 0 auto;">
                        <img src="icons/${outputId}.png" onerror="this.src='icons/default.png'; this.onerror=null;">
                    </div>
                    <span class="mat-name">${matInfo.Name}</span>
                `;
                
                div.onclick = () => selectRecipe(outputId, index);
                selectorGrid.appendChild(div);
            });
        }
    }
    if (selectorGrid.children.length === 0) {
        selectorGrid.innerHTML = `<div class="error" style="grid-column: 1/-1;">NO_MATCHING_SIGNALS</div>`;
    }
}

function selectRecipe(outputId, recipeIndex) {
    const recipe = nmsDatabase.recipes[outputId][recipeIndex];
    const outputMat = nmsDatabase.mats[outputId];

    // --- 1. DETERMINE REFINER TYPE ---
    const ingredientCount = recipe.InId.length;
    let type = 'small';
    let refinerName = "Portable Refiner // MK-I";

    if (ingredientCount === 2) {
        type = 'medium';
        refinerName = "Medium Refiner // MK-II";
    } else if (ingredientCount === 3) {
        type = 'large';
        refinerName = "Large Refiner // MK-III";
    }

    // --- 2. UPDATE GRID VISIBILITY ---
    gridContainer.className = 'refiner-grid'; 
    if (type !== 'small') {
        gridContainer.classList.add(`show-${type}`);
    }

    document.getElementById('refiner-name').innerText = refinerName;

    // --- 3. UPDATE TAB BUTTON STATES ---
    tabs.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
        }
    });

    // --- 4. UPDATE SLOTS (OUTPUT) ---
// Set the hover title
    outputSlot.title = outputMat.Name; 
    outputSlot.dataset.label = outputMat.Name.toUpperCase();

    const outIcon = outputSlot.querySelector('.slot-icon');
    const outCount = outputSlot.querySelector('.slot-count');
    outIcon.innerHTML = `<img src="icons/${outputId}.png" onerror="this.replaceWith(Object.assign(document.createElement('span'), {innerText: '${outputMat.Symbol}'}))">`;
    outCount.innerText = recipe.OutQty || "1";

// --- 5. UPDATE SLOTS (INPUTS) ---
for (let i = 1; i <= 3; i++) {
    const iconContainer = document.getElementById(`input-0${i}-icon`);
    const countLabel = document.getElementById(`input-0${i}-count`);
    const ingredientId = recipe.InId[i - 1];
    
    const slotElement = iconContainer.parentElement;

    if (ingredientId && nmsDatabase.mats[ingredientId]) {
        const matInfo = nmsDatabase.mats[ingredientId];
        
        // 1. Update Title
        slotElement.title = matInfo.Name;
        slotElement.dataset.label = matInfo.Name.toUpperCase();
        
        iconContainer.innerHTML = `<img src="icons/${ingredientId}.png" onerror="this.replaceWith(Object.assign(document.createElement('span'), {innerText: '${matInfo.Symbol}'}))">`;
        if (countLabel) countLabel.innerText = recipe.InQty[i - 1];
        slotElement.style.opacity = "1";

    } else {
        slotElement.title = "Empty Slot";
        
        slotElement.dataset.label = `INPUT 0${i}`;
        
        iconContainer.innerHTML = "<span>--</span>";
        if (countLabel) countLabel.innerText = "0";
        slotElement.style.opacity = "0.3";
    }
}

    // --- 6. UPDATE INFO PANEL & CLOSE ---
    infoContainer.innerHTML = `
        <div class="item-details" style="--accent: #${outputMat.Color}">
            <h4>REFINER OPERATION: ${type.toUpperCase()}</h4>
            <p><strong>${recipe.Name}</strong></p>
            <div class="item-stats">
                <span>RESULT: ${outputMat.Name}</span>
                <span>TIME: ${recipe.Time}s</span>
            </div>
        </div>
    `;
    modal.style.display = 'none';
}

// --- 4. EVENT LISTENERS ---
    outputSlot.addEventListener('click', () => {
    modal.style.display = 'flex';
    const currentSearch = searchInput.value;
    renderModalItems(currentSearch); 
    
    searchInput.focus();
});

    searchInput.addEventListener('input', (e) => renderModalItems(e.target.value));

    document.getElementById('close-modal').onclick = () => modal.style.display = 'none';
    
clearBtn.addEventListener('click', () => {
    const outIcon = outputSlot.querySelector('.slot-icon');
    const outCount = outputSlot.querySelector('.slot-count');
    const outLabel = outputSlot.dataset.label;
    outputSlot.title = "Select Output";
    outputSlot.dataset.label = "SELECT OUTPUT";
    outIcon.innerHTML = "<span>?</span>";
    outCount.innerText = "--";

    for (let i = 1; i <= 3; i++) {
        const iconContainer = document.getElementById(`input-0${i}-icon`);
        const countLabel = document.getElementById(`input-0${i}-count`);
        const slotElement = iconContainer.parentElement;
        
        slotElement.title = `Empty Input 0${i}`;
        slotElement.dataset.label = `INPUT 0${i}`;
        
        iconContainer.innerHTML = "<span>--</span>";
        if (countLabel) countLabel.innerText = "0";
        iconContainer.parentElement.style.opacity = "0.3";
    }
    infoContainer.innerHTML = "";

    gridContainer.className = 'refiner-grid'; 
    document.getElementById('refiner-name').innerText = "Portable Refiner // MK-I";

    tabs.forEach(btn => {
        btn.classList.remove('active');
        // Force the 'small' tab to be the active one
        if (btn.getAttribute('data-type') === 'small') {
            btn.classList.add('active');
        }
    });
    outputSlot.parentElement.setAttribute('data-label', "SELECT OUTPUT");
    for (let i = 1; i <= 3; i++) {
        const slotElement = document.getElementById(`input-0${i}-slot`);
        if (slotElement) {
            slotElement.parentElement.setAttribute('data-label', `INPUT 0${i}`);
        }
    }
    outputSlot.title = "Select Output";
    for (let i = 1; i <= 3; i++) {
        const slotElement = document.getElementById(`input-0${i}-slot`);
        if (slotElement) {
            slotElement.title = `Empty Input 0${i}`;
        }
    }

    console.log("Terminal Purged: System returned to MK-I default.");
});

    aboutOpen.onclick = () => aboutModal.style.display = 'flex';
    aboutClose.onclick = () => aboutModal.style.display = 'none';

    initializeTravellerUplink();
});

function initializeTravellerUplink() {
    const display = document.getElementById('live-count');
    if (!display) return;
    let currentTravellers = Math.floor(Math.random() * 30) + 12;
    setInterval(() => {
        const roll = Math.random();
        if (roll > 0.85) currentTravellers++;
        else if (roll < 0.15) currentTravellers--;
        currentTravellers = Math.max(8, Math.min(86, currentTravellers));
        display.innerText = currentTravellers.toString().padStart(4, '0');
    }, 4000);

const patchModal = document.getElementById('patch-modal');
const patchBtn = document.getElementById('patch-notes-open');
const patchClose = document.getElementById('patch-close');

// Open Patch Notes
patchBtn.addEventListener('click', () => {
    patchModal.style.display = 'flex';
});

// Close Patch Notes
patchClose.addEventListener('click', () => {
    patchModal.style.display = 'none';
});

// Close when clicking outside the window
window.addEventListener('click', (event) => {
    if (event.target === patchModal) {
        patchModal.style.display = 'none';
    }
});
}


