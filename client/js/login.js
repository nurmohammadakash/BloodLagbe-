console.log("🔥 LOGIN.JS LOADED");

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }

    const loginInput = document.getElementById("login");
    const passwordInput = document.getElementById("password");

    const loginError = document.getElementById("loginError");
    const passwordError = document.getElementById("passwordError");
    const loginMessage = document.getElementById("loginMessage");

    const loginButton = document.getElementById("loginButton");
    const buttonText = document.getElementById("buttonText");
    const buttonLoader = document.getElementById("buttonLoader");

    function showError(element, message) {
        if (element) {
            element.textContent = message;
        }
    }

    function clearErrors() {
        showError(loginError, "");
        showError(passwordError, "");
    }

    function showMessage(message, type) {
        if (!loginMessage) {
            return;
        }

        loginMessage.textContent = message;
        loginMessage.className = `auth-message ${type}`;
    }

    function setLoading(loading) {
        if (loginButton) {
            loginButton.disabled = loading;
        }

        // Keep this null-safe because the page may be opened from
        // an older/alternate login template.
        if (buttonText) {
            buttonText.hidden = loading;
        }

        if (buttonLoader) {
            buttonLoader.hidden = !loading;
        }
    }

    // Password visibility
    document.querySelectorAll(".password-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const target = document.getElementById(button.dataset.target);

            if (!target) {
                return;
            }

            if (target.type === "password") {
                target.type = "text";
                button.textContent = "Hide";
            } else {
                target.type = "password";
                button.textContent = "Show";
            }
        });

    });

    // Login
    loginForm.addEventListener("submit", async event => {

        event.preventDefault();

        console.log("🔥 LOGIN FORM SUBMITTED");

        clearErrors();
        showMessage("", "");

        const loginValue = loginInput.value.trim();
        const passwordValue = passwordInput.value;

        console.log("Login:", loginValue);
        console.log("Password entered:", passwordValue ? "YES" : "NO");

        let valid = true;

        if (!loginValue) {
            showError(
                loginError,
                "Please enter your email or username."
            );
            valid = false;
        }

        if (!passwordValue) {
            showError(
                passwordError,
                "Please enter your password."
            );
            valid = false;
        }

        if (!valid) {
            return;
        }

        setLoading(true);

        try {

            console.log("🚀 Sending login request...");

            const response = await fetch(
                "/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        login: loginValue,
                        password: passwordValue
                    })
                }
            );

            console.log(
                "📡 Login response status:",
                response.status
            );

            const data = await response.json();

            console.log(
                "📦 Login response:",
                data
            );

            if (!response.ok || !data.success) {

                showMessage(
                    data.message || "Login failed.",
                    "error"
                );

                return;
            }

            // Save JWT
            localStorage.setItem(
                "bloodLagbeToken",
                data.token
            );
            localStorage.setItem("bloodLagbeRegistered", "true");

            // Save user information
            localStorage.setItem(
                "bloodLagbeUser",
                JSON.stringify(data.user)
            );

            console.log("✅ Login successful");
            console.log("🔐 JWT stored successfully");

            showMessage(
                "Login successful. Redirecting...",
                "success"
            );

            // Use the Express route instead of a non-existent
            // /pages/dashboard/dashboard.html path.
            setTimeout(() => {
                window.location.href = data.user?.account_type === "bloodbank"
                    ? "/bloodbank/dashboard"
                    : "/dashboard";
            }, 700);

        } catch (error) {

            console.error(
                "❌ Login request failed:",
                error
            );

            showMessage(
                "Unable to connect to the server.",
                "error"
            );

        } finally {

            setLoading(false);

        }

    });

});
