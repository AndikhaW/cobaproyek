let addIngredientsBtn = document.getElementById("addIngredientsBtn");
let ingredientList = document.querySelector(".ingredientList");
let ingredeintDiv = document.querySelectorAll(".ingredeintDiv")[0];

addIngredientsBtn.addEventListener("click", function () {
  let newIngredients = ingredeintDiv.cloneNode(true);
  let input = newIngredients.getElementsByTagName("input")[0];
  input.value = "";
  ingredientList.appendChild(newIngredients);
});

let addStepsBtn = document.getElementById("addStepsBtn");
let stepsList = document.querySelector(".stepsList");
let stepsDiv = document.querySelectorAll(".stepsDiv")[0];

addStepsBtn.addEventListener("click", function () {
  let newSteps = stepsDiv.cloneNode(true);
  let input2 = newSteps.getElementsByTagName("input")[0];
  input2.value = "";
  stepsList.appendChild(newSteps);
});
