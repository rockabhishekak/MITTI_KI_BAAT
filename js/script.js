const input = document.querySelector("input");
const img = document.querySelector(".result-box img");

input.addEventListener("change", function() {
    const file = this.files[0];
    if (file) {
        img.src = URL.createObjectURL(file);
    }
});