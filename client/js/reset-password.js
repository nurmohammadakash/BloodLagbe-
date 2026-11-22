document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("resetPasswordForm");

    if (!form) {
        return;
    }

    const email = (
        sessionStorage.getItem("resetEmail") || ""
    ).trim().toLowerCase();

    const otpInput = document.getElementById("otp");
    const passwordFields = document.getElementById("passwordFields");

    const passwordInput = document.getElementById("password");
    const confirmPasswordInput =
        document.getElementById("confirmPassword");

    const otpError = document.getElementById("otpError");
    const passwordError =
        document.getElementById("passwordError");
    const confirmPasswordError =
        document.getElementById("confirmPasswordError");

    const message =
        document.getElementById("resetMessage");

    const resetButton =
        document.getElementById("resetButton");

    let otpVerified = false;

    function showMessage(text, type) {

        message.textContent = text;
        message.className = `auth-message ${type}`;
    }

    function clearErrors() {

        otpError.textContent = "";
        passwordError.textContent = "";
        confirmPasswordError.textContent = "";
    }

    function setLoading(loading, text) {

        resetButton.disabled = loading;

        if (loading) {
            resetButton.textContent = text;
        } else {
            resetButton.textContent =
                otpVerified
                    ? "Reset Password →"
                    : "Verify OTP →";
        }
    }

    // The reset page should only be reached after
    // the forgot-password step stored an email.
    if (!email) {

        showMessage(
            "Reset session expired. Please request a new OTP.",
            "error"
        );

        resetButton.disabled = true;

        return;
    }

    // OTP: numbers only, maximum 6 digits.
    otpInput.addEventListener("input", () => {

        otpInput.value =
            otpInput.value
                .replace(/\D/g, "")
                .slice(0, 6);

    });

    // Password visibility
    document.querySelectorAll(".password-toggle")
        .forEach(button => {

            button.addEventListener("click", () => {

                const target =
                    document.getElementById(
                        button.dataset.target
                    );

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

    form.addEventListener("submit", async event => {

        event.preventDefault();

        clearErrors();
        showMessage("", "");

        const otp = otpInput.value.trim();

        // =================================================
        // STEP 1: VERIFY OTP
        // =================================================

        if (!otpVerified) {

            if (!/^\d{6}$/.test(otp)) {

                otpError.textContent =
                    "Please enter the 6-digit OTP.";

                return;
            }

            setLoading(true, "Verifying OTP...");

            try {

                const response = await fetch(
                    "/api/auth/verify-reset-otp",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            otp
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {

                    showMessage(
                        data.message ||
                        "Invalid or expired OTP.",
                        "error"
                    );

                    return;
                }

                otpVerified = true;

                passwordFields.hidden = false;

                resetButton.textContent =
                    "Reset Password →";

                showMessage(
                    "OTP verified. Enter your new password.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "❌ OTP verification failed:",
                    error
                );

                showMessage(
                    "Unable to connect to the server.",
                    "error"
                );

            } finally {

                if (!otpVerified) {
                    setLoading(false);
                } else {
                    resetButton.disabled = false;
                }

            }

            return;
        }

        // =================================================
        // STEP 2: RESET PASSWORD
        // =================================================

        const password = passwordInput.value;
        const confirmPassword =
            confirmPasswordInput.value;

        if (!password) {

            passwordError.textContent =
                "Please enter a new password.";

            return;
        }

        const strongPassword =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!strongPassword.test(password)) {

            passwordError.textContent =
                "Password must contain at least 8 characters, including uppercase, lowercase, number and special character.";

            return;
        }

        if (!confirmPassword) {

            confirmPasswordError.textContent =
                "Please confirm your new password.";

            return;
        }

        if (password !== confirmPassword) {

            confirmPasswordError.textContent =
                "Passwords do not match.";

            return;
        }

        setLoading(true, "Resetting Password...");

        try {

            const response = await fetch(
                "/api/auth/reset-password",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        otp,
                        password,
                        confirmPassword
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {

                showMessage(
                    data.message ||
                    "Unable to reset password.",
                    "error"
                );

                return;
            }

            // Remove reset information after successful reset.
            sessionStorage.removeItem("resetEmail");

            showMessage(
                "Password reset successfully. Redirecting to login...",
                "success"
            );

            setTimeout(() => {
                window.location.href = "/login";
            }, 1200);

        } catch (error) {

            console.error(
                "❌ Password reset failed:",
                error
            );

            showMessage(
                "Unable to connect to the server.",
                "error"
            );

        } finally {

            if (
                document.body.contains(resetButton) &&
                sessionStorage.getItem("resetEmail") !== null
            ) {
                resetButton.disabled = false;
                resetButton.textContent = "Reset Password →";
            }

        }

    });

});
