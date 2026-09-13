export type ProcessModelType = 'thermal' | 'motor' | 'tank' | 'servo_2nd' | 'custom_fopdt';

export interface ProcessParameters {
  gain: number;            // Process Gain K
  timeConstant: number;    // Time Constant tau (seconds)
  deadTime: number;        // Transport Delay / Dead Time theta (seconds)
  damping: number;         // Damping ratio zeta (for 2nd order)
  naturalFreq: number;     // Natural frequency omega_n (rad/s)
  ambient: number;         // Ambient base value (e.g. 20.0 °C)
}

export interface PIDParameters {
  kp: number;              // Proportional gain
  ki: number;              // Integral gain
  kd: number;              // Derivative gain
  setpoint: number;        // Target setpoint value (0 - 100)
  minOutput: number;       // Min output (e.g. 0)
  maxOutput: number;       // Max output (e.g. 100 or 255)
  derivativeFilterN: number; // Low pass filter factor for derivative (e.g. 10)
  antiWindup: boolean;     // Enable integrator clamping anti-windup
  sampleTimeMs: number;    // Execution loop time (e.g. 50 ms)
  reverseAction: boolean;  // False = Direct (heating), True = Reverse (cooling)
}

export interface PIDInternalState {
  pv: number;              // Current process variable
  pvVelocity: number;      // Velocity for 2nd order systems
  integral: number;        // Accumulated integral term
  prevError: number;       // e(t-1)
  prevPv: number;          // pv(t-1)
  filteredD: number;       // Filtered derivative value
  lastOutput: number;      // Last computed output
  delayBuffer: number[];   // Ring buffer for transport dead time
  delayIndex: number;
}

export interface PIDPoint {
  time: number;            // Simulation time in seconds
  sp: number;              // Setpoint
  pv: number;              // Process Variable
  mv: number;              // Manipulated Variable (Controller Output 0-100%)
  error: number;           // SP - PV
  pTerm: number;           // Contribution of P
  iTerm: number;           // Contribution of I
  dTerm: number;           // Contribution of D
  disturbance: number;     // Applied external load
}

export interface PIDMetrics {
  riseTime: number | null;          // 10% to 90% rise time in seconds
  settlingTime: number | null;      // Time to stay within +/- 2% band of setpoint
  overshootPercent: number;         // Percentage overshoot above setpoint
  steadyStateError: number;        // Remaining error after settling
  stability: 'stable' | 'underdamped' | 'overdamped' | 'oscillating' | 'unstable';
  summary: string;
}

export const PROCESS_MODELS: Record<
  ProcessModelType,
  { name: string; description: string; unit: string; defaultParams: ProcessParameters }
> = {
  thermal: {
    name: 'Hőmérséklet-kamra (Thermal)',
    description: '1. rendű fűtési rendszer hűléssel és tehetetlenséggel. Tipikus kemencék, extrúderek.',
    unit: '°C',
    defaultParams: {
      gain: 0.8,
      timeConstant: 3.5,
      deadTime: 0.3,
      damping: 1.0,
      naturalFreq: 1.0,
      ambient: 20.0
    }
  },
  motor: {
    name: 'DC Motor Fordulatszám (Velocity)',
    description: 'Gyors elektromechanikai hajtás lendkerékkel és súrlódási ellenállással.',
    unit: 'RPM %',
    defaultParams: {
      gain: 1.0,
      timeConstant: 0.9,
      deadTime: 0.05,
      damping: 1.0,
      naturalFreq: 2.0,
      ambient: 0.0
    }
  },
  tank: {
    name: 'Folyadékszint / Tartály (Tank Level)',
    description: 'Integráló folyamat beömlő szivattyúval és gravitációs leürítő szeleppel.',
    unit: '%',
    defaultParams: {
      gain: 0.6,
      timeConstant: 4.5,
      deadTime: 0.2,
      damping: 1.0,
      naturalFreq: 0.8,
      ambient: 0.0
    }
  },
  servo_2nd: {
    name: 'Pozicionáló Szervókar (2nd Order)',
    description: '2. rendű rugó-tömeg-csillapító rendszer lengésekkel és rezonanciával.',
    unit: '°',
    defaultParams: {
      gain: 1.0,
      timeConstant: 1.5,
      deadTime: 0.0,
      damping: 0.35, // Underdamped!
      naturalFreq: 3.0,
      ambient: 0.0
    }
  },
  custom_fopdt: {
    name: 'Egyedi Ipari FOPDT Folyamat',
    description: 'Szabadon konfigurálható K (erősítés), tau (időállandó) és L (holtidő).',
    unit: 'PV',
    defaultParams: {
      gain: 1.0,
      timeConstant: 2.5,
      deadTime: 0.5,
      damping: 1.0,
      naturalFreq: 1.5,
      ambient: 10.0
    }
  }
};

