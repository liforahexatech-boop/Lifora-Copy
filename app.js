// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}// Lifora AI Emergency Healthcare Platform - Logic & Simulation Center

// Global Application State
const STATE = {
    // Current Active SOS details
    activeSOS: null,
    
    // EHR Vault — default patient profile
    ehr: {
        fullName:   'Deepak Jha',
        dob:        '2000-10-31',
        bloodGroup: 'O+',
        hasAllergies: 'no',
        allergies:  '',
        medications: 'None',
        conditions: 'None',
        iceContact: '+977 9708027325'
    },

    // Chatbot context
    chatHistory: [
        { sender: 'bot', text: 'Hello! I am your AI Emergency Triage Assistant. How can I help you? (Ask me about CPR, bleeding, heart attacks, or general symptoms)' }
    ],

    // Blood requests list
    bloodRequests: [],
    
    // Blood inventory mock
    bloodInventory: {
        'A+': 12, 'A-': 4, 'B+': 18, 'B-': 6, 'O+': 24, 'O-': 8, 'AB+': 5, 'AB-': 2
    }
};

// First Aid Instructions Library
const FIRST_AID_LIB = {
    cpr: {
        title: 'Cardiopulmonary Resuscitation (CPR)',
        steps: [
            'Check scene safety and responsiveness.',
            'Call emergency services (108/911) immediately.',
            'Place hands in the center of the chest.',
            'Push hard and fast: 100-120 compressions per minute (to the beat of "Staying Alive").',
            'Give rescue breaths if trained (30 compressions to 2 breaths).'
        ]
    },
    bleeding: {
        title: 'Severe Bleeding Control',
        steps: [
            'Wear protective gloves if available.',
            'Apply direct pressure to the wound with a clean cloth or bandage.',
            'Maintain pressure until bleeding stops.',
            'Elevate the injured limb above heart level if possible.',
            'Apply a tourniquet if bleeding is life-threatening and direct pressure fails.'
        ]
    },
    burns: {
        title: 'Burns Treatment',
        steps: [
            'Cool the burn immediately with cool running water for 10-20 minutes.',
            'Do NOT use ice, butter, or ointments on the burn.',
            'Remove jewelry or tight clothing before swelling starts.',
            'Cover the burn loosely with a sterile, non-stick bandage.',
            'Seek medical attention for chemical, electrical, or severe burns.'
        ]
    },
    stroke: {
        title: 'Stroke (F.A.S.T. Protocol)',
        steps: [
            '**F**ace: Ask the person to smile. Does one side of the face droop?',
            '**A**rms: Ask the person to raise both arms. Does one arm drift downward?',
            '**S**peech: Ask the person to repeat a simple sentence. Is their speech slurred?',
            '**T**ime: If any signs are present, call emergency services immediately.'
        ]
    },
    heartattack: {
        title: 'Heart Attack Protocol',
        steps: [
            'Have the person sit down, rest, and try to keep calm.',
            'Loosen any tight clothing.',
            'Ask if they take chest pain medication (like nitroglycerin) and help them take it.',
            'If conscious, have them chew an adult aspirin (325mg) if not allergic.',
            'Be prepared to start CPR if they become unresponsive.'
        ]
    }
};

