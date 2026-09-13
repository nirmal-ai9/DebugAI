const form = document.querySelector(".debug-form");
const msg = document.querySelector(".submit-note");
const btn = document.querySelector(".submit-button");

form.addEventListener("submit", async function(event) {
  event.preventDefault();
  btn.disabled = true;
  
  const requirements = document.getElementById("requirements").value;
  const code = document.getElementById("code").value;
  const error = document.getElementById("err").value;
  
  const debugData = {
    requirements: requirements,
    code: code,
    error: error
  };
  
  if(requirements === "" || code === ""){
    msg.style.color = "white";
    msg.textContent = "Requirements and code are required";
    btn.disabled = false;
    return
  }else{
    msg.style.color = "white";  
    msg.textContent = "Working on it";
    msg.classList.add("dot");
  }
  
  try{
    const response = await fetch("https://debugai-backend.nirmal-ai9.workers.dev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(debugData)
      }
    );
    
    const data = JSON.parse(await response.text());
    
  }catch(error){
    console.error("Request failed:", error);
    msg.textContent = "Something went wrong";
  } finally {
    btn.disabled = false;
  }
  
});
