document.addEventListener("DOMContentLoaded", () => {

    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const navLinks =
        document.querySelector(".nav-links");


    if (mobileMenuBtn && navLinks) {

        mobileMenuBtn.addEventListener("click", () => {

            navLinks.classList.toggle("mobile-active");

        });

    }

});
