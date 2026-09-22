import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Activity,
  Zap,
  Flame,
  Gauge,
  Check,
  Copy,
  Info,
  Sparkles,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  RefreshCw
} from 'lucide-react';
import {
  ProcessModelType,
  ProcessParameters,
  PIDParameters,
  PIDPoint,
  PIDMetrics,
  PROCESS_MODELS,
  TUNING_PRESETS,
  createDefaultPIDParams,
  createInitialPIDState,
  stepPIDSimulation,
  calculatePIDMetrics,
  simulateRelayAutoTune
} from '../../utils/pidSimulation';
import { LadderElement, Rung } from '../../types';

interface PidTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialElement?: LadderElement | null;
  onApplyToLadder?: (pidParams: {
    kp: number;
    ki: number;
    kd: number;
    setpoint: number;
    minOutput: number;
    maxOutput: number;
  }) => void;
  availableRungs?: Rung[];
}

export const PidTunerModal: React.FC<PidTunerModalProps> = ({
  isOpen,
  onClose,
  initialElement,
  onApplyToLadder,
  availableRungs = []
}) => {
  // 1. Process Plant Selection & Parameters
  const [processType, setProcessType] = useState<ProcessModelType>('thermal');
  const [processParams, setProcessParams] = useState<ProcessParameters>(
    PROCESS_MODELS.thermal.defaultParams
  );

  // 2. PID Parameters
  const [pidParams, setPidParams] = useState<PIDParameters>(() => {
    const def = createDefaultPIDParams();
    if (initialElement && initialElement.type === 'PID_CONTROLLER') {
      return {
        ...def,
        kp: initialElement.pidKp ?? def.kp,
        ki: initialElement.pidKi ?? def.ki,
        kd: initialElement.pidKd ?? def.kd,
        setpoint: initialElement.pidSetpoint ?? def.setpoint,
        minOutput: initialElement.pidMinOutput ?? def.minOutput,
        maxOutput: initialElement.pidMaxOutput ?? def.maxOutput,
        sampleTimeMs: initialElement.pidSampleTimeMs ?? def.sampleTimeMs,
        reverseAction: initialElement.pidReverseAction ?? def.reverseAction
      };
    }
    return def;
  });

  // 3. Simulation Run State & Options
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 4x
  const [sensorNoise, setSensorNoise] = useState<number>(0.2); // 0% to 3%
  const [activeDisturbance, setActiveDisturbance] = useState<number>(0);
  const [history, setHistory] = useState<PIDPoint[]>([]);
  const [metrics, setMetrics] = useState<PIDMetrics>({
    riseTime: null,
    settlingTime: null,
    overshootPercent: 0,
    steadyStateError: 0,
    stability: 'stable',
    summary: 'A szimuláció fut...'
  });

  // Step response tracking
  const [stepStartTime, setStepStartTime] = useState<number>(0);
  const [stepInitialPv, setStepInitialPv] = useState<number>(20);

  // Auto-tune status
  const [isAutoTuning, setIsAutoTuning] = useState<boolean>(false);
  const [autoTuneResult, setAutoTuneResult] = useState<{ ku: number; tu: number } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showCodeView, setShowCodeView] = useState<boolean>(false);
  const [appliedNotification, setAppliedNotification] = useState<boolean>(false);

  // Dragging state on Canvas
  const [isDraggingSp, setIsDraggingSp] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    point: PIDPoint;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simStateRef = useRef(createInitialPIDState(processParams));
  const timeRef = useRef<number>(0);

  // Sync process type change
  const handleProcessChange = (type: ProcessModelType) => {
    setProcessType(type);
    const newParams = { ...PROCESS_MODELS[type].defaultParams };
    setProcessParams(newParams);
    resetSimulation(newParams, pidParams.setpoint);
  };

  // Reset simulation buffer
  const resetSimulation = useCallback(
    (customProcParams = processParams, targetSp = pidParams.setpoint) => {
      simStateRef.current = createInitialPIDState(customProcParams);
      timeRef.current = 0;
      setHistory([]);
      setStepStartTime(0);
      setStepInitialPv(customProcParams.ambient);
      setActiveDisturbance(0);
      setHoveredPoint(null);
    },
    [processParams, pidParams.setpoint]
  );

  // Sync initial element if modal opens with one
  useEffect(() => {
    if (initialElement && initialElement.type === 'PID_CONTROLLER') {
      setPidParams((prev) => ({
        ...prev,
        kp: initialElement.pidKp ?? prev.kp,
        ki: initialElement.pidKi ?? prev.ki,
        kd: initialElement.pidKd ?? prev.kd,
        setpoint: initialElement.pidSetpoint ?? prev.setpoint,
        minOutput: initialElement.pidMinOutput ?? prev.minOutput,
        maxOutput: initialElement.pidMaxOutput ?? prev.maxOutput,
        sampleTimeMs: initialElement.pidSampleTimeMs ?? prev.sampleTimeMs,
        reverseAction: initialElement.pidReverseAction ?? prev.reverseAction
      }));
    }
  }, [initialElement]);

  // Main simulation loop timer
  useEffect(() => {
    if (!isOpen) return;

    const dt = 0.04; // 40ms simulation step interval
    const intervalMs = Math.max(10, Math.round(dt * 1000 / simSpeed));

    const intervalId = setInterval(() => {
      if (!isRunning) return;

      const { nextState, point } = stepPIDSimulation(
        simStateRef.current,
        pidParams,
        processType,
        processParams,
        dt,
        activeDisturbance,
        sensorNoise
      );

      simStateRef.current = nextState;
      timeRef.current += dt;
      point.time = +timeRef.current.toFixed(2);

      setHistory((prev) => {
        const next = [...prev, point];
        // Keep last 35 seconds of data (approx 875 points)
        if (next.length > 875) {
          return next.slice(next.length - 875);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [
    isOpen,
    isRunning,
    simSpeed,
    pidParams,
    processType,
    processParams,
    activeDisturbance,
    sensorNoise
  ]);

  // Re-calculate metrics periodically from recent history
  useEffect(() => {
    if (history.length < 15) return;
    const computed = calculatePIDMetrics(history, stepStartTime, pidParams.setpoint, stepInitialPv);
    setMetrics(computed);
  }, [history, stepStartTime, pidParams.setpoint, stepInitialPv]);

  // Trigger a step test (e.g. +20% jump)
  const handleTriggerStep = (delta: number) => {
    const newSp = Math.max(10, Math.min(95, Math.round(pidParams.setpoint + delta)));
    const currentPv = history.length > 0 ? history[history.length - 1].pv : simStateRef.current.pv;
    setStepStartTime(timeRef.current);
    setStepInitialPv(currentPv);
    setPidParams((prev) => ({ ...prev, setpoint: newSp }));
  };

  // Inject temporary disturbance pulse
  const handleInjectDisturbance = (magnitude: number) => {
    setActiveDisturbance(magnitude);
    setTimeout(() => {
      setActiveDisturbance(0);
    }, 1200);
  };

  // Run Relay Auto-Tune
  const handleRunAutoTune = () => {
    setIsAutoTuning(true);
    setTimeout(() => {
      const res = simulateRelayAutoTune(processType, processParams, pidParams.setpoint);
      setAutoTuneResult({ ku: res.ku, tu: res.tu });
      setPidParams((prev) => ({
        ...prev,
        kp: res.kp,
        ki: res.ki,
        kd: res.kd
      }));
      setIsAutoTuning(false);
      resetSimulation(processParams, pidParams.setpoint);
    }, 600);
  };

  // Apply a tuning preset
  const handleApplyPreset = (preset: typeof TUNING_PRESETS[0]) => {
    setPidParams((prev) => ({
      ...prev,
      kp: preset.kp,
      ki: preset.ki,
      kd: preset.kd
    }));
  };

  // Canvas Strip-Chart Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Coordinate space and margins
    const padL = 48; // Left margin for PV/SP axis
    const padR = 48; // Right margin for MV axis
    const padT = 24; // Top margin
    const padB = 32; // Bottom margin for Time axis
    const plotW = Math.max(10, width - padL - padR);
    const plotH = Math.max(10, height - padT - padB);

    // Value scaling
    const minVal = 0;
    const maxVal = 100;

    const valToY = (val: number) => {
      const clamped = Math.max(minVal, Math.min(maxVal, val));
      return padT + plotH - ((clamped - minVal) / (maxVal - minVal)) * plotH;
    };

    const yToVal = (y: number) => {
      const relY = Math.max(padT, Math.min(padT + plotH, y));
      const ratio = 1 - (relY - padT) / plotH;
      return minVal + ratio * (maxVal - minVal);
    };

    // Time window: show recent 20 seconds
    const timeWindow = 20; // seconds
    const currentTime = timeRef.current;
    const startTime = Math.max(0, currentTime - timeWindow);

    const timeToX = (t: number) => {
      const relTime = t - startTime;
      return padL + (relTime / timeWindow) * plotW;
    };

    // 1. Background Grid & Dividers
    ctx.fillStyle = '#090d16';
    ctx.fillRect(padL, padT, plotW, plotH);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Horizontal grid lines (every 20 units)
    for (let v = 0; v <= 100; v += 20) {
      const y = valToY(v);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      // Left axis label (PV/SP)
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${v}`, padL - 8, y);

      // Right axis label (MV %)
      ctx.fillStyle = '#818cf8';
      ctx.textAlign = 'left';
      ctx.fillText(`${v}%`, padL + plotW + 8, y);
    }

    // Vertical time grid lines (every 2.5 seconds)
    const firstGridTime = Math.ceil(startTime / 2.5) * 2.5;
    for (let t = firstGridTime; t <= currentTime; t += 2.5) {
      const x = timeToX(t);
      if (x >= padL && x <= padL + plotW) {
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${t.toFixed(1)}s`, x, padT + plotH + 6);
      }
    }

    // Disturbance shading region if active
    if (activeDisturbance !== 0) {
      ctx.fillStyle = activeDisturbance > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)';
      ctx.fillRect(padL, padT, plotW, plotH);
    }

    // 2. Plot Curves from History
    const visiblePoints = history.filter((p) => p.time >= startTime - 0.5);

    if (visiblePoints.length > 1) {
      // Plot MV (Manipulated Variable / Controller Output) in Purple
      ctx.beginPath();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      for (let i = 0; i < visiblePoints.length; i++) {
        const pt = visiblePoints[i];
        const x = timeToX(pt.time);
        const y = valToY(pt.mv);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Plot PV (Process Variable) in Emerald with soft glow
      ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < visiblePoints.length; i++) {
        const pt = visiblePoints[i];
        const x = timeToX(pt.time);
        const y = valToY(pt.pv);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset glow

      // Highlight the latest PV point with an indicator dot
      const lastPt = visiblePoints[visiblePoints.length - 1];
      const lastX = timeToX(lastPt.time);
      const lastY = valToY(lastPt.pv);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 3. Setpoint Line (Amber/Gold dashed, draggable!)
    const spY = valToY(pidParams.setpoint);
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, spY);
    ctx.lineTo(padL + plotW, spY);
    ctx.stroke();
    ctx.restore();

    // Draggable Setpoint Handle & Tag
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(padL - 44, spY - 11, 40, 22, 4);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SP ${Math.round(pidParams.setpoint)}`, padL - 24, spY);

    // Draggable grabber indicator on the line
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(padL + plotW - 14, spY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Hover Crosshair & Tooltip
    if (hoveredPoint) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoveredPoint.x, padT);
      ctx.lineTo(hoveredPoint.x, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip Box
      const p = hoveredPoint.point;
      const ttX = Math.min(padL + plotW - 130, Math.max(padL + 10, hoveredPoint.x + 12));
      const ttY = Math.max(padT + 10, Math.min(padT + plotH - 85, hoveredPoint.y - 40));

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, 125, 78, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`t: ${p.time.toFixed(2)} s`, ttX + 8, ttY + 8);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`SP: ${p.sp.toFixed(1)}`, ttX + 8, ttY + 22);

      ctx.fillStyle = '#10b981';
      ctx.fillText(`PV: ${p.pv.toFixed(1)}`, ttX + 8, ttY + 36);

      ctx.fillStyle = '#a855f7';
      ctx.fillText(`MV: ${p.mv.toFixed(1)}%`, ttX + 8, ttY + 50);

      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`e:  ${p.error.toFixed(1)}`, ttX + 8, ttY + 64);
    }

    // 5. Border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    ctx.restore();
  }, [history, pidParams.setpoint, activeDisturbance, hoveredPoint]);

  // Handle Dragging Setpoint on Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const padT = 24;
    const padB = 32;
    const plotH = canvas.clientHeight - padT - padB;

    const currentSpY = padT + plotH - (pidParams.setpoint / 100) * plotH;

    // Check if clicked near setpoint line (within +/- 15px)
    if (Math.abs(mouseY - currentSpY) < 18) {
      setIsDraggingSp(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padL = 48;
    const padR = 48;
    const padT = 24;
    const padB = 32;
    const plotW = canvas.clientWidth - padL - padR;
    const plotH = canvas.clientHeight - padT - padB;

    if (isDraggingSp) {
      const relY = Math.max(padT, Math.min(padT + plotH, mouseY));
      const newSp = Math.round(100 - ((relY - padT) / plotH) * 100);
      setPidParams((prev) => ({ ...prev, setpoint: Math.max(5, Math.min(95, newSp)) }));
    } else {
      // Find nearest history point for crosshair
      if (mouseX >= padL && mouseX <= padL + plotW && history.length > 0) {
        const timeWindow = 20;
        const startTime = Math.max(0, timeRef.current - timeWindow);
        const hoverTime = startTime + ((mouseX - padL) / plotW) * timeWindow;

        let closest = history[0];
        let minDiff = 999999;
        for (const pt of history) {
          const diff = Math.abs(pt.time - hoverTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = pt;
          }
        }
        if (minDiff < 0.8) {
          setHoveredPoint({ x: mouseX, y: mouseY, point: closest });
        } else {
          setHoveredPoint(null);
        }
      } else {
        setHoveredPoint(null);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingSp) {
      setIsDraggingSp(false);
    }
  };

  // Stacked contribution breakdown of the current output
  const lastPoint = history.length > 0 ? history[history.length - 1] : null;
  const pVal = lastPoint ? Math.abs(lastPoint.pTerm) : 0;
  const iVal = lastPoint ? Math.abs(lastPoint.iTerm) : 0;
  const dVal = lastPoint ? Math.abs(lastPoint.dTerm) : 0;
  const sumTerms = Math.max(0.1, pVal + iVal + dVal);
  const pPercent = Math.round((pVal / sumTerms) * 100);
  const iPercent = Math.round((iVal / sumTerms) * 100);
  const dPercent = Math.max(0, 100 - pPercent - iPercent);

  // Copy Arduino C++ Code
  const handleCopyCode = () => {
    const code = `// ==============================================================
// Arduino Industrial Closed-Loop PID Controller Implementation
// Behangolt paraméterek: Kp=${pidParams.kp}, Ki=${pidParams.ki}, Kd=${pidParams.kd}, SP=${pidParams.setpoint}
// ==============================================================

struct PIDController {
  float kp;
  float ki;
  float kd;
  float setpoint;
  float integral;
  float prevPv;
  float filteredD;
  unsigned long lastTime;
  unsigned long sampleTimeMs;
  float outMin;
  float outMax;
};

// Deklaráció a behangolt értékekkel
PIDController pidLoop = {
  ${pidParams.kp}f,   // Kp: Arányos erősítés
  ${pidParams.ki}f,   // Ki: Integrálási erősítés
  ${pidParams.kd}f,   // Kd: Differenciálási erősítés
  ${pidParams.setpoint}f,  // Setpoint (Alapjel)
  0.0f,    // Integrál akkumulátor
  0.0f,    // Előző PV
  0.0f,    // Szűrt D tag
  0,       // Utolsó futás ideje
  ${pidParams.sampleTimeMs},     // Mintavételezési idő (ms)
  ${pidParams.minOutput}f,    // Min kimenet (pl. 0 PWM)
  ${pidParams.maxOutput}f   // Max kimenet (pl. 255 PWM)
};

float computePID(PIDController &pid, float pv) {
  unsigned long now = millis();
  unsigned long timeChange = now - pid.lastTime;

  if (timeChange >= pid.sampleTimeMs) {
    float dt = (float)timeChange / 1000.0f;
    float error = pid.setpoint - pv;

    // 1. Proportional term
    float pTerm = pid.kp * error;

    // 2. Derivative term on PV with low-pass filter (avoids derivative kick)
    float dPv = (pv - pid.prevPv) / dt;
    float rawD = -pid.kd * dPv;
    float alpha = dt / (dt + (pid.kd / (pid.kp * 10.0f + 0.001f)));
    pid.filteredD += alpha * (rawD - pid.filteredD);

    // 3. Integral term with Anti-Windup conditional clamping
    float candidateI = pid.integral + (pid.ki * error * dt);
    float unclamped = pTerm + candidateI + pid.filteredD;

    if (unclamped >= pid.outMin && unclamped <= pid.outMax) {
      pid.integral = candidateI;
    }

    // 4. Compute clamped output
    float output = constrain(pTerm + pid.integral + pid.filteredD, pid.outMin, pid.outMax);

    pid.prevPv = pv;
    pid.lastTime = now;
    return output;
  }

  // Időközök között visszatérés az utolsó kiszámított értékkel
  return constrain(pid.kp * (pid.setpoint - pv) + pid.integral + pid.filteredD, pid.outMin, pid.outMax);
}

void setup() {
  pinMode(9, OUTPUT); // PWM kimenet
  Serial.begin(9600);
}

void loop() {
  // Beolvasás (pl. analóg szenzor 0..1023 -> 0..100 skálázva)
  float rawSensor = analogRead(A0);
  float processVariable = rawSensor * (100.0f / 1023.0f);

  // PID Számítás
  float controlOutput = computePID(pidLoop, processVariable);

  // Kimenet vezérlés (PWM 0..255)
  analogWrite(9, (int)controlOutput);

  // Telemetria küldés a soros monitorra
  Serial.print("SP:"); Serial.print(pidLoop.setpoint);
  Serial.print(" PV:"); Serial.print(processVariable);
  Serial.print(" CV:"); Serial.println(controlOutput);
}`;

    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Apply to Ladder
  const handleApply = () => {
    if (onApplyToLadder) {
      onApplyToLadder({
        kp: pidParams.kp,
        ki: pidParams.ki,
        kd: pidParams.kd,
        setpoint: pidParams.setpoint,
        minOutput: pidParams.minOutput,
        maxOutput: pidParams.maxOutput
      });
      setAppliedNotification(true);
      setTimeout(() => setAppliedNotification(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        ref={containerRef}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  PID Szabályzó Hangoló & Válaszfüggvény Tesztpad
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950 text-amber-300 border border-amber-800/80">
                  VIRTUAL LOOP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interaktív alapjel-húzás, valós idejű P/I/D szabályozási görbe és zavarás-vizsgálat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCodeView(!showCodeView)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              Arduino C++ Kód
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Applied Notification Banner */}
        {appliedNotification && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-2 flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              A behangolt paraméterek (Kp={pidParams.kp}, Ki={pidParams.ki}, Kd={pidParams.kd}) sikeresen alkalmazva a PLC létradiagramjában!
            </span>
          </div>
        )}

        {/* Code Viewer Panel (Conditional) */}
        {showCodeView && (
          <div className="bg-slate-950 border-b border-slate-800 p-4 relative max-h-60 overflow-y-auto font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sky-400 font-bold flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> Gyártásra Kész Ipari Arduino C++ PID Függvény
              </span>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-sans flex items-center gap-1.5 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Másolva!' : 'Kód Másolása'}
              </button>
            </div>
            <pre className="text-[11px] leading-relaxed text-slate-300 select-all overflow-x-auto p-2 bg-slate-900 rounded border border-slate-800">
              {`// Behangolt Arduino PID rutin
float kp = ${pidParams.kp}f, ki = ${pidParams.ki}f, kd = ${pidParams.kd}f, sp = ${pidParams.setpoint}f;
// Anti-Windup és deriváló aluláteresztő szűrővel a stabil ipari működéshez`}
            </pre>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Control Bar: Process Model & Quick Step Tests */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {/* Process Selection */}
            <div className="lg:col-span-5 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Vezérelt Folyamat Modellje (Plant):
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(PROCESS_MODELS) as ProcessModelType[]).slice(0, 3).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleProcessChange(type)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left truncate ${
                      processType === type
                        ? 'bg-sky-950/80 border-sky-500 text-sky-200 shadow-[0_0_8px_rgba(14,165,233,0.3)]'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    {type === 'thermal' && '🔥 Hőkamra'}
                    {type === 'motor' && '⚡ DC Motor'}
                    {type === 'tank' && '💧 Tartály'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {(Object.keys(PROCESS_MODELS) as ProcessModelType[]).slice(3).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleProcessChange(type)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all text-left truncate ${
                      processType === type
                        ? 'bg-sky-950/80 border-sky-500 text-sky-200 shadow-[0_0_8px_rgba(14,165,233,0.3)]'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    {type === 'servo_2nd' && '⚙️ 2. Rendű Szervó'}
                    {type === 'custom_fopdt' && '📐 Ipari FOPDT'}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Controls & Simulation Speed */}
            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Szimulációs Vezérlés & Sebesség:
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    isRunning
                      ? 'bg-amber-950/60 border-amber-500/80 text-amber-300 hover:bg-amber-900/60'
                      : 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/60'
                  }`}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isRunning ? 'Szünet' : 'Indítás'}
                </button>
                <button
                  onClick={() => resetSimulation()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Alaphelyzet
                </button>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                  {[0.5, 1, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSimSpeed(spd)}
                      className={`px-2 py-1 rounded transition-colors ${
                        simSpeed === spd
                          ? 'bg-slate-700 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-slate-400">Zaj:</span>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={sensorNoise}
                  onChange={(e) => setSensorNoise(parseFloat(e.target.value))}
                  className="w-24 accent-slate-400 h-1 bg-slate-800 rounded"
                />
                <span className="text-[11px] font-mono text-slate-300">
                  {sensorNoise === 0 ? 'Kikapcsolva' : `±${sensorNoise.toFixed(1)}`}
                </span>
              </div>
            </div>

            {/* Test Stimulus & Disturbance Buttons */}
            <div className="lg:col-span-3 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Dinamikus Teszt Lépések:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleTriggerStep(20)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> +20% SP Lépés
                </button>
                <button
                  onClick={() => handleTriggerStep(-20)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 rotate-90" /> -20% SP Lépés
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <button
                  onClick={() => handleInjectDisturbance(-25)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5" /> -25% Zavarás
                </button>
                <button
                  onClick={() => handleInjectDisturbance(25)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-sky-950/40 border border-sky-600/40 text-sky-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> +25% Terhelés
                </button>
              </div>
            </div>
          </div>

          {/* MAIN INTERACTIVE GRAPH CANVAS */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 relative shadow-inner">
            {/* Top Graph Legend & Live Readouts */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-900 text-xs">
              <div className="flex items-center gap-5 font-mono">
                {/* SP */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-amber-500 inline-block rounded-full"></span>
                  <span className="text-slate-400">Alapjel (SP):</span>
                  <span className="text-amber-400 font-bold text-sm">
                    {pidParams.setpoint.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-amber-500/80 font-sans">(Húzható a grafikonon)</span>
                </div>

                {/* PV */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-emerald-500 inline-block rounded-full"></span>
                  <span className="text-slate-400">Folyamat (PV):</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {lastPoint ? lastPoint.pv.toFixed(1) : simStateRef.current.pv.toFixed(1)}
                  </span>
                </div>

                {/* MV */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-purple-500 inline-block rounded-full"></span>
                  <span className="text-slate-400">Kimenet (MV):</span>
                  <span className="text-purple-400 font-bold text-sm">
                    {lastPoint ? `${lastPoint.mv.toFixed(1)}%` : '0%'}
                  </span>
                </div>

                {/* Error */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Hiba (e):</span>
                  <span
                    className={`font-bold ${
                      lastPoint && Math.abs(lastPoint.error) > 5 ? 'text-rose-400' : 'text-slate-300'
                    }`}
                  >
                    {lastPoint ? (lastPoint.error > 0 ? `+${lastPoint.error.toFixed(1)}` : lastPoint.error.toFixed(1)) : '0.0'}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    metrics.stability === 'stable'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                      : metrics.stability === 'underdamped'
                      ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                      : 'bg-rose-950 text-rose-300 border-rose-700/60'
                  }`}
                >
                  {metrics.stability === 'stable' && '● Stabil Rendszer'}
                  {metrics.stability === 'underdamped' && '▲ Lengő Válasz'}
                  {metrics.stability === 'overdamped' && '◆ Túlcsillapított'}
                  {metrics.stability === 'oscillating' && '⚠️ Rezonáns / Erős Túllövés'}
                  {metrics.stability === 'unstable' && '✕ Instabil'}
                </span>
              </div>
            </div>

            {/* Canvas Strip Chart Container */}
            <div className="relative w-full h-80 my-2 cursor-crosshair">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="w-full h-full block rounded-lg"
              />

              {/* Dragging Feedback Badge */}
              {isDraggingSp && (
                <div className="absolute top-4 right-4 bg-amber-500 text-slate-950 px-3 py-1 rounded-md font-mono font-bold text-xs shadow-lg animate-pulse">
                  Új Alapjel: {pidParams.setpoint}
                </div>
              )}
            </div>

            {/* Bottom Graphic Gauge: P - I - D Output Contribution Split */}
            <div className="pt-2 border-t border-slate-900 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Szabályzó Kimenet Komponens Megoszlás (Effort Split):</span>
                <div className="flex items-center gap-4">
                  <span className="text-sky-400">
                    P: {pPercent}% ({lastPoint ? lastPoint.pTerm.toFixed(1) : 0})
                  </span>
                  <span className="text-amber-400">
                    I: {iPercent}% ({lastPoint ? lastPoint.iTerm.toFixed(1) : 0})
                  </span>
                  <span className="text-rose-400">
                    D: {dPercent}% ({lastPoint ? lastPoint.dTerm.toFixed(1) : 0})
                  </span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-slate-800 flex">
                <div
                  style={{ width: `${pPercent}%` }}
                  className="bg-sky-500 transition-all duration-100"
                  title="P Tag (Arányos)"
                />
                <div
                  style={{ width: `${iPercent}%` }}
                  className="bg-amber-500 transition-all duration-100"
                  title="I Tag (Integráló)"
                />
                <div
                  style={{ width: `${dPercent}%` }}
                  className="bg-rose-500 transition-all duration-100"
                  title="D Tag (Differenciáló)"
                />
              </div>
            </div>
          </div>

          {/* SLIDERS & TUNING CONTROLS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Proportional Gain (Kp) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400"></div>
                  <span className="text-sm font-bold text-sky-400">Kp (Arányos erősítés)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setPidParams((p) => ({ ...p, kp: +(Math.max(0, p.kp - 0.2)).toFixed(2) }))
                    }
                    className="w-6 h-6 rounded bg-slate-900 border border-slate-700 text-xs font-mono hover:bg-slate-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="25"
                    value={pidParams.kp}
                    onChange={(e) =>
                      setPidParams((p) => ({ ...p, kp: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-sm text-sky-300"
                  />
                  <button
                    onClick={() =>
                      setPidParams((p) => ({ ...p, kp: +(Math.min(25, p.kp + 0.2)).toFixed(2) }))
                    }
                    className="w-6 h-6 rounded bg-slate-900 border border-slate-700 text-xs font-mono hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={pidParams.kp}
                onChange={(e) => setPidParams((p) => ({ ...p, kp: parseFloat(e.target.value) }))}
                className="w-full accent-sky-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 leading-tight">
                A pillanatnyi hiba azonnali arányos ellenhatása. Növelése gyorsítja a rendszert, de túlzott értéke instabilitást és lengéseket okoz.
              </p>
            </div>

            {/* 2. Integral Gain (Ki) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <span className="text-sm font-bold text-amber-400">Ki (Integrálási erősítés)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setPidParams((p) => ({ ...p, ki: +(Math.max(0, p.ki - 0.1)).toFixed(2) }))
                    }
                    className="w-6 h-6 rounded bg-slate-900 border border-slate-700 text-xs font-mono hover:bg-slate-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="10"
                    value={pidParams.ki}
                    onChange={(e) =>
                      setPidParams((p) => ({ ...p, ki: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-sm text-amber-300"
                  />
                  <button
                    onClick={() =>
                      setPidParams((p) => ({ ...p, ki: +(Math.min(10, p.ki + 0.1)).toFixed(2) }))
                    }
                    className="w-6 h-6 rounded bg-slate-900 border border-slate-700 text-xs font-mono hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.05"
                value={pidParams.ki}
                onChange={(e) => setPidParams((p) => ({ ...p, ki: parseFloat(e.target.value) }))}
                className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Anti-Windup: Aktív</span>
                <span className="font-mono text-amber-400/90">
                  Ti ≈ {pidParams.ki > 0 ? (pidParams.kp / pidParams.ki).toFixed(2) : '∞'} s
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Megszünteti a maradó szabályozási eltérést (offset). Túl magas értéke túllövést (overshoot) és lassú csillapodást eredményez.
              </p>
            </div>

            {/* 3. Derivative Gain (Kd) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                  <span className="text-sm font-bold text-rose-400">Kd (Differenciálási erősítés)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setPidParams((p) => ({ ...p, kd: +(Math.max(0, p.kd - 0.1)).toFixed(2) }))
                    }
                    className="w-6 h-6 rounded bg-slate-900 border border-slate-700 text-xs font-mono hover:bg-slate-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="6"
                    value={pidParams.kd}
                    onChange={(e) =>
                      setPidParams((p) => ({ ...p, kd: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-sm text-rose-300"
                  />
                  <button
                    onClick={() =>
                      setPidParams((p) => ({ ...p, kd: +(Math.min(6, p.kd + 0.1)).toFixed(2) }))
                    }
                    className="w-6 h-6 rounded bg-slate-900 border border-slate-700 text-xs font-mono hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.05"
                value={pidParams.kd}
                onChange={(e) => setPidParams((p) => ({ ...p, kd: parseFloat(e.target.value) }))}
                className="w-full accent-rose-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>D-szűrő N = 10</span>
                <span className="font-mono text-rose-400/90">
                  Td ≈ {pidParams.kp > 0 ? (pidParams.kd / pidParams.kp).toFixed(2) : 0} s
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Előrejelzi a hiba változási sebességét és csillapítja a lendületet, csökkentve a túllövést. Zajos szenzoroknál óvatosan használandó.
              </p>
            </div>
          </div>

          {/* PERFORMANCE METRICS & TUNING PRESETS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Step Response Metrics Card */}
            <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  Szabályozási Minőségi Jellemzők (Lépésválasz)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Valós idejű analitika</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Túllövés (Overshoot Mp):</div>
                  <div
                    className={`text-lg font-mono font-bold ${
                      metrics.overshootPercent > 20
                        ? 'text-rose-400'
                        : metrics.overshootPercent > 8
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {metrics.overshootPercent}%
                  </div>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Felfutási Idő (tr 10-90%):</div>
                  <div className="text-lg font-mono font-bold text-sky-400">
                    {metrics.riseTime !== null ? `${metrics.riseTime} s` : '—'}
                  </div>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Beállási Idő (ts ±2% sáv):</div>
                  <div className="text-lg font-mono font-bold text-purple-400">
                    {metrics.settlingTime !== null ? `${metrics.settlingTime} s` : 'Folyamatban...'}
                  </div>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Maradó Hiba (Steady Error):</div>
                  <div
                    className={`text-lg font-mono font-bold ${
                      metrics.steadyStateError > 1.0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {metrics.steadyStateError}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{metrics.summary}</span>
              </div>
            </div>

            {/* Quick Tuning Presets & Auto-Tuner */}
            <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Hangolási Módszerek & Gyors Profilok (Presets)
                </h3>
                <button
                  onClick={handleRunAutoTune}
                  disabled={isAutoTuning}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAutoTuning ? 'animate-spin' : ''}`} />
                  {isAutoTuning ? 'Auto-Tune Mérés...' : 'Relé Auto-Tune Futtatása'}
                </button>
              </div>

              {autoTuneResult && (
                <div className="p-2 rounded bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between">
                  <span>
                    Åström-Hägglund Relé Eredmény: Ku = <strong>{autoTuneResult.ku}</strong>, Tu = <strong>{autoTuneResult.tu}s</strong>
                  </span>
                  <span className="text-[11px] text-amber-400">Ziegler-Nichols Kp, Ki, Kd beállítva!</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {TUNING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-850 text-left transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-400">
                        {preset.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {preset.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {preset.description}
                    </div>
                    <div className="text-[10px] font-mono text-amber-400/90 mt-2 flex gap-3">
                      <span>Kp: {preset.kp}</span>
                      <span>Ki: {preset.ki}</span>
                      <span>Kd: {preset.kd}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-slate-300">
              Behangolt: Kp={pidParams.kp} | Ki={pidParams.ki} | Kd={pidParams.kd} | SP={pidParams.setpoint}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Bezárás
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              <Check className="w-4 h-4" />
              Alkalmazás a Létradiagramban
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
