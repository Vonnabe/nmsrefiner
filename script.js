/**
 * NMS Refiner Terminal - Final Logic
 * Version: 3.2 (Scope & Search Fixed)
 */

// We move nmsDatabase to the top level so all functions can see it
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
        // 1. UI: Toggle Active Class
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 2. LOGIC: Get type and update Grid
        const type = tab.getAttribute('data-type');
        
        // Reset and Apply new class
        gridContainer.className = 'refiner-grid';
        if (type !== 'small') {
            gridContainer.classList.add(`show-${type}`);
        }

        // 3. TEXT: Update Header Title
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
    
    // 1. ALWAYS clear the grid first
    selectorGrid.innerHTML = '';
    
    const lowerSearch = searchTerm.toLowerCase().trim();

    // 2. Iterate through every output product in the database
    for (const [outputId, recipesArray] of Object.entries(nmsDatabase.recipes)) {
        const matInfo = nmsDatabase.mats[outputId];
        if (!matInfo) continue;

        // 3. Robust Search: Check Name and Symbol
        const nameMatch = matInfo.Name.toLowerCase().includes(lowerSearch);
        const symbolMatch = matInfo.Symbol && matInfo.Symbol.toLowerCase().includes(lowerSearch);

        if (nameMatch || symbolMatch || lowerSearch === "") {
            // 4. Create an entry for every possible recipe for this item
            recipesArray.forEach((recipe, index) => {
                const count = recipe.InId.length;
                const level = count === 3 ? "MK-III" : (count === 2 ? "MK-II" : "MK-I");
                const typeName = count === 3 ? "large" : (count === 2 ? "medium" : "small");

                const div = document.createElement('div');
                div.className = `material-option`;
                
                div.innerHTML = `
                    <div class="refiner-badge ${typeName}">${level}</div>
                    <div class="slot-icon" style="width:50px; height:50px; margin: 0 auto;">
                        <img src="icons/${outputId}.png" onerror="this.src='icons/default.png'; this.onerror=null;">
                    </div>
                    <span class="mat-name">${matInfo.Name}</span>
                `;
                
                div.onclick = () => selectRecipe(outputId, index);
                selectorGrid.appendChild(div);
            });
        }
    }

    // 5. If no items were added to the grid, show the error
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
    // Reset classes and only add the necessary "show" class
    gridContainer.className = 'refiner-grid'; 
    if (type !== 'small') {
        gridContainer.classList.add(`show-${type}`);
    }
    
    // Update the Header Text
    document.getElementById('refiner-name').innerText = refinerName;

    // --- 3. UPDATE TAB BUTTON STATES ---
    // Loop through tabs and set the 'active' class on the one that matches our recipe type
    tabs.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
        }
    });

    // --- 4. UPDATE SLOTS (OUTPUT) ---
    outputSlot.title = outputMat.Name; // Set hover for output
    const outIcon = outputSlot.querySelector('.slot-icon');
    const outCount = outputSlot.querySelector('.slot-count');
    outIcon.innerHTML = `<img src="icons/${outputId}.png" onerror="this.replaceWith(Object.assign(document.createElement('span'), {innerText: '${outputMat.Symbol}'}))">`;
    outCount.innerText = recipe.OutQty || "1";

// --- 5. UPDATE SLOTS (INPUTS) ---
    for (let i = 1; i <= 3; i++) {
        const iconContainer = document.getElementById(`input-0${i}-icon`);
        const countLabel = document.getElementById(`input-0${i}-count`);
        const ingredientId = recipe.InId[i - 1];

        if (ingredientId && nmsDatabase.mats[ingredientId]) {
            const matInfo = nmsDatabase.mats[ingredientId];
            
            // Apply the title to the parent (the actual slot box)
            iconContainer.parentElement.title = matInfo.Name;
            
            iconContainer.innerHTML = `<img src="icons/${ingredientId}.png" onerror="this.replaceWith(Object.assign(document.createElement('span'), {innerText: '${matInfo.Symbol}'}))">`;
            if (countLabel) countLabel.innerText = recipe.InQty[i - 1];
            iconContainer.parentElement.style.opacity = "1";
        } else {
            // Reset title when empty
            iconContainer.parentElement.title = "Empty Slot";
            iconContainer.innerHTML = "<span>--</span>";
            if (countLabel) countLabel.innerText = "0";
            iconContainer.parentElement.style.opacity = "0.3";
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
    
    // 1. Get the current value of the search input
    const currentSearch = searchInput.value;
    
    // 2. Render items using that existing search term
    renderModalItems(currentSearch); 
    
    // REMOVED: searchInput.value = "";  <-- This was the line clearing your input
    
    searchInput.focus();
});

    searchInput.addEventListener('input', (e) => renderModalItems(e.target.value));

    document.getElementById('close-modal').onclick = () => modal.style.display = 'none';
    
// Event Listener for Clear Terminal
clearBtn.addEventListener('click', () => {
    // 1. Reset Output Slot
    const outIcon = outputSlot.querySelector('.slot-icon');
    const outCount = outputSlot.querySelector('.slot-count');
    outIcon.innerHTML = "<span>?</span>";
    outCount.innerText = "--";

    // 2. Reset All Input Slots
    for (let i = 1; i <= 3; i++) {
        const iconContainer = document.getElementById(`input-0${i}-icon`);
        const countLabel = document.getElementById(`input-0${i}-count`);
        
        iconContainer.innerHTML = "<span>--</span>";
        if (countLabel) countLabel.innerText = "0";
        iconContainer.parentElement.style.opacity = "0.3";
    }

    // 3. Clear Info Panel
    infoContainer.innerHTML = "";

    // 4. RESET THE GRID TO SMALL (MK-I)
    // This removes 'show-medium' or 'show-large'
    gridContainer.className = 'refiner-grid'; 
    document.getElementById('refiner-name').innerText = "Portable Refiner // MK-I";

    // 5. RESET THE TABS VISUALLY
    tabs.forEach(btn => {
        btn.classList.remove('active');
        // Force the 'small' tab to be the active one
        if (btn.getAttribute('data-type') === 'small') {
            btn.classList.add('active');
        }
    });

    // Reset Labels to Defaults
    outputSlot.parentElement.setAttribute('data-label', "SELECT OUTPUT");
    for (let i = 1; i <= 3; i++) {
        const slotElement = document.getElementById(`input-0${i}-slot`);
        if (slotElement) {
            slotElement.parentElement.setAttribute('data-label', `INPUT 0${i}`);
        }
    }

    // Reset Hover Titles
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
}