// Triage Questions based on Emergency Category
const TRIAGE_QUESTIONS = {
    cardiac: [
        { text: 'Is the patient conscious and responsive?', type: 'boolean', weight: 4 },
        { text: 'Is the patient experiencing severe crushing chest pain radiating to the arm/jaw?', type: 'boolean', weight: 4 },
        { text: 'Is the patient having extreme difficulty breathing?', type: 'boolean', weight: 3 },
        { text: 'Is the patient cold, clammy, or turning blue?', type: 'boolean', weight: 2 }
    ],
    accident: [
        { text: 'Is the patient conscious?', type: 'boolean', weight: 3 },
        { text: 'Is there active, heavy, spurting bleeding that cannot be stopped?', type: 'boolean', weight: 4 },
        { text: 'Does the patient have a suspected spinal or head injury?', type: 'boolean', weight: 3 },
        { text: 'Is the patient experiencing severe limb deformity or open fracture?', type: 'boolean', weight: 2 }
    ],
    blood: [
        { text: 'Is this an active hemorrhagic shock condition (massive blood loss)?', type: 'boolean', weight: 4 },
        { text: 'What is the required blood group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], weight: 0 },
        { text: 'How many units are required immediately?', type: 'number', weight: 0 }
    ],
    general: [
        { text: 'Is the patient experiencing high fever with stiffness or confusion?', type: 'boolean', weight: 2 },
        { text: 'Is there severe abdominal pain or constant vomiting?', type: 'boolean', weight: 2 },
        { text: 'Is the patient able to stand or speak coherently?', type: 'boolean', weight: 1 }
    ]
};

// ─── Utility: stamp dark theme directly onto any form element ───────────────
// CSS alone cannot reliably override the OS-native dropdown popup in every
// browser. We must set these properties directly via the element's style.
function applyDarkInputStyle(el) {
    el.style.width           = '100%';
    el.style.background      = '#0d1222';
    el.style.backgroundColor = '#0d1222';
    el.style.color           = '#ffffff';
    el.style.border          = '1px solid rgba(255, 255, 255, 0.12)';
    el.style.borderRadius    = '8px';
    el.style.padding         = '10px 14px';
    el.style.fontFamily      = 'var(--font-body, sans-serif)';
    el.style.fontSize        = '14px';
    el.style.colorScheme     = 'dark';   // forces OS dark picker popup
    el.style.outline         = 'none';
    el.style.appearance      = 'auto';   // keep native arrow for selects
    el.addEventListener('focus', () => {
        el.style.borderColor = '#0a84ff';
        el.style.boxShadow   = '0 0 0 3px rgba(10, 132, 255, 0.15)';
    });
    el.addEventListener('blur', () => {
        el.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        el.style.boxShadow   = 'none';
    });
}
// ─────────────────────────────────────────────────────────────────────────────

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Load EHR from LocalStorage if exists
    const storedEHR = localStorage.getItem('lifora_ehr');
    if (storedEHR) {
        STATE.ehr = JSON.parse(storedEHR);
    }
    
    // Initialize UI Elements
    initEhrForm();
    generateQR();
    renderChat();
    switchTab('public'); // Default active role
    updateDashboardViews();

    // Attach Event Listeners
    setupSOSButtons();
});

// Setup Modals
function openModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.style.display = 'flex';
        setTimeout(() => backdrop.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (backdrop) {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.style.display = 'none', 300);
    }
    // Reset wizard step-1 pill visibility in case it was hidden by a skip
    if (modalId === 'sos-modal') {
        const step1Pill = document.getElementById('step-pill-1');
        if (step1Pill) step1Pill.style.display = '';
    }
}

// Global modal closer when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
    }
};

// --- EMERGENCY SOS TRIAGE WIZARD ---
let currentWizardStep = 1;
let currentTriageCategory = 'general';
let triageAnswers = [];

function setupSOSButtons() {
    const sosTrigger = document.querySelectorAll('.btn-sos-trigger');
    sosTrigger.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category') || 'general';
            // Cards with data-skip-selection jump straight to triage questions;
            // the generic hero SOS button still shows the category picker.
            const skipStep1 = btn.getAttribute('data-skip-selection') === 'true';
            startSOSWizard(category, skipStep1);
        });
    });
}

function startSOSWizard(category, skipStep1 = false) {
    currentWizardStep = skipStep1 ? 2 : 1;
    currentTriageCategory = category;
    triageAnswers = [];

    // Update modal title to reflect the chosen category immediately
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        const labels = {
            general:  'Medical Emergency Triage',
            accident: 'Road Accident Triage',
            blood:    'Blood Transfusion Triage'
        };
        categoryTitle.textContent = labels[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Emergency Triage';
    }

    // When skipping Step 1, hide the step-pill for step 1 so the progress bar
    // starts cleanly at Step 2 and feels intentional, not broken.
    const step1Pill = document.getElementById('step-pill-1');
    if (step1Pill) {
        step1Pill.style.display = skipStep1 ? 'none' : '';
    }
    const stepLine = document.querySelector('.wizard-steps::before');
    // (pseudo-elements can't be toggled via JS; the visual impact is minimal)

    renderTriageQuestions();
    updateWizardUI();
    openModal('sos-modal');
}

function renderTriageQuestions() {
    const container = document.getElementById('triage-questions-container');
    if (!container) return;
    
    container.innerHTML = '';
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    
    questions.forEach((q, idx) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = q.text;
        group.appendChild(label);
        
        if (q.type === 'boolean') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            select.innerHTML = `
                <option value="no">No</option>
                <option value="yes">Yes</option>
            `;
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'select') {
            const select = document.createElement('select');
            select.id = `triage-q-${idx}`;
            q.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                select.appendChild(o);
            });
            applyDarkInputStyle(select);
            group.appendChild(select);
        } else if (q.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `triage-q-${idx}`;
            input.value = 1;
            input.min = 1;
            applyDarkInputStyle(input);
            group.appendChild(input);
        }
        
        container.appendChild(group);
    });
}

