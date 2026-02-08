const API_BASE_URL = "https://teeth.ddaily.ru/api";

export async function detectTeeth({ image, jawType }) {
  const response = await fetch(`${API_BASE_URL}/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image,
      jaw_type: jawType,
    }),
  });

  return response.json();
}

export async function exportImage({ image, jawType, detections }) {
  const response = await fetch(`${API_BASE_URL}/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image,
      jaw_type: jawType,
      detections,
    }),
  });

  return response.json();
}
