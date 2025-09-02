const form = document.getElementById("Search-form");

const languageInfo = document.getElementById("language-info");
const languageDisplay = document.getElementById("language-display");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const prompt = form.querySelector("input[name='prompt']").value.trim();
  const fileInput = document.getElementById("plantImage");
  const file = fileInput && fileInput.files && fileInput.files[0];

  if (!prompt && !file) {
    alert("Please enter a prompt or upload an image.");
    return;
  }

  let imageBase64 = null;
  let mimeType = null;

  if (file) {
    const result = await fileToBase64AndType(file);
    imageBase64 = result.base64;
    mimeType = result.type;
  }

  try {
    const response = await fetch("http://localhost:8080/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        image: imageBase64,
        mimeType: mimeType,
      }),
    });

    const data = await response.json();
    console.log("Server response:", data);

    const langCode = data && data.careGuide && data.careGuide.language;
    const langName = data && data.careGuide && data.careGuide.language_name;
    if (langCode || langName) {
      languageDisplay.textContent =
        (langName || langCode) + (langCode ? " (" + langCode + ")" : "");
      languageInfo.classList.remove("hidden");
    } else {
      languageInfo.classList.add("hidden");
      languageDisplay.textContent = "";
    }

    displayAdvice(data);

    fetchTopPlants();
  } catch (err) {
    console.error("Request failed:", err);
    alert("Something went wrong. Please try again.");
  }
});

function fileToBase64AndType(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      const result = String(reader.result);
      const parts = result.split(",");
      const prefix = parts[0];
      const base64 = parts[1] || "";
      const match = prefix.match(/^data:(.*?);base64$/);
      const type = match ? match[1] : "image/jpeg";
      resolve({ base64: base64, type: type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function displayAdvice(data) {
  const outputContainer = document.getElementById("output-container");

  const plantName = data.plant_common_name || "Not available";
  const sciName = data.plant_scientific_name || "Not available";
  const problem = data.problem || "No visible issues";

  const causes = data.possible_causes || {};
  const actions = data.recommended_actions || [];
  const tips = data.prevention_tips || [];
  const care = data.careGuide || {};

  document.getElementById("plant-name").textContent = plantName;
  document.getElementById("scientific-name").textContent = sciName;
  document.getElementById("problem").textContent = problem;

  const envList = document.getElementById("environmental-problems");
  envList.innerHTML = "";
  const envItems = causes.environmental_problems || [];
  for (let i = 0; i < envItems.length; i++) {
    const li = document.createElement("li");
    li.textContent = envItems[i];
    envList.appendChild(li);
  }

  const healthList = document.getElementById("health-problems");
  healthList.innerHTML = "";
  const healthItems = causes.health_problems || [];
  for (let i = 0; i < healthItems.length; i++) {
    const li = document.createElement("li");
    li.textContent = healthItems[i];
    healthList.appendChild(li);
  }

  const actionsList = document.getElementById("recommended-actions");
  actionsList.innerHTML = "";
  for (let i = 0; i < actions.length; i++) {
    const li = document.createElement("li");
    li.textContent = actions[i];
    actionsList.appendChild(li);
  }

  const tipsList = document.getElementById("prevention-tips");
  tipsList.innerHTML = "";
  for (let i = 0; i < tips.length; i++) {
    const li = document.createElement("li");
    li.textContent = tips[i];
    tipsList.appendChild(li);
  }

  document.getElementById("watering").textContent =
    care.Watering || "Not available";
  document.getElementById("light").textContent = care.Light || "Not available";
  document.getElementById("soil").textContent = care.Soil || "Not available";
  document.getElementById("pruning").textContent =
    care.Pruning || "Not available";
  document.getElementById("common-issues").textContent =
    care["Common issues"] || "Not available";

  outputContainer.classList.remove("hidden");
}

async function fetchTopPlants() {
  try {
    const res = await fetch("http://localhost:8080/stats/top");
    const rows = await res.json();

    const ul = document.getElementById("top-plants");
    ul.innerHTML = "";

    if (!rows || rows.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No searches yet.";
      ul.appendChild(li);
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const li = document.createElement("li");
      li.textContent = `${item.plant_name} — ${item.count} ${
        item.count === 1 ? "search" : "searches"
      }`;
      ul.appendChild(li);
    }
  } catch (err) {
    console.error("Failed to fetch top plants:", err);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  fetchTopPlants();
});