function updateWizardUI() {
    // Update step pills
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`step-pill-${i}`);
        if (!pill) continue;
        pill.className = 'wizard-step';
        if (i === currentWizardStep) {
            pill.classList.add('active');
        } else if (i < currentWizardStep) {
            pill.classList.add('completed');
        }
    }

    // Toggle panels
    for (let i = 1; i <= 3; i++) {
        const stepView = document.getElementById(`wizard-step-view-${i}`);
        if (stepView) {
            stepView.classList.remove('active');
        }
    }
    const currentView = document.getElementById(`wizard-step-view-${currentWizardStep}`);
    if (currentView) currentView.classList.add('active');

    // Button states
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if (prevBtn && nextBtn) {
        if (currentWizardStep === 1) {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next ➔';
        } else if (currentWizardStep === 2) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Calculate Triage & Dispatch 🚑';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Close Wizard';
        }
    }
}

function handleWizardNext() {
    if (currentWizardStep === 1) {
        // Moving from Category selector to Questionnaire
        currentWizardStep = 2;
        updateWizardUI();
    } else if (currentWizardStep === 2) {
        // Process results & Trigger dispatch simulation
        processTriageResults();
        currentWizardStep = 3;
        updateWizardUI();
        simulateDispatch();
    } else {
        closeModal('sos-modal');
    }
}

function handleWizardPrev() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
    }
}

function selectTriageCategory(category) {
    currentTriageCategory = category;
    const categoryTitle = document.getElementById('triage-category-title');
    if (categoryTitle) {
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Emergency Triage";
    }
    renderTriageQuestions();
    
    // Highlight selected card visual
    const cards = document.querySelectorAll('.triage-select-card');
    cards.forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        if (c.getAttribute('data-category') === category) {
            c.style.borderColor = 'var(--blue-accent)';
        }
    });
}

