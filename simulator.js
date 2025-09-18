document.addEventListener('DOMContentLoaded', () => {
    // We need to import the Firebase libraries to use them
    import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
    import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

    const firebaseConfig = {
        apiKey: "AIzaSyAh_wDgSsdpG-8zMmgcSVgyKl1IKOvD2mE",
        authDomain: "wild-west-map.firebaseapp.com",
        databaseURL: "https://wild-west-map-default-rtdb.firebaseio.com",
        projectId: "wild-west-map",
        storageBucket: "wild-west-map.appspot.com",
        messagingSenderId: "255220822931",
        appId: "1:255220822931:web:7e44db610fe44bd7f72e66",
        measurementId: "G-3SPWSXBRNE"
    };

    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    
    // THE CRITICAL CHANGE IS HERE: All data now saves to the "world" folder.
    const dbRef = ref(database, 'world'); 

    const simulateBtn = document.getElementById('simulate-btn');
    const logOutput = document.getElementById('log-output');
    const worldStateOutput = document.getElementById('world-state-output');
    let world; // This will hold our entire world state from Firebase

    const eventTable = [
        { description: "A brutal heatwave settles over the territory.", effect: (w) => { Object.values(w.locations).forEach(l => { if (!l.state_tags.includes("Drought-Stricken")) l.state_tags.push("Drought-Stricken"); }); return "Water becomes dangerously scarce."; } },
        { description: "Rumors of a 'ghost train' on the eastern line spook railroad workers.", effect: (w) => { w.factions.eastern_industrialists.goal = "Investigate ghost train rumors"; return "Supernatural fear disrupts commerce."; } },
        { description: "A federal judge is scheduled to arrive in James J. Junction.", effect: (w) => { w.people.jedediah_stone.goal = "Prepare for judicial arrival"; return "The lawless elements of the territory are nervous."; } },
        { description: "A new strain of cattle disease is reported in the plains.", effect: (w) => { return "Ranchers face financial ruin."; } }
    ];

    function initializeSimulator() {
        // Listen for data from Firebase in real-time
        onValue(dbRef, async (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // If there's data in Firebase, use it
                world = data;
                logOutput.innerHTML = '<p>World state loaded from Firebase. Ready to simulate.</p>';
            } else {
                // If Firebase is empty, load the initial state from the JSON file
                logOutput.innerHTML = '<p>Firebase is empty. Seeding with initial world data...</p>';
                const response = await fetch('world-data.json');
                world = await response.json();
                set(dbRef, world); // <-- Save the initial state to Firebase!
            }
            displayWorldState();
        }, { onlyOnce: false });
    }

    function displayWorldState() {
        if (!world) return;
        let html = '<h3>Locations</h3><ul>';
        for (const key in world.locations) { html += `<li><strong>${world.locations[key].name}:</strong> ${world.locations[key].state_tags.join(', ')}</li>`; }
        html += '</ul><h3>Factions</h3><ul>';
        for (const key in world.factions) { html += `<li><strong>${world.factions[key].name}:</strong> Goal - ${world.factions[key].goal}</li>`; }
        html += '</ul><h3>People</h3><ul>';
        for (const key in world.people) { html += `<li><strong>${world.people[key].name} (${world.people[key].location}):</strong> Goal - ${world.people[key].goal}</li>`; }
        html += '</ul>';
        worldStateOutput.innerHTML = html;
    }
    
    function logResult(message) {
        logOutput.innerHTML += `<p>${message}</p>`;
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    function runSimulationTurn() {
        if (!world) { logResult("World data is not ready. Please wait."); return; }
        
        let turnLog = [];
        
        const weekNumber = (world.week_number || 0) + 1;
        world.week_number = weekNumber;
        turnLog.push(`<strong>--- Simulating Week ${weekNumber} ---</strong>`);

        Object.values(world.people).filter(p => p.location === "Traveling").forEach(traveler => {
            const possibleDestinations = Object.keys(world.locations);
            const newLocationId = possibleDestinations[Math.floor(Math.random() * possibleDestinations.length)];
            traveler.location = newLocationId;
            turnLog.push(`<strong>TRAVEL:</strong> ${traveler.name} has arrived in ${world.locations[newLocationId].name}.`);
        });

        const randomEvent = eventTable[Math.floor(Math.random() * eventTable.length)];
        const eventEffect = randomEvent.effect(world);
        turnLog.push(`<strong>EVENT:</strong> ${randomEvent.description} (${eventEffect})`);
        
        const majorPlayers = Object.values(world.people).filter(p => p.location !== "Traveling");
        for (let i = 0; i < 3; i++) {
            const agent = majorPlayers[Math.floor(Math.random() * majorPlayers.length)];
            // ... (rest of the AI logic) ...
            turnLog.push(`<strong>ACTION:</strong> ${agent.name} in ${world.locations[agent.location].name} works towards their goal: "${agent.goal}".`);
        }

        set(dbRef, world).then(() => {
            logOutput.innerHTML = '';
            turnLog.forEach(log => logResult(log));
            logResult("<strong>Progress saved to Firebase automatically.</strong>");
            displayWorldState();
        }).catch(error => {
            console.error("Error saving to Firebase:", error);
            logResult("<strong style='color:red;'>Error: Could not save progress to Firebase.</strong>");
        });
    }

    simulateBtn.addEventListener('click', runSimulationTurn);
    initializeSimulator();
});
