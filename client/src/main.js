const plantForm = document.getElementById("Search-form");

plantForm.addEventListener("submit", sendAdviceRequest);

async function sendAdviceRequest(event) {
  event.preventDefault();

  const userPrompt = event.target.querySelector("input").value;
  console.log("User prompt:", userPrompt);

  try {
    const response = await fetch("http://localhost:8080/analyse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // fixed case
      },
      body: JSON.stringify({ prompt: userPrompt, language: "en" }),
    });

    console.log("HTTP status:", response.status);

    const data = await response.json();
    console.log("Server response:", data);

    const responseP = document.createElement("p");
    responseP.textContent = JSON.stringify(data);
    document.body.appendChild(responseP);
  } catch (error) {
    console.error("Request failed:", error);
  }
}