export function createDefaultPIDParams(): PIDParameters {
  return {
    kp: 3.2,
    ki: 0.8,
    kd: 0.6,
    setpoint: 60.0,
    minOutput: 0.0,
    maxOutput: 100.0,
    derivativeFilterN: 10,
    antiWindup: true,
    sampleTimeMs: 50,
    reverseAction: false
  };
}

export function createInitialPIDState(processParams: ProcessParameters): PIDInternalState {
  const delaySteps = Math.max(1, Math.round((processParams.deadTime || 0) / 0.05));
  return {
    pv: processParams.ambient,
    pvVelocity: 0,
    integral: 0,
    prevError: 0,
    prevPv: processParams.ambient,
    filteredD: 0,
    lastOutput: 0,
    delayBuffer: new Array(delaySteps).fill(0),
    delayIndex: 0
  };
}

/**
 * Step the PID controller and physical process forward by dt seconds.
 */
export function stepPIDSimulation(
  state: PIDInternalState,
  pid: PIDParameters,
  processType: ProcessModelType,
  processParams: ProcessParameters,
  dt: number,
  disturbance: number = 0,
  noiseMagnitude: number = 0
): { nextState: PIDInternalState; point: PIDPoint } {
  // 1. Add sensor measurement noise if requested
  const noise = noiseMagnitude > 0 ? (Math.random() - 0.5) * 2 * noiseMagnitude : 0;
  const measuredPv = state.pv + noise;

  // 2. Compute error
  const rawError = pid.setpoint - measuredPv;
  const error = pid.reverseAction ? -rawError : rawError;

  // 3. Proportional term
  const pTerm = pid.kp * error;

  // 4. Derivative term (computed on PV to avoid derivative kick during step changes in setpoint)
  const dPv = (state.pv - state.prevPv) / Math.max(0.001, dt);
  const rawD = pid.reverseAction ? (pid.kd * dPv) : (-pid.kd * dPv);

  // Low-pass filter for derivative to suppress high frequency noise
  const alpha = dt / (dt + (pid.kd / Math.max(0.1, pid.kp * pid.derivativeFilterN)));
  const filteredD = state.filteredD + alpha * (rawD - state.filteredD);
  const dTerm = filteredD;

  // 5. Integral term with Anti-Windup conditional clamping
  let candidateIntegral = state.integral + pid.ki * error * dt;

  // Estimate unclamped output
  const unclampedMv = pTerm + candidateIntegral + dTerm;

  if (pid.antiWindup) {
    if (unclampedMv > pid.maxOutput && error > 0) {
      // Saturated high: freeze integration up
      candidateIntegral = state.integral;
    } else if (unclampedMv < pid.minOutput && error < 0) {
      // Saturated low: freeze integration down
      candidateIntegral = state.integral;
    }
  }

  const iTerm = candidateIntegral;

  // 6. Compute clamped Manipulated Variable (Controller Output)
  const mv = Math.max(pid.minOutput, Math.min(pid.maxOutput, pTerm + iTerm + dTerm));

  // 7. Propagate Dead Time Delay Buffer
  const bufferLen = Math.max(1, Math.round((processParams.deadTime || 0) / Math.max(0.01, dt)));
  let effectiveBuffer = state.delayBuffer;
  if (effectiveBuffer.length !== bufferLen) {
    effectiveBuffer = new Array(bufferLen).fill(mv);
  }
  const nextDelayIndex = (state.delayIndex + 1) % bufferLen;
  const delayedMv = effectiveBuffer[state.delayIndex] ?? mv;
  effectiveBuffer[state.delayIndex] = mv;

  // 8. Propagate Physical Process Model ODE
  let nextPv = state.pv;
  let nextVelocity = state.pvVelocity;

  if (processType === 'thermal') {
    // 1st order lag with ambient cooling and thermal loss
    const targetPv = processParams.ambient + (delayedMv * processParams.gain) + disturbance;
    const dpv_dt = (targetPv - state.pv) / Math.max(0.1, processParams.timeConstant);
    nextPv = state.pv + dpv_dt * dt;
  } else if (processType === 'motor') {
    // 1st order velocity response with inertia
    const targetSpeed = delayedMv * processParams.gain + disturbance;
    const dpv_dt = (targetSpeed - state.pv) / Math.max(0.05, processParams.timeConstant);
    nextPv = Math.max(0, state.pv + dpv_dt * dt);
  } else if (processType === 'tank') {
    // Integrating liquid level: inflow proportional to MV, outflow proportional to sqrt(level)
    const inflow = (delayedMv / 100) * processParams.gain;
    const outflow = 0.15 * Math.sqrt(Math.max(0, state.pv));
    const dh_dt = (inflow - outflow + disturbance * 0.01) * 10 / Math.max(0.5, processParams.timeConstant);
    nextPv = Math.max(0, Math.min(100, state.pv + dh_dt * dt));
  } else if (processType === 'servo_2nd') {
    // 2nd order underdamped spring-mass-damper: d2x/dt2 + 2*zeta*wn*dx/dt + wn^2*x = wn^2*K*u
    const wn = processParams.naturalFreq || 2.0;
    const zeta = processParams.damping || 0.4;
    const target = (delayedMv * processParams.gain) + disturbance;
    const acceleration = (wn * wn) * (target - state.pv) - 2 * zeta * wn * state.pvVelocity;
    nextVelocity = state.pvVelocity + acceleration * dt;
    nextPv = state.pv + nextVelocity * dt;
  } else {
    // Custom FOPDT
    const targetPv = processParams.ambient + (delayedMv * processParams.gain) + disturbance;
    const dpv_dt = (targetPv - state.pv) / Math.max(0.1, processParams.timeConstant);
    nextPv = state.pv + dpv_dt * dt;
  }

  const nextState: PIDInternalState = {
    pv: nextPv,
    pvVelocity: nextVelocity,
    integral: candidateIntegral,
    prevError: error,
    prevPv: state.pv,
    filteredD: filteredD,
    lastOutput: mv,
    delayBuffer: effectiveBuffer,
    delayIndex: nextDelayIndex
  };

  const point: PIDPoint = {
    time: 0, // will be stamped by caller
    sp: pid.setpoint,
    pv: nextPv,
    mv: mv,
    error: error,
    pTerm: pTerm,
    iTerm: iTerm,
    dTerm: dTerm,
    disturbance: disturbance
  };

  return { nextState, point };
}

