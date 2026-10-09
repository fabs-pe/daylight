import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

let extractor = null;

self.onmessage = async (event) => {
  const { request, candidates } = event.data;

  try {
    if (!extractor) {
      self.postMessage({
        type: "status",
        message: "Loading AI model. First use may take a minute…",
      });

      extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        {
          device: "wasm",
          dtype: "q8",
        }
      );
    }

    self.postMessage({
      type: "status",
      message: "Matching your request to a walking session…",
    });

    const texts = [
      request,
      ...candidates.map((session) => session.description),
    ];

    const output = await extractor(texts, {
      pooling: "mean",
      normalize: true,
    });

    const vectors = output.tolist();
    const requestVector = vectors[0];

    const scores = vectors.slice(1).map((sessionVector) =>
      sessionVector.reduce(
        (total, value, index) =>
          total + value * requestVector[index],
        0
      )
    );

    const bestIndex = scores.indexOf(Math.max(...scores));

    self.postMessage({
      type: "result",
      session: candidates[bestIndex],
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: "AI matching failed. Check your connection and try again.",
    });

    console.error(error);
  }
};