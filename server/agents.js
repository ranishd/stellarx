require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const db = require('./database');

// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

class FleetOptimizationEngine {
    
    // Utility = w1*RiskReduction + w2*MissionSuccess + w3*CoverageRetention - w4*FuelCost
    calculateUtility(fuelCost, riskReduction, missionImpact, coverageImpact) {
        const w1 = 0.35;
        const w2 = 0.25;
        const w3 = 0.25;
        const w4 = 0.15;
        
        const missionSuccess = 100 + missionImpact;
        const coverageRetention = 100 + (coverageImpact || 0);

        const score = (w1 * riskReduction) + (w2 * missionSuccess) + (w3 * coverageRetention) - (w4 * fuelCost);
        return Math.max(0, Math.min(100, score));
    }

    async evaluateHazard(hazardType, telemetry) {
        console.log(`[OPTIMIZATION ENGINE] Processing anomaly: ${hazardType}`);

        let optionA, optionB;
        let hexPayload = '0x00 0x00 IDLE';
        let fuelCost = 0;

        if (hazardType === 'DEBRIS_STORM') {
            optionA = { id: 'A', description: "Evade Debris (Retrograde Burn)", fuelCost: 5.2, riskReduction: 98, missionImpact: -15, coverageImpact: -3 };
            optionB = { id: 'B', description: "Hold Course (Accept Risk)", fuelCost: 0, riskReduction: 0, missionImpact: 0, coverageImpact: 0 };
            hexPayload = '0xAA 0x01 BURN 0.40';
        } else if (hazardType === 'SOLAR_FLARE') {
            optionA = { id: 'A', description: "Full Shutdown (Maximum Protection)", fuelCost: 0, riskReduction: 90, missionImpact: -100, coverageImpact: -15 };
            optionB = { id: 'B', description: "Partial Feathering (Maintain Optics)", fuelCost: 1.5, riskReduction: 60, missionImpact: -60, coverageImpact: -5 };
            hexPayload = '0xAA 0x02 SHLD 0.60';
        } else if (hazardType === 'SYSTEM_FAILURE') {
            optionA = { id: 'A', description: "Attempt Reboot (Risk Total Loss)", fuelCost: 0, riskReduction: 10, missionImpact: -100, coverageImpact: -12 };
            optionB = { id: 'B', description: "Cross-Node Task Handoff", fuelCost: 0, riskReduction: 99, missionImpact: 0, coverageImpact: -2 };
            hexPayload = '0xFF 0x00 SLP_HANDOFF 42';
        }

        // Score
        optionA.utilityScore = this.calculateUtility(optionA.fuelCost, optionA.riskReduction, optionA.missionImpact, optionA.coverageImpact);
        optionB.utilityScore = this.calculateUtility(optionB.fuelCost, optionB.riskReduction, optionB.missionImpact, optionB.coverageImpact);

        const selectedOption = optionA.utilityScore >= optionB.utilityScore ? optionA : optionB;
        fuelCost = selectedOption.fuelCost;

        // Confidence
        const variance = Math.abs(optionA.utilityScore - optionB.utilityScore);
        const confidence = Math.min(99, 50 + (variance * 0.5));

        selectedOption.utilityBreakdown = {
            riskReduction: selectedOption.riskReduction,
            missionRetention: 100 + selectedOption.missionImpact,
            coverageRetention: 100 + (selectedOption.coverageImpact || 0),
            fuelCost: selectedOption.fuelCost,
            score: selectedOption.utilityScore.toFixed(1)
        };

        const planningPipeline = [
            `Threat Forecast: ${hazardType.replace(/_/g, ' ')}`,
            `Utility Evaluation: Option ${selectedOption.id} scores ${selectedOption.utilityScore.toFixed(1)}`,
            `Outcome Prediction: Coverage retained at ${100 + (selectedOption.coverageImpact || 0)}%`,
            `Action Selection: ${selectedOption.description}`,
            `Execute: Payload ${hexPayload}`
        ];

        const economics = { optionA, optionB, selectedOption: selectedOption.id };

        // AI Explainer
        let safetyResponse, missionResponse, commanderDecision;

        if (ai) {
            try {
                const prompt = `
                You are the AI Explainer for StellarX autonomous constellation OS.
                Hazard: ${hazardType}.
                Option A: ${optionA.description} (Utility: ${optionA.utilityScore.toFixed(1)}, Coverage Impact: ${optionA.coverageImpact}%)
                Option B: ${optionB.description} (Utility: ${optionB.utilityScore.toFixed(1)}, Coverage Impact: ${optionB.coverageImpact}%)
                Engine CHOSE Option ${selectedOption.id} with ${confidence.toFixed(1)}% confidence.
                Write 3 brief robotic logs:
                1. safetyResponse: Survival perspective.
                2. missionResponse: Economic/coverage perspective.
                3. commanderDecision: Authoritative summary.
                Format as JSON: { "safetyResponse": "...", "missionResponse": "...", "commanderDecision": "..." }
                `;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                });
                const result = JSON.parse(response.text);
                safetyResponse = `[SAFETY] ${result.safetyResponse}`;
                missionResponse = `[MISSION] ${result.missionResponse}`;
                commanderDecision = `[CMDR] ${result.commanderDecision}`;
            } catch(e) {
                console.error("[AI EXPLAINER] Error:", e);
                safetyResponse = `[SAFETY] Risk parameters evaluated against deterministic model.`;
                missionResponse = `[MISSION] Economic impact matrices computed. Coverage impact: ${selectedOption.coverageImpact}%`;
                commanderDecision = `[CMDR] Selected Option ${selectedOption.id}. Utility: ${selectedOption.utilityScore.toFixed(1)}. Confidence: ${confidence.toFixed(1)}%`;
            }
        } else {
            if (hazardType === 'DEBRIS_STORM') {
                safetyResponse = `[SAFETY] Collision probability 98.4%. Immediate burn required.`;
                missionResponse = `[MISSION] Evasive burn disrupts imaging. Coverage impact: ${selectedOption.coverageImpact}%. SLA penalty temporary.`;
                commanderDecision = `[CMDR] Utility ${selectedOption.utilityScore.toFixed(1)}. Survival outweighs temporary SLA penalty. Executing burn.`;
            } else if (hazardType === 'SOLAR_FLARE') {
                safetyResponse = `[SAFETY] Radiation threshold exceeded. Partial feathering recommended.`;
                missionResponse = `[MISSION] Full shutdown causes unacceptable coverage loss (-${Math.abs(optionA.coverageImpact)}%). Feathering preserves 40% optics.`;
                commanderDecision = `[CMDR] Utility ${selectedOption.utilityScore.toFixed(1)}. Balanced risk mitigation while preserving coverage.`;
            } else if (hazardType === 'SYSTEM_FAILURE') {
                safetyResponse = `[SAFETY] Primary hardware failure. Reboot carries high risk of total loss.`;
                missionResponse = `[MISSION] Cross-node handoff preserves coverage. Impact only ${Math.abs(optionB.coverageImpact)}%.`;
                commanderDecision = `[CMDR] Utility ${selectedOption.utilityScore.toFixed(1)}. Initiating cross-node handoff to preserve SLA and coverage.`;
            }
        }

        const decisionLog = {
            timestamp: new Date().toISOString(),
            incident: hazardType,
            safety: safetyResponse,
            mission: missionResponse,
            commander: commanderDecision,
            economics,
            fuel_impact: fuelCost,
            hex_payload: hexPayload,
            confidence,
            threatLevel: hazardType === 'DEBRIS_STORM' ? '98%' : hazardType === 'SOLAR_FLARE' ? '72%' : '85%',
            threatType: hazardType.replace(/_/g, ' '),
            fuelCost: `${fuelCost}%`,
            missionImpact: selectedOption.coverageImpact > -5 ? 'LOW' : selectedOption.coverageImpact > -10 ? 'MEDIUM' : 'HIGH',
            utilityBreakdown: selectedOption.utilityBreakdown,
            planningPipeline: planningPipeline,
        };

        db.run(`INSERT INTO agent_decisions (satellite_id, incident_type, safety_agent_input, mission_agent_input, commander_decision, fuel_cost, mission_delay)
                VALUES (1, ?, ?, ?, ?, ?, ?)`, 
                [hazardType, decisionLog.safety, decisionLog.mission, decisionLog.commander, fuelCost, 0], 
                (err) => { if (err) console.error('[DB]', err); });

        return decisionLog;
    }
}

module.exports = new FleetOptimizationEngine();
