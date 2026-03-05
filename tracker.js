// ── Firebase tools we need ──────────────────────────────
// initializeApp: starts our Firebase connection
// getFirestore: gives us access to the database
// doc, setDoc, deleteDoc, getDocs, collection: database operations
// getAuth: gives us access to authentication
// GithubAuthProvider: tells Firebase we want GitHub login
// signInWithPopup: opens the GitHub login popup
// signOut: logs the user out
// onAuthStateChanged: runs a function whenever login state changes

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection }
    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { getAuth, GithubAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

    // ── Your Firebase project configuration ─────────────────
// These values connect our app to YOUR specific Firebase project
const firebaseConfig = {
    apiKey: "AIzaSyBv8WYDG1CYHCM3XWM2jj01wBoreI00Fqw",
    authDomain: "activity-tracker-d8959.firebaseapp.com",
    projectId: "activity-tracker-d8959",
    storageBucket: "activity-tracker-d8959.firebasestorage.app",
    messagingSenderId: "453075722144",
    appId: "1:453075722144:web:bc119a954097c06b4a4ec5"
};

// ── Initialize Firebase services ─────────────────────────
// app: the main Firebase connection
// db: our Firestore database
// auth: our authentication service
// provider: tells auth we want to use GitHub
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GithubAuthProvider();

// ── Constants ─────────────────────────────────────────────
// YOUR email - only this account can edit the tracker
const AUTHORIZED_EMAIL = "sidharthcirs@gmail.com";

// ── State ─────────────────────────────────────────────────
// activeDays: a Set storing dates that are marked active
// e.g. {"2026-03-01", "2026-03-04"}
// isAuthorized: tracks whether the logged in user is you
let activeDays = new Set();
let isAuthorized = false;

// ── Get references to HTML elements we need ──────────────
// These lines grab the buttons and divs from tracker.html
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const editNotice = document.getElementById("edit-notice");

// ── Login button click ────────────────────────────────────
// When user clicks "Login with GitHub", open the popup
loginBtn.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        alert("Login failed: " + e.message);
    }
});

// ── Logout button click ───────────────────────────────────
// When user clicks "Logout", sign them out
logoutBtn.addEventListener("click", () => {
    signOut(auth);
});

// ── Auth state listener ───────────────────────────────────
// This function runs automatically whenever login state changes
// i.e. when someone logs in OR logs out
onAuthStateChanged(auth, (user) => {

    if (user) {
        // Someone is logged in
        // Check if it is YOU by comparing emails
        isAuthorized = (user.email === AUTHORIZED_EMAIL);

        // Show their name and logout button
        userInfo.style.display = "block";
        userInfo.textContent = "Logged in as " + user.displayName;
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";

        // If it is YOU, show edit notice and make cells clickable
        if (isAuthorized) {
            editNotice.style.display = "block";
            makeCellsClickable();
        }

    } else {
        // Nobody is logged in
        isAuthorized = false;

        // Show login button, hide everything else
        userInfo.style.display = "none";
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
        editNotice.style.display = "none";

        // Remove clickable from all cells
        document.querySelectorAll(".day-cell")
            .forEach(cell => cell.classList.remove("clickable"));
    }
});

// ── Make cells clickable ──────────────────────────────────
// Called when YOU log in
// Adds clickable class to all past and present cells
function makeCellsClickable() {
    document.querySelectorAll(".day-cell:not(.future)")
        .forEach(cell => cell.classList.add("clickable"));
}

// ── Load active days from Firestore ──────────────────────
// Fetches all documents from the "activity" collection
// Each document ID is a date string e.g. "2026-03-04"
async function loadActiveDays() {
    const snapshot = await getDocs(collection(db, "activity"));
    
    // Clear the set first
    activeDays = new Set();
    
    // Add each date to our set
    snapshot.forEach(doc => activeDays.add(doc.id));
    
    console.log("Loaded active days:", activeDays);
}

// ── Toggle a day on or off ────────────────────────────────
// Called when YOU click a cell
// If day is active → remove it from database
// If day is inactive → add it to database
async function toggleDay(dateStr, cell) {

    // Safety check - only authorized user can toggle
    if (!isAuthorized) return;

    if (activeDays.has(dateStr)) {
        // Day is currently active → deactivate it
        await deleteDoc(doc(db, "activity", dateStr));
        activeDays.delete(dateStr);
        cell.classList.remove("active");
        console.log("Deactivated:", dateStr);

    } else {
        // Day is currently inactive → activate it
        await setDoc(doc(db, "activity", dateStr), { active: true });
        activeDays.add(dateStr);
        cell.classList.add("active");
        console.log("Activated:", dateStr);
    }

    // Update the stats after every toggle
    updateStats();
}

