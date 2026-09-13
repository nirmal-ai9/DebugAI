const form = document.querySelector(".debug-form");
const msg = document.querySelector(".submit-note");

form.addEventListener("submit", function(event) {
  event.preventDefault();
  
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
    msg.textContent = "Requirements and code are required;
    return
  }else{
    msg.style.color = "white";
    msg.textContent = "Working on it";
    msg.classList.add("dot");
  }
  
  console.log(debugData);
});
