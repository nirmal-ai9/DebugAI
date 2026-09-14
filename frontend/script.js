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
    const response = await fetch("https://debugai-backend.nirmal-ai9.workers.dev/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(debugData)
      }
    );
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const data = JSON.parse(await response.text());
    
    if(data.success === false){
      msg.textContent = "Invalid code or request"; 
    }else{
      showResult(data);
      msg.textContent = "Done";
    }
    
    msg.classList.remove("dot");
    
  }catch(error){
    console.error("Request failed:", error);
    msg.textContent = "Something went wrong";
    msg.classList.remove("dot");
  } finally {
    btn.disabled = false;
  }
  
});

function showResult(data) {
  const result = data.result;
  const results = document.getElementById("results");
  
  // Bug
  const bugType = document.querySelector(".bug-meta-item:nth-child(1) dd");
  const bugLine = document.querySelector(".bug-meta-item:nth-child(2) dd");
  const bugMessage = document.querySelector(".bug-message");

  // Why
  const why = document.querySelector(".result-card--why .result-prose");

  // Fix
  const fixExplanation =
    document.querySelector(".result-card--fix .result-prose");
  const fixCode =
    document.querySelector(".code-fix code");

  // Fill bug information
  if (result.bug) {
    bugType.textContent = result.bug.type;
    bugLine.textContent = result.bug.line ?? "Unknown";
    bugMessage.textContent = result.bug.message;
  } else {
    bugType.textContent = "No bug found";
    bugLine.textContent = "—";
    bugMessage.textContent = "No obvious bug was detected.";
  }

  // Fill why
  why.textContent = result.why;

  // Fill fix
  if (result.fix) {
    fixExplanation.textContent = result.fix.explanation;
    fixCode.textContent = result.fix.code;
  } else {
    fixExplanation.textContent = "No fix is required.";
    fixCode.textContent = "";
  }

  // Show results
  results.hidden = false;

  // Scroll smoothly to results
  results.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
 
const copyBtn = document.querySelector(".apply-fix-button");
const fixCode = document.querySelector(".code-fix code");

copyBtn.addEventListener("click", async function() {
  try {
    await navigator.clipboard.writeText(fixCode.innerText);
    
    copyBtn.textContent = "Copied!";
    
    setTimeout(() => {
      copyBtn.textContent = "Copy fix";
    }, 2000);
    
  } catch (error) {
    console.error("Copy failed:", error);
    copyBtn.textContent = "Copy failed";
    
    setTimeout(() => {
      copyBtn.textContent = "Copy fix";
    }, 2000);
  }
});
