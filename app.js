// ChoreFlow Application Logic (with Authentication System)

// STATE MANAGEMENT
const STATE_KEY = 'choreflow_state_v1';
const SESSION_KEY = 'choreflow_session_v1';

let state = {
    adminCredentials: {
        email: 'admin@home.com',
        password: 'admin123'
    },
    people: [],         // { id, name, color, email, password }
    tasks: [],          // { id, name, assigneesCount, priority }
    currentCalendar: null, // { startDate, assignments: { day: { taskId: [personId, ...] } }, presents: [], absences: { personId: [days...] } }
    activeTab: 'dashboard'
};

// Logged User Session Info
let session = {
    userId: null,   // 'admin' or personId
    role: null,     // 'admin' or 'cadetto'
    name: null,
    color: null
};

// Colors palette for people
const COLOR_PALETTE = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#0ea5e9', // Sky
    '#14b8a6', // Teal
    '#10b981', // Emerald
    '#22c55e', // Green
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ef4444', // Red
    '#ec4899', // Pink
    '#d946ef', // Magenta
    '#a855f7'  // Purple
];

const DAYS_OF_WEEK = [
    'Venerdì',
    'Sabato',
    'Domenica',
    'Lunedì',
    'Martedì',
    'Mercoledì',
    'Giovedì'
];

// Initial Demo Data (if localStorage is empty)
const DEMO_PEOPLE = [
    { id: 'p1', name: 'Alessandro', color: '#6366f1', email: 'alessandro@home.com', password: 'password123' },
    { id: 'p2', name: 'Sofia', color: '#ec4899', email: 'sofia@home.com', password: 'password123' },
    { id: 'p3', name: 'Matteo', color: '#10b981', email: 'matteo@home.com', password: 'password123' },
    { id: 'p4', name: 'Giulia', color: '#eab308', email: 'giulia@home.com', password: 'password123' },
    { id: 'p5', name: 'Francesco', color: '#ef4444', email: 'francesco@home.com', password: 'password123' }
];

const DEMO_TASKS = [
    { id: 't1', name: 'Cucina (Cena)', assigneesCount: 2, priority: 'alta' },
    { id: 't2', name: 'Lavastoviglie', assigneesCount: 1, priority: 'alta' },
    { id: 't3', name: 'Buttare Spazzatura', assigneesCount: 1, priority: 'bassa' },
    { id: 't4', name: 'Pulizia Bagno', assigneesCount: 1, priority: 'media' },
    { id: 't5', name: 'Spesa Settimanale', assigneesCount: 2, priority: 'media' },
    { id: 't6', name: 'Aspirapolvere Salone', assigneesCount: 1, priority: 'bassa' }
];

// Wizard Temporary State
let wizardState = {
    step: 1,
    presents: [], // Array of person IDs selected in Step 1
    absences: {}  // Map of personId -> Array of day names where they are absent
};

// Editing Calendar Cell Temporary State
let activeEditCell = {
    day: null,
    taskId: null
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    checkSession();
    setupEventListeners();
    
    // Inizializza le icone Lucide
    lucide.createIcons();
});

// LOAD & SAVE STATE
function loadState() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
            // Forza il reset dei tab all'avvio
            state.activeTab = 'dashboard';
        } catch (e) {
            console.error("Errore nel caricamento del LocalStorage, utilizzo dati demo", e);
            initDemoData();
        }
    } else {
        initDemoData();
    }
}

function initDemoData() {
    state.adminCredentials = {
        email: 'admin@home.com',
        password: 'admin123'
    };
    state.people = [...DEMO_PEOPLE];
    state.tasks = [...DEMO_TASKS];
    state.currentCalendar = null;
    state.activeTab = 'dashboard';
    saveState();
}

function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// SESSION MANAGEMENT (Authentication)
function checkSession() {
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
        try {
            session = JSON.parse(savedSession);
            applyLoginState();
        } catch (e) {
            session = { userId: null, role: null, name: null, color: null };
            showLoginForm();
        }
    } else {
        showLoginForm();
    }
}

function showLoginForm() {
    document.body.classList.add('not-logged-in');
    document.body.classList.remove('role-admin');
}

function handleLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById('login-email').value.trim();
    const passwordInput = document.getElementById('login-password').value;
    
    if (!emailInput || !passwordInput) return;
    
    // 1. Controlla credenziali Admin
    if (emailInput.toLowerCase() === state.adminCredentials.email.toLowerCase() && 
        passwordInput === state.adminCredentials.password) {
        
        session = {
            userId: 'admin',
            role: 'admin',
            name: 'Amministratore',
            color: '#a855f7' // Viola Admin
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        applyLoginState();
        showToast('Accesso effettuato come Amministratore', 'success');
        
        // Pulisci i campi
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        return;
    }
    
    // 2. Controlla credenziali Cadetti (Persone nella master list)
    const person = state.people.find(p => p.email && p.email.toLowerCase() === emailInput.toLowerCase() && p.password === passwordInput);
    
    if (person) {
        session = {
            userId: person.id,
            role: 'cadetto',
            name: person.name,
            color: person.color
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        applyLoginState();
        showToast(`Benvenuto/a, ${person.name}`, 'success');
        
        // Pulisci i campi
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        return;
    }
    
    // 3. Credenziali non corrette
    showToast('Credenziali errate. Riprova.', 'danger');
}

function handleLogout() {
    session = { userId: null, role: null, name: null, color: null };
    sessionStorage.removeItem(SESSION_KEY);
    showLoginForm();
    showToast('Disconnessione effettuata con successo.', 'info');
}

function applyLoginState() {
    document.body.classList.remove('not-logged-in');
    
    // Imposta le classi CSS in base al ruolo
    if (session.role === 'admin') {
        document.body.classList.add('role-admin');
    } else {
        document.body.classList.remove('role-admin');
    }
    
    // Se è un cadetto e si trova su un tab riservato all'admin, lo reindirizziamo alla dashboard
    if (session.role === 'cadetto' && state.activeTab !== 'dashboard') {
        state.activeTab = 'dashboard';
    }
    
    // Aggiorna le info del profilo nella sidebar
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const avatarColorEl = document.getElementById('user-avatar-color');
    const avatarIconEl = document.getElementById('user-avatar-icon');
    
    nameEl.textContent = session.name;
    roleEl.textContent = session.role === 'admin' ? 'Admin' : 'Cadetto';
    avatarColorEl.style.backgroundColor = session.color;
    
    if (session.role === 'admin') {
        avatarIconEl.setAttribute('data-lucide', 'shield');
    } else {
        avatarIconEl.setAttribute('data-lucide', 'user');
    }
    
    // Compila il pannello per le credenziali Admin nel tab Persone (se admin)
    if (session.role === 'admin') {
        document.getElementById('admin-email').value = state.adminCredentials.email;
        document.getElementById('admin-password').value = ''; // Non mostriamo la password in chiaro nel form
    }
    
    // Mostra il badge ruolo nell'header principale
    const badge = document.getElementById('role-badge');
    if (session.role === 'admin') {
        badge.className = 'badge badge-admin';
        badge.innerHTML = '<i data-lucide="shield"></i> Vista Admin (Modifiche Attive)';
    } else {
        badge.className = 'badge badge-cadetto';
        badge.innerHTML = `<i data-lucide="user"></i> ${session.name} (Cadetto - Sola Lettura)`;
    }
    
    // Re-inizializza i tab e renderizza la schermata corretta
    switchTab(state.activeTab);
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

// NAVIGATION
function switchTab(tabId) {
    // Sicurezza: i cadetti possono accedere solo alla dashboard
    if (session.role === 'cadetto' && tabId !== 'dashboard') {
        tabId = 'dashboard';
    }
    
    state.activeTab = tabId;
    
    // Aggiorna gli elementi attivi della navigazione
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Aggiorna i pannelli di contenuto
    document.querySelectorAll('.tab-pane').forEach(pane => {
        if (pane.id === `tab-${tabId}`) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
    
    // Imposta titoli e sottotitoli dell'header principale
    const titleEl = document.getElementById('tab-title');
    const subtitleEl = document.getElementById('tab-subtitle');
    
    if (tabId === 'dashboard') {
        titleEl.textContent = 'Calendario Settimanale';
        subtitleEl.textContent = 'Visualizza le assegnazioni delle mansioni per questa settimana (Venerdì - Giovedì)';
    } else if (tabId === 'persone') {
        titleEl.textContent = 'Gestione Persone';
        subtitleEl.textContent = 'Gestisci la master list e configura le credenziali d\'accesso per i cadetti';
    } else if (tabId === 'mansioni') {
        titleEl.textContent = 'Gestione Mansioni';
        subtitleEl.textContent = 'Configura le mansioni disponibili, il numero di persone richieste e la priorità';
    } else if (tabId === 'genera') {
        titleEl.textContent = 'Generatore di Calendario';
        subtitleEl.textContent = 'Procedura guidata per distribuire le mansioni della settimana';
        initWizard();
    }
    
    // Renderizza il tab
    renderTabContent(tabId);
    
    // Rigenera le icone Lucide
    lucide.createIcons();
}

// RENDERING MANAGER
function renderTabContent(tabId) {
    if (tabId === 'dashboard') {
        renderCalendar();
    } else if (tabId === 'persone') {
        renderPeople();
    } else if (tabId === 'mansioni') {
        renderTasks();
    } else if (tabId === 'genera') {
        renderWizardStep();
    }
}

// --- CREDENZIALI AMMINISTRATORE ---
function saveAdminCredentials(event) {
    event.preventDefault();
    if (session.role !== 'admin') return;
    
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    
    if (!email) return;
    
    state.adminCredentials.email = email;
    if (password) {
        state.adminCredentials.password = password;
        showToast('Email e Password dell\'amministratore aggiornate.', 'success');
    } else {
        showToast('Email dell\'amministratore aggiornata.', 'success');
    }
    
    saveState();
    
    // Pulisci il campo password
    document.getElementById('admin-password').value = '';
    
    // Aggiorna l'interfaccia
    if (session.userId === 'admin') {
        session.name = 'Amministratore';
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        applyLoginState();
    }
}

// --- PERSONS SECTION (CRUD con Credenziali) ---
function renderPeople() {
    const tbody = document.getElementById('people-table-body');
    const emptyState = document.getElementById('people-empty-state');
    tbody.innerHTML = '';
    
    if (state.people.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    emptyState.style.display = 'none';
    
    state.people.forEach(person => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="color-dot" style="background-color: ${person.color}"></span>
            </td>
            <td class="font-semibold">${escapeHTML(person.name)}</td>
            <td class="text-secondary">${person.email ? escapeHTML(person.email) : '<span class="text-muted"><i>Nessuna</i></span>'}</td>
            <td class="text-secondary">${person.password ? '••••••••' : '<span class="text-muted"><i>Nessuna</i></span>'}</td>
            <td class="actions-col">
                <div class="actions-row">
                    <button class="icon-btn icon-btn-edit" onclick="openPersonModal('${person.id}')" title="Modifica">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="icon-btn icon-btn-delete" onclick="deletePerson('${person.id}')" title="Elimina">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openPersonModal(id = null) {
    if (session.role !== 'admin') return;
    
    const modal = document.getElementById('person-modal');
    const title = document.getElementById('person-modal-title');
    const idInput = document.getElementById('person-id');
    const nameInput = document.getElementById('person-name');
    const emailInput = document.getElementById('person-email');
    const passwordInput = document.getElementById('person-password');
    const paletteContainer = document.getElementById('color-palette-container');
    
    paletteContainer.innerHTML = '';
    
    // Carica la palette colori
    COLOR_PALETTE.forEach(color => {
        const item = document.createElement('div');
        item.className = 'color-palette-item';
        item.style.backgroundColor = color;
        item.onclick = () => selectColor(color);
        paletteContainer.appendChild(item);
    });
    
    if (id) {
        const person = state.people.find(p => p.id === id);
        title.textContent = 'Modifica Persona';
        idInput.value = person.id;
        nameInput.value = person.name;
        emailInput.value = person.email || '';
        passwordInput.value = person.password || '';
        selectColor(person.color);
    } else {
        title.textContent = 'Aggiungi Persona';
        idInput.value = '';
        nameInput.value = '';
        emailInput.value = '';
        passwordInput.value = '';
        
        const randomColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
        selectColor(randomColor);
    }
    
    modal.classList.add('active');
}

function selectColor(color) {
    document.getElementById('person-color').value = color;
    document.querySelectorAll('.color-palette-item').forEach(item => {
        const rgb = item.style.backgroundColor;
        if (rgbToHex(rgb).toLowerCase() === color.toLowerCase()) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function closePersonModal() {
    document.getElementById('person-modal').classList.remove('active');
}

function savePerson(event) {
    event.preventDefault();
    if (session.role !== 'admin') return;
    
    const id = document.getElementById('person-id').value;
    const name = document.getElementById('person-name').value.trim();
    const email = document.getElementById('person-email').value.trim();
    const password = document.getElementById('person-password').value;
    
    if (!name) return;
    
    // Se viene specificata l'email, è consigliabile specificare anche la password
    if (email && !password) {
        showToast('Se inserisci un indirizzo email, devi inserire anche una password per l\'accesso.', 'warning');
        return;
    }
    
    // Controlla se l'email è già in uso (escludendo se stessi nel caso di modifica)
    if (email) {
        const emailDuplicated = state.people.some(p => p.id !== id && p.email && p.email.toLowerCase() === email.toLowerCase()) ||
                                email.toLowerCase() === state.adminCredentials.email.toLowerCase();
        if (emailDuplicated) {
            showToast('Questo indirizzo email è già utilizzato da un altro account.', 'danger');
            return;
        }
    }
    
    if (id) {
        // Modifica
        const person = state.people.find(p => p.id === id);
        if (person) {
            person.name = name;
            person.color = color;
            person.email = email || null;
            person.password = password || null;
            
            const colorInput = document.getElementById('person-color').value;
            person.color = colorInput;
            
            showToast(`Persona "${name}" aggiornata.`, 'success');
        }
    } else {
        // Aggiungi
        const newPerson = {
            id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name,
            color: document.getElementById('person-color').value,
            email: email || null,
            password: password || null
        };
        state.people.push(newPerson);
        showToast(`Persona "${name}" aggiunta alla Master List.`, 'success');
    }
    
    saveState();
    closePersonModal();
    renderPeople();
}

function deletePerson(id) {
    if (session.role !== 'admin') return;
    
    const person = state.people.find(p => p.id === id);
    if (!person) return;
    
    if (confirm(`Sei sicuro di voler eliminare ${person.name}? Verrà rimosso anche dalle assegnazioni future.`)) {
        state.people = state.people.filter(p => p.id !== id);
        
        // Rimuove da assegnazioni correnti se necessario
        if (state.currentCalendar && state.currentCalendar.assignments) {
            DAYS_OF_WEEK.forEach(day => {
                const dayAssign = state.currentCalendar.assignments[day];
                if (dayAssign) {
                    Object.keys(dayAssign).forEach(taskId => {
                        dayAssign[taskId] = dayAssign[taskId].filter(pId => pId !== id);
                    });
                }
            });
        }
        
        showToast(`Persona "${person.name}" rimossa.`, 'warning');
        saveState();
        renderPeople();
    }
}

// --- TASKS SECTION (CRUD) ---
function renderTasks() {
    const tbody = document.getElementById('tasks-table-body');
    const emptyState = document.getElementById('tasks-empty-state');
    tbody.innerHTML = '';
    
    if (state.tasks.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    emptyState.style.display = 'none';
    
    state.tasks.forEach(task => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-semibold">${escapeHTML(task.name)}</td>
            <td>
                <span class="badge badge-primary">
                    <i data-lucide="users"></i> ${task.assigneesCount} ${task.assigneesCount === 1 ? 'persona' : 'persone'}
                </span>
            </td>
            <td>
                <span class="badge badge-priority-${task.priority}">
                    ${task.priority === 'alta' ? '🔴 Alta' : task.priority === 'media' ? '🟡 Media' : '🟢 Bassa'}
                </span>
            </td>
            <td class="actions-col">
                <div class="actions-row">
                    <button class="icon-btn icon-btn-edit" onclick="openTaskModal('${task.id}')" title="Modifica">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="icon-btn icon-btn-delete" onclick="deleteTask('${task.id}')" title="Elimina">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openTaskModal(id = null) {
    if (session.role !== 'admin') return;
    
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('task-modal-title');
    const idInput = document.getElementById('task-id');
    const nameInput = document.getElementById('task-name');
    const assigneesInput = document.getElementById('task-assignees');
    const prioritySelect = document.getElementById('task-priority');
    
    if (id) {
        const task = state.tasks.find(t => t.id === id);
        title.textContent = 'Modifica Mansione';
        idInput.value = task.id;
        nameInput.value = task.name;
        assigneesInput.value = task.assigneesCount;
        prioritySelect.value = task.priority;
    } else {
        title.textContent = 'Aggiungi Mansione';
        idInput.value = '';
        nameInput.value = '';
        assigneesInput.value = 1;
        prioritySelect.value = 'media';
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
}

function saveTask(event) {
    event.preventDefault();
    if (session.role !== 'admin') return;
    
    const id = document.getElementById('task-id').value;
    const name = document.getElementById('task-name').value.trim();
    const assigneesCount = parseInt(document.getElementById('task-assignees').value);
    const priority = document.getElementById('task-priority').value;
    
    if (!name || isNaN(assigneesCount) || assigneesCount < 1) return;
    
    if (id) {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            task.name = name;
            task.assigneesCount = assigneesCount;
            task.priority = priority;
            showToast(`Mansione "${name}" aggiornata.`, 'success');
        }
    } else {
        const newTask = {
            id: 't_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name,
            assigneesCount: assigneesCount,
            priority: priority
        };
        state.tasks.push(newTask);
        showToast(`Mansione "${name}" creata.`, 'success');
    }
    
    saveState();
    closeTaskModal();
    renderTasks();
}

function deleteTask(id) {
    if (session.role !== 'admin') return;
    
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    
    if (confirm(`Sei sicuro di voler eliminare la mansione "${task.name}"? Verrà rimossa da tutti i calendari.`)) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        
        if (state.currentCalendar && state.currentCalendar.assignments) {
            DAYS_OF_WEEK.forEach(day => {
                if (state.currentCalendar.assignments[day]) {
                    delete state.currentCalendar.assignments[day][id];
                }
            });
        }
        
        showToast(`Mansione "${task.name}" rimossa.`, 'warning');
        saveState();
        renderTasks();
    }
}

// --- WIZARD GENERATORE ---
function initWizard() {
    wizardState.step = 1;
    wizardState.presents = state.people.map(p => p.id);
    wizardState.absences = {};
    state.people.forEach(p => {
        wizardState.absences[p.id] = [];
    });
}

function renderWizardStep() {
    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`indicator-step-${i}`);
        ind.className = 'wizard-step-indicator';
        if (i === wizardState.step) {
            ind.classList.add('active');
        } else if (i < wizardState.step) {
            ind.classList.add('complete');
        }
    }
    
    for (let i = 1; i <= 3; i++) {
        const pane = document.getElementById(`wizard-pane-${i}`);
        if (i === wizardState.step) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    }
    
    if (wizardState.step === 1) {
        renderWizardStep1();
    } else if (wizardState.step === 2) {
        renderWizardStep2();
    } else if (wizardState.step === 3) {
        renderWizardStep3();
    }
}

function goToWizardStep(step) {
    if (step === 2 && wizardState.step === 1) {
        const checkedBoxes = document.querySelectorAll('.wizard-people-checkbox:checked');
        if (checkedBoxes.length === 0) {
            showToast('Devi selezionare almeno una persona presente per la settimana.', 'danger');
            return;
        }
        wizardState.presents = Array.from(checkedBoxes).map(cb => cb.value);
    }
    
    wizardState.step = step;
    renderWizardStep();
    lucide.createIcons();
}

function renderWizardStep1() {
    const container = document.getElementById('wizard-people-checkboxes');
    const emptyState = document.getElementById('wizard-people-empty');
    const nextBtn = document.getElementById('btn-wizard-next-1');
    container.innerHTML = '';
    
    if (state.people.length === 0) {
        emptyState.style.display = 'flex';
        container.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    container.style.display = 'grid';
    nextBtn.style.display = 'inline-flex';
    
    state.people.forEach(person => {
        const isChecked = wizardState.presents.includes(person.id);
        const card = document.createElement('label');
        card.className = 'checkbox-card';
        card.innerHTML = `
            <input type="checkbox" value="${person.id}" class="wizard-people-checkbox" ${isChecked ? 'checked' : ''}>
            <span class="color-dot" style="background-color: ${person.color}"></span>
            <span class="checkbox-card-name">${escapeHTML(person.name)}</span>
        `;
        container.appendChild(card);
    });
}

function selectAllWizardPeople(select) {
    document.querySelectorAll('.wizard-people-checkbox').forEach(cb => {
        cb.checked = select;
    });
}

function renderWizardStep2() {
    const tbody = document.getElementById('absence-table-body');
    tbody.innerHTML = '';
    
    const presents = state.people.filter(p => wizardState.presents.includes(p.id));
    
    presents.forEach(person => {
        const tr = document.createElement('tr');
        
        let cols = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="color-dot" style="background-color: ${person.color}"></span>
                    <span>${escapeHTML(person.name)}</span>
                </div>
            </td>
        `;
        
        DAYS_OF_WEEK.forEach(day => {
            const isAbsent = (wizardState.absences[person.id] || []).includes(day);
            cols += `
                <td>
                    <input type="checkbox" class="absence-cell-checkbox" 
                           data-person-id="${person.id}" 
                           data-day="${day}" 
                           ${isAbsent ? 'checked' : ''} 
                           onchange="toggleAbsence('${person.id}', '${day}')">
                </td>
            `;
        });
        
        tr.innerHTML = cols;
        tbody.appendChild(tr);
    });
}

function toggleAbsence(personId, day) {
    if (!wizardState.absences[personId]) {
        wizardState.absences[personId] = [];
    }
    
    const index = wizardState.absences[personId].indexOf(day);
    if (index > -1) {
        wizardState.absences[personId].splice(index, 1);
    } else {
        wizardState.absences[personId].push(day);
    }
}

function renderWizardStep3() {
    document.getElementById('summary-people-count').textContent = wizardState.presents.length;
    document.getElementById('summary-tasks-count').textContent = state.tasks.length;
}

// CALENDARIO GENERATORE ALGORITMO
function generateCalendar() {
    if (state.tasks.length === 0) {
        showToast('Devi registrare almeno una mansione per generare il calendario.', 'danger');
        return;
    }
    
    const assignments = {};
    DAYS_OF_WEEK.forEach(day => {
        assignments[day] = {};
        state.tasks.forEach(task => {
            assignments[day][task.id] = [];
        });
    });
    
    const globalWorkload = {};
    wizardState.presents.forEach(pId => {
        globalWorkload[pId] = 0;
    });
    
    const sortedTasks = [...state.tasks].sort((a, b) => {
        const priorityWeight = { alta: 3, media: 2, bassa: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
    
    DAYS_OF_WEEK.forEach(day => {
        const availableToday = wizardState.presents.filter(pId => {
            const personAbsences = wizardState.absences[pId] || [];
            return !personAbsences.includes(day);
        });
        
        const dailyWorkload = {};
        availableToday.forEach(pId => {
            dailyWorkload[pId] = 0;
        });
        
        sortedTasks.forEach(task => {
            const requiredCount = task.assigneesCount;
            let assignedCount = 0;
            const chosenPeople = [];
            
            let candidates = [...availableToday];
            
            while (assignedCount < requiredCount && candidates.length > 0) {
                candidates.sort((a, b) => {
                    if (dailyWorkload[a] !== dailyWorkload[b]) {
                        return dailyWorkload[a] - dailyWorkload[b];
                    }
                    if (globalWorkload[a] !== globalWorkload[b]) {
                        return globalWorkload[a] - globalWorkload[b];
                    }
                    return Math.random() - 0.5;
                });
                
                const bestCandidate = candidates.shift();
                
                if (!chosenPeople.includes(bestCandidate)) {
                    chosenPeople.push(bestCandidate);
                    assignedCount++;
                    
                    dailyWorkload[bestCandidate] = (dailyWorkload[bestCandidate] || 0) + 1;
                    globalWorkload[bestCandidate] = (globalWorkload[bestCandidate] || 0) + 1;
                }
            }
            
            assignments[day][task.id] = chosenPeople;
        });
    });
    
    const rangeText = getWeeklyDateRangeText();
    
    state.currentCalendar = {
        startDate: rangeText,
        assignments: assignments,
        presents: [...wizardState.presents],
        absences: JSON.parse(JSON.stringify(wizardState.absences))
    };
    
    saveState();
    showToast('Nuovo Calendario Settimanale generato con successo!', 'success');
    switchTab('dashboard');
}

function getWeeklyDateRangeText() {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = (currentDay >= 5) ? (currentDay - 5) : (currentDay + 2);
    
    const friday = new Date(today);
    friday.setDate(today.getDate() - diff);
    
    const thursday = new Date(friday);
    thursday.setDate(friday.getDate() + 6);
    
    const options = { day: 'numeric', month: 'short' };
    return `Da Ven ${friday.toLocaleDateString('it-IT', options)} a Gio ${thursday.toLocaleDateString('it-IT', options)}`;
}

// --- CALENDARIO RENDER E INTERAZIONE ---
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    const dateRangeEl = document.getElementById('calendar-date-range');
    const adminActions = document.getElementById('admin-calendar-actions');
    const emptyStateBtn = document.getElementById('empty-state-generate-btn');
    
    if (session.role === 'admin') {
        emptyStateBtn.style.display = 'inline-flex';
    } else {
        emptyStateBtn.style.display = 'none';
    }
    
    if (!state.currentCalendar) {
        dateRangeEl.textContent = 'Nessun calendario generato';
        adminActions.style.display = 'none';
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar-days" class="empty-icon"></i>
                <h3>Nessun Calendario Attivo</h3>
                <p>Nessun calendario è stato ancora generato. Solo l'amministratore può generare un nuovo calendario settimanale.</p>
                <button class="btn btn-primary admin-only" onclick="switchTab('genera')" id="empty-state-generate-btn" style="${session.role === 'admin' ? '' : 'display: none;'}">
                    <i data-lucide="sparkles"></i> Genera Ora
                </button>
            </div>
        `;
        return;
    }
    
    dateRangeEl.textContent = state.currentCalendar.startDate;
    
    if (session.role === 'admin') {
        adminActions.style.display = 'flex';
        document.getElementById('calendar-container').className = 'admin-mode';
    } else {
        adminActions.style.display = 'none';
        document.getElementById('calendar-container').className = 'cadetto-mode';
    }
    
    let tableHtml = `
        <table class="calendar-table">
            <thead>
                <tr>
                    <th class="task-header">Mansione</th>
    `;
    
    DAYS_OF_WEEK.forEach(day => {
        tableHtml += `<th>${day}</th>`;
    });
    
    tableHtml += `
                </tr>
            </thead>
            <tbody>
    `;
    
    state.tasks.forEach(task => {
        tableHtml += `
            <tr>
                <td class="task-cell">
                    <div style="font-weight: 600;">${escapeHTML(task.name)}</div>
                    <span class="badge badge-priority-${task.priority}" style="font-size: 0.65rem; padding: 2px 6px; margin-top: 4px;">
                        ${task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Media' : 'Bassa'}
                    </span>
                </td>
        `;
        
        DAYS_OF_WEEK.forEach(day => {
            const assignedIds = (state.currentCalendar.assignments[day] && state.currentCalendar.assignments[day][task.id]) || [];
            
            let tagsHtml = '';
            if (assignedIds.length > 0) {
                assignedIds.forEach(pId => {
                    const person = state.people.find(p => p.id === pId);
                    if (person) {
                        const isAbsent = (state.currentCalendar.absences && state.currentCalendar.absences[pId] || []).includes(day);
                        tagsHtml += `
                            <span class="person-tag" style="background-color: ${person.color}" title="${escapeHTML(person.name)} ${isAbsent ? '(Segnato come assente!)' : ''}">
                                ${isAbsent ? '<span class="absence-warning"></span>' : ''}
                                <span class="person-tag-dot"></span>
                                <span>${escapeHTML(person.name)}</span>
                            </span>
                        `;
                    }
                });
            } else {
                tagsHtml = `<span class="empty-cell-text">- Libero -</span>`;
            }
            
            tableHtml += `
                <td class="assignee-cell" onclick="handleCellClick('${day}', '${task.id}')">
                    <div class="assignee-tags-container">
                        ${tagsHtml}
                    </div>
                </td>
            `;
        });
        
        tableHtml += `</tr>`;
    });
    
    tableHtml += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHtml;
}

function handleCellClick(day, taskId) {
    if (session.role !== 'admin') return; // Sola lettura per Cadetto
    
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    activeEditCell.day = day;
    activeEditCell.taskId = taskId;
    
    const modal = document.getElementById('edit-cell-modal');
    const info = document.getElementById('edit-cell-info');
    info.textContent = `Modifica l'assegnazione per "${task.name}" nel giorno di ${day}.`;
    
    const container = document.getElementById('edit-cell-people-list');
    container.innerHTML = '';
    
    const currentAssigned = state.currentCalendar.assignments[day][taskId] || [];
    const weekPresents = state.currentCalendar.presents || [];
    
    if (weekPresents.length === 0) {
        container.innerHTML = `<div class="text-muted">Nessuna persona disponibile questa settimana.</div>`;
        return;
    }
    
    state.people.filter(p => weekPresents.includes(p.id)).forEach(person => {
        const isAssigned = currentAssigned.includes(person.id);
        const isAbsent = (state.currentCalendar.absences && state.currentCalendar.absences[person.id] || []).includes(day);
        
        const row = document.createElement('label');
        row.className = 'edit-cell-person-row';
        row.innerHTML = `
            <input type="checkbox" value="${person.id}" class="edit-cell-person-checkbox" ${isAssigned ? 'checked' : ''}>
            <div class="edit-cell-person-label">
                <span class="color-dot" style="background-color: ${person.color}"></span>
                <span>${escapeHTML(person.name)}</span>
                ${isAbsent ? '<span class="badge badge-priority-alta" style="font-size:0.6rem; padding: 2px 6px;">Assente oggi</span>' : ''}
            </div>
        `;
        container.appendChild(row);
    });
    
    modal.classList.add('active');
}

function closeEditCellModal() {
    document.getElementById('edit-cell-modal').classList.remove('active');
}

function saveCellChanges() {
    if (session.role !== 'admin') return;
    
    const { day, taskId } = activeEditCell;
    if (!day || !taskId) return;
    
    const checkboxes = document.querySelectorAll('.edit-cell-person-checkbox:checked');
    const newAssignedIds = Array.from(checkboxes).map(cb => cb.value);
    
    state.currentCalendar.assignments[day][taskId] = newAssignedIds;
    saveState();
    
    closeEditCellModal();
    renderCalendar();
    showToast('Assegnazione aggiornata con successo.', 'success');
}

function clearCurrentCalendar() {
    if (session.role !== 'admin') return;
    
    if (confirm('Sei sicuro di voler cancellare il calendario corrente? L\'azione è irreversibile.')) {
        state.currentCalendar = null;
        saveState();
        renderCalendar();
        showToast('Calendario cancellato.', 'warning');
    }
}

// --- UTILITIES & BACKUP ---
function exportData() {
    if (session.role !== 'admin') return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "choreflow_backup.json");
    dlAnchorElem.click();
    showToast('Esportazione completata.', 'success');
}

function importData(event) {
    if (session.role !== 'admin') return;
    const fileReader = new FileReader();
    fileReader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            
            if (Array.isArray(imported.people) && Array.isArray(imported.tasks) && imported.adminCredentials) {
                state = imported;
                saveState();
                
                // Aggiorniamo le credenziali se l'admin le ha caricate
                applyLoginState();
                showToast('Dati importati con successo!', 'success');
            } else {
                showToast('Formato file JSON non valido o mancante di dati essenziali.', 'danger');
            }
        } catch (error) {
            showToast('Errore durante il parsing del file JSON.', 'danger');
        }
    };
    if (event.target.files[0]) {
        fileReader.readAsText(event.target.files[0]);
    }
}

function printCalendar() {
    window.print();
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'danger') iconName = 'x-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${escapeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function rgbToHex(rgb) {
    if (!rgb) return '';
    if (rgb.startsWith('#')) return rgb;
    
    const parts = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!parts) return rgb;
    
    delete (parts[0]);
    for (let i = 1; i <= 3; ++i) {
        parts[i] = parseInt(parts[i]).toString(16);
        if (parts[i].length == 1) parts[i] = '0' + parts[i];
    }
    return '#' + parts.join('');
}
