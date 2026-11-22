document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("forgotPasswordForm");

    if (!form) {
        return;
    }

    const emailInput = document.getElementById("email");
    const message = document.getElementById("forgotMessage");
    const emailError = document.getElementById("emailError");
    const forgotButton = document.getElementById("forgotButton");

    function showMessage(text, type) {

        if (!message) {
            return;
        }

        message.textContent = text;
        message.className = `auth-message ${type}`;
    }

    form.addEventListener("submit", async event => {

        event.preventDefault();

        const email = emailInput.value.trim().toLowerCase();

        emailError.textContent = "";
        showMessage("", "");

        if (!email) {

            emailError.textContent =
                "Please enter your email.";

            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

            emailError.textContent =
                "Please enter a valid email address.";

            return;
        }

        forgotButton.disabled = true;
        forgotButton.textContent = "Sending OTP...";

        try {

            const response = await fetch(
                "/api/auth/forgot-password",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {

                showMessage(
                    data.message ||
                    "Unable to process request.",
                    "error"
                );

                return;
            }

            // Keep the reset email only for this browser tab/session.
            sessionStorage.setItem(
                "resetEmail",
                email
            );

            showMessage(
                "OTP sent successfully. Check your email.",
                "success"
            );

            setTimeout(() => {
                window.location.href = "/reset-password";
            }, 800);

        } catch (error) {

            console.error(
                "❌ Forgot-password request failed:",
                error
            );

            showMessage(
                "Unable to connect to the server.",
                "error"
            );

        } finally {

            forgotButton.disabled = false;
            forgotButton.textContent = "Send Reset OTP →";

        }

    });

});
