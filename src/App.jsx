import { useEffect, useRef, useState } from "react";
import "./App.css";
import { walkingSessions } from "./data/walkingSessions";
import UVCard from "./components/UVCard";

function loaadActiveWalk () {
  try {
    const saved = JSON.parse (
      localStorage.getItem("daylight-active") || "null"
    );

  const validSession =
  typeof saved?.session?.title === "string" &&
  Array.isArray(saved?.session?.steps) &&
  saved.session.steps.every((step) => typeof step === "string");

  const running =
    Number.isFinite(saved?.startedAt) &&
    saved.startedAt > 0;

  const finished = 
    saved?.startedAt === null &&
    Number.isFinite(saved?.finishedSeconds) &&
    saved.finishedSeconds >= 0;

  if (validSession && (running || finished)) {
    return saved;
  }
  } catch {
    // 
  }
  return null;
}

function App() {
  const [restoredWalk] = useState(loaadActiveWalk);
  const [activeStorageError, setActiveStorageError] = useState("")
  const [request, setRequest] = useState("");
  const [duration, setDuration] = useState("20");
  const [intensity, setIntensity] = useState("easy");
  const [submitted, setSubmitted] = useState(restoredWalk !== null);
  const [session, setSession] =useState(restoredWalk?.session ?? null);
  const [startedAt, setStartAt]= useState( restoredWalk?.startedAt ?? null);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
  if (!restoredWalk) return 0;

  if (restoredWalk.startedAt === null) {
    return restoredWalk.finishedSeconds ?? 0;
  }

  return Math.max(
    0,
    Math.floor((Date.now() - restoredWalk.startedAt) / 1000)
  );
});
  const [finishedSeconds, setFinishedSeconds] = useState(restoredWalk?.finishedSeconds ?? null);
  const [outdoorMinutes, setOutdoorMinutes] = useState(restoredWalk?.outdoorMinutes ?? "");
  const [storageError, setStorageError] = useState("");

  const [breaks, setBreaks] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("daylight-breaks") || "[]"
      );

      return Array.isArray(saved)
      ? saved.filter(
        (entry) =>
          entry &&
        typeof entry.id === "string" &&
        typeof entry.title === "string" &&
        Number.isFinite(entry.minutes) &&
        entry.minutes > 0 &&
        Number.isFinite(entry.completedAt)
      )
    : [];
    } catch {
      return[];
    }
  });