// ── Format a date as "YYYY-MM-DD" ─────────────────────────
// e.g. March 4 2026 → "2026-03-04"
// We use this format as the document ID in Firestore
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// ── Update the stats line below the grid ──────────────────
// Shows total active days and current streak
function updateStats() {
    
    // Total is simply how many dates are in our Set
    const total = activeDays.size;

    // Calculate streak:
    // Start from today and count backwards
    // Stop when we hit a day that isn't active
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checking = new Date(today);

    while (activeDays.has(formatDate(checking))) {
        streak++;
        checking.setDate(checking.getDate() - 1);
    }

    // Update the stats div in the HTML
    document.getElementById("stats").innerHTML =
        `<strong>${total}</strong> active days in 2026 
         &nbsp;|&nbsp; 
         <strong>${streak}</strong> day streak`;
}

// ── Build the 52-week grid ────────────────────────────────
// Creates all the day cells and arranges them into columns
function buildGrid() {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Jan 1 2026 is a Thursday (day 4)
    // We want to start the grid from Monday Dec 29 2025
    const startDate = new Date(2025, 11, 29); // Dec 29 2025 = Monday

    // End at Dec 31 2026
    const endDate = new Date(2026, 11, 31);

    const weeksGrid = document.getElementById("weeks-grid");
    weeksGrid.innerHTML = "";

    const monthNames = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    // Outer container: month labels row + grid row
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";

    // Month labels row
    const monthRow = document.createElement("div");
    monthRow.style.display = "flex";
    monthRow.style.gap = "4px";
    monthRow.style.paddingLeft = "36px";
    monthRow.style.marginBottom = "4px";

    // Grid row: day labels + weeks
    const gridRow = document.createElement("div");
    gridRow.style.display = "flex";
    gridRow.style.gap = "3px";

    // Day labels column
    const dayLabels = document.createElement("div");
    dayLabels.style.display = "flex";
    dayLabels.style.flexDirection = "column";
    dayLabels.style.gap = "4px";
    dayLabels.style.paddingTop = "2px";
    ["Mon","","Wed","","Fri","","Sun"].forEach(label => {
        const d = document.createElement("div");
        d.textContent = label;
        d.style.height = "14px";
        d.style.fontSize = "11px";
        d.style.color = "#888";
        d.style.textAlign = "right";
        d.style.paddingRight = "6px";
        d.style.lineHeight = "14px";
        d.style.width = "30px";
        dayLabels.appendChild(d);
    });
    gridRow.appendChild(dayLabels);

    // Weeks container
    const weeksContainer = document.createElement("div");
    weeksContainer.style.display = "flex";
    weeksContainer.style.gap = "4px";

    let currentDate = new Date(startDate);
    let lastMonth = -1;

    // Loop week by week
    while (currentDate <= endDate) {

        const weekCol = document.createElement("div");
        weekCol.style.display = "flex";
        weekCol.style.flexDirection = "column";
        weekCol.style.gap = "4px";

        // Month label for this week column
        const thisMonth = currentDate.getMonth();
        const monthTag = document.createElement("div");
        monthTag.style.fontSize = "11px";
        monthTag.style.color = "#555";
        monthTag.style.height = "14px";
        monthTag.style.width = "14px";
        monthTag.style.whiteSpace = "nowrap";
        monthTag.style.overflow = "visible";

        if (thisMonth !== lastMonth && currentDate.getFullYear() === 2026) {
            monthTag.textContent = monthNames[thisMonth];
            lastMonth = thisMonth;
        } else {
            monthTag.textContent = "";
        }
        monthRow.appendChild(monthTag);

        // 7 days per week
        for (let d = 0; d < 7; d++) {

            const cell = document.createElement("div");
            cell.className = "day-cell";

            // Hide days outside 2026
            if (currentDate.getFullYear() !== 2026) {
                cell.style.opacity = "0";
                cell.style.pointerEvents = "none";

            } else if (currentDate > today) {
                // Future days
                cell.classList.add("future");

            } else {
                // Valid past or present day
                const dateStr = formatDate(currentDate);
                cell.dataset.date = dateStr;

                if (activeDays.has(dateStr)) {
                    cell.classList.add("active");
                }

                cell.addEventListener("click", () => {
                    toggleDay(dateStr, cell);
                });
            }

            weekCol.appendChild(cell);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        weeksContainer.appendChild(weekCol);
    }

    gridRow.appendChild(weeksContainer);
    container.appendChild(monthRow);
    container.appendChild(gridRow);
    weeksGrid.appendChild(container);

    document.getElementById("loading").style.display = "none";
    document.getElementById("tracker").style.display = "block";

    updateStats();
}

// ── Initialize everything ─────────────────────────────────
// This is the entry point of our app
// Runs when the page loads
async function init() {

    try {
        // Step 1: fetch active days from Firestore
        await loadActiveDays();

        // Step 2: build the grid using that data
        buildGrid();

    } catch (e) {
        // If anything goes wrong, show an error
        document.getElementById("loading").textContent = 
            "Error loading tracker: " + e.message;
        console.error(e);
    }
}

// ── Run init when page loads ──────────────────────────────
init();