/**
 * Calculate standard control loop metrics from history
 */
export function calculatePIDMetrics(
  history: PIDPoint[],
  stepTime: number,
  targetSP: number,
  initialPV: number
): PIDMetrics {
  if (history.length < 10) {
    return {
      riseTime: null,
      settlingTime: null,
      overshootPercent: 0,
      steadyStateError: 0,
      stability: 'stable',
      summary: 'Adatgyűjtés folyamatban...'
    };
  }

  const deltaTotal = targetSP - initialPV;
  if (Math.abs(deltaTotal) < 0.1) {
    const last = history[history.length - 1];
    return {
      riseTime: null,
      settlingTime: null,
      overshootPercent: 0,
      steadyStateError: Math.abs(last.sp - last.pv),
      stability: 'stable',
      summary: 'Nyugalmi egyensúlyban.'
    };
  }

  const p10 = initialPV + 0.1 * deltaTotal;
  const p90 = initialPV + 0.9 * deltaTotal;

  let t10: number | null = null;
  let t90: number | null = null;
  let maxPv = initialPV;
  let minPv = initialPV;

  for (const pt of history) {
    if (pt.time >= stepTime) {
      if (pt.pv > maxPv) maxPv = pt.pv;
      if (pt.pv < minPv) minPv = pt.pv;

      if (deltaTotal > 0) {
        if (t10 === null && pt.pv >= p10) t10 = pt.time;
        if (t90 === null && pt.pv >= p90) t90 = pt.time;
      } else {
        if (t10 === null && pt.pv <= p10) t10 = pt.time;
        if (t90 === null && pt.pv <= p90) t90 = pt.time;
      }
    }
  }

  const riseTime = (t10 !== null && t90 !== null && t90 >= t10) ? +(t90 - t10).toFixed(2) : null;

  // Overshoot
  let overshootVal = 0;
  if (deltaTotal > 0) {
    overshootVal = Math.max(0, maxPv - targetSP);
  } else {
    overshootVal = Math.max(0, targetSP - minPv);
  }
  const overshootPercent = +((overshootVal / Math.abs(deltaTotal)) * 100).toFixed(1);

  // Settling Time (stays within 2% band)
  const band = Math.max(0.5, Math.abs(deltaTotal) * 0.02);
  let settlingTime: number | null = null;

  for (let i = history.length - 1; i >= 0; i--) {
    const pt = history[i];
    if (pt.time >= stepTime) {
      if (Math.abs(pt.pv - targetSP) > band) {
        if (i < history.length - 1) {
          settlingTime = +(history[i + 1].time - stepTime).toFixed(2);
        }
        break;
      }
    }
  }

  const lastPt = history[history.length - 1];
  const steadyStateError = +(Math.abs(lastPt.sp - lastPt.pv)).toFixed(2);

  // Stability detection
  let stability: PIDMetrics['stability'] = 'stable';
  let summary = 'Stabil és beállt állapot.';

  if (overshootPercent > 35) {
    stability = 'oscillating';
    summary = 'Erős lengések és magas túllövés! Növeld a D erősítést vagy csökkentsd a P/I tagot.';
  } else if (overshootPercent > 12) {
    stability = 'underdamped';
    summary = 'Kissé alulcsillapított reakció, elfogadható gyorsasággal.';
  } else if (overshootPercent === 0 && (riseTime && riseTime > 4.0)) {
    stability = 'overdamped';
    summary = 'Túlcsillapított, lassú felfutású rendszer. A P erősítés óvatos növelése gyorsíthatja.';
  } else if (steadyStateError > 3.0 && Math.abs(lastPt.iTerm) < 0.01) {
    summary = 'Maradó szabályozási eltérés van jelen. Engedélyezd vagy növeld az Integráló (Ki) tagot!';
  } else {
    summary = 'Optimális, jól csillapított ipari szabályozási válasz.';
  }

  return {
    riseTime,
    settlingTime,
    overshootPercent,
    steadyStateError,
    stability,
    summary
  };
}