function processTriageResults() {
    const questions = TRIAGE_QUESTIONS[currentTriageCategory] || TRIAGE_QUESTIONS.general;
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach((q, idx) => {
        const inputEl = document.getElementById(`triage-q-${idx}`);
        if (!inputEl) return;
        
        let answer = inputEl.value;
        if (q.type === 'boolean') {
            maxPossibleScore += q.weight;
            if (answer === 'yes') {
                totalScore += q.weight;
            }
        }
    });

    // Score classification
    let triageLevel = 'GREEN';
    let triageColor = 'var(--green-accent)';
    let triageDescription = 'Non-Urgent Case';
    
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    if (percentage >= 75) {
        triageLevel = 'RED';
        triageColor = 'var(--red-accent)';
        triageDescription = 'Critical Condition - Immediate Resuscitation Needed';
    } else if (percentage >= 50) {
        triageLevel = 'ORANGE';
        triageColor = 'var(--orange-accent)';
        triageDescription = 'Emergent - High Priority Care Needed';
    } else if (percentage >= 25) {
        triageLevel = 'YELLOW';
        triageColor = '#ffdf00'; // Yellow
        triageDescription = 'Urgent - Medical Review Needed soon';
    }

    // Set mock dispatch profile
    const etaVal = Math.floor(Math.random() * 8) + 4; // 4 to 12 mins
    const ambVal = "AMB-" + Math.floor(1000 + Math.random() * 9000);
    const hospitals = ['City General Trauma Center', 'Metro Heart & Lung Institute', 'Apex Multi-specialty Hospital'];
    const chosenHospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    STATE.activeSOS = {
        type: currentTriageCategory,
        triageLevel: triageLevel,
        triageColor: triageColor,
        triageDescription: triageDescription,
        patientName: STATE.ehr.fullName,
        location: 'Sector 4, Main Highway Intersection (Simulated GPS Coordinates)',
        eta: etaVal,
        ambulanceCode: ambVal,
        hospital: chosenHospital,
        summary: `Patient ${STATE.ehr.fullName} presents with ${currentTriageCategory} issues. Triage level: ${triageLevel} (${triageDescription}). Relevant history: Allergies: ${STATE.ehr.allergies || 'None'}.`
    };

    // Update active emergency banner on home page if present
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = triageColor;
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-indicator red" style="color:${triageColor}; background:rgba(255,255,255,0.05)">ACTIVE SOS - ${triageLevel}</span>
                    <strong style="margin-left:12px;">Ambulance ${ambVal} dispatched. ETA: ${etaVal} mins to ${chosenHospital}.</strong>
                </div>
                <button class="btn btn-secondary" onclick="cancelActiveSOS()" style="padding: 6px 12px; font-size:12px;">Cancel Emergency</button>
            </div>
        `;
    }
    
    // Pulse hero SOS button to show ongoing status
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.add('pulse-emergency');
        mainSosBtn.innerHTML = `🚨 Active ${triageLevel} SOS`;
    }

    // Populate Triage result view
    document.getElementById('result-triage-badge').textContent = triageLevel;
    document.getElementById('result-triage-badge').style.background = triageColor;
    document.getElementById('result-triage-desc').textContent = triageDescription;
    document.getElementById('result-hospital').textContent = chosenHospital;
    document.getElementById('result-ambulance').textContent = ambVal;
    document.getElementById('result-eta').textContent = `${etaVal} minutes`;

    // Sync data immediately to other dashboards
    updateDashboardViews();
}

function simulateDispatch() {
    const bar = document.getElementById('dispatch-bar');
    const statusText = document.getElementById('dispatch-status-text');
    if (!bar || !statusText) return;

    bar.style.width = '0%';
    statusText.textContent = 'Contacting closest responders...';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        
        if (progress === 25) {
            statusText.textContent = `AI allocated dispatch to ${STATE.activeSOS.ambulanceCode}...`;
        } else if (progress === 50) {
            statusText.textContent = `Medical summary securely shared with ${STATE.activeSOS.hospital}...`;
        } else if (progress === 75) {
            statusText.textContent = `Route navigation optimized. Heading to patient location...`;
        } else if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = `Responder En Route. ETA: ${STATE.activeSOS.eta} mins.`;
        }
    }, 200);
}

function cancelActiveSOS() {
    STATE.activeSOS = null;
    
    // Hide banner
    const banner = document.getElementById('active-emergency-banner');
    if (banner) {
        banner.style.display = 'none';
    }

    // Reset Hero button
    const mainSosBtn = document.getElementById('main-sos-btn');
    if (mainSosBtn) {
        mainSosBtn.classList.remove('pulse-emergency');
        mainSosBtn.innerHTML = `🚑 Emergency SOS`;
    }

    updateDashboardViews();
    alert('SOS Emergency has been cancelled. Responders have been recalled.');
}


// --- DYNAMIC ROLE DASHBOARD SIMULATOR ---
function switchTab(tabId) {
    // Handle tab buttons active classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Toggle panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => {
        p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

function updateDashboardViews() {
    const sos = STATE.activeSOS;

    // --- 1. PUBLIC/USER DASHBOARD VIEW ---
    const publicActiveDiv = document.getElementById('pub-active-sos-view');
    const publicEmptyDiv = document.getElementById('pub-empty-sos-view');
    if (publicActiveDiv && publicEmptyDiv) {
        if (sos) {
            publicEmptyDiv.style.display = 'none';
            publicActiveDiv.style.display = 'block';
            document.getElementById('pub-sos-level').textContent = sos.triageLevel;
            document.getElementById('pub-sos-level').style.background = sos.triageColor;
            document.getElementById('pub-sos-hospital').textContent = sos.hospital;
            document.getElementById('pub-sos-ambulance').textContent = sos.ambulanceCode;
            document.getElementById('pub-sos-eta').textContent = `${sos.eta} mins`;
        } else {
            publicEmptyDiv.style.display = 'flex';
            publicActiveDiv.style.display = 'none';
        }
    }

    // --- 2. AMBULANCE STAFF VIEW ---
    const ambActiveDiv = document.getElementById('amb-active-view');
    const ambEmptyDiv = document.getElementById('amb-empty-view');
    if (ambActiveDiv && ambEmptyDiv) {
        if (sos) {
            ambEmptyDiv.style.display = 'none';
            ambActiveDiv.style.display = 'block';
            document.getElementById('amb-pat-name').textContent = sos.patientName;
            document.getElementById('amb-pat-triage').textContent = sos.triageLevel;
            document.getElementById('amb-pat-triage').style.background = sos.triageColor;
            document.getElementById('amb-pat-loc').textContent = sos.location;
            document.getElementById('amb-pat-dest').textContent = sos.hospital;
            document.getElementById('amb-pat-history').textContent = STATE.ehr.conditions || 'None';
            document.getElementById('amb-pat-allergies').textContent = STATE.ehr.allergies || 'None';
        } else {
            ambEmptyDiv.style.display = 'flex';
            ambActiveDiv.style.display = 'none';
        }
    }

    // --- 3. HOSPITAL ER DASHBOARD ---
    const hospActiveDiv = document.getElementById('hosp-active-view');
    const hospEmptyDiv = document.getElementById('hosp-empty-view');
    if (hospActiveDiv && hospEmptyDiv) {
        if (sos) {
            hospEmptyDiv.style.display = 'none';
            hospActiveDiv.style.display = 'block';
            document.getElementById('hosp-incoming-name').textContent = sos.patientName;
            document.getElementById('hosp-incoming-triage').textContent = sos.triageLevel;
            document.getElementById('hosp-incoming-triage').style.background = sos.triageColor;
            document.getElementById('hosp-incoming-eta').textContent = `${sos.eta} mins`;
            document.getElementById('hosp-incoming-summary').textContent = sos.summary;
        } else {
            hospEmptyDiv.style.display = 'flex';
            hospActiveDiv.style.display = 'none';
        }
    }

    // --- 4. BLOOD BANK DASHBOARD ---
    const bloodReqList = document.getElementById('blood-req-list');
    if (bloodReqList) {
        bloodReqList.innerHTML = '';
        
        let allRequests = [...STATE.bloodRequests];
        if (sos && sos.type === 'blood') {
            // Auto add to requirements queue if SOS type is blood
            allRequests.unshift({
                patient: sos.patientName,
                group: 'O+', // default
                units: 2,
                location: sos.hospital,
                status: 'Urgent Dispatch'
            });
        }

        if (allRequests.length === 0) {
            bloodReqList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🩸</span>
                    <p>No active hospital blood requests at this moment.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            allRequests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>Need Blood Group: ${req.group}</h5>
                        <p>Hospital: ${req.location} | Units Required: ${req.units}</p>
                    </div>
                    <span class="data-row-badge critical">${req.status}</span>
                `;
                listWrapper.appendChild(row);
            });
            bloodReqList.appendChild(listWrapper);
        }
    }

    // Update Blood Inventory Table
    const invBody = document.getElementById('blood-inventory-body');
    if (invBody) {
        invBody.innerHTML = '';
        Object.entries(STATE.bloodInventory).forEach(([grp, qty]) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight:700;">${grp}</td>
                <td style="padding: 10px;">${qty} Units</td>
                <td style="padding: 10px; text-align:right;">
                    <span class="status-indicator" style="background:rgba(48,209,88,0.1); color:var(--green-accent)">Available</span>
                </td>
            `;
            invBody.appendChild(tr);
        });
    }

    // --- 5. DONOR DASHBOARD VIEW ---
    const donorReqs = document.getElementById('donor-requests');
    if (donorReqs) {
        donorReqs.innerHTML = '';
        let activeUrgentReqs = [];
        
        if (sos && (sos.type === 'blood' || sos.triageLevel === 'RED')) {
            activeUrgentReqs.push({
                location: sos.hospital,
                bloodGroup: STATE.ehr.bloodGroup || 'O+',
                units: 2,
                urgency: 'Immediate'
            });
        }

        if (activeUrgentReqs.length === 0) {
            donorReqs.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">❤️</span>
                    <p>No urgent blood request matches in your vicinity.</p>
                </div>
            `;
        } else {
            const listWrapper = document.createElement('div');
            listWrapper.className = 'data-list';
            activeUrgentReqs.forEach(req => {
                const row = document.createElement('div');
                row.className = 'data-row high-priority';
                row.innerHTML = `
                    <div class="data-row-info">
                        <h5>URGENT match required: ${req.bloodGroup}</h5>
                        <p>Hospital: ${req.location} | Urgency: ${req.urgency}</p>
                    </div>
                    <button class="btn btn-danger" onclick="acceptDonationMatch()" style="padding: 6px 12px; font-size: 11px;">I Can Donate</button>
                `;
                listWrapper.appendChild(row);
            });
            donorReqs.appendChild(listWrapper);
        }
    }
}