const workerRef = useRef(null);
const [isMatching, setIsMatching] = useState(false);
const [aiStatus, setAiStatus] = useState("");



  // timer
  useEffect(() => {
    if (startedAt === null) return;

    function updateTimer() {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(Math.max(0, seconds));
    }

    updateTimer();

    const intervalId = setInterval(updateTimer, 1000);

    document.addEventListener("visibilitychange", updateTimer);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateTimer);
    };
  }, [startedAt]);

  // load history
  /* eslint-disable react-hooks/set-state-in-effect -- Report browser storage success or failure. */
  useEffect(() =>{
    try {
      localStorage.setItem("daylight-breaks", JSON.stringify(breaks));
      setStorageError("");
    } catch {
      setStorageError(
        "Your browser could not save your journal. New entries may disappear after a refresh."
      );
    }
  }, [breaks]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Report browser storage success or failure. */
      useEffect(() => {
        try {
          const hasUnfinishedEntry =
            startedAt !== null || finishedSeconds !== null;

          if (session && hasUnfinishedEntry) {
            localStorage.setItem(
              "daylight-active",
              JSON.stringify({
                session,
                startedAt,
                finishedSeconds,
                outdoorMinutes,
              })
            );
          } else {
            localStorage.removeItem("daylight-active");
          }

          setActiveStorageError("");
        } catch {
          setActiveStorageError(
            "Your current break could not be saved. Keep this page open until you log it."
          );
        }
      }, [session, startedAt, finishedSeconds, outdoorMinutes]);
  
    /* eslint-enable react-hooks/set-state-in-effect */  

  // AI WORKER
  useEffect (() => {
    const worker = new Worker(
      new URL("./aiWorker.js", import.meta.url),
      {type: "module"}
    );

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);
  
function handleSubmit(event) {
  event.preventDefault();

  if (isBusy || isMatching) return;

  const worker = workerRef.current;
  const userRequest = request.trim();
  const totalMinutes = Number(duration);

  if (!worker || !userRequest) {
    setAiStatus("Enter a request, then try again.");
    return;
  }

  const candidates = walkingSessions.filter(
    (walk) => walk.intensity === intensity
  );

  setIsMatching(true);
  setSubmitted(false);
  setSession(null);
  setFinishedSeconds(null);
  setAiStatus("Starting AI matching…");

  worker.onmessage = ({ data }) => {
    if (data.type === "status") {
      setAiStatus(data.message);
    }

    if (data.type === "result") {
      const matchedWalk = data.session;

      setSession({
        title: matchedWalk.title,
        request: userRequest,
        duration: totalMinutes,
        matchedByAI: true,
        steps: [
          "2 minutes: start with an easy walk.",
          `${totalMinutes - 4} minutes: ${matchedWalk.instruction}`,
          "2 minutes: ease your pace and finish somewhere suitable.",
        ],
      });

      setSubmitted(true);
      setIsMatching(false);
      setAiStatus("Your walk was matched on this device.");
    }

    if (data.type === "error") {
      setIsMatching(false);
      setAiStatus(data.message);
    }
  };

  worker.onerror = (error) => {
    console.error("AI worker failed:", error);
    setIsMatching(false);
    setAiStatus(
      "The AI worker could not run. Refresh the page and try again."
    );
  };

  worker.postMessage({
    request: userRequest,
    candidates,
  });
}

  function startSession() {
    setElapsedSeconds(0);
    setFinishedSeconds(null);
    setStartAt(Date.now());
  }

  function finishSession() {
    const seconds = Math.max(
      0,
      Math.floor((Date.now() - startedAt) / 1000)
    );

    setOutdoorMinutes(String(Math.floor(seconds / 60 )));

    setElapsedSeconds(seconds);
    setFinishedSeconds(seconds);
    setStartAt(null);
  }

  const isRunning = startedAt !== null;
  const isLogging = finishedSeconds !== null;
  const isBusy = isRunning || isLogging;

  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  function saveBreak(event) {
    event.preventDefault();

    const confirmedMinutes = Number(outdoorMinutes);

    if (
      !Number.isInteger(confirmedMinutes) ||
      confirmedMinutes < 1 ||
      confirmedMinutes > 480
    ) {
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      title: session.title,
      minutes: confirmedMinutes,
      completedAt: Date.now(),
    };

    setBreaks((previousBreaks) => [...previousBreaks, entry]);
    setFinishedSeconds(null);
    setOutdoorMinutes("");
    setSubmitted(false);
    setSession(null);
  }

  const today = new Date().toDateString();

  const todaysBreaks = breaks.filter(
    (entry) => new Date(entry.completedAt).toDateString() === today
  );

  const todaysMinutes = todaysBreaks.reduce(
    (total, entry) => total + entry.minutes,
    0
  );

  return (
    <>
      <header>
        <a className="brand" href="./">
          ☀ daylight
        </a>
        <span>Less scrolling. More outside.</span>
      </header>

      <main>
        <section className="intro">
          <p className="eyebrow">YOUR DAILY OUTDOOR BREAK</p>

          <h1>
            A little movement.
            <br />
            A little daylight.
          </h1>

          <p>
            Find a walk that fits how you feel. Then put your phone away.
          </p>
        </section>

        <div className="layout">
          <section className="card">
            <h2>Make time for outside</h2>

            {activeStorageError && (
              <p role="alert">{activeStorageError}</p>
            )}

            <form onSubmit={handleSubmit}>
              <label htmlFor="request">What do you need today?</label>

              <textarea
                id="request"
                value={request}
                onChange={(event) => {
                  setRequest(event.target.value);
                  setSubmitted(false);
                }}
                placeholder="I want an easy walk to unwind after a long day."
                maxLength={400}
                required
                disabled={isBusy || isMatching}
              />

              <div className="fields">
                <label htmlFor="duration">
                  Time
                  <select
                    id="duration"
                    value={duration}
                    onChange={(event) => {
                      setDuration(event.target.value);
                      setSubmitted(false);
                    }}
                    disabled={isBusy || isMatching}
                  >
                    <option value="10">10 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                </label>

                <label htmlFor="intensity">
                  Intensity
                  <select
                    id="intensity"
                    value={intensity}
                    onChange={(event) => {
                      setIntensity(event.target.value);
                      setSubmitted(false);
                    }}
                    disabled={isBusy || isMatching}
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="primary" disabled={isBusy}>
                {isMatching ? "Finding your walk.." : "Plan my break"}
              </button>

              <p className="muted" role="status">
                {aiStatus ||
                  "First use downloads an AI model. Your request is processed on this device."}
              </p>
              </form>

              {submitted && session && (
                <div className="result">
                  <p className="eyebrow">YOUR OUTDOOR BREAK</p>

                  <h3>{session.title}</h3>
                  <p>You asked for: {session.request}</p>
                  <p>{session.duration} minutes outside</p>

                  <ol>
                    {session.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>

                    <p className="muted">
                      {session.matchedByAI
                        ? "Matched to your request using on-device open AI."
                        : "This saved plan was created before AI matching was added."}
                    </p>

                  {isRunning ? (
                    <div className="timer-panel">
                      <p className="eyebrow">PHONE AWAY. WORLD ON.</p>

                      <p className="clock" role="timer">
                        {minutes}:{seconds}
                      </p>

                      <p>Enjoy your outdoor break. Return here when you finish.</p>

                      <button
                        type="button"
                        className="primary"
                        onClick={finishSession}
                      >
                        Finish my break
                      </button>
                    </div>
                  ) : finishedSeconds === null ? (
                    <button
                      type="button"
                      className="primary"
                      onClick={startSession}
                    >
                      Start my break
                    </button>
                  ) : null}

                  {finishedSeconds !== null && (
                    <form className="result" onSubmit={saveBreak}>
                      <h3>Log your outdoor time</h3>

                      <p>
                        Timer: {Math.floor(finishedSeconds / 60)} minutes and {" "}
                          {finishedSeconds % 60} seconds
                      </p>

                    <label htmlFor="outdoor-minutes">
                      Completed outdoor minutes  
                    </label> 

                    <input id="outdoor-minutes" type="number" min="1" max="480" step="1"
                        value = {outdoorMinutes} onChange={(event) => setOutdoorMinutes(event.target.value)}
                        required
                      />

                      <p className="muted">
                        Correct this if some time was spent indoors.
                         Log whole minutes; breaks under one minute do not need an entry.
                      </p>
                      <button type="submit" className="primary">
                        Save my break
                      </button>
                    </form>
                  )}
                  </div>
              )}
          </section>

          <aside>
            <section className="card progress">
              <p className="eyebrow">TODAY, OUTSIDE</p>

              <div className="minutes">
                <span>{todaysMinutes}</span>
                <small>minutes</small>
              </div>

              <p>
                {todaysBreaks.length === 0
                  ? "A fresh start. Your first break is waiting."
                  : `${todaysBreaks.length} outdoor ${
                      todaysBreaks.length === 1 ? "break" : "breaks"
                    } recorded today.`}
              </p>

              <p className="muted">
                Outdoor time, including shade. This is not a measurement
                of sunlight or vitamin D.
              </p>
            </section>

              <UVCard />
          </aside>
        </div>

        <section className="card history">
          <h2>Your outdoor journal</h2>

          {storageError && <p role="alert">{storageError}</p>}

          {breaks.length === 0 ? (
            <p>Your completed breaks will appear here.</p>
          ) : (
            [...breaks].reverse().map((entry) => (
              <div className="entry" key={entry.id}>
                <p>{entry.title}</p>

                <small>
                  {new Date(entry.completedAt).toLocaleDateString()} ·{" "}
                  {entry.minutes} minutes
                </small>
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}

export default App;