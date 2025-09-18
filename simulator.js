// --- 1. FIREBASE IMPORTS (MUST BE AT THE TOP LEVEL) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// This function contains all of our app's logic.
function initializeSimulator() {
    // --- 2. FIREBASE CONFIG & INITIALIZATION ---
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
    const dbRef = ref(database, 'world');

    // --- 3. DOM ELEMENT REFERENCES & STATE ---
    const simulateBtn = document.getElementById('simulate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const logOutput = document.getElementById('log-output');
    const worldStateOutput = document.getElementById('world-state-output');
    let world;

    // --- THE FULL, UNABRIDGED EVENT TABLE ---
    const eventTable = [
        // --- Chill & Community Events ---
        { description: "A gentle, soaking rain breaks the long dry spell.", effect: (w) => { Object.values(w.locations).forEach(l => l.state_tags = l.state_tags.filter(tag => tag !== "Drought-Stricken")); return "The land breathes a sigh of relief."; } },
        { description: "Tobacco Town announces its annual Harvest Festival.", effect: (w) => { w.locations.tobacco_town.state_tags.push("Festival Preparations"); return "Traders and families plan to attend."; } },
        { description: "The Junction Dispatch newspaper begins printing a serialized dime novel.", effect: (w) => { return "The story of 'Calamity Jane' becomes the talk of the saloons."; } },
        { description: "A skilled carpenter arrives in Quarryside looking for work.", effect: (w) => { return "There's an opportunity to repair some of the run-down buildings."; } },
        { description: "The church in James J. Junction organizes a town picnic and barn dance.", effect: (w) => { w.locations.james_j_junction.state_tags.push("Community Spirit"); return "For a week, tensions seem to ease."; } },
        { description: "A new foal is born at the livery in Maple Mills, a sign of good luck.", effect: (w) => { if (w.people.maeve_bartender) w.people.maeve_bartender.conditions.push("Hopeful"); return "The town celebrates the new life."; } },
        { description: "Thomas Cooper in Tobacco Town reports a bumper crop of tobacco.", effect: (w) => { w.locations.tobacco_town.state_tags.push("Prosperous Harvest"); return "The town's economic future looks bright."; } },
        { description: "A traveling musician with a fiddle and a fine voice sets up in the Silver Dollar Saloon.", effect: (w) => { return "The saloon is more crowded and cheerful than usual."; } },
        { description: "Deputy Clyde makes a competent arrest, stopping a petty thief without incident.", effect: (w) => { if (w.people.deputy_clyde) w.people.deputy_clyde.goal = "Gain Sheriff Adams' respect"; return "His confidence grows."; } },
        { description: "The night sky is exceptionally clear, perfect for stargazing.", effect: (w) => { return "A rare moment of peace descends on the territory."; } },
        // --- Environmental & Discovery Events ---
        { description: "A brutal heatwave settles over the territory.", effect: (w) => { Object.values(w.locations).forEach(l => { if (!l.state_tags.includes("Drought-Stricken")) l.state_tags.push("Drought-Stricken"); }); return "Water becomes dangerously scarce."; } },
        { description: "An unseasonably cold snap freezes the northern passes.", effect: (w) => { w.locations.stonefoot_lands.state_tags.push("Passes Frozen"); return "Travel through the mountains is nearly impossible."; } },
        { description: "A flash flood carves a new path through the badlands.", effect: (w) => { w.locations.copperhead_canyon.state_tags.push("Flooded"); return "Old trails are washed away, revealing something new."; } },
        { description: "A new, rich vein of silver is struck in Quarryside.", effect: (w) => { w.locations.quarryside.state_tags.push("Booming"); w.factions.eastern_industrialists.goal = "Exploit new silver vein"; return "The mining company's greed intensifies."; } },
        { description: "A massive wildfire rages on the distant prairie, turning the sky orange.", effect: (w) => { return "Ranchers and remote homesteads are threatened."; } },
        { description: "A prospector stumbles into Durango, claiming to have found the Lost Dutchman's Mine.", effect: (w) => { w.locations.durango.state_tags.push("Gold Fever"); return "The town is buzzing with excitement and suspicion."; } },
        { description: "A buffalo herd is spotted, the largest seen in years.", effect: (w) => { w.factions.stonefoot_tribes.goal = "Organize a great hunt"; return "A sign of hope and prosperity for the tribes."; } },
        // --- Social & Political Events ---
        { description: "A federal judge is scheduled to arrive in James J. Junction.", effect: (w) => { if (w.people.jedediah_stone) w.people.jedediah_stone.goal = "Prepare for judicial arrival"; return "The lawless elements of the territory are nervous."; } },
        { description: "A disputed land claim between a homesteader and the Cattle Barons turns violent.", effect: (w) => { if (w.factions.frontiersmen.relationships) w.factions.frontiersmen.relationships.eastern_industrialists -= 2; return "Tensions between ranchers and settlers escalate."; } },
        { description: "The U.S. Military offers a new, insulting treaty to the Stonefoot Tribes.", effect: (w) => { if (w.people.black_raven) w.people.black_raven.goal = "Lead retaliatory raids"; return "The chance for peace dwindles."; } },
        { description: "The 'Junction Dispatch' prints a scathing exposé on miners' conditions.", effect: (w) => { w.factions.miners_union.goal = "Capitalize on public sympathy"; if (w.people.mr_thorne) w.people.mr_thorne.goal = "Silence the press"; return "The union is emboldened."; } },
        { description: "Sheriff Jonas Vanderbilt frames a drifter for a murder he committed.", effect: (w) => { w.locations.vanderbilt_village.state_tags.push("Heightened Fear"); return "The people are relieved a 'killer' is caught, but some have doubts."; } },
        { description: "A charismatic entrepreneur arrives, planning to build a second, rival railroad line.", effect: (w) => { w.factions.eastern_industrialists.goal = "Sabotage the rival railroad"; return "A corporate war is brewing."; } },
        { description: "The Shaughnessy Sisters successfully con a wealthy cattle baron.", effect: (w) => { w.factions.shaughnessy_sisters.goal = "Launder the new income"; return "They are flush with cash but have made a powerful new enemy."; } },
        // --- Economic Events ---
        { description: "A new strain of cattle disease is reported in the plains.", effect: (w) => { return "Ranchers face financial ruin."; } },
        { description: "The Bank in James J. Junction is robbed by the Grissom Gang.", effect: (w) => { if (w.people.grizz_adams) w.people.grizz_adams.goal = "Track down the Grissom Gang"; return "Confidence in local law enforcement plummets."; } },
        { description: "A whiskey shipment is destroyed, causing a territory-wide shortage.", effect: (w) => { Object.values(w.locations).forEach(l => l.state_tags.push("Whiskey Shortage")); return "Saloons are tense."; } },
        { description: "Weston's Raiders rob a U.S. Military payroll wagon.", effect: (w) => { w.factions.us_military.goal = "Hunt down Weston's Raiders"; return "The army is on high alert."; } },
        { description: "The general store in Maple Mills gets a rare shipment of goods from the East.", effect: (w) => { return "Luxuries like fine coffee and silk are available for a limited time."; } },
        // --- Outlaw & Conflict Events ---
        { description: "'Blackjack' Jack Byrne is seen playing cards in the Durango saloon.", effect: (w) => { if (w.people.blackjack_jack) w.people.blackjack_jack.location = "durango"; return "A high-stakes gambler was found dead the next morning."; } },
        { description: "The Perdition Raiders attack a supply caravan near Copperhead Canyon.", effect: (w) => { if (w.people.sorrow_jack) w.people.sorrow_jack.goal = "Sell the stolen goods in Durango"; return "Supplies are now scarce in the north."; } },
        { description: "'Wildfire' Walt Thatcher torches a ranch belonging to an associate of Vanderbilt.", effect: (w) => { if (w.people.wildfire_walt) w.people.wildfire_walt.location = "The Barrens"; return "His campaign of terror inches closer to town."; } },
        { description: "A high-profile gunfight erupts in the streets of Durango.", effect: (w) => { if (w.people.cain_gunslinger) w.people.cain_gunslinger.goal = "Challenge the survivor"; return "Two known outlaws are dead."; } },
        { description: "The Gentlemen Callers arrive in James J. Junction, posing as wealthy investors.", effect: (w) => { w.factions.gentlemen_callers.goal = "Identify a wealthy mark for a long con"; return "They begin integrating themselves into high society."; } },
        // --- Supernatural & Veil Events ---
        { description: "Rumors of a 'ghost train' on the eastern line spook railroad workers.", effect: (w) => { w.factions.eastern_industrialists.goal = "Investigate ghost train rumors"; return "Supernatural fear disrupts commerce."; } },
        { description: "A child in Maple Mills goes missing, last seen near the Wild Woods.", effect: (w) => { if (w.people.silas_foreman) w.people.silas_foreman.goal = "Form a posse to find the missing child"; return "The town fears the 'beast' has struck again."; } },
        { description: "Travelers report the whispers in Copperhead Canyon are growing louder.", effect: (w) => { if (w.people.old_man_caine) w.people.old_man_caine.conditions.push("Tormented by spirits"); return "The unquiet dead are restless."; } },
        { description: "Mama Odette has a vision of a coming catastrophe.", effect: (w) => { if (w.people.mama_odette) w.people.mama_odette.goal = "Gather rare components for a warding ritual"; return "She becomes more desperate and may seek outside help."; } },
        { description: "A blood moon hangs in the sky, thinning the Veil.", effect: (w) => { Object.values(w.people).forEach(p => { if (p.skills && p.skills.includes("Supernatural Luck")) p.conditions.push("Veil-Empowered"); }); return "Supernatural abilities are amplified."; } },
        { description: "Old Mertyl O'Connell correctly predicts a poker game outcome, unsettling everyone.", effect: (w) => { if (w.people.mertyl_oconnell) w.people.mertyl_oconnell.conditions.push("Lucid Moment"); return "Her ravings are seen as true prophecy."; } },
        { description: "A bizarre, alien fungus is found growing in the Quarryside mine.", effect: (w) => { if (w.people.jeb_miner) w.people.jeb_miner.conditions.push("Vindicated but Terrified"); return "It seems to pulse with a faint light."; } },
        { description: "A stranger dies of fright. The only clue is an Ace of Spades in his hand.", effect: (w) => { if (w.people.blackjack_jack) w.people.blackjack_jack.location = "james_j_junction"; return "'Blackjack' Jack has claimed another victim."; } }
    ];

    function initialize() {
        onValue(dbRef, async (snapshot) => {
            const data = snapshot.val();
            if (data && data.locations) {
                world = data;
                logOutput.innerHTML = '<p>World state loaded from Firebase. Ready to simulate.</p>';
            } else {
                logOutput.innerHTML = '<p>Firebase is empty or invalid. Seeding with initial world data...</p>';
                try {
                    const response = await fetch('world-data.json');
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    world = await response.json();
                    await set(dbRef, world);
                    logOutput.innerHTML += '<p><strong>Success!</strong> Initial world state has been saved to Firebase.</p>';
                } catch (e) {
                    logOutput.innerHTML += `<p style="color: red;"><strong>Error:</strong> Could not load or seed world-data.json. ${e.message}</p>`;
                }
            }
            displayWorldState();
        });
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

    async function resetWorld() {
        if (!confirm("Are you sure you want to reset the world? All simulation progress will be lost.")) return;
        logOutput.innerHTML = '<p>Resetting world to initial state...</p>';
        try {
            const response = await fetch('world-data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const pristineWorldData = await response.json();
            await set(dbRef, pristineWorldData);
            world = pristineWorldData;
            logOutput.innerHTML += '<p><strong>Success!</strong> World has been reset from world-data.json.</p>';
        } catch (e) {
            logOutput.innerHTML += `<p style="color: red;"><strong>Error:</strong> Could not load or seed world-data.json. ${e.message}</p>`;
        }
        displayWorldState();
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
            let actionTaken = false;

            if (agent.goal.includes("Investigate") && agent.skills && agent.skills.includes("Investigation")) {
                actionTaken = true;
                turnLog.push(`<strong>ACTION:</strong> ${agent.name} in ${world.locations[agent.location].name} investigates leads related to: "${agent.goal}".`);
            } else if (agent.goal.includes("Protect") || agent.goal.includes("Peace")) {
                actionTaken = true;
                turnLog.push(`<strong>ACTION:</strong> Driven by their goal to "${agent.goal}", ${agent.name} increases patrols in ${world.locations[agent.location].name}.`);
            } else if ((agent.goal.includes("Profit") || agent.goal.includes("control")) && agent.morality === "Ruthless") {
                actionTaken = true;
                turnLog.push(`<strong>ACTION:</strong> To "${agent.goal}", ${agent.name} makes a ruthless move, intimidating a rival in ${world.locations[agent.location].name}.`);
            } else if (agent.goal.includes("Vengeance") || agent.goal.includes("Burn")) {
                actionTaken = true;
                const targetLocation = "vanderbilt_village";
                if (agent.location !== targetLocation) {
                    agent.location = "The Badlands (near Vanderbilt)";
                     turnLog.push(`<strong>ACTION:</strong> Consumed by vengeance, ${agent.name} moves closer to ${world.locations[targetLocation].name}.`);
                }
            }

            if (!actionTaken) {
                turnLog.push(`<strong>ACTION:</strong> ${agent.name} in ${world.locations[agent.location].name} works towards their goal: "${agent.goal}".`);
            }
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
    resetBtn.addEventListener('click', resetWorld);
    initialize();
}

// This event listener waits for the entire HTML document to be loaded, then runs our main function.
document.addEventListener('DOMContentLoaded', initializeSimulator);