function acceptDonationMatch() {
    alert("Thank you! Your donation profile has been sent to the hospital. AI has scheduled your dispatch window. Check SMS for digital transit pass.");
}


// --- SYMPTOM BOT / AI ASSISTANT CHAT ---
function renderChat() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    list.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.sender}`;
        
        // Simple MD-like bold rendering helper
        let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bubble.innerHTML = formattedText;
        
        list.appendChild(bubble);
    });

    // Scroll to bottom
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    STATE.chatHistory.push({ sender: 'user', text: userText });
    input.value = '';
    renderChat();

    // Trigger AI response simulation
    setTimeout(() => {
        const botResponse = generateBotResponse(userText.toLowerCase());
        STATE.chatHistory.push({ sender: 'bot', text: botResponse });
        renderChat();
    }, 600);
}

function generateBotResponse(input) {
    if (input.includes('cpr')) {
        return `Here are the steps for **CPR (Cardiopulmonary Resuscitation)**: <br><br>` + 
               FIRST_AID_LIB.cpr.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> *Warning: If chest pain is active, launch SOS immediately!*`;
    }
    if (input.includes('bleed') || input.includes('blood') || input.includes('hemorrhage')) {
        return `For **Severe Bleeding**: <br><br>` + 
               FIRST_AID_LIB.bleeding.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('burn')) {
        return `For **Burn Injuries**: <br><br>` + 
               FIRST_AID_LIB.burns.steps.map((s, i) => `${i+1}. ${s}`).join('<br>');
    }
    if (input.includes('stroke') || input.includes('paralysis') || input.includes('slur')) {
        return `For suspected **Stroke**, act **FAST**: <br><br>` + 
               FIRST_AID_LIB.stroke.steps.map((s) => `- ${s}`).join('<br>');
    }
    if (input.includes('heart attack') || input.includes('chest pain') || input.includes('cardiac')) {
        return `For **Heart Attack** symptoms: <br><br>` + 
               FIRST_AID_LIB.heartattack.steps.map((s, i) => `${i+1}. ${s}`).join('<br>') + 
               `<br><br> **CRITICAL: Please click the Emergency SOS button immediately if this is active!**`;
    }
    
    // Fallback emergency general guidelines
    return `I've analyzed your symptoms. If the patient is experiencing shortness of breath, severe pain, loss of consciousness, or massive blood loss, **please click the red "Emergency SOS" button immediately** to dispatch responders. <br><br> For first-aid tutorials, you can ask me: "How to perform CPR?", "How to treat burns?", or "F.A.S.T. stroke test".`;
}

