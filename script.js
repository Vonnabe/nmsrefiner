let nmsDatabase = null;

//testings

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

    for (const [outputId, matInfo] of Object.entries(nmsDatabase.mats)) {
        if (!nmsDatabase.recipes[outputId]) continue;

        const nameMatch = matInfo.Name.toLowerCase().includes(lowerSearch);
        const symbolMatch = matInfo.Symbol && matInfo.Symbol.toLowerCase().includes(lowerSearch);

        if (nameMatch || symbolMatch || lowerSearch === "") {
            const div = document.createElement('div');
            div.className = `material-option`;
            
            div.innerHTML = `
                <div class="slot-icon" style="width:90px; height:90px; margin: 0 auto;">
                    <img src="icons/${outputId}.png" onerror="this.src='icons/default.png'; this.onerror=null;">
                </div>
                <span class="mat-name">${matInfo.Name}</span>
            `;
            
            // Fix: Only one onclick, and it must be inside this block
            div.onclick = () => {
                outputSlot.dataset.currentId = outputId; 
                showRecipeList(outputId); // Call the list view, not selectRecipe
            };
            
            selectorGrid.appendChild(div);
        }
        // REMOVED the extra div.onclick that was here
    }
    
    if (selectorGrid.children.length === 0) {
        selectorGrid.innerHTML = `<div class="error" style="grid-column: 1/-1;">NO_MATCHING_SIGNALS</div>`;
    }
}

function selectRecipe(outputId, recipeIndex) {

    if (!nmsDatabase.recipes[outputId] || !nmsDatabase.recipes[outputId][recipeIndex]) {
        console.error("Signal Lost: Recipe not found in database.");
        return;
    }

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

    // Lock tabs
    tabs.forEach(btn => {
        const btnType = btn.getAttribute('data-type');
        btn.classList.remove('active');
    
        // Determine if this specific tab is too small for the recipe
        const isTooSmall = (ingredientCount > 1 && btnType === 'small') || 
                        (ingredientCount > 2 && btnType === 'medium');

        if (isTooSmall) {
            btn.classList.add('locked');
            btn.style.pointerEvents = 'none'; // Only disables the BUTTON
            btn.style.opacity = '0.3';
        } else {
            btn.classList.remove('locked');
            btn.style.pointerEvents = 'auto'; // Re-enables the BUTTON
            btn.style.opacity = '1';
        }

        // Activate the tab that matches the recipe's requirement
        if (btnType === type) {
            btn.classList.add('active');
        }
    });

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

function showRecipeList(outputId) {
    const recipes = nmsDatabase.recipes[outputId];
    const matInfo = nmsDatabase.mats[outputId];
    
    // 1. Clear the material grid
    selectorGrid.innerHTML = '';
    
    // 2. Optional: Add a 'Back' button to return to the full material list
    const backBtn = document.createElement('div');
    backBtn.className = 'material-option';
    backBtn.style.borderColor = 'var(--atlas-red)';
    backBtn.innerHTML = `<span class="mat-name">← RETURN TO DATABASE</span>`;
    backBtn.onclick = () => renderModalItems(document.getElementById('mat-search').value);
    selectorGrid.appendChild(backBtn);

    // 3. Render every recipe found for this material
    recipes.forEach((recipe, index) => {
        const div = document.createElement('div');
        div.className = 'material-option recipe-card';
        
        // Determine MK tier based on ingredient count
        const count = recipe.InId.length;
        const tier = count === 1 ? 'small' : count === 2 ? 'medium' : 'large';

        div.innerHTML = `
            <div class="refiner-badge ${tier}">${tier.toUpperCase()}</div>
<div class="recipe-ingredients" style="display:flex; justify-content:center; align-items:center; gap:15px; margin:10px 0;">
    ${recipe.InId.map(id => {
        const name = nmsDatabase.mats[id]?.Name || "Unknown Material";
        return `
            <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
                <img src="icons/${id}.png" style="width:50px; height:50px;" title="${name}">
                <span style="font-size:0.6rem; color:rgba(255,255,255,0.7); text-transform:uppercase; max-width:60px; text-align:center;">
                    ${name}
                </span>
            </div>
        `;
    }).join(' <span style="opacity:0.5; font-size:1.2rem; margin-bottom:20px;">+</span> ')}
</div>
            <div class="modal-out-qty">x${recipe.OutQty || 1}</div>
        `;

        // 4. Clicking this SPECIFIC recipe finally calls your original selectRecipe
        div.onclick = () => selectRecipe(outputId, index);
        selectorGrid.appendChild(div);
    });
}

// --- 4. EVENT LISTENERS ---
    outputSlot.addEventListener('click', () => {
        console.log("Output Slot Clicked!");
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

    tabs.forEach(btn => {
        btn.classList.remove('active', 'locked');
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
        
        if (btn.getAttribute('data-type') === 'small') {
            btn.classList.add('active');
        }
    });

    console.log("Terminal Purged: Tabs Unlocked.");
});

    aboutOpen.onclick = () => aboutModal.style.display = 'flex';
    aboutClose.onclick = () => aboutModal.style.display = 'none';

    
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

        patchBtn.addEventListener('click', () => {
            patchModal.style.display = 'flex';
        });

        patchClose.addEventListener('click', () => {
            patchModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === patchModal) {
                patchModal.style.display = 'none';
            }
            if (event.target === aboutModal) {
                aboutModal.style.display = 'none';
            }
        });
    }

    initializeTravellerUplink();

});




