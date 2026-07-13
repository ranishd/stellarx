const db = require('./database');

// Constants
const EARTH_RADIUS = 6371; // km
const MU = 398600; // Earth's standard gravitational parameter, km^3/s^2

const MISSION_TYPES = [
    { type: 'WEATHER_OBS', label: 'Weather Observation', basePriority: 90, baseValue: 85 },
    { type: 'MARITIME_TRACK', label: 'Maritime Tracking', basePriority: 80, baseValue: 75 },
    { type: 'COMM_RELAY', label: 'Communications Relay', basePriority: 95, baseValue: 92 },
    { type: 'DISASTER_MON', label: 'Disaster Monitoring', basePriority: 98, baseValue: 95 },
    { type: 'ENV_IMAGING', label: 'Environmental Imaging', basePriority: 70, baseValue: 65 },
];

class PhysicsEngine {
    constructor() {
        // Generate 100 satellites with individual physics states + missions
        this.constellation = Array.from({ length: 100 }, (_, i) => {
            const altitude = 400 + Math.random() * 200; // km
            const a = EARTH_RADIUS + altitude;
            const e = Math.random() * 0.05;
            const i_rad = (Math.random() * 90) * (Math.PI / 180);
            const raan = Math.random() * Math.PI * 2;
            const arg_p = Math.random() * Math.PI * 2;
            const v = Math.sqrt(MU / a);

            // Assign mission and specialization
            const missionDef = MISSION_TYPES[i % MISSION_TYPES.length];
            const specializations = ['COMMUNICATION', 'EARTH OBSERVATION', 'DISASTER RESPONSE', 'SCIENCE'];
            const specialization = specializations[i % specializations.length];

            return {
                id: `STELLAR-${(i + 1).toString().padStart(3, '0')}`,
                status: 'NOMINAL',
                altitude,
                velocity: v,
                fuel: 80 + Math.random() * 20,
                battery: 90 + Math.random() * 10,
                // Keplerian Elements
                a, e, i: i_rad, raan, arg_p,
                trueAnomaly: Math.random() * Math.PI * 2,
                // Mission metadata
                mission: {
                    type: missionDef.type,
                    label: missionDef.label,
                    priority: missionDef.basePriority + Math.floor(Math.random() * 10 - 5),
                    value: missionDef.baseValue + Math.floor(Math.random() * 10 - 5),
                    completion: Math.random() * 0.6 + 0.2, // 20-80%
                    coverageContribution: 8 + Math.floor(Math.random() * 12), // 8-20
                },
                // Advanced Telemetry Metadata
                specialization,
                currentLoad: Math.floor(Math.random() * 60 + 20), // 20-80%
                remainingDeltaV: (Math.random() * 100 + 50).toFixed(1), // 50-150 m/s
                nextBurn: (Math.random() * 4 + 0.5).toFixed(1), // 0.5-4.5 m/s
                confidence: Math.floor(Math.random() * 15 + 85), // 85-99%
            };
        });

        this.hazards = [
            { id: 'OBJ-409', distance: 50, speed: 1.2, approach_vector: [0.1, -0.05, 0.9] }
        ];

        // Dynamic coverage calculation
        this._recalcCoverage();

        this.globalKpis = {
            fleetSurvivalProbability: 97.4,
            missionSuccessRate: 84.1,
            overallFuelEfficiency: 91.0,
            coverageScore: this._calcCoverage(),
            activeAnomalies: [
                { node: 'STELLAR-012', threat: 'THERMAL_SPIKE', status: 'MITIGATING' }
            ],
            strategicForecasts: [
                { time: 'T+12H', type: 'SOLAR STORM', risk: 'HIGH', maneuver: 'Shielding Scheduled' },
                { time: 'T+48H', type: 'CONJUNCTION OBJ-992', risk: 'CRITICAL', maneuver: 'Preemptive 0.2m/s Burn' },
                { time: 'T+72H', type: 'BATTERY DEGRADATION', risk: 'LOW', maneuver: 'Load Balancing Active' }
            ],
            strategicHorizon: {
                tPlus12: { baseline: 85.2, optimized: 96.4 },
                tPlus24: { baseline: 72.1, optimized: 94.8 }
            },
            // Accumulated metrics
            autonomousDecisions: 127,
            threatsResolved: 124,
            missionsReassigned: 8,
            operatorHoursSaved: 342,
            coverageRestored: 15,
            fuelOptimized: 4.2,
        };

        this.timeMultiplier = 1;
        this.simulationTime = 0;

        // Event log for Mission Replay
        this.eventLog = [
            { time: new Date().toISOString(), type: 'SYSTEM', message: 'StellarX Constellation Online. 100 nodes active.' },
            { time: new Date().toISOString(), type: 'COVERAGE', message: `Global coverage stabilized at ${this._calcCoverage().toFixed(1)}%` },
        ];
    }

    _calcCoverage() {
        const activeCount = this.constellation.filter(s => s.status !== 'OFFLINE').length;
        const totalContribution = this.constellation
            .filter(s => s.status !== 'OFFLINE')
            .reduce((sum, s) => sum + s.mission.coverageContribution, 0);
        const maxContribution = this.constellation.reduce((sum, s) => sum + s.mission.coverageContribution, 0);
        return maxContribution > 0 ? (totalContribution / maxContribution) * 100 : 0;
    }

    _recalcCoverage() {
        if (this.globalKpis) {
            this.globalKpis.coverageScore = this._calcCoverage();
        }
    }

    pushEvent(type, message) {
        this.eventLog.push({ time: new Date().toISOString(), type, message });
        if (this.eventLog.length > 20) this.eventLog.shift();
    }

