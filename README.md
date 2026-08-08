# Lifora

**AI Emergency Healthcare Coordination Platform**

Lifora is a client-side web application designed to demonstrate a unified digital coordination layer for medical emergencies. It connects patients, ambulance crews, hospitals, blood banks, and donors through a single shared interface — reducing the communication gap that costs critical minutes in real-world emergencies.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Platform Modules](#platform-modules)
- [Emergency QR Card](#emergency-qr-card)
- [AI Triage Severity Levels](#ai-triage-severity-levels)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)
- [Team](#team)

---

## Overview

The platform is built entirely on vanilla HTML, CSS, and JavaScript with no backend currently attached. All dispatch simulations, inventory data, and dashboard states are managed client-side. Data entered into the Medical Vault is persisted in the browser's local storage and survives page refreshes.

The project is structured to be database-ready — all simulation logic is isolated in `app.js` and can be replaced with live API calls once a backend is connected.

---

## Features

**Emergency Triage Wizard**
A three-step guided modal that classifies emergency severity based on clinical prompts. Clicking a specific emergency card (Medical, Road Accident, Blood) skips the category selection step and opens the questionnaire directly. The AI scores responses and assigns a triage level with a matched ambulance unit and hospital.

**AI Medical Chatbot**
A conversational assistant that responds to symptom queries with structured first-aid guidance. Supports CPR (with an audio-assisted 100 BPM metronome), bleeding control, burn treatment, stroke assessment, and heart attack protocol.

**Blood Search Registry**
Allows searching simulated blood group inventory across nearby banks. Results show unit availability and distance. Submitting an urgent request broadcasts it to the Blood Bank and Donor dashboards in real time.

**Smart Medical Vault**
A personal emergency health profile stored locally on the device. Includes name, date of birth, blood group, allergy status, medications, conditions, and an emergency contact number. Saved data updates the QR code immediately.

**Scannable Emergency QR**
The QR code encodes patient data as plain structured text, readable by any standard phone camera without internet access. Data includes blood group, allergies, medications, conditions, and ICE contact.

**Emergency Patient Card**
A standalone HTML page (`patient-card.html`) that renders patient data passed through URL parameters. Accessible via the Preview button on the vault panel. Includes a print-to-PDF option for physical handover to paramedics.

**Connected Network Simulator**
A five-tab role dashboard that updates all views simultaneously when an SOS is active. Tabs cover the Patient, Ambulance Crew, Hospital ER, Blood Bank, and Donor perspectives.

**First Aid Guides**
Step-by-step instruction panels for CPR, severe bleeding, burns, stroke (F.A.S.T.), and heart attacks, accessible from the AI assistant or directly from the healthcare intelligence section.

---

## Project Structure

```
Lifora/
├── index.html          Main application — all sections, modals, and dashboard markup
├── styles.css          Design system — variables, layout, components, responsive breakpoints
├── app.js              Application logic — triage, EHR, QR generation, dashboards, chatbot
├── patient-card.html   Standalone medical document — opened via Preview button or QR scan
└── README.md           This file
```

### Sections in `index.html`

| Element | Purpose |
|---|---|
| `header` | Sticky branding bar with team credits |
| `#active-emergency-banner` | Live SOS notification strip (visible when dispatch is active) |
| `.hero` | Primary CTA section with SOS, AI Assistant, and Blood search buttons |
| `.emergency-grid` | Direct-launch emergency category cards |
| `.features-grid` | AI Healthcare Intelligence feature overview |
| `.tabs-container` | Five-role network dashboard with tab switching |
| `#vault-section` | Medical vault form and QR preview panel |
| `#sos-modal` | Three-step Triage Wizard dialog |
| `#ai-modal` | AI Medical Chatbot dialog |
| `#blood-modal` | Blood group search dialog |
| `#firstaid-modal` | First aid guidance dialog |

---

## Getting Started

No build tools or package managers are required.

**Option 1 — Open directly**

```
Open index.html in any modern browser.
```

**Option 2 — Local server (recommended)**

Using Python:
```bash
python -m http.server 8000
```

Using Node.js:
```bash
npx serve .
```

Then open `http://localhost:8000` in your browser.

> Running via a local server ensures the Preview Emergency Card button and QR-based page links resolve correctly. Opening via `file://` may restrict some relative path navigation depending on the browser.

---

## Platform Modules

### Emergency SOS Workflow

1. User clicks one of the three emergency cards or the hero SOS button.
2. The Triage Wizard opens. Cards with a specific category skip directly to the questionnaire.
3. The user answers clinical yes/no prompts relevant to the selected emergency type.
4. The system scores responses, assigns a triage level, and selects an ambulance unit and hospital.
5. A dispatch simulation runs with an animated progress bar showing coordination stages.
6. An active SOS banner appears at the top of the page with ambulance code, hospital name, and ETA.
7. All five network dashboards update simultaneously to reflect the active emergency.
8. The SOS can be cancelled at any time from the banner or the patient dashboard tab.

### Connected Network Simulator

Each tab shows what a specific responder sees during an active emergency.

| Role | Data Displayed |
|---|---|
| Patient | Active SOS status, triage level, ETA, ambulance code, hospital name |
| Ambulance Crew | Patient name, GPS location, triage level, allergies, medical history, destination |
| Hospital ER | Incoming patient ETA, triage level, AI-generated medical briefing |
| Blood Bank | Hospital request inbox, full blood group inventory table |
| Donor | Urgent blood match alerts filtered by registered blood group |

### AI Chatbot Keywords

| Input contains | Response |
|---|---|
| `cpr` | CPR step-by-step guide with 100 BPM audio metronome toggle |
| `bleed`, `blood`, `hemorrhage` | Bleeding control and tourniquet protocol |
| `burn` | Burns treatment and cooling procedure |
| `stroke`, `paralysis`, `slur` | F.A.S.T. assessment protocol |
| `heart attack`, `chest pain`, `cardiac` | Heart attack response and aspirin guidance |
| Anything else | General emergency guidance with SOS prompt |

---

## Emergency QR Card

The QR code on the vault panel encodes patient data as plain text. This format was chosen deliberately — URLs pointing to local files are unreachable from a scanned device, so structured text ensures the data is readable on any phone without internet access.

Sample QR content:

```
==============================
  LIFORA EMERGENCY MEDICAL ID
==============================
NAME        : Deepak Jha
DATE OF BIRTH: 31/10/2000
BLOOD GROUP : O+
ALLERGIES   : No known drug allergies
MEDICATIONS : None
CONDITIONS  : None
------------------------------
ICE CONTACT : +977 9708027325
==============================
Powered by Lifora AI Platform
```

The QR regenerates automatically each time the vault is saved.

---

## AI Triage Severity Levels

| Level | Label | Clinical Meaning |
|---|---|---|
| Red | Critical | Immediate resuscitation required |
| Orange | Emergent | Life-threatening — act within minutes |
| Yellow | Urgent | Significant but stable — assess within an hour |
| Green | Non-urgent | Routine care — monitor and treat as available |

Scoring is based on weighted yes/no responses. Each question carries a weight proportional to its clinical severity. The percentage of maximum possible score determines the level assigned.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Markup | HTML5 |
| Styling | Vanilla CSS3 with custom properties and CSS Grid |
| Logic | Vanilla JavaScript (ES6+) |
| Icons | Font Awesome 6 |
| Typography | Google Fonts — Outfit, Plus Jakarta Sans |
| QR Generation | QR Server API (api.qrserver.com) |
| Data Storage | Browser localStorage |
| Audio | Web Audio API |

No frameworks, no bundlers, no runtime dependencies beyond CDN-loaded assets.

---

## Roadmap

The following are planned for the next development phase when a backend is connected:

- Live hospital database with real-time ICU bed and specialist availability
- GPS-based ambulance tracking and dynamic rerouting
- Blood bank inventory sync via REST API
- SMS and WhatsApp emergency alert dispatch
- Donor registration and eligibility management
- Progressive Web App (PWA) packaging with offline support
- Voice-activated SOS trigger using device accelerometer
- Multilingual support — Gujarati, Hindi, and English

---

## Team

Developed as part of an AI healthcare coordination research project.

| Name | Contribution |
|---|---|
| Pravneer Kaur | Project lead, system architecture |
| Patel Priti | Frontend development |
| Choudhary Babita | UX design and interaction flows |
| Rathwa Urvashi | Healthcare domain research |
| Patel Aesha | EHR data design and QR system |
| Parvathy J.S. | Documentation and QA |

---

## License

This project is released under the MIT License.

---

*Lifora AI Emergency Healthcare Platform — 2026*