/**
 * Built-in Tuning Presets for Quick Setup
 */
export interface TuningPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  kp: number;
  ki: number;
  kd: number;
}

export const TUNING_PRESETS: TuningPreset[] = [
  {
    id: 'critically_damped',
    name: 'Kritikusan Csillapított (Túllövésmentes)',
    badge: 'Biztonságos',
    description: 'Sima, túllövés nélküli beállás kényes hőkezelésekhez és folyadéktartályokhoz.',
    kp: 2.2,
    ki: 0.45,
    kd: 0.9
  },
  {
    id: 'balanced_industrial',
    name: 'Kiegyensúlyozott Ipari PID',
    badge: 'Ajánlott',
    description: 'Gyors felfutás enyhe (<8%) túllövéssel és kiváló zavarelnyomással.',
    kp: 3.5,
    ki: 0.9,
    kd: 0.65
  },
  {
    id: 'aggressive_fast',
    name: 'Agresszív & Gyors Reakció',
    badge: 'Dinamikus',
    description: 'Rövid felfutási idő gyors szervókhoz és DC motor fordulatszámhoz.',
    kp: 5.5,
    ki: 1.8,
    kd: 1.2
  },
  {
    id: 'pi_only',
    name: 'PI Szabályzó (Nincs D tag)',
    badge: 'Zajmentes',
    description: 'Zajos analóg szenzorokhoz (áramlás, nyomás). Nincs deriválási zajerősítés.',
    kp: 2.8,
    ki: 0.8,
    kd: 0.0
  },
  {
    id: 'p_only',
    name: 'P-Csak (Arányos Alap)',
    badge: 'Oktató',
    description: 'Csak P tag. Szemlélteti az integrátor nélküli maradó szabályozási hibát (offset).',
    kp: 3.0,
    ki: 0.0,
    kd: 0.0
  }
];