    // Self-healing: find nearest healthy satellite to take over a failed mission
    reassignMission(failedSatIndex) {
        const failedSat = this.constellation[failedSatIndex];
        if (!failedSat) return null;

        const failedMission = { ...failedSat.mission };

        // Capacity-Aware Handoff: Evaluate based on Load, Priority, and Distance
        let bestIdx = -1;
        let bestScore = Infinity;
        for (let j = 0; j < this.constellation.length; j++) {
            if (j === failedSatIndex) continue;
            const s = this.constellation[j];
            if (s.status === 'OFFLINE') continue;
            
            const distance = Math.abs(failedSat.trueAnomaly - s.trueAnomaly);
            // Score lower is better
            const score = (s.currentLoad * 0.5) + (s.mission.priority * 0.3) + (distance * 10);
            
            if (score < bestScore) {
                bestScore = score;
                bestIdx = j;
            }
        }

        if (bestIdx >= 0) {
            const backup = this.constellation[bestIdx];
            const oldMission = backup.mission.label;
            backup.mission = {
                ...failedMission,
                completion: 0, // restart
            };
            this.globalKpis.missionsReassigned++;
            this.globalKpis.coverageRestored++;

            this.pushEvent('HANDOFF', `Mission "${failedMission.label}" reassigned from ${failedSat.id} → ${backup.id}`);
            this.pushEvent('COVERAGE', `Coverage recovering: ${this._calcCoverage().toFixed(1)}%`);

            return { from: failedSat.id, to: backup.id, mission: failedMission.label, backupOldMission: oldMission };
        }
        return null;
    }

    // Physics Tick
    tick() {
        if (this.timeMultiplier === 0) {
            return this._getState();
        }

        const delta = this.timeMultiplier;

        // Process all 100 satellites individually
        this.constellation.forEach(sat => {
            if (sat.status === 'OFFLINE') return;

            // Simple orbital decay
            sat.altitude -= 0.005 * delta;
            
            // Prevent satellites from falling into negative altitude (the server has been running for weeks!)
            if (sat.altitude < 300) {
                sat.altitude = 400 + Math.random() * 200;
            }

            sat.a = EARTH_RADIUS + sat.altitude;
            sat.velocity = Math.sqrt(MU / sat.a);

            // Mean motion
            const n = Math.sqrt(MU / Math.pow(sat.a, 3));
            sat.trueAnomaly += n * 60 * delta;
            if (sat.trueAnomaly > Math.PI * 2) sat.trueAnomaly -= Math.PI * 2;

            // Consume power/fuel
            sat.battery = Math.max(0, sat.battery - 0.02 * delta);
            sat.fuel = Math.max(0, sat.fuel - 0.01 * delta);

            // Advance mission completion
            sat.mission.completion = Math.min(1.0, sat.mission.completion + 0.0002 * delta);
        });

        // Update hazards
        this.hazards.forEach(hazard => {
            hazard.distance -= hazard.speed * delta;
        });
        this.hazards = this.hazards.filter(h => h.distance > 0);
        if (Math.random() < 0.05 && this.hazards.length < 3) {
            this.hazards.push({
                id: `OBJ-${Math.floor(Math.random() * 1000)}`,
                distance: 100 + Math.random() * 50,
                speed: 0.5 + Math.random() * 2,
                approach_vector: [Math.random() - 0.5, Math.random() - 0.5, Math.random()]
            });
        }

        // Recalculate coverage
        this._recalcCoverage();

        // Randomly fluctuate KPIs
        if (Math.random() < 0.05 * delta) {
            this.globalKpis.fleetSurvivalProbability = Math.max(0, Math.min(100, this.globalKpis.fleetSurvivalProbability + (Math.random() - 0.5) * 0.5));
            this.globalKpis.missionSuccessRate = Math.max(0, Math.min(100, this.globalKpis.missionSuccessRate + (Math.random() - 0.5) * 1.0));
            this.globalKpis.overallFuelEfficiency = Math.max(0, Math.min(100, this.globalKpis.overallFuelEfficiency + (Math.random() - 0.5) * 0.2));

            const base = this.globalKpis.fleetSurvivalProbability;
            this.globalKpis.strategicHorizon.tPlus12.baseline = Math.max(0, base - 10 - Math.random() * 5);
            this.globalKpis.strategicHorizon.tPlus12.optimized = Math.min(100, base + Math.random() * 2);
            this.globalKpis.strategicHorizon.tPlus24.baseline = Math.max(0, base - 25 - Math.random() * 5);
            this.globalKpis.strategicHorizon.tPlus24.optimized = Math.min(100, base - 2 + Math.random() * 3);
        }

        // Cycle strategic forecasts
        this.simulationTime += delta;
        if (this.simulationTime > 1000) {
            this.simulationTime = 0;
            const old = this.globalKpis.strategicForecasts.shift();
            this.globalKpis.strategicForecasts.push({
                time: `T+${Math.floor(Math.random()*48 + 72)}H`,
                type: ['MICROMETEOROID SHOWER', 'ORBITAL DECAY', 'NETWORK BLACKOUT', 'THERMAL SPIKE'][Math.floor(Math.random()*4)],
                risk: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random()*4)],
                maneuver: ['Course Correction', 'Handoff Pre-computed', 'Shields Armed', 'Load Shedding'][Math.floor(Math.random()*4)]
            });
        }

        return this._getState();
    }

    _getState() {
        return {
            timestamp: new Date().toISOString(),
            constellation: this.constellation,
            hazards: this.hazards,
            timeMultiplier: this.timeMultiplier,
            globalKpis: this.globalKpis,
            eventLog: this.eventLog,
        };
    }
}

module.exports = new PhysicsEngine();
