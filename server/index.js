const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const physicsEngine = require('./physics');
const agentOrchestrator = require('./agents');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get('/health', (req, res) => {
    res.json({ status: 'StellarX Backend Online' });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('[WS] Client connected to StellarX telemetry stream.');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('[WS] Received command:', data);
            
            if (data.type === 'INJECT_CHAOS') {
                const hazardType = data.payload;
                
                // Push event to log
                physicsEngine.pushEvent('THREAT', `${hazardType.replace(/_/g, ' ')} detected targeting STELLAR-001`);
                physicsEngine.globalKpis.autonomousDecisions++;

                if (hazardType === 'DEBRIS_STORM') {
                    physicsEngine.hazards.push({
                        id: `CRITICAL-OBJ-${Math.floor(Math.random() * 1000)}`,
                        distance: 20,
                        speed: 5,
                        approach_vector: [0, 0, 1]
                    });
                    physicsEngine.globalKpis.activeAnomalies.push({ node: 'STELLAR-001', threat: 'DEBRIS_STORM', status: 'MANEUVERING' });
                } else if (hazardType === 'SOLAR_FLARE') {
                    physicsEngine.constellation[0].battery -= 25;
                    physicsEngine.constellation[0].status = 'POWER_CRITICAL';
                    physicsEngine.globalKpis.activeAnomalies.push({ node: 'STELLAR-001', threat: 'SOLAR_FLARE', status: 'SHIELDING' });
                } else if (hazardType === 'SYSTEM_FAILURE') {
                    physicsEngine.constellation[0].battery = 0;
                    physicsEngine.constellation[0].status = 'OFFLINE';
                    physicsEngine.globalKpis.activeAnomalies.push({ node: 'STELLAR-001', threat: 'SYSTEM_FAILURE', status: 'HANDOFF INITIATED' });

                    // Self-healing: reassign mission
                    const handoff = physicsEngine.reassignMission(0);
                    if (handoff) {
                        // Broadcast mission handoff event
                        wss.clients.forEach((client) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({ type: 'MISSION_HANDOFF', data: handoff }));
                            }
                        });
                    }
                }

                // Keep anomalies manageable
                if (physicsEngine.globalKpis.activeAnomalies.length > 5) {
                    physicsEngine.globalKpis.activeAnomalies.shift();
                }

                // Trigger AI evaluation
                physicsEngine.pushEvent('EVALUATE', `AI Optimization Engine computing response...`);
                physicsEngine.globalKpis.threatsResolved++;
                
                const decision = await agentOrchestrator.evaluateHazard(hazardType, physicsEngine.constellation[0]);
                
                physicsEngine.pushEvent('DECISION', `Option ${decision.economics.selectedOption} selected. Confidence: ${decision.confidence.toFixed(1)}%`);

                if (decision.fuel_impact > 0) {
                    physicsEngine.constellation[0].fuel -= decision.fuel_impact;
                    physicsEngine.globalKpis.fuelOptimized += decision.fuel_impact;
                }

                // Broadcast decision
                wss.clients.forEach((client) => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({ type: 'AGENT_DECISION', data: decision }));
                    }
                });

                // Post-recovery event
                setTimeout(() => {
                    physicsEngine.pushEvent('RESOLVED', 'Fleet stabilized. All autonomous systems nominal.');
                    // Remove the oldest anomaly to reset the UI state
                    if (physicsEngine.globalKpis.activeAnomalies.length > 0) {
                        physicsEngine.globalKpis.activeAnomalies.shift();
                    }
                    
                    // Tell clients to clear the decision panel
                    wss.clients.forEach((client) => {
                        if (client.readyState === 1) {
                            client.send(JSON.stringify({ type: 'CLEAR_DECISION' }));
                        }
                    });
                }, 5000);

            } else if (data.type === 'SET_TIME_MULTIPLIER') {
                physicsEngine.timeMultiplier = data.payload;
                console.log(`[PHYSICS] Time Dilation Set: ${physicsEngine.timeMultiplier}x`);
            }
        } catch (e) {
            console.error('[WS] Failed to parse message', e);
        }
    });

    ws.on('close', () => {
        console.log('[WS] Client disconnected.');
    });
});

// 10Hz Master Loop
setInterval(() => {
    const telemetry = physicsEngine.tick();
    const payload = JSON.stringify({ type: 'TELEMETRY_STREAM', data: telemetry });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(payload);
        }
    });
}, 100);

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`[STELLAR X] Backend Node Online on port ${PORT}`);
    console.log(`[STELLAR X] Telemetry stream broadcasting at ws://localhost:${PORT}`);
});