/**
 * Simulate an Åström-Hägglund Relay Auto-Tuner test on the process
 * to measure ultimate gain (Ku) and period (Tu) and output Z-N gains.
 */
export function simulateRelayAutoTune(
  processType: ProcessModelType,
  processParams: ProcessParameters,
  setpoint: number = 50
): { kp: number; ki: number; kd: number; ku: number; tu: number } {
  let simState = createInitialPIDState(processParams);
  simState.pv = setpoint * 0.7; // start slightly below
  const dt = 0.02;
  const relayAmplitude = 40.0; // +/- 40% relay kick
  const baseMv = 50.0;

  const peaks: { time: number; pv: number }[] = [];
  let isRising = true;
  let prevPv = simState.pv;

  // Run 600 steps (12 seconds) of relay cycling
  for (let step = 0; step < 750; step++) {
    const t = step * dt;
    // Relay control: hysteresis 0.5
    const mv = simState.pv < setpoint ? (baseMv + relayAmplitude) : (baseMv - relayAmplitude);

    // Propagate process
    const dummyPid: PIDParameters = {
      kp: 1, ki: 0, kd: 0, setpoint, minOutput: 0, maxOutput: 100,
      derivativeFilterN: 10, antiWindup: false, sampleTimeMs: 20, reverseAction: false
    };

    const res = stepPIDSimulation(simState, dummyPid, processType, processParams, dt, 0, 0);
    simState = res.nextState;

    if (step > 150) {
      if (isRising && simState.pv < prevPv) {
        peaks.push({ time: t, pv: prevPv });
        isRising = false;
      } else if (!isRising && simState.pv > prevPv) {
        isRising = true;
      }
    }
    prevPv = simState.pv;
  }

  // Calculate oscillation period Tu and amplitude a from last 3 peaks
  let tu = 2.0;
  let a = 8.0;
  if (peaks.length >= 3) {
    const last3 = peaks.slice(-3);
    tu = last3[2].time - last3[0].time;
    a = Math.max(1.0, (last3[2].pv - setpoint));
  } else {
    // Default fallback based on process params
    tu = Math.max(0.5, (processParams.timeConstant * 0.8) + (processParams.deadTime * 2));
    a = 6.0;
  }

  // Describing function for relay: Ku = (4 * d) / (pi * a)
  const ku = Math.max(0.5, +( (4 * relayAmplitude) / (Math.PI * Math.max(0.5, a)) ).toFixed(2));

  // Ziegler-Nichols Classic PID recommendations:
  // Kp = 0.6 * Ku, Ti = 0.5 * Tu (Ki = Kp / Ti), Td = 0.125 * Tu (Kd = Kp * Td)
  const kp = +(0.6 * ku).toFixed(2);
  const ti = Math.max(0.2, 0.5 * tu);
  const ki = +(kp / ti).toFixed(2);
  const td = 0.125 * tu;
  const kd = +(kp * td).toFixed(2);

  return {
    kp: Math.max(0.1, Math.min(25, kp)),
    ki: Math.max(0.01, Math.min(10, ki)),
    kd: Math.max(0.01, Math.min(8, kd)),
    ku: +ku.toFixed(2),
    tu: +tu.toFixed(2)
  };
}