// Allow Enter key to send chat messages
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}


// --- MEDICAL VAULT & DYNAMIC QR GENERATOR ---
function initEhrForm() {
    const ehr = STATE.ehr;
    document.getElementById('vault-name').value        = ehr.fullName    || '';
    document.getElementById('vault-dob').value         = ehr.dob         || '';
    document.getElementById('vault-blood').value       = ehr.bloodGroup  || 'O+';
    document.getElementById('vault-ice').value         = ehr.iceContact  || '';
    document.getElementById('vault-allergies').value   = ehr.allergies   || '';
    document.getElementById('vault-meds').value        = ehr.medications || '';
    document.getElementById('vault-conditions').value  = ehr.conditions  || '';

    const hasAllergyEl = document.getElementById('vault-has-allergies');
    if (hasAllergyEl) {
        hasAllergyEl.value = ehr.hasAllergies || 'no';
        toggleAllergyField(hasAllergyEl.value);

        hasAllergyEl.addEventListener('change', () => {
            toggleAllergyField(hasAllergyEl.value);
        });
    }
}

function toggleAllergyField(value) {
    const group = document.getElementById('vault-allergies-group');
    if (group) {
        group.style.display = value === 'yes' ? '' : 'none';
    }
}

function saveEHR() {
    const name        = document.getElementById('vault-name').value.trim();
    const dob         = document.getElementById('vault-dob').value;
    const blood       = document.getElementById('vault-blood').value;
    const hasAllergy  = document.getElementById('vault-has-allergies').value;
    const allergies   = hasAllergy === 'yes' ? document.getElementById('vault-allergies').value.trim() : '';
    const meds        = document.getElementById('vault-meds').value.trim();
    const conditions  = document.getElementById('vault-conditions').value.trim();
    const ice         = document.getElementById('vault-ice').value.trim();

    if (!name) {
        alert('Full Name is required to generate your emergency profile card.');
        return;
    }

    STATE.ehr = { fullName: name, dob, bloodGroup: blood, hasAllergies: hasAllergy, allergies, medications: meds, conditions, iceContact: ice };
    localStorage.setItem('lifora_ehr', JSON.stringify(STATE.ehr));

    // Refresh QR and preview panel
    generateQR();
    updateDashboardViews();

    alert('\u2705 Smart Medical Vault saved! QR code updated with your latest emergency profile.');
}

