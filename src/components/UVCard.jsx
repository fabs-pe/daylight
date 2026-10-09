import { useState } from "react";

function UVCard() {
  const [uvForecast, setUvForecast] = useState(null);
  const [uvLoading, setUvLoading] = useState(false);
  const [uvError, setUvError] = useState("");

  async function checkUV() {
    if (uvLoading) return;

    setUvError("");
    setUvForecast(null);

    if (!navigator.geolocation) {
      setUvError("Your browser does not support location.");
      return;
    }

    setUvLoading(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        });
      });

      const url = new URL(
        "https://api.open-meteo.com/v1/forecast"
      );

      url.search = new URLSearchParams({
        latitude: position.coords.latitude.toFixed(2),
        longitude: position.coords.longitude.toFixed(2),
        daily: "uv_index_max",
        timezone: "auto",
        forecast_days: "1",
      }).toString();

      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error("The weather service could not respond.");
      }

      const data = await response.json();
      const maximum = data.daily?.uv_index_max?.[0];
      const date = data.daily?.time?.[0];

      if (!Number.isFinite(maximum) || !date) {
        throw new Error("No UV forecast was available.");
      }

      setUvForecast({ maximum, date });
    } catch (error) {
      console.error("UV check failed:", error);

      if (error.code === 1) {
        setUvError(
          "Location permission was declined. You can check local UV on SunSmart."
        );
      } else if (error.code === 2) {
        setUvError(
          "Your location could not be determined. Try again."
        );
      } else if (
        error.code === 3 ||
        error.name === "TimeoutError"
      ) {
        setUvError("The UV check timed out. Please try again.");
      } else {
        setUvError(
          "The forecast could not load. Check your connection or use SunSmart."
        );
      }
    } finally {
      setUvLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>Before you head out</h2>

      {uvForecast ? (
        <div>
          <p className="eyebrow">FORECAST DAILY MAXIMUM UV</p>

          <p className="uv-value">
            {uvForecast.maximum.toFixed(1)}
          </p>

          <p className="muted">
            Forecast date: {uvForecast.date}. This is the day's
            predicted peak, not the current UV or your personal
            exposure.
          </p>
        </div>
      ) : (
        <p>Check the forecast maximum UV for your area.</p>
      )}

      {uvError && <p role="alert">{uvError}</p>}

      <button
        type="button"
        className="secondary"
        onClick={checkUV}
        disabled={uvLoading}
      >
        {uvLoading ? "Checking UV…" : "Check UV near me"}
      </button>

      <p className="muted">
        Uses your location once per check. Rounded coordinates
        are sent to Open-Meteo and are not saved by this app.
      </p>

      <p>
        Use sun protection whenever UV is 3 or above. Check
        current local guidance before heading out.
      </p>

      <p className="muted">
        Forecast data:{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open-Meteo
        </a>
        {" · "}
        <a
          href="https://www.sunsmart.com.au/"
          target="_blank"
          rel="noopener noreferrer"
        >
          SunSmart guidance
        </a>
      </p>
    </section>
  );
}

export default UVCard;