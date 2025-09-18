document.addEventListener('DOMContentLoaded', () => {
    const simulateBtn = document.getElementById('simulate-btn');
    const logOutput = document.getElementById('log-output');
    const worldStateOutput = document.getElementById('world-state-output');
    let world;

    const eventTable = [
        { description: "A brutal heatwave settles over the territory.", effect: (w) => { Object.values(w.locations).forEach(l => l.state_tags.push("Drought-Stricken")); return "Water becomes dangerously scarce."; } },
        { description: "Rumors of a 'ghost train' on the eastern line spook railroad workers.", effect: (w) => { w.factions.eastern_industrialists.goal = "Investigate ghost train rumors"; return "Supernatural fear disrupts commerce."; } },
        { description: "A federal judge is scheduled to arrive in James J. Junction.", effect: (w) => { w.people.jedediah_stone.goal = "Prepare for judicial arrival"; return "The lawless elements of the territory are nervous."; } },
        { description: "A new strain of cattle disease is reported in the plains.", effect: (w) => { return "Ranchers face financial ruin."; } }
    ];

    async function initializeSimulator() {
        try {
            const response = await fetch('world-data.json');
            if (!response.ok) throw new Error("Failed to load world-data.json");
            world = await response.json();
            displayWorldState();
        } catch (error) {
            logOutput.innerHTML = `<p style="color: red;"><strong>Error:</strong> ${error.message}. Make sure 'world-data.json' is in the same folder.</p>`;
        }
    }

    function displayWorldState() {
        let html = '<h3>Locations</h3><ul>';
        for (const key in world.locations) {
            const loc = world.locations[key];
            html += `<li><strong>${loc.name}:</strong> ${loc.state_tags.join(', ')}</li>`;
        }
        html += '</ul><h3>Factions</h3><ul>';
        for (const key in world.factions) {
            const faction = world.factions[key];
            html += `<li><strong>${faction.name}:</strong> Goal - ${faction.goal}</li>`;
        }
        html += '</ul><h3>People</h3><ul>';
        for (const key in world.people) {
            const person = world.people[key];
            html += `<li><strong>${person.name} (${person.location}):</strong> Goal - ${person.goal}</li>`;
        }
        html += '</ul>';
        worldStateOutput.innerHTML = html;
    }
    
    function logResult(message) {
        logOutput.innerHTML += `<p>${message}</p>`;
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    function runSimulationTurn() {
        if (!world) { logResult("World data not loaded."); return; }
        logOutput.innerHTML = '';
        world.current_date = `Week of ${world.current_date.replace('Week of ','')}`;
        logResult(`<strong>--- Simulating ${world.current_date} ---</strong>`);
        
        // 1. Handle Traveling NPCs
        Object.values(world.people).filter(p => p.location === "Traveling").forEach(traveler => {
            const possibleDestinations = Object.keys(world.locations);
            const newLocationId = possibleDestinations[Math.floor(Math.random() * possibleDestinations.length)];
            traveler.location = newLocationId;
            logResult(`<strong>TRAVEL:</strong> ${traveler.name} has arrived in ${world.locations[newLocationId].name}.`);
        });

        // 2. Trigger Random Event
        const randomEvent = eventTable[Math.floor(Math.random() * eventTable.length)];
        const eventEffect = randomEvent.effect(world);
        logResult(`<strong>EVENT:</strong> ${randomEvent.description} (${eventEffect})`);

        // 3. Process Faction Conflict
        const factions = Object.values(world.factions);
        const faction1 = factions[Math.floor(Math.random() * factions.length)];
        const faction2 = factions[Math.floor(Math.random() * factions.length)];
        if (faction1 !== faction2 && faction1.relationships && faction1.relationships[Object.keys(world.factions).find(key => world.factions[key] === faction2)] < -5) {
            logResult(`<strong>FACTION CONFLICT:</strong> Tensions flare between ${faction1.name} and ${faction2.name}.`);
        }

        // 4. Process Key Agent Goals (Select 3 random major players to act this turn)
        const majorPlayers = Object.values(world.people).filter(p => p.location !== "Traveling");
        for (let i = 0; i < 3; i++) {
            const agent = majorPlayers[Math.floor(Math.random() * majorPlayers.length)];
            let actionTaken = false;

            // Simple AI Logic based on Goal and Morality
            if (agent.goal.includes("Investigate") && agent.skills.includes("Investigation")) {
                actionTaken = true;
                logResult(`<strong>ACTION:</strong> ${agent.name} in ${world.locations[agent.location].name} spends the week investigating leads related to their goal: "${agent.goal}".`);
            } else if (agent.goal.includes("Protect") || agent.goal.includes("Peace")) {
                actionTaken = true;
                logResult(`<strong>ACTION:</strong> Driven by their goal to "${agent.goal}", ${agent.name} increases patrols and meets with locals in ${world.locations[agent.location].name}.`);
            } else if ((agent.goal.includes("Profit") || agent.goal.includes("control")) && agent.morality === "Ruthless") {
                actionTaken = true;
                logResult(`<strong>ACTION:</strong> In pursuit of their goal "${agent.goal}", ${agent.name} makes a ruthless move, intimidating a rival in ${world.locations[agent.location].name}.`);
            } else if (agent.goal.includes("Vengeance") || agent.goal.includes("Burn")) {
                actionTaken = true;
                // Simulate travel towards the target location if not already there
                const targetLocation = "vanderbilt_village";
                if (agent.location !== targetLocation) {
                    agent.location = "The Badlands (near Vanderbilt)"; // a narrative move
                     logResult(`<strong>ACTION:</strong> Consumed by vengeance, ${agent.name} moves closer to ${world.locations[targetLocation].name}, plotting his next move.`);
                }
            }

            if (!actionTaken) {
                logResult(`<strong>ACTION:</strong> ${agent.name} in ${world.locations[agent.location].name} works towards their goal: "${agent.goal}".`);
            }
        }
        
        displayWorldState();
    }

    simulateBtn.addEventListener('click', runSimulationTurn);
    initializeSimulator();
});
