"""
Blood-Lagbe: blood stock shortage predictor (TensorFlow Lite)

Run this in Google Colab (colab.research.google.com -> New notebook -> paste -> Run).
It trains a small neural network and converts it to TensorFlow Lite.
Downloads: shortage_model.tflite and shortage_model.meta.json
Put both files in your project at client/models/

The model answers: "Will this blood group at this blood bank fall below the bank's
low-stock level within the next 7 days?"  Output = probability between 0 and 1.
"""
import json
import numpy as np
import tensorflow as tf

# ---------------------------------------------------------------------------
# 1. Training data (simulated blood stock, because a new site has little history)
#    The same 8 inputs are computed live by the website from your real database.
# ---------------------------------------------------------------------------
FEATURES = ["stock", "out7_per_day", "out30_per_day", "in30_per_day",
            "expiring7", "open_demand", "low_threshold", "days_cover"]
SCALE = [40.0, 8.0, 8.0, 8.0, 20.0, 15.0, 15.0, 30.0]   # each input is divided by this, then clipped to 0..1.5
HORIZON_DAYS = 7


def simulate(n, seed=42):
    rng = np.random.default_rng(seed)

    demand_rate = rng.gamma(1.6, 0.9, n)                    # true units issued per day
    supply_rate = rng.gamma(1.5, 0.9, n)                    # true units received per day
    stock = np.round(rng.gamma(2.0, 7.0, n))                # free units today
    open_demand = rng.poisson(1.2, n).astype(float)         # requested but not issued yet
    expiring7 = np.minimum(stock, np.round(rng.gamma(1.1, 2.0, n) * (rng.random(n) < 0.45)))
    low = rng.choice([3.0, 5.0, 8.0, 10.0], n)             # bank's low-stock threshold

    # what the website can observe: noisy daily averages of the last 7 and 30 days
    out7 = np.clip(demand_rate + rng.normal(0, 0.6, n), 0, None)
    out30 = np.clip(demand_rate + rng.normal(0, 0.3, n), 0, None)
    in30 = np.clip(supply_rate + rng.normal(0, 0.3, n), 0, None)
    days_cover = np.minimum(stock / np.maximum(np.maximum(out7, out30), 0.1), 30.0)

    # what really happens over the next 7 days
    future = (stock - expiring7 - open_demand
              - rng.poisson(demand_rate * HORIZON_DAYS)
              + rng.poisson(supply_rate * HORIZON_DAYS))
    y = (future < low).astype(np.float32)

    X = np.stack([stock, out7, out30, in30, expiring7, open_demand, low, days_cover], axis=1).astype(np.float32)
    return X, y


def scale(X):
    return np.clip(X / np.array(SCALE, dtype=np.float32), 0.0, 1.5).astype(np.float32)


X, y = simulate(60000)
Xs = scale(X)
cut = int(0.8 * len(Xs))
x_train, y_train, x_test, y_test = Xs[:cut], y[:cut], Xs[cut:], y[cut:]
print(f"{len(Xs)} samples, {y.mean():.1%} are 'shortage'")

# ---------------------------------------------------------------------------
# 2. Small neural network: 8 inputs -> 16 -> 8 -> 1 probability
# ---------------------------------------------------------------------------
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(len(FEATURES),)),
    tf.keras.layers.Dense(16, activation="relu"),
    tf.keras.layers.Dense(8, activation="relu"),
    tf.keras.layers.Dense(1, activation="sigmoid"),
])
model.compile(optimizer="adam", loss="binary_crossentropy",
              metrics=["accuracy", tf.keras.metrics.AUC(name="auc")])
model.fit(x_train, y_train, epochs=25, batch_size=256, validation_split=0.1, verbose=2)

loss, accuracy, auc = model.evaluate(x_test, y_test, verbose=0)
print(f"\nHold-out test: accuracy {accuracy:.3f}, AUC {auc:.3f}")

# ---------------------------------------------------------------------------
# 3. Convert to TensorFlow Lite and check it gives the same answers
# ---------------------------------------------------------------------------
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_bytes = converter.convert()
with open("shortage_model.tflite", "wb") as f:
    f.write(tflite_bytes)
print(f"shortage_model.tflite written ({len(tflite_bytes) / 1024:.1f} KB)")

interpreter = tf.lite.Interpreter(model_content=tflite_bytes)
interpreter.allocate_tensors()
inp = interpreter.get_input_details()[0]
out = interpreter.get_output_details()[0]
print("TFLite input shape:", inp["shape"], " output shape:", out["shape"])

worst = 0.0
for row in x_test[:200]:
    interpreter.set_tensor(inp["index"], row.reshape(1, -1))
    interpreter.invoke()
    lite = float(interpreter.get_tensor(out["index"])[0][0])
    full = float(model.predict(row.reshape(1, -1), verbose=0)[0][0])
    worst = max(worst, abs(lite - full))
print(f"Largest difference between Keras and TFLite on 200 samples: {worst:.6f}")
assert worst < 1e-4, "TFLite output does not match the Keras model"

# ---------------------------------------------------------------------------
# 4. Settings file the website reads (input order, scaling, risk levels)
# ---------------------------------------------------------------------------
meta = {
    "name": "Blood stock shortage predictor",
    "version": 1,
    "horizon_days": HORIZON_DAYS,
    "features": FEATURES,
    "scale": SCALE,
    "clip": 1.5,
    "levels": {"high": 0.6, "medium": 0.3},
    "trained_on": "simulated blood stock data",
    "metrics": {"accuracy": round(float(accuracy), 3), "auc": round(float(auc), 3)},
}
with open("shortage_model.meta.json", "w") as f:
    json.dump(meta, f, indent=2)
print("shortage_model.meta.json written")

try:  # Colab: download both files
    from google.colab import files
    files.download("shortage_model.tflite")
    files.download("shortage_model.meta.json")
except ImportError:
    print("Not running in Colab: copy the two files from this folder.")