function generateQR() {
    const qrImage      = document.getElementById('vault-qr-image');
    const qrName       = document.getElementById('vault-qr-name');
    const qrMeta       = document.getElementById('vault-qr-meta');
    const qrConditions = document.getElementById('vault-qr-conditions');
    const badgeBlood   = document.getElementById('qr-badge-blood');
    const badgeAllergy = document.getElementById('qr-badge-allergy');

    if (!qrImage) return;

    const ehr = STATE.ehr;

    // Update name display
    if (qrName) qrName.textContent = ehr.fullName;

    // Format DOB for display: yyyy-mm-dd → dd/mm/yyyy
    const dobDisplay = ehr.dob
        ? ehr.dob.split('-').reverse().join('/')
        : '—';

    // Update meta line
    if (qrMeta) qrMeta.textContent = `DOB: ${dobDisplay} | ICE: ${ehr.iceContact || '—'}`;

    // Update conditions line
    if (qrConditions) qrConditions.textContent = `Conditions: ${ehr.conditions || 'None'}`;

    // Update blood badge
    if (badgeBlood) badgeBlood.textContent = `\uD83E\uDE78 ${ehr.bloodGroup}`;

    // Update allergy badge
    if (badgeAllergy) {
        const hasAllergies = ehr.hasAllergies === 'yes' && ehr.allergies;
        badgeAllergy.textContent      = hasAllergies ? `\u26A0\uFE0F ${ehr.allergies}` : '\u2705 No Allergies';
        badgeAllergy.style.background = hasAllergies ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.12)';
        badgeAllergy.style.color      = hasAllergies ? '#ff9f0a' : '#30d158';
    }

    // ── QR payload: encode as clean plain text so ANY phone scanner reads it ──
    // file:// URLs are unreachable on phones; formatted text works everywhere.
    const allergyLine = ehr.hasAllergies === 'yes' && ehr.allergies
        ? `ALLERGIES   : ${ehr.allergies}`
        : 'ALLERGIES   : No known drug allergies';

    const qrText = [
        '==============================',
        '  LIFORA EMERGENCY MEDICAL ID ',
        '==============================',
        `NAME        : ${ehr.fullName}`,
        `DATE OF BIRTH: ${dobDisplay}`,
        `BLOOD GROUP : ${ehr.bloodGroup}`,
        allergyLine,
        `MEDICATIONS : ${ehr.medications || 'None'}`,
        `CONDITIONS  : ${ehr.conditions  || 'None'}`,
        '------------------------------',
        `ICE CONTACT : ${ehr.iceContact  || '—'}`,
        '==============================',
        'Powered by Lifora AI Platform'
    ].join('\n');

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}&color=000000&bgcolor=ffffff&margin=6`;
}

// Open the patient card page in a new tab with current EHR data
function openPatientCard() {
    const ehr = STATE.ehr;
    const dobDisplay = ehr.dob ? ehr.dob.split('-').reverse().join('/') : '—';
    const basePath = window.location.href.replace(/\/[^\/]*$/, '/');
    const url = basePath + 'patient-card.html?' + new URLSearchParams({
        name:       ehr.fullName,
        dob:        dobDisplay,
        blood:      ehr.bloodGroup,
        allergies:  ehr.hasAllergies === 'yes' ? (ehr.allergies || 'None') : 'No known allergies',
        meds:       ehr.medications  || 'None',
        conditions: ehr.conditions   || 'None',
        ice:        ehr.iceContact   || '—'
    }).toString();
    window.open(url, '_blank');
}


// --- BLOOD SEARCH DIALOG ---
function openBloodSearch() {
    // Populate form with empty results placeholder
    const list = document.getElementById('blood-search-results');
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🩸</span>
                <p>Select a blood group and click Search to check current real-time inventory.</p>
            </div>
        `;
    }
    openModal('blood-modal');
}

function runBloodSearch() {
    const selectedGroup = document.getElementById('blood-search-group').value;
    const qty = STATE.bloodInventory[selectedGroup] || 0;
    const results = document.getElementById('blood-search-results');
    
    if (!results) return;

    results.innerHTML = '';
    
    if (qty > 0) {
        results.innerHTML = `
            <div class="data-list">
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>City Central Blood Bank</h5>
                        <p>Availability: <strong>${qty} units</strong> of ${selectedGroup} | Distance: 2.4 km</p>
                    </div>
                    <span class="data-row-badge" style="background:rgba(48,209,88,0.15); color:var(--green-accent)">Stock OK</span>
                </div>
                <div class="data-row" style="border-left-color: var(--green-accent);">
                    <div class="data-row-info">
                        <h5>Red Cross Society Bank</h5>
                        <p>Availability: <strong>${Math.max(1, qty - 3)} units</strong> of ${selectedGroup} | Distance: 4.8 km</p>
                    </div>
                    <span class="status-indicator">Matches Found</span>
                </div>
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <p style="font-size: 11px; color: var(--text-secondary); margin-bottom:12px;">Database not connected. Displaying local simulated blood inventory.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="width: 100%;">Create Urgent Request</button>
            </div>
        `;
    } else {
        results.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p>Critical: No stock matches for ${selectedGroup} in local inventory. Click below to alert donors.</p>
                <button class="btn btn-danger" onclick="requestBloodAllocation('${selectedGroup}')" style="margin-top: 12px;">Trigger Donor Alert</button>
            </div>
        `;
    }
}

function requestBloodAllocation(group) {
    const units = 2; // default
    const hospital = STATE.activeSOS ? STATE.activeSOS.hospital : 'City General Trauma Center';
    
    // Add request to STATE
    STATE.bloodRequests.unshift({
        patient: STATE.ehr.fullName,
        group: group,
        units: units,
        location: hospital,
        status: 'Awaiting Donor'
    });

    closeModal('blood-modal');
    updateDashboardViews();

    alert(`Urgent request for blood group ${group} has been broadcasted to all nearby banks and registered ${group} donors! Status updated in Blood Bank dashboard.`);
}


// --- FIRST AID GUIDE VIEW ---
function showFirstAidGuide(guideId) {
    const guide = FIRST_AID_LIB[guideId];
    if (!guide) return;

    const modalTitle = document.getElementById('firstaid-modal-title');
    const modalBody = document.getElementById('firstaid-modal-body');

    if (modalTitle && modalBody) {
        modalTitle.textContent = `First Aid: ${guide.title}`;
        
        let html = `<ol style="padding-left: 20px; display:flex; flex-direction:column; gap:12px;">`;
        guide.steps.forEach(step => {
            // Check for bold notation
            let formattedStep = step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li style="font-size:14px; color: var(--text-secondary);">${formattedStep}</li>`;
        });
        html += `</ol>`;

        if (guideId === 'cpr') {
            // Add a little CPR count-beat simulation for wow-factor
            html += `
                <div style="margin-top:24px; padding:16px; background:rgba(255,69,58,0.05); border:1px solid rgba(255,69,58,0.2); border-radius:12px; text-align:center;">
                    <h5>CPR Compression Rhythm Guide</h5>
                    <p style="font-size:11px; color: var(--text-secondary); margin-bottom:12px;">Aim for 100-120 compressions per minute. Push hard and fast.</p>
                    <button class="btn btn-danger" id="cpr-timer-btn" onclick="toggleCprBeep()" style="padding: 8px 16px; font-size:12px;">Start Rhythm Metronome (100 BPM)</button>
                    <div id="cpr-beeper" style="display:none; font-size:24px; margin-top:12px; font-weight:800; color:var(--red-accent);">❤️ COMPRESS</div>
                </div>
            `;
        }

        modalBody.innerHTML = html;
        openModal('firstaid-modal');
    }
}

let cprInterval = null;
function toggleCprBeep() {
    const btn = document.getElementById('cpr-timer-btn');
    const beeper = document.getElementById('cpr-beeper');
    
    if (!btn || !beeper) return;

    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
        btn.textContent = 'Start Rhythm Metronome (100 BPM)';
        beeper.style.display = 'none';
    } else {
        btn.textContent = 'Stop Rhythm Metronome';
        beeper.style.display = 'block';
        
        let blink = true;
        cprInterval = setInterval(() => {
            beeper.style.opacity = blink ? '1' : '0.2';
            blink = !blink;
            
            // Simple sound beep helper (Web Audio API)
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 440; // A4 note
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } catch(e) {
                // Ignore audio context errors if blocked by browser autoplay policy
            }
        }, 600); // 100 BPM is 600ms per beat
    }
}

// Clean up CPR metronome on modal close
function closeFirstAidModal() {
    if (cprInterval) {
        clearInterval(cprInterval);
        cprInterval = null;
    }
    closeModal('firstaid-modal');
}
